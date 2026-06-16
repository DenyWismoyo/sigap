"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, Edit, Plus, Trash2, LayoutList, FileText } from 'lucide-react';
import { useTapemData } from '@/app/dashboard/hooks/useTapemData';
import { Wilayah } from '@/types/index';
import WilayahModal from '../components/WilayahModal';
import TupoksiWilayahManager from '../components/TupoksiWilayahManager';
import { db } from '@/lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function KewilayahanTab() {
    // State untuk Tab Internal
    const [subTab, setSubTab] = useState("administrasi");

    const { wilayahList } = useTapemData();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWilayah, setSelectedWilayah] = useState<Wilayah | null>(null);

    const filteredList = wilayahList.filter(item => 
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.namaPejabat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kodeWilayah.includes(searchTerm)
    );

    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus data wilayah ini?")) return;
        try {
            await deleteDoc(doc(db, 'tapem_wilayah', id));
            addToast("Data wilayah dihapus.", "success");
            queryClient.invalidateQueries({ queryKey: ['tapem', 'wilayah'] });
        } catch (e) {
            addToast("Gagal menghapus data.", "error");
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Navigasi Sub-Tab */}
            <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                <div className="flex justify-center md:justify-start mb-4">
                    <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                        <TabsTrigger value="administrasi" className="flex items-center gap-2">
                            <LayoutList size={14} /> Administrasi Wilayah
                        </TabsTrigger>
                        <TabsTrigger value="tupoksi" className="flex items-center gap-2">
                            <FileText size={14} /> Tupoksi Kecamatan/Kelurahan
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* CONTENT 1: ADMINISTRASI WILAYAH (Tabel Data) */}
                <TabsContent value="administrasi" className="mt-0 animate-in fade-in-50 duration-300">
                    <Card className="border-border shadow-sm">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                    <CardTitle>Data Administrasi Kewilayahan</CardTitle>
                                    <CardDescription>Database profil Kecamatan dan Kelurahan di Kota Surakarta.</CardDescription>
                                </div>
                                <Button onClick={() => { setSelectedWilayah(null); setIsModalOpen(true); }} className="bg-green-600 hover:bg-green-700">
                                    <Plus size={16} className="mr-2"/> Tambah Data Wilayah
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3 mb-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                                    <Input 
                                        placeholder="Cari nama, kode, atau pejabat..." 
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Kode</TableHead>
                                            <TableHead>Nama Wilayah</TableHead>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead>Kepala Wilayah</TableHead>
                                            <TableHead className="text-right">Luas (km²)</TableHead>
                                            <TableHead className="text-right">Penduduk</TableHead>
                                            <TableHead className="text-center">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                    Data wilayah belum diinput. Silakan tambah baru.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredList.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-mono text-xs">{item.kodeWilayah}</TableCell>
                                                    <TableCell className="font-medium">{item.nama}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.jenis === 'Kecamatan' ? 'default' : 'outline'}>
                                                            {item.jenis}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User size={14} className="text-muted-foreground"/>
                                                            <div>
                                                                <span className="text-sm font-medium block">{item.namaPejabat || '-'}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono">{item.nipPejabat}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.luasWilayah || '-'}</TableCell>
                                                    <TableCell className="text-right">{item.jumlahPenduduk?.toLocaleString('id-ID') || '-'}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedWilayah(item); setIsModalOpen(true); }}>
                                                                <Edit size={16} className="text-blue-600"/>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id!)}>
                                                                <Trash2 size={16} className="text-red-600"/>
                                                            </Button>
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
                </TabsContent>

                {/* CONTENT 2: TUPOKSI (Entry Baru) */}
                <TabsContent value="tupoksi" className="mt-0 animate-in fade-in-50 duration-300">
                    <TupoksiWilayahManager />
                </TabsContent>

            </Tabs>

            <WilayahModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                dataToEdit={selectedWilayah}
            />
        </div>
    );
}