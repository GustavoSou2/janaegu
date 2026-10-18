const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const { computeStatus, validateRsvpPayload } = require('./lib/rsvp');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const DEFAULT_SETTINGS = {
  coupleNames: 'Janaina & Gustavo',
  weddingDateIso: '2026-12-18T20:00:00-03:00',
  weddingDateLabel: '18 de dezembro de 2026',
  venueName: 'Espaço Roma Eventos',
  venueAddress: 'R. Adolfina Dagnone, 80, Chácara Recanto da Colina Verde, Campinas, SP, 13057-552',
  rsvpDeadlineLabel: '20 de novembro',
  giftListUrl: '',
  shareImageUrl: '/convite-compartilhar.jpg',
  waitlistNoticeToGuest: false,
  declineAllowsMessage: true,
  whatsappMessageTemplate: null
};

function withCors(handler) {
  return onRequest((req, res) => cors(req, res, () => handler(req, res)));
}

async function findFamilyByToken(token) {
  const snap = await db.collection('families').where('inviteToken', '==', token).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0];
}

async function getSettingsData() {
  const snap = await db.collection('settings').doc('event').get();
  return snap.exists ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS;
}

exports.getInvite = withCors(async (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Token ausente.' });
    return;
  }

  const familyDoc = await findFamilyByToken(token);
  if (!familyDoc) {
    res.status(404).json({ error: 'Convite não encontrado. Confira o link recebido no WhatsApp.' });
    return;
  }

  const familyData = familyDoc.data();
  const guestsSnap = await familyDoc.ref.collection('guests').orderBy('order').get();
  const guests = guestsSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    isChild: !!d.data().isChild,
    attending: d.data().attending ?? null
  }));

  const settings = await getSettingsData();

  res.json({
    family: {
      id: familyDoc.id,
      familyName: familyData.familyName,
      status: familyData.status,
      isWaitlist: !!familyData.isWaitlist,
      message: familyData.message || null,
      messageApproved: !!familyData.messageApproved,
      declineReason: familyData.declineReason || null,
      confirmedCount: familyData.confirmedCount || 0,
      guestCount: familyData.guestCount ?? guests.length,
      guests
    },
    settings
  });
});

exports.submitRsvp = withCors(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const validationError = validateRsvpPayload(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { token, guests: incomingGuests, message, declineReason } = req.body;
  const familyDoc = await findFamilyByToken(token);
  if (!familyDoc) {
    res.status(404).json({ error: 'Convite não encontrado. Confira o link recebido no WhatsApp.' });
    return;
  }

  const guestsSnap = await familyDoc.ref.collection('guests').orderBy('order').get();
  const existingIds = new Set(guestsSnap.docs.map((d) => d.id));
  const attendingById = new Map(
    incomingGuests.filter((g) => existingIds.has(g.id)).map((g) => [g.id, g.attending])
  );

  const batch = db.batch();
  const updatedGuests = guestsSnap.docs.map((d) => {
    const current = d.data();
    const attending = attendingById.has(d.id) ? attendingById.get(d.id) : current.attending ?? null;
    if (attendingById.has(d.id)) {
      batch.update(d.ref, { attending });
    }
    return { id: d.id, name: current.name, isChild: !!current.isChild, attending };
  });

  const status = computeStatus(updatedGuests);
  const confirmedCount = updatedGuests.filter((g) => g.attending === true).length;

  batch.update(familyDoc.ref, {
    status,
    confirmedCount,
    message: message || null,
    messageApproved: false, // todo reenvio precisa de nova aprovação
    declineReason: status === 'recusado' ? declineReason || null : null,
    respondedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();

  res.json({
    status,
    confirmedCount,
    guestCount: updatedGuests.length,
    message: message || null,
    messageApproved: false,
    declineReason: status === 'recusado' ? declineReason || null : null,
    guests: updatedGuests
  });
});

exports.getMessages = withCors(async (req, res) => {
  const snap = await db.collection('families').where('messageApproved', '==', true).get();
  const messages = snap.docs
    .map((d) => ({ family: d.data().familyName, text: d.data().message }))
    .filter((m) => m.text);
  res.json({ messages });
});

exports.registerPushToken = withCors(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  const { token, deviceToken } = req.body || {};
  if (!token || !deviceToken) {
    res.status(400).json({ error: 'Dados de inscrição incompletos.' });
    return;
  }
  const familyDoc = await findFamilyByToken(token);
  if (!familyDoc) {
    res.status(404).json({ error: 'Convite não encontrado.' });
    return;
  }
  await db.collection('pushSubscriptions').doc(deviceToken).set({
    familyId: familyDoc.id,
    deviceToken,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  res.json({ ok: true });
});

// Lembrete diário para famílias pendentes/parciais. Exige plano Blaze habilitado
// no projeto Firebase (obrigatório para qualquer Cloud Function agendada).
exports.sendReminders = onSchedule('every day 10:00', async () => {
  const pendingSnap = await db.collection('families').where('status', 'in', ['pendente', 'parcial']).get();
  if (pendingSnap.empty) return;

  const familyIds = pendingSnap.docs.map((d) => d.id);
  const tokensByFamily = new Map();
  for (const familyId of familyIds) {
    const subsSnap = await db.collection('pushSubscriptions').where('familyId', '==', familyId).get();
    const tokens = subsSnap.docs.map((d) => d.data().deviceToken);
    if (tokens.length) tokensByFamily.set(familyId, tokens);
  }

  const messages = [];
  pendingSnap.docs.forEach((familyDoc) => {
    const tokens = tokensByFamily.get(familyDoc.id);
    if (!tokens) return;
    tokens.forEach((deviceToken) => {
      messages.push({
        token: deviceToken,
        notification: {
          title: 'Ainda não recebemos sua confirmação!',
          body: `${familyDoc.data().familyName}, confirme sua presença no nosso casamento.`
        }
      });
    });
  });

  if (messages.length === 0) return;
  await admin.messaging().sendEach(messages);
});
