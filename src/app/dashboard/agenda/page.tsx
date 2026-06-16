// Lokasi: src/app/dashboard/agenda/page.tsx
// Halaman BARU untuk menampilkan agenda 7 hari ke depan (atau lebih)
// Dibuat untuk menggantikan Drawer di page.tsx yang konflik dengan Drawer layout.
// [FIX BUILD ERROR] Mengganti semua import alias '@/' dengan path relatif.

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUserAuth } from '../../../context/AuthContext'; 
import { db } from '../../../lib/firebase'; 
import { collection, query, where, Timestamp, onSnapshot, getDocs, orderBy, documentId } from 'firebase/firestore';
import { Surat, Disposisi, SuratAgendaItem, JadwalTempat, UserProfile } from '../../../types'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Mail, Calendar, Send, Info, Users,
    Clock, ExternalLink, CalendarDays, MapPin,
    ArrowLeft
} from 'lucide-react';
import JadwalDetailModal from '../jadwal/components/JadwalDetailModal'; 
import RuangKerjaSkeleton from '../components/skeletons/RuangKerjaSkeleton';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';

// Tipe gabungan
type CombinedAgendaItem = {
    id: string;
    type: 'surat' | 'internal';
    item: Surat | JadwalTempat;
    time: string;
    title: string;
    location: string;
    penerimaDisposisi?: string;
    disposisiStatus?: 'Sudah Didisposisi' | 'Belum Didisposikan';
};

// Komponen Kartu Agenda (dipakai di halaman ini)
// [PERBAIKAN v7] Memperbaiki text wrapping "Penerima"
const AgendaCard = ({ agenda, onInternalClick }: { 
    agenda: CombinedAgendaItem,
    onInternalClick: (jadwal: JadwalTempat) => void
}) => (
    <Link 
      href={agenda.type === 'surat' ? `/dashboard/surat/${agenda.id}` : '#'} 
      onClick={agenda.type === 'internal' ? (e) => {
          e.preventDefault(); 
          onInternalClick(agenda.item as JadwalTempat);
      } : undefined}
      className="w-full bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex-1 min-w-0"> {/* [PERBAIKAN] Tambahkan min-w-0 di sini */}
        <div className="flex justify-between items-center">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            agenda.type === 'surat'
              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
          }`}>
            {agenda.type === 'surat' ? 'Undangan' : 'Internal'}
          </span>
          <span className="text-sm font-bold text-foreground">{agenda.time}</span>
        </div>
        
        {/* [PERBAIKAN v8] Ganti break-words -> break-all */}
        <p className="font-semibold text-foreground mt-2 break-all">{agenda.title}</p>
        
        {/* [PERBAIKAN] Ganti truncate dengan flex-box agar wrap dengan ikon */}
        <p className="text-xs text-muted-foreground mt-1 flex items-start">
          <MapPin size={12} className="mr-1.5 flex-shrink-0 mt-0.5" />
          {/* [PERBAIKAN v8] Ganti break-words -> break-all */}
          <span className="flex-1 break-all min-w-0">{agenda.location}</span>
        </p>
        
        {agenda.type === 'surat' && (
          <p className="text-xs text-muted-foreground mt-1 flex items-start">
            {agenda.disposisiStatus === 'Sudah Didisposisi' ? 
              <Send size={12} className="mr-1.5 flex-shrink-0 text-blue-500 mt-0.5" /> : 
              <Info size={12} className="mr-1.5 flex-shrink-0 text-yellow-500 mt-0.5" />
            }
            <span className="font-medium mr-1 flex-shrink-0">Penerima:</span> 
            {/* [PERBAIKAN v8] Ganti break-words -> break-all */}
            <span className="flex-1 break-all min-w-0">{agenda.penerimaDisposisi}</span>
          </p>
        )}
      </div>
    </Link>
);


export default function AgendaPage() {
  const { userProfile, loading: authLoading } = useUserAuth();
  const router = useRouter();

  const [agendaUndangan, setAgendaUndangan] = useState<Surat[]>([]);
  const [allDispositionsForAgenda, setAllDispositionsForAgenda] = useState<Disposisi[]>([]);
  const [localUserCache, setLocalUserCache] = useState<Map<string, UserProfile>>(new Map());
  const [isCacheLoading, setIsCacheLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [jadwalInternalList, setJadwalInternalList] = useState<JadwalTempat[]>([]);
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalTempat | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isAdminOrTU = useMemo(() => userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu', [userProfile]);

  // 1. Fetch Cache Pengguna
  const fetchLocalCache = useCallback(async () => {
        if (!userProfile?.opdId) {
            setIsCacheLoading(false);
            return;
        };
        if (localUserCache.size > 0) {
             setIsCacheLoading(false);
             return;
        }

        setIsCacheLoading(true);
        try {
            const usersInOpdQuery = query(collection(db, "users"), where("opdId", "==", userProfile.opdId));
            const usersSnapshot = await getDocs(usersInOpdQuery);
            const userCacheMap = new Map<string, UserProfile>();
            usersSnapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() } as UserProfile;
                if (user.jabatanId) {
                    userCacheMap.set(user.jabatanId, user); 
                }
            });
            setLocalUserCache(userCacheMap);
        } catch (err) {
            console.error("Gagal fetch local user cache for Agenda:", err);
        } finally {
            setIsCacheLoading(false);
        }
    }, [userProfile?.opdId, localUserCache.size]); 

    useEffect(() => {
        if (!authLoading) {
            fetchLocalCache();
        }
    }, [fetchLocalCache, authLoading]);

  // 2. Fetch Data Agenda (Undangan & Internal)
  useEffect(() => {
    if (authLoading || !userProfile || isCacheLoading) {
      return;
    }
    setDataLoading(true);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ambil agenda 30 hari ke depan
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30); 

    const unsubscribes: (()=> void)[] = []; 

    // Query Agenda Undangan (Eksternal)
    const agendaQuery = query(
        collection(db, 'surat'),
        where('opdId', '==', userProfile.opdId),
        where('jenisSurat', '==', 'Undangan'),
        where('statusPenyelesaian', '!=', 'Diarsipkan'), 
        where('detailAgenda.tanggal', '>=', Timestamp.fromDate(today)),
        where('detailAgenda.tanggal', '<', Timestamp.fromDate(thirtyDaysLater)),
        orderBy('detailAgenda.tanggal', 'asc')
    );
    unsubscribes.push(onSnapshot(agendaQuery, async (snapshot) => {
        const agendaList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Surat));
        setAgendaUndangan(agendaList);
        const agendaSuratIds = agendaList.map(s => s.id!).filter(Boolean);
        if (agendaSuratIds.length > 0) {
             const disposisiPromises = [];
             for (let i = 0; i < agendaSuratIds.length; i += 30) {
                 const chunk = agendaSuratIds.slice(i, i + 30);
                 if (chunk.length > 0) disposisiPromises.push(getDocs(query(collection(db, "disposisi"), where("suratId", "in", chunk))));
             }
             const disposisiSnapshots = await Promise.all(disposisiPromises);
             const allDisposisiDocs = disposisiSnapshots.flatMap(snap => snap.docs);
            setAllDispositionsForAgenda(allDisposisiDocs.map(d => ({ id: d.id, ...d.data() } as Disposisi)));
        } else {
            setAllDispositionsForAgenda([]);
        }
    }, (error) => console.error("Error fetching agenda undangan:", error)));

    // Query Jadwal Internal
    const jadwalQuery = query(
      collection(db, "jadwalTempat"), 
      where("opdId", "==", userProfile.opdId),
      where('tanggalMulai', '>=', Timestamp.fromDate(today)), 
      where('tanggalMulai', '<=', Timestamp.fromDate(thirtyDaysLater)),
      orderBy('tanggalMulai', 'asc')
    );
    unsubscribes.push(onSnapshot(jadwalQuery, snapshot => {
        setJadwalInternalList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JadwalTempat)));
        setDataLoading(false);
    }, (error) => {
        console.error("Error fetching jadwal internal:", error);
        setDataLoading(false);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [userProfile, authLoading, isCacheLoading]);

  // 3. Proses dan Kelompokkan Data
  const groupedWeekAgenda = useMemo(() => {
    // [PERBAIKAN] Hapus anotasi tipe ': SuratAgendaItem[]' 
    // Biarkan TypeScript menyimpulkan tipe variabel ini secara otomatis
    // untuk menghindari konflik dengan tipe ganda 'SuratAgendaItem' di types/index.ts
    const enrichedAgendas = agendaUndangan.map(surat => {
        const disposisiTerkait = allDispositionsForAgenda
            .filter(d => d.suratId === surat.id)
            .sort((a, b) => b.tanggalDisposisi.toMillis() - a.tanggalDisposisi.toMillis());
        const latestDisposisi = disposisiTerkait[0];
        let penerima = 'Belum Didisposikan';
        if (latestDisposisi) {
            penerima = latestDisposisi.kepadaJabatanId.map(id => localUserCache.get(id)?.namaLengkap || '...').join(', ');
        }
        const disposisiStatus: 'Sudah Didisposisi' | 'Belum Didisposikan' = latestDisposisi ? 'Sudah Didisposisi' : 'Belum Didisposikan';
        return { ...surat, penerimaDisposisi: penerima, disposisiStatus: disposisiStatus };
    });

    const combinedAgendas: CombinedAgendaItem[] = [];

    // Tambah agenda internal
    jadwalInternalList.forEach(jadwal => {
        combinedAgendas.push({
            id: jadwal.id!,
            type: 'internal',
            item: jadwal,
            time: jadwal.jamMulai,
            title: jadwal.kegiatan,
            location: jadwal.jenis === 'Virtual' ? (jadwal.tautanRapat || 'Rapat Virtual') : jadwal.namaTempat
        });
    });

    // Tambah agenda undangan
    enrichedAgendas.forEach(surat => {
        combinedAgendas.push({
            id: surat.id!,
            type: 'surat',
            item: surat,
            time: surat.detailAgenda!.jam,
            title: surat.perihal,
            location: surat.detailAgenda!.lokasi,
            penerimaDisposisi: surat.penerimaDisposisi,
            disposisiStatus: surat.disposisiStatus
        });
    });

    // Urutkan semua agenda
    const sortedAgendas = combinedAgendas.sort((a, b) => {
        const dateA = a.type === 'surat' ? (a.item as Surat).detailAgenda!.tanggal.toMillis() : (a.item as JadwalTempat).tanggalMulai.toMillis();
        const dateB = b.type === 'surat' ? (b.item as Surat).detailAgenda!.tanggal.toMillis() : (b.item as JadwalTempat).tanggalMulai.toMillis();
        if (dateA !== dateB) return dateA - dateB;
        return a.time.localeCompare(b.time);
    });

    // Kelompokkan berdasarkan tanggal
    return sortedAgendas.reduce((acc, agenda) => {
        const dateObj = agenda.type === 'surat'
            ? (agenda.item as Surat).detailAgenda!.tanggal.toDate()
            : (agenda.item as JadwalTempat).tanggalMulai.toDate();
        
        const dateString = dateObj.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
        });

        if (!acc[dateString]) {
            acc[dateString] = [];
        }
        acc[dateString].push(agenda);
        return acc;
    }, {} as Record<string, CombinedAgendaItem[]>);

  }, [agendaUndangan, jadwalInternalList, allDispositionsForAgenda, localUserCache]);


  const handleAgendaCardClick = (jadwal: JadwalTempat) => {
      setSelectedJadwal(jadwal);
      setIsDetailModalOpen(true);
  };
  
  if (authLoading || isCacheLoading || dataLoading) {
    // Tampilkan skeleton yang mirip dengan halaman dashboard
    return <RuangKerjaSkeleton />;
  }

  return (
    <div className="animate-fadeInUp">
        <Button 
            onClick={() => router.back()} 
            variant="link"
            className="inline-flex items-center text-primary hover:underline text-sm mb-4 p-0"
        >
            <ArrowLeft size={16} className="mr-2" /> Kembali ke Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-foreground flex items-center mb-6">
            <CalendarDays size={28} className="mr-3 text-blue-600"/>
            Agenda
        </h1>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-1 pt-0 space-y-4">
                {Object.keys(groupedWeekAgenda).length > 0 ? (
                    // Loop pertama: Iterasi berdasarkan TANGGAL (kunci dari objek)
                    Object.keys(groupedWeekAgenda).map((tanggal) => (
                        <div key={tanggal}>
                            {/* Render Header Tanggal */}
                            <h3 className="font-semibold text-foreground text-base mb-2 pt-2 border-t border-border first:border-t-0 first:pt-0">
                                {tanggal}
                            </h3>
                            
                            {/* Loop kedua: Iterasi agenda di dalam tanggal tsb */}
                            <div className="space-y-3">
                                {groupedWeekAgenda[tanggal].map((agenda) => (
                                    <AgendaCard 
                                        key={agenda.id} 
                                        agenda={agenda} 
                                        onInternalClick={handleAgendaCardClick} 
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Calendar size={40} className="mx-auto text-muted-foreground/50"/>
                        <p className="mt-4 font-semibold">Tidak ada agenda untuk 30 hari ke depan.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        
        <JadwalDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            jadwal={selectedJadwal}
            isAdmin={isAdminOrTU} 
            onApprove={() => {}} 
            onReject={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
        />
    </div>
  );
}