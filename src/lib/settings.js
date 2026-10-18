import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_REF = () => doc(db, 'settings', 'event');

export const DEFAULT_SETTINGS = {
  coupleNames: 'Janaina & Gustavo',
  weddingDateIso: '2026-12-18T20:00:00-03:00',
  weddingDateLabel: '18 de dezembro de 2026',
  venueName: 'Espaço Roma Eventos',
  venueAddress: 'R. Adolfina Dagnone, 80, Chácara Recanto da Colina Verde, Campinas, SP, 13057-552',
  // Sem coordenada "chutada": não encontrei esse endereço nem no OpenStreetMap, nem
  // com um nome confiável num mapa de verdade. Preencha em settings/event no Firestore
  // (pegue no Google Maps: clique com o botão direito bem em cima do local > copie as
  // coordenadas) pra o mapa do convite aparecer.
  venueLat: null,
  venueLng: null,
  rsvpDeadlineLabel: '20 de novembro',
  giftListUrl: '',
  shareImageUrl: '/convite-compartilhar.jpg',
  // Foto grande de fechamento, no fim do convite. Sem uma segunda foto própria,
  // o Invite.jsx reaproveita a mesma foto do topo (HERO_IMAGE_URL) como padrão.
  closingImageUrl: null,
  waitlistNoticeToGuest: false,
  declineAllowsMessage: true,
  whatsappMessageTemplate: null
};

export async function getSettings() {
  const snap = await getDoc(SETTINGS_REF());
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS;
}

export function watchSettings(callback) {
  return onSnapshot(SETTINGS_REF(), (snap) => {
    callback(snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS);
  });
}

export async function updateSettings(partial) {
  await setDoc(SETTINGS_REF(), partial, { merge: true });
}
