// Lokasi: src/lib/firebase.js
// [UPDATE FASE 6 - PILAR 1]: Menerapkan Persistent Local Cache (Multi-Tab) & Named Database
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore"; 
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// [PERBAIKAN]: Tambahkan kata 'export' di depan const app
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Inisialisasi Firestore dengan Named Database "database-siyap"
export const db = (() => {
  if (typeof window !== "undefined") {
    try {
      const firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, "database-siyap"); 
      console.log("Mode offline Firestore (Multi-Tab Cache) aktif [database-siyap].");
      return firestoreInstance;
    } catch (error) {
      console.warn("Gagal mengaktifkan Multi-Tab Cache, fallback ke getFirestore", error);
      return getFirestore(app, "database-siyap");
    }
  } else {
    // SSR / API Routes
    return getFirestore(app, "database-siyap");
  }
})();

// Inisialisasi Cloud Functions (Wajib region asia-southeast2 sesuai arsitektur)
export const functions = getFunctions(app, "asia-southeast2");

// Inisialisasi Storage
export const storage = getStorage(app);

// Inisialisasi Messaging (Push Notifications)
export let messaging;
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error("Gagal menginisialisasi Firebase Messaging:", err);
  }
}

// Export utils agar mempermudah import di file lain
export { ref, uploadBytesResumable, getDownloadURL, getToken, onMessage };