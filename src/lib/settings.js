import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_REF = () => doc(db, 'settings', 'event');

export const DEFAULT_SETTINGS = {
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
