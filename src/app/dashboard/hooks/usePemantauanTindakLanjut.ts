// Lokasi: src/app/dashboard/hooks/usePemantauanTindakLanjut.ts
// [OPTIMASI DATABASE READS]:
// - Menerapkan Database-Level Filtering (Mencegah Overfetching).
// - Memerlukan Denormalisasi: Pastikan saat membuat 'tindakLanjut', 
//   field 'opdId' dan 'terlibatJabatanIds' dari surat ikut disimpan ke dokumen tindakLanjut.

import { useState, useCallback, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, documentId, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TindakLanjut, Surat } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useMasterData } from './useMasterData';

export type TindakLanjutEnriched = TindakLanjut & {
    surat?: Surat;
    pelaporNama: string;
    pelaporJabatan: string;
};

export const usePemantauanTindakLanjut = () => {
    const { userProfile, jabatanProfile, actingJabatanProfile } = useUserAuth();
    const { userMap, jabatanMap, isLoading: isMasterLoading } = useMasterData(true, userProfile?.opdId);

    const [feedTindakLanjut, setFeedTindakLanjut] = useState<TindakLanjutEnriched[]>([]);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const effectiveJabatanId = actingJabatanProfile?.id || jabatanProfile?.id;
    const isTuOrAdmin = userProfile ? ['admin_opd', 'staf_tu', 'super_admin'].includes(userProfile.role) : false;

    const fetchPemantauanData = useCallback(async (isLoadMore = false) => {
        if (!userProfile?.opdId || isMasterLoading || userMap.size === 0 || !effectiveJabatanId) return;

        if (isLoadMore) {
            if (!lastVisible) return;
            setIsMoreLoading(true);
        } else {
            setIsLoading(true);
            setFeedTindakLanjut([]);
        }

        try {
            // [OPTIMASI 1]: Filter langsung di level Firestore
            const constraints: any[] = [
                where('opdId', '==', userProfile.opdId) // Wajib ditambahkan di database
            ];
            
            // Jika bukan Admin/TU, batasi HANYA pada surat yang melibatkannya
            if (!isTuOrAdmin) {
                constraints.push(where('terlibatJabatanIds', 'array-contains', effectiveJabatanId));
            }

            constraints.push(orderBy('tanggalLaporan', 'desc'));
            
            if (isLoadMore && lastVisible) {
                constraints.push(startAfter(lastVisible));
            }
            
            // Karena sudah di-filter secara eksak, limit 20 sudah sangat cukup dan hemat
            constraints.push(limit(20)); 

            const qTl = query(collection(db, 'tindakLanjut'), ...constraints);
            const snapTl = await getDocs(qTl);

            if (snapTl.docs.length > 0) {
                setLastVisible(snapTl.docs[snapTl.docs.length - 1]);
                setHasMore(snapTl.docs.length === 20);
            } else {
                setHasMore(false);
            }

            const tlList = snapTl.docs.map(d => ({ id: d.id, ...d.data() } as any)); // as any karena kita berasumsi ada opdId

            if (tlList.length === 0) {
                setIsLoading(false);
                setIsMoreLoading(false);
                return;
            }

            // [OPTIMASI 2]: Fetch Surat hanya untuk dokumen yang BENAR-BENAR akan ditampilkan
            const suratIds = [...new Set(tlList.map(tl => tl.suratId))];
            const suratMap = new Map<string, Surat>();

            for (let i = 0; i < suratIds.length; i += 30) {
                const chunk = suratIds.slice(i, i + 30);
                const qSurat = query(collection(db, 'surat'), where(documentId(), 'in', chunk));
                const snapSurat = await getDocs(qSurat);
                snapSurat.forEach(d => suratMap.set(d.id, { id: d.id, ...d.data() } as Surat));
            }

            // Enrich Data (Tidak perlu lagi membuang data (filtering) di tahap ini)
            const enrichedData: TindakLanjutEnriched[] = tlList.map(tl => {
                const surat = suratMap.get(tl.suratId);
                const pelaporUser = userMap.get(tl.jabatanId);
                const pelaporJabatan = jabatanMap.get(tl.jabatanId);

                return {
                    ...tl,
                    surat,
                    pelaporNama: pelaporUser?.namaLengkap || 'Pegawai Tidak Dikenal',
                    pelaporJabatan: pelaporJabatan?.namaJabatan || 'Jabatan Kosong'
                };
            });

            if (isLoadMore) {
                setFeedTindakLanjut(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const filteredNew = enrichedData.filter(e => !existingIds.has(e.id));
                    return [...prev, ...filteredNew];
                });
            } else {
                setFeedTindakLanjut(enrichedData);
            }

        } catch (error) {
            console.error("Error fetching pemantauan data:", error);
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
        }
    }, [userProfile?.opdId, isMasterLoading, userMap, jabatanMap, lastVisible, isTuOrAdmin, effectiveJabatanId]);

    useEffect(() => {
        if (userProfile?.opdId && !isMasterLoading && userMap.size > 0 && effectiveJabatanId) {
            fetchPemantauanData(false);
        }
    }, [userProfile?.opdId, isMasterLoading, effectiveJabatanId]); 

    const refetch = useCallback(() => {
        setLastVisible(null);
        fetchPemantauanData(false);
    }, [fetchPemantauanData]);

    const loadMore = useCallback(() => {
        fetchPemantauanData(true);
    }, [fetchPemantauanData]);

    return { 
        feedTindakLanjut, 
        isLoading: isLoading || isMasterLoading,
        isMoreLoading,
        hasMore,
        loadMore,
        refetch
    };
};