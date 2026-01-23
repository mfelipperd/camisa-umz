import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAdMETY8mtSZT9pyuMFW9vc050mh9U9OpA",
  authDomain: "camisa-umz.firebaseapp.com",
  projectId: "camisa-umz",
  storageBucket: "camisa-umz.firebasestorage.app",
  messagingSenderId: "366588111793",
  appId: "1:366588111793:web:e7098668d8c1cdd6cfeb90"
};

const app = initializeApp(firebaseConfig);

// Initialize App Check
export let appCheck: any = null;

if (typeof window !== 'undefined') {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.DEV;
    appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider('6LdD67sqAAAAANh6x-y8bY0j5_F5u_lX0l-O9QyI'),
        isTokenAutoRefreshEnabled: true
    });
}


export const db = getFirestore(app);
export const functions = getFunctions(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
