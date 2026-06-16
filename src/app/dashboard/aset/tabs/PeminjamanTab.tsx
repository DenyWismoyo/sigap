// Directory: src/app/dashboard/aset/tabs/PeminjamanTab.tsx
// [UPDATE] Implementasi Pagination Client-side & usePeminjamanData hook.

"use client";

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { PeminjamanAset, UserProfile } from '@/types';
import { Plus, ArrowLeftRight, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/context/ToastContext';
import BorrowModal from '@/app/dashboard/aset/components/BorrowModal';
import { useAssetData } from '@/app/dashboard/hooks/useAssetData';
import { usePeminjamanData } from '@/app/dashboard/hooks/usePeminjamanData'; // [BARU]

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function PeminjamanTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    const { assets: asetList, refetch: refetchAssets } = useAssetData();
    const { peminjamanList, isLoading: loading, refetch: refetchPeminjaman } = usePeminjamanData(); // Gunakan Hook
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReturnProcessing, setIsReturnProcessing] = useState<string | null>(null);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const handleReturn = async (peminjaman: PeminjamanAset) => {
        if (!confirm(`Konfirmasi pengembalian aset "${peminjaman.namaAset}"?`)) return;
        setIsReturnProcessing(peminjaman.id!);
        try {
            await updateDoc(doc(db, 'peminjamanAset', peminjaman.id!), {
                status: 'Dikembalikan',
                tanggalKembali: Timestamp.now()
            });
            await updateDoc(doc(db, 'asetInventaris', peminjaman.asetId), {
                status: 'Tersedia'
            });
            addToast("Aset berhasil dikembalikan.", "success");
            refetchPeminjaman();
            refetchAssets();
        } catch (err) {
            console.error(err);
            addToast("Gagal memproses pengembalian.", "error");
        } finally {
            setIsReturnProcessing(null);
        }
    };

    const activeLoans = useMemo(() => peminjamanList.filter(p => p.status === 'Dipinjam'), [peminjamanList]);

    // Pagination Logic
    const totalItems = peminjamanList.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return peminjamanList.slice(start, start + itemsPerPage);
    }, [peminjamanList, currentPage, itemsPerPage]);

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full text-purple-600 dark:text-purple-200">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-semibold">Sedang Dipinjam</p>
                            <h3 className="text-2xl font-bold text-foreground">{activeLoans.length} Item</h3>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="flex items-center justify-center p-4 border-dashed md:col-span-2">
                    <Button onClick={() => setIsModalOpen(true)} className="w-full h-full py-4 md:py-6" variant="outline">
                        <Plus size={20} className="mr-2" /> Catat Peminjaman Baru
                    </Button>
                </Card>
            </div>

            {/* Pagination Controls Top (Optional, useful for mobile list) */}
            <div className="flex justify-end md:hidden mb-2">
                 <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ITEMS_PER_PAGE_OPTIONS.map(opt => <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>)}</SelectContent>
                </Select>
            </div>

            {/* DESKTOP TABLE */}
            <Card className="hidden md:block border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Riwayat Sirkulasi Aset</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Baris:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{ITEMS_PER_PAGE_OPTIONS.map(opt => <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tgl Pinjam</TableHead>
                                <TableHead>Nama Aset</TableHead>
                                <TableHead>Peminjam</TableHead>
                                <TableHead>Keperluan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
                            ) : paginatedData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data peminjaman.</TableCell></TableRow>
                            ) : (
                                paginatedData.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap text-xs">
                                            {log.tanggalPinjam.toDate().toLocaleDateString('id-ID')}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.namaAset}</TableCell>
                                        <TableCell>{log.peminjamInfo}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-xs">{log.keperluan}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.status === 'Dipinjam' ? 'default' : 'secondary'}>
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {log.status === 'Dipinjam' && (
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs" onClick={() => handleReturn(log)} disabled={isReturnProcessing === log.id}>
                                                    <ArrowLeftRight size={12} className="mr-1" /> {isReturnProcessing === log.id ? '...' : 'Kembalikan'}
                                                </Button>
                                            )}
                                            {log.status === 'Dikembalikan' && log.tanggalKembali && (
                                                <span className="text-xs text-muted-foreground">Kmb: {log.tanggalKembali.toDate().toLocaleDateString('id-ID')}</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* MOBILE LIST */}
            <div className="md:hidden space-y-3">
                {loading ? <p className="text-center py-8 text-muted-foreground">Memuat...</p> : 
                 paginatedData.length === 0 ? <p className="text-center py-8 text-muted-foreground">Belum ada riwayat.</p> : (
                    paginatedData.map(log => (
                        <Card key={log.id} className="border-border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-foreground text-sm">{log.namaAset}</p>
                                        <p className="text-xs text-muted-foreground">{log.tanggalPinjam.toDate().toLocaleDateString('id-ID')}</p>
                                    </div>
                                    <Badge variant={log.status === 'Dipinjam' ? 'default' : 'secondary'} className="text-[10px]">{log.status}</Badge>
                                </div>
                                <div className="space-y-1 text-sm text-foreground/90 mb-3">
                                    <p className="flex items-center gap-2 text-xs"><User size={12} className="text-muted-foreground"/> {log.peminjamInfo}</p>
                                    <p className="italic text-muted-foreground text-xs">"{log.keperluan}"</p>
                                </div>
                                {log.status === 'Dipinjam' && (
                                    <Button className="w-full h-8 text-xs bg-green-600 hover:bg-green-700" size="sm" onClick={() => handleReturn(log)} disabled={isReturnProcessing === log.id}>
                                        <ArrowLeftRight size={14} className="mr-2" /> {isReturnProcessing === log.id ? 'Memproses...' : 'Kembalikan Aset'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination Controls Bottom */}
            {totalItems > 0 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">Total: {totalItems} data</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14}/></Button>
                        <span className="text-xs font-medium">Hal {currentPage} / {totalPages}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={14}/></Button>
                    </div>
                </div>
            )}

            <BorrowModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => { refetchPeminjaman(); refetchAssets(); }}
                availableAssets={asetList.filter(a => a.status === 'Tersedia')}
                userProfile={userProfile}
            />
        </div>
    );
}