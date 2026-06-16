// Directory: src/app/dashboard/aset/components/BorrowModal.tsx
// [UPDATE] Menampilkan Nama Lengkap Pemegang di opsi Select.

"use client";

import React, { useState, useEffect } from 'react';
import { AsetInventaris, UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    availableAssets: AsetInventaris[];
    userProfile: UserProfile;
}

export default function BorrowModal({ isOpen, onClose, onSuccess, availableAssets, userProfile }: Props) {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [asetId, setAsetId] = useState('');
    const [peminjamInfo, setPeminjamInfo] = useState('');
    const [keperluan, setKeperluan] = useState('');
    const [kondisi, setKondisi] = useState('Baik');
    const [isExternal, setIsExternal] = useState(false);

    const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

    // Fetch users untuk mapping nama pemegang
    useEffect(() => {
        const fetchUsers = async () => {
            if (isOpen && userProfile.opdId) {
                try {
                    const q = query(collection(db, 'users'), where('opdId', '==', userProfile.opdId));
                    const snap = await getDocs(q);
                    const map = new Map<string, string>();
                    snap.forEach(d => {
                        const u = d.data() as UserProfile;
                        map.set(u.uid, u.namaLengkap);
                    });
                    setUserMap(map);
                } catch (e) { console.error(e); }
            }
        };
        fetchUsers();
    }, [isOpen, userProfile.opdId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!asetId || !peminjamInfo) return;
        setLoading(true);

        try {
            const selectedAset = availableAssets.find(a => a.id === asetId);
            if (!selectedAset) throw new Error("Aset tidak ditemukan");

            // 1. Simpan Log Peminjaman
            const payload = {
                asetId,
                namaAset: selectedAset.namaAset,
                opdId: userProfile.opdId,
                peminjamEksternal: isExternal,
                peminjamInfo,
                tanggalPinjam: Timestamp.now(),
                tanggalKembali: null,
                keperluan,
                kondisiSaatPinjam: kondisi,
                dicatatOleh: userProfile.uid,
                createdAt: Timestamp.now(),
                status: 'Dipinjam' as const
            };
            
            await addDoc(collection(db, 'peminjamanAset'), payload);

            // 2. Update Status Aset -> Dipinjam
            await updateDoc(doc(db, 'asetInventaris', asetId), {
                status: 'Dipinjam'
            });

            addToast("Peminjaman berhasil dicatat.", "success");
            onSuccess();
            onClose();
            
            // Reset form
            setAsetId(''); setPeminjamInfo(''); setKeperluan('');
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
                    <DialogTitle>Catat Peminjaman Aset</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Pilih Aset (Tersedia)</Label>
                        <Select value={asetId} onValueChange={setAsetId}>
                            <SelectTrigger><SelectValue placeholder="Cari aset..." /></SelectTrigger>
                            <SelectContent>
                                {availableAssets.map(a => {
                                    const pemegang = a.pemegangAsetId ? userMap.get(a.pemegangAsetId) : null;
                                    // [UPDATE] Tampilkan nama lengkap jika ada
                                    const labelPemegang = pemegang ? ` | PJ: ${pemegang}` : '';
                                    return (
                                        <SelectItem key={a.id} value={a.id!}>
                                            {a.namaAset} ({a.kodeAset}){labelPemegang}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-center gap-2 py-1">
                        <Checkbox id="ext" checked={isExternal} onCheckedChange={(c) => setIsExternal(c as boolean)} />
                        <Label htmlFor="ext" className="cursor-pointer">Peminjam Eksternal (Luar Kantor)</Label>
                    </div>

                    <div>
                        <Label>{isExternal ? 'Nama & Instansi Peminjam' : 'Nama Pegawai'}</Label>
                        <Input value={peminjamInfo} onChange={e => setPeminjamInfo(e.target.value)} placeholder={isExternal ? "Contoh: Budi (Dinas X)" : "Nama Pegawai"} required />
                    </div>

                    <div>
                        <Label>Keperluan</Label>
                        <Textarea value={keperluan} onChange={e => setKeperluan(e.target.value)} placeholder="Untuk kegiatan..." required />
                    </div>

                    <div>
                        <Label>Kondisi Saat Pinjam</Label>
                        <Input value={kondisi} onChange={e => setKondisi(e.target.value)} placeholder="Baik / Lecet dikit..." />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !asetId}>
                            {loading && <Loader2 className="mr-2 animate-spin" />} Catat
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}