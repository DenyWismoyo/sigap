// Lokasi File: src/app/dashboard/notulensi/components/NotulensiFormModal.tsx
// [HISTORY UPDATE]
// - [PERBAIKAN CACHE] Menambahkan logika pembacaan localStorage manual saat inisialisasi
//   untuk mengatasi masalah SSR (Server Side Rendering) di mana draftIsi mungkin kosong di awal.
// - Memastikan draf tersimpan real-time saat mengetik.
// - Membersihkan draf otomatis setelah simpan berhasil.

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { NotulensiRapat, OpdConfig } from '@/types';
import { Loader2, Sparkles, Lock, Send, Eraser } from 'lucide-react'; // Tambah Icon Eraser
import { useLocalStorage } from '@/app/dashboard/hooks/useLocalStorage';

// --- Impor Library Eksternal ---
import dynamic from 'next/dynamic';
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert"; // [TAMBAHAN] Untuk notifikasi draft

interface NotulensiFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any, isEditing: boolean) => Promise<void>;
    notulensiToEdit: NotulensiRapat | null;
    opdConfig: OpdConfig | null;
    isProcessing: boolean;
    theme: 'light' | 'dark';
    initialData?: any;
}

export default function NotulensiFormModal({ 
    isOpen, 
    onClose, 
    onSave, 
    notulensiToEdit, 
    opdConfig, 
    isProcessing, 
    theme, 
    initialData 
}: NotulensiFormModalProps) {
    const { userProfile } = useUserAuth();
    const [formData, setFormData] = useState<any>(null);
    const [aiInput, setAiInput] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false); // Indikator visual draft dimuat
    
    // Hook Cache (Key harus unik)
    const [draftIsi, setDraftIsi, removeDraftIsi] = useLocalStorage<string>('notulensi_draft_isi', '');

    const isAiNotulensiEnabled = useMemo(() => {
        if (userProfile?.role === 'super_admin') return true;
        return opdConfig?.features?.aiNotulensi ?? false;
    }, [opdConfig, userProfile]);

    useEffect(() => {
        if (isOpen) {
            // Reset indikator draft
            setDraftLoaded(false);

            if (notulensiToEdit) {
                // --- MODE EDIT: Gunakan data database ---
                setFormData({
                    ...notulensiToEdit,
                    tanggalRapat: notulensiToEdit.tanggalRapat.toDate().toISOString().split('T')[0],
                });
            } else {
                // --- MODE BARU: Gunakan Initial Data + Cek Cache ---
                
                // [FIX SSR] Baca manual dari localStorage untuk memastikan data terambil
                // meskipun hook useLocalStorage belum sempat sinkronisasi (hydration).
                let cachedContent = draftIsi;
                if (!cachedContent && typeof window !== 'undefined') {
                    try {
                        const raw = window.localStorage.getItem('notulensi_draft_isi');
                        if (raw) cachedContent = JSON.parse(raw);
                    } catch (e) { console.error("Gagal baca cache manual", e); }
                }

                // Prioritas Isi: 
                // 1. Data dari URL (initialData.isiNotulensi) - misal dari Quick Action Agenda
                // 2. Cache Draft (cachedContent) - ketikan yang belum disimpan
                // 3. Kosong
                const isiKonten = initialData?.isiNotulensi || cachedContent || '';
                
                if (!initialData?.isiNotulensi && cachedContent) {
                    setDraftLoaded(true); // Beri tahu user bahwa draft dimuat
                }

                setFormData({
                    judulRapat: initialData?.judulRapat || '', 
                    tanggalRapat: initialData?.tanggalRapat || new Date().toISOString().split('T')[0], 
                    pemimpinRapat: initialData?.pemimpinRapat || '',
                    notulis: initialData?.notulis || userProfile?.namaLengkap || '', 
                    peserta: initialData?.peserta || '', 
                    isiNotulensi: isiKonten
                });
            }
            setAiInput('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, notulensiToEdit, userProfile, initialData]); // Hapus draftIsi dari depedency agar tidak reset saat mengetik

    const handleAiDraft = async () => {
        if (!aiInput.trim()) {
            alert("Masukkan catatan rapat di kolom AI Assistant terlebih dahulu.");
            return;
        }
        setIsAiProcessing(true);
        try {
            const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY; 
            if (!apiKey) throw new Error("API Key for AI service is not configured.");
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            
            const systemPrompt = `Anda adalah seorang notulis rapat profesional. Susun catatan mentah berikut menjadi notulensi formal. Gunakan format Markdown (Bold dan List).
            
            Struktur Wajib:
            **Tanggal:** [Isi]
            **Pimpinan:** [Isi]
            **Peserta:** [List]
            ---
            **Agenda:** [Isi]
            **Pembahasan:** [Poin-poin]
            **Kesimpulan:** [Poin-poin]
            **Tindak Lanjut (Action Items):**
            - [ ] [Item Tindak Lanjut]
            `;

            const payload = {
                contents: [{ parts: [{ text: `${systemPrompt}\n\nCatatan Rapat:\n${aiInput}` }] }],
            };
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`AI Error: ${response.status}`);
            
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) {
                setFormData((prev: any) => ({ ...prev, isiNotulensi: text }));
                // Simpan hasil AI ke cache draft juga
                if (!notulensiToEdit) {
                    setDraftIsi(text);
                }
            } else {
                throw new Error("Gagal mendapatkan respons dari AI.");
            }

        } catch (error: any) {
            console.error(error);
            alert(`Gagal: ${error.message}`);
        } finally {
            setIsAiProcessing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData, !!notulensiToEdit);
        
        // Hapus cache HANYA jika penyimpanan berhasil dan ini mode buat baru
        if (!notulensiToEdit) {
            removeDraftIsi();
            setDraftIsi(''); // Pastikan state lokal hook juga reset
        }
    };
    
    const handleClearDraft = () => {
        if (confirm("Hapus draft tulisan ini? Anda harus mengetik ulang.")) {
            setFormData({ ...formData, isiNotulensi: '' });
            removeDraftIsi();
            setDraftIsi('');
            setDraftLoaded(false);
        }
    };
    
    if (!isOpen || !formData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle>{notulensiToEdit ? 'Edit' : 'Buat'} Notulensi</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh] gap-4">
                    <ScrollArea className="flex-1 overflow-y-auto pr-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Kolom Kiri: Metadata */}
                            <div className="space-y-4">
                                <div><Label htmlFor="judulRapat">Judul Rapat</Label><Input id="judulRapat" type="text" value={formData.judulRapat} onChange={e => setFormData({...formData, judulRapat: e.target.value})} required placeholder="Rapat Koordinasi..."/></div>
                                <div><Label htmlFor="tanggalRapat">Tanggal Rapat</Label><Input id="tanggalRapat" type="date" value={formData.tanggalRapat} onChange={e => setFormData({...formData, tanggalRapat: e.target.value})} required/></div>
                                <div><Label htmlFor="pemimpinRapat">Pemimpin Rapat</Label><Input id="pemimpinRapat" type="text" value={formData.pemimpinRapat} onChange={e => setFormData({...formData, pemimpinRapat: e.target.value})} required/></div>
                                <div><Label htmlFor="notulis">Notulis</Label><Input id="notulis" type="text" value={formData.notulis} onChange={e => setFormData({...formData, notulis: e.target.value})} required/></div>
                                <div><Label htmlFor="peserta">Peserta (pisahkan baris)</Label><Textarea id="peserta" value={formData.peserta} onChange={e => setFormData({...formData, peserta: e.target.value})} rows={4} required placeholder="Budi Santoso&#10;Siti Aminah"/></div>
                            </div>
                            
                            {/* Kolom Kanan: AI & Editor */}
                            <div className="space-y-4">
                                {/* AI Assistant */}
                                <div className={`p-3 border rounded-lg ${isAiNotulensiEnabled ? 'border-primary/50 bg-primary/10' : 'border-border bg-muted'}`}>
                                    <Label htmlFor="aiInput" className="font-bold text-sm flex items-center gap-2">
                                        {isAiNotulensiEnabled ? <Sparkles size={14} className="text-purple-500"/> : <Lock size={14}/>}
                                        AI Assistant
                                    </Label>
                                    <Textarea 
                                      id="aiInput"
                                      value={aiInput} 
                                      onChange={e => setAiInput(e.target.value)} 
                                      rows={4} 
                                      className="mt-1 text-xs"
                                      placeholder={isAiNotulensiEnabled ? "Tempel catatan mentah rapat di sini, lalu klik tombol di bawah..." : "Fitur ini tidak termasuk dalam paket Anda."}
                                      disabled={!isAiNotulensiEnabled}
                                    />
                                    {isAiNotulensiEnabled && (
                                      <Button type="button" size="sm" onClick={handleAiDraft} disabled={isAiProcessing || !aiInput.trim()} className="mt-2 w-full h-8 text-xs">
                                          {isAiProcessing ? <Loader2 size={14} className="animate-spin mr-2"/> : <Sparkles size={14} className="mr-2"/>}
                                          Generate Draf Notulensi
                                      </Button>
                                    )}
                                </div>

                                {/* Editor & Cache Info */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <Label htmlFor="isiNotulensi">Isi Notulensi</Label>
                                        
                                        {/* Indikator Draft */}
                                        {!notulensiToEdit && (draftLoaded || (draftIsi && draftIsi.length > 0)) && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-green-600 dark:text-green-400 italic animate-pulse">
                                                    Draft dipulihkan
                                                </span>
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={handleClearDraft} title="Hapus Draft">
                                                    <Eraser size={12} className="text-muted-foreground hover:text-red-500"/>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {draftLoaded && (
                                        <Alert className="mb-2 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                            <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-300">
                                                Kami memulihkan tulisan Anda yang belum tersimpan sebelumnya.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div data-color-mode={theme} className="mt-1">
                                      <MDEditor
                                        height={300}
                                        value={formData.isiNotulensi}
                                        onChange={(val) => {
                                            const newValue = val || '';
                                            setFormData({...formData, isiNotulensi: newValue});
                                            
                                            // [INTI] Simpan ke cache saat mengetik (hanya mode baru)
                                            if (!notulensiToEdit) {
                                                setDraftIsi(newValue);
                                            }
                                        }}
                                        preview="edit" 
                                        textareaProps={{
                                            placeholder: "Mulai menulis notulensi..."
                                        }}
                                      />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="flex-shrink-0 pt-4 border-t border-border">
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing && <Loader2 size={16} className="animate-spin mr-2" />}
                            <Send size={16} className="mr-2"/> Simpan Notulensi
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}