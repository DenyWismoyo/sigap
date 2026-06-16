// Lokasi: src/app/dashboard/hooks/useKeuanganData.ts
// [NEW HOOK] "Otak" dari sistem keuangan.
// - Mengambil data Rekening (Pagu) dan Transaksi (Realisasi) secara real-time.
// - Menghitung Sisa Anggaran per Rekening.
// - Menghitung Saldo Kas Tunai & Bank.

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { KeuanganRekening, KeuanganTransaksi, UserProfile } from '@/types';

export interface RekeningSummary extends KeuanganRekening {
    terpakai: number;
    sisa: number;
    persenSerapan: number;
}

export const useKeuanganData = (userProfile: UserProfile | null) => {
    const [rekeningList, setRekeningList] = useState<KeuanganRekening[]>([]);
    const [transaksiList, setTransaksiList] = useState<KeuanganTransaksi[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userProfile?.opdId) return;

        setIsLoading(true);
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1); // 1 Jan tahun ini

        // 1. Subscribe ke Master Rekening
        const qRek = query(
            collection(db, 'keuangan_rekening'), 
            where('opdId', '==', userProfile.opdId)
        );
        
        const unsubRek = onSnapshot(qRek, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeuanganRekening));
            // Sortir berdasarkan kode agar rapi
            data.sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
            setRekeningList(data);
        });

        // 2. Subscribe ke Transaksi Tahun Ini
        const qTrans = query(
            collection(db, 'keuangan_transaksi'),
            where('opdId', '==', userProfile.opdId),
            where('tanggal', '>=', startDate),
            orderBy('tanggal', 'asc') // Penting untuk urutan BKU
        );

        const unsubTrans = onSnapshot(qTrans, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeuanganTransaksi));
            setTransaksiList(data);
            setIsLoading(false);
        });

        return () => {
            unsubRek();
            unsubTrans();
        };
    }, [userProfile]);

    // --- KALKULASI CERDAS (Memoized) ---

    // 1. Hitung Saldo Kas Global (Tunai)
    const saldoKas = useMemo(() => {
        let saldo = 0;
        transaksiList.forEach(t => {
            if (t.tipe === 'Masuk') saldo += t.jumlah;
            else saldo -= t.jumlah;
        });
        return saldo;
    }, [transaksiList]);

    // 2. Hitung Realisasi & Sisa Pagu per Rekening
    const rekeningSummary = useMemo((): RekeningSummary[] => {
        // Map untuk mempercepat lookup
        const realizationMap = new Map<string, number>();

        // Sum transaksi keluar berdasarkan kode rekening
        transaksiList.forEach(t => {
            if (t.tipe === 'Keluar' && t.kodeRekening) {
                const current = realizationMap.get(t.kodeRekening) || 0;
                realizationMap.set(t.kodeRekening, current + t.jumlah);
            }
        });

        // Gabungkan dengan data master rekening
        return rekeningList.map(rek => {
            const terpakai = realizationMap.get(rek.kode) || 0;
            const anggaran = rek.anggaran || 0;
            const sisa = anggaran - terpakai;
            const persenSerapan = anggaran > 0 ? (terpakai / anggaran) * 100 : 0;

            return {
                ...rek,
                terpakai,
                sisa,
                persenSerapan
            };
        });
    }, [rekeningList, transaksiList]);

    return {
        rekeningList,   // Data mentah rekening
        transaksiList,  // Data mentah transaksi
        rekeningSummary,// Data rekening + Sisa Pagu (Untuk validasi input)
        saldoKas,       // Posisi kas saat ini
        isLoading
    };
};