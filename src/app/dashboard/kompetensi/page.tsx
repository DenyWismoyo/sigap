/**
 * Directory: src/app/dashboard/kompetensi/page.tsx
 * History Update:
 * - 2024-11-28: Initial creation. Page for users to manage their competency portfolio.
 */

"use client";

import React, { useState } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { useKompetensiData } from '@/app/dashboard/hooks/useKompetensiData';
import { GraduationCap, Award, Plus, Trash2, FileText, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from '@/context/ToastContext';

import DiklatFormModal from './components/DiklatFormModal';
import PenghargaanFormModal from './components/PenghargaanFormModal';

export default function KompetensiPage() {
    const { userProfile, loading: authLoading } = useUserAuth();
    const { diklatList, penghargaanList, isLoading, addDiklat, deleteDiklat, addPenghargaan, deletePenghargaan, isMutating } = useKompetensiData();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('diklat');
    const [isDiklatModalOpen, setIsDiklatModalOpen] = useState(false);
    const [isPenghargaanModalOpen, setIsPenghargaanModalOpen] = useState(false);

    if (authLoading || isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10"/></div>;
    if (!userProfile) return <div className="p-8 text-center">Akses Ditolak.</div>;

    const handleDelete = async (type: 'diklat' | 'penghargaan', id: string) => {
        if (!confirm("Yakin ingin menghapus data ini?")) return;
        try {
            if (type === 'diklat') await deleteDiklat(id);
            else await deletePenghargaan(id);
            addToast("Data dihapus.", "success");
        } catch (e) {
            addToast("Gagal menghapus.", "error");
        }
    };

    return (
        <div className="animate-fadeInUp pb-20 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <GraduationCap size={32} className="mr-3 text-purple-600" />
                        Portofolio Kompetensi
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Kelola data pengembangan diri, pelatihan, dan prestasi Anda.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                    <TabsTrigger value="diklat" className="flex items-center gap-2">
                        <BookOpen size={16}/> Riwayat Diklat
                    </TabsTrigger>
                    <TabsTrigger value="penghargaan" className="flex items-center gap-2">
                        <Award size={16}/> Penghargaan
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    {/* TAB DIKLAT */}
                    <TabsContent value="diklat">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                                <div>
                                    <CardTitle>Riwayat Pelatihan & Kursus</CardTitle>
                                    <CardDescription>Total JP Anda tahun ini: {diklatList.filter(d => d.tahun === new Date().getFullYear()).reduce((acc, curr) => acc + curr.durasiJam, 0)} JP</CardDescription>
                                </div>
                                <Button onClick={() => setIsDiklatModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                                    <Plus size={16} className="mr-2"/> Tambah
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Nama Diklat</TableHead>
                                            <TableHead>Penyelenggara</TableHead>
                                            <TableHead className="text-center">Tahun</TableHead>
                                            <TableHead className="text-center">Durasi (JP)</TableHead>
                                            <TableHead>Kategori</TableHead>
                                            <TableHead className="text-center">Bukti</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {diklatList.length === 0 ? (
                                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada data diklat.</TableCell></TableRow>
                                        ) : (
                                            diklatList.map((item) => (
                                                <TableRow key={item.id} className="hover:bg-muted/30">
                                                    <TableCell className="font-medium">{item.namaDiklat}</TableCell>
                                                    <TableCell>{item.penyelenggara}</TableCell>
                                                    <TableCell className="text-center">{item.tahun}</TableCell>
                                                    <TableCell className="text-center font-mono">{item.durasiJam}</TableCell>
                                                    <TableCell><Badge variant="outline">{item.kategori}</Badge></TableCell>
                                                    <TableCell className="text-center">
                                                        {item.fileBuktiUrl ? (
                                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                                                                <a href={item.fileBuktiUrl} target="_blank" rel="noopener noreferrer"><FileText size={16}/></a>
                                                            </Button>
                                                        ) : <span className="text-muted-foreground">-</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete('diklat', item.id!)} className="text-red-500 h-8 w-8">
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB PENGHARGAAN */}
                    <TabsContent value="penghargaan">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                                <div>
                                    <CardTitle>Riwayat Penghargaan & Prestasi</CardTitle>
                                    <CardDescription>Pencapaian kinerja dan tanda kehormatan.</CardDescription>
                                </div>
                                <Button onClick={() => setIsPenghargaanModalOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                                    <Plus size={16} className="mr-2"/> Tambah
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Nama Penghargaan</TableHead>
                                            <TableHead>Pemberi</TableHead>
                                            <TableHead className="text-center">Tahun</TableHead>
                                            <TableHead>Tingkat</TableHead>
                                            <TableHead className="text-center">Bukti</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {penghargaanList.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data penghargaan.</TableCell></TableRow>
                                        ) : (
                                            penghargaanList.map((item) => (
                                                <TableRow key={item.id} className="hover:bg-muted/30">
                                                    <TableCell className="font-medium">{item.namaPenghargaan}</TableCell>
                                                    <TableCell>{item.pemberi}</TableCell>
                                                    <TableCell className="text-center">{item.tahun}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className={
                                                            item.tingkat === 'Nasional' ? 'bg-yellow-100 text-yellow-800' : 
                                                            item.tingkat === 'Provinsi' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                        }>
                                                            {item.tingkat}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {item.fileBuktiUrl ? (
                                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                                                                <a href={item.fileBuktiUrl} target="_blank" rel="noopener noreferrer"><FileText size={16}/></a>
                                                            </Button>
                                                        ) : <span className="text-muted-foreground">-</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete('penghargaan', item.id!)} className="text-red-500 h-8 w-8">
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>

            {/* MODALS */}
            <DiklatFormModal 
                isOpen={isDiklatModalOpen} 
                onClose={() => setIsDiklatModalOpen(false)} 
                onSave={addDiklat} 
                userProfile={userProfile} 
            />
            <PenghargaanFormModal 
                isOpen={isPenghargaanModalOpen} 
                onClose={() => setIsPenghargaanModalOpen(false)} 
                onSave={addPenghargaan} 
                userProfile={userProfile} 
            />
        </div>
    );
}