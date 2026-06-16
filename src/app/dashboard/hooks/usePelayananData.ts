// Lokasi: src/app/dashboard/hooks/usePelayananData.ts
// [UPGRADE] Menghapus NIK, Menambahkan Nama Pengambil.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, doc, Timestamp, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PelayananTransaksi } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useMemo } from 'react';
import { sendWhatsAppNotification } from '@/lib/whatsapp'; 
import { updateLogbook } from '@/lib/logbookUtils'; 

// Tipe Data untuk Pengaturan Kolom
export interface CustomColumn {
    id: string;
    label: string;
    type: 'text' | 'dropdown';
    options?: string[]; // Hanya jika type === 'dropdown'
    required: boolean;
}

export interface PelayananSettings {
    opdId: string;
    customColumns: CustomColumn[];
}

// Fetcher Pengaturan
const fetchPelayananSettings = async (opdId: string): Promise<PelayananSettings> => {
    const docRef = doc(db, 'pelayanan_settings', opdId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as PelayananSettings;
    }
    // Default jika belum ada pengaturan
    return { opdId, customColumns: [] };
};

const fetchPelayananTransactions = async (opdId: string) => {
    const q = query(
        collection(db, 'pelayanan_transaksi'),
        where('opdId', '==', opdId),
        orderBy('createdAt', 'desc'),
        limit(500) 
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PelayananTransaksi));
};

export const usePelayananData = () => {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const opdId = userProfile?.opdId;

    // 1. Query Transaksi
    const { data: allTransactions = [], isLoading: isTxLoading } = useQuery({
        queryKey: ['pelayanan', opdId],
        queryFn: () => fetchPelayananTransactions(opdId!),
        enabled: !!opdId,
        staleTime: 1000 * 60 * 2,
    });

    // 2. Query Pengaturan (Kolom Kustom) - Cache Tahan Lama
    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: ['pelayanan_settings', opdId],
        queryFn: () => fetchPelayananSettings(opdId!),
        enabled: !!opdId,
        staleTime: 1000 * 60 * 60 * 24, // Cache 24 jam (sangat jarang berubah)
    });

    const customColumns = settings?.customColumns || [];

    // ... (Logika Statistik Stats & StatsPeriodik tetap sama) ...
    const { pengambilanList, layananUmumList, stats, statsPeriodik } = useMemo(() => {
        const pengambilanList = allTransactions.filter(t => t.kategori === 'Pengambilan');
        const layananUmumList = allTransactions.filter(t => t.kategori === 'Layanan Umum');
        const total = allTransactions.length;
        const selesai = allTransactions.filter(t => t.status === 'Selesai').length;
        const diproses = allTransactions.filter(t => t.status === 'Diproses' || t.status === 'Menunggu').length;

        const now = new Date();
        const todayStr = now.toDateString();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        let harian = 0; let bulanan = 0; let tahunan = 0;
        const rincianHarian: Record<string, number> = {};

        allTransactions.forEach(t => {
            const tDate = t.tanggal.toDate();
            if (tDate.getFullYear() === thisYear) tahunan++;
            if (tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear) bulanan++;
            if (tDate.toDateString() === todayStr) {
                harian++;
                const jenis = t.jenisDokumen || t.judulLayanan || 'Lainnya';
                rincianHarian[jenis] = (rincianHarian[jenis] || 0) + 1;
            }
        });
        
        return { pengambilanList, layananUmumList, stats: {total, selesai, diproses}, statsPeriodik: {harian, bulanan, tahunan, rincianHarian} };
    }, [allTransactions]);


    // Mutasi: Simpan Pengaturan Kolom
    const saveSettingsMutation = useMutation({
        mutationFn: async (newColumns: CustomColumn[]) => {
            if (!opdId) throw new Error("OPD ID tidak ditemukan");
            const docRef = doc(db, 'pelayanan_settings', opdId);
            await setDoc(docRef, { opdId, customColumns: newColumns }, { merge: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pelayanan_settings', opdId] });
            addToast("Pengaturan kolom berhasil disimpan.", "success");
        },
        onError: () => addToast("Gagal menyimpan pengaturan.", "error")
    });

    // Mutasi Transaksi (Updated untuk Custom Data)
    const createMutation = useMutation({
        mutationFn: async (newItem: Omit<PelayananTransaksi, 'id'>) => {
            const docRef = await addDoc(collection(db, 'pelayanan_transaksi'), newItem);
            return { id: docRef.id, ...newItem };
        },
        onSuccess: (newItem) => {
            queryClient.invalidateQueries({ queryKey: ['pelayanan', opdId] });
            addToast("Transaksi berhasil dicatat.", "success");
            if (newItem.noHp) {
                sendWhatsAppNotification(newItem.noHp, 'layanan_diterima', [newItem.namaPemohon, newItem.jenisDokumen || newItem.judulLayanan || 'Layanan'])
                    .catch(err => console.log("WA Error:", err));
            }
        },
        onError: () => addToast("Gagal mencatat transaksi.", "error")
    });

    // ... (Update Status Mutation tetap sama) ...
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, item }: { id: string, status: 'Selesai' | 'Diproses', item?: PelayananTransaksi }) => {
            const ref = doc(db, 'pelayanan_transaksi', id);
            await updateDoc(ref, { status });
            return { id, status, item };
        },
        onSuccess: async ({ status, item }) => {
            queryClient.invalidateQueries({ queryKey: ['pelayanan', opdId] });
            addToast(`Status diperbarui menjadi ${status}.`, "success");
            if (status === 'Selesai' && item && userProfile) {
                try {
                    const layananName = item.jenisDokumen || item.judulLayanan || 'Layanan Publik';
                    await updateLogbook(userProfile.uid, userProfile.opdId, new Date(), {
                        id: `auto_pelayanan_${item.id}_${Date.now()}`,
                        deskripsi: `Menyelesaikan pelayanan ${item.kategori}: "${layananName}" untuk a.n. ${item.namaPemohon}.`,
                        selesai: true,
                        tugasTerkaitJudul: `Pelayanan: ${layananName}`
                    });
                } catch (e) { console.error(e); }
            }
        },
        onError: () => addToast("Gagal update status.", "error")
    });

    const catatTransaksi = async (kategori: 'Pengambilan' | 'Layanan Umum', data: any, customData: Record<string, any>) => {
        if (!userProfile) return;
        const payload: any = { // Gunakan 'any' atau update tipe PelayananTransaksi untuk menerima customData
            opdId: userProfile.opdId,
            tanggal: Timestamp.now(),
            // [MODIFIKASI] Hapus NIK, Tambah Pengambil
            namaPemohon: data.nama,
            noHp: data.noHp || '',
            namaPengambil: data.namaPengambil || '', // Field baru
            alamat: data.alamat || '', 
            // Data Kustom
            customData: customData, 
            kategori: kategori,
            ...(kategori === 'Pengambilan' ? { jenisDokumen: data.layanan } : { judulLayanan: data.layanan }),
            catatan: data.catatan || '',
            status: data.status,
            petugasId: userProfile.uid,
            petugasNama: userProfile.namaLengkap,
            createdAt: Timestamp.now()
        };
        await createMutation.mutateAsync(payload);
    };

    const handleUpdateStatus = (id: string, status: 'Selesai' | 'Diproses') => {
        const item = allTransactions.find(t => t.id === id);
        updateStatusMutation.mutate({ id, status, item });
    };

    return {
        allTransactions,
        pengambilanList,
        layananUmumList,
        stats,
        statsPeriodik,
        customColumns, // Export konfigurasi kolom
        isLoading: isTxLoading || isSettingsLoading,
        catatTransaksi,
        updateStatus: handleUpdateStatus,
        saveSettings: (cols: CustomColumn[]) => saveSettingsMutation.mutate(cols),
        isMutating: createMutation.isPending || updateStatusMutation.isPending || saveSettingsMutation.isPending
    };
};