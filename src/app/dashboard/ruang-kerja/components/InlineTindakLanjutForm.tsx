/**
 * Directory: src/app/dashboard/ruang-kerja/components/InlineTindakLanjutForm.tsx
 * Status: 100% SINKRON DENGAN DETAIL SURAT (SSOT)
 * Deskripsi: 
 * - [FIX] Memperbaiki bug feed tidak hilang saat diteruskan.
 * - Menggabungkan `kirimTindakLanjut` otomatis (untuk menutup disposisi pengirim) 
 * dengan `kirimDisposisi` (untuk membuka disposisi penerima) secara berurutan.
 */

"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Surat, Disposisi, UserProfile, Jabatan, InstruksiTemplat } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Loader2, CheckCircle, Send, X, Search, Sparkles, CornerDownRight } from 'lucide-react';
import { updateLogbook } from '@/lib/logbookUtils';
import { useBawahanList } from '@/app/dashboard/hooks/useBawahanList';
import { useSuratActions, TindakLanjutPayload } from '@/app/dashboard/hooks/useSuratActions'; // IMPORT SSOT
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command';

interface InlineTindakLanjutFormProps {
  surat: Surat;
  disposisi: Disposisi;
  onSuccess: () => void;
  userCache: Map<string, UserProfile>;
  opdJabatans: Map<string, Jabatan>;
  templatList: InstruksiTemplat[];
}

export default function InlineTindakLanjutForm({
  surat, disposisi, onSuccess, userCache, opdJabatans, templatList
}: InlineTindakLanjutFormProps) {
  const { userProfile, jabatanProfile, actingJabatanProfile } = useUserAuth();
  const effectiveJabatan = actingJabatanProfile || jabatanProfile;
  const { addToast } = useToast();
  
  // MENGGUNAKAN SSOT HOOK
  const { kirimTindakLanjut, kirimDisposisi, isProcessing } = useSuratActions();
  
  // Local state untuk mencegah double-click saat eksekusi berantai
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  const [activeTab, setActiveTab] = useState<'lapor' | 'teruskan'>('lapor');
  const [laporanText, setLaporanText] = useState('');

  const { bawahanList, isLoading: isStafLoading } = useBawahanList(userCache, opdJabatans);
  const [instruksi, setInstruksi] = useState('');
  const [selectedPenerima, setSelectedPenerima] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // [SINKRONISASI] Deteksi tipe surat
  const isPemberitahuanMode = surat.jenisSurat === 'Pemberitahuan';

  useEffect(() => {
    if (isPemberitahuanMode && activeTab === 'teruskan' && !instruksi) {
      setInstruksi("Untuk diketahui dan dipedomani.");
    }
  }, [isPemberitahuanMode, activeTab]);

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

  // --- EKSEKUSI SSOT UNTUK LAPOR SELESAI ---
  const submitLaporan = async () => {
    if (!laporanText.trim()) { addToast('Laporan tidak boleh kosong', 'error'); return; }
    if (!userProfile || !effectiveJabatan) return;
    
    setIsSubmittingLocal(true);
    try {
        const payload: TindakLanjutPayload = {
            isiLaporan: laporanText,
            judulLaporan: 'Selesai',
            warnaLabel: 'green',
            checklist: []
        };

        // isFinalAction: true akan menutup status surat dan disposisi
        const success = await kirimTindakLanjut(surat, disposisi, payload, undefined, { isFinalAction: true });
        
        if (success) {
          const logbookEntry = {
            id: `tl_${disposisi.id}_${Date.now()}`,
            deskripsi: `Menindaklanjuti disposisi surat: "${surat.perihal}". Laporan: ${laporanText}`,
            selesai: true,
            tugasTerkaitId: surat.id!,
            tugasTerkaitJudul: surat.perihal,
          };
          await updateLogbook(userProfile.uid, userProfile.opdId, new Date(), logbookEntry);
          onSuccess();
        }
    } finally {
        setIsSubmittingLocal(false);
    }
  };

  // --- EKSEKUSI SSOT UNTUK TERUSKAN DISPOSISI ---
  const submitTeruskan = async () => {
    if (selectedPenerima.length === 0) { addToast('Pilih minimal satu penerima', 'error'); return; }
    if (!instruksi.trim()) { addToast('Instruksi tidak boleh kosong', 'error'); return; }
    if (!userProfile || !effectiveJabatan) return;
    
    setIsSubmittingLocal(true);
    try {
        const targetNames = selectedPenerima.map(t => t.namaLengkap).join(', ');

        // 1. [SINKRONISASI FEED] Tutup disposisi milik pengguna ini terlebih dahulu
        // Ini WAJIB agar status disposisinya berubah jadi 'Selesai' dan item menghilang dari Feed
        const autoPayload: TindakLanjutPayload = {
            isiLaporan: `Telah diteruskan kepada: ${targetNames}.\nInstruksi: ${instruksi}`,
            judulLaporan: 'Diteruskan',
            warnaLabel: 'blue',
            checklist: []
        };

        // isFinalAction: false karena ini hanya menutup disposisi personal, bukan menutup suratnya secara total
        const tlSuccess = await kirimTindakLanjut(surat, disposisi, autoPayload, undefined, { isFinalAction: false });

        if (tlSuccess) {
            // 2. SSOT: Setelah tertutup, kirim disposisi baru ke bawahan
            const dispSuccess = await kirimDisposisi(
                surat,
                selectedPenerima,
                instruksi,
                undefined,         
                false,             
                disposisi.id,      // Sambungkan rantai
                isPemberitahuanMode
            );

            if (dispSuccess) {
              const logbookEntry = {
                  id: `tl_fwd_${disposisi.id}_${Date.now()}`,
                  deskripsi: `Meneruskan disposisi surat "${surat.perihal}" kepada: ${targetNames}`,
                  selesai: true,
                  tugasTerkaitId: surat.id!,
                  tugasTerkaitJudul: surat.perihal,
              };
              await updateLogbook(userProfile.uid, userProfile.opdId, new Date(), logbookEntry);
              
              onSuccess();
            }
        }
    } catch (error) {
        addToast('Terjadi kesalahan saat meneruskan disposisi', 'error');
    } finally {
        setIsSubmittingLocal(false);
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
    } catch (err) { /* silent fail for AI */ } 
    finally { setIsAiLoading(false); }
  };

  const isFormDisabled = isProcessing || isSubmittingLocal;

  return (
    <div className="bg-background rounded-lg border border-border overflow-hidden mt-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <div className="bg-muted/50 border-b border-border p-2">
            <TabsList className="grid w-full grid-cols-2 bg-transparent gap-1 p-0 h-auto">
              <TabsTrigger value="lapor" className="text-xs h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                  <CheckCircle size={14} className="mr-1.5" /> Lapor Selesai
              </TabsTrigger>
              <TabsTrigger value="teruskan" disabled={bawahanList.length === 0} title={bawahanList.length === 0 ? "Anda tidak memiliki bawahan" : ""} className="text-xs h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md disabled:opacity-40">
                  <CornerDownRight size={14} className="mr-1.5" /> Teruskan Disposisi
              </TabsTrigger>
            </TabsList>
        </div>

        <div className="p-4">
            {/* TAB LAPOR SELESAI */}
            <TabsContent value="lapor" className="mt-0 outline-none space-y-3">
               <div>
                  <Label className="text-xs mb-1.5 block text-muted-foreground">Catatan / Laporan Tindak Lanjut</Label>
                  <Textarea 
                      placeholder="Ketik laporan hasil pengerjaan atau penyelesaian Anda di sini..." 
                      value={laporanText} onChange={(e) => setLaporanText(e.target.value)}
                      className="text-sm min-h-[100px] bg-background resize-none focus-visible:ring-1"
                      disabled={isFormDisabled}
                  />
               </div>
               <div className="flex justify-end">
                  <Button size="sm" onClick={submitLaporan} disabled={isFormDisabled || !laporanText.trim()} className="h-8 bg-green-600 hover:bg-green-700 text-white">
                     {isFormDisabled ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />}
                     Kirim Laporan & Selesai
                  </Button>
               </div>
            </TabsContent>

            {/* TAB TERUSKAN DISPOSISI */}
            <TabsContent value="teruskan" className="mt-0 outline-none space-y-4">
               <div>
                  <div className="flex justify-between items-center mb-1.5">
                      <Label className="text-xs text-muted-foreground">Instruksi ke Bawahan</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleAskAi} disabled={isAiLoading || isStafLoading || isFormDisabled} className="h-6 px-2 text-[10px] text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/20">
                          {isAiLoading ? <Loader2 size={10} className="animate-spin mr-1"/> : <Sparkles size={10} className="mr-1"/>} Saran AI
                      </Button>
                  </div>
                  {templatList.length > 0 && (
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
                      disabled={isFormDisabled}
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
                        <Input placeholder={isStafLoading ? "Memuat..." : "Cari bawahan..."} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} className="pl-8 h-8 text-sm" disabled={isStafLoading || isFormDisabled} autoComplete="off" />
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

               <div className="flex justify-end pt-2 border-t border-border mt-4">
                  <Button size="sm" onClick={submitTeruskan} disabled={isFormDisabled || selectedPenerima.length === 0 || !instruksi.trim()} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
                     {isFormDisabled ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
                     {isPemberitahuanMode ? 'Teruskan Pemberitahuan' : 'Kirim Disposisi Lanjutan'}
                  </Button>
               </div>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}