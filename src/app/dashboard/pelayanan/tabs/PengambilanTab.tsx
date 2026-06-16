// Directory: src/app/dashboard/pelayanan/tabs/PengambilanTab.tsx
// [UPDATE] Menambahkan input 'Nama Orang Tua' khusus untuk layanan KIA.

"use client";

import React, { useState } from 'react';
import { usePelayananData } from '@/app/dashboard/hooks/usePelayananData';
import { UserProfile } from '@/types';
import { Save, Loader2, User, Clock, AlertTriangle, CheckCircle, Info, Users } from 'lucide-react'; // Tambah icon Users
import { useToast } from '@/context/ToastContext';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PengambilanTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    const { catatTransaksi, isMutating, customColumns } = usePelayananData();
    
    const [nama, setNama] = useState('');
    const [noHp, setNoHp] = useState('');
    const [namaPengambil, setNamaPengambil] = useState('');
    const [jenisDokumen, setJenisDokumen] = useState<string>('KTP-el');
    // [BARU] State untuk Nama Orang Tua
    const [namaOrangTua, setNamaOrangTua] = useState('');
    
    const [catatan, setCatatan] = useState(''); 
    const [status, setStatus] = useState<'Selesai' | 'Diproses' | 'Menunggu'>('Selesai');
    const [customData, setCustomData] = useState<Record<string, string>>({});

    const handleCustomChange = (key: string, value: string) => {
        setCustomData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nama) {
            addToast("Nama pemohon wajib diisi.", "error");
            return;
        }
        
        // Validasi khusus KIA
        if (jenisDokumen === 'Kartu Identitas Anak (KIA)' && !namaOrangTua) {
             addToast("Nama Orang Tua wajib diisi untuk pengambilan KIA.", "error");
             return;
        }
        
        for (const col of customColumns) {
            if (col.required && !customData[col.label]) {
                addToast(`${col.label} wajib diisi.`, "error");
                return;
            }
        }

        try {
            // Masukkan Nama Orang Tua ke dalam customData agar tersimpan dinamis
            const finalCustomData = { ...customData };
            if (jenisDokumen === 'Kartu Identitas Anak (KIA)' && namaOrangTua) {
                finalCustomData['Nama Orang Tua'] = namaOrangTua;
            }

            await catatTransaksi('Pengambilan', {
                nama, noHp, namaPengambil,
                layanan: jenisDokumen,
                catatan,
                status
            }, finalCustomData);
            
            // Reset Form
            setNama(''); 
            setNoHp(''); 
            setNamaPengambil(''); 
            setCatatan(''); 
            setNamaOrangTua(''); // Reset nama orang tua
            setStatus('Selesai'); 
            setCustomData({});
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KOLOM KIRI: FORMULIR (2/3) */}
            <Card className="lg:col-span-2 border-border shadow-sm h-fit">
                <CardHeader className="pb-4">
                    <CardTitle>Agenda Pengambilan Dokumen</CardTitle>
                    <CardDescription>Pencatatan pengambilan dokumen kependudukan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* [COMPACT LAYOUT] Jenis & Nama dalam 1 Baris */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="jenis">Jenis Dokumen</Label>
                                <Select value={jenisDokumen} onValueChange={setJenisDokumen}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="KTP-el">KTP Elektronik</SelectItem>
                                        <SelectItem value="Kartu Keluarga">Kartu Keluarga</SelectItem>
                                        <SelectItem value="Kartu Identitas Anak (KIA)">Kartu Identitas Anak (KIA)</SelectItem>
                                        <SelectItem value="Akta Kelahiran">Akta Kelahiran</SelectItem>
                                        <SelectItem value="Akta Kematian">Akta Kematian</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="nama">
                                    {jenisDokumen === 'Kartu Identitas Anak (KIA)' ? 'Nama Anak' : 'Nama Pemohon'} <span className="text-red-500">*</span>
                                </Label>
                                <Input 
                                    id="nama" 
                                    value={nama} 
                                    onChange={e => setNama(e.target.value)} 
                                    placeholder="Sesuai dokumen..." 
                                    required
                                    className="bg-muted/20"
                                />
                            </div>
                        </div>

                        {/* [BARU] Input Khusus KIA: Nama Orang Tua */}
                        {jenisDokumen === 'Kartu Identitas Anak (KIA)' && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="ortu" className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                                        <Users size={14} /> Nama Orang Tua / Wali <span className="text-red-500">*</span>
                                    </Label>
                                    <Input 
                                        id="ortu" 
                                        value={namaOrangTua} 
                                        onChange={e => setNamaOrangTua(e.target.value)} 
                                        placeholder="Nama Ayah/Ibu..." 
                                        className="bg-white dark:bg-black/20"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="hp">No. HP (Opsional)</Label>
                                <Input id="hp" value={noHp} onChange={e => setNoHp(e.target.value)} placeholder="08..." />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pengambil">Nama Pengambil (Opsional)</Label>
                                <Input 
                                    id="pengambil" 
                                    value={namaPengambil} 
                                    onChange={e => setNamaPengambil(e.target.value)} 
                                    placeholder="Jika diwakilkan..."
                                />
                            </div>
                        </div>

                        {/* Kolom Kustom */}
                        {customColumns.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Detail Tambahan</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customColumns.map(col => (
                                        <div key={col.id} className="space-y-1.5">
                                            <Label className="text-xs">
                                                {col.label} {col.required && <span className="text-red-500">*</span>}
                                            </Label>
                                            {col.type === 'dropdown' ? (
                                                <Select 
                                                    value={customData[col.label] || ''} 
                                                    onValueChange={v => handleCustomChange(col.label, v)}
                                                >
                                                    <SelectTrigger className="bg-background h-9 text-sm">
                                                        <SelectValue placeholder={`Pilih...`} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {col.options?.map((opt: string) => (
                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input 
                                                    type="text"
                                                    value={customData[col.label] || ''}
                                                    onChange={e => handleCustomChange(col.label, e.target.value)}
                                                    placeholder="..."
                                                    className="bg-background h-9 text-sm"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Status & Catatan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                            <div className="space-y-1.5">
                                <Label>Status Dokumen <span className="text-red-500">*</span></Label>
                                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                    <SelectTrigger className={status === 'Selesai' ? 'bg-green-50 border-green-200 text-green-700' : ''}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Selesai">Selesai (Sudah Diserahkan)</SelectItem>
                                        <SelectItem value="Menunggu">Menunggu (Berkas Belum Jadi)</SelectItem>
                                        <SelectItem value="Diproses">Diproses (Sudah Jadi, Belum Diambil)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="catatan">Catatan (Opsional)</Label>
                                <Input id="catatan" value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Keterangan..." />
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base font-medium" disabled={isMutating}>
                            {isMutating ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                            Simpan Transaksi Pengambilan
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            {/* KOLOM KANAN */}
            <div className="space-y-6">
                <Card className="border-border shadow-sm bg-blue-50/50 dark:bg-blue-950/20 h-fit">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2 text-base">
                            <Info size={18} /> Petunjuk Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-4">
                        <div className="flex gap-3">
                            <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5"/>
                            <div><span className="font-semibold text-foreground block">Selesai</span>Dokumen fisik sudah diserahkan.</div>
                        </div>
                        <div className="flex gap-3">
                            <AlertTriangle size={18} className="text-orange-600 flex-shrink-0 mt-0.5"/>
                            <div><span className="font-semibold text-foreground block">Diproses</span>Sudah jadi, belum diambil.</div>
                        </div>
                        <div className="flex gap-3">
                            <Clock size={18} className="text-yellow-600 flex-shrink-0 mt-0.5"/>
                            <div><span className="font-semibold text-foreground block">Menunggu</span>Proses cetak belum selesai.</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}