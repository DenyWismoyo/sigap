"use client";

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { KerjaSama, JenisKerjaSama, StatusKerjaSama } from '@/types/index';
import { Loader2, Save, Upload, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface KerjaSamaModalProps {
    isOpen: boolean;
    onClose: () => void;
    dataToEdit: KerjaSama | null;
}

export default function KerjaSamaModal({ isOpen, onClose, dataToEdit }: KerjaSamaModalProps) {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<Partial<KerjaSama>>({});
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (dataToEdit) {
                setFormData({
                    ...dataToEdit,
                    // Konversi Timestamp ke string YYYY-MM-DD untuk input date
                    // @ts-ignore
                    tanggalMulai: dataToEdit.tanggalMulai?.toDate ? dataToEdit.tanggalMulai.toDate().toISOString().split('T')[0] : '',
                    // @ts-ignore
                    tanggalAkhir: dataToEdit.tanggalAkhir?.toDate ? dataToEdit.tanggalAkhir.toDate().toISOString().split('T')[0] : '',
                });
            } else {
                setFormData({
                    judul: '',
                    nomorNaskah: '',
                    mitra: '',
                    jenis: 'Daerah',
                    status: 'Aktif',
                    progressMonev: ''
                });
            }
            setFile(null);
        }
    }, [isOpen, dataToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile?.opdId) return;
        
        setIsProcessing(true);
        try {
            let fileUrl = formData.fileUrl;
            let fileName = formData.fileName;

            // Upload File jika ada yang baru
            if (file) {
                const storageRef = ref(storage, `tapem_docs/${Date.now()}_${file.name}`);
                const uploadRes = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(uploadRes.ref);
                fileName = file.name;
            }

            const payload = {
                ...formData,
                opdId: userProfile.opdId,
                tanggalMulai: Timestamp.fromDate(new Date(formData.tanggalMulai as unknown as string)),
                tanggalAkhir: Timestamp.fromDate(new Date(formData.tanggalAkhir as unknown as string)),
                fileUrl,
                fileName,
                updatedAt: Timestamp.now()
            };

            if (dataToEdit?.id) {
                await updateDoc(doc(db, 'tapem_kerjasama', dataToEdit.id), payload);
                addToast("Data kerja sama diperbarui.", "success");
            } else {
                await addDoc(collection(db, 'tapem_kerjasama'), {
                    ...payload,
                    createdBy: userProfile.uid,
                    createdAt: Timestamp.now()
                });
                addToast("Kerja sama baru ditambahkan.", "success");
            }

            // Refresh data di tab
            queryClient.invalidateQueries({ queryKey: ['tapem', 'kerjasama'] });
            onClose();
        } catch (error) {
            console.error(error);
            addToast("Gagal menyimpan data.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{dataToEdit ? 'Edit Kerja Sama' : 'Tambah Kerja Sama Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div>
                        <Label>Judul Kerja Sama</Label>
                        <Input 
                            value={formData.judul || ''} 
                            onChange={e => setFormData({...formData, judul: e.target.value})} 
                            placeholder="Contoh: MoU Smart City dengan Kab. Karanganyar"
                            required 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Nomor Naskah</Label>
                            <Input 
                                value={formData.nomorNaskah || ''} 
                                onChange={e => setFormData({...formData, nomorNaskah: e.target.value})} 
                                placeholder="Nomor MOU/PKS"
                            />
                        </div>
                        <div>
                            <Label>Mitra (Pihak Kedua)</Label>
                            <Input 
                                value={formData.mitra || ''} 
                                onChange={e => setFormData({...formData, mitra: e.target.value})} 
                                placeholder="Nama Instansi/PT"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Jenis</Label>
                            <Select value={formData.jenis} onValueChange={(v) => setFormData({...formData, jenis: v as JenisKerjaSama})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Daerah">Antar Daerah</SelectItem>
                                    <SelectItem value="Pihak Ketiga">Pihak Ketiga</SelectItem>
                                    <SelectItem value="Luar Negeri">Luar Negeri</SelectItem>
                                    <SelectItem value="Sinoc">Sinoc / Lembaga</SelectItem>
                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as StatusKerjaSama})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Aktif">Aktif</SelectItem>
                                    <SelectItem value="Akan Berakhir">Akan Berakhir</SelectItem>
                                    <SelectItem value="Berakhir">Berakhir</SelectItem>
                                    <SelectItem value="Diperpanjang">Diperpanjang</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Tanggal Mulai</Label>
                            <Input 
                                type="date"
                                value={formData.tanggalMulai as unknown as string || ''} 
                                onChange={e => setFormData({...formData, tanggalMulai: e.target.value as any})} 
                                required
                            />
                        </div>
                        <div>
                            <Label>Tanggal Berakhir</Label>
                            <Input 
                                type="date"
                                value={formData.tanggalAkhir as unknown as string || ''} 
                                onChange={e => setFormData({...formData, tanggalAkhir: e.target.value as any})} 
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Upload Naskah (PDF)</Label>
                        <div className="flex gap-2 items-center mt-1">
                            <Input 
                                type="file" 
                                accept=".pdf"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        {dataToEdit?.fileName && !file && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <FileText size={12} className="mr-1"/> File saat ini: {dataToEdit.fileName}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label>Catatan Monev (Opsional)</Label>
                        <Textarea 
                            value={formData.progressMonev || ''} 
                            onChange={e => setFormData({...formData, progressMonev: e.target.value})} 
                            placeholder="Catatan perkembangan pelaksanaan kerja sama..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
                        <Button type="submit" disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}