/**
 * Directory: src/app/dashboard/talenta/components/AssessmentFormModal.tsx
 * History Update:
 * - 2024-11-27: Initial creation of Assessment Input Modal.
 * - 2024-11-27: Added live 9-box preview visualization.
 * - 2024-11-28: Added header info.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile } from '@/types';
import { TalentAssessment, calculateNineBox, getBoxLabel } from '@/app/dashboard/hooks/useTalentData';
import { Loader2, Save, TrendingUp, UserCheck } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface AssessmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: UserProfile | null;
    existingAssessment?: TalentAssessment;
    onSave: (data: TalentAssessment) => Promise<void>;
    currentUserUid: string;
}

export default function AssessmentFormModal({ 
    isOpen, onClose, employee, existingAssessment, onSave, currentUserUid 
}: AssessmentFormModalProps) {
    
    const [kinerja, setKinerja] = useState<string>('0');
    const [potensi, setPotensi] = useState<string>('0');
    const [catatan, setCatatan] = useState('');
    const [rekomendasi, setRekomendasi] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingAssessment) {
                setKinerja(existingAssessment.nilaiKinerja.toString());
                setPotensi(existingAssessment.nilaiPotensi.toString());
                setCatatan(existingAssessment.catatan || '');
                setRekomendasi(existingAssessment.rekomendasiJabatan || '');
            } else {
                setKinerja('0');
                setPotensi('0');
                setCatatan('');
                setRekomendasi('');
            }
        }
    }, [isOpen, existingAssessment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        setIsProcessing(true);
        
        const k = Number(kinerja);
        const p = Number(potensi);
        
        const data: TalentAssessment = {
            userId: employee.uid,
            userNama: employee.namaLengkap,
            userNip: employee.nip,
            userJabatan: employee.jabatanId || 'Staf', 
            opdId: employee.opdId,
            tahun: new Date().getFullYear(),
            nilaiKinerja: k,
            nilaiPotensi: p,
            boxPosition: calculateNineBox(k, p),
            catatan,
            rekomendasiJabatan: rekomendasi,
            updatedAt: Timestamp.now(),
            updatedBy: currentUserUid
        };

        await onSave(data);
        setIsProcessing(false);
        onClose();
    };

    // Kalkulasi Preview Box saat user mengetik
    const previewBox = calculateNineBox(Number(kinerja), Number(potensi));
    const boxInfo = getBoxLabel(previewBox);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
                        Input Penilaian Talenta
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">Pegawai: <span className="font-semibold text-foreground">{employee?.namaLengkap}</span></p>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nilai Kinerja (SKP)</Label>
                            <Input 
                                type="number" 
                                value={kinerja} 
                                onChange={e => setKinerja(e.target.value)} 
                                min="0" max="100" 
                                required
                                placeholder="0-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nilai Potensi (Assessment)</Label>
                            <Input 
                                type="number" 
                                value={potensi} 
                                onChange={e => setPotensi(e.target.value)} 
                                min="0" max="100" 
                                required
                                placeholder="0-100"
                            />
                        </div>
                    </div>

                    {/* Live Preview Box */}
                    <div className={`p-4 rounded-lg border flex items-center gap-4 transition-colors ${boxInfo.color}`}>
                        <div className="p-2 rounded-full bg-white/50 shadow-sm">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Hasil Matriks Talenta:</p>
                            <p className="font-bold text-lg">{boxInfo.label}</p>
                            <p className="text-xs mt-1 opacity-90">{boxInfo.desc}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Rekomendasi Pengembangan / Karir</Label>
                        <Input 
                            value={rekomendasi} 
                            onChange={e => setRekomendasi(e.target.value)} 
                            placeholder="Contoh: Promosi, Rotasi, Diklat Kepemimpinan..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Catatan Pimpinan</Label>
                        <Textarea 
                            value={catatan} 
                            onChange={e => setCatatan(e.target.value)} 
                            placeholder="Kekuatan, kelemahan, dan catatan khusus..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Simpan Penilaian
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}