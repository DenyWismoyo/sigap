/**
 * Directory: src/app/dashboard/hooks/useSuratDetail.ts
 * Status: HIGH PERFORMANCE - SINGLE AGGREGATED QUERY
 * History Updates:
 * - Mengganti 3 useQuery terpisah menjadi 1 Aggregated Query menggunakan Promise.all.
 * - Mencegah waterfall rendering dan mengurangi re-render cycle di React.
 * - Memastikan data Surat, Disposisi, dan Tindak Lanjut dimuat secara serentak.
 */

import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Surat, Disposisi, TindakLanjut } from '@/types';

// Interface untuk data gabungan
interface SuratDetailAggregated {
    surat: Surat | null;
    disposisiList: Disposisi[];
    tindakLanjutList: TindakLanjut[];
}

// --- SINGLE AGGREGATED FETCHER ---
const fetchSuratLengkap = async (suratId: string): Promise<SuratDetailAggregated> => {
    if (!suratId) return { surat: null, disposisiList: [], tindakLanjutList: [] };

    // 1. Siapkan semua promise (Mereka akan berjalan paralel secara independen di background)
    const suratPromise = getDoc(doc(db, 'surat', suratId));
    
    const disposisiPromise = getDocs(query(
        collection(db, 'disposisi'),
        where('suratId', '==', suratId),
        orderBy('tanggalDisposisi', 'desc')
    ));

    const tindakLanjutPromise = getDocs(query(
        collection(db, 'tindakLanjut'),
        where('suratId', '==', suratId),
        orderBy('tanggalLaporan', 'desc')
    ));

    // 2. Eksekusi semua secara serentak dengan Promise.all
    // Ini menghilangkan efek waterfall. Waktu tunggu total = waktu query terlama, BUKAN total dari ketiga query.
    const [suratSnap, disposisiSnap, tindakLanjutSnap] = await Promise.all([
        suratPromise, 
        disposisiPromise, 
        tindakLanjutPromise
    ]);

    // 3. Ekstrak dan format data
    const suratData = suratSnap.exists() ? { id: suratSnap.id, ...suratSnap.data() } as Surat : null;
    const disposisiData = disposisiSnap.docs.map(d => ({ id: d.id, ...d.data() } as Disposisi));
    const tindakLanjutData = tindakLanjutSnap.docs.map(d => ({ id: d.id, ...d.data() } as TindakLanjut));

    return {
        surat: suratData,
        disposisiList: disposisiData,
        tindakLanjutList: tindakLanjutData
    };
};

// --- MAIN HOOK ---
export const useSuratDetail = (suratId: string) => {
    
    const { 
        data, 
        isLoading,
        error,
        refetch
    } = useQuery<SuratDetailAggregated>({
        queryKey: ['suratDetailFull', suratId], // Gunakan 1 key utama untuk keseluruhan bundel surat ini
        queryFn: () => fetchSuratLengkap(suratId),
        enabled: !!suratId,
        staleTime: 1000 * 60 * 5, // Data dianggap segar selama 5 menit
        gcTime: 1000 * 60 * 30, // Tetap di memori selama 30 menit setelah tab ditutup
    });

    // Kembalikan struktur yang sama agar tidak merusak [id]/page.tsx yang sudah ada
    return {
        surat: data?.surat || null,
        disposisiList: data?.disposisiList || [],
        tindakLanjutList: data?.tindakLanjutList || [],
        isLoading: isLoading,
        error: error ? "Gagal memuat detail surat." : null,
        refetch
    };
};