// Directory: src/app/dashboard/surat/[id]/components/DispositionTracker.tsx
// [UPDATE PADDING MOBILE]: Merapatkan ruang tampilan di ponsel

"use client";

import React, { useState } from 'react';
import { Disposisi, UserProfile } from '@/types';
import { CheckCircle, Clock, AlertCircle, GitCommit, ChevronDown, ChevronUp, UserX, CornerDownRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DispositionTrackerProps {
  disposisiList: Disposisi[];
  userCache: Map<string, UserProfile>;
  jabatanCache: Map<string, string>;
}

// Helper aman untuk mendapatkan tanggal JS
const getSafeDate = (dateField: any): Date | null => {
    if (!dateField) return null;
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    if (dateField instanceof Date) return dateField;
    if (dateField.seconds) return new Date(dateField.seconds * 1000);
    return null;
};

export function DispositionTracker({ disposisiList, userCache, jabatanCache }: DispositionTrackerProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!disposisiList || disposisiList.length === 0) return null;

  const sortedDisposisi = [...disposisiList].sort((a, b) => {
    const dateA = getSafeDate(a.tanggalDisposisi)?.getTime() || Date.now();
    const dateB = getSafeDate(b.tanggalDisposisi)?.getTime() || Date.now();
    return dateA - dateB;
  });

  return (
    <div className="mt-4 md:mt-6 bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          
          {/* HEADER */}
          <div className="p-3 md:p-4 flex items-center justify-between bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
              <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-primary/10 rounded-full border border-primary/20 text-primary">
                     <GitCommit size={16} className="md:w-[18px] md:h-[18px]" />
                  </div>
                  <div>
                      <h4 className="text-sm font-bold text-foreground">Jejak Alur Disposisi</h4>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {sortedDisposisi.length} Aktivitas terekam
                      </p>
                  </div>
              </div>
              
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isOpen ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
          </div>
          
          {/* CONTENT */}
          <CollapsibleContent className="animate-in slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 overflow-hidden">
              <div className="p-0 bg-background">
                {/* Penyesuaian padding mobile */}
                <ScrollArea className="max-h-[400px] md:max-h-[500px] w-full px-3 py-4 md:px-5 md:py-6">
                    <div className="relative space-y-0 pl-1 md:pl-2 pb-2">
                      
                      {sortedDisposisi.map((disp, index) => {
                        const isLast = index === sortedDisposisi.length - 1;
                        const pengirimName = disp.dariJabatanNama || '...';
                        
                        const dateObj = getSafeDate(disp.tanggalDisposisi);
                        const tanggalDisp = dateObj 
                            ? dateObj.toLocaleDateString('id-ID', { 
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                              })
                            : 'Baru saja...';
                        
                        return (
                          // Penyesuaian gap bawah mobile
                          <div key={disp.id} className="relative z-10 pl-5 md:pl-6 pb-6 md:pb-8 group last:pb-2">
                            {/* Garis Vertikal Timeline */}
                            {!isLast && (
                                <div className="absolute left-[3px] top-4 bottom-[-12px] md:bottom-[-16px] w-[2px] bg-border z-0" />
                            )}
                            
                            {/* Dot Node */}
                            <div className="absolute left-[-2px] top-1.5 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-primary z-10 ring-4 ring-background shadow-sm" />
                            
                            {/* Konten Disposisi */}
                            <div className="flex flex-col gap-2.5 md:gap-3 mt-[-4px]">
                                
                                {/* 1. Header (Pengirim & Waktu) */}
                                <div className="flex flex-wrap items-start justify-between gap-1.5 md:gap-2">
                                  <div className="text-xs md:text-sm">
                                    <span className="font-bold text-foreground">{pengirimName}</span> 
                                    <span className="text-muted-foreground text-[10px] md:text-xs ml-1.5 hidden sm:inline-block">mendisposisikan surat:</span>
                                  </div>
                                  <span className="text-[9px] md:text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm md:rounded-full shrink-0 border border-border/50">
                                    {tanggalDisp}
                                  </span>
                                </div>

                                {/* 2. Instruksi (Sleek Blockquote) */}
                                {disp.instruksi && (
                                  <div className="relative pl-2.5 md:pl-3 py-0 md:py-0.5">
                                    <div className="absolute left-0 top-0 bottom-0 w-[2px] md:w-[3px] bg-primary/40 rounded-full" />
                                    <p className="text-[13px] md:text-sm text-foreground/80 italic leading-snug">
                                      "{disp.instruksi}"
                                    </p>
                                  </div>
                                )}

                                {/* 3. Penerima (Compact Grid) */}
                                <div className="flex items-start gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                                    <CornerDownRight size={14} className="text-muted-foreground shrink-0 mt-0.5 md:mt-1" />
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1">
                                        {disp.kepadaJabatanId.map((jabatanId) => {
                                        // Ambil Data Snapshot / Cache
                                        const snapshotList = (disp as any).penerimaSnapshot || [];
                                        const snapshotUser = snapshotList.find((p: any) => p.jabatanId === jabatanId);
                                        const cachedUser = userCache?.get(jabatanId);
                                        const jabatanName = jabatanCache?.get(jabatanId) || 'Jabatan Tidak Dikenal';

                                        let displayName: string | React.ReactNode;
                                        let avatarInitial = '?';

                                        if (snapshotUser) {
                                            displayName = snapshotUser.nama;
                                            avatarInitial = snapshotUser.nama.charAt(0).toUpperCase();
                                        } else if (cachedUser) {
                                            displayName = cachedUser.namaLengkap;
                                            avatarInitial = cachedUser.namaLengkap.charAt(0).toUpperCase();
                                        } else {
                                            displayName = <span className="italic text-muted-foreground flex items-center gap-1"><UserX size={10} className="md:w-3 md:h-3"/> Jabatan Kosong</span>;
                                            avatarInitial = '?';
                                        }
                                        
                                        const isRead = (disp.penerimaDiterima || []).includes(jabatanId);
                                        const isDone = (disp.penerimaSelesai || []).includes(jabatanId);
                                        
                                        let statusIcon = <Clock size={10} className="md:w-3 md:h-3 text-amber-600" />;
                                        let statusText = "Menunggu";
                                        let statusClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";

                                        if (isDone) {
                                            statusIcon = <CheckCircle size={10} className="md:w-3 md:h-3 text-emerald-600" />;
                                            statusText = "Selesai";
                                            statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
                                        } else if (isRead) {
                                            statusIcon = <AlertCircle size={10} className="md:w-3 md:h-3 text-blue-600" />;
                                            statusText = "Diproses";
                                            statusClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
                                        }

                                        return (
                                            <div key={jabatanId} className="flex items-center justify-between p-1.5 md:p-2 rounded-md bg-muted/20 border border-border/60 hover:bg-muted/50 transition-colors shadow-sm">
                                                <div className="flex items-center gap-2 md:gap-2.5 min-w-0 pr-2">
                                                    <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-bold shrink-0 border ${(snapshotUser || cachedUser) ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                                        {avatarInitial}
                                                    </div>
                                                    <div className="min-w-0 flex flex-col justify-center">
                                                        <p className="font-semibold text-[11px] md:text-xs text-foreground truncate leading-tight">
                                                            {displayName}
                                                        </p>
                                                        <p className="text-[9px] md:text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                                            {jabatanName}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <TooltipProvider delayDuration={300}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className={`flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] font-medium shrink-0 border cursor-help ${statusClass}`}>
                                                                {statusIcon}
                                                                <span className="hidden sm:inline-block truncate max-w-[70px]">{statusText}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs">
                                                            <p>Status: {statusText}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        );
                                        })}
                                    </div>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </ScrollArea>
              </div>
          </CollapsibleContent>
      </Collapsible>
    </div>
  );
}