/**
 * Directory: src/app/dashboard/ruang-kerja/components/InlineDisposisiForm.tsx
 * Status: 100% SINKRON DENGAN DETAIL SURAT (SSOT)
 * Deskripsi: 
 * - [FIX] Menambahkan deteksi 'isPemberitahuanMode' agar parameter 'isInformational'
 * terkirim dengan benar ke fungsi kirimDisposisi, sehingga output database 
 * IDENTIK dengan form di halaman Detail Surat.
 */

"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Surat, Disposisi, UserProfile, Jabatan, InstruksiTemplat } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Loader2, Send, X, Search, Sparkles, UserCheck } from 'lucide-react';
import { useBawahanList } from '@/app/dashboard/hooks/useBawahanList';
import { useSuratActions } from '@/app/dashboard/hooks/useSuratActions'; 
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command';

interface InlineDisposisiFormProps {
  surat: Surat;
  onSuccess: () => void;
  onCancel?: () => void;            
  onSelfDisposition?: () => void;   
  userCache: Map<string, UserProfile>;
  opdJabatans: Map<string, Jabatan>;
  templatList: InstruksiTemplat[];
}

export default function InlineDisposisiForm({
  surat, onSuccess, onCancel, onSelfDisposition, userCache, opdJabatans, templatList
}: InlineDisposisiFormProps) {
  const { userProfile, jabatanProfile, actingJabatanProfile } = useUserAuth();
  const effectiveJabatan = actingJabatanProfile || jabatanProfile;
  const { addToast } = useToast();

  const { kirimDisposisi, isProcessing } = useSuratActions();

  const [instruksi, setInstruksi] = useState('');
  const [selectedPenerima, setSelectedPenerima] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { bawahanList, isLoading: isStafLoading } = useBawahanList(userCache, opdJabatans);

  // [SINKRONISASI] Deteksi apakah ini surat pemberitahuan
  const isPemberitahuanMode = surat.jenisSurat === 'Pemberitahuan';

  // [SINKRONISASI] Otomatis isi default text jika ini pemberitahuan
  useEffect(() => {
    if (isPemberitahuanMode && !instruksi) {
      setInstruksi("Untuk diketahui dan dipedomani.");
    }
  }, [isPemberitahuanMode]);

  const filteredBawahan = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const currentTeamIds = new Set(selectedPenerima.map(p => p.jabatanId));
    return bawahanList.filter(u => {
      const notSelected = !currentTeamIds.has(u.jabatanId);
      const matchesSearch = searchTerm.length < 1 || (
        u.namaLengkap.toLowerCase().includes(searchLower) ||
        (u.namaJabatan || '').toLowerCase().includes(searchLower)
      );
      return notSelected && matchesSearch;
    });
  }, [bawahanList, searchTerm, selectedPenerima]);

  const handleSelectJabatan = (u: UserProfile) => {
    setSelectedPenerima(prev => [...prev, u]);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };
  
  const handleRemoveJabatan = (uid: string) => setSelectedPenerima(prev => prev.filter(u => u.uid !== uid));

  const submitDisposisi = async () => {
    if (selectedPenerima.length === 0) { addToast('Pilih minimal satu penerima', 'error'); return; }
    if (!instruksi.trim()) { addToast('Instruksi tidak boleh kosong', 'error'); return; }
    
    // --- [SINKRONISASI] EKSEKUSI TERPUSAT DENGAN PARAMETER LENGKAP ---
    const success = await kirimDisposisi(
        surat, 
        selectedPenerima, 
        instruksi,
        undefined, // batas waktu (tidak ada di inline)
        false,     // isRevising
        undefined, // oldDisposisiId
        isPemberitahuanMode // <-- FIX: Ini yang bikin output sama dengan Detail Surat!
    );
    
    if (success) {
        onSuccess();
    }
  };

  const handleAskAi = async () => {
    if (!surat || bawahanList.length === 0) return;
    setIsAiLoading(true);
    try {
        const simplified = bawahanList.map(b => ({ jabatanId: b.jabatanId, namaJabatan: b.namaJabatan, namaLengkap: b.namaLengkap }));
        const response = await fetch('/api/ai/suggest-disposition', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ surat: { perihal: surat.perihal, pengirim: surat.pengirim, jenisSurat: surat.jenisSurat }, bawahanList: simplified })
        });
        const result = await response.json();
        if (result.success && result.suggestedInstruction) {
            setInstruksi(result.suggestedInstruction);
            if (result.suggestedRecipients) {
                const suggested = bawahanList.filter(b => result.suggestedRecipients.includes(b.jabatanId));
                setSelectedPenerima(suggested);
            }
        }
    } catch (err) { /* silent fail */ } 
    finally { setIsAiLoading(false); }
  };

  return (
    <div className="bg-background rounded-lg border border-border overflow-hidden mt-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
                <Label className="text-xs text-muted-foreground">Instruksi Disposisi</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAskAi} disabled={isAiLoading || isStafLoading} className="h-6 px-2 text-[10px] text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/20">
                    {isAiLoading ? <Loader2 size={10} className="animate-spin mr-1"/> : <Sparkles size={10} className="mr-1"/>} Saran AI
                </Button>
            </div>
            {templatList?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                  {templatList.map(t => (
                      <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-muted text-[10px] py-0 border-border/50 text-muted-foreground hover:text-foreground" onClick={() => setInstruksi(prev => prev ? `${prev}\n${t.teksInstruksi}` : t.teksInstruksi)}>
                          {t.teksInstruksi}
                      </Badge>
                  ))}
              </div>
            )}
            <Textarea 
                placeholder="Instruksi untuk bawahan..." 
                value={instruksi} onChange={(e) => setInstruksi(e.target.value)}
                className="text-sm min-h-[80px] bg-background resize-none focus-visible:ring-1"
                disabled={isProcessing}
            />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block text-muted-foreground">Pilih Penerima (Bawahan)</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedPenerima.map(u => (
                <Badge key={u.uid} variant="secondary" className="flex items-center gap-1 py-0.5 px-2 text-xs">
                  {u.namaLengkap} <X size={12} className="cursor-pointer hover:text-red-500 ml-1" onClick={() => handleRemoveJabatan(u.uid)} />
                </Badge>
              ))}
            </div>
            <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input placeholder={isStafLoading ? "Memuat..." : "Cari bawahan..."} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} className="pl-8 h-8 text-sm" disabled={isStafLoading || isProcessing} autoComplete="off" />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50" align="start">
                  <Command>
                    <CommandList>
                        {isStafLoading && <CommandEmpty>Mencari...</CommandEmpty>}
                        {!isStafLoading && filteredBawahan.length > 0 ? (
                            filteredBawahan.map(u => (
                                <CommandItem key={u.uid} value={u.namaLengkap} onSelect={() => handleSelectJabatan(u)} className="cursor-pointer px-3 py-2">
                                    <div className="flex flex-col"><span className="text-sm font-medium">{u.namaLengkap}</span><span className="text-[10px] text-muted-foreground">{u.namaJabatan}</span></div>
                                </CommandItem>
                            ))
                        ) : <CommandEmpty>Tidak ditemukan.</CommandEmpty>}
                    </CommandList>
                  </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-border mt-4">
            {onCancel && (
                <Button variant="outline" size="sm" onClick={onCancel} disabled={isProcessing} className="h-8">
                    Batal
                </Button>
            )}
            {onSelfDisposition && (
                <Button variant="secondary" size="sm" onClick={onSelfDisposition} disabled={isProcessing} className="h-8">
                    <UserCheck size={14} className="mr-1.5" /> Tindak Lanjuti Sendiri
                </Button>
            )}
            <Button size="sm" onClick={submitDisposisi} disabled={isProcessing || selectedPenerima.length === 0 || !instruksi.trim()} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
                {isProcessing ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
                {isPemberitahuanMode ? 'Kirim Pemberitahuan' : 'Kirim Disposisi'}
            </Button>
          </div>
      </div>
    </div>
  );
}