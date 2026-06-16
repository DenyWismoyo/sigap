// Directory: src/app/dashboard/pelayanan/tabs/RiwayatTab.tsx
// [UPDATE] Menambahkan kolom 'Petugas' pada tabel riwayat.

"use client";

import React, { useState, useEffect, useMemo } from 'react'; 
import { UserProfile } from '@/types';
import { usePelayananData } from '@/app/dashboard/hooks/usePelayananData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Loader2, CheckCircle, Printer, ChevronLeft, ChevronRight, Calendar, Filter, User } from 'lucide-react'; // Added User icon
import { Badge } from "@/components/ui/badge";
import { utils, writeFile } from 'xlsx';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { TandaTerimaLayananPdf } from '../components/TandaTerimaLayananPdf'; 
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Label } from '@/components/ui/label';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function RiwayatTab({ userProfile }: { userProfile: UserProfile }) {
    const { allTransactions, isLoading, updateStatus } = usePelayananData();
    const [opdName, setOpdName] = useState('Instansi Pemerintah');

    // --- STATE FILTER ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterKategori, setFilterKategori] = useState('Semua');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // --- STATE PAGINATION ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch Nama OPD
    useEffect(() => {
        const getOpdName = async () => {
            if(userProfile.opdId) {
                const snap = await getDoc(doc(db, 'opd', userProfile.opdId));
                if(snap.exists()) setOpdName(snap.data().namaOpd);
            }
        }
        getOpdName();
    }, [userProfile.opdId]);

    // Reset halaman saat filter berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterKategori, startDate, endDate, itemsPerPage]);

    // --- LOGIKA FILTER UTAMA ---
    const filteredData = useMemo(() => {
        return allTransactions.filter(item => {
            // 1. Filter Search (Nama / Layanan / ID / Petugas)
            const searchLower = searchTerm.toLowerCase();
            const matchSearch = 
                item.namaPemohon.toLowerCase().includes(searchLower) ||
                (item.jenisDokumen || item.judulLayanan || '').toLowerCase().includes(searchLower) ||
                (item.petugasNama || '').toLowerCase().includes(searchLower) || // Added search by petugas
                (item.id || '').toLowerCase().includes(searchLower);

            // 2. Filter Kategori
            const matchKategori = filterKategori === 'Semua' || item.kategori === filterKategori;

            // 3. Filter Tanggal
            let matchDate = true;
            if (startDate || endDate) {
                const itemDate = item.tanggal.toDate(); // Timestamp Firestore ke JS Date
                // Set time ke 00:00:00 untuk komparasi akurat
                itemDate.setHours(0, 0, 0, 0);
                
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0,0,0,0);
                    if (itemDate < start) matchDate = false;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23,59,59,999);
                    if (itemDate > end) matchDate = false;
                }
            }

            return matchSearch && matchKategori && matchDate;
        });
    }, [allTransactions, searchTerm, filterKategori, startDate, endDate]);

    // --- LOGIKA PAGINATION ---
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    // Export Handler
    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            No: idx + 1,
            Tanggal: item.tanggal.toDate().toLocaleString('id-ID'),
            Kategori: item.kategori,
            Layanan: item.jenisDokumen || item.judulLayanan,
            Nama: item.namaPemohon,
            Pengambil: item.namaPengambil || '-',
            Petugas: item.petugasNama,
            Status: item.status,
            Catatan: item.catatan
        }));

        const ws = utils.json_to_sheet(exportData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Log Pelayanan");
        writeFile(wb, `Laporan_Pelayanan_${new Date().toISOString().split('T')[0]}.xlsx`);
    };
    
    const handleMarkDone = (id: string) => {
        if(confirm("Tandai layanan ini sebagai Selesai?")) {
            updateStatus(id, 'Selesai');
        }
    }

    return (
        <div className="space-y-4">
            {/* --- FILTER BAR --- */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Riwayat & Pencarian</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredData.length === 0}>
                            <Download size={14} className="mr-2"/> Export Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        {/* Search Text */}
                        <div className="md:col-span-4">
                            <Label className="text-xs mb-1.5 block">Pencarian</Label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                                <Input 
                                    placeholder="Nama / Layanan / Petugas..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>
                        </div>

                        {/* Kategori */}
                        <div className="md:col-span-2">
                            <Label className="text-xs mb-1.5 block">Jenis Layanan</Label>
                            <Select value={filterKategori} onValueChange={setFilterKategori}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Semua">Semua</SelectItem>
                                    <SelectItem value="Pengambilan">Pengambilan</SelectItem>
                                    <SelectItem value="Layanan Umum">Layanan Umum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tanggal Mulai */}
                        <div className="md:col-span-3">
                            <Label className="text-xs mb-1.5 block">Dari Tanggal</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm"/>
                        </div>

                        {/* Tanggal Selesai */}
                        <div className="md:col-span-3">
                            <Label className="text-xs mb-1.5 block">Sampai Tanggal</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm"/>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- TABLE CARD --- */}
            <Card className="border-border shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[140px]">Waktu</TableHead>
                                    <TableHead>Pemohon</TableHead>
                                    <TableHead>Layanan</TableHead>
                                    <TableHead>Petugas</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                                ) : paginatedData.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground flex-col">
                                        <Filter size={32} className="mx-auto mb-2 opacity-20"/>
                                        <p>Tidak ada data yang cocok dengan filter.</p>
                                    </TableCell></TableRow>
                                ) : (
                                    paginatedData.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/30">
                                            <TableCell className="text-xs whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.tanggal.toDate().toLocaleDateString('id-ID')}</span>
                                                    <span className="text-muted-foreground text-[10px]">{item.tanggal.toDate().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.namaPemohon}</div>
                                                {item.namaPengambil && <div className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle size={10}/> Diambil: {item.namaPengambil}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="mb-1 text-[10px] px-1 py-0 h-4">{item.kategori}</Badge>
                                                <div className="text-xs font-medium">{item.jenisDokumen || item.judulLayanan}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <User size={12} />
                                                    {item.petugasNama}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === 'Selesai' ? 'default' : 'secondary'} className={`text-[10px] ${item.status === 'Selesai' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <PDFDownloadLink
                                                        document={<TandaTerimaLayananPdf data={item} opdName={opdName} />}
                                                        fileName={`RESI_${item.namaPemohon.replace(/\s+/g, '_')}.pdf`}
                                                    >
                                                        {/* @ts-ignore */}
                                                        {({ loading }) => (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" disabled={loading} title="Cetak Resi">
                                                                {loading ? <Loader2 size={14} className="animate-spin"/> : <Printer size={16} />}
                                                            </Button>
                                                        )}
                                                    </PDFDownloadLink>

                                                    {item.status !== 'Selesai' && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleMarkDone(item.id!)} title="Tandai Selesai" className="h-8 w-8 text-green-600 hover:bg-green-50">
                                                            <CheckCircle size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* --- PAGINATION CONTROLS --- */}
            {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Baris per halaman:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{ITEMS_PER_PAGE_OPTIONS.map(opt => <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                        <span className="ml-2">
                            <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> dari <strong>{totalItems}</strong>
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14}/></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={14}/></Button>
                    </div>
                </div>
            )}
        </div>
    );
}