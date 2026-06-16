/**
 * Directory: src/app/dashboard/hooks/useAgendaData.ts
 * Status: OPTIMIZED (NO N+1 QUERY)
 * Deskripsi: Hook khusus untuk mengambil Agenda. 
 * Menghapus N+1 Query dan murni menggunakan data denormalisasi 'infoTampilan'.
 */

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Surat, JadwalTempat } from '@/types';
import { useUserAuth } from '@/context/AuthContext';

const fetchAgendaUndangan = async (opdId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(today.getDate() + 30); // 30 hari kedepan

    const q = query(
        collection(db, 'surat'),
        where('opdId', '==', opdId),
        where('jenisSurat', '==', 'Undangan'),
        where('statusPenyelesaian', '!=', 'Diarsipkan'),
        where('detailAgenda.tanggal', '>=', Timestamp.fromDate(today)),
        where('detailAgenda.tanggal', '<', Timestamp.fromDate(future)),
        orderBy('detailAgenda.tanggal', 'asc')
    );
    
    const snap = await getDocs(q);
    
    // MENGHAPUS N+1 QUERY KE KOLEKSI DISPOSISI.
    // Kita langsung ekstrak penerimaDisposisi dari data denormalisasi surat yang sudah ditambal di Fase 1.
    return snap.docs.map(d => {
        const suratData = { id: d.id, ...d.data() } as Surat;
        
        // Membaca dari data Denormalisasi langsung
        const penerima = suratData.infoTampilan?.recipientNames || 'Belum Didisposikan';
        const isDidisposisikan = suratData.statusPenyelesaian !== 'Baru' && suratData.statusPenyelesaian !== 'Revisi Disposisi';

        return {
            ...suratData,
            penerimaDisposisi: penerima,
            disposisiStatus: isDidisposisikan ? 'Sudah Didisposisi' : 'Belum Didisposikan'
        };
    });
};

const fetchJadwalInternal = async (opdId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(today.getDate() + 30);

    const q = query(
        collection(db, "jadwalTempat"), 
        where("opdId", "==", opdId),
        where('tanggalMulai', '>=', Timestamp.fromDate(today)), 
        where('tanggalMulai', '<=', Timestamp.fromDate(future)),
        orderBy('tanggalMulai', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JadwalTempat));
};

export const useAgendaData = () => {
    const { userProfile } = useUserAuth();

    const { data: undangan = [], isLoading: loadUndangan, refetch: refetchUndangan } = useQuery({
        queryKey: ['agenda', 'undangan', userProfile?.opdId],
        queryFn: () => fetchAgendaUndangan(userProfile!.opdId),
        enabled: !!userProfile?.opdId,
        staleTime: 1000 * 60 * 10, // Cache 10 menit
    });

    const { data: internal = [], isLoading: loadInternal, refetch: refetchInternal } = useQuery({
        queryKey: ['agenda', 'internal', userProfile?.opdId],
        queryFn: () => fetchJadwalInternal(userProfile!.opdId),
        enabled: !!userProfile?.opdId,
        staleTime: 1000 * 60 * 10, // Cache 10 menit
    });

    return { 
        agendaUndangan: undangan as any, 
        jadwalInternalList: internal, 
        isLoading: loadUndangan || loadInternal,
        refetch: () => {
            refetchUndangan();
            refetchInternal();
        }
    };
};