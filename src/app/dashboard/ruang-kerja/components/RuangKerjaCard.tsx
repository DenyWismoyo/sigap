/**
 * Directory: src/app/dashboard/ruang-kerja/components/RuangKerjaCard.tsx
 * Status: UPDATED
 * Deskripsi: Menghapus visualisasi "Tindak Lanjut Sendiri" manual, karena
 * sekarang sudah ditangani otomatis oleh sistem background.
 */

"use client";
import React, { useState, useMemo } from 'react';
import { RuangKerjaItem, UserProfile, Tugas, Disposisi, Surat, Jabatan, InstruksiTemplat } from '@/types'; 
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Avatar from '@/app/dashboard/components/Avatar'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { 
  Clock, Check, Send, FileText, CornerDownRight, Eye, Briefcase, Info, 
  MessageSquare, ArrowRight, AlertTriangle, 
  CheckCircle, Play,
  Pencil, X, Sparkles, User 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import InlineTindakLanjutForm from './InlineTindakLanjutForm'; 
import InlineTugasKomentar from './InlineTugasKomentar'; 
import { motion, AnimatePresence, Variants } from 'framer-motion'; 
import { useUserAuth } from '@/context/AuthContext';
import QuickEditTaskModal from './QuickEditTaskModal'; 
import { useToast } from '@/context/ToastContext';
import InlineDisposisiForm from './InlineDisposisiForm';
import InlineSuratDetail from './InlineSuratDetail'; 

interface RuangKerjaCardProps {
  item: RuangKerjaItem;
  userCache: Map<string, UserProfile>;
  opdJabatans: Map<string, Jabatan>;
  templatList: InstruksiTemplat[]; 
  onAcknowledge: (disposisiId: string) => void;
  onPreviewClick: (fileUrl: string, fileName: string) => void;
  
  onInlineFormToggle: (disposisiId: string) => void; 
  openInlineTindakLanjutId: string | null; 
  onInlineFormSuccess: () => void;
  
  isActionLoading?: boolean;
  isPimpinan: boolean;
  
  onQuickDisposisiClick: (surat: Surat, sourceDispo?: Disposisi) => void;
  
  onInlineDisposisiToggle: (suratId: string) => void;
  openInlineDisposisiId: string | null;
  onInlineDisposisiSuccess: () => void;
  
  onQuickTaskStatusChange: (tugas: Tugas, newStatus: 'Dikerjakan' | 'Selesai') => void;
  onQuickTaskCommentToggle: (tugasId: string) => void;
  openTaskCommentId: string | null;

  onQuickSelfTindakLanjut: (surat: Surat) => void;
  
  mutateTugas: () => void; 
}

const inlineFormVariants: Variants = { 
  hidden: { opacity: 0, height: 0, overflow: 'hidden', marginTop: 0 },
  visible: { opacity: 1, height: 'auto', overflow: 'visible', marginTop: 16, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, height: 0, overflow: 'hidden', marginTop: 0, transition: { duration: 0.2, ease: 'easeIn' } }
};

export default function RuangKerjaCard({
  item,
  userCache,
  opdJabatans,
  templatList, 
  onAcknowledge,
  onPreviewClick,
  onInlineFormToggle,
  onInlineFormSuccess,
  openInlineTindakLanjutId,
  isActionLoading = false,
  isPimpinan,
  onQuickDisposisiClick,
  onInlineDisposisiToggle,
  openInlineDisposisiId,
  onInlineDisposisiSuccess,
  onQuickTaskStatusChange,
  onQuickTaskCommentToggle,
  openTaskCommentId,
  onQuickSelfTindakLanjut,
  mutateTugas 
}: RuangKerjaCardProps) {
  
  const router = useRouter(); 
  const { actingJabatanProfile, jabatanProfile } = useUserAuth();
  const effectiveJabatan = useMemo(() => actingJabatanProfile || jabatanProfile, [actingJabatanProfile, jabatanProfile]);
  const [quickEditTask, setQuickEditTask] = useState<Tugas | null>(null);
  const { addToast } = useToast();

  const isSuratDisposisi = item.type === 'surat_disposisi';
  const isTugas = item.type === 'tugas';
  const isSuratBaru = item.type === 'surat_baru';
  const isDraf = item.type === 'draf';

  const isAssignee = useMemo(() => {
    if (item.type !== 'tugas') return false;
    return effectiveJabatan?.id === item.tugas.kepadaJabatanId;
  }, [effectiveJabatan, item]);

  const title = isSuratDisposisi ? item.surat.perihal : 
                isTugas ? item.tugas.judulTugas : 
                isSuratBaru ? item.surat.perihal : 
                isDraf ? item.draf.judul : 'Item';
  
  const senderName = item.fromJabatanName;
  
  const timestampDate = useMemo(() => {
    if (isSuratDisposisi) return item.disposisi.tanggalDisposisi?.toDate();
    if (isTugas) return item.tugas.tanggalDibuat?.toDate();
    if (isSuratBaru) return item.surat.tanggalDiterima?.toDate();
    if (isDraf) return item.draf.createdAt?.toDate();
    return new Date();
  }, [isSuratDisposisi, isTugas, isSuratBaru, isDraf, item]);

  const timeAgo = timestampDate ? formatDistanceToNow(timestampDate, { addSuffix: true, locale: id }) : '';

  const HeaderBadge = () => {
      if (isSuratDisposisi) {
          if (item.disposisi.isInformational) return <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">Pemberitahuan</Badge>;
          return <Badge className="bg-blue-600 hover:bg-blue-700">Disposisi Masuk</Badge>;
      }
      if (isTugas) {
          return <Badge className="bg-emerald-600 hover:bg-emerald-700">Tugas</Badge>;
      }
      if (isSuratBaru) {
          return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Surat Baru</Badge>;
      }
      if (isDraf) {
          return <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">Review Draf</Badge>;
      }
      return null;
  };

  const StatusBadges = () => {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
           {(isSuratDisposisi && item.isOverdue) || (isTugas && item.tugas.batasWaktu && item.tugas.batasWaktu.toDate() < new Date()) ? (
               <Badge variant="destructive" className="text-[10px] px-1.5 h-5 flex items-center gap-1"><AlertTriangle size={10}/> Terlambat</Badge>
           ) : null}
           
           {isSuratDisposisi && item.surat.klasifikasi !== 'Biasa' && (
               <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-yellow-500 text-yellow-600">{item.surat.klasifikasi}</Badge>
           )}
           {isSuratDisposisi && item.surat.jenisSurat === 'Undangan' && (
               <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-purple-500 text-purple-600">Undangan</Badge>
           )}
           {isTugas && (
               <Badge variant="outline" className={`text-[10px] px-1.5 h-5 ${item.tugas.prioritas === 'Tinggi' ? 'border-red-500 text-red-600' : 'border-gray-400 text-gray-600'}`}>{item.tugas.prioritas}</Badge>
           )}
        </div>
      );
  }

  const ContentPreview = () => {
      if (isSuratDisposisi) {
          return (
            <div className={`mt-3 p-2.5 rounded-md text-sm ${item.disposisi.isInformational ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' : 'bg-gray-50 text-gray-800 dark:bg-slate-800 dark:text-gray-200'}`}>
                <div className="flex items-start gap-2">
                    {item.disposisi.isInformational ? <Info size={14} className="mt-0.5 shrink-0 opacity-70" /> : <MessageSquare size={14} className="mt-0.5 shrink-0 opacity-70" />}
                    <span className="leading-tight">{item.disposisi.instruksi}</span>
                </div>
            </div>
          );
      }
      if (isTugas) {
          return (
            <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-900 dark:text-emerald-100 rounded-md text-sm border border-emerald-100 dark:border-emerald-900/30">
                 <div className="flex items-start gap-2">
                    <FileText size={14} className="mt-0.5 shrink-0 opacity-70" />
                    <span className="leading-tight line-clamp-2">{item.tugas.deskripsi}</span>
                </div>
            </div>
          );
      }
      return null;
  };

  const ActionButtons = () => {
      if (isSuratDisposisi) {
          const { disposisi, surat, needsAcknowledge, needsTindakLanjut } = item;
          const isInlineOpen = openInlineTindakLanjutId === disposisi.id;

          return (
              <div className="flex flex-wrap gap-2 w-full">
                  {needsAcknowledge && (
                      <Button size="sm" onClick={() => onAcknowledge(disposisi.id!)} disabled={isActionLoading} className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs flex-1 sm:flex-none">
                          <Check size={14} className="mr-1.5" />{disposisi.isInformational ? 'Saya Mengerti' : 'Terima'}
                      </Button>
                  )}
                  {needsTindakLanjut && (
                      <Button 
                          size="sm" 
                          onClick={() => onInlineFormToggle(disposisi.id!)} 
                          disabled={isActionLoading} 
                          className={`h-8 px-3 text-xs flex-1 sm:flex-none transition-colors ${isInlineOpen ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-200' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                          {isInlineOpen ? (
                              <><X size={14} className="mr-1.5"/> Batal</>
                          ) : (
                              <><CornerDownRight size={14} className="mr-1.5" />Tindak Lanjut / Aksi</>
                          )}
                      </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onPreviewClick(surat.fileUrl, surat.fileName)} title="Pratinjau PDF"><Eye size={14}/></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild><Link href={`/dashboard/surat/${surat.id}`}><ArrowRight size={14}/></Link></Button>
                  </div>
              </div>
          );
      }

      if (isTugas) {
          const { tugas } = item;
          return (
              <div className="flex flex-wrap gap-2 w-full">
                  {tugas.status === 'Baru' && (
                       <Button size="sm" onClick={() => onQuickTaskStatusChange(tugas, 'Dikerjakan')} disabled={isActionLoading} className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs flex-1 sm:flex-none">
                           <Play size={14} className="mr-1.5" />Kerjakan
                       </Button>
                  )}
                  {tugas.status === 'Dikerjakan' && isAssignee && (
                       <Button size="sm" onClick={() => onQuickTaskStatusChange(tugas, 'Selesai')} disabled={isActionLoading} className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs flex-1 sm:flex-none">
                           <CheckCircle size={14} className="mr-1.5" />Selesai
                       </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuickEditTask(tugas)} disabled={isActionLoading}><Pencil size={14}/></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onQuickTaskCommentToggle(tugas.id!)} disabled={isActionLoading}><MessageSquare size={14}/></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild><Link href={`/dashboard/tugas?open=${tugas.id!}`}><ArrowRight size={14}/></Link></Button>
                  </div>
              </div>
          );
      }

      if (isSuratBaru) {
          const { surat } = item;
          const isInlineOpen = openInlineDisposisiId === surat.id;
          return (
              <div className="flex flex-wrap gap-2 w-full">
                   <Button size="sm" onClick={() => onInlineDisposisiToggle(surat.id)} className={`h-8 px-3 text-xs flex-1 sm:flex-none ${isInlineOpen ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={isActionLoading}>
                        {isInlineOpen ? <><X size={14} className="mr-1.5"/> Batal</> : <><Send size={14} className="mr-1.5" /> Disposisi / Aksi</>}
                   </Button>
                   
                   <div className="flex gap-2 ml-auto">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onPreviewClick(surat.fileUrl, surat.fileName)}><Eye size={14}/></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild><Link href={`/dashboard/surat/${surat.id}`}><ArrowRight size={14}/></Link></Button>
                   </div>
              </div>
          );
      }
      
      if (isDraf) {
           return <Button size="sm" asChild className="w-full bg-purple-600 hover:bg-purple-700 h-8 text-xs"><Link href={`/dashboard/persetujuan-draf/${item.draf.id}`}>Lihat & Setujui</Link></Button>;
      }

      return null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
    
    if (isSuratDisposisi || isSuratBaru) router.push(`/dashboard/surat/${item.surat.id}`);
    else if (isTugas) router.push(`/dashboard/tugas?open=${item.tugas.id}`);
    else if (isDraf) router.push(`/dashboard/persetujuan-draf/${item.draf.id}`);
  };

  return (
    <div className="w-full mb-3">
      <Card className="shadow-sm border transition-colors hover:border-primary/50 bg-card">
        
        {/* BODY UTAMA */}
        <div onClick={handleCardClick} className="cursor-pointer p-4 pb-3">
            
            {/* Baris 1: Header Kompak */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <HeaderBadge />
                    <StatusBadges />
                </div>
                <div className="flex items-center text-[10px] text-muted-foreground">
                    <Clock size={10} className="mr-1" />
                    {timeAgo}
                </div>
            </div>

            {/* Baris 2: Konten Utama */}
            <div className="flex items-start gap-3">
                <Avatar name={senderName} className="h-9 w-9 text-[10px] mt-0.5 hidden sm:flex" />
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 text-xs text-muted-foreground mb-0.5">
                        <span className="font-medium text-foreground flex items-center gap-1 sm:hidden"><User size={10}/> {senderName}</span>
                        <span className="font-medium text-foreground hidden sm:inline">{senderName}</span>
                        {isSuratDisposisi && <span>&rarr; Anda</span>}
                    </div>
                    
                    <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                        {title}
                    </h4>
                    
                    <ContentPreview />
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-3 bg-muted/30 border-t border-border rounded-b-lg">
            <ActionButtons />
            
            <AnimatePresence>
                {isSuratDisposisi && openInlineTindakLanjutId === item.disposisi.id && (
                <motion.div className="w-full" variants={inlineFormVariants} initial="hidden" animate="visible" exit="exit">
                    <InlineTindakLanjutForm 
                    surat={item.surat} 
                    disposisi={item.disposisi} 
                    onSuccess={onInlineFormSuccess} 
                    userCache={userCache} 
                    opdJabatans={opdJabatans} 
                    templatList={templatList} 
                    />
                </motion.div>
                )}
                
                {isTugas && openTaskCommentId === item.tugas.id && (
                <motion.div className="w-full" variants={inlineFormVariants} initial="hidden" animate="visible" exit="exit">
                    <InlineTugasKomentar tugasId={item.tugas.id!} userCache={userCache} onSuccess={() => onQuickTaskCommentToggle(item.tugas.id!)} />
                </motion.div>
                )}

                {isSuratBaru && openInlineDisposisiId === item.surat.id && (
                <motion.div 
                    className="w-full flex flex-col gap-4" 
                    variants={inlineFormVariants} 
                    initial="hidden" 
                    animate="visible" 
                    exit="exit"
                >
                    <InlineDisposisiForm
                        surat={item.surat}
                        userCache={userCache}
                        opdJabatans={opdJabatans}
                        onSuccess={onInlineDisposisiSuccess}
                        onCancel={() => onInlineDisposisiToggle(item.surat.id)}
                        onSelfDisposition={() => onQuickSelfTindakLanjut(item.surat)} 
                        templatList={templatList}
                    />

                    <InlineSuratDetail surat={item.surat} />
                </motion.div>
                )}
            </AnimatePresence>
        </div>

      </Card>

      <QuickEditTaskModal isOpen={!!quickEditTask} onClose={() => setQuickEditTask(null)} tugas={quickEditTask} onSuccess={() => { setQuickEditTask(null); mutateTugas(); addToast('Tugas berhasil diperbarui.', 'success'); }} userCache={userCache} opdJabatans={opdJabatans} />
    </div>
  );
}