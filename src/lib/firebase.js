import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.FIREBASE_API_KEY,
  authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const FUNCTIONS_BASE_URL = import.meta.env.FUNCTIONS_BASE_URL || '';

// Mensageria (FCM) só é inicializada sob demanda, no navegador, e só quando suportada
// (iOS Safari sem "Adicionar à Tela de Início" em PWA instalado não suporta push).
export async function getMessagingIfSupported() {
  try {
    const { isSupported, getMessaging } = await import('firebase/messaging');
    if (await isSupported()) return getMessaging(app);
  } catch {
    // ambiente sem suporte a push (ex.: Safari comum) — ignora silenciosamente
  }
  return null;
}
