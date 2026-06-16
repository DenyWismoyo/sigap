// Directory: src/app/dashboard/keuangan/tabs/LaporanTab.tsx
// [NEW FEATURE] Tab Pelaporan & Kepatuhan (Audit Ready).
// - Rekapitulasi Belanja & Pajak.
// - Link langsung ke Bukti Dukung (Nota).
// - Export Excel format Pemeriksaan.

"use client";

import React, { useState, useMemo } from 'react';
import { useKeuanganData } from '@/app/dashboard/hooks/useKeuanganData';
import { UserProfile, KeuanganTransaksi } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    FileCheck, Download, Printer, Calendar, 
    Search, ExternalLink, AlertCircle, Landmark 
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LaporanTab({ userProfile }: { userProfile: UserProfile }) {
    const { transaksiList, isLoading } = useKeuanganData(userProfile);
    
    const [filterMode, setFilterMode] = useState<'bulanan' | 'custom'>('bulanan');
    const [bulan, setBulan] = useState(new Date().getMonth().toString());
    const [tahun, setTahun] = useState(new Date().getFullYear().toString());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // --- FILTER DATA ---
    const filteredData = useMemo(() => {
        let data = transaksiList.filter(t => t.tipe === 'Keluar'); // Laporan fokus ke Belanja

        // Filter Waktu
        if (filterMode === 'bulanan') {
            data = data.filter(t => {
                const d = t.tanggal.toDate();
                return d.getMonth() === Number(bulan) && d.getFullYear() === Number(tahun);
            });
        } else {
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59);
                data = data.filter(t => {
                    const d = t.tanggal.toDate();
                    return d >= start && d <= end;
                });
            }
        }

        // Filter Pencarian
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(t => 
                t.uraian.toLowerCase().includes(lower) ||
                (t.kodeRekening || '').toLowerCase().includes(lower) ||
                t.penerima.toLowerCase().includes(lower)
            );
        }

        return data.sort((a, b) => a.tanggal.toMillis() - b.tanggal.toMillis());
    }, [transaksiList, filterMode, bulan, tahun, startDate, endDate, searchTerm]);

    // --- KALKULASI SUMMARY ---
    const summary = useMemo(() => {
        const totalBruto = filteredData.reduce((sum, t) => sum + t.jumlah, 0);
        let totalPpn = 0;
        let totalPph = 0;
        let missingEvidence = 0;

        filteredData.forEach(t => {
            if ((t as any).pajak) {
                totalPpn += (t as any).pajak.ppn || 0;
                totalPph += (t as any).pajak.pph || 0;
            }
            if (!t.buktiUrl) missingEvidence++;
        });

        return { totalBruto, totalPpn, totalPph, totalNetto: totalBruto - totalPpn - totalPph, missingEvidence };
    }, [filteredData]);

    // --- EXPORT EXCEL (FORMAT PEMERIKSAAN) ---
    const handleExportAudit = () => {
        const dataExport = filteredData.map((t, idx) => {
            const pajak = (t as any).pajak || { ppn: 0, pph: 0 };
            return {
                No: idx + 1,
                Tanggal: t.tanggal.toDate().toLocaleDateString('id-ID'),
                'Kode Rekening': t.kodeRekening || '-',
                'Uraian Belanja': t.uraian,
                'Penerima': t.penerima,
                'Nilai Bruto (Rp)': t.jumlah,
                'PPN (Rp)': pajak.ppn || 0,
                'PPh (Rp)': pajak.pph || 0,
                'Nilai Netto (Rp)': t.jumlah - (pajak.ppn || 0) - (pajak.pph || 0),
                'Link Bukti': t.buktiUrl || 'Tidak Ada'
            };
        });

        const ws = utils.json_to_sheet(dataExport);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Kertas Kerja Pemeriksaan");
        
        // Auto width columns
        const wscols = [
            {wch: 5}, {wch: 12}, {wch: 20}, {wch: 40}, {wch: 20}, 
            {wch: 15}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 50}
        ];
        ws['!cols'] = wscols;

        writeFile(wb, `Laporan_SPJ_${userProfile.opdId}_${filterMode === 'bulanan' ? `${bulan}-${tahun}` : 'Custom'}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fadeInUp">
            
            {/* HEADER CONTROLS */}
            <Card className="border-border shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row justify-between gap-4 items-end">
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                            {/* Mode Filter */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Periode Laporan</label>
                                <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bulanan">Per Bulan</SelectItem>
                                        <SelectItem value="custom">Rentang Tanggal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Kontrol Tanggal Dinamis */}
                            {filterMode === 'bulanan' ? (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Bulan</label>
                                        <Select value={bulan} onValueChange={setBulan}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Array.from({length: 12}).map((_, i) => (
                                                    <SelectItem key={i} value={i.toString()}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Tahun</label>
                                        <Select value={tahun} onValueChange={setTahun}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2024">2024</SelectItem>
                                                <SelectItem value="2025">2025</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Dari</label>
                                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Sampai</label>
                                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2 w-full lg:w-auto">
                             <Button variant="outline" onClick={() => window.print()}>
                                <Printer size={16} className="mr-2" /> Cetak
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleExportAudit}>
                                <Download size={16} className="mr-2" /> Export Audit (Excel)
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SCORECARDS RINGKASAN */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col">
                        <span className="text-xs text-muted-foreground font-bold uppercase">Total Belanja (Bruto)</span>
                        <span className="text-xl font-bold text-foreground mt-1">Rp {summary.totalBruto.toLocaleString('id-ID')}</span>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col">
                        <span className="text-xs text-muted-foreground font-bold uppercase">Potongan Pajak (PPN+PPh)</span>
                        <span className="text-xl font-bold text-red-600 mt-1">Rp {(summary.totalPpn + summary.totalPph).toLocaleString('id-ID')}</span>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col">
                        <span className="text-xs text-muted-foreground font-bold uppercase">Realisasi Bersih (Netto)</span>
                        <span className="text-xl font-bold text-green-600 mt-1">Rp {summary.totalNetto.toLocaleString('id-ID')}</span>
                    </CardContent>
                </Card>
                <Card className={`${summary.missingEvidence > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} shadow-sm`}>
                    <CardContent className="p-4 flex flex-col">
                        <span className={`text-xs font-bold uppercase ${summary.missingEvidence > 0 ? 'text-red-700' : 'text-green-700'}`}>Kelengkapan Bukti</span>
                        <div className="flex items-center mt-1">
                            {summary.missingEvidence > 0 ? (
                                <AlertCircle size={20} className="text-red-600 mr-2" />
                            ) : (
                                <FileCheck size={20} className="text-green-600 mr-2" />
                            )}
                            <span className={`text-lg font-bold ${summary.missingEvidence > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {summary.missingEvidence > 0 ? `${summary.missingEvidence} Belum Lengkap` : 'Lengkap (100%)'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* SEARCH */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input 
                    placeholder="Cari uraian, kode rekening, atau toko..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-card"
                />
            </div>

            {/* TABEL DATA RINCIAN */}
            <Card className="overflow-hidden border-border shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-10 text-center">No</TableHead>
                                <TableHead className="w-24">Tanggal</TableHead>
                                <TableHead className="w-32">Kode Rek</TableHead>
                                <TableHead>Uraian Belanja</TableHead>
                                <TableHead className="text-right">Bruto</TableHead>
                                <TableHead className="text-right text-red-600">Pajak</TableHead>
                                <TableHead className="text-right text-green-600">Netto</TableHead>
                                <TableHead className="text-center w-20">Bukti</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-8">Memuat data...</TableCell></TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data transaksi untuk periode ini.</TableCell></TableRow>
                            ) : (
                                filteredData.map((t, i) => {
                                    const pajak = (t as any).pajak || { ppn: 0, pph: 0 };
                                    const totalPajak = (pajak.ppn || 0) + (pajak.pph || 0);
                                    const netto = t.jumlah - totalPajak;

                                    return (
                                        <TableRow key={t.id} className="hover:bg-muted/30">
                                            <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="whitespace-nowrap text-xs">{t.tanggal.toDate().toLocaleDateString('id-ID')}</TableCell>
                                            <TableCell className="font-mono text-xs font-medium">{t.kodeRekening || '-'}</TableCell>
                                            <TableCell className="text-sm">
                                                <div className="font-medium line-clamp-1">{t.uraian}</div>
                                                <div className="text-xs text-muted-foreground">{t.penerima}</div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-mono">
                                                {t.jumlah.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-mono text-red-600">
                                                {totalPajak > 0 ? totalPajak.toLocaleString('id-ID') : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-mono text-green-600 font-bold">
                                                {netto.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {t.buktiUrl ? (
                                                    <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title="Lihat Bukti">
                                                        <a href={t.buktiUrl} target="_blank" rel="noopener noreferrer"><FileCheck size={14}/></a>
                                                    </Button>
                                                ) : (
                                                    <div title="Bukti Belum Diupload">
                                                        <AlertCircle size={14} className="mx-auto text-red-400" />
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}