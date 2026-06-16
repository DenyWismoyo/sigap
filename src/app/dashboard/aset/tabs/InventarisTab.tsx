// Directory: src/app/dashboard/aset/tabs/InventarisTab.tsx
// [UPDATE] Implementasi Pagination Client-side & Export Excel.

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { AsetInventaris, UserProfile } from '@/types';
import { Plus, Search, FilePenLine, Trash2, QrCode, MapPin, Box, MoreVertical, Printer, User, Upload, FileText, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import AssetFormModal from '@/app/dashboard/aset/components/AssetFormModal';
import QrCodeModal from '@/app/dashboard/aset/components/QrCodeModal';
import RoomInventoryModal from '@/app/dashboard/aset/components/RoomInventoryModal';
import AssetImportModal from '@/app/dashboard/aset/components/AssetImportModal';
import { BeritaAcaraPdf } from '@/app/dashboard/aset/components/BeritaAcaraPdf';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/context/ToastContext';
import { useAssetData } from '@/app/dashboard/hooks/useAssetData';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData'; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PDFDownloadLink } from '@react-pdf/renderer';

// Pilihan jumlah baris per halaman
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function InventarisTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    const { assets: asetList, isLoading: loadingAsset, refetch } = useAssetData();
    const { usersList, isLoading: loadingUsers } = useMasterData(true);
    
    // --- STATE PAGING & FILTER ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterKategori, setFilterKategori] = useState('Semua');
    const [opdName, setOpdName] = useState('Instansi Pemerintah');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isExporting, setIsExporting] = useState(false);

    // --- STATE MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isKirModalOpen, setIsKirModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [asetToEdit, setAsetToEdit] = useState<AsetInventaris | null>(null);
    const [selectedQrAset, setSelectedQrAset] = useState<AsetInventaris | null>(null);

    // Map User untuk performa lookup
    const userMapByUid = useMemo(() => {
        const map = new Map<string, UserProfile>();
        usersList.forEach(u => map.set(u.uid, u));
        return map;
    }, [usersList]);

    useEffect(() => {
        const fetchOpdName = async () => {
            if (userProfile.opdId) {
                try {
                    const opdDoc = await getDoc(doc(db, 'opd', userProfile.opdId));
                    if (opdDoc.exists()) setOpdName(opdDoc.data().namaOpd);
                } catch (e) { console.error(e); }
            }
        };
        fetchOpdName();
    }, [userProfile.opdId]);

    // Reset ke halaman 1 jika filter berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterKategori, itemsPerPage]);

    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus aset ini?")) return;
        try {
            await deleteDoc(doc(db, 'asetInventaris', id));
            addToast("Aset dihapus.", "success");
            refetch();
        } catch (e) { addToast("Gagal menghapus.", "error"); }
    };

    const handleQrClick = (aset: AsetInventaris) => {
        setSelectedQrAset(aset);
        setIsQrModalOpen(true);
    };

    // [BARU] Fitur Export Excel
    const handleExport = async () => {
        if (filteredData.length === 0) { addToast("Tidak ada data untuk diekspor.", "error"); return; }
        setIsExporting(true);
        try {
            const XLSX = await import('xlsx'); // Dynamic import
            const dataToExport = filteredData.map((aset, idx) => ({
                No: idx + 1,
                "Kode Aset": aset.kodeAset,
                "Nama Aset": aset.namaAset,
                Kategori: aset.kategori,
                Tahun: aset.tahunPengadaan,
                Kondisi: aset.kondisi,
                Status: aset.status,
                Lokasi: aset.lokasi,
                "Nilai (Rp)": aset.nilaiPerolehan || 0,
                "Pemegang": userMapByUid.get(aset.pemegangAsetId || '')?.namaLengkap || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventaris Aset");
            XLSX.writeFile(wb, `Inventaris_Aset_${new Date().toISOString().split('T')[0]}.xlsx`);
            addToast("File Excel berhasil diunduh.", "success");
        } catch (err) {
            console.error(err);
            addToast("Gagal export Excel.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    // Filter Logic
    const filteredData = useMemo(() => {
        return asetList.filter(aset => {
            const pemegangNama = aset.pemegangAsetId ? userMapByUid.get(aset.pemegangAsetId)?.namaLengkap || '' : '';
            const matchSearch = aset.namaAset.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                aset.kodeAset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                pemegangNama.toLowerCase().includes(searchTerm.toLowerCase());
            const matchKat = filterKategori === 'Semua' || aset.kategori === filterKategori;
            return matchSearch && matchKat;
        });
    }, [asetList, searchTerm, filterKategori, userMapByUid]);

    // Pagination Logic
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const categories = useMemo(() => ['Semua', ...Array.from(new Set(asetList.map(a => a.kategori)))], [asetList]);
    const loading = loadingAsset || loadingUsers;

    const renderPemegang = (id?: string | null) => {
        if (!id) return <span className="text-muted-foreground text-xs">-</span>;
        const user = userMapByUid.get(id);
        if (user) {
            return (
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <User size={14} className="text-blue-600 flex-shrink-0" /> 
                    <span className="truncate max-w-[150px]" title={user.namaLengkap}>{user.namaLengkap}</span>
                </div>
            );
        }
        return <span className="text-muted-foreground text-xs italic">User Tidak Dikenal</span>;
    };

    return (
        <div className="space-y-4">
            {/* Controls Bar */}
            <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-4 flex flex-col xl:flex-row gap-4 justify-between items-end xl:items-center">
                    <div className="w-full xl:w-auto flex-1 flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input 
                                placeholder="Cari nama, kode, atau pemegang..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="pl-9 bg-background"
                            />
                        </div>
                        <Select value={filterKategori} onValueChange={setFilterKategori}>
                            <SelectTrigger className="w-full md:w-[180px] bg-background">
                                <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        
                        {/* Pagination Size Selector (Desktop) */}
                        <div className="hidden md:flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Baris:</span>
                            <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                                <SelectTrigger className="w-[70px] h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ITEMS_PER_PAGE_OPTIONS.map(opt => <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
                        <Button onClick={handleExport} disabled={isExporting} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                            {isExporting ? <Loader2 size={16} className="animate-spin mr-2"/> : <Download size={16} className="mr-2" />} 
                            Export
                        </Button>
                        <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            <Upload size={16} className="mr-2" /> Import
                        </Button>
                        <Button onClick={() => setIsKirModalOpen(true)} variant="outline">
                            <Printer size={16} className="mr-2" /> Cetak KIR
                        </Button>
                        <Button onClick={() => { setAsetToEdit(null); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90">
                            <Plus size={16} className="mr-2" /> Tambah
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* DESKTOP VIEW (Table) */}
            <Card className="hidden md:block overflow-hidden border-border shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[120px]">Kode</TableHead>
                                <TableHead>Nama Aset</TableHead>
                                <TableHead>Pemegang (PJ)</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Kondisi</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Lokasi</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Memuat data inventaris...</TableCell></TableRow>
                            ) : paginatedData.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Tidak ada aset ditemukan.</TableCell></TableRow>
                            ) : (
                                paginatedData.map(aset => {
                                    const pemegangUser = aset.pemegangAsetId ? userMapByUid.get(aset.pemegangAsetId) : null;
                                    return (
                                        <TableRow key={aset.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-mono text-xs text-muted-foreground">{aset.kodeAset}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    {aset.fotoUrl ? (
                                                        <img src={aset.fotoUrl} alt="" className="w-9 h-9 rounded object-cover bg-muted border" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-xs border">📦</div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="truncate max-w-[200px]" title={aset.namaAset}>{aset.namaAset}</span>
                                                        <span className="text-[10px] text-muted-foreground">Thn: {aset.tahunPengadaan || '-'}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{renderPemegang(aset.pemegangAsetId)}</TableCell>
                                            <TableCell>{aset.kategori}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    aset.kondisi === 'Baik' ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' : 
                                                    aset.kondisi === 'Rusak Berat' ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20' : 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                                }>{aset.kondisi}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={
                                                    aset.status === 'Tersedia' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                                    aset.status === 'Dipinjam' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-gray-100 text-gray-700'
                                                }>{aset.status}</Badge>
                                            </TableCell>
                                            <TableCell>{aset.lokasi}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={16} /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleQrClick(aset)}><QrCode size={14} className="mr-2"/> QR Code</DropdownMenuItem>
                                                        {pemegangUser && (
                                                            <PDFDownloadLink
                                                                document={<BeritaAcaraPdf opdName={opdName} pihakPertama={userProfile} pihakKedua={pemegangUser} assets={[aset]} tanggal={new Date()} />}
                                                                fileName={`BAST_${aset.kodeAset}.pdf`}
                                                            >
                                                                {/* @ts-ignore */}
                                                                {({ loading }) => (<DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={loading}><FileText size={14} className="mr-2"/> {loading ? '...' : 'Cetak BAST'}</DropdownMenuItem>)}
                                                            </PDFDownloadLink>
                                                        )}
                                                        <DropdownMenuItem onClick={() => { setAsetToEdit(aset); setIsModalOpen(true); }}><FilePenLine size={14} className="mr-2"/> Edit</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDelete(aset.id!)} className="text-red-600"><Trash2 size={14} className="mr-2"/> Hapus</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* MOBILE VIEW (Cards) */}
            <div className="md:hidden space-y-3">
                {paginatedData.map(aset => (
                    <Card key={aset.id} className="border-border shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex p-3 gap-3">
                                {aset.fotoUrl ? <img src={aset.fotoUrl} alt="" className="w-20 h-20 rounded-lg object-cover bg-muted flex-shrink-0 border" /> : <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0 border">📦</div>}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-foreground text-sm line-clamp-2">{aset.namaAset}</h4>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1"><MoreVertical size={14} /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleQrClick(aset)}><QrCode size={14} className="mr-2"/> QR Code</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setAsetToEdit(aset); setIsModalOpen(true); }}><FilePenLine size={14} className="mr-2"/> Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(aset.id!)} className="text-red-600"><Trash2 size={14} className="mr-2"/> Hapus</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-mono">{aset.kodeAset}</p>
                                    {aset.pemegangAsetId && <div className="text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1 font-medium"><User size={12} /> PJ: {userMapByUid.get(aset.pemegangAsetId)?.namaLengkap || 'Unknown'}</div>}
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        <Badge variant="outline" className="text-[10px] px-1.5 h-5">{aset.kondisi}</Badge>
                                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{aset.status}</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border">
                    <p className="text-sm text-muted-foreground text-center sm:text-left">
                        Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> dari <strong>{totalItems}</strong> aset
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                        <span className="text-sm font-medium min-w-[60px] text-center">Hal {currentPage} / {totalPages}</span>
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
                    </div>
                </div>
            )}

            {/* MODAL COMPONENTS */}
            <AssetFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={refetch} asetToEdit={asetToEdit} userProfile={userProfile} />
            <QrCodeModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} aset={selectedQrAset} />
            <RoomInventoryModal isOpen={isKirModalOpen} onClose={() => setIsKirModalOpen(false)} asetList={asetList} userProfile={userProfile} opdNama={opdName} />
            <AssetImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} opdId={userProfile.opdId} userId={userProfile.uid} onSuccess={refetch} />
        </div>
    );
}