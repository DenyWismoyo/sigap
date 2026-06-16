// Lokasi file: src/lib/logbookUtils.ts
// File helper baru untuk mengisolasi logika pembaruan logbook harian.

import { db } from './firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { LogbookKegiatan, LogbookHarian } from '@/types';

/**
 * Helper untuk mengubah objek Date menjadi string YYYY-MM-DD.
 * @param date Objek Date.
 * @returns String format YYYY-MM-DD.
 */
const toYYYYMMDD = (date: Date) : string => {
  // Salin tanggal agar tidak mengubah objek aslinya
  const d = new Date(date);
  // Sesuaikan dengan zona waktu lokal (WIB adalah UTC+7)
  // Ini penting agar 'new Date()' yang dibuat di sisi server/klien
  // mereferensikan hari yang benar di zona waktu tersebut.
  // Cara aman adalah menggunakan UTC dan menyesuaikan offset,
  // tapi untuk aplikasi yang konsisten di satu zona waktu (misal Indonesia),
  // konversi ISOString dan split sudah cukup.
  // Namun, cara paling aman adalah TIDAK mengonversi ke YYYY-MM-DD
  // dan membiarkan sisi klien/server menggunakan objek Date utuh.
  
  // Untuk konsistensi dengan kode Anda di logbook/page.tsx:
  return date.toISOString().split('T')[0];
};

/**
 * Memperbarui (menambah/mengganti) entri logbook harian untuk seorang pengguna pada tanggal tertentu.
 * Fungsi ini akan mengambil data logbook yang ada, menambahkan kegiatan baru, dan menyimpannya kembali.
 *
 * @param userId UID pengguna.
 * @param opdId OPD pengguna.
 * @param tanggal Objek Date dari hari logbook yang akan diupdate.
 * @param kegiatanBaru Objek LogbookKegiatan yang akan ditambahkan.
 */
export const updateLogbook = async (
  userId: string,
  opdId: string,
  tanggal: Date,
  kegiatanBaru: LogbookKegiatan
) => {
  if (!userId || !opdId || !tanggal || !kegiatanBaru) {
    throw new Error("Data tidak lengkap untuk memperbarui logbook.");
  }

  // Tentukan tanggal di jam 00:00:00 untuk konsistensi Timestamp
  const tanggalLogbook = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
  
  const dateStr = toYYYYMMDD(tanggalLogbook);
  const docId = `${userId}_${dateStr}`;
  const docRef = doc(db, 'logbookHarian', docId);

  try {
    const docSnap = await getDoc(docRef);
    let currentKegiatan: LogbookKegiatan[] = [];

    if (docSnap.exists()) {
      currentKegiatan = (docSnap.data() as LogbookHarian).kegiatan || [];
    }
    
    // Cek apakah kegiatan dengan ID ini sudah ada (misal: dari checklist)
    // Jika ya, update. Jika tidak, tambahkan.
    const existingIndex = currentKegiatan.findIndex(k => k.id === kegiatanBaru.id);

    if (existingIndex > -1) {
      // Update kegiatan yang ada
      currentKegiatan[existingIndex] = kegiatanBaru;
    } else {
      // Tambah kegiatan baru
      currentKegiatan.push(kegiatanBaru);
    }

    // Simpan kembali ke Firestore
    await setDoc(docRef, {
      userId: userId,
      opdId: opdId,
      tanggal: Timestamp.fromDate(tanggalLogbook),
      kegiatan: currentKegiatan, // Simpan daftar kegiatan yang sudah diperbarui
    }, { merge: true }); // Gunakan merge untuk membuat dokumen jika belum ada

    console.log(`Logbook berhasil diperbarui untuk ${docId}`);
  
  } catch (error) {
    console.error("Error di updateLogbook helper:", error);
    // Timbulkan error agar bisa ditangkap oleh fungsi yang memanggil
    throw new Error("Gagal memperbarui logbook harian.");
  }
};
