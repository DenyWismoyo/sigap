/**
 * Directory: src/app/dashboard/ruang-kerja/page.tsx
 * Status: UPDATED
 * Deskripsi: Halaman utama Ruang Kerja. 
 * - Terintegrasi dengan fitur Paginasi (Load More)
 * - [FIX] Mencegah reset scroll saat Load More dengan mempertahankan cache data sebelumnya.
 * - Terdapat AUTO-CLEANUP di latar belakang untuk menyingkirkan "Self-Disposisi" lama secara otomatis.
 * - [FIX] State Hidden Item untuk mencegah Ghosting Card secara instan.
 */

"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation'; 
import dynamic from 'next/dynamic'; 
import { 
  Disposisi, Surat, Tugas, JadwalTempat, 
  RuangKerjaItem
} from '@/types';

import AgendaTimeline from '@/app/dashboard/ruang-kerja/components/AgendaTimeline'; 
import VisionaryFeed from '@/app/dashboard/ruang-kerja/components/VisionaryFeed'; 
import RuangKerjaSkeleton from '@/app/dashboard/components/skeletons/RuangKerjaSkeleton'; 
import QuickAddTask from '@/app/dashboard/ruang-kerja/components/QuickAddTask';
import StickyNoteWidget from '@/app/dashboard/ruang-kerja/components/StickyNoteWidget';
import QuickLinksWidget from '@/app/dashboard/ruang-kerja/components/QuickLinksWidget'; 
import EmptyStateWidget from '@/app/dashboard/ruang-kerja/components/EmptyStateWidget'; 

const QuickPreviewModal = dynamic(() => import('@/app/dashboard/ruang-kerja/components/QuickPreviewModal'), { ssr: false });
const QuickDisposisiModal = dynamic(() => import('@/app/dashboard/ruang-kerja/components/QuickDisposisiModal'), { ssr: false });
const JadwalDetailModal = dynamic(() => import('@/app/dashboard/jadwal/components/JadwalDetailModal'), { ssr: false });
const QuickEditTaskModal = dynamic(() => import('@/app/dashboard/ruang-kerja/components/QuickEditTaskModal'), { ssr: false }); 
const RuangKerjaTutorialModal = dynamic(() => import('@/app/dashboard/ruang-kerja/components/RuangKerjaTutorialModal'), { ssr: false });
const NotulensiFormModal = dynamic(() => import('../notulensi/components/NotulensiFormModal'), { ssr: false });
const ConfirmModal = dynamic(() => import('@/app/dashboard/components/ConfirmModal'), { ssr: false });

import { useUserAuth } from '@/context/AuthContext'; 
import { useToast } from '@/context/ToastContext'; 
import { useTheme } from '@/context/ThemeContext';
import { useRuangKerjaFeed } from '@/app/dashboard/hooks/useRuangKerjaFeed'; 
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';         
import { useInstruksiTemplat } from '@/app/dashboard/hooks/useInstruksiTemplat'; 

import { db } from '@/lib/firebase'; 
import { 
  collection, query, where, onSnapshot, doc, writeBatch, 
  arrayUnion, orderBy, Timestamp,
  serverTimestamp,
  or, 
  and, 
  getDocs,
  addDoc
} from 'firebase/firestore';
import { logActivity } from '@/lib/activityLogger'; 
import { updateLogbook } from '@/lib/logbookUtils'; 

import { 
  Inbox, StickyNote, CalendarDays, Sun, Moon, CloudSun, Sunset, Loader2
} from 'lucide-react';
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

const SmartGreeting = ({ userName }: { userName: string }) => {
  const [greetingData, setGreetingData] = useState({ text: '', subText: '', icon: <Sun className="w-8 h-8 text-yellow-500" /> });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      setGreetingData({ text: "Selamat Pagi", subText: "Siap untuk memulai hari yang produktif?", icon: <CloudSun className="w-8 h-8 text-yellow-400" /> });
    } else if (hour >= 11 && hour < 15) {
      setGreetingData({ text: "Selamat Siang", subText: "Jangan lupa istirahat sejenak.", icon: <Sun className="w-8 h-8 text-orange-500" /> });
    } else if (hour >= 15 && hour < 19) {
      setGreetingData({ text: "Selamat Sore", subText: "Mari tuntaskan pekerjaan hari ini.", icon: <Sunset className="w-8 h-8 text-orange-400" /> });
    } else {
      setGreetingData({ text: "Selamat Malam", subText: "Terima kasih atas dedikasi Anda hari ini.", icon: <Moon className="w-8 h-8 text-indigo-400" /> });
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex flex-col md:flex-row md:items-center gap-4 mb-8 px-1 md:px-0"
    >
      <div className="p-3 bg-card rounded-full shadow-sm border border-border w-fit">{greetingData.icon}</div>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {greetingData.text}, <span className="text-primary">{userName}</span>!
        </h1>
        <p className="text-muted-foreground mt-1">{greetingData.subText}</p>
      </div>
    </motion.div>
  );
};

export default function RuangKerjaPage() {
  const { user, userProfile, jabatanProfile, actingJabatanProfile, loading: authLoading, opdConfig } = useUserAuth();
  const { addToast } = useToast(); 
  const { theme } = useTheme(); 
  const router = useRouter(); 
  const effectiveJabatan = actingJabatanProfile || jabatanProfile;

  // Tangkap loadMore dan hasMore dari hook useRuangKerjaFeed
  const { feedItems: rawFeedItems, isLoading: isFeedLoading, refreshFeed, loadMore, hasMore } = useRuangKerjaFeed();
  
  // --- FIX SCROLL JUMP: Mempertahankan data saat Pagination memuat ---
  const prevFeedItemsRef = useRef<RuangKerjaItem[]>([]);
  const feedItems = useMemo(() => {
      // Jika data berhasil ditarik dan ada isinya, simpan ke cache
      if (rawFeedItems.length > 0) {
          prevFeedItemsRef.current = rawFeedItems;
          return rawFeedItems;
      }
      // Jika kosong TAPI sedang proses loading (misal pindah limit), tampilkan cache
      if (isFeedLoading && prevFeedItemsRef.current.length > 0) {
          return prevFeedItemsRef.current;
      }
      // Jika benar-benar kosong dan tidak loading, kosongkan cache
      if (!isFeedLoading) {
          prevFeedItemsRef.current = [];
      }
      return rawFeedItems;
  }, [rawFeedItems, isFeedLoading]);
  // ------------------------------------------------------------------

  const { userMap, jabatanMap, isLoading: isMasterLoading } = useMasterData(true);
  const { templatList, isLoading: isTemplatLoading } = useInstruksiTemplat();

  const [openDisposisiFormId, setOpenDisposisiFormId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  
  const [quickDisposisiData, setQuickDisposisiData] = useState<Surat | null>(null);
  const [quickDisposisiSource, setQuickDisposisiSource] = useState<Disposisi | null>(null);
  
  const [openTaskCommentId, setOpenTaskCommentId] = useState<string | null>(null);
  const [confirmSelfTindakLanjut, setConfirmSelfTindakLanjut] = useState<Surat | null>(null);

  const [jadwalInternalList, setJadwalInternalList] = useState<JadwalTempat[]>([]);
  const [suratUndanganList, setSuratUndanganList] = useState<Surat[]>([]);
  const [allDispositionsForAgenda, setAllDispositionsForAgenda] = useState<Disposisi[]>([]);
  const [isAgendaLoading, setIsAgendaLoading] = useState(true);
  
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalTempat | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const TUTORIAL_STORAGE_KEY = 'hasSeenRuangKerjaTutorial_v1';

  const [isNotulensiModalOpen, setIsNotulensiModalOpen] = useState(false);
  const [notulensiInitialData, setNotulensiInitialData] = useState<any>(null);
  const [isNotulensiSaving, setIsNotulensiSaving] = useState(false);

  const [openInlineDisposisiId, setOpenInlineDisposisiId] = useState<string | null>(null);
  
  // [FIX GHOSTING BUG] State baru untuk menampung ID yang disembunyikan sementara
  const [hiddenItemIds, setHiddenItemIds] = useState<Set<string>>(new Set());

  type RuangKerjaFilter = 'semua' | 'surat' | 'tugas' | 'draf';
  const [activeFilter, setActiveFilter] = useState<RuangKerjaFilter>('semua');

  const isPimpinan = useMemo(() => !!(effectiveJabatan && effectiveJabatan.level <= 5), [effectiveJabatan]);
  const isAdminOrTU = useMemo(() => userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu', [userProfile]);

  // --- AUTO CLEANUP SYSTEM ---
  useEffect(() => {
    if (!userProfile || !effectiveJabatan || !effectiveJabatan.id || feedItems.length === 0) return;

    const currentJabatanId = effectiveJabatan.id;

    const itemsToClean = feedItems.filter(item => {
         if (item.type !== 'surat_disposisi') return false;
         const d = item.disposisi;
         const isFromMe = d.dariJabatanId === currentJabatanId;
         const isToMe = d.kepadaJabatanId.includes(currentJabatanId);
         const isNotFinished = !(d.penerimaSelesai || []).includes(currentJabatanId);
         return isFromMe && isToMe && isNotFinished;
    });

    if (itemsToClean.length > 0) {
        const autoCleanup = async () => {
             const batch = writeBatch(db);
             
             itemsToClean.forEach(item => {
                  if (item.type !== 'surat_disposisi') return;
                  const { disposisi, surat } = item;

                  const disposisiRef = doc(db, 'disposisi', disposisi.id!);
                  batch.update(disposisiRef, {
                      penerimaDiterima: arrayUnion(currentJabatanId),
                      penerimaSelesai: arrayUnion(currentJabatanId)
                  });

                  const tindakLanjutRef = doc(collection(db, 'tindakLanjut'));
                  batch.set(tindakLanjutRef, {
                      suratId: surat.id!,
                      disposisiId: disposisi.id!,
                      jabatanId: currentJabatanId,
                      userId: userProfile.uid,
                      isiLaporan: "Pimpinan telah menindaklanjuti dan menyelesaikan surat ini secara mandiri (Auto-Cleanup).",
                      tanggalLaporan: serverTimestamp() as Timestamp
                  });

                  const suratRef = doc(db, 'surat', surat.id!);
                  batch.update(suratRef, { statusPenyelesaian: 'Selesai' });
             });

             try {
                 await batch.commit();
                 refreshFeed();
             } catch (e) {
                 console.error("Auto cleanup failed", e);
             }
        };
        autoCleanup();
    }
  }, [feedItems, effectiveJabatan, userProfile, refreshFeed]);

  useEffect(() => {
    if (!userProfile?.opdId || !userProfile?.uid || authLoading) return;
    
    setIsAgendaLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(today); thirtyDaysLater.setDate(today.getDate() + 30); 
    const unsubscribes: (()=> void)[] = []; 

    let agendaQuery;
    if (isPimpinan || isAdminOrTU) {
        agendaQuery = query(collection(db, 'surat'), where('opdId', '==', userProfile.opdId), where('jenisSurat', '==', 'Undangan'), where('statusPenyelesaian', '!=', 'Diarsipkan'), where('detailAgenda.tanggal', '>=', Timestamp.fromDate(today)), where('detailAgenda.tanggal', '<', Timestamp.fromDate(thirtyDaysLater)), orderBy('detailAgenda.tanggal', 'asc'));
    } else {
        agendaQuery = query(collection(db, 'suratPerPengguna', userProfile.uid, 'inbox'), where('jenisSurat', '==', 'Undangan'), where('statusPenyelesaian', '!=', 'Diarsipkan'), where('detailAgenda.tanggal', '>=', Timestamp.fromDate(today)), where('detailAgenda.tanggal', '<', Timestamp.fromDate(thirtyDaysLater)), orderBy('detailAgenda.tanggal', 'asc'));
    }
    unsubscribes.push(onSnapshot(agendaQuery, async (snapshot) => {
          const agendaList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Surat));
          setSuratUndanganList(agendaList);
          const agendaSuratIds = agendaList.map((s) => s.id).filter(Boolean) as string[]; 
          if (agendaSuratIds.length > 0) {
            const disposisiPromises = [];
            for (let i = 0; i < agendaSuratIds.length; i += 30) {
              const chunk = agendaSuratIds.slice(i, i + 30);
              if (chunk.length > 0) disposisiPromises.push(getDocs(query(collection(db, 'disposisi'), where('suratId', 'in', chunk))));
            }
            const disposisiSnapshots = await Promise.all(disposisiPromises);
            const allDisposisiDocs = disposisiSnapshots.flatMap((snap) => snap.docs);
            setAllDispositionsForAgenda(allDisposisiDocs.map((d) => ({ id: d.id, ...d.data() } as Disposisi)));
          } else { setAllDispositionsForAgenda([]); }
    }, (error) => console.error('Error fetching agenda undangan:', error)));

    const jadwalQuery = query(collection(db, "jadwalTempat"), and(where("opdId", "==", userProfile.opdId), where('tanggalMulai', '>=', Timestamp.fromDate(today)), where('tanggalMulai', '<=', Timestamp.fromDate(thirtyDaysLater)), or(where('penanggungJawab', '==', userProfile.namaLengkap), where('createdBy', '==', userProfile.uid))));
    unsubscribes.push(onSnapshot(jadwalQuery, (snapshot) => {
          const jadwalData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as JadwalTempat));
          jadwalData.sort((a, b) => a.tanggalMulai.toMillis() - b.tanggalMulai.toMillis());
          setJadwalInternalList(jadwalData);
          setIsAgendaLoading(false); 
    }, (error) => { console.error('Error fetching jadwal internal:', error); setIsAgendaLoading(false); }));
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [userProfile, authLoading, isPimpinan, isAdminOrTU]);

  useEffect(() => {
    if (!authLoading && typeof window !== 'undefined') {
      const hasSeenTutorial = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!hasSeenTutorial) setIsTutorialOpen(true);
    }
  }, [authLoading]);

  const handlePreviewClick = (fileUrl: string, fileName: string) => {
    setPreviewFileUrl(fileUrl); setPreviewFileName(fileName);
    setIsQuickPreviewOpen(true);
  };
  const handleClosePreview = () => {
    setIsQuickPreviewOpen(false); setPreviewFileUrl(null); setPreviewFileName(null);
  };
  
  const onQuickAcknowledge = async (disposisiId: string) => {
    if (!userProfile || !effectiveJabatan?.id || !user) { addToast("Sesi pengguna tidak valid.", "error"); return; }
    setIsActionLoading(disposisiId);
    try {
      const batch = writeBatch(db);
      const disposisiRef = doc(db, 'disposisi', disposisiId);
      batch.update(disposisiRef, { penerimaDiterima: arrayUnion(effectiveJabatan.id) });
      await batch.commit();
      addToast("Berhasil diterima!", "success");
      refreshFeed(); 
    } catch (error: any) { console.error("Gagal menerima:", error); addToast("Gagal memproses penerimaan.", "error"); } finally { setIsActionLoading(null); }
  };

  const handleDisposisiFormToggle = (disposisiId: string) => { setOpenDisposisiFormId(prev => (prev === disposisiId ? null : disposisiId)); };
  const handleInlineDisposisiToggle = (suratId: string) => { setOpenInlineDisposisiId(prev => (prev === suratId ? null : suratId)); };
  const handleQuickTaskCommentToggle = (taskId: string) => { setOpenTaskCommentId(prev => (prev === taskId ? null : taskId)); };
  
  // [FIX GHOSTING BUG] Mengisi Set hiddenItemIds untuk memberikan efek instan menyembunyikan kartu UI
  const handleInlineFormSuccess = () => { 
      if (openDisposisiFormId) {
          setHiddenItemIds(prev => {
              const newSet = new Set(prev);
              newSet.add(openDisposisiFormId);
              return newSet;
          });
      }
      setOpenDisposisiFormId(null); 
      refreshFeed(); 
  };
  const handleInlineDisposisiSuccess = () => { 
      if (openInlineDisposisiId) {
           setHiddenItemIds(prev => {
              const newSet = new Set(prev);
              newSet.add(openInlineDisposisiId);
              return newSet;
          });
      }
      setOpenInlineDisposisiId(null); 
      refreshFeed(); 
  };
  
  const handleQuickTaskStatusChange = async (tugas: Tugas, newStatus: 'Dikerjakan' | 'Selesai') => {
    if (!userProfile || !effectiveJabatan || !tugas.id) return;
    setIsActionLoading(tugas.id); 
    try {
        const batch = writeBatch(db);
        const tugasRef = doc(db, 'tugas', tugas.id);
        const updateData: any = { status: newStatus, tanggalSelesai: newStatus === 'Selesai' ? Timestamp.now() : null };
        batch.update(tugasRef, updateData);
        if (newStatus === 'Selesai') {
            const newLogEntry = { id: `tugas_${tugas.id}_${Date.now()}`, deskripsi: `Menyelesaikan tugas: "${tugas.judulTugas}"`, selesai: true, tugasTerkaitId: tugas.id, tugasTerkaitJudul: tugas.judulTugas };
            await updateLogbook(userProfile.uid, userProfile.opdId, new Date(), newLogEntry);
        }
        await batch.commit();
        addToast(newStatus === 'Selesai' ? "Tugas selesai & dilapor ke Logbook!" : "Status tugas diperbarui.", "success");
        refreshFeed(); 
    } catch (err: any) { addToast(err.message, "error"); } finally { setIsActionLoading(null); }
  };

  const handleQuickSelfTindakLanjut = (surat: Surat) => { setConfirmSelfTindakLanjut(surat); };
  
  const executeSelfTindakLanjut = async () => {
    if (!confirmSelfTindakLanjut || !userProfile || !effectiveJabatan) return;
    const surat = confirmSelfTindakLanjut;
    setIsActionLoading(surat.id); setConfirmSelfTindakLanjut(null); 
    try {
      const batch = writeBatch(db);
      const actorName = `${userProfile.namaLengkap} (${effectiveJabatan.namaJabatan})`;
      const disposisiRef = doc(collection(db, 'disposisi'));
      const disposisiData: Partial<Disposisi> = { suratId: surat.id, dariJabatanId: effectiveJabatan.id!, dariJabatanNama: effectiveJabatan.namaJabatan, opdId: effectiveJabatan.opdId, kepadaJabatanId: [effectiveJabatan.id!], instruksi: "Menindaklanjuti sendiri (Self-Action).", tanggalDisposisi: serverTimestamp() as Timestamp, penerimaDiterima: [effectiveJabatan.id!], penerimaSelesai: [effectiveJabatan.id!], status: 'Terkirim', isInformational: false };
      batch.set(disposisiRef, disposisiData);
      const tindakLanjutRef = doc(collection(db, 'tindakLanjut'));
      batch.set(tindakLanjutRef, { suratId: surat.id!, disposisiId: disposisiRef.id, jabatanId: effectiveJabatan.id!, userId: userProfile.uid, isiLaporan: "Pimpinan telah menindaklanjuti secara mandiri.", tanggalLaporan: serverTimestamp() as Timestamp });
      const suratRef = doc(db, 'surat', surat.id);
      batch.update(suratRef, { statusPenyelesaian: 'Selesai' });
      await logActivity(surat.id, actorName, "Menindaklanjuti Sendiri (Selesai)", "Menutup surat secara mandiri.");
      await batch.commit();
      const logbookEntry = { id: `self_tl_${surat.id}_${Date.now()}`, deskripsi: `Menindaklanjuti dan menyelesaikan surat: "${surat.perihal}"`, selesai: true, tugasTerkaitId: surat.id, tugasTerkaitJudul: surat.perihal };
      await updateLogbook(userProfile.uid, userProfile.opdId, new Date(), logbookEntry);
      addToast("Aksi berhasil dicatat & surat selesai!", "success");
      refreshFeed(); 
    } catch (err: any) { addToast(err.message, "error"); } finally { setIsActionLoading(null); }
  };

  const handleQuickDisposisiClick = (surat: Surat, sourceDispo?: Disposisi) => { 
      setQuickDisposisiData(surat); 
      if (sourceDispo) setQuickDisposisiSource(sourceDispo);
  };
  
  const handleQuickDisposisiSuccess = () => { 
      setQuickDisposisiData(null); 
      setQuickDisposisiSource(null);
      refreshFeed(); 
  };
  
  const handleAgendaCardClick = (jadwal: JadwalTempat) => { setSelectedJadwal(jadwal); setIsDetailModalOpen(true); };
  
  const handleQuickNotulensi = (item: CombinedAgendaItem) => {
      let initialData: any = { judulRapat: item.title, tanggalRapat: (item.type === 'surat' ? (item.item as Surat).detailAgenda!.tanggal : (item.item as JadwalTempat).tanggalMulai).toDate().toISOString().split('T')[0], notulis: userProfile?.namaLengkap || '' };
      if (item.type === 'internal') { const jadwal = item.item as JadwalTempat; initialData.pemimpinRapat = jadwal.penanggungJawab; const pesertaNames = (jadwal.peserta || []).map(jabatanId => userMap.get(jabatanId)?.namaLengkap || jabatanId).join('\n'); initialData.peserta = pesertaNames; } 
      else { const surat = item.item as Surat; initialData.pemimpinRapat = surat.pengirim; initialData.peserta = item.penerimaDisposisi?.replace(/, /g, '\n') || ''; }
      setNotulensiInitialData(initialData); setIsNotulensiModalOpen(true);
  };

  const handleSaveQuickNotulensi = async (formData: any) => {
      if (!userProfile) return;
      setIsNotulensiSaving(true);
      try {
          const payload = { ...formData, tanggalRapat: Timestamp.fromDate(new Date(formData.tanggalRapat)), opdId: userProfile.opdId, createdBy: userProfile.uid, createdAt: Timestamp.now() };
          await addDoc(collection(db, 'notulensi'), payload);
          addToast("Notulensi berhasil dibuat!", "success");
          setIsNotulensiModalOpen(false);
      } catch (error) { console.error("Gagal menyimpan notulensi:", error); addToast("Gagal menyimpan notulensi.", "error"); } 
      finally { setIsNotulensiSaving(false); }
  };

  const combinedPersonalAgenda = useMemo((): CombinedAgendaItem[] => {
    if (isAgendaLoading || isMasterLoading || !userProfile || !effectiveJabatan) return []; 
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next7Days = new Date(today); next7Days.setDate(today.getDate() + 7);
    const agendas: CombinedAgendaItem[] = [];
    const enrichedAgendas = suratUndanganList.map((surat) => {
      const disposisiTerkait = allDispositionsForAgenda.filter((d) => d.suratId === surat.id).sort((a, b) => b.tanggalDisposisi.toMillis() - a.tanggalDisposisi.toMillis());
      const latestDisposisi = disposisiTerkait[0];
      const disposisiStatus = latestDisposisi ? 'Sudah Didisposisi' : 'Belum Didisposikan';
      const isForMe = latestDisposisi && effectiveJabatan?.id ? latestDisposisi.kepadaJabatanId.includes(effectiveJabatan.id as string) : false;
      const isSelfDispo = latestDisposisi && effectiveJabatan?.id ? (latestDisposisi.dariJabatanId === effectiveJabatan.id && isForMe) : false;
      let penerima = 'Belum Didisposikan';
      if (isSelfDispo) penerima = 'Ditindaklanjuti Sendiri'; 
      else if (latestDisposisi) penerima = latestDisposisi.kepadaJabatanId.map((id) => userMap.get(id)?.namaLengkap || '...').join(', ');
      return { ...surat, penerimaDisposisi: penerima, disposisiStatus, isSelfDispo, isForMe };
    });
    enrichedAgendas.filter((surat) => {
        const agendaDate = surat.detailAgenda?.tanggal?.toDate();
        if (!agendaDate || agendaDate < today || agendaDate > next7Days) return false;
        return isPimpinan ? (surat.disposisiStatus === 'Belum Didisposikan' || surat.isForMe || surat.isSelfDispo) : surat.isForMe;
    }).forEach((surat) => { agendas.push({ id: surat.id!, type: 'surat', item: surat, time: surat.detailAgenda!.jam, title: surat.perihal, location: surat.detailAgenda!.lokasi, penerimaDisposisi: surat.penerimaDisposisi, disposisiStatus: surat.disposisiStatus as any }); });
    jadwalInternalList.filter((jadwal) => { const jadwalDate = jadwal.tanggalMulai.toDate(); return jadwalDate >= today && jadwalDate <= next7Days; })
      .forEach((jadwal) => { agendas.push({ id: jadwal.id!, type: 'internal', item: jadwal, time: jadwal.jamMulai, title: jadwal.kegiatan, location: jadwal.jenis === 'Virtual' ? jadwal.tautanRapat || 'Rapat Virtual' : jadwal.namaTempat }); });
    return agendas.sort((a, b) => {
      const dateA = a.type === 'surat' ? (a.item as Surat).detailAgenda!.tanggal.toMillis() : (a.item as JadwalTempat).tanggalMulai.toMillis();
      const dateB = b.type === 'surat' ? (b.item as Surat).detailAgenda!.tanggal.toMillis() : (b.item as JadwalTempat).tanggalMulai.toMillis();
      if (dateA !== dateB) return dateA - dateB;
      return a.time.localeCompare(b.time);
    });
  }, [isAgendaLoading, isMasterLoading, suratUndanganList, allDispositionsForAgenda, jadwalInternalList, userMap, isPimpinan, userProfile, effectiveJabatan]);

  const itemCounts = useMemo(() => {
    const counts = { semua: feedItems.length, surat: 0, tugas: 0, draf: 0 };
    for (const item of feedItems) {
      if (item.type === 'surat_disposisi' || item.type === 'surat_baru') counts.surat++;
      else if (item.type === 'tugas') counts.tugas++;
      else if (item.type === 'draf') counts.draf++;
    }
    return counts;
  }, [feedItems]);

  const filteredFeedItems = useMemo(() => {
    if (activeFilter === 'semua') return feedItems;
    return feedItems.filter(item => {
      if (activeFilter === 'surat') return item.type === 'surat_disposisi' || item.type === 'surat_baru';
      if (activeFilter === 'tugas') return item.type === 'tugas';
      if (activeFilter === 'draf') return item.type === 'draf';
      return true;
    });
  }, [feedItems, activeFilter]);

  // [FIX GHOSTING BUG] Filter tambahan untuk membuang item yang ID-nya ada di hiddenItemIds (Secara Optimistik)
  const finalVisibleFeedItems = useMemo(() => {
      return filteredFeedItems.filter(item => {
          if (item.type === 'surat_disposisi' && hiddenItemIds.has(item.disposisi.id!)) return false;
          if (item.type === 'surat_baru' && hiddenItemIds.has(item.surat.id!)) return false;
          return true;
      });
  }, [filteredFeedItems, hiddenItemIds]);

  const isPageLoading = authLoading || isMasterLoading || (isFeedLoading && feedItems.length === 0);
  if (isPageLoading) return <RuangKerjaSkeleton />;

  return (
    <div className="flex flex-col h-full p-4 md:p-6 bg-secondary/40">
      <SmartGreeting userName={userProfile?.namaLengkap.split(' ')[0] || ''} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        <div className="lg:col-span-2 space-y-4">
          {user && userProfile && effectiveJabatan && (
            <QuickAddTask userProfile={userProfile} effectiveJabatan={effectiveJabatan} addToast={addToast} userUid={user.uid} />
          )}
          
          <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as RuangKerjaFilter)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="semua">Semua ({itemCounts.semua})</TabsTrigger>
              <TabsTrigger value="surat">{isPimpinan || isAdminOrTU ? 'Surat' : 'Disposisi'} ({itemCounts.surat})</TabsTrigger>
              <TabsTrigger value="tugas">Tugas ({itemCounts.tugas})</TabsTrigger>
              {(isPimpinan || isAdminOrTU) && <TabsTrigger value="draf">Draf ({itemCounts.draf})</TabsTrigger>}
            </TabsList>
          </Tabs>

          {/* Menggunakan finalVisibleFeedItems agar UI Instan merespon */}
          {finalVisibleFeedItems.length === 0 ? (
            <EmptyStateWidget filterType={activeFilter} userName={userProfile?.namaLengkap.split(' ')[0]} />
          ) : (
            <div className="flex flex-col space-y-4">
              <VisionaryFeed 
                  items={finalVisibleFeedItems}
                  loadingId={isActionLoading}
                  userCache={userMap}
                  opdJabatans={jabatanMap}
                  templatList={templatList}
                  onAcknowledge={onQuickAcknowledge}
                  onPreviewClick={handlePreviewClick}
                  onInlineFormToggle={handleDisposisiFormToggle}
                  openInlineTindakLanjutId={openDisposisiFormId} 
                  onInlineFormSuccess={handleInlineFormSuccess}
                  isPimpinan={isPimpinan}
                  onQuickDisposisiClick={handleQuickDisposisiClick} 
                  onInlineDisposisiToggle={handleInlineDisposisiToggle}
                  openInlineDisposisiId={openInlineDisposisiId}
                  onInlineDisposisiSuccess={handleInlineDisposisiSuccess}
                  onQuickTaskStatusChange={handleQuickTaskStatusChange}
                  onQuickTaskCommentToggle={handleQuickTaskCommentToggle}
                  openTaskCommentId={openTaskCommentId}
                  onQuickSelfTindakLanjut={handleQuickSelfTindakLanjut}
                  mutateTugas={refreshFeed} 
              />
              
              {hasMore && (
                <Button 
                  variant="outline" 
                  onClick={loadMore} 
                  disabled={isFeedLoading}
                  className="w-full border-dashed transition-all"
                >
                  {isFeedLoading ? (
                      <><Loader2 size={16} className="animate-spin mr-2" /> Memuat Data...</>
                  ) : 'Muat Lebih Banyak Catatan'}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6 flex flex-col">
          <QuickLinksWidget />
          <Card className="h-[400px] flex flex-col overflow-hidden border-border shadow-sm">
              <CardHeader className="p-4 py-3 bg-muted/30 border-b border-border flex-shrink-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <StickyNote size={16} className="text-yellow-500"/> Sticky Note
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-hidden relative">
                  <StickyNoteWidget />
              </CardContent>
          </Card>
          <Card className="shadow-sm border-border">
              <CardHeader className="p-4 py-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                     <CalendarDays size={16} className="text-blue-500"/> Agenda 7 Hari Kedepan
                  </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <AgendaTimeline items={combinedPersonalAgenda} onInternalClick={handleAgendaCardClick} onQuickNotulensi={handleQuickNotulensi} />
              </CardContent>
          </Card>
        </div>
      </div>
      
      {isQuickPreviewOpen && <QuickPreviewModal isOpen={isQuickPreviewOpen} onClose={handleClosePreview} fileUrl={previewFileUrl || ''} fileName={previewFileName || 'Pratinjau Dokumen'} />}
      {isDetailModalOpen && <JadwalDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} jadwal={selectedJadwal} isAdmin={isAdminOrTU} onApprove={() => {}} onReject={() => {}} onEdit={() => {}} onDelete={() => {}} />}
      
      {quickDisposisiData && <QuickDisposisiModal 
        isOpen={!!quickDisposisiData} 
        onClose={() => { setQuickDisposisiData(null); setQuickDisposisiSource(null); }} 
        surat={quickDisposisiData!} 
        sourceDisposisi={quickDisposisiSource}
        userCache={userMap} 
        opdJabatans={jabatanMap} 
        onSuccess={handleQuickDisposisiSuccess} 
        templatList={templatList} 
      />}
      
      <ConfirmModal 
          isOpen={!!confirmSelfTindakLanjut} 
          onClose={() => setConfirmSelfTindakLanjut(null)} 
          onConfirm={executeSelfTindakLanjut} 
          title="Konfirmasi Tindak Lanjut Mandiri" 
          message={`Anda yakin ingin menandai surat "${confirmSelfTindakLanjut?.perihal}" sebagai selesai ditindaklanjuti oleh Anda sendiri. Surat ini akan ditutup (Selesai). Lanjutkan?`} 
          confirmText="Ya, Selesaikan" 
          isProcessing={!!isActionLoading} 
      />

      {isNotulensiModalOpen && (
        <NotulensiFormModal
          isOpen={isNotulensiModalOpen}
          onClose={() => setIsNotulensiModalOpen(false)}
          onSave={handleSaveQuickNotulensi}
          notulensiToEdit={null} 
          opdConfig={opdConfig}
          isProcessing={isNotulensiSaving}
          theme={theme}
          initialData={notulensiInitialData}
        />
      )}
      
      {isTutorialOpen && <RuangKerjaTutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />}
    </div>
  );
}