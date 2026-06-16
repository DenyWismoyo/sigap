"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { Surat, JadwalTempat } from '@/types';
import { Plus, Video, Calendar, Clock, Users, ExternalLink } from 'lucide-react';
import RapatFormModal from './components/RapatFormModal';
import Link from 'next/link';

// Tipe gabungan untuk agenda dari surat undangan dan jadwal internal
type AgendaItem = (Surat | JadwalTempat) & { sourceType: 'surat' | 'internal' };

// Komponen Card untuk setiap item agenda
const AgendaCard = ({ item }: { item: AgendaItem }) => {
    const isSurat = item.sourceType === 'surat';
    const agenda = isSurat ? (item as Surat).detailAgenda : item;
    const title = isSurat ? (item as Surat).perihal : (item as JadwalTempat).kegiatan;
    const location = isSurat ? (agenda as any).lokasi : (item as JadwalTempat).namaTempat;
    const time = isSurat ? (agenda as any).jam : `${(item as JadwalTempat).jamMulai} - ${(item as JadwalTempat).jamSelesai}`;
    const date = isSurat ? (agenda as any).tanggal.toDate() : (item as JadwalTempat).tanggalMulai.toDate();
    const link = (item as JadwalTempat).tautanRapat;

    return (
        <div className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-200 dark:border-dark-border flex flex-col justify-between">
            <div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isSurat ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                    {isSurat ? 'Undangan Eksternal' : 'Rapat Internal'}
                </span>
                <h3 className="font-bold text-gray-800 dark:text-dark-text-primary mt-2 line-clamp-2">{title}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                    <div className="flex items-center"><Calendar size={14} className="mr-2"/>{date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    <div className="flex items-center"><Clock size={14} className="mr-2"/>{time}</div>
                    <div className="flex items-center"><Video size={14} className="mr-2"/>{location}</div>
                </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                {link && <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center"><ExternalLink size={16} className="mr-2"/> Gabung Rapat</a>}
                {isSurat && <Link href={`/dashboard/surat/${item.id}`} className="flex-1 text-center px-4 py-2 text-sm font-bold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Lihat Surat</Link>}
            </div>
        </div>
    );
};

export default function RapatVirtualPage() {
    const { userProfile, loading: authLoading } = useUserAuth();
    const [suratUndangan, setSuratUndangan] = useState<Surat[]>([]);
    const [jadwalInternal, setJadwalInternal] = useState<JadwalTempat[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);

    useEffect(() => {
        if (!userProfile?.opdId || authLoading) return;

        const now = Timestamp.now();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        // Query untuk Surat Undangan Eksternal
        const suratQuery = query(
            collection(db, 'surat'),
            where('opdId', '==', userProfile.opdId),
            where('jenisSurat', '==', 'Undangan'),
            where('detailAgenda.tanggal', '>=', now.toDate()),
            where('detailAgenda.tanggal', '<=', thirtyDaysLater)
        );
        const unsubSurat = onSnapshot(suratQuery, snapshot => {
            setSuratUndangan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Surat)));
            setLoading(false);
        });

        // Query untuk Jadwal Rapat Internal
        const jadwalQuery = query(
            collection(db, "jadwalTempat"), 
            where("opdId", "==", userProfile.opdId),
            where('tanggalMulai', '>=', now.toDate()),
            where('tanggalMulai', '<=', thirtyDaysLater)
        );
        const unsubJadwal = onSnapshot(jadwalQuery, snapshot => {
            setJadwalInternal(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JadwalTempat)));
        });

        return () => {
            unsubSurat();
            unsubJadwal();
        };
    }, [userProfile, authLoading]);

    const combinedAgenda = useMemo<AgendaItem[]>(() => {
        const fromSurat: AgendaItem[] = suratUndangan.map(s => ({ ...s, sourceType: 'surat' }));
        const fromJadwal: AgendaItem[] = jadwalInternal.map(j => ({ ...j, sourceType: 'internal' }));
        
        const allAgenda = [...fromSurat, ...fromJadwal];
        
        return allAgenda.sort((a, b) => {
            const dateA = a.sourceType === 'surat' ? (a as Surat).detailAgenda!.tanggal.toMillis() : (a as JadwalTempat).tanggalMulai.toMillis();
            const dateB = b.sourceType === 'surat' ? (b as Surat).detailAgenda!.tanggal.toMillis() : (b as JadwalTempat).tanggalMulai.toMillis();
            return dateA - dateB;
        });
    }, [suratUndangan, jadwalInternal]);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                    <Video size={28} className="mr-3 text-blue-600" />
                    Pusat Komando Rapat
                </h1>
                <button onClick={() => setIsFormModalOpen(true)} className="flex items-center px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    <Plus size={18} className="mr-2" /> Jadwalkan Rapat Baru
                </button>
            </div>

            {loading ? <p>Memuat jadwal rapat...</p> : combinedAgenda.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {combinedAgenda.map(item => <AgendaCard key={`${item.sourceType}-${item.id}`} item={item} />)}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-dark-text-secondary bg-white dark:bg-dark-card rounded-xl border-2 border-dashed dark:border-dark-border">
                    <p className="font-semibold">Tidak ada jadwal rapat dalam 30 hari ke depan.</p>
                </div>
            )}
            
            <RapatFormModal 
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
            />
        </div>
    );
}
