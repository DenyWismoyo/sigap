"use client";

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Loader2, Save, Upload, FileText } from 'lucide-react';
import { ProdukKebijakan } from '../tabs/KebijakanTab'; // Import tipe dari Tab

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

interface KebijakanModalProps {
    isOpen: boolean;
    onClose: () => void;
    dataToEdit: ProdukKebijakan | null;
}

export default function KebijakanModal({ isOpen, onClose, dataToEdit }: KebijakanModalProps) {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();

    const [formData, setFormData] = useState<Partial<ProdukKebijakan>>({});
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (dataToEdit) {
                setFormData(dataToEdit);
            } else {
                setFormData({
                    jenis: 'Perwal',
                    nomor: '',
                    tahun: new Date().getFullYear(),
                    judul: '',
                    tentang: '',
                    status: 'Berlaku'
                });
            }
            setFile(null);
        }
    }, [isOpen, dataToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile) return;
        
        setIsProcessing(true);
        try {
            let fileUrl = formData.fileUrl;
            let fileName = formData.fileName;

            if (file) {
                const storageRef = ref(storage, `tapem_kebijakan/${Date.now()}_${file.name}`);
                const uploadRes = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(uploadRes.ref);
                fileName = file.name;
            }

            const payload = {
                ...formData,
                tahun: Number(formData.tahun),
                fileUrl,
                fileName,
                updatedAt: Timestamp.now()
            };

            if (dataToEdit?.id) {
                await updateDoc(doc(db, 'tapem_kebijakan', dataToEdit.id), payload);
                addToast("Produk kebijakan diperbarui.", "success");
            } else {
                await addDoc(collection(db, 'tapem_kebijakan'), {
                    ...payload,
                    createdBy: userProfile.uid,
                    createdAt: Timestamp.now()
                });
                addToast("Produk kebijakan baru ditambahkan.", "success");
            }

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
                    <DialogTitle>{dataToEdit ? 'Edit Produk Hukum' : 'Tambah Produk Hukum Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Jenis Peraturan</Label>
                            <Select value={formData.jenis} onValueChange={(v: any) => setFormData({...formData, jenis: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Perda">Peraturan Daerah (Perda)</SelectItem>
                                    <SelectItem value="Perwal">Peraturan Walikota (Perwal)</SelectItem>
                                    <SelectItem value="Kepwal">Keputusan Walikota (Kepwal)</SelectItem>
                                    <SelectItem value="SK">Surat Keputusan (SK)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Nomor</Label>
                            <Input 
                                value={formData.nomor || ''} 
                                onChange={e => setFormData({...formData, nomor: e.target.value})} 
                                placeholder="Contoh: 15 Tahun 2024"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <Label>Tahun</Label>
                            <Input 
                                type="number"
                                value={formData.tahun || ''} 
                                onChange={e => setFormData({...formData, tahun: Number(e.target.value)})} 
                                required
                            />
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Berlaku">Berlaku</SelectItem>
                                    <SelectItem value="Dicabut">Dicabut</SelectItem>
                                    <SelectItem value="Draf">Draf</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label>Judul Lengkap</Label>
                        <Textarea 
                            value={formData.judul || ''} 
                            onChange={e => setFormData({...formData, judul: e.target.value})} 
                            placeholder="Judul lengkap peraturan..."
                            rows={2}
                            required 
                        />
                    </div>

                    <div>
                        <Label>Tentang (Ringkasan)</Label>
                        <Input 
                            value={formData.tentang || ''} 
                            onChange={e => setFormData({...formData, tentang: e.target.value})} 
                            placeholder="Tentang apa peraturan ini..."
                        />
                    </div>

                    <div>
                        <Label>Upload Dokumen (PDF)</Label>
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

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
                        <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}