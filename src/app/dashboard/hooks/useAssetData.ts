// Directory: src/app/dashboard/hooks/useAssetData.ts
// [HOOK BARU] Mengambil data aset dengan caching React Query.
// Digunakan oleh InventarisTab, MaintenanceTab, dan PeminjamanTab.

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AsetInventaris } from '@/types';
import { useUserAuth } from '@/context/AuthContext';

const fetchAssets = async (opdId: string): Promise<AsetInventaris[]> => {
  const q = query(
    collection(db, 'asetInventaris'),
    where('opdId', '==', opdId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AsetInventaris));
};

export const useAssetData = () => {
  const { userProfile } = useUserAuth();

  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['assets', userProfile?.opdId],
    queryFn: () => fetchAssets(userProfile!.opdId),
    enabled: !!userProfile?.opdId,
    staleTime: 1000 * 60 * 5, // Cache 5 menit
  });

  return { assets, isLoading, refetch };
};