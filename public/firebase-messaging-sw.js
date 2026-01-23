importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAdMETY8mtSZT9pyuMFW9vc050mh9U9OpA",
  authDomain: "camisa-umz.firebaseapp.com",
  projectId: "camisa-umz",
  storageBucket: "camisa-umz.firebasestorage.app",
  messagingSenderId: "366588111793",
  appId: "1:366588111793:web:e7098668d8c1cdd6cfeb90"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/watermark.png' // Utilizing existing asset
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
