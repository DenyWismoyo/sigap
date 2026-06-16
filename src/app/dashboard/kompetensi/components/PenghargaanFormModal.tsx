/**
 * Directory: src/app/dashboard/kompetensi/components/PenghargaanFormModal.tsx
 * History Update:
 * - 2024-11-28: Initial creation.
 * - [UPDATE] Menambahkan subFolderName="Portofolio Kompetensi" saat upload.
 */

"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleDriveUploader } from '@/app/dashboard/hooks/useGoogleDriveUploader';
import { UserProfile, RiwayatPenghargaan } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface PenghargaanFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<RiwayatPenghargaan, 'id'>) => Promise<void>;
    userProfile: UserProfile;
}

export default function PenghargaanFormModal({ isOpen, onClose, onSave, userProfile }: PenghargaanFormModalProps) {
    const { addToast } = useToast();
    const { uploadFile, uploadStatus, isReady } = useGoogleDriveUploader();
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        namaPenghargaan: '',
        pemberi: '',
        tahun: new Date().getFullYear().toString(),
        tingkat: 'Instansi' as 'Nasional' | 'Provinsi' | 'Kab/Kota' | 'Instansi',
    });
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.namaPenghargaan || !formData.tahun) return;
        setIsProcessing(true);

        try {
            let fileUrl = undefined;
            let fileName = undefined;

            if (file) {
                if (!userProfile.googleDriveReportLink) throw new Error("Folder Google Drive belum diatur.");
                
                const fName = `${userProfile.nip}_Penghargaan_${formData.namaPenghargaan.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
                
                // [UPDATE] Upload ke subfolder "Portofolio Kompetensi"
                const link = await uploadFile(
                    file, 
                    fName, 
                    userProfile.googleDriveReportLink,
                    "Portofolio Kompetensi" // Parameter baru
                );
                
                if (link) {
                    fileUrl = link;
                    fileName = fName;
                }
            }

            const payload: Omit<RiwayatPenghargaan, 'id'> = {
                userId: userProfile.uid,
                opdId: userProfile.opdId,
                namaPenghargaan: formData.namaPenghargaan,
                pemberi: formData.pemberi,
                tahun: Number(formData.tahun),
                tingkat: formData.tingkat,
                fileBuktiUrl: fileUrl,
                fileBuktiName: fileName,
                createdAt: Timestamp.now()
            };

            await onSave(payload);
            addToast("Penghargaan berhasil disimpan.", "success");
            onClose();
        } catch (err: any) {
            console.error(err);
            addToast(err.message || "Gagal menyimpan.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Tambah Penghargaan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div>
                        <Label>Nama Penghargaan</Label>
                        <Input value={formData.namaPenghargaan} onChange={e => setFormData({...formData, namaPenghargaan: e.target.value})} placeholder="Contoh: Pegawai Teladan Bulan Mei" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Tingkat</Label>
                            <Select value={formData.tingkat} onValueChange={(v: any) => setFormData({...formData, tingkat: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Instansi">Instansi / OPD</SelectItem>
                                    <SelectItem value="Kab/Kota">Kabupaten / Kota</SelectItem>
                                    <SelectItem value="Provinsi">Provinsi</SelectItem>
                                    <SelectItem value="Nasional">Nasional</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tahun</Label>
                            <Input type="number" value={formData.tahun} onChange={e => setFormData({...formData, tahun: e.target.value})} required />
                        </div>
                    </div>
                    <div>
                        <Label>Pemberi Penghargaan</Label>
                        <Input value={formData.pemberi} onChange={e => setFormData({...formData, pemberi: e.target.value})} placeholder="Contoh: Walikota Surakarta" />
                    </div>
                    <div>
                        <Label>Upload Sertifikat/Piagam (PDF)</Label>
                        <Input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1" disabled={!isReady} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}