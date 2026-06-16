// Directory: src/app/dashboard/hooks/useMaintenanceData.ts
// [HOOK BARU] Mengambil data maintenance dengan caching React Query.

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AsetMaintenance } from '@/types';
import { useUserAuth } from '@/context/AuthContext';

const fetchMaintenance = async (opdId: string): Promise<AsetMaintenance[]> => {
  const q = query(
    collection(db, "asetMaintenance"), 
    where("opdId", "==", opdId), 
    orderBy("tanggal", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AsetMaintenance));
};

export const useMaintenanceData = () => {
  const { userProfile } = useUserAuth();

  const { data: maintenanceLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['asetMaintenance', userProfile?.opdId],
    queryFn: () => fetchMaintenance(userProfile!.opdId),
    enabled: !!userProfile?.opdId,
    staleTime: 1000 * 60 * 5, // Cache 5 menit
  });

  return { maintenanceLogs, isLoading, refetch };
};