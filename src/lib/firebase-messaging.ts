// Lokasi: src/lib/firebase-messaging.ts
// VERSI MODIFIKASI (Perbaikan VAPID Key)
// - Menghapus VAPID_KEY yang di-hardcode.
// - Menggantinya dengan pembacaan dari 'process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY'.
// - Logika lain (saveToken, onMessage) sudah dipindahkan ke layout.tsx dan itu sudah benar.

import { app, db } from "./firebase"; 
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// [DIHAPUS] VAPID Key yang di-hardcode (dan salah)
// const VAPID_KEY = 'BPZ-61y9ZplXmPjCIZg6ke2v8xjsIA68_si8vUh4aV1Q2E5fCM8yPhuNV1r4_yZfi5MVB25cRThYJjIet4ALMXY';

// Helper untuk inisialisasi messaging (hanya di client)
const getMessagingInstance = async () => {
  try {
    if (typeof window !== 'undefined' && (await isSupported())) {
      return getMessaging(app);
    }
  } catch (error) {
    console.error("[FCM-v9] Gagal inisialisasi getMessaging:", error);
  }
  return null;
};

// Fungsi ini DIPERTAHANKAN karena dipanggil oleh layout.tsx
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messaging = await getMessagingInstance();
    if (messaging) {
      // Minta izin notifikasi (akan muncul pop-up jika belum diatur)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
          console.log("[FCM-v9] Izin notifikasi tidak diberikan.");
          return null;
      }

      // [PERBAIKAN] Ambil VAPID key dari environment variables
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("[FCM-v9] Gagal mendapatkan token: NEXT_PUBLIC_FIREBASE_VAPID_KEY tidak diatur di .env.local");
        return null;
      }
      
      const token = await getToken(messaging, { vapidKey: vapidKey });
      
      if (token) {
        console.log("[FCM-v9] Token Perangkat berhasil didapatkan:", token);
        return token;
      } else {
        console.log("[FCM-v9] Gagal mendapatkan token. Izin ditolak atau masalah lain (cek VAPID key).");
        return null;
      }
    } else {
      console.log("[FCM-v9] Layanan messaging tidak didukung di browser ini.");
      return null;
    }
  } catch (error) {
    console.error("[FCM-v9] Terjadi error saat mengambil FCM token:", error);
    return null;
  }
};