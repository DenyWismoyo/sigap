// Lokasi: src/lib/offlineSync.ts
// File BARU ini berfungsi sebagai helper untuk berinteraksi dengan
// IndexedDB (database di browser) untuk menyimpan data yang tertunda.

import { Surat } from '@/types';

const DB_NAME = 'SIGAP_OFFLINE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingSuratUploads';

// 1. Membuka (atau membuat) database IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('Gagal membuka IndexedDB.');
    request.onsuccess = () => resolve(request.result);

    // Ini berjalan hanya jika DB dibuat pertama kali atau versi upgrade
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Buat "tabel" (object store) dengan 'id' sebagai primary key
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// 2. Fungsi untuk menyimpan Surat dan File yang tertunda
export const savePendingSurat = async (
  suratData: Omit<Surat, 'id' | 'fileUrl' | 'fileName'>, 
  file: File
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const itemToStore = {
    id: `surat_${Date.now()}`, // ID unik untuk antrian
    payload: {
      suratData,
      fileName: file.name,
      fileType: file.type,
    },
    fileBlob: file, // Simpan file sebagai Blob
  };

  return new Promise((resolve, reject) => {
    const request = store.put(itemToStore);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Gagal menyimpan upload yang tertunda ke IndexedDB.');
  });
};

// 3. Fungsi (yang akan dipanggil oleh Service Worker) untuk mengambil data tertunda
// Kita ekspor ini agar bisa digunakan di SW, meskipun SW akan punya logikanya sendiri
export const getPendingSuratUploads = async (): Promise<any[]> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Gagal mengambil data tertunda dari IndexedDB.');
  });
};

// 4. Fungsi (yang akan dipanggil oleh Service Worker) untuk menghapus data
export const deletePendingSuratUpload = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.delete(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Gagal menghapus item yang sudah di-sync dari IndexedDB.');
  });
};