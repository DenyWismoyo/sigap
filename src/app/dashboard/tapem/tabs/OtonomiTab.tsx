"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCheck, Clock, AlertCircle, Upload, CheckCircle2, Plus, Search, FileText, Filter, Loader2, Edit } from 'lucide-react';
import { useUserAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import LppdModal, { LppdData } from '../components/LppdModal';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';
import { Label } from '@/components/ui/label';

export default function OtonomiTab() {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    const { opdList } = useMasterData(true); // Ambil list OPD untuk dropdown

    const [dataList, setDataList] = useState<LppdData[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [tahunFilter, setTahunFilter] = useState<string>(new Date().getFullYear().toString());
    const [statusFilter, setStatusFilter] = useState('Semua');
    const [searchFilter, setSearchFilter] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LppdData | null>(null);

    // Role Check
    const isAdminTapem = userProfile?.role === 'super_admin' || userProfile?.additionalRoles?.includes('pengelola_tapem');

    // 1. Fetch Data Realtime
    useEffect(() => {
        if (!userProfile) return;
        setLoading(true);

        let q = query(collection(db, 'tapem_lppd'), where('tahun', '==', Number(tahunFilter)));

        // Jika bukan Admin Tapem, filter hanya OPD user tersebut
        if (!isAdminTapem) {
            q = query(q, where('opdId', '==', userProfile.opdId));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LppdData));
            // Sort manual (urusan asc)
            list.sort((a, b) => a.urusan.localeCompare(b.urusan));
            setDataList(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching LPPD:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tahunFilter, userProfile, isAdminTapem]);

    // 2. Filtering Client-Side
    const filteredList = useMemo(() => {
        return dataList.filter(item => {
            const matchStatus = statusFilter === 'Semua' || item.status === statusFilter;
            const searchLower = searchFilter.toLowerCase();
            const matchSearch = 
                item.indikator.toLowerCase().includes(searchLower) || 
                item.urusan.toLowerCase().includes(searchLower) ||
                item.namaOpd.toLowerCase().includes(searchLower);
            return matchStatus && matchSearch;
        });
    }, [dataList, statusFilter, searchFilter]);

    // 3. Statistik Ringkas
    const stats = useMemo(() => {
        const total = dataList.length;
        const valid = dataList.filter(i => i.status === 'Valid').length;
        const pending = dataList.filter(i => i.status === 'Menunggu Verifikasi').length;
        const empty = dataList.filter(i => i.status === 'Belum Lapor').length;
        const percent = total > 0 ? Math.round((valid / total) * 100) : 0;
        return { total, valid, pending, empty, percent };
    }, [dataList]);

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Valid': return <Badge className="bg-green-600 hover:bg-green-700">Valid</Badge>;
            case 'Menunggu Verifikasi': return <Badge className="bg-blue-600 hover:bg-blue-700">Verifikasi</Badge>;
            case 'Perlu Perbaikan': return <Badge className="bg-yellow-600 hover:bg-yellow-700">Revisi</Badge>;
            default: return <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Belum Lapor</Badge>;
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Hapus indikator ini?")) return;
        try {
            await deleteDoc(doc(db, 'tapem_lppd', id));
            addToast("Indikator dihapus.", "success");
        } catch (e) {
            addToast("Gagal menghapus.", "error");
        }
    };

    return (
        <div className="space-y-6">
            {/* Dashboard Progress LPPD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600">
                            <FileCheck size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Capaian Valid</p>
                            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.percent}%</h3>
                            <p className="text-[10px] text-muted-foreground">{stats.valid} dari {stats.total} IKK</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-800 rounded-full text-yellow-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Menunggu Verif</p>
                            <h3 className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</h3>
                            <p className="text-[10px] text-muted-foreground">Indikator</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-800 rounded-full text-red-600">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Belum Lapor</p>
                            <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.empty}</h3>
                            <p className="text-[10px] text-muted-foreground">Indikator</p>
                        </div>
                    </CardContent>
                </Card>
                {/* Filter Tahun Ringkas */}
                <Card className="flex flex-col justify-center p-4 border-dashed bg-muted/20 shadow-sm">
                    <Label className="text-xs mb-1 font-semibold text-muted-foreground">Tahun Laporan</Label>
                    <Select value={tahunFilter} onValueChange={setTahunFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>
                </Card>
            </div>

            {/* Tabel Monitoring */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle>Monitoring LPPD {tahunFilter}</CardTitle>
                            <CardDescription>Status pengumpulan data Indikator Kinerja Kunci (IKK) per OPD.</CardDescription>
                        </div>
                        {isAdminTapem && (
                            <Button onClick={() => { setSelectedItem(null); setIsModalOpen(true); }} className="bg-green-600 hover:bg-green-700">
                                <Plus size={16} className="mr-2"/> Tambah Indikator
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                            <Input 
                                placeholder="Cari indikator, urusan, atau OPD..." 
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Semua">Semua Status</SelectItem>
                                <SelectItem value="Belum Lapor">Belum Lapor</SelectItem>
                                <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                                <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                                <SelectItem value="Valid">Valid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[150px]">Urusan</TableHead>
                                    <TableHead className="w-[200px]">OPD</TableHead>
                                    <TableHead>Indikator (IKK)</TableHead>
                                    <TableHead className="text-center">Target</TableHead>
                                    <TableHead className="text-center">Capaian</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-center">Bukti</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                                ) : filteredList.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                                ) : (
                                    filteredList.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium text-xs">{item.urusan}</TableCell>
                                            <TableCell className="text-xs">{item.namaOpd}</TableCell>
                                            <TableCell className="text-sm">{item.indikator}</TableCell>
                                            <TableCell className="text-center font-mono text-xs">{item.target} {item.satuan}</TableCell>
                                            <TableCell className="text-center font-bold text-xs">{item.capaian || '-'}</TableCell>
                                            <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-center">
                                                {item.buktiUrl ? (
                                                    <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0 text-blue-600">
                                                        <a href={item.buktiUrl} target="_blank" rel="noopener noreferrer"><FileText size={14}/></a>
                                                    </Button>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" size="sm" 
                                                    onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                                                    className="h-8 w-8 p-0"
                                                    title={isAdminTapem ? "Verifikasi / Edit" : "Lapor Capaian"}
                                                >
                                                    <Edit size={14} className="text-blue-600"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <LppdModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                dataToEdit={selectedItem}
                opdList={opdList}
            />
        </div>
    );
}