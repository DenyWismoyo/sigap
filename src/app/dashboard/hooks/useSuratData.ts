/**
 * Directory: src/app/dashboard/hooks/useSuratData.ts
 * Status: ULTIMATE OPTIMIZED (TANSTACK INFINITE QUERY)
 * Deskripsi: 
 * - Sepenuhnya menggunakan useInfiniteQuery untuk Pagination & Caching.
 * - Menghilangkan manual state management (useState) untuk performa maksimal.
 * - Murni SSOT.
 */

import { useMemo } from 'react';
import { 
    collection, query, where, getDocs, orderBy, limit, startAfter, 
    QueryDocumentSnapshot 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Surat } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';
import { useInfiniteQuery } from '@tanstack/react-query'; 

interface UseSuratDataProps {
  filterStatus?: string;
  filterJenis?: string;
  searchTerm?: string;
  isArchive?: boolean;
}

export const useSuratData = (props: UseSuratDataProps) => {
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth(); 
  
  const effectiveJabatan = actingJabatanProfile || jabatanProfile;
  const isPimpinan = useMemo(() => !!(effectiveJabatan && effectiveJabatan.level <= 5), [effectiveJabatan]);

  const { jabatanMap } = useMasterData(true, userProfile?.opdId);

  const topLeaderId = useMemo(() => {
      if (!userProfile?.opdId || jabatanMap.size === 0) return null;
      const jabatansInOpd = Array.from(jabatanMap.values()).filter(j => 
          j.opdId === userProfile.opdId && j.status === 'aktif'
      );
      if (jabatansInOpd.length === 0) return null;
      jabatansInOpd.sort((a, b) => a.level - b.level);
      return jabatansInOpd[0].id;
  }, [jabatanMap, userProfile?.opdId]);

  const isTuOrAdmin = userProfile?.role === 'staf_tu' || userProfile?.role === 'admin_opd' || userProfile?.role === 'super_admin';

  // --- 1. INFINITE QUERY FETCHER ---
  const fetchSuratPage = async ({ pageParam = null }: { pageParam?: QueryDocumentSnapshot | null }) => {
      if (!userProfile || !effectiveJabatan?.id) return { data: [], nextPageParam: null };

      const baseConstraints: any[] = [];

      if (isTuOrAdmin) {
          baseConstraints.push(where('opdId', '==', userProfile.opdId));
      } else {
          baseConstraints.push(where('terlibatJabatanIds', 'array-contains', effectiveJabatan.id));
      }

      baseConstraints.push(orderBy('tanggalDiterima', 'desc'));

      if (pageParam) {
          baseConstraints.push(startAfter(pageParam));
      }

      baseConstraints.push(limit(25));

      const q = query(collection(db, 'surat'), ...baseConstraints);
      const snap = await getDocs(q);

      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Surat));
      const nextPageParam = snap.docs.length === 25 ? snap.docs[snap.docs.length - 1] : null;

      return { data, nextPageParam };
  };

  // --- 2. REACT QUERY IMPLEMENTATION ---
  const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      refetch,
      error
  } = useInfiniteQuery({
      queryKey: ['suratList', userProfile?.opdId, effectiveJabatan?.id], 
      queryFn: fetchSuratPage,
      getNextPageParam: (lastPage) => lastPage.nextPageParam,
      enabled: !!userProfile && !!effectiveJabatan?.id,
      staleTime: 1000 * 60 * 2, // Cache 2 menit
      initialPageParam: null,
  });

  // Flat array of data dari semua pages yang sudah di-load
  const rawSuratList = useMemo(() => {
      return data?.pages.flatMap(page => page.data) || [];
  }, [data]);

  // --- 3. FILTER CLIENT-SIDE ---
  const filteredList = useMemo(() => {
      let list = [...rawSuratList];

      if (isPimpinan && !isTuOrAdmin) {
          list = list.filter(s => {
              if (s.statusPenyelesaian === 'Baru') {
                  if (s.tujuanJabatanId) {
                      return s.tujuanJabatanId === effectiveJabatan?.id;
                  } else {
                      if (topLeaderId) {
                          return effectiveJabatan?.id === topLeaderId;
                      } else {
                          return (effectiveJabatan?.level ?? 99) <= 3;
                      }
                  }
              }
              return true;
          });
      }

      if (props.filterStatus && props.filterStatus !== 'Semua') {
          list = list.filter(s => s.statusPenyelesaian === props.filterStatus);
      } else if (!props.isArchive) {
          const visibleStatuses = ['Baru', 'Revisi Disposisi', 'Didisposisikan', 'Proses Tindak Lanjut', 'Selesai'];
          list = list.filter(s => visibleStatuses.includes(s.statusPenyelesaian));
      } else {
          list = list.filter(s => s.statusPenyelesaian === 'Diarsipkan');
      }

      if (props.filterJenis && props.filterJenis !== 'Semua') {
          list = list.filter(s => s.jenisSurat === props.filterJenis);
      }

      if (props.searchTerm) {
          const term = props.searchTerm.toLowerCase();
          list = list.filter(s => 
              s.perihal.toLowerCase().includes(term) ||
              s.nomorSurat.toLowerCase().includes(term) ||
              s.pengirim.toLowerCase().includes(term)
          );
      }

      return list;
  }, [rawSuratList, props, isPimpinan, isTuOrAdmin, effectiveJabatan?.id, topLeaderId]);

  return { 
      suratList: filteredList, 
      loading: isLoading, 
      error: error ? error.message : null,
      loadMore: fetchNextPage,
      hasMore: !!hasNextPage,     
      isMoreLoading: isFetchingNextPage,
      refetch 
  };
};