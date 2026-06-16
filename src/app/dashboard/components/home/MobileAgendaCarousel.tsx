"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Video, ExternalLink, Send, Info, MapPin } from 'lucide-react';
import { Surat, JadwalTempat, CombinedAgendaItem } from '@/types';
import { Button } from '@/components/ui/button';

// Komponen internal untuk Card Agenda di Carousel
const AgendaCarouselCard = ({ agenda }: { agenda: CombinedAgendaItem }) => (
    <Link href={agenda.type === 'surat' ? `/dashboard/surat/${agenda.id}` : '#'} className="w-full bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${agenda.type === 'surat' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>{agenda.type === 'surat' ? 'Undangan' : 'Internal'}</span>
          <span className="text-sm font-bold text-foreground">{agenda.time}</span>
        </div>
        
        <p className="font-semibold text-foreground mt-2 line-clamp-2 mb-auto">{agenda.title}</p>
        
        <div className="mt-3 space-y-1.5">
            <p className="text-xs text-muted-foreground line-clamp-1 truncate flex items-center">
                <MapPin size={12} className="mr-1.5 flex-shrink-0 text-primary" />
                {agenda.location}
            </p>

            {agenda.type === 'surat' && (
                 <div className="text-xs flex items-center gap-1.5 pt-2 border-t border-border/50 mt-2">
                    {agenda.disposisiStatus === 'Sudah Didisposisi' ? (
                        <>
                            <Send size={12} className="text-blue-500 flex-shrink-0" />
                            <span className="text-muted-foreground truncate flex-1" title={agenda.penerimaDisposisi}>
                                {agenda.penerimaDisposisi}
                            </span>
                        </>
                    ) : (
                         <>
                            <Info size={12} className="text-yellow-500 flex-shrink-0" />
                            <span className="text-yellow-600 dark:text-yellow-400 italic">Belum didisposisikan</span>
                         </>
                    )}
                 </div>
            )}
        </div>
      </div>
    </Link>
);

export default function MobileAgendaCarousel({ 
    combinedTodayAgenda, 
    todayFormatted 
}: { 
    combinedTodayAgenda: CombinedAgendaItem[], 
    todayFormatted: string 
}) {
  const [currentAgendaSlide, setCurrentAgendaSlide] = useState(0);
  const agendaIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchMoveX = useRef<number | null>(null);

  useEffect(() => {
    if (agendaIntervalRef.current) clearInterval(agendaIntervalRef.current);
    if (combinedTodayAgenda.length > 1) {
      agendaIntervalRef.current = setInterval(() => {
        setCurrentAgendaSlide(prev => (prev + 1) % combinedTodayAgenda.length);
      }, 10000); 
    }
    return () => { if (agendaIntervalRef.current) clearInterval(agendaIntervalRef.current); };
  }, [combinedTodayAgenda.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (agendaIntervalRef.current) clearInterval(agendaIntervalRef.current);
    touchStartX.current = e.touches[0].clientX;
    touchMoveX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchMoveX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchMoveX.current === null) return;
    const diffX = touchStartX.current - touchMoveX.current;
    const threshold = 50; 
    if (diffX > threshold) setCurrentAgendaSlide(prev => (prev + 1) % combinedTodayAgenda.length);
    else if (diffX < -threshold) setCurrentAgendaSlide(prev => (prev - 1 + combinedTodayAgenda.length) % combinedTodayAgenda.length);
    touchStartX.current = null; touchMoveX.current = null;
  };

  return (
    <div className="md:hidden mt-6 space-y-6">
        <div>
            <div className="flex justify-between items-baseline mb-4 px-4">
              <div><h2 className="text-xl font-semibold text-foreground">Agenda Hari Ini</h2><p className="text-sm font-medium text-muted-foreground">{todayFormatted}</p></div>
              <Button asChild variant="link" className="text-sm p-0 h-auto"><Link href="/dashboard/agenda">Selengkapnya</Link></Button>
            </div>
          {combinedTodayAgenda.length > 0 ? (
            <div className="relative">
              <div className="overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <div className="flex transition-transform duration-700 ease-in-out" style={{ width: `${combinedTodayAgenda.length * 100}%`, transform: `translateX(-${currentAgendaSlide * (100 / combinedTodayAgenda.length)}%)` }}>
                  {combinedTodayAgenda.map((agenda) => (
                    <div key={agenda.id} className="w-full flex-shrink-0 px-4" style={{ width: `${100 / combinedTodayAgenda.length}%` }}>
                      <AgendaCarouselCard agenda={agenda} /> 
                    </div>
                  ))}
                </div>
              </div>
              {combinedTodayAgenda.length > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  {combinedTodayAgenda.map((_, index) => (
                    <button key={index} onClick={() => setCurrentAgendaSlide(index)} className={`w-2 h-2 rounded-full transition-colors duration-300 ${index === currentAgendaSlide ? 'bg-primary' : 'bg-muted-foreground/50'}`} aria-label={`Go to slide ${index + 1}`} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border mx-4">
              <Calendar size={40} className="mx-auto text-muted-foreground/50"/><p className="mt-4 font-semibold">Tidak ada agenda hari ini.</p>
            </div>
          )}
        </div>
    </div>
  );
}