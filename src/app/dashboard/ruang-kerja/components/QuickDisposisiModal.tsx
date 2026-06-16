/**
 * Directory: src/app/dashboard/ruang-kerja/components/QuickDisposisiModal.tsx
 * Status: 100% SINKRON DENGAN DETAIL SURAT (SSOT)
 * Deskripsi: 
 * - [FIX] Menambahkan passing parameter isPemberitahuanMode agar ketika modal 
 * ini digunakan, mutasi database menghasilkan output yang persis sama dengan 
 * disposisi via halaman Detail Surat.
 */

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Surat, Disposisi, UserProfile, Jabatan, InstruksiTemplat } from '@/types';
import { useToast } from '@/context/ToastContext';
import { useSuratActions } from '@/app/dashboard/hooks/useSuratActions';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, X, Sparkles, Save } from 'lucide-react';
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
  CommandInput
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { useBawahanList } from '@/app/dashboard/hooks/useBawahanList';

interface QuickDisposisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  surat: Surat;
  sourceDisposisi?: Disposisi | null; 
  userCache: Map<string, UserProfile>;
  opdJabatans: Map<string, Jabatan>;
  onSuccess: () => void;
  templatList: InstruksiTemplat[]; 
}

const QuickDisposisiModal = ({ 
  isOpen, 
  onClose, 
  surat, 
  sourceDisposisi, 
  userCache, 
  opdJabatans,
  onSuccess,
  templatList 
}: QuickDisposisiModalProps) => {
  const { addToast } = useToast(); 
  const { bawahanList, isLoading: isStafLoading, error: bawahanError } = useBawahanList(userCache, opdJabatans);
  
  const { kirimDisposisi, isProcessing } = useSuratActions();

  const [selectedPenerima, setSelectedPenerima] = useState<UserProfile[]>([]);
  const [instruksi, setInstruksi] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const storageKey = surat?.id ? `disposisi_draft_${surat.id}` : '';

  // [SINKRONISASI] Deteksi tipe surat
  const isPemberitahuanMode = surat?.jenisSurat === 'Pemberitahuan';

  useEffect(() => {
    if (isOpen && storageKey) {
      setSelectedPenerima([]);
      setSearchTerm('');
      setIsAiLoading(false);

      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
          setInstruksi(savedDraft);
      } else if (isPemberitahuanMode) {
          // [SINKRONISASI] Set default instruction jika pemberitahuan
          setInstruksi("Untuk diketahui dan dipedomani.");
      } else {
          setInstruksi('');
      }
    }
  }, [isOpen, storageKey, isPemberitahuanMode]);

  useEffect(() => {
    if (isOpen && storageKey) {
        if (instruksi) localStorage.setItem(storageKey, instruksi);
        else localStorage.removeItem(storageKey);
    }
  }, [instruksi, isOpen, storageKey]);

  const filteredBawahan = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const currentTeamIds = new Set(selectedPenerima.map(p => p.jabatanId));
    
    return bawahanList.filter(user => {
        const notSelected = !currentTeamIds.has(user.jabatanId);
        const matchesSearch = searchTerm.length < 1 || (
            user.namaLengkap.toLowerCase().includes(searchLower) ||
            (user.namaJabatan || '').toLowerCase().includes(searchLower)
        );
        return notSelected && matchesSearch;
    });
  }, [bawahanList, searchTerm, selectedPenerima]);

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
    onClose();
  };

  const handleAskAi = async () => {
    if (!surat || bawahanList.length === 0) { addToast("Data tidak cukup untuk analisis AI.", "error"); return; }
    setIsAiLoading(true);

    try {
        const simplifiedBawahan = bawahanList.map(b => ({
            jabatanId: b.jabatanId,
            namaJabatan: b.namaJabatan,
            namaLengkap: b.namaLengkap
        }));

        const response = await fetch('/api/ai/suggest-disposition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                surat: { perihal: surat.perihal, pengirim: surat.pengirim, jenisSurat: surat.jenisSurat },
                bawahanList: simplifiedBawahan
            })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Gagal mendapatkan saran AI.');

        if (result.success) {
            if (result.suggestedInstruction) setInstruksi(result.suggestedInstruction);
            if (result.suggestedRecipients && Array.isArray(result.suggestedRecipients)) {
                const suggestedProfiles = bawahanList.filter(b => result.suggestedRecipients.includes(b.jabatanId));
                setSelectedPenerima(suggestedProfiles);
                if (suggestedProfiles.length > 0) addToast(`AI menyarankan: ${suggestedProfiles[0].namaLengkap}`, "success");
            }
        }
    } catch (err: any) {
        addToast(err.message || "Gagal memproses saran AI.", "error");
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPenerima.length === 0) { addToast('Pilih minimal satu penerima disposisi.', 'error'); return; }
    if (!instruksi.trim()) { addToast('Instruksi tidak boleh kosong.', 'error'); return; }
    
    // --- [SINKRONISASI] EKSEKUSI TERPUSAT ---
    const success = await kirimDisposisi(
        surat, 
        selectedPenerima, 
        instruksi, 
        undefined,           // batas waktu default
        false,               // bukan mode revisi utama
        sourceDisposisi?.id, // teruskan parent disposisi jika ada
        isPemberitahuanMode  // <-- FIX CRITICAL: Samakan dengan output Detail Surat
    );

    if (success) {
        if (storageKey) localStorage.removeItem(storageKey);
        onSuccess();
        handleClose();
    }
  };

  if (!isOpen || !surat) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl bg-card border-border p-0 gap-0 z-50">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{isPemberitahuanMode ? 'Pemberitahuan Cepat' : 'Disposisi Cepat'}</DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-2">
            Surat: <span className="font-semibold text-foreground">{surat.perihal}</span>
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="instruksi-cepat">Instruksi Disposisi</Label>
                    <Button
                        type="button" variant="ghost" size="sm"
                        onClick={handleAskAi}
                        disabled={isAiLoading || isStafLoading}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    >
                        {isAiLoading ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>}
                        {isAiLoading ? 'Menganalisis...' : 'Saran AI'}
                    </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-2">
                    {templatList.length > 0 ? templatList.map(t => (
                          <Button key={t.id} type="button" variant="secondary" size="sm" onClick={() => handleTemplatClick(t.teksInstruksi)}>{t.teksInstruksi}</Button>
                    )) : <p className="text-xs text-muted-foreground">Tidak ada templat instruksi.</p>}
                </div>
                
                <Textarea
                  id="instruksi-cepat"
                  value={instruksi}
                  onChange={(e) => setInstruksi(e.target.value)}
                  placeholder="Tuliskan instruksi Anda..."
                  className="mt-1" rows={4}
                  disabled={isProcessing || isAiLoading}
                />
                <div className="flex justify-end mt-1">
                     <span className="text-[10px] text-muted-foreground flex items-center"><Save size={10} className="mr-1"/> Draf tersimpan otomatis</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="search-penerima-cepat">Pilih Penerima (Bawahan)</Label>
                <div className="flex flex-wrap gap-2 my-2">
                  {selectedPenerima.map(user => (
                    <Badge key={user.uid} variant="secondary" className="flex items-center gap-1.5 py-1 px-2">
                      {user.namaLengkap}
                      <button type="button" onClick={() => handleRemoveJabatan(user.uid)} className="hover:text-red-500"><X size={14} /></button>
                    </Badge>
                  ))}
                </div>

                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        type="text" id="search-penerima-cepat"
                        placeholder={isStafLoading ? "Memuat..." : "Cari nama bawahan..."}
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(e.target.value.length > 0); }}
                        className="pl-10" disabled={isStafLoading || isProcessing} autoComplete="off"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {isStafLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} className="w-[var(--radix-popover-trigger-width)] p-0 z-[60]">
                     <Command>
                       <CommandInput placeholder="Cari nama..." value={searchTerm} onValueChange={setSearchTerm} />
                       <CommandList>
                            {isStafLoading && <CommandEmpty>Mencari...</CommandEmpty>}
                            {!isStafLoading && filteredBawahan.length > 0 ? (
                                filteredBawahan.map(u => (
                                    <CommandItem key={u.uid} value={u.namaLengkap} onSelect={() => handleSelectJabatan(u)} className="cursor-pointer">
                                        <div><p className="font-semibold text-sm">{u.namaLengkap}</p><p className="text-xs text-muted-foreground">{u.namaJabatan}</p></div>
                                    </CommandItem>
                                ))
                            ) : (
                              <CommandEmpty>{searchTerm.length < 1 ? 'Ketik min 1 huruf' : 'Tidak ditemukan.'}</CommandEmpty>
                            )}
                       </CommandList>
                     </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {bawahanError && <Alert variant="destructive"><AlertDescription>{bawahanError}</AlertDescription></Alert>}
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4 p-4 border-t border-border flex-shrink-0 bg-muted/50">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>Batal</Button>
            <Button type="submit" disabled={isProcessing || isStafLoading || selectedPenerima.length === 0}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isPemberitahuanMode ? 'Kirim Pemberitahuan' : 'Kirim Disposisi'}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
};

export default QuickDisposisiModal;
