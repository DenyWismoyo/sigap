// Lokasi: src/app/dashboard/pelayanan/tabs/LayananUmumTab.tsx
// [LAYOUT COMPACT] Jenis & Nama 1 baris, Textarea 1 baris (rows=1).

"use client";

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { usePelayananData } from '@/app/dashboard/hooks/usePelayananData';
import { Save, Loader2, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function LayananUmumTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    const { catatTransaksi, isMutating, customColumns } = usePelayananData(); 

    const [nama, setNama] = useState('');
    const [noHp, setNoHp] = useState('');
    const [namaPengambil, setNamaPengambil] = useState(''); 
    const [layanan, setLayanan] = useState('Surat Pengantar');
    const [catatan, setCatatan] = useState('');
    const [status, setStatus] = useState<'Selesai' | 'Diproses'>('Selesai');
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
        for (const col of customColumns) {
            if (col.required && !customData[col.label]) {
                addToast(`${col.label} wajib diisi.`, "error");
                return;
            }
        }

        try {
             await catatTransaksi('Layanan Umum', {
                nama, noHp, namaPengambil,
                layanan,
                catatan,
                status
            }, customData);
            
            setNama(''); setNoHp(''); setNamaPengambil(''); setCatatan(''); setCustomData({});
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KOLOM KIRI: FORMULIR (2/3) */}
            <Card className="lg:col-span-2 border-border shadow-sm h-fit">
                <CardHeader className="pb-4">
                    <CardTitle>Agenda Layanan Administrasi</CardTitle>
                    <CardDescription>Pencatatan surat pengantar, surat pindah, legalisir, dll.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* [COMPACT LAYOUT] Jenis & Nama dalam 1 Baris */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Jenis Layanan</Label>
                                <Select value={layanan} onValueChange={setLayanan}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Surat Pengantar">Surat Pengantar</SelectItem>
                                        <SelectItem value="Surat Pindah">Surat Pindah</SelectItem>
                                        <SelectItem value="Legalisir Dokumen">Legalisir Dokumen</SelectItem>
                                        <SelectItem value="Konsultasi">Konsultasi</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Nama Pemohon <span className="text-red-500">*</span></Label>
                                <Input value={nama} onChange={e => setNama(e.target.value)} required placeholder="Nama Lengkap..." className="bg-muted/20"/>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>No. HP (Opsional)</Label>
                                <Input value={noHp} onChange={e => setNoHp(e.target.value)} placeholder="08..." />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Nama Kuasa / Pengambil</Label>
                                <Input value={namaPengambil} onChange={e => setNamaPengambil(e.target.value)} placeholder="Jika diwakilkan..." />
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
                                <Label>Status Akhir</Label>
                                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                    <SelectTrigger className={status === 'Selesai' ? 'bg-green-50 border-green-200 text-green-700' : ''}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Selesai">Selesai (Langsung Jadi)</SelectItem>
                                        <SelectItem value="Diproses">Diproses (Menunggu TTD/Proses)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Detail / Catatan</Label>
                                {/* [UPDATE] Textarea rows=1 agar ringkas */}
                                <Textarea 
                                    value={catatan} 
                                    onChange={e => setCatatan(e.target.value)} 
                                    placeholder="Keterangan tambahan..." 
                                    rows={1} 
                                    className="min-h-[2.5rem] py-2"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base font-medium" disabled={isMutating}>
                            {isMutating ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} 
                            Simpan Transaksi Layanan
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* KOLOM KANAN */}
            <div className="space-y-6">
                <Card className="border-border shadow-sm bg-amber-50/50 dark:bg-amber-950/20 h-fit">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2 text-base">
                            <Info size={18} /> Informasi Layanan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-4">
                        <div className="flex gap-3">
                            <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5"/>
                            <div><span className="font-semibold text-foreground block">Selesai (One Day Service)</span>Langsung jadi.</div>
                        </div>
                        <div className="flex gap-3">
                            <AlertTriangle size={18} className="text-orange-600 flex-shrink-0 mt-0.5"/>
                            <div><span className="font-semibold text-foreground block">Diproses (Tertunda)</span>Butuh proses lanjut.</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}