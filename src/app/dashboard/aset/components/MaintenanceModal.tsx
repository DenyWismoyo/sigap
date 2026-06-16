// Directory: src/app/dashboard/aset/components/MaintenanceModal.tsx

"use client";

import React, { useState } from 'react';
import { AsetInventaris, UserProfile, AsetMaintenance } from '@/types';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    asetList: AsetInventaris[];
    userProfile: UserProfile;
}

export default function MaintenanceModal({ isOpen, onClose, onSuccess, asetList, userProfile }: Props) {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [selectedAsetId, setSelectedAsetId] = useState('');
    const [jenis, setJenis] = useState<'Rutin' | 'Perbaikan' | 'Kerusakan'>('Rutin');
    const [deskripsi, setDeskripsi] = useState('');
    const [pelaksana, setPelaksana] = useState('');
    const [biaya, setBiaya] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAsetId) return;
        setLoading(true);

        try {
            let buktiUrl = undefined;
            if (file) {
                const storageRef = ref(storage, `maintenance/${userProfile.opdId}/${Date.now()}_${file.name}`);
                const res = await uploadBytes(storageRef, file);
                buktiUrl = await getDownloadURL(res.ref);
            }

            const selectedAset = asetList.find(a => a.id === selectedAsetId);
            
            // 1. Simpan Log
            const logPayload: AsetMaintenance = {
                asetId: selectedAsetId,
                namaAset: selectedAset?.namaAset || 'Unknown',
                opdId: userProfile.opdId,
                tanggal: Timestamp.now(),
                jenis,
                deskripsi,
                biaya: Number(biaya) || 0,
                pelaksana,
                buktiUrl,
                dicatatOleh: userProfile.uid,
                createdAt: Timestamp.now()
            };
            await addDoc(collection(db, 'asetMaintenance'), logPayload);

            // 2. Update Status Aset
            if (jenis === 'Perbaikan' || jenis === 'Kerusakan') {
                const newKondisi = jenis === 'Kerusakan' ? 'Rusak Berat' : 'Perlu Perbaikan';
                await updateDoc(doc(db, 'asetInventaris', selectedAsetId), {
                    kondisi: newKondisi,
                    status: 'Dalam Perbaikan'
                });
            } else if (jenis === 'Rutin') {
                 await updateDoc(doc(db, 'asetInventaris', selectedAsetId), {
                    kondisi: 'Baik',
                    status: 'Tersedia' 
                });
            }

            addToast("Maintenance tercatat.", "success");
            onSuccess();
            onClose();
            
            // Reset form
            setDeskripsi(''); setBiaya(''); setFile(null);
        } catch (error) {
            console.error(error);
            addToast("Gagal menyimpan.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Catat Pemeliharaan Aset</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Pilih Aset</Label>
                        <Select value={selectedAsetId} onValueChange={setSelectedAsetId}>
                            <SelectTrigger><SelectValue placeholder="Cari aset..." /></SelectTrigger>
                            <SelectContent>
                                {asetList.map(a => (
                                    <SelectItem key={a.id} value={a.id!}>{a.namaAset} ({a.kodeAset})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Jenis Servis</Label>
                            <Select value={jenis} onValueChange={(v) => setJenis(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Rutin">Servis Rutin</SelectItem>
                                    <SelectItem value="Perbaikan">Perbaikan Ringan</SelectItem>
                                    <SelectItem value="Kerusakan">Laporan Kerusakan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label>Biaya (Rp)</Label><Input type="number" value={biaya} onChange={e => setBiaya(e.target.value)} placeholder="0" /></div>
                    </div>
                    <div><Label>Pelaksana (Bengkel/Teknisi)</Label><Input value={pelaksana} onChange={e => setPelaksana(e.target.value)} required /></div>
                    <div><Label>Deskripsi Pengerjaan</Label><Textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)} required /></div>
                    <div><Label>Foto Bukti / Nota</Label><Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1"/></div>
                    
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !selectedAsetId}>
                            {loading && <Loader2 className="mr-2 animate-spin" />} Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}