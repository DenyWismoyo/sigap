// Directory: src/app/dashboard/hooks/usePeminjamanData.ts
// [HOOK BARU] Mengambil data peminjaman dengan caching React Query.

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PeminjamanAset } from '@/types';
import { useUserAuth } from '@/context/AuthContext';

const fetchPeminjaman = async (opdId: string): Promise<PeminjamanAset[]> => {
  const q = query(
    collection(db, "peminjamanAset"), 
    where("opdId", "==", opdId), 
    orderBy("tanggalPinjam", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PeminjamanAset));
};

export const usePeminjamanData = () => {
  const { userProfile } = useUserAuth();

  const { data: peminjamanList = [], isLoading, refetch } = useQuery({
    queryKey: ['peminjamanAset', userProfile?.opdId],
    queryFn: () => fetchPeminjaman(userProfile!.opdId),
    enabled: !!userProfile?.opdId,
    staleTime: 1000 * 60 * 2, // Cache 2 menit
  });

  return { peminjamanList, isLoading, refetch };
};