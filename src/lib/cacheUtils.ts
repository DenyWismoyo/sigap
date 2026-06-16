// Lokasi File: src/lib/cacheUtils.ts
// LOG PERUBAHAN (Sistem Update):
// 1. [FILE BARU] Menambahkan file ini untuk memperbaiki error TypeError "useCache is not a function".
// 2. Hook 'useCache' ini mengambil data master (seperti 'users' atau 'jabatan')
//    berdasarkan 'opdId' dan menyediakan data tersebut untuk komponen lain (seperti RuangKerja).

"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Query } from 'firebase/firestore';

/**
 * Custom hook untuk mengambil dan menyimpan cache koleksi data berdasarkan OPD.
 * @param collectionName Nama koleksi Firestore (misal: 'users', 'jabatan').
 * @param opdIdField Nama field di dokumen yang berisi opdId (misal: 'opdId').
 * @param opdId ID OPD yang sedang aktif.
 * @returns { data: Map<string, T>, isLoading: boolean }
 */
export function useCache<T extends { id: string }>(
  collectionName: string,
  opdIdField: string,
  opdId: string | undefined
) {
  const [data, setData] = useState<Map<string, T>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!opdId) {
      setIsLoading(false);
      setData(new Map()); // Kosongkan data jika tidak ada opdId
      return;
    }

    setIsLoading(true);
    
    // Buat query berdasarkan opdId
    const q: Query = query(
      collection(db, collectionName),
      where(opdIdField, '==', opdId)
    );

    // Gunakan onSnapshot untuk menjaga data tetap sinkron
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMap = new Map<string, T>();
      snapshot.forEach(doc => {
        // Asumsi 'id' dokumen adalah ID utama
        // Jika Anda menggunakan 'jabatanId' sebagai KUNCI PETA, logika di sini perlu diubah
        // Tapi untuk 'users' (key: NIP) dan 'jabatan' (key: JabatanID), 'doc.id' adalah kunci yang aman.
        
        // Berdasarkan kode Anda sebelumnya, userCache menggunakan 'jabatanId' sebagai kunci.
        // Kita akan buat ini fleksibel.
        const docData = { id: doc.id, ...doc.data() } as T & { jabatanId?: string };

        let key: string;
        if (collectionName === 'users' && docData.jabatanId) {
          key = docData.jabatanId; // Kunci Peta adalah JabatanID
        } else {
          key = doc.id; // Kunci Peta adalah ID Dokumen
        }
        
        newMap.set(key, docData as T);
      });
      
      setData(newMap);
      setIsLoading(false);
    }, (error) => {
      console.error(`Gagal memuat cache ${collectionName}:`, error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, opdId, opdIdField]);

  return { data, isLoading };
}