// Directory: src/app/dashboard/aset/components/AssetFormModal.tsx
// [UPDATE] Menambahkan input 'Tahun Pengadaan'.
// [UPDATE] Menambahkan input 'Pemegang Aset' (Dropdown User).
// [LAYOUT] Mengatur layout agar lebih rapi.

"use client";

import React, { useState, useEffect } from 'react';
import { AsetInventaris, UserProfile } from '@/types';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, User } from 'lucide-react';
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
    asetToEdit: AsetInventaris | null;
    userProfile: UserProfile;
}

export default function AssetFormModal({ isOpen, onClose, onSuccess, asetToEdit, userProfile }: Props) {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<AsetInventaris>>({});
    const [file, setFile] = useState<File | null>(null);
    const [userList, setUserList] = useState<UserProfile[]>([]);

    // [BARU] Fetch data user untuk dropdown Pemegang Aset
    useEffect(() => {
        const fetchUsers = async () => {
            if (!userProfile.opdId || !isOpen) return;
            try {
                const q = query(
                    collection(db, 'users'), 
                    where('opdId', '==', userProfile.opdId), 
                    where('status', '==', 'aktif')
                );
                const snap = await getDocs(q);
                const users = snap.docs.map(doc => doc.data() as UserProfile);
                // Sortir berdasarkan nama
                users.sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
                setUserList(users);
            } catch (e) {
                console.error("Gagal memuat daftar user:", e);
            }
        };
        fetchUsers();
    }, [userProfile.opdId, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setFormData(asetToEdit || { 
                kondisi: 'Baik', 
                status: 'Tersedia',
                tanggalMasuk: Timestamp.now(),
                tahunPengadaan: new Date().getFullYear(), // Default tahun sekarang
                kategori: '',
                pemegangAsetId: null
            });
            setFile(null);
        }
    }, [isOpen, asetToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.namaAset || !formData.kodeAset) return;
        setLoading(true);

        try {
            let fotoUrl = formData.fotoUrl || null;
            
            if (file) {
                const storageRef = ref(storage, `aset/${userProfile.opdId}/${Date.now()}_${file.name}`);
                const uploadRes = await uploadBytes(storageRef, file);
                fotoUrl = await getDownloadURL(uploadRes.ref);
            }

            const payload = {
                ...formData,
                fotoUrl: fotoUrl, 
                opdId: userProfile.opdId,
                tanggalMasuk: typeof formData.tanggalMasuk === 'string' 
                    ? Timestamp.fromDate(new Date(formData.tanggalMasuk)) 
                    : (formData.tanggalMasuk || Timestamp.now())
            };

            if (asetToEdit?.id) {
                await updateDoc(doc(db, 'asetInventaris', asetToEdit.id), payload);
            } else {
                await addDoc(collection(db, 'asetInventaris'), payload);
            }

            addToast("Aset berhasil disimpan.", "success");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error saving asset:", error);
            addToast(`Gagal menyimpan aset: ${error.message || "Terjadi kesalahan"}`, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{asetToEdit ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Nama Aset</Label><Input value={formData.namaAset || ''} onChange={e => setFormData({...formData, namaAset: e.target.value})} required /></div>
                        <div><Label>Kode Aset</Label><Input value={formData.kodeAset || ''} onChange={e => setFormData({...formData, kodeAset: e.target.value})} required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Kategori</Label><Input value={formData.kategori || ''} onChange={e => setFormData({...formData, kategori: e.target.value})} placeholder="Elektronik, Mebel..." required /></div>
                        <div><Label>Lokasi</Label><Input value={formData.lokasi || ''} onChange={e => setFormData({...formData, lokasi: e.target.value})} required /></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Kondisi</Label>
                            <Select value={formData.kondisi} onValueChange={(v) => setFormData({...formData, kondisi: v as any})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Baik">Baik</SelectItem>
                                    <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                                    <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tahun Pengadaan</Label>
                            <Input 
                                type="number" 
                                value={formData.tahunPengadaan || ''} 
                                onChange={e => setFormData({...formData, tahunPengadaan: Number(e.target.value)})} 
                                placeholder="YYYY"
                                min="1900"
                                max="2099"
                            />
                        </div>
                    </div>

                    {/* [BARU] Input Nilai & Pemegang Aset */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Nilai Perolehan (Rp)</Label>
                            <Input 
                                type="number" 
                                value={formData.nilaiPerolehan || ''} 
                                onChange={e => setFormData({...formData, nilaiPerolehan: Number(e.target.value)})} 
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <Label className="flex items-center gap-1">
                                <User size={12} /> Pemegang (PJ)
                            </Label>
                            <Select 
                                value={formData.pemegangAsetId || "none"} 
                                onValueChange={(v) => setFormData({...formData, pemegangAsetId: v === "none" ? null : v})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Pegawai..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Tidak Ada / Umum --</SelectItem>
                                    {userList.map(u => (
                                        <SelectItem key={u.uid} value={u.uid}>
                                            {u.namaLengkap}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div>
                        <Label>Foto Aset</Label>
                        <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1"/>
                    </div>

                    <div><Label>Spesifikasi</Label><Textarea value={formData.spesifikasi || ''} onChange={e => setFormData({...formData, spesifikasi: e.target.value})} rows={2} /></div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 animate-spin" />} Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}