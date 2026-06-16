"use client";

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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

// Tipe Data untuk LPPD (Bisa dipindah ke types/tapem.ts jika mau strict)
export interface LppdData {
    id?: string;
    opdId: string; // OPD Penanggung Jawab
    namaOpd: string;
    urusan: string; // Pendidikan, Kesehatan, dll
    indikator: string; // Bunyi IKK
    rumus?: string;
    satuan: string;
    target: string;
    capaian: string;
    status: 'Belum Lapor' | 'Menunggu Verifikasi' | 'Perlu Perbaikan' | 'Valid';
    buktiUrl?: string;
    buktiFileName?: string;
    catatan?: string;
    tahun: number;
    updatedBy?: string;
    updatedAt?: any;
}

interface LppdModalProps {
    isOpen: boolean;
    onClose: () => void;
    dataToEdit: LppdData | null;
    opdList: any[]; // List OPD untuk dropdown
}

export default function LppdModal({ isOpen, onClose, dataToEdit, opdList }: LppdModalProps) {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<Partial<LppdData>>({});
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Cek Role
    const isAdminTapem = userProfile?.role === 'super_admin' || userProfile?.additionalRoles?.includes('pengelola_tapem');
    const isOpdUser = userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu';

    useEffect(() => {
        if (isOpen) {
            if (dataToEdit) {
                setFormData(dataToEdit);
            } else {
                // Default Data Baru
                setFormData({
                    urusan: '',
                    indikator: '',
                    rumus: '',
                    satuan: '',
                    target: '',
                    capaian: '',
                    status: 'Belum Lapor',
                    tahun: new Date().getFullYear(),
                    opdId: '',
                    namaOpd: ''
                });
            }
            setFile(null);
        }
    }, [isOpen, dataToEdit]);

    const handleOpdChange = (opdId: string) => {
        const selected = opdList.find(o => o.id === opdId);
        setFormData(prev => ({ ...prev, opdId, namaOpd: selected?.namaOpd || '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile) return;
        
        setIsProcessing(true);
        try {
            let fileUrl = formData.buktiUrl;
            let fileName = formData.buktiFileName;

            if (file) {
                const storageRef = ref(storage, `lppd/${formData.tahun}/${Date.now()}_${file.name}`);
                const uploadRes = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(uploadRes.ref);
                fileName = file.name;
            }

            // Logika Status Otomatis
            let newStatus = formData.status;
            if (isOpdUser && !isAdminTapem) {
                // Jika OPD update capaian, status otomatis ke Menunggu Verifikasi
                if (formData.capaian && formData.capaian !== dataToEdit?.capaian) {
                    newStatus = 'Menunggu Verifikasi';
                }
            }

            const payload = {
                ...formData,
                status: newStatus,
                buktiUrl: fileUrl,
                buktiFileName: fileName,
                updatedAt: Timestamp.now(),
                updatedBy: userProfile.uid
            };

            if (dataToEdit?.id) {
                await updateDoc(doc(db, 'tapem_lppd', dataToEdit.id), payload);
                addToast("Data LPPD diperbarui.", "success");
            } else {
                await addDoc(collection(db, 'tapem_lppd'), {
                    ...payload,
                    createdAt: Timestamp.now()
                });
                addToast("Indikator IKK baru ditambahkan.", "success");
            }

            queryClient.invalidateQueries({ queryKey: ['tapem', 'lppd'] });
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
                    <DialogTitle>{dataToEdit ? 'Update Data LPPD' : 'Tambah Indikator IKK'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    
                    {/* Bagian Identitas IKK (Hanya Admin Tapem yang bisa edit identitas IKK) */}
                    <div className={`space-y-4 ${!isAdminTapem && dataToEdit ? 'opacity-80 pointer-events-none' : ''}`}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tahun Laporan</Label>
                                <Input 
                                    type="number" 
                                    value={formData.tahun} 
                                    onChange={e => setFormData({...formData, tahun: Number(e.target.value)})} 
                                />
                            </div>
                            <div>
                                <Label>Urusan Pemerintahan</Label>
                                <Select value={formData.urusan} onValueChange={(v) => setFormData({...formData, urusan: v})}>
                                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pendidikan">Pendidikan</SelectItem>
                                        <SelectItem value="Kesehatan">Kesehatan</SelectItem>
                                        <SelectItem value="Pekerjaan Umum">Pekerjaan Umum</SelectItem>
                                        <SelectItem value="Perumahan Rakyat">Perumahan Rakyat</SelectItem>
                                        <SelectItem value="Trantibum">Trantibum & Linmas</SelectItem>
                                        <SelectItem value="Sosial">Sosial</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya / Penunjang</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>OPD Penanggung Jawab</Label>
                            <Select value={formData.opdId} onValueChange={handleOpdChange}>
                                <SelectTrigger><SelectValue placeholder="Pilih OPD" /></SelectTrigger>
                                <SelectContent>
                                    {opdList.map(opd => (
                                        <SelectItem key={opd.id} value={opd.id}>{opd.namaOpd}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Nama Indikator (IKK)</Label>
                            <Textarea 
                                value={formData.indikator} 
                                onChange={e => setFormData({...formData, indikator: e.target.value})} 
                                placeholder="Contoh: Rasio guru terhadap murid"
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Satuan</Label>
                                <Input 
                                    value={formData.satuan} 
                                    onChange={e => setFormData({...formData, satuan: e.target.value})} 
                                    placeholder="%, Jiwa, Unit..."
                                />
                            </div>
                            <div>
                                <Label>Target</Label>
                                <Input 
                                    value={formData.target} 
                                    onChange={e => setFormData({...formData, target: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bagian Input Capaian (Bisa diisi OPD & Admin) */}
                    <div className="border-t border-dashed pt-4 mt-4">
                        <h4 className="text-sm font-bold mb-3 text-blue-600">Realisasi & Bukti Dukung</h4>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <Label>Capaian / Realisasi</Label>
                                <Input 
                                    value={formData.capaian} 
                                    onChange={e => setFormData({...formData, capaian: e.target.value})} 
                                    placeholder="Isi sesuai satuan"
                                    className="border-blue-200 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <Label>Status Verifikasi</Label>
                                <Select 
                                    value={formData.status} 
                                    onValueChange={(v: any) => setFormData({...formData, status: v})}
                                    disabled={!isAdminTapem} // Hanya Admin Tapem yang bisa ubah status manual
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Belum Lapor">Belum Lapor</SelectItem>
                                        <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                                        <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                                        <SelectItem value="Valid">Valid (Lengkap)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Upload Bukti Dukung (PDF/ZIP)</Label>
                            <div className="flex gap-2 items-center mt-1">
                                <Input 
                                    type="file" 
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            {dataToEdit?.buktiFileName && !file && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                    <FileText size={12} className="mr-1"/> File saat ini: {dataToEdit.buktiFileName}
                                </p>
                            )}
                        </div>

                        {isAdminTapem && (
                            <div className="mt-3">
                                <Label>Catatan Verifikator (Untuk OPD)</Label>
                                <Textarea 
                                    value={formData.catatan} 
                                    onChange={e => setFormData({...formData, catatan: e.target.value})} 
                                    placeholder="Berikan catatan jika perlu perbaikan..."
                                    rows={2}
                                    className="bg-yellow-50 border-yellow-200"
                                />
                            </div>
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