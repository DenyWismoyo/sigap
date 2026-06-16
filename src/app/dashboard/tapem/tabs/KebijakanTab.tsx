"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Download, ExternalLink, Trash2, Edit } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import KebijakanModal from '../components/KebijakanModal'; // Nanti kita buat

// Interface Lokal (bisa dipindah ke types/tapem.ts)
export interface ProdukKebijakan {
    id?: string;
    jenis: 'Perda' | 'Perwal' | 'Kepwal' | 'SK';
    nomor: string;
    tahun: number;
    judul: string;
    tentang: string;
    status: 'Berlaku' | 'Dicabut' | 'Draf';
    fileUrl?: string;
    fileName?: string;
    createdAt?: any;
}

export default function KebijakanTab() {
    const { addToast } = useToast();
    const [dataList, setDataList] = useState<ProdukKebijakan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ProdukKebijakan | null>(null);

    // Realtime Fetch
    useEffect(() => {
        const q = query(collection(db, 'tapem_kebijakan'), orderBy('tahun', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProdukKebijakan));
            setDataList(list);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredList = dataList.filter(d => 
        d.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tentang.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if(!confirm("Hapus produk hukum ini?")) return;
        try {
            await deleteDoc(doc(db, 'tapem_kebijakan', id));
            addToast("Data dihapus.", "success");
        } catch (e) {
            addToast("Gagal menghapus.", "error");
        }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Berlaku': return <Badge className="bg-green-600 hover:bg-green-700">Berlaku</Badge>;
            case 'Dicabut': return <Badge variant="destructive">Dicabut</Badge>;
            case 'Draf': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Draf</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle>Produk Kebijakan Daerah</CardTitle>
                            <CardDescription>Repository Peraturan Daerah, Peraturan Walikota, dan Keputusan terkait Tata Pemerintahan.</CardDescription>
                        </div>
                        <Button onClick={() => { setSelectedItem(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                            <Plus size={16} className="mr-2"/> Tambah Produk Hukum
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                            <Input 
                                placeholder="Cari nomor, tahun, atau tentang..." 
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
                                    <TableHead>Jenis & Nomor</TableHead>
                                    <TableHead>Tentang</TableHead>
                                    <TableHead>Tahun</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">File</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            {loading ? "Memuat data..." : "Belum ada produk kebijakan."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredList.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-bold text-primary">{item.jenis}</div>
                                                <div className="text-xs font-mono text-muted-foreground">{item.nomor}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium line-clamp-2" title={item.judul}>{item.judul}</div>
                                                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.tentang}</div>
                                            </TableCell>
                                            <TableCell>{item.tahun}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-center">
                                                {item.fileUrl ? (
                                                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-blue-600">
                                                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                                            <FileText size={16}/>
                                                        </a>
                                                    </Button>
                                                ) : <span className="text-muted-foreground">-</span>}
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

            <KebijakanModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                dataToEdit={selectedItem}
            />
        </div>
    );
}