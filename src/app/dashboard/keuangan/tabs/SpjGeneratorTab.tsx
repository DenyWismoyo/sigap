// Directory: src/app/dashboard/keuangan/tabs/SpjGeneratorTab.tsx
// [VISIONER] Auto SPJ Builder.
// - Filter transaksi per Kode Rekening (Kegiatan).
// - Generate Daftar Rincian & Cover SPJ.

"use client";

import React, { useState, useMemo } from 'react';
import { useKeuanganData } from '@/app/dashboard/hooks/useKeuanganData';
import { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Layers, CheckCircle2, AlertCircle, Download, Printer } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { utils, writeFile } from 'xlsx';

export default function SpjGeneratorTab({ userProfile }: { userProfile: UserProfile }) {
    const { rekeningSummary, transaksiList, isLoading } = useKeuanganData(userProfile);
    const [selectedRekening, setSelectedRekening] = useState<string>('');

    // Filter transaksi berdasarkan rekening yang dipilih
    const spjTransactions = useMemo(() => {
        if (!selectedRekening) return [];
        return transaksiList
            .filter(t => t.kodeRekening === selectedRekening && t.tipe === 'Keluar')
            .sort((a, b) => a.tanggal.toMillis() - b.tanggal.toMillis());
    }, [selectedRekening, transaksiList]);

    const selectedRekeningDetail = rekeningSummary.find(r => r.kode === selectedRekening);

    const totalSpj = spjTransactions.reduce((sum, t) => sum + t.jumlah, 0);
    const completedDocs = spjTransactions.filter(t => t.buktiUrl && t.status === 'Final').length;
    const completeness = spjTransactions.length > 0 ? (completedDocs / spjTransactions.length) * 100 : 0;

    const handleExportRincian = () => {
        if (spjTransactions.length === 0) return;
        const data = spjTransactions.map((t, i) => ({
            No: i + 1,
            Tanggal: t.tanggal.toDate().toLocaleDateString('id-ID'),
            Uraian: t.uraian,
            Penerima: t.penerima,
            Jumlah: t.jumlah,
            PPN: t.pajak?.ppn || 0,
            PPh: t.pajak?.pph || 0
        }));
        
        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Rincian SPJ");
        writeFile(wb, `Rincian_SPJ_${selectedRekening}.xlsx`);
    };

    if (isLoading) return <div className="p-8 text-center">Memuat data...</div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="text-blue-600" /> Generator Dokumen SPJ
                    </CardTitle>
                    <CardDescription>Pilih kegiatan untuk membuat rincian pertanggungjawaban secara otomatis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="max-w-xl">
                        <label className="text-sm font-medium mb-1.5 block">Pilih Kegiatan / Kode Rekening</label>
                        <Select value={selectedRekening} onValueChange={setSelectedRekening}>
                            <SelectTrigger>
                                <SelectValue placeholder="Cari kegiatan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {rekeningSummary.map(rek => (
                                    <SelectItem key={rek.id} value={rek.kode}>
                                        <span className="font-mono font-bold mr-2">{rek.kode}</span>
                                        {rek.nama.substring(0, 40)}...
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedRekening && selectedRekeningDetail && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Nama Kegiatan</p>
                                <p className="font-medium text-sm">{selectedRekeningDetail.nama}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Total Realisasi (SPJ)</p>
                                <p className="font-bold text-blue-600">Rp {totalSpj.toLocaleString('id-ID')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Kelengkapan Bukti</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={completeness === 100 ? 'default' : 'destructive'}>
                                        {completeness.toFixed(0)}%
                                    </Badge>
                                    {completeness < 100 && <span className="text-xs text-red-500">Belum lengkap!</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedRekening && (
                <Card className="border-border shadow-sm">
                    <CardHeader className="border-b pb-3 flex flex-row justify-between items-center">
                        <CardTitle className="text-base">Draf Rincian Belanja</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer className="mr-2 h-4 w-4" /> Cetak Cover
                            </Button>
                            <Button size="sm" onClick={handleExportRincian} className="bg-green-600 hover:bg-green-700">
                                <Download className="mr-2 h-4 w-4" /> Download Rincian (Excel)
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12 text-center">No</TableHead>
                                        <TableHead className="w-32">Tanggal</TableHead>
                                        <TableHead>Uraian</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                        <TableHead className="text-center w-24">Bukti</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {spjTransactions.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada transaksi.</TableCell></TableRow>
                                    ) : (
                                        spjTransactions.map((t, i) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="text-center text-xs">{i + 1}</TableCell>
                                                <TableCell className="text-xs">{t.tanggal.toDate().toLocaleDateString('id-ID')}</TableCell>
                                                <TableCell className="text-sm">{t.uraian}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {t.jumlah.toLocaleString('id-ID')}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {t.buktiUrl ? <CheckCircle2 size={16} className="text-green-500 mx-auto"/> : <AlertCircle size={16} className="text-red-500 mx-auto"/>}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}