import { getMessagingIfSupported, FUNCTIONS_BASE_URL } from './firebase';

// Pede permissão de notificação e registra o token do dispositivo pra essa família.
// Resolve { ok: false, reason } quando push não é suportado (ex.: Safari sem
// "Adicionar à Tela de Início") ou quando a pessoa nega a permissão.
export async function enablePushNotifications(inviteToken) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return { ok: false, reason: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const { getToken } = await import('firebase/messaging');
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  const deviceToken = await getToken(messaging, { vapidKey });
  if (!deviceToken) return { ok: false, reason: 'no-token' };

  await fetch(`${FUNCTIONS_BASE_URL}/registerPushToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: inviteToken, deviceToken })
  });

  return { ok: true };
}
