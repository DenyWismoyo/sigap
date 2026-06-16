"use client";

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useUserAuth } from '@/context/AuthContext'; 
import { JadwalTempat, CombinedAgendaItem, EnrichedSuratAgenda } from '@/types'; 
import Link from 'next/link';
import { toJpeg } from 'html-to-image';
import {
    CalendarClock, MapPin, Calendar, Send, Info,
    Clock, ExternalLink, CalendarDays, LayoutGrid, List,
    Download, Briefcase, ClipboardCheck, ListChecks, 
    FolderArchive, BookOpen, Archive, FileText, Megaphone, User
} from 'lucide-react';
import JadwalDetailModal from '@/app/dashboard/jadwal/components/JadwalDetailModal'; 
import RuangKerjaSkeleton from '@/app/dashboard/components/skeletons/RuangKerjaSkeleton';
import { Button } from '@/components/ui/button';

// --- IMPORT KOMPONEN BARU ---
import SmartGreeting from '@/app/dashboard/components/home/SmartGreeting';
import QuickAccessCard from '@/app/dashboard/components/home/QuickAccessCard';
import MobileAgendaCarousel from '@/app/dashboard/components/home/MobileAgendaCarousel';

// --- IMPORT HOOKS SSOT ---
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';
import { useAgendaData } from '@/app/dashboard/hooks/useAgendaData'; 

// --- Helper Components untuk Agenda Desktop ---
const AgendaItem = ({ surat }: { surat: EnrichedSuratAgenda }) => (
    <Link href={`/dashboard/surat/${surat.id}`} className="block p-3 bg-muted/50 rounded-lg border border-border hover:bg-accent hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between">
        <p className="font-semibold text-foreground flex-1 pr-4 line-clamp-2">{surat.perihal}</p>
        <div className="text-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded-lg px-2 py-1 flex-shrink-0">
          <div className="text-xs">{surat.detailAgenda?.tanggal?.toDate().toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
          <div className="font-bold text-base">{surat.detailAgenda?.jam}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
          <User size={12} className="text-primary" />
          <span className="truncate">{surat.pengirim}</span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground border-t border-border/50 pt-2">
        <div className="flex items-center gap-1"><MapPin size={14}/> <strong>Lokasi:</strong>&nbsp;{surat.detailAgenda?.lokasi}</div>
        {surat.disposisiStatus === 'Sudah Didisposisi' ? (
          <div className="flex items-start text-blue-600 dark:text-blue-400 gap-1">
            <Send size={14} className="mt-0.5 flex-shrink-0" />
            <div className="line-clamp-2"><strong>Kepada:</strong>&nbsp;{surat.penerimaDisposisi}</div>
          </div>
        ) : (
          <div className="flex items-center text-yellow-600 dark:text-yellow-400 gap-1">
            <Info size={14} />
            <strong>Status:</strong>&nbsp;{surat.penerimaDisposisi}
          </div>
        )}
      </div>
    </Link>
);

const AgendaTable = ({ agendas }: { agendas: EnrichedSuratAgenda[] }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Waktu</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Perihal & Pengirim</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Lokasi</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Disposisi Kepada</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {agendas.map(surat => (
                    <tr key={surat.id} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground whitespace-nowrap align-top w-32">
                            <div className="flex flex-col">
                                <span className="font-bold text-base">{surat.detailAgenda?.tanggal?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                <span className="text-xs font-bold text-primary">{surat.detailAgenda?.jam}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                            <Link href={`/dashboard/surat/${surat.id}`} className="text-foreground hover:text-primary font-semibold line-clamp-2 block mb-1">
                                {surat.perihal}
                            </Link>
                            <p className="text-xs text-muted-foreground">No: {surat.nomorSurat}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                                <User size={12} className="text-primary" /> 
                                {surat.pengirim}
                            </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground align-top">{surat.detailAgenda?.lokasi}</td>
                        <td className="px-4 py-3 text-sm align-top">
                            {surat.disposisiStatus === 'Sudah Didisposisi' ? (
                                <span className="text-foreground line-clamp-2">{surat.penerimaDisposisi}</span>
                            ) : (
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1">
                                    <Info size={12} /> Belum Didisposikan
                                </span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const AgendaInternalTable = ({ agendas, onRowClick }: { agendas: JadwalTempat[], onRowClick: (jadwal: JadwalTempat) => void }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
        <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Tanggal & Jam</th>
            <th scope="col" className="px-4 py-3 font-semibold">Kegiatan</th>
            <th scope="col" className="px-4 py-3 font-semibold">Lokasi / Tautan</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {agendas.map(jadwal => (
          <tr key={jadwal.id} onClick={() => onRowClick(jadwal)} className="bg-card hover:bg-muted/30 cursor-pointer transition-colors">
            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap align-top w-40">
                <div className="flex flex-col">
                    <span>{jadwal.tanggalMulai?.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                    <span className="font-bold text-xs">{jadwal.jamMulai} - {jadwal.jamSelesai}</span>
                </div>
            </td>
            <td className="px-4 py-3 font-semibold text-foreground align-top">{jadwal.kegiatan}</td>
            <td className="px-4 py-3 align-top">
                {jadwal.jenis === 'Virtual' && jadwal.tautanRapat ? (
                    <a href={jadwal.tautanRapat} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center text-primary hover:underline">
                        <ExternalLink size={12} className="mr-1"/> Link Rapat
                    </a>
                ) : (
                    <span className="flex items-center text-muted-foreground"><MapPin size={12} className="mr-1"/> {jadwal.namaTempat}</span>
                )}
            </td>
            <td className="px-4 py-3 align-top">
                {jadwal.status !== 'Disetujui' && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${jadwal.status === 'Menunggu Persetujuan' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                        {jadwal.status}
                    </span>
                )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- Main Component ---
export default function DashboardPage() {
  const { userProfile, loading: authLoading } = useUserAuth();
  
  const [currentDay] = useState(new Date().toISOString().split('T')[0]);
  const todayFormatted = new Date(currentDay + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

  // --- 1. DATA FETCHING VIA HOOKS (SSOT) ---
  const { isLoading: isMasterLoading } = useMasterData(true); // userMap sudah tidak digunakan secara langsung untuk agenda
  const { agendaUndangan, jadwalInternalList, isLoading: isAgendaLoading } = useAgendaData(); 

  // --- COMPUTED DATA (AGENDA) ---
  const { todayAgendas, upcomingAgendas } = useMemo(() => {
    if (!agendaUndangan) return { todayAgendas: [], upcomingAgendas: [] };
    
    // [PERBAIKAN]: Tidak perlu lagi melakukan mapping/perhitungan disposisiList manual!
    // useAgendaData sudah mengembalikan data yang matang (Enriched) melalui data denormalisasi.
    const enrichedAgendas = agendaUndangan as EnrichedSuratAgenda[];
    
    const today = new Date(currentDay + 'T00:00:00');
    today.setHours(0, 0, 0, 0); 

    const todayItems = enrichedAgendas.filter(agenda => {
        if (!agenda.detailAgenda?.tanggal) return false;
        const agendaDate = agenda.detailAgenda.tanggal.toDate(); 
        agendaDate.setHours(0, 0, 0, 0);
        return agendaDate.getTime() === today.getTime();
    });
    
    const upcomingItems = enrichedAgendas.filter(agenda => {
         if (!agenda.detailAgenda?.tanggal) return false;
        const agendaDate = agenda.detailAgenda.tanggal.toDate();
        agendaDate.setHours(0, 0, 0, 0);
        return agendaDate.getTime() > today.getTime();
    });

    // Sort
    todayItems.sort((a, b) => (a.detailAgenda?.jam || '').localeCompare(b.detailAgenda?.jam || ''));
    upcomingItems.sort((a, b) => {
        const dateA = a.detailAgenda?.tanggal.toMillis() || 0;
        const dateB = b.detailAgenda?.tanggal.toMillis() || 0;
        if (dateA !== dateB) return dateA - dateB;
        return (a.detailAgenda?.jam || '').localeCompare(b.detailAgenda?.jam || '');
    });

    return { todayAgendas: todayItems, upcomingAgendas: upcomingItems };
  }, [agendaUndangan, currentDay]);

  const agendaInternalBulanIni = useMemo(() => {
      return [...jadwalInternalList].sort((a, b) => {
        const dateA = a.tanggalMulai.toMillis();
        const dateB = b.tanggalMulai.toMillis();
        if (dateA !== dateB) return dateA - dateB;
        return a.jamMulai.localeCompare(b.jamMulai);
      });
  }, [jadwalInternalList]);
  
  const groupedUpcomingAgendas = useMemo(() => {
    return upcomingAgendas.reduce((acc, agenda) => {
        if (!agenda.detailAgenda?.tanggal?.toDate) return acc;
        const dateStr = agenda.detailAgenda.tanggal.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(agenda);
        return acc;
    }, {} as Record<string, typeof upcomingAgendas>);
  }, [upcomingAgendas]);

  const combinedTodayAgenda = useMemo(() => {
      const today = new Date(currentDay + 'T00:00:00');
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();
      const agendas: CombinedAgendaItem[] = [];

      jadwalInternalList.forEach(jadwal => {
          const jadwalDate = jadwal.tanggalMulai.toDate();
          jadwalDate.setHours(0, 0, 0, 0);
          if (jadwalDate.getTime() === todayTime) {
              agendas.push({
                  id: jadwal.id!, type: 'internal', item: jadwal,
                  time: jadwal.jamMulai, title: jadwal.kegiatan,
                  location: jadwal.jenis === 'Virtual' ? (jadwal.tautanRapat || 'Rapat Virtual') : jadwal.namaTempat
              });
          }
      });

      todayAgendas.forEach(surat => {
           agendas.push({
              id: surat.id!, type: 'surat', item: surat,
              time: surat.detailAgenda!.jam, title: surat.perihal,
              location: surat.detailAgenda!.lokasi,
              penerimaDisposisi: surat.penerimaDisposisi,
              disposisiStatus: surat.disposisiStatus
          });
      });

      return agendas.sort((a, b) => a.time.localeCompare(b.time));
  }, [todayAgendas, jadwalInternalList, currentDay]);

  // --- State UI Lokal ---
  const [agendaFilter, setAgendaFilter] = useState<'hariIni' | 'akanDatang'>('hariIni');
  const [agendaInternalView, setAgendaInternalView] = useState<'table' | 'card'>('card');
  const [agendaUndanganView, setAgendaUndanganView] = useState<'table' | 'card'>('table');
  
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalTempat | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Ref untuk export
  const agendaRef = useRef<HTMLDivElement>(null);
  const isAdminOrTU = useMemo(() => userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu', [userProfile]);

  const isLoading = authLoading || isMasterLoading || isAgendaLoading;

  const handleExportAgenda = useCallback(() => {
    if (agendaRef.current) {
        toJpeg(agendaRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = 'agenda.jpeg';
                link.href = dataUrl;
                link.click();
            });
    }
  }, []);

  const quickAccessLinks = [
    { href: '/dashboard/ruang-kerja', label: 'Ruang Kerja', icon: Briefcase, colorClass: 'text-cyan-600' },
    { href: '/dashboard/tugas', label: 'Tugas Saya', icon: ClipboardCheck, colorClass: 'text-green-600' },
    { href: '/dashboard/notulensi', label: 'Notulensi', icon: ListChecks, colorClass: 'text-purple-600' },
    { href: '/dashboard/dokumen', label: 'Repository', icon: FolderArchive, colorClass: 'text-yellow-600' },
    { href: '/dashboard/logbook', label: 'Logbook', icon: BookOpen, colorClass: 'text-orange-600' },
    { href: '/dashboard/pengumuman', label: 'Pengumuman', icon: Megaphone, colorClass: 'text-red-600' },
    { href: '/dashboard/jadwal', label: 'Jadwal Internal', icon: Calendar, colorClass: 'text-blue-600' },
    { href: '/dashboard/bukti-kinerja', label: 'Bukti E-Kinerja', icon: FileText, colorClass: 'text-pink-600' },
    { href: '/dashboard/arsip', label: 'Arsip Surat', icon: Archive, colorClass: 'text-gray-600' },
  ];
  
  if (isLoading) return <RuangKerjaSkeleton />;

  return (
    <div className="flex flex-col h-full p-4 md:p-6 bg-background">
      <SmartGreeting userName={userProfile?.namaLengkap.split(' ')[0] || ''} />

      {/* --- Layout Utama (Desktop Grid System) --- */}
      <div className="hidden md:block space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             
             {/* --- KOLOM KIRI (MAIN CONTENT - AGENDA) Span 9 --- */}
             <div className="lg:col-span-9 space-y-6">
                
                {/* CARD 1: Agenda Undangan OPD */}
                <div ref={agendaRef} className="bg-card rounded-xl shadow-md border border-border">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                        <div className="flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-indigo-500"/>
                            <h2 className="text-lg font-bold text-foreground">Agenda Undangan OPD</h2>
                        </div>
                        <div className="flex items-center space-x-2 w-full md:w-auto">
                            <div className="flex items-center bg-muted rounded-lg p-1 flex-grow md:flex-grow-0">
                                <button onClick={() => setAgendaFilter('hariIni')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${agendaFilter === 'hariIni' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>Hari Ini</button>
                                <button onClick={() => setAgendaFilter('akanDatang')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${agendaFilter === 'akanDatang' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>Akan Datang</button>
                            </div>
                            <div className="flex items-center bg-muted rounded-lg p-1">
                                <button onClick={() => setAgendaUndanganView('table')} className={`p-1.5 rounded ${agendaUndanganView === 'table' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`} title="Tampilan Tabel"><List size={16} /></button>
                                <button onClick={() => setAgendaUndanganView('card')} className={`p-1.5 rounded ${agendaUndanganView === 'card' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`} title="Tampilan Kartu"><LayoutGrid size={16} /></button>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleExportAgenda} className="h-8 text-xs"><Download size={14} className="mr-1"/> Export</Button>
                        </div>
                    </div>
                    <div className="p-0">
                        {agendaFilter === 'hariIni' && (todayAgendas.length > 0 ?
                            (agendaUndanganView === 'card' ?
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4">{todayAgendas.map(surat => <AgendaItem key={surat.id} surat={surat} />)}</div>
                                : <AgendaTable agendas={todayAgendas} />
                            )
                            : <div className="text-center py-12 text-muted-foreground"><Calendar size={48} className="mx-auto text-muted-foreground/30 mb-2"/><p className="font-medium">Tidak ada agenda undangan untuk hari ini.</p></div>
                        )}
                        {agendaFilter === 'akanDatang' && (Object.keys(groupedUpcomingAgendas).length > 0 ?
                            (agendaUndanganView === 'card' ?
                                <div className="space-y-6 p-4">{Object.entries(groupedUpcomingAgendas).map(([date, agendasOnDate]) => (<div key={date}><h3 className="text-sm font-bold text-muted-foreground border-b border-border pb-2 mb-3 uppercase tracking-wider">{date}</h3><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{agendasOnDate.map(surat => <AgendaItem key={surat.id} surat={surat} />)}</div></div>))}</div>
                                : <AgendaTable agendas={upcomingAgendas} />
                            )
                            : <div className="text-center py-12 text-muted-foreground"><Calendar size={48} className="mx-auto text-muted-foreground/30 mb-2"/><p className="font-medium">Tidak ada agenda undangan untuk waktu mendatang.</p></div>
                        )}
                    </div>
                </div>

                {/* CARD 2: Agenda Internal Bulan Ini */}
                <div className="bg-card rounded-xl shadow-md border border-border flex flex-col">
                    <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center bg-muted/30 gap-3">
                        <h3 className="text-lg font-bold flex items-center text-foreground"><CalendarDays size={18} className="mr-2 text-blue-600"/> Agenda Internal Bulan Ini</h3>
                        <div className="flex bg-muted rounded-lg p-1">
                            <button onClick={() => setAgendaInternalView('table')} className={`p-1.5 rounded ${agendaInternalView === 'table' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}><List size={14}/></button>
                            <button onClick={() => setAgendaInternalView('card')} className={`p-1.5 rounded ${agendaInternalView === 'card' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}><LayoutGrid size={14}/></button>
                        </div>
                    </div>
                    <div className="p-0 flex-1">
                        {agendaInternalBulanIni.length === 0 ? <p className="text-center text-muted-foreground py-12">Tidak ada agenda internal bulan ini.</p> : 
                           agendaInternalView === 'table' ? (
                               <AgendaInternalTable agendas={agendaInternalBulanIni} onRowClick={(jadwal) => { setSelectedJadwal(jadwal); setIsDetailModalOpen(true); }} />
                           ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4"> 
                                {agendaInternalBulanIni.map(jadwal => (
                                    <div key={jadwal.id} onClick={() => { setSelectedJadwal(jadwal); setIsDetailModalOpen(true); }} className="p-3 bg-background rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors shadow-sm">
                                        <p className="font-semibold text-foreground text-sm line-clamp-2">{jadwal.kegiatan}</p>
                                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                            <p className="flex items-center"><CalendarDays size={12} className="mr-2 text-primary"/> {jadwal.tanggalMulai?.toDate ? jadwal.tanggalMulai.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : 'N/A'}</p>
                                            <p className="flex items-center"><Clock size={12} className="mr-2 text-primary"/> {jadwal.jamMulai} - {jadwal.jamSelesai}</p>
                                            <p className="flex items-center"><MapPin size={12} className="mr-2 text-primary"/> {jadwal.jenis === 'Virtual' ? 'Virtual' : jadwal.namaTempat}</p>
                                        </div>
                                        {jadwal.status !== 'Disetujui' && (
                                            <span className={`mt-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                                jadwal.status === 'Menunggu Persetujuan' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                            }`}>{jadwal.status}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

             </div>

            {/* --- KOLOM KANAN (SIDEBAR WIDGET) Span 3 --- */}
            <div className='lg:col-span-3 space-y-6'>
                {/* [QUICK ACCESS] Grid 3x3 untuk menu pintasan */}
                <div className="grid grid-cols-3 gap-3">
                    {quickAccessLinks.map((link, index) => (
                        <div key={link.href} className="fade-in" style={{ animationDelay: `${index * 50}ms`}}>
                            <QuickAccessCard href={link.href} label={link.label} icon={link.icon} colorClass={link.colorClass} />
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>

      {/* --- Mobile Layout --- */}
      <MobileAgendaCarousel 
          combinedTodayAgenda={combinedTodayAgenda} 
          todayFormatted={todayFormatted} 
      />

      {/* Mobile Quick Links */}
      <div className="md:hidden px-4 grid grid-cols-3 gap-3 mt-6">
         {quickAccessLinks.map((link) => <QuickAccessCard key={link.href} {...link} />)}
      </div>

       {/* Modal Global */}
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