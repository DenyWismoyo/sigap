// Lokasi: src/app/dashboard/tugas/components/FormTugas.tsx
// [PERBAIKAN 10/11/2025]
// - Menghapus logika fetch data (getDocs, useEffect, isStafLoading) dari komponen ini.
// - Komponen ini sekarang menerima 'userCache' sebagai prop dari induknya.
// - Pencarian staf (bawahan/atasan) sekarang dilakukan secara instan (sinkron)
//   dengan mem-filter 'userCache' yang sudah di-pass. Ini memperbaiki bug
//   saat modal dibuka dari parent yang berbeda (Notulensi/Checklist).
// [PERBAIKAN ERROR BUILD 10/11/2025 v7]
// - Memperbaiki path impor dari relatif ('../../../../') ke alias ('@/').
// - Menghapus pemanggilan 'setatasanResults([])' yang tidak ada dan tidak perlu.

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, Timestamp, query, where, getDocs, writeBatch, doc, limit, addDoc, orderBy } from 'firebase/firestore'; 
import { useUserAuth } from '@/context/AuthContext';
import { Tugas, Jabatan, Surat, UserProfile } from '@/types';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { logActivity } from '@/lib/activityLogger';
import { User, Search, Link as LinkIcon, X, Send, UserCheck, Users, Briefcase, ChevronDown, Loader2, UserPlus } from 'lucide-react';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"; // PERBAIKAN PATH
import { Button } from "@/components/ui/button"; // PERBAIKAN PATH
import { Input } from "@/components/ui/input"; // PERBAIKAN PATH
import { Label } from "@/components/ui/label"; // PERBAIKAN PATH
import { Textarea } from "@/components/ui/textarea"; // PERBAIKAN PATH
import { DatePicker } from "@/components/ui/date-picker"; // PERBAIKAN PATH
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // PERBAIKAN PATH
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // PERBAIKAN PATH
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"; // PERBAIKAN PATH
import { Checkbox } from "@/components/ui/checkbox"; // PERBAIKAN PATH
import { Badge } from "@/components/ui/badge"; // PERBAIKAN PATH
import { ScrollArea } from '@/components/ui/scroll-area'; // PERBAIKAN PATH
// --- Akhir Impor Shadcn ---

interface FormTugasProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTaskId: string) => void;
  userCache: Map<string, UserProfile>; // [PERBAIKAN] Terima cache dari induk
  suratTerkait?: {
    id: string;
    perihal: string;
    klasifikasi?: 'Biasa' | 'Penting' | 'Segera' | 'Rahasia';
  } | null;
  initialData?: {
    judulTugas: string;
    deskripsi: string;
  };
}

export default function FormTugas({ isOpen, onClose, onSuccess, userCache, suratTerkait, initialData }: FormTugasProps) {
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth(); // [PERBAIKAN] Ambil jabatanProfile
  const [judulTugas, setJudulTugas] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [kategoriTugas, setKategoriTugas] = useState<Tugas['kategoriTugas']>('Lainnya');
  const [prioritas, setPrioritas] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');
  const [batasWaktu, setBatasWaktu] = useState<Date | undefined>(undefined);

  const [penanggungJawab, setPenanggungJawab] = useState<UserProfile | null>(null);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [laporKepada, setLaporKepada] = useState<UserProfile | null>(null);

  const [linkedSurat, setLinkedSurat] = useState<Surat | null>(null);
  const [suratSearch, setSuratSearch] = useState('');
  const [suratResults, setSuratResults] = useState<Surat[]>([]);

  const [stafSearch, setStafSearch] = useState('');
  // [PERBAIKAN] Hapus state loading staf
  // const [isStafLoading, setIsStafLoading] = useState(false);
  
  const [atasanSearch, setAtasanSearch] = useState('');
  // [PERBAIKAN] Hapus state loading atasan
  // const [isAtasanLoading, setIsAtasanLoading] = useState(false);

  const [isMandiri, setIsMandiri] = useState(false); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State untuk Popover
  const [suratPopoverOpen, setSuratPopoverOpen] = useState(false);
  const [stafPopoverOpen, setStafPopoverOpen] = useState(false);
  const [atasanPopoverOpen, setAtasanPopoverOpen] = useState(false);

  const resetForm = useCallback(() => {
    setJudulTugas('');
    setDeskripsi('');
    setBatasWaktu(undefined);
    setKategoriTugas('Lainnya');
    setPrioritas('Sedang');
    setError('');
    setLinkedSurat(null);
    setSuratSearch('');
    setSuratResults([]);
    setPenanggungJawab(null);
    setCollaborators([]);
    setLaporKepada(null);
    setStafSearch('');
    setAtasanSearch('');
    setIsMandiri(!suratTerkait && !initialData);
  }, [suratTerkait, initialData]); 

  useEffect(() => {
    if (isOpen) {
      resetForm(); 
      if (suratTerkait) {
        setLinkedSurat(suratTerkait as Surat);
        setJudulTugas(`Tindak Lanjut: ${suratTerkait.perihal}`);
        if (suratTerkait.klasifikasi === 'Penting' || suratTerkait.klasifikasi === 'Segera') setPrioritas('Tinggi');
         setIsMandiri(false);
      }
      if (initialData) {
        setJudulTugas(initialData.judulTugas);
        setDeskripsi(initialData.deskripsi);
         setIsMandiri(false);
      }
      else if (!suratTerkait && userProfile && !initialData) {
         // Jika BUKAN dari surat/checklist, default-nya adalah tugas mandiri
         setIsMandiri(true);
         setPenanggungJawab(userProfile);
      }
    }
  }, [isOpen, suratTerkait, initialData, userProfile, resetForm]);

   useEffect(() => {
    if (isMandiri && userProfile) {
      setPenanggungJawab(userProfile); 
      setCollaborators([]); 
    } else if (!isMandiri) {
      if (!initialData && !suratTerkait) {
        setPenanggungJawab(null); 
      }
      // Jika mandiri di-uncheck, reset lapor kepada
      setLaporKepada(null);
    }
  }, [isMandiri, userProfile, initialData, suratTerkait]);

  // [PERBAIKAN] Hapus useEffect 'fetchBawahan'

  // [PERBAIKAN] Hapus useEffect 'fetchAtasan'

  // [PERBAIKAN] Ganti `stafSearchResults` menjadi `useMemo` yang memfilter `userCache`
  const stafSearchResults = useMemo(() => {
      if (stafSearch.length < 2 || !actingJabatanProfile || userCache.size === 0) {
          return [];
      }
      const searchLower = stafSearch.toLowerCase();
      const currentTeamIds = new Set([penanggungJawab?.jabatanId, ...collaborators.map(c => c.jabatanId)].filter(Boolean));

      const results: UserProfile[] = [];
      userCache.forEach(user => {
          if (
              user.opdId === actingJabatanProfile.opdId &&
              user.level && actingJabatanProfile.level && user.level > actingJabatanProfile.level && // Hanya bawahan
              user.status === 'aktif' &&
              !currentTeamIds.has(user.jabatanId) &&
              (user.searchKeywords?.some(kw => kw.startsWith(searchLower)) || user.namaLengkap.toLowerCase().includes(searchLower))
          ) {
              results.push(user);
          }
      });
      return results.slice(0, 10); // Batasi hasil
  }, [stafSearch, actingJabatanProfile, userCache, penanggungJawab, collaborators]);


  // [PERBAIKAN] Ganti `atasanResults` menjadi `useMemo` yang memfilter `userCache`
  const atasanResults = useMemo(() => {
      if (!isMandiri || atasanSearch.length < 2 || !actingJabatanProfile || userCache.size === 0) {
          return [];
      }
      const searchLower = atasanSearch.toLowerCase();
      
      // [PERBAIKAN] Gunakan jabatanProfile (jabatan definitif) untuk mencari atasan
      const myLevel = jabatanProfile?.level; 
      if (myLevel === undefined) return [];

      const results: UserProfile[] = [];
      userCache.forEach(user => {
          if (
              user.opdId === actingJabatanProfile.opdId &&
              user.level && user.level < myLevel && // Hanya atasan
              user.status === 'aktif' &&
              (user.searchKeywords?.some(kw => kw.startsWith(searchLower)) || user.namaLengkap.toLowerCase().includes(searchLower))
          ) {
              results.push(user);
          }
      });
      return results.slice(0, 5); // Batasi hasil
  }, [isMandiri, atasanSearch, actingJabatanProfile, userCache, jabatanProfile]);


  // Search Surat
  useEffect(() => {
    const fetchSurat = async () => {
        if (suratSearch.length < 3 || !userProfile?.opdId) { 
            setSuratResults([]);
            return;
        }
        try {
            const q = query(
                collection(db, 'surat'),
                where('opdId', '==', userProfile.opdId), 
                where('searchKeywords', 'array-contains', suratSearch.toLowerCase()),
                limit(5)
            );
            const snapshot = await getDocs(q);
            setSuratResults(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Surat)));
        } catch (error) { console.error("Error fetching surat:", error); setSuratResults([]); }
    };
    const debounce = setTimeout(fetchSurat, 300);
    return () => clearTimeout(debounce);
  }, [suratSearch, userProfile]); 

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!judulTugas || !deskripsi || !userProfile || !actingJabatanProfile) {
        setError('Harap lengkapi Judul dan Deskripsi.'); return;
    }
    const pemberiTugasUser = isMandiri ? laporKepada : userProfile;
    if (!pemberiTugasUser) {
        setError(isMandiri ? 'Untuk tugas mandiri, Anda wajib memilih "Laporkan Kepada".' : 'Tidak dapat menentukan pemberi tugas.'); return;
    }
    const penanggungJawabFinal = isMandiri ? userProfile : penanggungJawab;
    if (!penanggungJawabFinal) {
        setError('Harap pilih Penanggung Jawab untuk tugas ini.'); return;
    }
    setLoading(true);
    try {
        const batch = writeBatch(db);
        const tugasRef = doc(collection(db, 'tugas'));
        const pemberiTugasJabatan = isMandiri ? (laporKepada ? laporKepada.jabatanId : null) : actingJabatanProfile.id;
        if (!pemberiTugasJabatan) { throw new Error("Gagal menentukan Jabatan Pemberi Tugas."); }

        const newTugas: Omit<Tugas, 'id'> = {
            opdId: userProfile.opdId, judulTugas, deskripsi,
            dariJabatanId: pemberiTugasJabatan,
            dariJabatanNama: isMandiri ? laporKepada?.namaLengkap : userProfile.namaLengkap,
            kepadaJabatanId: penanggungJawabFinal.jabatanId,
            kepadaJabatanNama: penanggungJawabFinal.namaLengkap,
            collaboratorIds: isMandiri ? [] : collaborators.map(c => c.jabatanId),
            kategoriTugas, prioritas, status: 'Baru',
            tanggalDibuat: Timestamp.now(),
            batasWaktu: batasWaktu ? Timestamp.fromDate(batasWaktu) : null,
            isDelegated: !isMandiri,
        };
        
        if (linkedSurat) {
            newTugas.suratId = linkedSurat.id;
            newTugas.suratPerihal = linkedSurat.perihal;
        }
        batch.set(tugasRef, newTugas);
        const actorName = `${userProfile.namaLengkap} (${actingJabatanProfile.namaJabatan})`;
        if (linkedSurat) {
            const suratRef = doc(db, 'surat', linkedSurat.id!);
            batch.update(suratRef, { statusPenyelesaian: 'Proses Tindak Lanjut' });
            await logActivity(linkedSurat.id!, actorName, `Membuat tugas baru: "${judulTugas}"`);
        }
        
        const allRecipients = [penanggungJawabFinal, ...(isMandiri ? [] : collaborators)];
        const uniqueRecipients = Array.from(new Map(allRecipients.map(u => [u.uid, u])).values());

        for (const userToNotify of uniqueRecipients) {
            if (userToNotify.uid === pemberiTugasUser.uid) continue;
            if (userToNotify?.uid) {
                const notifRef = doc(collection(db, 'notifications'));
                batch.set(notifRef, { userId: userToNotify.uid, userNip: userToNotify.nip, message: `Anda dilibatkan dalam tugas baru: "${judulTugas}"`, link: '/dashboard/tugas', isRead: false, timestamp: Timestamp.now() });
                if (userToNotify.nomorWa) {
                    try { await sendWhatsAppNotification(userToNotify.nomorWa, 'tugas_baru', [actorName, judulTugas]); }
                    catch (waError) { console.error(`Failed to send WhatsApp notification to ${userToNotify.namaLengkap}:`, waError); }
                }
            }
        }
        await batch.commit();
        onSuccess(tugasRef.id);
        onClose();
    } catch (err: any) {
        console.error("Error creating task:", err);
        setError(`Gagal membuat tugas baru: ${err.message || 'Error tidak diketahui'}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-2xl bg-card border-border flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">Tugas Baru</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4">
              {error && <p className="p-3 text-sm text-center text-red-700 bg-red-100 dark:bg-red-900/20 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700">{error}</p>}

              <div className="grid grid-cols-5 gap-4 items-end">
                <div className="col-span-3">
                  <Label htmlFor="judulTugas">Judul Tugas</Label>
                  <Input id="judulTugas" type="text" value={judulTugas} onChange={e => setJudulTugas(e.target.value)} required />
                </div>
                {!suratTerkait && !initialData && (
                  <div className="col-span-2 flex items-center justify-start gap-2 p-2.5 h-10 border border-border rounded-md">
                      <Checkbox id="isMandiri" checked={isMandiri} onCheckedChange={(checked) => setIsMandiri(checked as boolean)} />
                      <Label htmlFor="isMandiri" className="font-medium text-sm cursor-pointer">
                          Tugas Mandiri
                      </Label>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Textarea id="deskripsi" value={deskripsi} onChange={e => setDeskripsi(e.target.value)} rows={3} required />
              </div>

              {!initialData && (
                <div>
                  <Label htmlFor="suratSearch">Tautkan Surat (Opsional)</Label>
                  {linkedSurat ? (
                      <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-800 dark:text-blue-300 truncate">{linkedSurat.perihal}</p>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setLinkedSurat(null); setSuratSearch(''); }}>
                            <X size={16} className="text-blue-600"/>
                          </Button>
                      </div>
                  ) : (
                      <Popover open={suratPopoverOpen} onOpenChange={setSuratPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Input 
                            id="suratSearch"
                            type="text" 
                            placeholder="Ketik perihal atau nomor surat..." 
                            value={suratSearch} 
                            onChange={e => {
                              setSuratSearch(e.target.value);
                              if (e.target.value.length >= 3) setSuratPopoverOpen(true); else setSuratPopoverOpen(false);
                            }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandList>
                              {suratResults.length > 0 ? suratResults.map(s => (
                                  <CommandItem
                                    key={s.id}
                                    onSelect={() => {
                                        setLinkedSurat(s);
                                        setSuratResults([]);
                                        setSuratSearch('');
                                        setSuratPopoverOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                      <div>
                                        <p className="font-semibold text-sm">{s.perihal}</p>
                                        <p className="text-xs text-muted-foreground">{s.nomorSurat}</p>
                                      </div>
                                  </CommandItem>
                              )) : (
                                <CommandEmpty>{suratSearch.length < 3 ? 'Ketik min 3 huruf' : 'Surat tidak ditemukan.'}</CommandEmpty>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                  )}
                </div>
              )}

              {isMandiri && (
                <div>
                    <Label htmlFor="atasanSearch">Laporkan Kepada (Atasan)</Label>
                    {laporKepada ? (
                        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold">{laporKepada.namaLengkap}</p>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLaporKepada(null)}>
                            <X size={16} className="text-blue-600"/>
                          </Button>
                        </div>
                    ) : (
                        <Popover open={atasanPopoverOpen} onOpenChange={setAtasanPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Input 
                              id="atasanSearch"
                              type="text" 
                              placeholder="Cari nama atau jabatan atasan..." 
                              value={atasanSearch}
                              onChange={e => {
                                setAtasanSearch(e.target.value);
                                if (e.target.value.length >= 2) setAtasanPopoverOpen(true); else setAtasanPopoverOpen(false);
                              }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandList>
                                {atasanResults.length > 0 ? atasanResults.map(u => (
                                    <CommandItem
                                      key={u.uid}
                                      onSelect={() => {
                                          setLaporKepada(u);
                                          // [PERBAIKAN ERROR BUILD] Hapus baris 'setatasanResults'
                                          // setatasanResults([]);
                                          setAtasanSearch('');
                                          setAtasanPopoverOpen(false);
                                      }}
                                      className="cursor-pointer"
                                    >
                                        <div>
                                          <p className="font-semibold text-sm">{u.namaLengkap}</p>
                                          <p className="text-xs text-muted-foreground">{u.namaJabatan}</p>
                                        </div>
                                    </CommandItem>
                                )) : (
                                  <CommandEmpty>{atasanSearch.length < 2 ? 'Ketik min 2 huruf' : 'Atasan tidak ditemukan.'}</CommandEmpty>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                    )}
                </div>
              )}

              {/* [PERBAIKAN 10/11/2025] Rombak total "Bentuk Tim" */}
              {!isMandiri && (
                <div className="space-y-4">
                  {/* --- Pemilih Penanggung Jawab --- */}
                  <div>
                    <Label htmlFor="pj-search">Penanggung Jawab (Wajib)</Label>
                    <Popover open={stafPopoverOpen} onOpenChange={setStafPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="pj-search"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {penanggungJawab ? penanggungJawab.namaLengkap : "Pilih Penanggung Jawab..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Cari nama atau jabatan..."
                            value={stafSearch}
                            onValueChange={setStafSearch}
                          />
                          <CommandList>
                            <CommandEmpty>{stafSearch.length < 2 ? 'Ketik min 2 huruf' : 'Staf tidak ditemukan.'}</CommandEmpty>
                            {stafSearchResults.map(user => (
                              <CommandItem
                                key={user.uid}
                                value={user.namaLengkap}
                                onSelect={() => {
                                  setPenanggungJawab(user);
                                  setStafPopoverOpen(false);
                                  setStafSearch('');
                                }}
                                className="cursor-pointer"
                              >
                                <div>
                                  <p className="font-semibold text-sm">{user.namaLengkap}</p>
                                  <p className="text-xs text-muted-foreground">{user.namaJabatan}</p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* --- Pemilih Kolaborator --- */}
                  <div>
                    <Label>Kolaborator (Opsional)</Label>
                    <div className="space-y-2 p-3 border rounded-lg border-border bg-muted/50">
                      {collaborators.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {collaborators.map(user => (
                            <Badge key={user.uid} variant="secondary" className="flex items-center gap-1.5 py-1 px-2">
                              {user.namaLengkap}
                              <button type="button" onClick={() => setCollaborators(prev => prev.filter(c => c.uid !== user.uid))} className="hover:text-red-500">
                                <X size={14} />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="secondary" size="sm">
                            <UserPlus size={14} className="mr-1.5"/> Tambah Kolaborator
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Cari nama atau jabatan..."
                              value={stafSearch}
                              onValueChange={setStafSearch}
                            />
                            <CommandList>
                              <CommandEmpty>{stafSearch.length < 2 ? 'Ketik min 2 huruf' : 'Staf tidak ditemukan.'}</CommandEmpty>
                              {stafSearchResults.map(user => (
                                <CommandItem
                                  key={user.uid}
                                  value={user.namaLengkap}
                                  onSelect={() => {
                                    setCollaborators(prev => [...prev, user]);
                                    setStafSearch('');
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div>
                                    <p className="font-semibold text-sm">{user.namaLengkap}</p>
                                    <p className="text-xs text-muted-foreground">{user.namaJabatan}</p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}
              {/* --- Akhir Rombak "Bentuk Tim" --- */}


              <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="kategoriTugas">Kategori</Label>
                    <Select value={kategoriTugas} onValueChange={(value) => setKategoriTugas(value as any)}>
                      <SelectTrigger id="kategoriTugas"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Penyusunan Laporan">Penyusunan Laporan</SelectItem>
                        <SelectItem value="Analisis Data">Analisis Data</SelectItem>
                        <SelectItem value="Persiapan Materi">Persiapan Materi</SelectItem>
                        <SelectItem value="Koordinasi">Koordinasi</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="prioritas">Prioritas</Label>
                    <Select value={prioritas} onValueChange={(value) => setPrioritas(value as any)}>
                      <SelectTrigger id="prioritas"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rendah">Rendah</SelectItem>
                        <SelectItem value="Sedang">Sedang</SelectItem>
                        <SelectItem value="Tinggi">Tinggi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="batasWaktu">Batas Waktu</Label>
                    <DatePicker date={batasWaktu} setDate={setBatasWaktu} />
                  </div>
              </div>

            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-6 p-4 border-t border-border sticky bottom-0 bg-muted/50">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 size={16} className="animate-spin mr-2"/> : <Send size={16} className="mr-2"/>}
                {loading ? 'Menyimpan...' : 'Simpan & Tugaskan'}
              </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}