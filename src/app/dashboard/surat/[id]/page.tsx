// Lokasi: src/app/dashboard/surat/[id]/page.tsx
// [UPDATE FIX] Menghidupkan fungsi `handleRefresh` agar memanggil refetch dari detail.

"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Surat, Disposisi, TindakLanjut, AgendaDetail, UserProfile } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

// --- HOOKS SSOT ---
import { useSuratActions } from '@/app/dashboard/hooks/useSuratActions'; 
import { useSuratDetail } from '@/app/dashboard/hooks/useSuratDetail';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';

import dynamic from 'next/dynamic';

// --- KOMPONEN PRIORITAS 1 (Static Import agar instan) ---
import CachedPdfViewer from '@/app/dashboard/surat/[id]/components/CachedPdfViewer';
import ConfirmModal from '@/app/dashboard/components/ConfirmModal';

// --- KOMPONEN PRIORITAS 2 & MODAL (Dynamic Import / Lazy Loading) ---
const FormDisposisi = dynamic(() => import('@/app/dashboard/surat/[id]/components/FormDisposisi'), { 
    ssr: false, 
    loading: () => <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Menyiapkan form disposisi...</div> 
});
const RiwayatDisposisi = dynamic(() => import('@/app/dashboard/surat/[id]/components/RiwayatDisposisi'), { 
    ssr: false, 
    loading: () => <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Memuat riwayat disposisi...</div> 
});
const TindakLanjutSection = dynamic(() => import('@/app/dashboard/surat/[id]/components/TindakLanjutSection'), { 
    ssr: false, 
    loading: () => <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Memuat form tindak lanjut...</div> 
});
const ActivityLogSection = dynamic(() => import('@/app/dashboard/surat/[id]/components/ActivityLogSection'), { ssr: false });
const PenerimaanDisposisiModal = dynamic(() => import('@/app/dashboard/surat/[id]/components/PenerimaanDisposisiModal'), { ssr: false });
const FormTugas = dynamic(() => import('@/app/dashboard/tugas/components/FormTugas'), { ssr: false });
const ManualArchiveModal = dynamic(() => import('@/app/dashboard/surat/[id]/components/ManualArchiveModal'), { ssr: false });

// Khusus DispositionTracker menggunakan ".then" karena bukan default export
const DispositionTracker = dynamic(() => import('@/app/dashboard/surat/[id]/components/DispositionTracker').then(mod => mod.DispositionTracker), { 
    ssr: false, 
    loading: () => <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Memuat jejak disposisi...</div> 
});

import {
  ArrowLeft, FileText, Info, User, Calendar, Clock, MapPin, Edit, Trash2, Archive, Send, AlertTriangle,
  ChevronDown, ChevronUp, Copy, Check, Loader2, ListChecks, X
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Timestamp } from 'firebase/firestore';

// --- KOMPONEN BARU: Skeleton Loading untuk Progressive Rendering ---
const MasterDataSkeleton = ({ label }: { label: string }) => (
    <div className="bg-card rounded-xl shadow-sm border border-border p-8 flex flex-col items-center justify-center animate-pulse h-full min-h-[150px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{label}</p>
    </div>
);

// [Komponen SuratDetailCard]
const SuratDetailCard = ({ surat }: { surat: Surat }) => {
  if (!surat) return null;
  const [isCopied, setIsCopied] = useState(false);
  const { addToast } = useToast();
  
  const handleCopy = (text: string) => {
    try {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        addToast('Nomor surat disalin!', 'success');
        setTimeout(() => setIsCopied(false), 2000); 
    } catch (err) {
        console.error('Gagal menyalin teks: ', err);
        addToast('Gagal menyalin teks', 'error');
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border mb-4 md:mb-6 overflow-hidden">
      <div className="p-3.5 md:p-4 bg-muted/30 border-b border-border flex items-center justify-between">
        <h3 className="text-sm md:text-base font-bold flex items-center text-foreground">
          <Info size={16} className="mr-2 text-blue-500" />
          Detail Surat
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Nomor Surat */}
        <div className="flex gap-3 items-start">
          <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nomor Surat</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">{surat.nomorSurat}</p>
              <button type="button" onClick={() => handleCopy(surat.nomorSurat)} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Pengirim */}
        <div className="flex gap-3 items-start">
          <User size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pengirim</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{surat.pengirim}</p>
          </div>
        </div>

        {/* Tanggal Surat */}
        <div className="flex gap-3 items-start">
          <Calendar size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tanggal Surat</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{surat.tanggalSurat.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {surat.jenisSurat === 'Undangan' && surat.detailAgenda && (
          <>
            <div className="pt-4 mt-2 border-t border-border/60">
               <p className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-3">Agenda Undangan</p>
               <div className="space-y-4">
                  {/* Pelaksanaan */}
                  <div className="flex gap-3 items-start">
                    <Calendar size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pelaksanaan</p>
                      <p className="text-sm font-semibold text-foreground leading-tight">{surat.detailAgenda.tanggal.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  
                  {/* Waktu */}
                  <div className="flex gap-3 items-start">
                    <Clock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Waktu</p>
                      <p className="text-sm font-semibold text-foreground leading-tight">{surat.detailAgenda.jam} WIB {surat.detailAgenda.jamSelesai ? `- ${surat.detailAgenda.jamSelesai} WIB` : ''}</p>
                    </div>
                  </div>

                  {/* Tempat */}
                  <div className="flex gap-3 items-start">
                    <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tempat</p>
                      <p className="text-sm font-semibold text-foreground leading-tight">{surat.detailAgenda.lokasi}</p>
                    </div>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// [Komponen EditSuratModal]
const EditSuratModal = ({ 
    isOpen, onClose, onSave, suratData, agendaData, setSuratData, setAgendaData, isLoading,
    newFile, setNewFile 
}: { 
    isOpen: boolean, onClose: () => void, onSave: () => void, 
    suratData: Partial<Surat>, agendaData: Partial<AgendaDetail>, 
    setSuratData: (d: Partial<Surat>) => void, 
    setAgendaData: (d: Partial<AgendaDetail>) => void, 
    isLoading: boolean,
    newFile: File | null,
    setNewFile: (file: File | null) => void
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSuratChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'tanggalSurat') {
            const dateObj = new Date(value);
            setSuratData({ ...suratData, [name]: Timestamp.fromDate(dateObj) });
        } else {
            setSuratData({ ...suratData, [name]: value });
        }
    };

    const handleAgendaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'tanggal') {
             const dateObj = new Date(value);
             setAgendaData({ ...agendaData, [name]: Timestamp.fromDate(dateObj) });
        } else {
             setAgendaData({ ...agendaData, [name]: value });
        }
    };

    const handleSelectChange = (name: string, value: string) => setSuratData({ ...suratData, [name]: value });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setNewFile(e.target.files[0]);
    };
    const clearFile = () => {
        setNewFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(); };
    const getDateValue = (date: Timestamp | string | undefined | null): string => {
        if (!date) return '';
        if (date instanceof Timestamp) return date.toDate().toISOString().split('T')[0];
        return date;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border p-0 gap-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Edit Detail Surat</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <ScrollArea className="max-h-[70vh] px-6">
                         <div className="space-y-4">
                            <div><Label htmlFor="nomorSurat">Nomor Surat</Label><Input id="nomorSurat" type="text" name="nomorSurat" value={suratData.nomorSurat || ''} onChange={handleSuratChange} required autoFocus /></div>
                            <div><Label htmlFor="perihal">Perihal</Label><Input id="perihal" type="text" name="perihal" value={suratData.perihal || ''} onChange={handleSuratChange} required /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><Label htmlFor="pengirim">Pengirim</Label><Input id="pengirim" type="text" name="pengirim" value={suratData.pengirim || ''} onChange={handleSuratChange} required /></div>
                                <div><Label htmlFor="tanggalSurat">Tanggal Surat</Label><Input id="tanggalSurat" type="date" name="tanggalSurat" value={getDateValue(suratData.tanggalSurat)} onChange={handleSuratChange} required /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                    <Label htmlFor="jenisSurat">Jenis Surat</Label>
                                    <Select name="jenisSurat" value={suratData.jenisSurat || 'Lainnya'} onValueChange={(v) => handleSelectChange('jenisSurat', v)}>
                                        <SelectTrigger id="jenisSurat"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Undangan">Undangan</SelectItem>
                                            <SelectItem value="Pemberitahuan">Pemberitahuan</SelectItem>
                                            <SelectItem value="Permohonan">Permohonan</SelectItem>
                                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                               </div>
                               <div>
                                    <Label htmlFor="klasifikasi">Klasifikasi</Label>
                                    <Select name="klasifikasi" value={suratData.klasifikasi || 'Biasa'} onValueChange={(v) => handleSelectChange('klasifikasi', v)}>
                                        <SelectTrigger id="klasifikasi"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Biasa">Biasa</SelectItem>
                                            <SelectItem value="Penting">Penting</SelectItem>
                                            <SelectItem value="Segera">Segera</SelectItem>
                                            <SelectItem value="Rahasia">Rahasia</SelectItem>
                                        </SelectContent>
                                    </Select>
                               </div>
                            </div>
                            <div>
                                <Label htmlFor="fileRevisi">Upload File Revisi (Opsional)</Label>
                                <Input id="fileRevisi" type="file" ref={fileInputRef} accept=".pdf" onChange={handleFileChange} className="mt-1" />
                                {newFile && (
                                    <div className="mt-2 text-sm text-green-700 dark:text-green-300 flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/50 rounded-md">
                                        <span className="truncate">File baru: {newFile.name}</span>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={clearFile}>
                                            <X size={16} />
                                        </Button>
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">Jika diisi, file surat asli akan diganti dengan file baru ini.</p>
                            </div>
                            {suratData.jenisSurat === 'Undangan' && (
                                <div className="p-4 border rounded-lg space-y-3 bg-muted border-border">
                                    <h4 className="font-semibold">Detail Agenda Undangan</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><Label htmlFor="agenda-tanggal">Tanggal Agenda</Label><Input id="agenda-tanggal" type="date" name="tanggal" value={getDateValue(agendaData.tanggal)} onChange={handleAgendaChange} /></div>
                                    <div><Label htmlFor="agenda-jam">Jam Mulai</Label><Input id="agenda-jam" type="time" name="jam" value={agendaData.jam || ''} onChange={handleAgendaChange} /></div>
                                    <div><Label htmlFor="agenda-jam-selesai">Jam Selesai (Opsional)</Label><Input id="agenda-jam-selesai" type="time" name="jamSelesai" value={(agendaData as any).jamSelesai || ''} onChange={handleAgendaChange} /></div>
                                    </div>
                                    <div><Label htmlFor="agenda-lokasi">Lokasi</Label><Input id="agenda-lokasi" type="text" name="lokasi" value={agendaData.lokasi || ''} onChange={handleAgendaChange} /></div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="mt-6 p-4 bg-muted border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 size={16} className="animate-spin mr-2" />}{isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default function DetailSuratPage() {
  const params = useParams();
  const router = useRouter(); 
  const suratId = params.id as string;

  const { user, userProfile, jabatanProfile, actingJabatanProfile, loading: authLoading } = useUserAuth();
  
  // [FIX] Mengambil fungsi refetch dari useSuratDetail
  const { surat, disposisiList, tindakLanjutList, isLoading: isSuratLoading, error: suratError, refetch: refetchDetail } = useSuratDetail(suratId);
  
  // TAHAP 1: Paralelisasi Pengambilan Data Master
  const targetOpdId = userProfile?.opdId;
  const shouldFetchMaster = !!targetOpdId;

  const { userMap: rawUserMap, jabatanMap: rawJabatanMap, isLoading: isMasterLoading } = useMasterData(shouldFetchMaster, targetOpdId);

  const userMap = useMemo(() => rawUserMap || new Map(), [rawUserMap]);
  const jabatanMap = useMemo(() => rawJabatanMap || new Map(), [rawJabatanMap]);

  const { 
    terimaDisposisi, 
    updateSurat, 
    deleteSurat, 
    distribusikanArsip,
    isProcessing: isActionProcessing 
  } = useSuratActions();

  // --- State UI ---
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editedSurat, setEditedSurat] = useState<Partial<Surat>>({});
  const [editedAgenda, setEditedAgenda] = useState<Partial<AgendaDetail>>({});
  const [fileForUpdate, setFileForUpdate] = useState<File | null>(null);

  const [showPenerimaanModal, setShowPenerimaanModal] = useState(false);
  const [unconfirmedDisposisi, setUnconfirmedDisposisi] = useState<Disposisi | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [isFormTugasOpen, setIsFormTugasOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dokumen' | 'tindakLanjut'>('dokumen');
  const [isDisposisiModalOpen, setIsDisposisiModalOpen] = useState(false);
  const [isManualArchiveModalOpen, setIsManualArchiveModalOpen] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [isMobileDisposisiFormMinimized, setIsMobileDisposisiFormMinimized] = useState(true); 
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);

  const effectiveJabatan = useMemo(() => actingJabatanProfile || jabatanProfile, [actingJabatanProfile, jabatanProfile]);

  // --- Helpers ---
  const jabatanNamaCache = useMemo(() => {
      const map = new Map<string, string>();
      jabatanMap.forEach((j, id) => map.set(id, j.namaJabatan));
      return map;
  }, [jabatanMap]);
  
  const allOpdJabatansArray = useMemo(() => Array.from(jabatanMap.values()), [jabatanMap]);

  // --- Effects ---
  useEffect(() => {
      if (surat) {
          setEditedSurat({
              nomorSurat: surat.nomorSurat,
              perihal: surat.perihal,
              pengirim: surat.pengirim,
              tanggalSurat: surat.tanggalSurat, 
              jenisSurat: surat.jenisSurat,
              klasifikasi: surat.klasifikasi,
          });
          if (surat.detailAgenda) {
              setEditedAgenda({
                  tanggal: surat.detailAgenda.tanggal,
                  jam: surat.detailAgenda.jam,
                  lokasi: surat.detailAgenda.lokasi,
                  jamSelesai: (surat.detailAgenda as any).jamSelesai,
              });
          } else {
              setEditedAgenda({});
          }
      }
  }, [surat]);

  useEffect(() => {
      const isStafTuOrAdminOpd = userProfile?.role === 'staf_tu' || userProfile?.role === 'admin_opd';

      if (effectiveJabatan && !isStafTuOrAdminOpd && disposisiList.length > 0) {
          const myUnconfirmed = disposisiList.find(d =>
              effectiveJabatan.id && d.kepadaJabatanId.includes(effectiveJabatan.id) &&
              (!d.penerimaDiterima || !d.penerimaDiterima.includes(effectiveJabatan.id))
          );
          
          if (myUnconfirmed && myUnconfirmed.status !== 'Dikembalikan') {
              setUnconfirmedDisposisi(myUnconfirmed);
              setShowPenerimaanModal(true);
          } else {
              setUnconfirmedDisposisi(null);
              setShowPenerimaanModal(false);
          }
      } else {
            setUnconfirmedDisposisi(null);
            setShowPenerimaanModal(false);
      }
  }, [disposisiList, effectiveJabatan, userProfile]);

  // --- Handlers ---
  // [FIX] Menghidupkan fungsi refresh agar otomatis update saat laporan dikirim
  const handleRefresh = () => {
      refetchDetail();
  };

  const handleDisposisiSuccess = () => {
    setIsRevising(false);
    setIsDisposisiModalOpen(false); 
    if (window.innerWidth < 768) { 
        setActiveTab('tindakLanjut'); 
    }
    setIsMobileDisposisiFormMinimized(true);
    handleRefresh(); // Tambahkan refresh juga ke disposisi success
  };

  const handleConfirmAction = async () => {
      if (!unconfirmedDisposisi || !surat) return; 
      
      const success = await terimaDisposisi(unconfirmedDisposisi, surat);

      if (success) {
          if (!unconfirmedDisposisi.isInformational && userProfile?.googleCalendarSyncEnabled && userProfile?.googleRefreshToken && surat.jenisSurat === 'Undangan' && surat.detailAgenda) {
                try {
                    fetch('/api/google/sync-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nip: userProfile.nip, suratId: surat.id, perihal: surat.perihal, lokasi: surat.detailAgenda.lokasi,
                            tanggal: surat.detailAgenda.tanggal.toDate().toLocaleDateString('en-CA'),
                            jam: surat.detailAgenda.jam, jamSelesai: surat.detailAgenda.jamSelesai || null, 
                        }),
                    });
                } catch (err) { console.error("Background sync failed", err); }
          }
          setShowPenerimaanModal(false); 
          setUnconfirmedDisposisi(null);
          handleRefresh(); // Segarkan setelah terima
      }
  };

  const handleUpdateSurat = async () => {
     if (!surat) return;
      try {
          const updateData: Partial<Surat> = {
              nomorSurat: editedSurat.nomorSurat,
              perihal: editedSurat.perihal,
              pengirim: editedSurat.pengirim,
              jenisSurat: editedSurat.jenisSurat,
              klasifikasi: editedSurat.klasifikasi,
          };
          if (editedSurat.tanggalSurat && typeof editedSurat.tanggalSurat === 'string') updateData.tanggalSurat = Timestamp.fromDate(new Date(editedSurat.tanggalSurat));
          else if (editedSurat.tanggalSurat instanceof Timestamp) updateData.tanggalSurat = editedSurat.tanggalSurat; 

          if (editedSurat.jenisSurat === 'Undangan') {
              const agendaUpdate: Partial<AgendaDetail> = { jam: editedAgenda.jam, lokasi: editedAgenda.lokasi, jamSelesai: (editedAgenda as any).jamSelesai || null };
              if (editedAgenda.tanggal && typeof editedAgenda.tanggal === 'string') agendaUpdate.tanggal = Timestamp.fromDate(new Date(editedAgenda.tanggal));
              else if (editedAgenda.tanggal instanceof Timestamp) agendaUpdate.tanggal = editedAgenda.tanggal; 
              updateData.detailAgenda = agendaUpdate as AgendaDetail;
          } else { updateData.detailAgenda = null; }

          const success = await updateSurat(surat, updateData, fileForUpdate || undefined);
          
          if(success) {
             setIsEditing(false);
             setFileForUpdate(null);
             handleRefresh(); // Refresh setelah surat update
          }
      } catch (error) {
          console.error("Gagal update:", error);
      }
  };

  const handleDeleteSurat = async () => {
    if (!surat || !surat.id) return;
    setConfirmDeleteModalOpen(true); 
  };
  const confirmDeleteSurat = async () => {
    if (!surat) return;
    setConfirmDeleteModalOpen(false); 
    
    const success = await deleteSurat(surat);
    if (success) {
       router.push('/dashboard/surat');
    }
  };

  const handleArchiveConfirm = async (selectedJabatanIds: string[]) => {
       if (!surat || !userMap) return;
       
       const targetUsers: UserProfile[] = [];
       selectedJabatanIds.forEach(jabatanId => {
           const u = userMap.get(jabatanId);
           if(u) targetUsers.push(u);
       });
       
       const success = await distribusikanArsip(surat, targetUsers);
       if(success) {
           setIsManualArchiveModalOpen(false);
           handleRefresh();
       }
  };

  const openArchiveConfirmation = (selectedJabatanIds: string[]) => {
      setConfirmModalState({
          isOpen: true, title: "Konfirmasi Arsip Manual",
          message: `Anda akan mengarsipkan surat "${surat?.perihal}" ke ${selectedJabatanIds.length} penerima. Lanjutkan?`,
          onConfirm: () => handleArchiveConfirm(selectedJabatanIds),
      });
  };

  const isLoading = isSuratLoading || authLoading;

  // [LOGIKA BARU]: Proteksi Akses Penuh
  const isAuthorized = useMemo(() => {
      if (!surat || !userProfile) return false;
      if (userProfile.role === 'super_admin') return true;
      
      const isStafTuOrAdminOpd = userProfile.role === 'staf_tu' || userProfile.role === 'admin_opd';
      const isPimpinanOpd = effectiveJabatan && effectiveJabatan.level <= 5;

      // BLOKIR AKSES: Jika surat berstatus 'Baru', hanya TU/Admin atau Pimpinan Tujuan yang boleh membuka
      if (isPimpinanOpd && !isStafTuOrAdminOpd && surat.statusPenyelesaian === 'Baru') {
          if (surat.tujuanJabatanId) {
              // Jika ditujukan khusus, cek kecocokan ID
              if (surat.tujuanJabatanId !== effectiveJabatan.id) return false;
          } else {
              // Jika default, cek apakah user yang login ini adalah Pimpinan Tertinggi
              const jabatansInOpd = Array.from(jabatanMap.values()).filter(j => j.opdId === userProfile.opdId && j.status === 'aktif');
              jabatansInOpd.sort((a, b) => a.level - b.level);
              const topLeaderId = jabatansInOpd.length > 0 ? jabatansInOpd[0].id : null;

              if (topLeaderId && effectiveJabatan.id !== topLeaderId) return false;
          }
      }
      
      const isRecipientInDisposisi = effectiveJabatan 
        ? disposisiList.some(d => d.kepadaJabatanId.includes(effectiveJabatan.id!) || d.dariJabatanId === effectiveJabatan.id) 
        : false;
      
      const isOpdWidenUndangan = surat.opdId === userProfile.opdId && surat.jenisSurat === 'Undangan';

      if (isRecipientInDisposisi) return true;

      const isOpdAuthorized = surat.opdId === userProfile.opdId && (isPimpinanOpd || isStafTuOrAdminOpd || isOpdWidenUndangan);
      return isOpdAuthorized;
  }, [surat, userProfile, effectiveJabatan, disposisiList, jabatanMap]);

  const getKlasifikasiStyle = (klasifikasi: string | undefined) => {
    switch (klasifikasi) {
      case 'Rahasia': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'Penting': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'Segera': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };
  const getStatusStyle = (status: string | undefined) => {
    switch (status) {
        case 'Baru': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'Revisi Disposisi': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'Selesai': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Diarsipkan': return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
        default: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
    }
  };

  const latestDisposisi = useMemo(() => disposisiList.length > 0 ? disposisiList[0] : null, [disposisiList]);
  const isPimpinanPenerimaAwal = useMemo(() => !!(effectiveJabatan && effectiveJabatan.level <= 5 && !latestDisposisi), [effectiveJabatan, latestDisposisi]);
  const needsRevision = useMemo(() => surat?.statusPenyelesaian === 'Revisi Disposisi' && latestDisposisi?.dariJabatanId === effectiveJabatan?.id, [surat, latestDisposisi, effectiveJabatan]);

  const canPerformAction = useMemo(() => {
    if (!surat || !effectiveJabatan || !userProfile) return { disposisi: false, tindakLanjut: false, createTask: false };
    const isSuratActive = surat.statusPenyelesaian !== 'Selesai' && surat.statusPenyelesaian !== 'Diarsipkan';
    
    // Cari disposisi terakhir yang menargetkan user ini
    const myLatestDisposisi = disposisiList.find(d => d.kepadaJabatanId.includes(effectiveJabatan.id!));
    const isRecipient = !!myLatestDisposisi;
    
    // Cek apakah user sudah menekan tombol "Terima Disposisi"
    const hasConfirmed = myLatestDisposisi ? (myLatestDisposisi.penerimaDiterima || []).includes(effectiveJabatan.id!) : false;
    
    const userHasForwarded = disposisiList.some(d => d.dariJabatanId === effectiveJabatan.id);
    
    // Syarat bisa disposisi: Surat aktif AND (Penerima awal OR (Penerima disposisi yang SUDAH KONFIRMASI)) AND belum meneruskan
    const canDoNormalDisposisi = isSuratActive && (isPimpinanPenerimaAwal || (isRecipient && hasConfirmed)) && !userHasForwarded;
    const isTuOrAdmin = userProfile?.role === 'staf_tu' || userProfile?.role === 'admin_opd';
    
    return { 
        disposisi: (canDoNormalDisposisi || needsRevision) && !isTuOrAdmin, 
        tindakLanjut: isSuratActive && isRecipient && !userHasForwarded, 
        createTask: isSuratActive && isRecipient && hasConfirmed && !userHasForwarded 
    };
  }, [surat, latestDisposisi, disposisiList, effectiveJabatan, needsRevision, userProfile, isPimpinanPenerimaAwal]);

  const canManuallyArchive = useMemo(() => (userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu') && surat?.statusPenyelesaian !== 'Diarsipkan', [userProfile, surat]);
  const canEditOrDeleteSurat = userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu';
  
  if (isLoading) return <div className="text-center p-8 text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" />Memuat data surat...</div>;
  if (suratError) return <div className="p-6 text-center text-red-700 bg-red-100 rounded-lg">{suratError}</div>;
  if (!surat || !isAuthorized) return (
      <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center p-8 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900 max-w-md">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Akses Ditolak</h2>
              <p className="text-red-600 dark:text-red-400 mt-2">Surat ini belum didisposisikan kepada Anda, atau Anda tidak memiliki izin untuk melihatnya.</p>
              <Button variant="outline" className="mt-6" onClick={() => router.back()}>Kembali</Button>
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in pb-20 md:pb-0"> {/* Ditambah pb-20 untuk mobile tab ruang */}
      <div className="flex-shrink-0">
        <button onClick={() => router.back()} className="inline-flex items-center text-primary hover:underline text-sm mb-3 md:mb-4">
          <ArrowLeft size={16} className="mr-2" /> Kembali 
          <span className="hidden md:inline">&nbsp;ke Halaman Sebelumnya</span>
        </button>
        <div className="flex items-start justify-between mt-1 md:mt-4 gap-2">
            <div className="flex-1">
                {/* Penyesuaian Ukuran Judul Mobile */}
                <h1 className="text-lg md:text-3xl font-bold text-foreground leading-snug">{surat.perihal}</h1>
                <div className="flex items-center flex-wrap gap-1.5 md:gap-2 mt-2">
                    {/* Penyesuaian Ukuran Badge Mobile */}
                    <span className={`px-2.5 py-0.5 md:px-3 md:py-1 text-[10px] md:text-sm font-semibold rounded-full ${getKlasifikasiStyle(surat.klasifikasi)}`}>{surat.klasifikasi}</span>
                    <span className={`px-2.5 py-0.5 md:px-3 md:py-1 text-[10px] md:text-sm font-semibold rounded-full ${getStatusStyle(surat.statusPenyelesaian)}`}>{surat.statusPenyelesaian}</span>
                </div>
            </div>
            <div className='flex items-center gap-2 flex-shrink-0'>
                {canEditOrDeleteSurat && !isEditing && (
                    <>
                        <Button onClick={() => setIsEditing(true)} title="Edit Detail Surat" className="hidden md:flex" variant="outline" size="sm"><Edit size={16} className="mr-2"/> Edit</Button>
                        <Button onClick={handleDeleteSurat} disabled={isActionProcessing} title="Hapus Surat" className="hidden md:flex" variant="destructive" size="sm"><Trash2 size={16} className="mr-2"/> Hapus</Button>
                        {/* Mobile Icons */}
                        <Button onClick={() => setIsEditing(true)} title="Edit Detail Surat" className="md:hidden h-8 w-8" variant="ghost" size="icon"><Edit size={16}/></Button>
                        <Button onClick={handleDeleteSurat} disabled={isActionProcessing} title="Hapus Surat" className="md:hidden h-8 w-8" variant="ghost" size="icon"><Trash2 size={16} className="text-red-500"/></Button>
                    </>
                )}
                {canManuallyArchive && (
                    <Button onClick={() => setIsManualArchiveModalOpen(true)} className="bg-teal-600 dark:bg-teal-700 hover:bg-teal-700 dark:hover:bg-teal-600 h-8 md:h-9 text-xs md:text-sm px-2.5 md:px-3" size="sm" title="Arsipkan Surat Secara Manual"><Archive size={14} className="mr-1.5 md:mr-2"/> Arsip</Button>
                )}
            </div>
        </div>
      </div>

      {/* --- TAMPILAN MOBILE --- */}
      <div className="md:hidden flex-1 mt-4 flex flex-col pb-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex flex-col flex-1 min-h-0">
          <TabsContent value="dokumen" className="mt-0 flex-1 overflow-y-auto">
              <div className="space-y-3 md:space-y-6"> {/* Spacing diringkas */}
                  <SuratDetailCard surat={surat} />
                  
                  {isMasterLoading ? (
                      <MasterDataSkeleton label="Memuat Jejak Disposisi..." />
                  ) : (
                      <DispositionTracker 
                          disposisiList={disposisiList} 
                          userCache={userMap} 
                          jabatanCache={jabatanNamaCache} 
                      />
                  )}

                  {(canPerformAction.disposisi || isRevising) && (
                      <div className="bg-card rounded-xl shadow-sm border border-border">
                          {isMasterLoading ? (
                              <MasterDataSkeleton label="Menyiapkan Form Disposisi..." />
                          ) : (
                              <>
                                  <button onClick={() => setIsMobileDisposisiFormMinimized(!isMobileDisposisiFormMinimized)} className="flex items-center justify-between w-full p-3 md:p-4 border-b border-border">
                                      <h3 className="text-base font-semibold flex items-center text-foreground"><Send size={16} className="mr-2.5 text-blue-600" />{isRevising ? 'Revisi Disposisi' : 'Aksi Disposisi'}</h3>
                                      {isMobileDisposisiFormMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                  </button>
                                  {!isMobileDisposisiFormMinimized && (
                                      <FormDisposisi
                                          surat={surat}
                                          onDisposisiSuccess={handleDisposisiSuccess}
                                          opdJabatans={jabatanMap} 
                                          userCache={userMap}       
                                          isRevising={isRevising}
                                          latestDisposisi={latestDisposisi}
                                          isPimpinanPenerimaAwal={isPimpinanPenerimaAwal}
                                      />
                                  )}
                              </>
                          )}
                      </div>
                  )}
                  {/* Tinggi PDF dikurangi agar lebih proporsional di layar HP */}
                  <div className="h-[60vh] md:h-[70vh] bg-card rounded-xl shadow-sm border border-border"><CachedPdfViewer fileUrl={surat.fileUrl} fileName={surat.fileName} /></div>
              </div>
          </TabsContent>

          <TabsContent value="tindakLanjut" className="mt-0 flex-1 overflow-y-auto">
              <div className="space-y-3 md:space-y-6">
                {needsRevision && !isRevising && (
                    <div className="p-3 md:p-4 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 rounded-r-lg">
                        <div className="flex items-start"><AlertTriangle size={18} className="mr-2.5 flex-shrink-0" /><div><h3 className="text-sm md:text-base font-bold">Disposisi Dikembalikan</h3><p className="text-xs md:text-sm mt-1">Disposisi terakhir Anda dikembalikan. Silakan periksa riwayat dan kirimkan revisi.</p><Button onClick={() => setIsRevising(true)} className="mt-2.5 h-8 text-xs" variant="secondary" size="sm">Revisi Disposisi</Button></div></div>
                    </div>
                )}
                 {(canPerformAction.disposisi || isRevising) && !isDisposisiModalOpen && !isMasterLoading && (
                     <div className="text-center"><Button size="sm" className="w-full text-xs h-9" onClick={() => setIsDisposisiModalOpen(true)}><Send size={14} className="mr-2" /> {isRevising ? 'Revisi Disposisi' : 'Buat Disposisi'}</Button></div>
                 )}
                
                <div id="form-tindak-lanjut-mobile">
                    {isMasterLoading ? (
                        <MasterDataSkeleton label="Memuat Form Tindak Lanjut..." />
                    ) : (
                        <TindakLanjutSection surat={surat} disposisiList={disposisiList} tindakLanjutList={tindakLanjutList} onUpdate={handleRefresh} isReadOnly={false} canTakeAction={canPerformAction.tindakLanjut} userCache={userMap} />
                    )}
                </div>
                
                {isMasterLoading ? (
                    <MasterDataSkeleton label="Memuat Riwayat Disposisi..." />
                ) : (
                    <RiwayatDisposisi 
                        disposisiList={disposisiList} 
                        suratId={surat.id} 
                        userProfile={userProfile} 
                        onUpdate={handleRefresh} 
                        jabatanCache={jabatanNamaCache} 
                        userCache={userMap}
                    />
                )}
                
                <div className="text-center pt-2 pb-6"><Button variant="link" onClick={() => setIsLogModalOpen(true)} className="text-xs text-muted-foreground h-auto p-0">Lihat Log Aktivitas</Button></div>
              </div>
          </TabsContent>
          
          <TabsList className="grid w-full grid-cols-2 h-[60px] p-1 rounded-none fixed bottom-[64px] left-0 right-0 z-30 border-t bg-card/95 backdrop-blur-sm shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <TabsTrigger value="dokumen" className="h-full rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground flex flex-col gap-0.5"><FileText size={18}/><span className="text-[10px]">Dokumen</span></TabsTrigger>
              <TabsTrigger value="tindakLanjut" className="h-full rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground flex flex-col gap-0.5"><ListChecks size={18}/><span className="text-[10px]">Tindak Lanjut</span></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* --- TAMPILAN DESKTOP --- */}
      <div className="hidden md:grid grid-cols-1 gap-8 mt-8 md:grid-cols-3 flex-1">
        <div className="md:col-span-2 bg-card rounded-xl shadow-sm border border-border flex flex-col">
            <div className="p-2 flex-grow min-h-[90vh]"><CachedPdfViewer fileUrl={surat.fileUrl} fileName={surat.fileName} /></div>
        </div>
        <div className="md:col-span-1 space-y-8">
            <SuratDetailCard surat={surat} />
            
            {isMasterLoading ? (
                <MasterDataSkeleton label="Memuat Jejak Disposisi..." />
            ) : (
                <DispositionTracker 
                    disposisiList={disposisiList} 
                    userCache={userMap} 
                    jabatanCache={jabatanNamaCache} 
                />
            )}

            {needsRevision && !isRevising && (
                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 rounded-r-lg">
                    <div className="flex items-start"><AlertTriangle size={20} className="mr-3 flex-shrink-0" /><div><h3 className="font-bold">Disposisi Dikembalikan</h3><p className="text-sm mt-1">Disposisi terakhir Anda dikembalikan. Silakan periksa riwayat dan kirimkan revisi.</p><Button onClick={() => setIsRevising(true)} className="mt-3" variant="secondary" size="sm">Revisi Disposisi</Button></div></div>
                </div>
            )}

            {(canPerformAction.disposisi || isRevising) && (
                isMasterLoading ? (
                    <MasterDataSkeleton label="Menyiapkan Form Disposisi..." />
                ) : (
                    <FormDisposisi 
                        surat={surat} 
                        onDisposisiSuccess={handleDisposisiSuccess} 
                        opdJabatans={jabatanMap} 
                        userCache={userMap} 
                        isRevising={isRevising} 
                        latestDisposisi={latestDisposisi}
                        isPimpinanPenerimaAwal={isPimpinanPenerimaAwal}
                    />
                )
            )}
            
            {isMasterLoading ? (
                <MasterDataSkeleton label="Memuat Riwayat Disposisi..." />
            ) : (
                <RiwayatDisposisi 
                    disposisiList={disposisiList} 
                    suratId={surat.id} 
                    userProfile={userProfile} 
                    onUpdate={handleRefresh} 
                    jabatanCache={jabatanNamaCache} 
                    userCache={userMap}
                />
            )}

            <div id="form-tindak-lanjut-desktop">
                {isMasterLoading ? (
                    <MasterDataSkeleton label="Memuat Form Tindak Lanjut..." />
                ) : (
                    <TindakLanjutSection surat={surat} disposisiList={disposisiList} tindakLanjutList={tindakLanjutList} onUpdate={handleRefresh} isReadOnly={false} canTakeAction={canPerformAction.tindakLanjut} userCache={userMap} />
                )}
            </div>
             <div className="text-center"><Button variant="link" onClick={() => setIsLogModalOpen(true)} className="text-sm text-muted-foreground">Lihat Log Aktivitas</Button></div>
        </div>
      </div>

      <EditSuratModal 
        isOpen={isEditing} 
        onClose={() => { setIsEditing(false); setFileForUpdate(null); }} 
        onSave={handleUpdateSurat} 
        suratData={editedSurat} 
        agendaData={editedAgenda} 
        setSuratData={setEditedSurat} 
        setAgendaData={setEditedAgenda} 
        isLoading={isActionProcessing} 
        newFile={fileForUpdate}
        setNewFile={setFileForUpdate}
      />
      {unconfirmedDisposisi && (
          <PenerimaanDisposisiModal 
              isOpen={showPenerimaanModal} 
              onClose={() => setShowPenerimaanModal(false)} 
              disposisi={unconfirmedDisposisi} 
              surat={surat} 
              jabatanPengirim={jabatanNamaCache.get(unconfirmedDisposisi.dariJabatanId) || '...'} 
              onConfirm={handleConfirmAction} 
              isLoading={isActionProcessing} 
          />
      )}
      <FormTugas isOpen={isFormTugasOpen} onClose={() => setIsFormTugasOpen(false)} onSuccess={() => {}} suratTerkait={{ id: surat.id, perihal: surat.perihal, klasifikasi: surat.klasifikasi }} userCache={userMap} />
      <ActivityLogSection suratId={suratId} isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      
      {/* Modal Disposisi Mobile */}
      <Dialog open={isDisposisiModalOpen} onOpenChange={setIsDisposisiModalOpen}>
        <DialogContent className="md:hidden w-full h-full max-h-[90vh] max-w-full rounded-t-xl p-0 gap-0 self-end mt-auto origin-bottom slide-in-from-bottom-full">
            {isMasterLoading ? (
                <div className="flex h-full items-center justify-center bg-card rounded-t-xl">
                    <MasterDataSkeleton label="Menyiapkan Form Disposisi..." />
                </div>
            ) : (
                <div className="h-full overflow-y-auto rounded-t-xl bg-card">
                    <FormDisposisi 
                        surat={surat} 
                        onDisposisiSuccess={handleDisposisiSuccess} 
                        opdJabatans={jabatanMap} 
                        userCache={userMap} 
                        isRevising={isRevising} 
                        latestDisposisi={latestDisposisi} 
                        isPimpinanPenerimaAwal={isPimpinanPenerimaAwal} 
                    />
                </div>
            )}
        </DialogContent>
      </Dialog>

      <ManualArchiveModal isOpen={isManualArchiveModalOpen} onClose={() => setIsManualArchiveModalOpen(false)} surat={surat} onConfirm={openArchiveConfirmation} isProcessing={isActionProcessing} userCache={userMap} allOpdJabatans={allOpdJabatansArray} />
      <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ ... confirmModalState, isOpen: false })} onConfirm={confirmModalState.onConfirm} title={confirmModalState.title} message={confirmModalState.message} />
      <ConfirmModal isOpen={confirmDeleteModalOpen} onClose={() => setConfirmDeleteModalOpen(false)} onConfirm={confirmDeleteSurat} title="Konfirmasi Hapus Surat" message={`Apakah Anda yakin ingin menghapus surat "${surat.perihal}"?`} confirmText="Ya, Hapus Surat" isProcessing={isActionProcessing} />
    </div>
  );
}