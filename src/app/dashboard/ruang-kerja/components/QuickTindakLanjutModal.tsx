// Lokasi File: src/app/dashboard/ruang-kerja/components/QuickTindakLanjutModal.tsx
// [PERBAIKAN] Mengganti impor 'useToast' dari shadcn ke 'ToastContext' kustom.
// [PERBAIKAN] Mengubah pemanggilan 'addToast({ title: ... })' menjadi 'addToast("...", "success")'.
// [PERBAIKAN] Mengganti semua nama 'QuickDisposisiModal' menjadi 'QuickTindakLanjutModal'.
// [PERBAIKAN CRITICAL] Menambahkan update 'terlibatJabatanIds' agar penerima mendapat hak akses baca.

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Surat, Disposisi, UserProfile, Jabatan, OPD, InstruksiTemplat } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, doc, writeBatch, Timestamp, 
  serverTimestamp, addDoc, limit, arrayUnion 
} from 'firebase/firestore';
import { logActivity } from '@/lib/activityLogger';
import { useToast } from '@/context/ToastContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Search, Send, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';

interface QuickTindakLanjutModalProps {
  isOpen: boolean;
  onClose: () => void;
  surat: Surat;
  userCache: Map<string, UserProfile>;
  opdJabatans: Map<string, Jabatan>;
  onSuccess: () => void;
  templatList: InstruksiTemplat[]; 
}

const QuickTindakLanjutModal = ({ 
  isOpen, 
  onClose, 
  surat, 
  userCache, 
  opdJabatans,
  onSuccess,
  templatList 
}: QuickTindakLanjutModalProps) => {
  const { user, userProfile, jabatanProfile, actingJabatanProfile } = useUserAuth();
  const { addToast } = useToast();
  
  const [selectedPenerima, setSelectedPenerima] = useState<UserProfile[]>([]);
  const [instruksi, setInstruksi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStafLoading, setIsStafLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [subOpdPimpinan, setSubOpdPimpinan] = useState<UserProfile[]>([]);

  const effectiveJabatan = actingJabatanProfile || jabatanProfile;

  // Reset form saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setInstruksi('');
      setSelectedPenerima([]);
      setSearchTerm('');
      setLoading(false);
      setError('');
    }
  }, [isOpen]);

  const isTuOrAdmin = userProfile?.role === 'staf_tu' || userProfile?.role === 'admin_opd';

  // Logika fetch pimpinan Sub-OPD
  useEffect(() => {
    const fetchSubOpdLeaders = async () => {
        if (!effectiveJabatan || !userProfile || isTuOrAdmin) {
            setSubOpdPimpinan([]);
            return;
        }

        const isPimpinanInduk = (effectiveJabatan.level <= 5 && effectiveJabatan.idAtasan === null) || userProfile.role === 'super_admin';
        if (!isPimpinanInduk) {
            setSubOpdPimpinan([]);
            return;
        }

        setIsStafLoading(true);
        try {
            const opdSnapshot = await getDocs(collection(db, 'opd'));
            const allOpds: OPD[] = [];
            opdSnapshot.forEach(doc => allOpds.push({ id: doc.id, ...doc.data() } as OPD));

            const subOpdIds = allOpds
                .filter(opd => opd.idOpdInduk === effectiveJabatan.opdId)
                .map(opd => opd.id!);

            if (subOpdIds.length === 0) {
                setSubOpdPimpinan([]);
                setIsStafLoading(false);
                return;
            }

            const jabatansInSubOpds: Jabatan[] = [];
            const subOpdChunks: string[][] = [];
            for (let i = 0; i < subOpdIds.length; i += 30) {
                subOpdChunks.push(subOpdIds.slice(i, i + 30));
            }
            
            for (const chunk of subOpdChunks) {
                if (chunk.length > 0) {
                    const jabatansQuery = query(collection(db, 'jabatan'), where('opdId', 'in', chunk), where('status', '==', 'aktif'));
                    const jabatansSnapshot = await getDocs(jabatansQuery);
                    jabatansSnapshot.forEach(doc => {
                        jabatansInSubOpds.push({ id: doc.id, ...doc.data() } as Jabatan);
                    });
                }
            }
            
            const pimpinanJabatanIds: string[] = [];
            subOpdIds.forEach(subOpdId => {
                const jabatansInThisSubOpd = jabatansInSubOpds.filter(j => j.opdId === subOpdId);
                if (jabatansInThisSubOpd.length === 0) return;
                const minLevel = Math.min(...jabatansInThisSubOpd.map(j => j.level));
                const pimpinanJabatan = jabatansInThisSubOpd.find(j => j.level === minLevel);
                if (pimpinanJabatan && pimpinanJabatan.id) {
                    pimpinanJabatanIds.push(pimpinanJabatan.id);
                }
            });

            if (pimpinanJabatanIds.length === 0) {
                setSubOpdPimpinan([]);
                setIsStafLoading(false);
                return;
            }
            
            const pimpinanProfiles: UserProfile[] = [];
            const pimpinanChunks: string[][] = [];
            for (let i = 0; i < pimpinanJabatanIds.length; i += 30) {
                pimpinanChunks.push(pimpinanJabatanIds.slice(i, i + 30));
            }

            for (const chunk of pimpinanChunks) {
                if (chunk.length > 0) {
                    const usersQuery = query(collection(db, 'users'), where('jabatanId', 'in', chunk), where('status', '==', 'aktif'));
                    const usersSnapshot = await getDocs(usersQuery);
                    usersSnapshot.forEach(doc => {
                        pimpinanProfiles.push(doc.data() as UserProfile);
                    });
                }
            }
            
            setSubOpdPimpinan(pimpinanProfiles);

        } catch (err) {
            console.error("Gagal mengambil data pimpinan Sub-OPD:", err);
            setError("Gagal memuat data pimpinan Sub-OPD.");
        } finally {
            setIsStafLoading(false);
        }
    };
    fetchSubOpdLeaders();
  }, [effectiveJabatan, userProfile, isTuOrAdmin, isOpen]);

  // Logika filter bawahan
  const bawahanList = useMemo(() => {
    if (!effectiveJabatan) return [];

    const searchLower = searchTerm.toLowerCase();
    const currentTeamIds = new Set(selectedPenerima.map(p => p.jabatanId));
    
    const bawahanDiOpdSendiri = Array.from(userCache.values()).filter(user => {
        const userJabatan = opdJabatans.get(user.jabatanId);
        const userLevel = userJabatan?.level;
        const isTargetValid = userLevel && effectiveJabatan.level ? userLevel > effectiveJabatan.level : false;
        const isActive = user.status === 'aktif';
        const notSelf = user.jabatanId !== effectiveJabatan.id; 
        const notSelected = !currentTeamIds.has(user.jabatanId);
        return isTargetValid && isActive && notSelf && notSelected;
    });

    const pimpinanSubOpd = subOpdPimpinan.filter(user => !currentTeamIds.has(user.jabatanId));
    const combinedList = [...bawahanDiOpdSendiri, ...pimpinanSubOpd];

    const results = combinedList.filter(user => {
        const matchesSearch = searchTerm.length < 1 || (
            user.namaLengkap.toLowerCase().includes(searchLower) ||
            (user.namaJabatan || '').toLowerCase().includes(searchLower)
        );
        return matchesSearch;
    });

    return results.sort((a, b) => {
        const levelA = opdJabatans.get(a.jabatanId)?.level || 99;
        const levelB = opdJabatans.get(b.jabatanId)?.level || 99;
        return levelA - levelB;
    });
  }, [searchTerm, userCache, opdJabatans, effectiveJabatan, selectedPenerima, subOpdPimpinan]);
  
  const handleSelectJabatan = (user: UserProfile) => {
    setSelectedPenerima(prev => [...prev, user]);
    setSearchTerm('');
    setIsDropdownOpen(false); 
  };
  
  const handleRemoveJabatan = (uid: string) => {
    setSelectedPenerima(prev => prev.filter(u => u.uid !== uid));
  };

  const handleTemplatClick = (teks: string) => {
    setInstruksi(prev => prev ? `${prev}\n${teks}` : teks);
  };

  const handleClose = () => {
    setInstruksi('');
    setSelectedPenerima([]);
    setError('');
    setLoading(false);
    onClose();
  };

  // Logika kirim disposisi
  const sendDisposisi = async (targets: UserProfile[], instruksiText: string) => {
    if (!user || !userProfile || !effectiveJabatan) {
      setError('Sesi Anda tidak valid. Silakan muat ulang halaman.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const batch = writeBatch(db);
      const disposisiRef = doc(collection(db, 'disposisi'));
      
      const targetJabatanIds = targets.map(t => t.jabatanId);
      
      const disposisiData: Partial<Disposisi> = {
        suratId: surat.id,
        dariJabatanId: effectiveJabatan.id!,
        dariJabatanNama: effectiveJabatan.namaJabatan,
        opdId: effectiveJabatan.opdId,
        kepadaJabatanId: targetJabatanIds,
        instruksi: instruksiText,
        tanggalDisposisi: serverTimestamp() as Timestamp,
        penerimaDiterima: [],
        status: 'Terkirim', 
        isInformational: false,
      };
      
      batch.set(disposisiRef, disposisiData);
      
      const suratRef = doc(db, 'surat', surat.id!);
      const suratUpdates: any = {
          terlibatJabatanIds: arrayUnion(...targetJabatanIds) // [FIX CRITICAL] Memastikan penerima dapat hak akses
      };
      
      if (surat.statusPenyelesaian === 'Baru') {
        suratUpdates.statusPenyelesaian = 'Didisposisikan';
      }
      batch.update(suratRef, suratUpdates);
      
      const actorName = `${userProfile.namaLengkap} (${effectiveJabatan.namaJabatan})`;
      const targetNames = targets.map(t => t.namaLengkap).join(', ');

      await logActivity(
        surat.id, // suratId
        actorName, // actorName
        "Disposisi dikirim (Cepat)", // action
        `Kepada: ${targetNames}. Instruksi: ${instruksiText}` // details
      );

      for (const userToNotify of targets) {
        if (userToNotify && userToNotify.uid && userToNotify.uid !== user.uid) {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: userToNotify.uid, 
            userNip: userToNotify.nip,
            message: `Disposisi baru dari ${actorName}: "${surat.perihal}"`,
            link: `/dashboard/surat/${surat.id!}`, 
            isRead: false, 
            timestamp: serverTimestamp() as Timestamp,
          });
        }
      }

      await batch.commit();

      addToast(`Instruksi telah dikirim kepada ${targets.length} penerima.`, "success");
      onSuccess();
      handleClose();

    } catch (err: any) {
      console.error("Gagal mengirim disposisi: ", err);
      setError(`Gagal mengirim disposisi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPenerima.length === 0) {
      setError('Pilih minimal satu penerima disposisi.');
      return;
    }
    if (!instruksi.trim()) {
      setError('Instruksi tidak boleh kosong.');
      return;
    }
    
    sendDisposisi(selectedPenerima, instruksi);
  };

  if (!isOpen || !surat) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl bg-card border-border p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Tindak Lanjut Cepat</DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-2">
            Surat: <span className="font-semibold text-foreground">{surat.perihal}</span>
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="instruksi-cepat">Instruksi Tindak Lanjut</Label>
                
                <div className="flex flex-wrap gap-2 my-2">
                    {templatList.length > 0 ? (
                        templatList.map(t => (
                          <Button key={t.id} type="button" variant="secondary" size="sm" onClick={() => handleTemplatClick(t.teksInstruksi)}>
                            {t.teksInstruksi}
                          </Button>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground">Tidak ada templat instruksi.</p>
                    )}
                </div>
                
                <Textarea
                  id="instruksi-cepat"
                  value={instruksi}
                  onChange={(e) => setInstruksi(e.target.value)}
                  placeholder="Tuliskan instruksi Anda..."
                  className="mt-1"
                  rows={4}
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="search-penerima-cepat">Pilih Penerima (Bawahan)</Label>
                
                <div className="flex flex-wrap gap-2 my-2">
                  {selectedPenerima.map(user => (
                    <Badge key={user.uid} variant="secondary" className="flex items-center gap-1.5 py-1 px-2">
                      {user.namaLengkap}
                      <button type="button" onClick={() => handleRemoveJabatan(user.uid)} className="hover:text-red-500">
                        <X size={14} />
                      </button>
                    </Badge>
                  ))}
                </div>

                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        type="text"
                        id="search-penerima-cepat"
                        placeholder={isStafLoading ? "Memuat..." : "Cari nama bawahan..."}
                        value={searchTerm} 
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setIsDropdownOpen(e.target.value.length > 0);
                        }}
                        className="pl-10"
                        disabled={isStafLoading}
                        autoComplete="off"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {isStafLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent 
                     onOpenAutoFocus={(e) => e.preventDefault()}
                     className="w-[var(--radix-popover-trigger-width)] p-0"
                  >
                     <CommandList>
                          {isStafLoading && <CommandEmpty>Mencari...</CommandEmpty>}
                          {!isStafLoading && bawahanList.length > 0 ? (
                              bawahanList.map(u => (
                                  <CommandItem
                                    key={u.uid}
                                    value={u.namaLengkap} 
                                    onSelect={() => handleSelectJabatan(u)}
                                    className="cursor-pointer"
                                  >
                                      <div>
                                        <p className="font-semibold text-sm">{u.namaLengkap}</p>
                                        <p className="text-xs text-muted-foreground">{u.namaJabatan}</p>
                                      </div>
                                  </CommandItem>
                              ))
                          ) : (
                            <CommandEmpty>{searchTerm.length < 1 ? 'Ketik min 1 huruf' : 'Tidak ditemukan.'}</CommandEmpty>
                          )}
                       </CommandList>
                  </PopoverContent>
                </Popover>

              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4 p-4 border-t border-border flex-shrink-0 bg-muted/50">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading || isStafLoading || selectedPenerima.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Tindak Lanjut
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
};

export default QuickTindakLanjutModal;