import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore'; // [MIGRASI]: Import getFirestore

// Ambil kredensial dari environment variables
// [PERBAIKAN] Logika pembersihan Private Key diperkuat untuk menangani berbagai format string
// Vercel kadang menyimpan \n sebagai string literal "\\n", kadang sebagai newline asli.
// Replace ini memastikan formatnya selalu benar untuk admin SDK.
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : undefined;

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

// Variabel global untuk menampung instance agar tidak re-init di Next.js hot reload
let adminApp: admin.app.App | null = null;
let db: admin.firestore.Firestore | undefined;

/**
 * Inisialisasi Firebase Admin SDK secara aman (Idempotent).
 */
function initializeFirebaseAdmin(): admin.app.App | null {
  try {
    // 1. Cek apakah app default sudah ada
    if (admin.apps.length > 0) {
      const existingApp = admin.apps.find(app => app?.name === '[DEFAULT]');
      if (existingApp) return existingApp;
    }

    // 2. Validasi Kredensial
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error("FIREBASE_ADMIN_ERROR: Kredensial tidak lengkap.");
      // Log bagian mana yang hilang untuk debugging (tanpa membocorkan isi kunci)
      console.error("Project ID:", !!serviceAccount.projectId ? "OK" : "MISSING");
      console.error("Client Email:", !!serviceAccount.clientEmail ? "OK" : "MISSING");
      console.error("Private Key:", !!serviceAccount.privateKey ? "OK" : "MISSING");
      return null; 
    }

    // 3. Inisialisasi Baru
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

  } catch (error) {
    console.error("FIREBASE_ADMIN_ERROR: Gagal inisialisasi:", error);
    return null;
  }
}

// Eksekusi inisialisasi
adminApp = initializeFirebaseAdmin();

// Inisialisasi Firestore
if (adminApp) {
  // [MIGRASI NAMED DATABASE]: Gunakan getFirestore dan tunjuk ke "database-siyap"
  db = getFirestore(adminApp, "database-siyap");
} else {
  console.warn("FIREBASE_ADMIN: Database gagal diinisialisasi. API Routes yang butuh DB akan gagal.");
}

export {
  adminApp, 
  db, 
  admin
};