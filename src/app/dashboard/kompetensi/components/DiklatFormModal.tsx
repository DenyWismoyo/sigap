/**
 * Directory: src/app/dashboard/kompetensi/components/DiklatFormModal.tsx
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
import { UserProfile, RiwayatDiklat, KategoriDiklat } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface DiklatFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<RiwayatDiklat, 'id'>) => Promise<void>;
    userProfile: UserProfile;
}

export default function DiklatFormModal({ isOpen, onClose, onSave, userProfile }: DiklatFormModalProps) {
    const { addToast } = useToast();
    const { uploadFile, uploadStatus, isReady } = useGoogleDriveUploader();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        namaDiklat: '',
        penyelenggara: '',
        tahun: new Date().getFullYear().toString(),
        durasiJam: '',
        kategori: 'Teknis' as KategoriDiklat,
        tanggalSelesai: ''
    });
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.namaDiklat || !formData.tahun || !formData.durasiJam) {
            addToast("Mohon lengkapi data wajib.", "error");
            return;
        }
        setIsProcessing(true);

        try {
            let fileUrl = undefined;
            let fileName = undefined;

            if (file) {
                if (!userProfile.googleDriveReportLink) throw new Error("Folder Google Drive belum diatur di Profil.");
                
                const fName = `${userProfile.nip}_Sertifikat_${formData.namaDiklat.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
                
                // [UPDATE] Upload ke subfolder "Portofolio Kompetensi"
                const link = await uploadFile(
                    file, 
                    fName, 
                    userProfile.googleDriveReportLink,
                    "Portofolio Kompetensi" // Parameter baru: Sub Folder
                );
                
                if (link) {
                    fileUrl = link;
                    fileName = fName;
                }
            }

            const payload: Omit<RiwayatDiklat, 'id'> = {
                userId: userProfile.uid,
                opdId: userProfile.opdId,
                namaDiklat: formData.namaDiklat,
                penyelenggara: formData.penyelenggara,
                tahun: Number(formData.tahun),
                durasiJam: Number(formData.durasiJam),
                kategori: formData.kategori,
                tanggalSelesai: formData.tanggalSelesai ? Timestamp.fromDate(new Date(formData.tanggalSelesai)) : Timestamp.now(),
                fileBuktiUrl: fileUrl,
                fileBuktiName: fileName,
                createdAt: Timestamp.now()
            };

            await onSave(payload);
            addToast("Riwayat Diklat berhasil disimpan.", "success");
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
                    <DialogTitle>Tambah Riwayat Diklat / Pelatihan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div>
                        <Label>Nama Diklat</Label>
                        <Input value={formData.namaDiklat} onChange={e => setFormData({...formData, namaDiklat: e.target.value})} placeholder="Contoh: Pelatihan Kepemimpinan Pengawas" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Kategori</Label>
                            <Select value={formData.kategori} onValueChange={(v: KategoriDiklat) => setFormData({...formData, kategori: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Manajerial">Manajerial</SelectItem>
                                    <SelectItem value="Teknis">Teknis</SelectItem>
                                    <SelectItem value="Fungsional">Fungsional</SelectItem>
                                    <SelectItem value="Sosiokultural">Sosiokultural</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tahun</Label>
                            <Input type="number" value={formData.tahun} onChange={e => setFormData({...formData, tahun: e.target.value})} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Durasi (Jam Pelajaran)</Label>
                            <Input type="number" value={formData.durasiJam} onChange={e => setFormData({...formData, durasiJam: e.target.value})} placeholder="JP" required />
                        </div>
                        <div>
                            <Label>Tanggal Selesai</Label>
                            <Input type="date" value={formData.tanggalSelesai} onChange={e => setFormData({...formData, tanggalSelesai: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <Label>Penyelenggara</Label>
                        <Input value={formData.penyelenggara} onChange={e => setFormData({...formData, penyelenggara: e.target.value})} placeholder="Contoh: BPSDM Provinsi" />
                    </div>
                    <div>
                        <Label>Upload Sertifikat (PDF, Max 5MB)</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Input type="file" accept=".pdf" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} disabled={!isReady} />
                        </div>
                        {!isReady && <p className="text-xs text-red-500 mt-1">Google Drive belum terhubung di Profil.</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing || uploadStatus === 'uploading'}>Batal</Button>
                        <Button type="submit" disabled={isProcessing || uploadStatus === 'uploading'}>
                            {(isProcessing || uploadStatus === 'uploading') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}