/* Service worker do Firebase Cloud Messaging — roda fora do build do Vite,
   então não tem acesso a "import.meta.env". Preencha os mesmos valores do
   seu .env (eles não são secretos, são o config público do app Firebase). */
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAwwTqYDoOQ-NCQ48VNvSGv_R6kCc4h5XQ',
  authDomain: 'janaegu.firebaseapp.com',
  projectId: 'janaegu',
  storageBucket: 'janaegu.firebasestorage.app',
  messagingSenderId: '1042923226325',
  appId: '1:1042923226325:web:4001ab7270df3bdaaf4e5c'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Casamento Janaina & Gustavo', {
    body: body || 'Você tem uma novidade sobre o convite.',
    icon: '/icons/icon-192.png'
  });
});
