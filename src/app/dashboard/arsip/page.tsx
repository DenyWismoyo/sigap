/**
 * Directory: src/app/dashboard/arsip/page.tsx
 * Status: FINAL SSOT (Pagination Added)
 * Deskripsi: Halaman Arsip Surat dengan fitur pencarian, filter, dan pagination.
 */

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSuratData } from '@/app/dashboard/hooks/useSuratData'; // SSOT Hook
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { 
  Archive, FileText, Search, Loader2, ChevronDown, User, Calendar, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';

// Shadcn
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; 
import { SkeletonCard } from '../components/skeletons/SkeletonCard';
import { Surat } from '@/types';

// Helper Badge
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Selesai': return "secondary"; 
        case 'Diarsipkan': return "outline";
        default: return "outline"; 
    }
};

// Mobile Card
const ArsipCard = ({ surat }: { surat: Surat }) => (
    <Card className="transition-all hover:shadow-md border-l-4 border-gray-300 dark:border-gray-600">
        <Link href={`/dashboard/surat/${surat.id}`} className="block">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-semibold text-foreground pr-2 line-clamp-2">
                        {surat.perihal}
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(surat.statusPenyelesaian)}>
                        {surat.statusPenyelesaian}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1 pb-3">
                <div className="flex items-center"><FileText size={14} className="mr-2"/> {surat.nomorSurat}</div>
                <div className="flex items-center"><User size={14} className="mr-2"/> {surat.pengirim}</div>
            </CardContent>
            <CardFooter className="p-4 pt-0 text-xs text-muted-foreground border-t border-border mt-2">
                 <div className="flex items-center"><Calendar size={14} className="mr-2"/> Tgl Surat: {surat.tanggalSurat?.toDate().toLocaleDateString('id-ID')}</div>
            </CardFooter>
        </Link>
    </Card>
);

// Desktop Row
const ArsipRow = ({ surat, onClick }: { surat: Surat, onClick: () => void }) => (
    <TableRow onClick={onClick} className="cursor-pointer hover:bg-muted/50">
        <TableCell className="font-semibold text-primary hover:underline cursor-pointer max-w-[300px]">
             <div className="line-clamp-2">{surat.perihal}</div>
        </TableCell>
        <TableCell>{surat.pengirim}</TableCell>
        <TableCell>{surat.nomorSurat}</TableCell>
        <TableCell>
            {surat.tanggalSurat?.toDate ? surat.tanggalSurat.toDate().toLocaleDateString('id-ID') : '-'}
        </TableCell>
        <TableCell>
            <Badge variant={getStatusBadgeVariant(surat.statusPenyelesaian)}>
                {surat.statusPenyelesaian}
            </Badge>
        </TableCell>
    </TableRow>
);

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function ArsipSuratPage() {
    const router = useRouter();
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // SSOT Hook (Mode Archive)
    // Catatan: Hook ini sudah mengambil 100 data terbaru secara default (atau sesuai limit hook).
    // Kita melakukan pagination klien terhadap data yang sudah di-fetch untuk UX yang cepat.
    const { 
        suratList, loading, error 
    } = useSuratData({ 
        searchTerm: searchTerm, 
        isArchive: true 
    });

    // Reset halaman ke 1 jika search berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // --- LOGIKA PAGINATION ---
    const totalItems = suratList.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return suratList.slice(startIndex, endIndex);
    }, [suratList, currentPage, itemsPerPage]);

    // Handler Navigasi Halaman
    const goToFirstPage = () => setCurrentPage(1);
    const goToLastPage = () => setCurrentPage(totalPages);
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    return (
        <div className="animate-fadeInUp pb-20">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Archive size={28} className="mr-3 text-gray-600 dark:text-gray-400"/> Arsip Surat
                    </h1>
                    <p className="text-muted-foreground mt-1">Daftar surat yang telah selesai atau diarsipkan.</p>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        placeholder="Cari arsip (Perihal, Nomor, Pengirim)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Baris:</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(v) => {
                            setItemsPerPage(Number(v));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                            {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Content */}
            {error && <div className="p-4 bg-red-100 text-red-600 rounded-lg mb-4 text-center">{error}</div>}

            {loading ? (
                 <div className="grid grid-cols-1 md:hidden gap-4">
                     {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : suratList.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                    <Archive size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                    <p className="font-semibold">Arsip Kosong</p>
                    <p className="text-sm">Belum ada surat yang diarsipkan atau sesuai pencarian.</p>
                </div>
            ) : (
                <>
                    {/* Mobile List View */}
                    <div className="md:hidden space-y-4 mb-4">
                        {paginatedData.map(surat => <ArsipCard key={surat.id} surat={surat} />)}
                    </div>

                    {/* Desktop Table View */}
                    <Card className="hidden md:block mb-4 overflow-hidden border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Perihal</TableHead>
                                    <TableHead>Pengirim</TableHead>
                                    <TableHead>Nomor Surat</TableHead>
                                    <TableHead>Tanggal Surat</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.map(surat => (
                                    <ArsipRow 
                                        key={surat.id} 
                                        surat={surat} 
                                        onClick={() => router.push(`/dashboard/surat/${surat.id}`)}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Pagination Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                        <p className="text-sm text-muted-foreground text-center sm:text-left">
                            Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> sampai <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> dari <strong>{totalItems}</strong> data
                        </p>
                        
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToFirstPage}
                                disabled={currentPage === 1}
                                title="Halaman Pertama"
                            >
                                <ChevronsLeft size={16} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToPrevPage}
                                disabled={currentPage === 1}
                                title="Sebelumnya"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            
                            <div className="flex items-center justify-center min-w-[80px] text-sm font-medium">
                                Halaman {currentPage} / {totalPages}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                                title="Selanjutnya"
                            >
                                <ChevronRight size={16} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToLastPage}
                                disabled={currentPage === totalPages}
                                title="Halaman Terakhir"
                            >
                                <ChevronsRight size={16} />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}