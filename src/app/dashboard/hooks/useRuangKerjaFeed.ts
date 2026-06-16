// Lokasi: src/app/dashboard/hooks/useRuangKerjaFeed.ts
// [UPDATE 1] REFACTOR: Menghapus query berat disposisi & tugas, diganti dengan 1x read 'userSummaries'.
// [UPDATE 2] Menambah Fetcher Khusus Surat Baru agar tidak terlewat limit Paginasi 25 SSOT.
// [UPDATE 3] Menambahkan properti isReadOnly untuk Admin OPD.

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, limit, getDocs, documentId, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserAuth } from '@/context/AuthContext';
import { Surat, Tugas, DrafPersetujuan, RuangKerjaItem, Disposisi } from '@/types';
import { useMemo, useCallback, useState } from 'react';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';
import { useSuratData } from '@/app/dashboard/hooks/useSuratData'; // IMPORT SSOT

// --- FETCHER KHUSUS SURAT BARU PIMPIMAN (ANTI-HILANG) ---
const fetchSuratBaruPending = async (opdId: string): Promise<Surat[]> => {
  const qBaru = query(
      collection(db, 'surat'),
      where('opdId', '==', opdId),
      where('statusPenyelesaian', '==', 'Baru')
  );
  const snap = await getDocs(qBaru);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Surat));
};

// --- FETCHER DRAF ---
const fetchDraf = async (jabatanId: string, itemLimit: number): Promise<DrafPersetujuan[]> => {
  const q = query(
    collection(db, 'drafPersetujuan'),
    where('penerimaTugasJabatanId', '==', jabatanId),
    where('status', '==', 'Proses Review'),
    limit(itemLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DrafPersetujuan));
};

export const useRuangKerjaFeed = () => {
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth();
  const effectiveJabatan = actingJabatanProfile || jabatanProfile;
  const queryClient = useQueryClient();

  const { jabatanMap } = useMasterData(true, userProfile?.opdId);

  const [feedLimit, setFeedLimit] = useState(20);

  const topLeaderId = useMemo(() => {
      if (!userProfile?.opdId || jabatanMap.size === 0) return null;
      const jabatansInOpd = Array.from(jabatanMap.values()).filter(j => 
          j.opdId === userProfile.opdId && j.status === 'aktif'
      );
      if (jabatansInOpd.length === 0) return null;
      jabatansInOpd.sort((a, b) => a.level - b.level);
      return jabatansInOpd[0].id;
  }, [jabatanMap, userProfile?.opdId]);

  const isPimpinan = effectiveJabatan && effectiveJabatan.level <= 5;
  const isAdminOrTU = userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu';
  const isAdminOnly = userProfile?.role === 'admin_opd'; 
  
  // 1. DAPATKAN DATA SURAT DARI SSOT
  const { suratList, loading: suratLoading, refetch: refetchSurat } = useSuratData({});

  // 2. FETCH DATA SPESIFIK RUANG KERJA
  const results = useQueries({
    queries: [
      {
        // PENGGANTI fetchActiveDisposisi dan fetchTugas (Hanya 1 Dokumen Read)
        queryKey: ['feed', 'user_summaries', effectiveJabatan?.id],
        queryFn: async () => {
          const snap = await getDoc(doc(db, 'userSummaries', effectiveJabatan!.id!));
          return snap.exists() ? snap.data() : { pendingDisposisi: {}, pendingTugas: {} };
        },
        enabled: !!effectiveJabatan?.id,
        staleTime: 1000 * 60 * 2,
      },
      {
        queryKey: ['feed', 'surat_baru_pending', userProfile?.opdId],
        queryFn: () => fetchSuratBaruPending(userProfile!.opdId!),
        enabled: !!userProfile?.opdId && (isPimpinan || isAdminOrTU),
        staleTime: 1000 * 60 * 2,
      },
      {
        queryKey: ['feed', 'draf', effectiveJabatan?.id, feedLimit],
        queryFn: () => fetchDraf(effectiveJabatan!.id!, feedLimit),
        enabled: !!effectiveJabatan?.id && (isPimpinan || isAdminOrTU),
        staleTime: 1000 * 60 * 2,
      }
    ]
  });

  const [summariesQuery, suratBaruQuery, drafQuery] = results;

  // 3. EKSTRAKSI DATA DARI SUMMARIES
  const activeDisposisi = useMemo(() => {
    const data = summariesQuery.data?.pendingDisposisi || {};
    return Object.values(data) as (Disposisi & { needsAcknowledge: boolean })[];
  }, [summariesQuery.data]);

  const activeTugas = useMemo(() => {
    const data = summariesQuery.data?.pendingTugas || {};
    return Object.values(data) as Tugas[];
  }, [summariesQuery.data]);

  // 4. DETEKSI SURAT MISSING (Tersingkir oleh Paginasi SSOT)
  const missingSuratIds = useMemo(() => {
      if (!activeDisposisi.length) return [];
      const ssotIds = new Set(suratList.map(s => s.id));
      const activeIds = activeDisposisi.map(d => d.suratId).filter(Boolean) as string[];
      return [...new Set(activeIds.filter(id => !ssotIds.has(id)))];
  }, [activeDisposisi, suratList]);

  const { data: missingSuratList = [], isLoading: missingSuratLoading } = useQuery({
      queryKey: ['feed', 'missing_surat', missingSuratIds],
      queryFn: async () => {
          if (missingSuratIds.length === 0) return [];
          const results: Surat[] = [];
          for (let i = 0; i < missingSuratIds.length; i += 10) {
              const chunk = missingSuratIds.slice(i, i + 10);
              const q = query(collection(db, 'surat'), where(documentId(), 'in', chunk));
              const snap = await getDocs(q);
              results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as Surat)));
          }
          return results;
      },
      enabled: missingSuratIds.length > 0,
      staleTime: 1000 * 60 * 2,
  });

  // 5. GABUNGKAN SSOT, MISSING SURAT, DAN SURAT BARU PENDING
  const unifiedSuratList = useMemo(() => {
      const map = new Map<string, Surat>();
      suratList.forEach(s => map.set(s.id!, s));
      missingSuratList.forEach(s => map.set(s.id!, s));
      (suratBaruQuery.data || []).forEach(s => map.set(s.id!, s));
      return Array.from(map.values());
  }, [suratList, missingSuratList, suratBaruQuery.data]);

  // 6. RAKIT RUANG KERJA ITEM
  const feedItems: RuangKerjaItem[] = useMemo(() => {
    const items: any[] = [];

    // A. Proses Surat Baru
    unifiedSuratList.forEach(s => {
        if (s.statusPenyelesaian === 'Baru') {
            let shouldShow = false;
            
            if (isAdminOrTU) {
                shouldShow = true;
            } else if (isPimpinan) {
                if (s.tujuanJabatanId) {
                    shouldShow = s.tujuanJabatanId === effectiveJabatan?.id;
                } else {
                    if (topLeaderId) {
                        shouldShow = effectiveJabatan?.id === topLeaderId;
                    } else {
                        shouldShow = effectiveJabatan?.level <= 3;
                    }
                }
            }

            if (shouldShow) {
                items.push({
                    type: 'surat_baru',
                    surat: s,
                    fromJabatanName: s.pengirim,
                    isReadOnly: isAdminOnly 
                });
            }
        }
    });

    // B. Proses Disposisi (Dari Summaries)
    activeDisposisi.forEach(disp => {
      const suratInfo = unifiedSuratList.find(s => s.id === disp.suratId);
      
      if (suratInfo && suratInfo.statusPenyelesaian !== 'Selesai' && suratInfo.statusPenyelesaian !== 'Diarsipkan') {
          // Ambil boolean fallback jika property needsAcknowledge gagal tersimpan
          const needsAcknowledge = disp.needsAcknowledge !== undefined 
              ? disp.needsAcknowledge 
              : !(disp.penerimaDiterima || []).includes(effectiveJabatan!.id!);
          
          const now = Date.now();
          let batasWaktuMillis = 0;
          if (disp.batasWaktu) {
              batasWaktuMillis = typeof disp.batasWaktu.toMillis === 'function' 
                  ? disp.batasWaktu.toMillis() 
                  : (disp.batasWaktu as any).seconds * 1000;
          }

          const isOverdue = !!(batasWaktuMillis && batasWaktuMillis < now && !needsAcknowledge);

          items.push({
            type: 'surat_disposisi',
            surat: suratInfo,
            disposisi: disp,
            needsAcknowledge,
            needsTindakLanjut: !needsAcknowledge,
            isOverdue,
            fromJabatanName: disp.dariJabatanNama || 'Atasan',
            isReadOnly: isAdminOnly
          });
      }
    });

    // C. Proses Tugas (Dari Summaries)
    activeTugas.forEach(t => items.push({
      type: 'tugas',
      tugas: t,
      fromJabatanName: t.dariJabatanNama || 'Atasan'
    }));

    // D. Proses Draf
    (drafQuery.data || []).forEach(d => items.push({
      type: 'draf',
      draf: d,
      fromJabatanName: d.pembuatNama || 'Staf'
    }));

    // SORTING TERAKHIR (Terbaru di atas)
    return items.sort((a, b) => {
      const getDate = (item: any) => {
        if (item.type === 'surat_baru') return item.surat.tanggalDiterima;
        if (item.type === 'surat_disposisi') return item.disposisi.tanggalDisposisi;
        if (item.type === 'tugas') return item.tugas.tanggalDibuat;
        if (item.type === 'draf') return item.draf.createdAt;
        return null;
      };

      const getMillis = (dateObj: any) => {
          if (!dateObj) return 0;
          if (typeof dateObj.toMillis === 'function') return dateObj.toMillis();
          if (dateObj.seconds) return dateObj.seconds * 1000;
          return Date.now();
      };

      return getMillis(getDate(b)) - getMillis(getDate(a));
    });
  }, [unifiedSuratList, activeDisposisi, activeTugas, drafQuery.data, effectiveJabatan, isAdminOrTU, isPimpinan, topLeaderId, isAdminOnly]);

  const isLoading = suratLoading || missingSuratLoading || results.some(q => q.isLoading);

  const hasMore = useMemo(() => {
      // Limit hanya diterapkan pada Draf sekarang, karena summary menarik semua data aktif
      return (drafQuery.data?.length === feedLimit);
  }, [drafQuery.data, feedLimit]);

  const loadMore = useCallback(() => {
      setFeedLimit(prev => prev + 20); 
  }, []);

  const refreshFeed = useCallback(() => {
    refetchSurat(); 
    
    // [FIX GHOSTING BUG]
    // Beri waktu 2.5 detik agar Cloud Function (agregasiSummaries)
    // selesai mengupdate dokumen userSummaries di backend.
    setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['feed'] }); 
    }, 2500);
    
  }, [queryClient, refetchSurat]);

  return { feedItems, isLoading, refreshFeed, loadMore, hasMore };
};