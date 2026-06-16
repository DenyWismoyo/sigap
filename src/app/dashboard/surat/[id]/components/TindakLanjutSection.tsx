/**
 * Directory: src/app/dashboard/surat/[id]/components/TindakLanjutSection.tsx
 * History Updates:
 * - [FITUR BARU] Form input interaktif "Google Keep Style" dengan warna, judul, dan checklist.
 * - [FITUR BARU] Riwayat laporan bergaya Masonry Grid (Sticky Notes).
 * - [UPDATE] Implementasi Cache (Auto-save) LocalStorage untuk draft laporan.
 * - [UPDATE] Smart Enter: Menambahkan otomatis simbol "- " saat menekan tombol enter untuk membuat poin-poin.
 * - [FITUR BARU] Kemampuan mengedit/merevisi catatan yang sudah dibuat melalui Modal Edit Laporan.
 * - [UPDATE] Menyembunyikan Dropdown "Pilih Instruksi" jika instruksi hanya ada 1.
 * - [FITUR BARU] Selesai Manual: Tombol "Tandai Selesai" instan jika user sudah pernah melapor progres.
 * - [BUGFIX] Melonggarkan validasi agar user bisa bebas mengetik hanya judul/isi saja tanpa checklist.
 * - [BUGFIX] Memperbaiki deteksi "hasExistingReport" agar mengecek seluruh histori laporan user di surat ini.
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { TindakLanjut, Disposisi, UserProfile, Surat } from '@/types';
import { ClipboardCheck, ExternalLink, CheckCircle, Loader2, X, Plus, Palette, ListTodo, Paperclip, Pencil } from 'lucide-react';
import { useGoogleDriveUploader } from '@/app/dashboard/hooks/useGoogleDriveUploader';
import { useSuratActions, TindakLanjutPayload } from '@/app/dashboard/hooks/useSuratActions'; 
import ConfirmModal from '@/app/dashboard/components/ConfirmModal'; 

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
// --- Akhir Impor Shadcn ---


// --- HELPER WARNA ---
export const getWarnaClass = (warna?: string) => {
    switch(warna) {
        case 'red': return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-100';
        case 'green': return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100';
        case 'blue': return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100';
        case 'yellow': return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100';
        case 'purple': return 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900 text-purple-900 dark:text-purple-100';
        default: return 'bg-card dark:bg-card border-border text-foreground';
    }
}

const PALETTE_COLORS = [
    { id: 'default', code: 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700' },
    { id: 'red', code: 'bg-red-200 dark:bg-red-900 border-red-300 dark:border-red-800' },
    { id: 'green', code: 'bg-emerald-200 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-800' },
    { id: 'blue', code: 'bg-blue-200 dark:bg-blue-900 border-blue-300 dark:border-blue-800' },
    { id: 'yellow', code: 'bg-amber-200 dark:bg-amber-900 border-amber-300 dark:border-amber-800' },
    { id: 'purple', code: 'bg-purple-200 dark:bg-purple-900 border-purple-300 dark:border-purple-800' },
];


interface TindakLanjutSectionProps {
  surat: Surat;
  disposisiList: Disposisi[];
  tindakLanjutList: TindakLanjut[];
  onUpdate: () => void;
  isReadOnly: boolean;
  canTakeAction: boolean;
  userCache: Map<string, UserProfile>; 
}

export default function TindakLanjutSection({ surat, disposisiList, tindakLanjutList, onUpdate, isReadOnly, canTakeAction, userCache }: TindakLanjutSectionProps) {
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth(); 
  const effectiveJabatanId = actingJabatanProfile?.id || jabatanProfile?.id;
  
  // --- HOOKS ---
  const { uploadFile, uploadStatus, errorMessage: uploadError, isReady } = useGoogleDriveUploader();
  const { kirimTindakLanjut, editTindakLanjut, isProcessing } = useSuratActions(); 

  // --- STATE FOR NEW KEEP NOTES ---
  const [selectedDisposisi, setSelectedDisposisi] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [judulLaporan, setJudulLaporan] = useState('');
  const [isiLaporan, setIsiLaporan] = useState('');
  const [warnaLabel, setWarnaLabel] = useState<'default' | 'red' | 'green' | 'blue' | 'yellow' | 'purple'>('default');
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{id: string, teks: string, isDone: boolean}[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // --- STATE FOR EDITING KEEP NOTES ---
  const [editModalData, setEditModalData] = useState<TindakLanjut | null>(null);
  const [editJudul, setEditJudul] = useState('');
  const [editIsi, setEditIsi] = useState('');
  const [editWarna, setEditWarna] = useState<'default' | 'red' | 'green' | 'blue' | 'yellow' | 'purple'>('default');
  const [editIsChecklistMode, setEditIsChecklistMode] = useState(false);
  const [editChecklistItems, setEditChecklistItems] = useState<{id: string, teks: string, isDone: boolean}[]>([]);
  const [editNewChecklistText, setEditNewChecklistText] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'report' | 'finish' | 'manual_finish' | null;
    disposisiId?: string | null;
  }>({ isOpen: false, title: '', message: '', actionType: null, disposisiId: null });

  // --- CACHE & AUTO-SAVE LOGIC ---
  const cacheKey = `tindakLanjut_cache_${surat.id}`;

  useEffect(() => {
    // Load cache saat komponen pertama kali dirender
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (parsed.judulLaporan) setJudulLaporan(parsed.judulLaporan);
            if (parsed.isiLaporan) setIsiLaporan(parsed.isiLaporan);
            if (parsed.warnaLabel) setWarnaLabel(parsed.warnaLabel);
            if (parsed.isChecklistMode !== undefined) setIsChecklistMode(parsed.isChecklistMode);
            if (parsed.checklistItems && parsed.checklistItems.length > 0) setChecklistItems(parsed.checklistItems);
            if (parsed.isExpanded !== undefined) setIsExpanded(parsed.isExpanded);
        } catch (e) {
            console.error("Gagal membaca cache:", e);
        }
    }
  }, [cacheKey]);

  useEffect(() => {
    // Simpan data form ke localStorage setiap kali ada perubahan
    if (isExpanded || isiLaporan || judulLaporan || checklistItems.length > 0) {
        const dataToCache = {
            judulLaporan,
            isiLaporan,
            warnaLabel,
            isChecklistMode,
            checklistItems,
            isExpanded
        };
        localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
    }
  }, [judulLaporan, isiLaporan, warnaLabel, isChecklistMode, checklistItems, isExpanded, cacheKey]);
  // --- END CACHE LOGIC ---

  // Saring ketat disposisi target (tanpa memfilter yang sudah selesai agar ID tetap valid)
  const myDispositions = disposisiList.filter(d => {
      return effectiveJabatanId ? d.kepadaJabatanId.includes(effectiveJabatanId) : false;
  });

  useEffect(() => {
    if (myDispositions.length > 0 && !selectedDisposisi) {
        setSelectedDisposisi(myDispositions[0].id!);
    }
  }, [myDispositions, selectedDisposisi]);

  // Periksa apakah user telah melaporkan progres sebelumnya untuk surat ini
  const hasExistingReport = tindakLanjutList.some(tl => 
      tl.userId === userProfile?.uid || tl.jabatanId === effectiveJabatanId
  );

  const getSuggestedFileName = (file: File) => {
    const date = new Date();
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    const perihal = surat.perihal.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50);
    
    let fileExtension = '.jpg'; 
    if (file.name) {
        const parts = file.name.split('.');
        if (parts.length > 1) {
            fileExtension = '.' + parts.pop();
        }
    }
    return `${yyyymmdd} - TL ${perihal}${fileExtension}`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setFile(event.target.files[0]);
    } else {
        setFile(null);
    }
  };

  // --- HANDLER BARU: ADD CHECKLIST ITEM ---
  const addChecklistItem = () => {
      if (!newChecklistText.trim()) return;
      setChecklistItems([...checklistItems, { id: Date.now().toString(), teks: newChecklistText, isDone: false }]);
      setNewChecklistText('');
  };

  const addEditChecklistItem = () => {
      if (!editNewChecklistText.trim()) return;
      setEditChecklistItems([...editChecklistItems, { id: Date.now().toString(), teks: editNewChecklistText, isDone: false }]);
      setEditNewChecklistText('');
  };

  // --- SMART ENTER LOGIC UNTUK POIN-POIN ---
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, setTextFn: (v: string) => void) => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;

        // Ambil baris saat ini (dari awal line sampai posisi kursor)
        const lines = value.substring(0, start).split('\n');
        const currentLine = lines[lines.length - 1];

        // Jika baris saat ini HANYA berisi "- " (artinya enter dua kali berturut-turut tanpa teks)
        if (currentLine.trim() === '-') {
            // Hapus dash-nya dan buat baris baru kosong biasa
            const newValue = value.substring(0, start - currentLine.length) + '\n' + value.substring(end);
            setTextFn(newValue);
            setTimeout(() => { target.selectionStart = target.selectionEnd = start - currentLine.length + 1; }, 0);
        } else {
            // Jika ada isinya, enter ke bawah dan otomatis tambahkan simbol "- "
            const newValue = value.substring(0, start) + '\n- ' + value.substring(end);
            setTextFn(newValue);
            setTimeout(() => { target.selectionStart = target.selectionEnd = start + 3; }, 0);
        }
    }
  };

  // --- EDIT TRIGGERS ---
  const handleOpenEdit = (tl: TindakLanjut) => {
      const richTl = tl as any;
      setEditJudul(richTl.judulLaporan || '');
      setEditIsi(tl.isiLaporan || '');
      setEditWarna(richTl.warnaLabel || 'default');
      const items = richTl.checklist || [];
      setEditChecklistItems(items);
      setEditIsChecklistMode(items.length > 0 || !tl.isiLaporan);
      setEditNewChecklistText('');
      setEditModalData(tl);
  };

  const executeEditSubmit = async () => {
      if (!editModalData || !editModalData.id) return;
      
      // Melonggarkan validasi: Boleh isi laporan SAJA, atau judul SAJA
      if (!editIsi.trim() && !editJudul.trim() && editChecklistItems.length === 0) {
          setError('Harap isi judul, laporan, atau setidaknya 1 item checklist.'); 
          return;
      }
      
      const payload: TindakLanjutPayload = {
          isiLaporan: editIsi,
          judulLaporan: editJudul,
          warnaLabel: editWarna,
          checklist: editChecklistItems
      };

      const success = await editTindakLanjut(editModalData.id, editModalData.suratId, payload);
      if (success) {
          setEditModalData(null);
          onUpdate();
      }
  };

  // --- MAIN SUBMIT TRIGGERS ---
  const handleTriggerSubmit = (actionType: 'report' | 'finish' | 'manual_finish') => {
    const activeDisposisiId = selectedDisposisi || (myDispositions.length > 0 ? myDispositions[0].id : null);

    if (actionType !== 'manual_finish') {
        // Melonggarkan validasi: Memeriksa isiLaporan ATAU judulLaporan
        if ((!isiLaporan.trim() && !judulLaporan.trim() && checklistItems.length === 0) || !activeDisposisiId || !userProfile || !effectiveJabatanId) { 
          setError('Harap isi judul, laporan, atau setidaknya 1 item checklist.');
          return;
        }
    } else {
        if (!activeDisposisiId || !userProfile || !effectiveJabatanId) {
            setError('Data instruksi tidak valid.');
            return;
        }
    }
    
    setError('');
    setSuccessMessage('');
    
    let title = '';
    let message = '';
    
    if (actionType === 'finish') {
        title = 'Konfirmasi Selesai';
        message = 'Anda akan menandai tindak lanjut ini sebagai SELESAI dan menutup alur surat. Pastikan pekerjaan benar-benar tuntas. Lanjutkan?';
    } else if (actionType === 'report') {
        title = 'Konfirmasi Laporan';
        message = 'Anda akan mengirim laporan progres. Status surat akan tetap dalam proses. Lanjutkan?';
    } else if (actionType === 'manual_finish') {
        title = 'Selesaikan Secara Manual';
        message = 'Anda akan menandai surat ini sebagai SELESAI berdasarkan laporan progres sebelumnya tanpa menambahkan catatan baru. Lanjutkan?';
    }

    setConfirmModal({
        isOpen: true,
        title,
        message,
        actionType,
        disposisiId: activeDisposisiId
    });
  };

  const executeSubmit = async () => {
    const actionType = confirmModal.actionType;
    const targetDisposisiId = confirmModal.disposisiId || selectedDisposisi;
    setConfirmModal(prev => ({ ...prev, isOpen: false })); 

    try {
      let uploadedFileUrl = undefined;
      let uploadedFileName = undefined;

      if (file && actionType !== 'manual_finish') {
        if (!userProfile?.googleDriveReportLink) {
            setError("Upload gagal: ID Folder Google Drive belum diatur di Profil Anda.");
            return;
        }

        uploadedFileName = getSuggestedFileName(file);
        const link = await uploadFile(
            file, 
            uploadedFileName, 
            userProfile.googleDriveReportLink
        );

        if (link) {
            uploadedFileUrl = link;
        } else {
            return; 
        }
      }

      const disposisiObj = disposisiList.find(d => d.id === targetDisposisiId);
      if (!disposisiObj) {
          setError("Data disposisi tidak valid.");
          return;
      }
      
      const isFinal = actionType === 'finish' || actionType === 'manual_finish';

      // --- PAYLOAD KEEP NOTES ---
      let finalIsiLaporan = isiLaporan;
      let finalJudulLaporan = judulLaporan;
      let finalWarnaLabel = warnaLabel;
      let finalChecklist = checklistItems;

      if (actionType === 'manual_finish') {
          finalIsiLaporan = "Tindak lanjut telah diselesaikan secara manual.";
          finalJudulLaporan = "Selesai";
          finalWarnaLabel = "green";
          finalChecklist = [];
      }

      const payload: TindakLanjutPayload = {
          isiLaporan: finalIsiLaporan,
          judulLaporan: finalJudulLaporan,
          warnaLabel: finalWarnaLabel,
          checklist: finalChecklist
      };

      const success = await kirimTindakLanjut(
          surat,
          disposisiObj,
          payload,
          uploadedFileUrl ? { url: uploadedFileUrl, name: uploadedFileName! } : undefined,
          { isFinalAction: isFinal } 
      );

      if (success) {
          setSuccessMessage(isFinal ? 'Tindak lanjut selesai dan ditutup.' : 'Laporan progres terkirim.');
          
          // Hapus Cache Karena Telah Berhasil Submit
          localStorage.removeItem(cacheKey);

          // Reset Form Keep Note
          setIsiLaporan('');
          setJudulLaporan('');
          setWarnaLabel('default');
          setChecklistItems([]);
          setIsChecklistMode(false);
          setIsExpanded(false);
          
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          onUpdate(); 
      }

    } catch (err: any) {
      setError(err.message || 'Gagal mengirim laporan tindak lanjut.');
      console.error(err);
    }
  };
  
  const isBusy = isProcessing || uploadStatus === 'uploading';

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border">
        {/* Header */}
        <div className="p-3 md:p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-base md:text-xl font-semibold text-foreground flex items-center">
                <ClipboardCheck size={18} className="mr-2 md:mr-3 md:w-5 md:h-5 text-green-600" />
                Tindak Lanjut
            </h2>
        </div>

        {/* Konten */}
        <div className="p-3 md:p-6">
            {canTakeAction && (
                <div className="space-y-4 pb-6 mb-6 border-b border-border">
                    <h3 className="font-semibold text-sm md:text-base text-foreground mb-3">Buat Laporan / Catatan Progres</h3>
                    
                    {error && (
                      <Alert variant="destructive" className="py-2 px-3 text-xs md:text-sm">
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {uploadError && (
                      <Alert variant="destructive" className="py-2 px-3 text-xs md:text-sm">
                          <AlertDescription>{uploadError}</AlertDescription>
                      </Alert>
                    )}
                    {successMessage && (
                      <Alert variant="default" className="py-2 px-3 text-xs md:text-sm bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>{successMessage}</AlertDescription>
                      </Alert>
                    )}
                    
                    {myDispositions.length > 1 ? (
                        <div className="mb-4">
                          <Label htmlFor="disposisi-select" className="text-xs md:text-sm mb-1.5 block">Pilih Instruksi Atasan:</Label>
                          <Select value={selectedDisposisi} onValueChange={setSelectedDisposisi}>
                              <SelectTrigger id="disposisi-select" className="h-10 text-sm bg-muted/50">
                                  <SelectValue placeholder="Pilih instruksi..." />
                              </SelectTrigger>
                              <SelectContent>
                                  {myDispositions.map(d => <SelectItem key={d.id} value={d.id!} className="text-sm">{d.instruksi}</SelectItem>)}
                              </SelectContent>
                          </Select>
                        </div>
                    ) : myDispositions.length === 1 ? (
                        <div className="mb-4 p-3 bg-muted/30 border border-border rounded-lg">
                            <span className="text-xs text-muted-foreground block mb-1">Instruksi Atasan:</span>
                            <span className="text-sm font-medium italic">"{myDispositions[0].instruksi}"</span>
                        </div>
                    ) : null}

                    {/* Banner Selesai Manual */}
                    {hasExistingReport && (
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Laporan progres Anda telah dicatat.</p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400">Jika pekerjaan sudah tuntas, Anda dapat langsung menyelesaikannya secara manual.</p>
                            </div>
                            <Button 
                                type="button"
                                variant="default" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 w-full sm:w-auto shadow-sm"
                                onClick={() => handleTriggerSubmit('manual_finish')}
                                disabled={isBusy}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" /> Tandai Selesai
                            </Button>
                        </div>
                    )}
                    
                    {/* --- FORM KEEP NOTE INTERAKTIF --- */}
                    <div className={`border rounded-xl shadow-sm transition-all duration-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 ${getWarnaClass(warnaLabel)}`}>
                        
                        {/* Area Judul (Hanya muncul jika di-expand) */}
                        {isExpanded && (
                            <div className="px-4 pt-3">
                                <Input 
                                    placeholder="Judul Laporan (Opsional)" 
                                    value={judulLaporan}
                                    onChange={(e) => setJudulLaporan(e.target.value)}
                                    className="border-0 bg-transparent text-base font-bold px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 h-auto" 
                                />
                            </div>
                        )}
                        
                        {/* Area Isi Textarea atau Checklist */}
                        <div className="p-4">
                            {isChecklistMode ? (
                                <div className="space-y-2">
                                    {/* List Item yang sudah ada */}
                                    {checklistItems.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 group">
                                            <Checkbox 
                                                checked={item.isDone} 
                                                onCheckedChange={(checked) => {
                                                    setChecklistItems(prev => prev.map(i => i.id === item.id ? {...i, isDone: !!checked} : i))
                                                }}
                                                className="border-current data-[state=checked]:bg-current data-[state=checked]:text-background"
                                            />
                                            <Input 
                                                value={item.teks} 
                                                onChange={(e) => {
                                                    setChecklistItems(prev => prev.map(i => i.id === item.id ? {...i, teks: e.target.value} : i))
                                                }} 
                                                className={`border-0 border-b border-transparent hover:border-current/20 focus-visible:border-current/50 bg-transparent rounded-none px-1 h-7 shadow-none focus-visible:ring-0 ${item.isDone ? 'line-through opacity-60' : ''}`} 
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))} className="opacity-0 group-hover:opacity-100 h-6 w-6"><X size={14}/></Button>
                                        </div>
                                    ))}
                                    
                                    {/* Input Tambah Item */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-current/10">
                                        <Plus size={16} className="opacity-50 ml-0.5 shrink-0" />
                                        <Input 
                                            placeholder="Ketik item baru lalu tekan Enter..." 
                                            value={newChecklistText}
                                            onChange={(e) => setNewChecklistText(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                                            className="border-0 bg-transparent px-1 h-7 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 flex-1" 
                                        />
                                        <Button size="sm" variant="ghost" onClick={addChecklistItem} className="h-7 text-xs px-2" disabled={!newChecklistText.trim()}>Tambah</Button>
                                    </div>
                                </div>
                            ) : (
                                <Textarea 
                                    value={isiLaporan} 
                                    onChange={e => setIsiLaporan(e.target.value)} 
                                    onClick={() => setIsExpanded(true)}
                                    onKeyDown={(e) => handleTextareaKeyDown(e, setIsiLaporan)} // HANDLER ENTER
                                    rows={isExpanded ? 3 : 1} 
                                    placeholder={isExpanded ? "Tuliskan rincian progres..." : "Tuliskan progres/laporan di sini..."} 
                                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 resize-none placeholder:text-muted-foreground/70" 
                                />
                            )}
                        </div>

                        {/* File Upload Inline */}
                        {isExpanded && (
                            <div className="px-4 pb-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Label htmlFor="file-upload-keep" className="cursor-pointer flex items-center justify-center h-8 px-3 rounded-full border border-current/20 bg-current/5 hover:bg-current/10 transition-colors text-xs font-medium">
                                        <Paperclip size={14} className="mr-1.5" /> 
                                        {file ? 'Ganti Lampiran' : 'Lampirkan Bukti/File'}
                                    </Label>
                                    <Input id="file-upload-keep" type="file" ref={fileInputRef} onChange={handleFileChange} capture="environment" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" disabled={isBusy || !isReady} className="hidden" />
                                    
                                    {!userProfile?.googleDriveReportLink && (
                                        <span className="text-[10px] text-red-600 font-semibold bg-red-100 px-2 py-1 rounded-md">ID GDrive belum diatur</span>
                                    )}
                                </div>
                                
                                {file && uploadStatus === 'idle' && (
                                    <div className="inline-flex items-center max-w-full bg-background/50 border border-current/20 rounded-lg px-2.5 py-1.5 text-xs">
                                        <CheckCircle size={14} className="mr-1.5 flex-shrink-0 opacity-70" />
                                        <span className='font-semibold truncate max-w-[200px]'>{file.name}</span>
                                        <Button type='button' variant="ghost" size="icon" className="h-5 w-5 ml-2 shrink-0 hover:bg-current/10 rounded-full" onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}>
                                            <X size={12} />
                                        </Button>
                                    </div>
                                )}
                                {uploadStatus === 'uploading' && (
                                    <div className="inline-flex items-center text-xs font-medium animate-pulse"><Loader2 size={14} className="animate-spin mr-1.5" /> Mengunggah...</div>
                                )}
                            </div>
                        )}

                        {/* Footer Controls (Hanya muncul jika di-expand) */}
                        {isExpanded && (
                            <div className="flex items-center justify-between p-2 border-t border-current/10 bg-black/5 dark:bg-white/5">
                                <div className="flex gap-1">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-current/10 rounded-full" title="Pilih Warna Catatan">
                                                <Palette size={16} className="opacity-70" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-auto p-2 flex gap-2">
                                            {PALETTE_COLORS.map(c => (
                                                <button 
                                                    key={c.id} 
                                                    onClick={() => setWarnaLabel(c.id as any)} 
                                                    className={`w-6 h-6 rounded-full border-2 ${c.code} ${warnaLabel === c.id ? 'ring-2 ring-offset-2 ring-primary' : 'border-transparent hover:scale-110 transition-transform'}`}
                                                    title={`Warna ${c.id}`}
                                                />
                                            ))}
                                        </PopoverContent>
                                    </Popover>
                                    
                                    <Button 
                                        variant="ghost" size="icon" 
                                        className={`h-8 w-8 rounded-full hover:bg-current/10 ${isChecklistMode ? 'bg-current/10' : ''}`} 
                                        onClick={() => setIsChecklistMode(!isChecklistMode)}
                                        title="Mode Daftar Centang"
                                    >
                                        <ListTodo size={16} className="opacity-70" />
                                    </Button>
                                </div>
                                
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(false)} className="h-8 hover:bg-current/10 text-xs">Tutup</Button>
                                    <Button type="button" variant="default" size="sm" onClick={() => handleTriggerSubmit('report')} disabled={isBusy} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm">
                                        Kirim Progres
                                    </Button>
                                    <Button type="button" variant="default" size="sm" onClick={() => handleTriggerSubmit('finish')} disabled={isBusy} className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white border-none shadow-sm">
                                        Kirim & Selesai
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- DISPLAY MASONRY GRID (Riwayat Laporan Bergaya Kartu) --- */}
            <div>
                <h3 className="font-semibold text-sm md:text-base text-foreground mb-4">Riwayat Catatan Progres</h3>
                
                {tindakLanjutList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {tindakLanjutList.map(tl => {
                            const pelapor = userCache.get(tl.jabatanId);
                            const richTl = tl as any; 
                            
                            return (
                                <Card key={tl.id} className={`overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border ${getWarnaClass(richTl.warnaLabel || 'default')}`}>
                                    <div className="p-3.5">
                                        {/* Judul */}
                                        {richTl.judulLaporan && (
                                            <h4 className="font-bold text-sm md:text-base mb-1.5 leading-snug">{richTl.judulLaporan}</h4>
                                        )}
                                        
                                        {/* Isi Teks */}
                                        {tl.isiLaporan && (
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed opacity-90">{tl.isiLaporan}</p>
                                        )}
                                        
                                        {/* Checklist */}
                                        {richTl.checklist && richTl.checklist.length > 0 && (
                                            <div className="mt-3 space-y-1.5">
                                                {richTl.checklist.map((item: any) => (
                                                    <div key={item.id} className="flex items-start gap-2">
                                                        <Checkbox checked={item.isDone} disabled className="mt-0.5 opacity-70 border-current data-[state=checked]:bg-current data-[state=checked]:text-background" />
                                                        <span className={`text-sm opacity-90 leading-tight ${item.isDone ? 'line-through opacity-50' : ''}`}>{item.teks}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Attachment */}
                                        {tl.googleDriveLink && (
                                            <div className="mt-3 pt-3 border-t border-current/10 flex justify-between items-center">
                                                <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs bg-background/50 hover:bg-background/80 border-current/20 text-current">
                                                    <a href={tl.googleDriveLink} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink size={12} className="mr-1.5 opacity-70"/> Lihat Bukti
                                                    </a>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Footer Meta & Tombol Edit */}
                                    <div className="px-3.5 py-2 text-[10px] md:text-xs opacity-70 border-t border-current/10 flex justify-between items-center bg-black/5 dark:bg-white/5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-medium truncate">{pelapor?.namaLengkap || 'User ID ' + tl.userId}</span>
                                            {/* MENAMPILKAN TOMBOL EDIT JIKA INI CATATAN MILIK USER YANG LOGIN */}
                                            {tl.userId === userProfile?.uid && (
                                                <Button 
                                                    variant="ghost" size="icon" 
                                                    className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100 hover:bg-current/10 rounded-full transition-opacity" 
                                                    onClick={() => handleOpenEdit(tl)} 
                                                    title="Edit Catatan"
                                                >
                                                    <Pencil size={12} />
                                                </Button>
                                            )}
                                        </div>
                                        <span className="shrink-0 pl-2">{tl.tanggalLaporan?.toDate ? tl.tanggalLaporan.toDate().toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Baru saja...'}</span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                        <ClipboardCheck size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Belum ada riwayat tindak lanjut tercatat.</p>
                    </div>
                )}
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                onConfirm={executeSubmit}
                title={confirmModal.title}
                message={confirmModal.message}
                isProcessing={isBusy}
                confirmText={confirmModal.actionType === 'manual_finish' ? 'Ya, Tandai Selesai' : (confirmModal.actionType === 'finish' ? 'Ya, Selesaikan' : 'Ya, Kirim')}
            />

            {/* --- MODAL EDIT CATATAN (KEEP NOTE STYLE) --- */}
            <Dialog open={!!editModalData} onOpenChange={(open) => !open && setEditModalData(null)}>
                <DialogContent className="sm:max-w-lg bg-card border-border p-0 overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-3 bg-muted/30 border-b border-border">
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <Pencil className="h-5 w-5 text-blue-600" />
                            Edit Catatan / Progres
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="p-5 bg-background">
                        <div className={`border rounded-xl shadow-sm transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 ${getWarnaClass(editWarna)}`}>
                            <div className="px-4 pt-3">
                                <Input 
                                    placeholder="Judul Laporan (Opsional)" 
                                    value={editJudul}
                                    onChange={(e) => setEditJudul(e.target.value)}
                                    className="border-0 bg-transparent text-base font-bold px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 h-auto" 
                                />
                            </div>
                            
                            <div className="p-4">
                                {editIsChecklistMode ? (
                                    <div className="space-y-2">
                                        {editChecklistItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-2 group">
                                                <Checkbox 
                                                    checked={item.isDone} 
                                                    onCheckedChange={(checked) => setEditChecklistItems(prev => prev.map(i => i.id === item.id ? {...i, isDone: !!checked} : i))}
                                                    className="border-current data-[state=checked]:bg-current data-[state=checked]:text-background"
                                                />
                                                <Input 
                                                    value={item.teks} 
                                                    onChange={(e) => setEditChecklistItems(prev => prev.map(i => i.id === item.id ? {...i, teks: e.target.value} : i))} 
                                                    className={`border-0 border-b border-transparent hover:border-current/20 focus-visible:border-current/50 bg-transparent rounded-none px-1 h-7 shadow-none focus-visible:ring-0 ${item.isDone ? 'line-through opacity-60' : ''}`} 
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => setEditChecklistItems(prev => prev.filter(i => i.id !== item.id))} className="opacity-0 group-hover:opacity-100 h-6 w-6"><X size={14}/></Button>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 pt-1 border-t border-current/10">
                                            <Plus size={16} className="opacity-50 ml-0.5 shrink-0" />
                                            <Input 
                                                placeholder="Ketik item baru lalu tekan Enter..." 
                                                value={editNewChecklistText}
                                                onChange={(e) => setEditNewChecklistText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEditChecklistItem(); } }}
                                                className="border-0 bg-transparent px-1 h-7 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 flex-1" 
                                            />
                                            <Button size="sm" variant="ghost" onClick={addEditChecklistItem} className="h-7 text-xs px-2" disabled={!editNewChecklistText.trim()}>Tambah</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Textarea 
                                        value={editIsi} 
                                        onChange={e => setEditIsi(e.target.value)} 
                                        onKeyDown={(e) => handleTextareaKeyDown(e, setEditIsi)} // HANDLER ENTER AUTO-BULLET
                                        rows={5} 
                                        placeholder="Tuliskan rincian progres..." 
                                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 resize-none placeholder:text-muted-foreground/70" 
                                    />
                                )}
                            </div>

                            <div className="flex items-center justify-between p-2 border-t border-current/10 bg-black/5 dark:bg-white/5">
                                <div className="flex gap-1">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-current/10 rounded-full" title="Pilih Warna Catatan">
                                                <Palette size={16} className="opacity-70" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-auto p-2 flex gap-2">
                                            {PALETTE_COLORS.map(c => (
                                                <button 
                                                    key={c.id} 
                                                    onClick={() => setEditWarna(c.id as any)} 
                                                    className={`w-6 h-6 rounded-full border-2 ${c.code} ${editWarna === c.id ? 'ring-2 ring-offset-2 ring-primary' : 'border-transparent hover:scale-110 transition-transform'}`}
                                                    title={`Warna ${c.id}`}
                                                />
                                            ))}
                                        </PopoverContent>
                                    </Popover>
                                    
                                    <Button 
                                        variant="ghost" size="icon" 
                                        className={`h-8 w-8 rounded-full hover:bg-current/10 ${editIsChecklistMode ? 'bg-current/10' : ''}`} 
                                        onClick={() => setEditIsChecklistMode(!editIsChecklistMode)}
                                        title="Mode Daftar Centang"
                                    >
                                        <ListTodo size={16} className="opacity-70" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-5 pb-5 pt-3 bg-background border-t-0 flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setEditModalData(null)} disabled={isProcessing}>Batal</Button>
                        <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white" 
                            onClick={executeEditSubmit} 
                            disabled={isProcessing || (!editIsi.trim() && !editJudul.trim() && editChecklistItems.length === 0)}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    </div>
  );
}