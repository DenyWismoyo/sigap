// Lokasi: src/lib/activityLogger.ts
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Mencatat sebuah aktivitas terkait surat ke dalam database.
 * @param suratId ID dari surat yang terkait.
 * @param actorName Nama dan jabatan dari pengguna yang melakukan aksi.
 * @param action Deskripsi singkat dari aksi yang dilakukan.
 * @param details Detail tambahan dari aksi (opsional).
 */
export const logActivity = async (
  suratId: string,
  actorName: string,
  action: string,
  details?: string
): Promise<void> => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      suratId,
      actorName,
      action,
      details: details || null,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Gagal mencatat aktivitas:", error);
    // Di aplikasi produksi, Anda mungkin ingin menambahkan penanganan error yang lebih baik
  }
};
