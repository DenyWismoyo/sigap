/**
 * Directory: src/app/dashboard/hooks/useInstruksiTemplat.ts
 * Status: OPTIMIZED WITH REACT QUERY (SSOT)
 * Deskripsi: Hook khusus untuk mengambil templat instruksi.
 * Menggunakan caching agar tidak membebani AuthContext.
 */

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InstruksiTemplat } from '@/types';
import { useUserAuth } from '@/context/AuthContext';

// Fetcher Function: Mengambil data dari Firestore
const fetchTemplates = async (opdId: string): Promise<InstruksiTemplat[]> => {
    // 1. Ambil Templat Khusus OPD Ini
    const qOpd = query(
        collection(db, 'instruksiTemplat'), 
        where('opdId', '==', opdId)
    );

    // 2. Ambil Templat Global/Shared (yang dibagikan ke OPD ini)
    const qShared = query(
        collection(db, 'instruksiTemplat'), 
        where('sharedWithOpdIds', 'array-contains', opdId)
    );

    // Jalankan kedua query secara paralel
    const [snapOpd, snapShared] = await Promise.all([
        getDocs(qOpd),
        getDocs(qShared)
    ]);

    // Gabungkan hasil dan hapus duplikat (Map berdasarkan ID)
    const dataMap = new Map<string, InstruksiTemplat>();

    snapOpd.forEach((doc) => {
        dataMap.set(doc.id, { id: doc.id, ...doc.data() } as InstruksiTemplat);
    });

    snapShared.forEach((doc) => {
        dataMap.set(doc.id, { id: doc.id, ...doc.data() } as InstruksiTemplat);
    });

    const combinedData = Array.from(dataMap.values());
    
    // Sortir agar templat OPD sendiri muncul duluan atau berdasarkan abjad
    // Disini kita sort berdasarkan panjang teks (asumsi: yang pendek lebih sering dipakai)
    return combinedData.sort((a, b) => a.teksInstruksi.length - b.teksInstruksi.length);
};

export const useInstruksiTemplat = () => {
  const { userProfile } = useUserAuth();
  
  // Hanya jalankan query jika userProfile & opdId sudah siap
  const isEnabled = !!userProfile?.opdId;

  const { data: templatList = [], isLoading, error } = useQuery({
    queryKey: ['instruksiTemplat', userProfile?.opdId], // Key unik per OPD
    queryFn: () => fetchTemplates(userProfile!.opdId),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60, // Cache data selama 1 jam (sangat efisien)
    gcTime: 1000 * 60 * 60 * 24, // Simpan di memori selama 24 jam
    retry: 1, // Coba lagi 1x jika gagal
  });

  return { 
      templatList, 
      isLoading: isLoading && isEnabled, // Loading hanya true jika query sedang jalan
      error: error ? (error as Error).message : null 
  };
};