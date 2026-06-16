// Directory: src/app/dashboard/keuangan/tabs/BukuKasTab.tsx
// [UPDATE] Menambahkan tombol QR Audit pada tabel BKU.

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useKeuanganData } from '@/app/dashboard/hooks/useKeuanganData';
import { UserProfile, KeuanganTransaksi } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search, Printer, QrCode } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { db } from '@/lib/firebase'; // Untuk ambil nama OPD jika perlu
import { doc, getDoc } from 'firebase/firestore';
import QrAuditModal from '../components/QrAuditModal';

export default function BukuKasTab({ userProfile }: { userProfile: UserProfile }) {
    const { transaksiList, isLoading } = useKeuanganData(userProfile);
    
    const [bulan, setBulan] = useState(new Date().getMonth().toString());
    const [tahun, setTahun] = useState(new Date().getFullYear().toString());
    const [searchTerm, setSearchTerm] = useState('');
    
    // State Modal QR
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [selectedQrTx, setSelectedQrTx] = useState<KeuanganTransaksi | null>(null);
    const [opdName, setOpdName] = useState('Pemerintah Daerah');

    useEffect(() => {
        if(userProfile.opdId) {
            getDoc(doc(db, 'opd', userProfile.opdId)).then(snap => {
                if(snap.exists()) setOpdName(snap.data().namaOpd);
            });
        }
    }, [userProfile.opdId]);

    // --- LOGIKA BKU (Sama seperti sebelumnya) ---
    const bkuData = useMemo(() => {
        let runningBalance = 0;
        const sorted = [...transaksiList].sort((a, b) => a.tanggal.toMillis() - b.tanggal.toMillis());
        const withBalance = sorted.map(t => {
            if (t.tipe === 'Masuk') runningBalance += t.jumlah;
            else runningBalance -= t.jumlah;
            return { ...t, saldoKumulatif: runningBalance };
        });
        const targetMonth = Number(bulan);
        const targetYear = Number(tahun);
        const currentMonthData = withBalance.filter(t => {
            const d = t.tanggal.toDate();
            return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });
        const prevTransactions = withBalance.filter(t => {
            const d = t.tanggal.toDate();
            return d.getTime() < new Date(targetYear, targetMonth, 1).getTime();
        });
        const saldoAwalBulan = prevTransactions.length > 0 ? prevTransactions[prevTransactions.length - 1].saldoKumulatif : 0;
        return { currentMonthData, saldoAwalBulan };
    }, [transaksiList, bulan, tahun]);

    const filteredData = useMemo(() => {
        return bkuData.currentMonthData.filter(t => 
            t.uraian.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.kodeRekening || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [bkuData, searchTerm]);

    const handleOpenQr = (t: KeuanganTransaksi) => {
        setSelectedQrTx(t);
        setIsQrOpen(true);
    };

    // ... (handleExport sama)

    return (
        <div className="space-y-4">
            {/* ... (Header Controls sama) ... */}
             <Card className="border-border shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-end">
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="w-32">
                            <Select value={bulan} onValueChange={setBulan}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Array.from({length: 12}).map((_, i) => (
                                        <SelectItem key={i} value={i.toString()}>
                                            {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-24">
                            <Select value={tahun} onValueChange={setTahun}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2025">2025</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                        <Input placeholder="Cari uraian / kode rekening..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9"/>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-border shadow-sm">
                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-b-2 border-muted-foreground/20">
                                <TableHead className="w-12 text-center">No</TableHead>
                                <TableHead className="w-28">Tanggal</TableHead>
                                <TableHead className="w-32">Kode Rek</TableHead>
                                <TableHead>Uraian</TableHead>
                                <TableHead className="text-right text-green-600">Penerimaan</TableHead>
                                <TableHead className="text-right text-red-600">Pengeluaran</TableHead>
                                <TableHead className="text-right font-bold bg-muted/20">Saldo</TableHead>
                                <TableHead className="text-center w-12">Bukti</TableHead>
                                <TableHead className="text-center w-12">Audit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {/* Baris Saldo Awal */}
                            <TableRow className="bg-yellow-50/50 dark:bg-yellow-900/10 font-semibold">
                                <TableCell colSpan={4} className="text-right italic pr-4">Saldo Awal Bulan Ini</TableCell>
                                <TableCell></TableCell><TableCell></TableCell>
                                <TableCell className="text-right font-mono">Rp {bkuData.saldoAwalBulan.toLocaleString('id-ID')}</TableCell>
                                <TableCell></TableCell><TableCell></TableCell>
                            </TableRow>

                            {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8">Memuat data...</TableCell></TableRow> : 
                             filteredData.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Tidak ada transaksi.</TableCell></TableRow> :
                             filteredData.map((t, i) => (
                                <TableRow key={t.id} className="hover:bg-muted/30">
                                    <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="whitespace-nowrap text-xs">{t.tanggal.toDate().toLocaleDateString('id-ID')}</TableCell>
                                    <TableCell className="font-mono text-xs">{t.kodeRekening || '-'}</TableCell>
                                    <TableCell className="text-sm max-w-[300px] truncate" title={t.uraian}>{t.uraian}</TableCell>
                                    <TableCell className="text-right text-xs font-mono text-green-600">{t.tipe === 'Masuk' ? t.jumlah.toLocaleString('id-ID') : '-'}</TableCell>
                                    <TableCell className="text-right text-xs font-mono text-red-600">{t.tipe === 'Keluar' ? t.jumlah.toLocaleString('id-ID') : '-'}</TableCell>
                                    <TableCell className="text-right text-xs font-mono font-bold bg-muted/10">{t.saldoKumulatif.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-center">
                                        {t.buktiUrl ? <Button asChild variant="ghost" size="icon" className="h-6 w-6 text-blue-500"><a href={t.buktiUrl} target="_blank" rel="noopener noreferrer"><FileText size={14}/></a></Button> : <span className="text-xs text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-600 hover:text-black" onClick={() => handleOpenQr(t)} title="QR Code Audit">
                                            <QrCode size={14}/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <QrAuditModal 
                isOpen={isQrOpen} 
                onClose={() => setIsQrOpen(false)} 
                transaksi={selectedQrTx} 
                opdNama={opdName} 
            />
        </div>
    );
}