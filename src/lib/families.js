import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export const GUEST_LIMIT = 100;

export function weightOfGuest(guest) {
  return guest.isChild && guest.isHalf ? 0.5 : 1;
}

export function computeWeight(guests) {
  return guests.reduce((sum, g) => sum + weightOfGuest(g), 0);
}

// 'pendente' | 'parcial' | 'confirmado' | 'recusado'
export function computeStatus(guests) {
  const total = guests.length;
  const responded = guests.filter((g) => g.attending !== null && g.attending !== undefined);
  if (responded.length === 0) return 'pendente';
  if (responded.length < total) return 'parcial';
  const confirmed = responded.filter((g) => g.attending === true).length;
  if (confirmed === total) return 'confirmado';
  if (confirmed === 0) return 'recusado';
  return 'parcial';
}

function randomToken(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// O token agora É o ID do documento da família (ver firestore.rules): permite que o
// convidado leia/atualize só a própria família com um "get" direto por ID, sem
// precisar de uma "list" pública (que exporia as outras famílias).
async function generateUniqueToken() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = randomToken();
    const existing = await getDoc(doc(db, 'families', token));
    if (!existing.exists()) return token;
  }
  return randomToken(12);
}

// Soma o peso de todas as famílias principais (isWaitlist=false), exceto a própria
// (relevante ao editar uma família que já é principal).
export async function getActivePrincipalWeight(excludeFamilyId) {
  const snap = await getDocs(query(collection(db, 'families'), where('isWaitlist', '==', false)));
  let total = 0;
  snap.forEach((d) => {
    if (d.id === excludeFamilyId) return;
    total += d.data().weight || 0;
  });
  return total;
}

// Casa convidados novos com os existentes por nome exato.
// Retorna { toWrite: [{id, name, isChild, isHalf, attending, order}], toDeleteIds: [] }
export function mergeGuests(existingGuests, incomingGuests) {
  const remainingExisting = [...existingGuests];
  const toWrite = [];
  const usedExistingIds = new Set();

  incomingGuests.forEach((incoming, index) => {
    const matchIndex = remainingExisting.findIndex(
      (g) => !usedExistingIds.has(g.id) && g.name === incoming.name
    );
    if (matchIndex !== -1) {
      const match = remainingExisting[matchIndex];
      usedExistingIds.add(match.id);
      toWrite.push({
        id: match.id,
        name: incoming.name,
        isChild: !!incoming.isChild,
        isHalf: incoming.isChild ? !!incoming.isHalf : false,
        attending: match.attending ?? null,
        order: index
      });
    } else {
      toWrite.push({
        id: null, // novo doc
        name: incoming.name,
        isChild: !!incoming.isChild,
        isHalf: incoming.isChild ? !!incoming.isHalf : false,
        attending: null,
        order: index
      });
    }
  });

  const toDeleteIds = existingGuests
    .filter((g) => !usedExistingIds.has(g.id))
    .map((g) => g.id);

  return { toWrite, toDeleteIds };
}

function aggregateFields(guests) {
  return {
    guestCount: guests.length,
    confirmedCount: guests.filter((g) => g.attending === true).length,
    childCount: guests.filter((g) => g.isChild).length,
    weight: computeWeight(guests),
    status: computeStatus(guests)
  };
}

export async function createFamily({ familyName, phone, guests }) {
  const inviteToken = await generateUniqueToken();
  const familyRef = doc(db, 'families', inviteToken);
  const guestsWithOrder = guests.map((g, index) => ({ ...g, attending: null, order: index }));
  const weight = computeWeight(guestsWithOrder);
  const activeWeight = await getActivePrincipalWeight(null);
  const isWaitlist = activeWeight + weight > GUEST_LIMIT;

  const batch = writeBatch(db);
  batch.set(familyRef, {
    familyName,
    phone: phone || '',
    inviteToken,
    status: 'pendente',
    isWaitlist,
    declineReason: null,
    message: null,
    messageApproved: false,
    createdAt: serverTimestamp(),
    respondedAt: null,
    ...aggregateFields(guestsWithOrder)
  });
  guestsWithOrder.forEach((g) => {
    const guestRef = doc(collection(familyRef, 'guests'));
    batch.set(guestRef, {
      name: g.name,
      isChild: !!g.isChild,
      isHalf: g.isChild ? !!g.isHalf : false,
      attending: null,
      order: g.order
    });
  });
  await batch.commit();
  return familyRef.id;
}

export async function updateFamily(familyId, { familyName, phone, guests }) {
  const familyRef = doc(db, 'families', familyId);
  const existingSnap = await getDocs(collection(familyRef, 'guests'));
  const existingGuests = existingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const { toWrite, toDeleteIds } = mergeGuests(existingGuests, guests);
  const finalGuests = toWrite.map((g) => ({ ...g }));

  const weight = computeWeight(finalGuests);
  const activeWeight = await getActivePrincipalWeight(familyId);
  const isWaitlist = activeWeight + weight > GUEST_LIMIT;

  const batch = writeBatch(db);
  batch.update(familyRef, {
    familyName,
    phone: phone || '',
    isWaitlist,
    ...aggregateFields(finalGuests)
  });
  toDeleteIds.forEach((id) => batch.delete(doc(familyRef, 'guests', id)));
  toWrite.forEach((g) => {
    const guestRef = g.id ? doc(familyRef, 'guests', g.id) : doc(collection(familyRef, 'guests'));
    batch.set(guestRef, {
      name: g.name,
      isChild: g.isChild,
      isHalf: g.isHalf,
      attending: g.attending,
      order: g.order
    });
  });
  await batch.commit();
}

export async function deleteFamily(familyId) {
  const familyRef = doc(db, 'families', familyId);
  const guestsSnap = await getDocs(collection(familyRef, 'guests'));
  const batch = writeBatch(db);
  guestsSnap.forEach((g) => batch.delete(g.ref));
  batch.delete(familyRef);
  await batch.commit();
}

export async function setWaitlist(familyId, isWaitlist) {
  await updateDoc(doc(db, 'families', familyId), { isWaitlist });
}

// Recebe a família inteira (não só o id) pra poder espelhar nome + texto em
// "publicMessages", a única coleção que o mural público tem permissão de ler.
export async function setMessageApproved(family, approved) {
  await updateDoc(doc(db, 'families', family.id), { messageApproved: approved });
  if (approved) {
    await setDoc(doc(db, 'publicMessages', family.id), {
      familyName: family.familyName,
      text: family.message || ''
    });
  } else {
    await deleteDoc(doc(db, 'publicMessages', family.id));
  }
}

export async function getFamilyWithGuests(familyId) {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) return null;
  const guestsSnap = await getDocs(query(collection(familyRef, 'guests'), orderBy('order')));
  return {
    id: familySnap.id,
    ...familySnap.data(),
    guests: guestsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  };
}

// Listener em tempo real para o dashboard. Retorna a função de unsubscribe.
export function listFamilies(callback) {
  const q = query(collection(db, 'families'), orderBy('familyName'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function buildCsv(families) {
  const header = ['Família', 'Status', 'Lista reserva', 'Confirmados', 'Total', 'Motivo de recusa'];
  const rows = families.map((f) => [
    f.familyName,
    f.status,
    f.isWaitlist ? 'reserva' : 'principal',
    String(f.confirmedCount ?? 0),
    String(f.guestCount ?? 0),
    f.declineReason || ''
  ]);
  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}

// --- Caminho público do convidado (sem login, só com o token do link) ---

export async function getInviteByToken(token) {
  const familyRef = doc(db, 'families', token);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) return null;

  const guestsSnap = await getDocs(query(collection(familyRef, 'guests'), orderBy('order')));
  const data = familySnap.data();

  return {
    id: familySnap.id,
    familyName: data.familyName,
    status: data.status,
    isWaitlist: !!data.isWaitlist,
    message: data.message || null,
    messageApproved: !!data.messageApproved,
    declineReason: data.declineReason || null,
    confirmedCount: data.confirmedCount || 0,
    guestCount: data.guestCount ?? guestsSnap.size,
    guests: guestsSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      isChild: !!d.data().isChild,
      attending: d.data().attending ?? null
    }))
  };
}

// Sempre update/merge nos documentos existentes (nunca create) — é isso que garante
// a idempotência: reenviar ou clicar duas vezes resulta no mesmo estado final.
// Ids de convidado que não existem mais (removidos pelo admin depois do link ter sido
// enviado) são simplesmente ignorados, igual o comportamento antigo da Cloud Function.
export async function submitPublicRsvp(token, { guests: incoming, message, declineReason }) {
  const familyRef = doc(db, 'families', token);
  const guestsSnap = await getDocs(collection(familyRef, 'guests'));
  const existing = guestsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const attendingById = new Map(incoming.map((g) => [g.id, g.attending]));

  const batch = writeBatch(db);
  const updatedGuests = existing.map((guest) => {
    const hasAnswer = attendingById.has(guest.id);
    const attending = hasAnswer ? !!attendingById.get(guest.id) : guest.attending ?? null;
    if (hasAnswer) batch.update(doc(familyRef, 'guests', guest.id), { attending });
    return { ...guest, attending };
  });

  const status = computeStatus(updatedGuests);
  const confirmedCount = updatedGuests.filter((g) => g.attending === true).length;
  const finalDeclineReason = status === 'recusado' ? declineReason || null : null;

  batch.update(familyRef, {
    status,
    confirmedCount,
    message: message || null,
    messageApproved: false,
    declineReason: finalDeclineReason,
    respondedAt: serverTimestamp()
  });

  await batch.commit();
  // Se a família tinha um recado já aprovado no mural, ele some até ser aprovado de novo.
  await deleteDoc(doc(db, 'publicMessages', token));

  return {
    status,
    confirmedCount,
    guestCount: updatedGuests.length,
    message: message || null,
    messageApproved: false,
    declineReason: finalDeclineReason,
    guests: updatedGuests
  };
}

export function watchPublicMessages(callback, onError) {
  return onSnapshot(
    collection(db, 'publicMessages'),
    (snap) => callback(snap.docs.map((d) => ({ family: d.data().familyName, text: d.data().text }))),
    onError
  );
}

export function downloadCsv(families, filename = 'confirmacoes-casamento.csv') {
  const csv = buildCsv(families);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
