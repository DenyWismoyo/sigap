"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Wilayah } from '@/types/index';
import { Loader2, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface WilayahModalProps {
    isOpen: boolean;
    onClose: () => void;
    dataToEdit: Wilayah | null;
}

export default function WilayahModal({ isOpen, onClose, dataToEdit }: WilayahModalProps) {
    const { userProfile } = useUserAuth(); // Butuh userProfile untuk 'createdBy'
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<Partial<Wilayah>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (dataToEdit) {
                setFormData(dataToEdit);
            } else {
                // Reset form untuk mode Tambah Baru
                setFormData({
                    kodeWilayah: '',
                    nama: '',
                    jenis: 'Kelurahan',
                    namaPejabat: '',
                    nipPejabat: '',
                    luasWilayah: 0,
                    jumlahPenduduk: 0,
                    alamatKantor: ''
                });
            }
        }
    }, [isOpen, dataToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsProcessing(true);
        try {
            const payload = {
                ...formData,
                luasWilayah: Number(formData.luasWilayah),
                jumlahPenduduk: Number(formData.jumlahPenduduk),
            };

            if (dataToEdit?.id) {
                // Mode Edit
                await updateDoc(doc(db, 'tapem_wilayah', dataToEdit.id), payload);
                addToast("Data wilayah diperbarui.", "success");
            } else {
                // Mode Tambah Baru
                await addDoc(collection(db, 'tapem_wilayah'), {
                    ...payload,
                    createdAt: Timestamp.now(),
                    createdBy: userProfile?.uid || 'system'
                });
                addToast("Data wilayah baru berhasil ditambahkan.", "success");
            }

            queryClient.invalidateQueries({ queryKey: ['tapem', 'wilayah'] });
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
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle>{dataToEdit ? `Edit ${dataToEdit.jenis}` : 'Tambah Data Wilayah'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    
                    {/* Input Identitas Wilayah (Enable saat Mode Tambah) */}
                    <div className="grid grid-cols-2 gap-4">
                         <div className="col-span-2">
                            <Label>Jenis Wilayah</Label>
                            <Select 
                                value={formData.jenis || 'Kelurahan'} 
                                onValueChange={(v: 'Kecamatan' | 'Kelurahan') => setFormData({...formData, jenis: v})}
                                disabled={!!dataToEdit} // Tidak bisa ubah jenis saat edit
                            >
                                <SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Kecamatan">Kecamatan</SelectItem>
                                    <SelectItem value="Kelurahan">Kelurahan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Kode Wilayah (Kemendagri)</Label>
                            <Input 
                                value={formData.kodeWilayah || ''} 
                                onChange={e => setFormData({...formData, kodeWilayah: e.target.value})} 
                                placeholder="33.72..."
                                required
                            />
                        </div>
                        <div>
                            <Label>Nama Wilayah</Label>
                            <Input 
                                value={formData.nama || ''} 
                                onChange={e => setFormData({...formData, nama: e.target.value})} 
                                placeholder={formData.jenis === 'Kecamatan' ? 'Kec. Jebres' : 'Kel. Mojosongo'}
                                required
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg border border-dashed space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Data Pejabat & Profil</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Nama Pejabat</Label>
                                <Input 
                                    value={formData.namaPejabat || ''} 
                                    onChange={e => setFormData({...formData, namaPejabat: e.target.value})} 
                                    placeholder="Nama Lengkap"
                                />
                            </div>
                            <div>
                                <Label>NIP</Label>
                                <Input 
                                    value={formData.nipPejabat || ''} 
                                    onChange={e => setFormData({...formData, nipPejabat: e.target.value})} 
                                    placeholder="NIP"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Luas (km²)</Label>
                                <Input 
                                    type="number" step="0.01"
                                    value={formData.luasWilayah || 0} 
                                    onChange={e => setFormData({...formData, luasWilayah: Number(e.target.value)})} 
                                />
                            </div>
                            <div>
                                <Label>Penduduk (Jiwa)</Label>
                                <Input 
                                    type="number"
                                    value={formData.jumlahPenduduk || 0} 
                                    onChange={e => setFormData({...formData, jumlahPenduduk: Number(e.target.value)})} 
                                />
                            </div>
                        </div>
                        
                        <div>
                            <Label>Alamat Kantor</Label>
                            <Input 
                                value={formData.alamatKantor || ''} 
                                onChange={e => setFormData({...formData, alamatKantor: e.target.value})} 
                                placeholder="Jalan..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
                        <Button type="submit" disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}