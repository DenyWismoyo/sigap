"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Download, ExternalLink, Edit, Trash2, FileText } from 'lucide-react';
import { useTapemData } from '@/app/dashboard/hooks/useTapemData';
import { KerjaSama } from '@/types/index';
import KerjaSamaModal from '../components/KerjaSamaModal';
import { db } from '@/lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';

export default function KerjaSamaTab() {
    const { kerjaSamaList } = useTapemData();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<KerjaSama | null>(null);

    const filteredList = kerjaSamaList.filter(item => 
        item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nomorNaskah.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if(!confirm("Yakin ingin menghapus data kerja sama ini?")) return;
        try {
            await deleteDoc(doc(db, 'tapem_kerjasama', id));
            addToast("Data dihapus.", "success");
            queryClient.invalidateQueries({ queryKey: ['tapem', 'kerjasama'] });
        } catch (e) {
            addToast("Gagal menghapus.", "error");
        }
    };

    return (
        <div className="space-y-4">
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle>Kerja Sama Daerah (MOU & PKS)</CardTitle>
                            <CardDescription>Daftar naskah kerja sama dengan pihak ketiga, daerah lain, atau luar negeri.</CardDescription>
                        </div>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setSelectedItem(null); setIsModalOpen(true); }}>
                            <Plus size={16} className="mr-2"/> Tambah Kerja Sama
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                            <Input 
                                placeholder="Cari judul, nomor, atau mitra..." 
                                className="pl-9"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* <Button variant="outline"><Filter size={16} className="mr-2"/> Filter</Button>
                        <Button variant="outline"><Download size={16} className="mr-2"/> Export</Button> */}
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Judul / Nomor</TableHead>
                                    <TableHead>Mitra</TableHead>
                                    <TableHead>Jenis</TableHead>
                                    <TableHead>Periode</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            Belum ada data kerja sama yang tercatat.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredList.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium line-clamp-2 max-w-[300px]">{item.judul}</div>
                                                <div className="text-xs text-muted-foreground font-mono mt-1">{item.nomorNaskah}</div>
                                                {item.fileUrl && (
                                                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center mt-1">
                                                        <FileText size={10} className="mr-1"/> Lihat Dokumen
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell>{item.mitra}</TableCell>
                                            <TableCell><Badge variant="outline">{item.jenis}</Badge></TableCell>
                                            <TableCell>
                                                <div className="text-xs">
                                                    {item.tanggalMulai.toDate().toLocaleDateString('id-ID')} s/d <br/>
                                                    {item.tanggalAkhir.toDate().toLocaleDateString('id-ID')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === 'Aktif' ? 'secondary' : item.status === 'Akan Berakhir' ? 'destructive' : 'outline'}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}>
                                                        <Edit size={16} className="text-yellow-600"/>
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

            <KerjaSamaModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                dataToEdit={selectedItem}
            />
        </div>
    );
}