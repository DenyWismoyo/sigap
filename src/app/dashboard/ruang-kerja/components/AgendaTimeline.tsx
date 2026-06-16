// Lokasi: src/app/dashboard/ruang-kerja/components/AgendaTimeline.tsx
// [MODIFIKASI V4 - FIX HYDRATION ERROR]
// - Mengubah struktur komponen untuk menghindari nesting <button> di dalam <button> atau <a>.
// - Wrapper utama sekarang adalah <div>.
// - Logika klik/link dipindahkan ke dalam kartu konten, memisahkan area info utama dan area tombol aksi.

"use client";

import React from 'react';
import { Surat, JadwalTempat } from '@/types';
import Link from 'next/link';
import { MapPin, Send, Info, CalendarDays, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button'; 
import { useRouter } from 'next/navigation'; // Tambahkan useRouter

// Tipe gabungan (Salin dari ruang-kerja/page.tsx)
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

interface AgendaTimelineProps {
  items: CombinedAgendaItem[];
  onInternalClick: (jadwal: JadwalTempat) => void;
  onQuickNotulensi: (item: CombinedAgendaItem) => void;
}

const AgendaTimelineItem = ({ item, onInternalClick, onQuickNotulensi }: { 
  item: CombinedAgendaItem, 
  onInternalClick: (jadwal: JadwalTempat) => void,
  onQuickNotulensi: (item: CombinedAgendaItem) => void 
}) => {
  const router = useRouter();

  // --- [MODIFIKASI V3] Logika Baru untuk Tombol Notulensi ---
  const now = new Date();
  const agendaDate = item.type === 'surat'
        ? (item.item as Surat).detailAgenda!.tanggal.toDate()
        : (item.item as JadwalTempat).tanggalMulai.toDate();
        
  const [hours, minutes] = item.time.split(':').map(Number);
  const agendaStartDate = new Date(agendaDate.getTime()); 
  agendaStartDate.setHours(hours, minutes, 0, 0); 

  const hasStarted = agendaStartDate < now;
  const isToday = agendaDate.toDateString() === now.toDateString();
  const showNotulensiButton = hasStarted && isToday;
  // --- Akhir Modifikasi V3 ---

  // [MODIFIKASI V4]
  // Pisahkan logika wrapper. Kita tidak membungkus seluruh row lagi.
  // Kita gunakan div sebagai container baris.
  
  const handleMainContentClick = () => {
    if (item.type === 'surat') {
        router.push(`/dashboard/surat/${item.id}`);
    } else {
        onInternalClick(item.item as JadwalTempat);
    }
  };

  return (
    <div className="relative flex items-start gap-4 group w-full text-left">
      {/* Waktu */}
      <div className="flex-shrink-0 w-16 text-right pt-1">
        <span className="font-bold text-sm text-foreground">{item.time}</span>
      </div>
      
      {/* Garis Timeline */}
      <div className="relative flex flex-col items-center h-full self-stretch">
        <div className="absolute top-2 w-4 h-4 bg-muted border-2 border-primary rounded-full z-10 transition-colors group-hover:bg-primary"></div>
        <div className="absolute top-4 bottom-0 w-0.5 bg-border"></div>
      </div>
      
      {/* Konten Kartu */}
      <div className="flex-1 pb-6 min-w-0">
        <div className="bg-card border border-border rounded-lg transition-shadow group-hover:shadow-md w-full overflow-hidden">
          
          {/* Area Klik Utama (Judul & Info) */}
          {/* Kita gunakan div onClick atau Link untuk bagian ini saja */}
          {item.type === 'surat' ? (
             <Link href={`/dashboard/surat/${item.id}`} className="block p-3 hover:bg-accent/5 transition-colors">
                <CardContent item={item} />
             </Link>
          ) : (
             <div 
                onClick={() => onInternalClick(item.item as JadwalTempat)} 
                className="block p-3 cursor-pointer hover:bg-accent/5 transition-colors"
                role="button"
                tabIndex={0}
             >
                <CardContent item={item} />
             </div>
          )}

          {/* Area Tombol Aksi (Terpisah dari Link utama untuk menghindari nesting) */}
          {showNotulensiButton && (
            <div className="px-3 pb-3 bg-card">
              <div className="pt-3 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    onQuickNotulensi(item);
                  }}
                >
                  <FileSignature size={14} className="mr-2" />
                  Buat Notulensi
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Helper component untuk isi kartu agar tidak duplikasi
const CardContent = ({ item }: { item: CombinedAgendaItem }) => (
    <>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            item.type === 'surat'
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
            }`}>
            {item.type === 'surat' ? 'Undangan' : 'Internal'}
        </span>
        
        <p className="font-semibold text-foreground mt-2 break-words">{item.title}</p>
        
        <p className="text-xs text-muted-foreground mt-1 flex items-start">
            <MapPin size={12} className="mr-1.5 flex-shrink-0 mt-0.5" />
            <span className="flex-1 break-words min-w-0">{item.location}</span>
        </p>
        
        {item.type === 'surat' && (
            <p className="text-xs text-muted-foreground mt-1 flex items-start">
                {item.disposisiStatus === 'Sudah Didisposisi' ? 
                    <Send size={12} className="mr-1.5 flex-shrink-0 text-blue-500 mt-0.5" /> : 
                    <Info size={12} className="mr-1.5 flex-shrink-0 text-yellow-500 mt-0.5" />
                }
                <span className="font-medium mr-1 flex-shrink-0">Penerima:</span> 
                <span className="flex-1 break-words min-w-0">{item.penerimaDisposisi}</span>
            </p>
        )}
    </>
);

const AgendaTimeline = ({ items = [], onInternalClick, onQuickNotulensi }: AgendaTimelineProps) => {

  // Kelompokkan berdasarkan tanggal
  const groupedByDate = items.reduce((acc, item) => {
    const dateObj = item.type === 'surat'
        ? (item.item as Surat).detailAgenda!.tanggal.toDate()
        : (item.item as JadwalTempat).tanggalMulai.toDate();
    
    const dateString = dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    });

    if (!acc[dateString]) {
        acc[dateString] = [];
    }
    acc[dateString].push(item);
    return acc;
  }, {} as Record<string, CombinedAgendaItem[]>);

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
          <CalendarDays size={40} className="mx-auto text-muted-foreground/50"/>
          <p className="mt-4 font-semibold">Tidak ada agenda 7 hari ke depan.</p>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, itemsOnDate]) => (
          <div key={date}>
            <h3 className="font-semibold text-foreground text-base mb-3 pt-2 border-t border-border first:border-t-0 first:pt-0">
              {date}
            </h3>
            <div className="relative">
              {itemsOnDate.map((item, index) => (
                <AgendaTimelineItem 
                  key={item.id} 
                  item={item} 
                  onInternalClick={onInternalClick} 
                  onQuickNotulensi={onQuickNotulensi} 
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AgendaTimeline;