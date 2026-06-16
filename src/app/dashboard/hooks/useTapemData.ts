import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { KerjaSama, Wilayah, TapemStats } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useMemo } from 'react';

// --- FETCHERS ---

const fetchKerjaSama = async (): Promise<KerjaSama[]> => {
  // Mengambil semua data kerja sama (bisa difilter per OPD jika perlu, tapi Tapem biasanya butuh lihat semua)
  const q = query(collection(db, 'tapem_kerjasama'), orderBy('tanggalAkhir', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as KerjaSama));
};

const fetchWilayah = async (): Promise<Wilayah[]> => {
  const q = query(collection(db, 'tapem_wilayah'), orderBy('kodeWilayah', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wilayah));
};

// --- HOOK UTAMA ---

export const useTapemData = () => {
  const { userProfile } = useUserAuth();
  const queryClient = useQueryClient();

  const isEnabled = !!userProfile; // Hanya fetch jika user login

  // 1. Query Kerja Sama
  const { data: kerjaSamaList = [], isLoading: loadingKerjaSama } = useQuery({
    queryKey: ['tapem', 'kerjasama'],
    queryFn: fetchKerjaSama,
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5, // 5 menit
  });

  // 2. Query Wilayah
  const { data: wilayahList = [], isLoading: loadingWilayah } = useQuery({
    queryKey: ['tapem', 'wilayah'],
    queryFn: fetchWilayah,
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60, // 1 jam (data wilayah jarang berubah)
  });

  // 3. Hitung Statistik
  const stats: TapemStats = useMemo(() => {
    const now = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(now.getDate() + 90);

    let active = 0;
    let warning = 0;

    kerjaSamaList.forEach(k => {
      const end = k.tanggalAkhir.toDate();
      if (end > now) {
        active++;
        if (end <= ninetyDaysLater) {
          warning++;
        }
      }
    });

    return {
      totalKerjaSama: kerjaSamaList.length,
      kerjaSamaAktif: active,
      kerjaSamaAkanBerakhir: warning,
      totalKecamatan: wilayahList.filter(w => w.jenis === 'Kecamatan').length,
      totalKelurahan: wilayahList.filter(w => w.jenis === 'Kelurahan').length,
    };
  }, [kerjaSamaList, wilayahList]);

  // --- MUTATIONS (Untuk Create/Update/Delete nanti) ---
  // Placeholder untuk langkah selanjutnya

  return {
    kerjaSamaList,
    wilayahList,
    stats,
    isLoading: loadingKerjaSama || loadingWilayah
  };
};