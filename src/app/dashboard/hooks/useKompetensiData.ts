/**
 * Directory: src/app/dashboard/hooks/useKompetensiData.ts
 * History Update:
 * - 2024-11-28: Initial creation. Hook for fetching and managing competency portfolio (Diklat & Penghargaan).
 * - [FIX] Removed 'orderBy' from Firestore query to prevent Missing Index Error. Sorting is now done client-side.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RiwayatDiklat, RiwayatPenghargaan } from '@/types';
import { useUserAuth } from '@/context/AuthContext';

const fetchDiklat = async (userId: string): Promise<RiwayatDiklat[]> => {
    // [FIX] Hapus orderBy('tahun', 'desc') dari query Firestore untuk menghindari error "Missing Index".
    // Kita akan melakukan sorting di sisi client (JavaScript) setelah data diambil.
    const q = query(
        collection(db, 'riwayat_diklat'),
        where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    
    // Mapping dan Sorting Client-side (Terbaru di atas)
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as RiwayatDiklat))
        .sort((a, b) => b.tahun - a.tahun); 
};

const fetchPenghargaan = async (userId: string): Promise<RiwayatPenghargaan[]> => {
    // [FIX] Hapus orderBy('tahun', 'desc') dari sini juga.
    const q = query(
        collection(db, 'riwayat_penghargaan'),
        where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    
    // Mapping dan Sorting Client-side
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as RiwayatPenghargaan))
        .sort((a, b) => b.tahun - a.tahun);
};

export const useKompetensiData = () => {
    const { userProfile } = useUserAuth();
    const queryClient = useQueryClient();

    const userId = userProfile?.uid;

    // 1. Query Diklat
    const { data: diklatList = [], isLoading: isDiklatLoading } = useQuery({
        queryKey: ['riwayat_diklat', userId],
        queryFn: () => fetchDiklat(userId!),
        enabled: !!userId,
    });

    // 2. Query Penghargaan
    const { data: penghargaanList = [], isLoading: isPenghargaanLoading } = useQuery({
        queryKey: ['riwayat_penghargaan', userId],
        queryFn: () => fetchPenghargaan(userId!),
        enabled: !!userId,
    });

    // Mutasi: Tambah Diklat
    const addDiklatMutation = useMutation({
        mutationFn: async (data: Omit<RiwayatDiklat, 'id'>) => {
            await addDoc(collection(db, 'riwayat_diklat'), data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['riwayat_diklat', userId] });
        },
    });

    // Mutasi: Hapus Diklat
    const deleteDiklatMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteDoc(doc(db, 'riwayat_diklat', id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['riwayat_diklat', userId] });
        },
    });

    // Mutasi: Tambah Penghargaan
    const addPenghargaanMutation = useMutation({
        mutationFn: async (data: Omit<RiwayatPenghargaan, 'id'>) => {
            await addDoc(collection(db, 'riwayat_penghargaan'), data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['riwayat_penghargaan', userId] });
        },
    });

    // Mutasi: Hapus Penghargaan
    const deletePenghargaanMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteDoc(doc(db, 'riwayat_penghargaan', id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['riwayat_penghargaan', userId] });
        },
    });

    return {
        diklatList,
        penghargaanList,
        isLoading: isDiklatLoading || isPenghargaanLoading,
        addDiklat: addDiklatMutation.mutateAsync,
        deleteDiklat: deleteDiklatMutation.mutateAsync,
        addPenghargaan: addPenghargaanMutation.mutateAsync,
        deletePenghargaan: deletePenghargaanMutation.mutateAsync,
        isMutating: addDiklatMutation.isPending || deleteDiklatMutation.isPending || addPenghargaanMutation.isPending || deletePenghargaanMutation.isPending
    };
};