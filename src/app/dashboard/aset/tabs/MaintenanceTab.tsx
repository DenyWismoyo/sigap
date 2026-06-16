// Directory: src/app/dashboard/aset/tabs/MaintenanceTab.tsx
// [UPDATE] Implementasi Pagination Client-side & useMaintenanceData hook.

"use client";

import React, { useState, useMemo } from 'react';
import { AsetMaintenance, UserProfile } from '@/types';
import { Wrench, AlertTriangle, Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaintenanceModal from '@/app/dashboard/aset/components/MaintenanceModal';
import { useAssetData } from '@/app/dashboard/hooks/useAssetData';
import { useMaintenanceData } from '@/app/dashboard/hooks/useMaintenanceData'; // [BARU]

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function MaintenanceTab({ userProfile }: { userProfile: UserProfile }) {
    const { assets: asetList } = useAssetData();
    const { maintenanceLogs, isLoading: loadingLogs, refetch } = useMaintenanceData(); // Gunakan Hook

    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const urgentAssets = asetList.filter(a => a.kondisi === 'Perlu Perbaikan' || a.kondisi === 'Rusak Berat');
    const currentMonthCount = maintenanceLogs.filter(l => l.tanggal.toDate().getMonth() === new Date().getMonth()).length;

    // Pagination Logic
    const totalItems = maintenanceLogs.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return maintenanceLogs.slice(start, start + itemsPerPage);
    }, [maintenanceLogs, currentPage, itemsPerPage]);

    return (
        <div className="space-y-6">
            
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-200">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-semibold">Total Servis (Bulan Ini)</p>
                            <h3 className="text-2xl font-bold text-foreground">{currentMonthCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-200">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-semibold">Perlu Perbaikan</p>
                            <h3 className="text-2xl font-bold text-foreground">{urgentAssets.length} Aset</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex items-center justify-center p-4 border-dashed">
                    <Button onClick={() => setIsModalOpen(true)} className="w-full h-full py-4 md:py-0" variant="outline">
                        <Plus size={20} className="mr-2" /> Catat Maintenance Baru
                    </Button>
                </Card>
            </div>

            {/* DESKTOP TABLE */}
            <Card className="hidden md:block border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Riwayat Pemeliharaan</CardTitle>
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
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Nama Aset</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead>Pelaksana</TableHead>
                                <TableHead className="text-right">Biaya</TableHead>
                                <TableHead className="text-center">Bukti</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingLogs ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell></TableRow>
                            ) : paginatedData.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada riwayat servis.</TableCell></TableRow>
                            ) : (
                                paginatedData.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {log.tanggal.toDate().toLocaleDateString('id-ID')}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.namaAset}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.jenis === 'Rutin' ? 'outline' : 'destructive'}>
                                                {log.jenis}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={log.deskripsi}>{log.deskripsi}</TableCell>
                                        <TableCell>{log.pelaksana}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            Rp {log.biaya.toLocaleString('id-ID')}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {log.buktiUrl ? (
                                                <a href={log.buktiUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                                                    Lihat Nota
                                                </a>
                                            ) : <span className="text-muted-foreground text-xs">-</span>}
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
                 {loadingLogs ? <p className="text-center py-8 text-muted-foreground">Memuat...</p> : 
                 paginatedData.length === 0 ? <p className="text-center py-8 text-muted-foreground">Belum ada riwayat.</p> : (
                    paginatedData.map(log => (
                        <Card key={log.id} className="border-border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-foreground">{log.namaAset}</h4>
                                    <Badge variant={log.jenis === 'Rutin' ? 'outline' : 'destructive'}>{log.jenis}</Badge>
                                </div>
                                <div className="text-sm space-y-1 text-foreground/90">
                                    <p className="text-xs text-muted-foreground flex items-center gap-2"><Calendar size={12}/> {log.tanggal.toDate().toLocaleDateString('id-ID')}</p>
                                    <p className="font-semibold">Rp {log.biaya.toLocaleString('id-ID')}</p>
                                    <p className="text-xs italic">"{log.deskripsi}"</p>
                                    <p className="text-xs text-muted-foreground">Oleh: {log.pelaksana}</p>
                                </div>
                                {log.buktiUrl && (
                                    <Button variant="link" size="sm" className="px-0 h-auto mt-2 text-blue-600" asChild>
                                        <a href={log.buktiUrl} target="_blank" rel="noopener noreferrer">Lihat Nota</a>
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

            <MaintenanceModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={refetch}
                asetList={asetList}
                userProfile={userProfile}
            />
        </div>
    );
}