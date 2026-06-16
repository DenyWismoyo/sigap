/**
 * Directory: src/app/dashboard/talenta/components/PlanCreationModal.tsx
 * History Update:
 * - 2024-11-28: Initial creation. Modal for creating Individual Development Plan (IDP).
 * - Features: Auto-suggest program based on competency gaps.
 */

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Target, BookOpen } from 'lucide-react';
import { KompetensiItem, UserProfile } from '@/types';

interface PlanCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: UserProfile | undefined;
    gaps: KompetensiItem[];
}

export default function PlanCreationModal({ isOpen, onClose, employee, gaps }: PlanCreationModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [program, setProgram] = useState('');
    const [targetWaktu, setTargetWaktu] = useState('');
    const [prioritas, setPrioritas] = useState('Tinggi');
    
    // Auto-fill saran program berdasarkan gap terbesar (gap negatif terbesar)
    const criticalGap = gaps.sort((a, b) => (a.aktual - a.standar) - (b.aktual - b.standar))[0];
    
    const suggestedProgram = criticalGap 
        ? `Pelatihan Intensif: ${criticalGap.aspek} (Gap: ${criticalGap.standar - criticalGap.aktual} Level)` 
        : 'Mentoring & Coaching';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        // Simulasi simpan data ke backend
        // Di implementasi nyata: panggil API / Firestore addDoc
        setTimeout(() => {
            alert(`Rencana Pengembangan untuk ${employee?.namaLengkap} berhasil dibuat!\nProgram: ${program}\nTarget: ${targetWaktu}`);
            setIsProcessing(false);
            onClose();
        }, 1000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Buat Individual Development Plan (IDP)
                    </DialogTitle>
                    <DialogDescription>
                        Susun rencana pengembangan untuk menutup <strong>{gaps.length} Gap Kompetensi</strong> yang teridentifikasi.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Ringkasan Gap */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                        <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Gap Prioritas:</p>
                        <ul className="list-disc list-inside text-blue-700 dark:text-blue-200 space-y-1">
                            {gaps.length > 0 ? gaps.map((g, idx) => (
                                <li key={idx}>
                                    <span className="font-medium">{g.aspek}</span>: Kurang {g.standar - g.aktual} level
                                </li>
                            )) : <li>Tidak ada gap signifikan. Fokus pada penguatan kekuatan.</li>}
                        </ul>
                    </div>

                    {/* Input Program */}
                    <div className="space-y-2">
                        <Label>Program Pengembangan / Intervensi</Label>
                        <div className="flex gap-2">
                            <Input 
                                value={program} 
                                onChange={e => setProgram(e.target.value)} 
                                placeholder="Contoh: Diklat Kepemimpinan / Mentoring"
                                required
                            />
                            <Button type="button" variant="outline" size="icon" title="Gunakan Saran Otomatis" onClick={() => setProgram(suggestedProgram)}>
                                <BookOpen size={16} className="text-muted-foreground" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Klik ikon buku untuk menggunakan saran otomatis berdasarkan gap.</p>
                    </div>

                    {/* Grid Input Lainnya */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Penyelesaian</Label>
                            <Select value={targetWaktu} onValueChange={setTargetWaktu}>
                                <SelectTrigger><SelectValue placeholder="Pilih Kuartal" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Q1 2025">Q1 2025 (Jan-Mar)</SelectItem>
                                    <SelectItem value="Q2 2025">Q2 2025 (Apr-Jun)</SelectItem>
                                    <SelectItem value="Q3 2025">Q3 2025 (Jul-Sep)</SelectItem>
                                    <SelectItem value="Q4 2025">Q4 2025 (Okt-Des)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Prioritas</Label>
                            <Select value={prioritas} onValueChange={setPrioritas}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tinggi">Tinggi</SelectItem>
                                    <SelectItem value="Sedang">Sedang</SelectItem>
                                    <SelectItem value="Rendah">Rendah</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
                        <Button type="submit" disabled={isProcessing || !program || !targetWaktu} className="bg-blue-600 hover:bg-blue-700">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Simpan Rencana
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}