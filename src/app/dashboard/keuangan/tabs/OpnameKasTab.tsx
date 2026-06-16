// Directory: src/app/dashboard/keuangan/tabs/OpnameKasTab.tsx
// [VISIONER] Asisten Opname Kas Digital.
// - Kalkulator Pecahan Uang.
// - Rekonsiliasi Otomatis (Fisik vs Buku).
// - Cetak Berita Acara.

"use client";

import React, { useState, useMemo } from 'react';
import { useKeuanganData } from '@/app/dashboard/hooks/useKeuanganData';
import { UserProfile, OpnameKas } from '@/types';
import { db } from '@/lib/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, CheckCircle, AlertTriangle, Printer, Save, Coins, RefreshCcw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const DENOMINATIONS = [
    { val: 100000, label: 'Rp 100.000' },
    { val: 50000, label: 'Rp 50.000' },
    { val: 20000, label: 'Rp 20.000' },
    { val: 10000, label: 'Rp 10.000' },
    { val: 5000, label: 'Rp 5.000' },
    { val: 2000, label: 'Rp 2.000' },
    { val: 1000, label: 'Rp 1.000' },
    { val: 500, label: 'Koin Rp 500' },
    { val: 200, label: 'Koin Rp 200' },
    { val: 100, label: 'Koin Rp 100' },
];

export default function OpnameKasTab({ userProfile }: { userProfile: UserProfile }) {
    const { saldoKas, isLoading } = useKeuanganData(userProfile);
    const { addToast } = useToast();
    
    const [counts, setCounts] = useState<{[key: number]: number}>({});
    const [keterangan, setKeterangan] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const handleCountChange = (val: number, count: string) => {
        setCounts(prev => ({ ...prev, [val]: Number(count) || 0 }));
    };

    const totalFisik = useMemo(() => {
        return Object.entries(counts).reduce((acc, [val, count]) => acc + (Number(val) * count), 0);
    }, [counts]);

    const selisih = totalFisik - saldoKas;

    const handleSaveOpname = async () => {
        if (!userProfile.opdId) return;
        setIsSaving(true);
        try {
            const opnameData: OpnameKas = {
                opdId: userProfile.opdId,
                tanggal: Timestamp.now(),
                saldoBuku: saldoKas,
                saldoFisik: totalFisik,
                selisih: selisih,
                keterangan: keterangan,
                // Simpan rincian sebagai string map agar aman di Firestore
                rincianPecahan: Object.fromEntries(
                    Object.entries(counts).map(([k, v]) => [k, v])
                ),
                petugas: userProfile.uid,
                createdAt: Timestamp.now()
            };

            await addDoc(collection(db, 'keuangan_opname'), opnameData);
            addToast("Berita Acara Opname Kas berhasil disimpan.", "success");
            setShowResult(true);
        } catch (error) {
            console.error(error);
            addToast("Gagal menyimpan data.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setCounts({});
        setKeterangan('');
        setShowResult(false);
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat data kas...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeInUp">
            {/* KOLOM KIRI: KALKULATOR */}
            <Card className="lg:col-span-2 border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="text-blue-600" />
                        Kalkulator Fisik Uang
                    </CardTitle>
                    <CardDescription>Masukkan jumlah lembar/keping uang yang ada di brankas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        {DENOMINATIONS.map((denom) => (
                            <div key={denom.val} className="flex items-center justify-between p-2 border-b border-dashed">
                                <Label className="w-24 font-mono text-sm">{denom.label}</Label>
                                <div className="flex items-center gap-2 flex-1">
                                    <Input 
                                        type="number" 
                                        placeholder="0"
                                        className="h-8 w-20 text-right"
                                        value={counts[denom.val] || ''}
                                        onChange={(e) => handleCountChange(denom.val, e.target.value)}
                                    />
                                    <span className="text-xs text-muted-foreground w-8">lbr</span>
                                </div>
                                <div className="w-24 text-right font-bold text-sm text-foreground">
                                    {((counts[denom.val] || 0) * denom.val).toLocaleString('id-ID')}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total Fisik Uang:</span>
                            <span className="text-blue-700 dark:text-blue-400">Rp {totalFisik.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KOLOM KANAN: HASIL REKONSILIASI */}
            <div className="space-y-6">
                <Card className={`border-l-4 shadow-md ${selisih === 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardHeader>
                        <CardTitle className="text-lg">Hasil Opname</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Saldo di Buku (Sistem):</span>
                            <span className="font-semibold">Rp {saldoKas.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Fisik di Brankas:</span>
                            <span className="font-semibold">Rp {totalFisik.toLocaleString('id-ID')}</span>
                        </div>
                        
                        <div className={`mt-4 p-3 rounded-lg text-center border ${selisih === 0 ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300'}`}>
                            <p className="text-xs uppercase font-bold mb-1">Status</p>
                            {selisih === 0 ? (
                                <div className="flex items-center justify-center gap-2">
                                    <CheckCircle size={20} />
                                    <span className="text-lg font-bold">KLOP (Sesuai)</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <AlertTriangle size={20} />
                                    <span className="text-lg font-bold">SELISIH: Rp {selisih.toLocaleString('id-ID')}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Catatan / Penjelasan</Label>
                            <Textarea 
                                placeholder="Contoh: Selisih karena ada uang kembalian belum dicatat..."
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSaveOpname} disabled={isSaving || totalFisik === 0}>
                            {isSaving ? 'Menyimpan...' : <><Save className="mr-2 h-4 w-4"/> Simpan Hasil</>}
                        </Button>
                        {showResult && (
                            <Button variant="outline" className="w-full" onClick={() => window.print()}>
                                <Printer className="mr-2 h-4 w-4" /> Cetak Berita Acara
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="w-full" onClick={resetForm}>
                            <RefreshCcw className="mr-2 h-3 w-3" /> Reset Kalkulator
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}