/**
 * Directory: src/app/dashboard/talenta/tabs/PegawaiTab.tsx
 * History Update:
 * - 2024-11-27: Initial creation.
 * - 2024-11-27: Added Client-side Pagination for handling large datasets.
 * - 2024-11-28: Added header info.
 */

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Edit2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { UserProfile } from '@/types';
import { TalentAssessment, getBoxLabel } from '@/app/dashboard/hooks/useTalentData';

interface PegawaiTabProps {
    combinedData: { user: UserProfile; assessment?: TalentAssessment; hasAssessment: boolean }[];
    onAssessClick: (user: UserProfile, assessment?: TalentAssessment) => void;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function PegawaiTab({ combinedData, onAssessClick }: PegawaiTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [boxFilter, setBoxFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // all, assessed, pending
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // 1. Filter Data
    const filteredData = useMemo(() => {
        return combinedData.filter(({ user, assessment, hasAssessment }) => {
            const matchSearch = 
                user.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.nip.includes(searchTerm);
            
            const matchBox = boxFilter === 'all' ? true : assessment?.boxPosition?.toString() === boxFilter;
            
            let matchStatus = true;
            if (statusFilter === 'assessed') matchStatus = hasAssessment;
            if (statusFilter === 'pending') matchStatus = !hasAssessment;

            const isStaff = user.role !== 'super_admin';
            return matchSearch && matchBox && matchStatus && isStaff;
        });
    }, [combinedData, searchTerm, boxFilter, statusFilter]);

    // Reset page saat filter berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, boxFilter, statusFilter, itemsPerPage]);

    // 2. Paginasi Data
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Filters */}
            <Card className="p-4 border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                    <div className="flex-1 w-full md:max-w-md relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                        <Input 
                            placeholder="Cari nama atau NIP pegawai..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto flex-wrap">
                         <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Status Penilaian" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="assessed">Sudah Dinilai</SelectItem>
                                <SelectItem value="pending">Belum Dinilai</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={boxFilter} onValueChange={setBoxFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter Box" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Posisi</SelectItem>
                                <SelectItem value="9">Box 9 - Star</SelectItem>
                                <SelectItem value="8">Box 8 - High Potential</SelectItem>
                                <SelectItem value="5">Box 5 - Core</SelectItem>
                                <SelectItem value="1">Box 1 - Underperformer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Nama Pegawai</TableHead>
                                <TableHead>Jabatan</TableHead>
                                <TableHead className="text-center">Kinerja (X)</TableHead>
                                <TableHead className="text-center">Potensi (Y)</TableHead>
                                <TableHead>Posisi Matriks</TableHead>
                                <TableHead>Rekomendasi</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Tidak ada data pegawai yang sesuai filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map(({ user, assessment }) => {
                                    const box = assessment?.boxPosition ? getBoxLabel(assessment.boxPosition) : null;
                                    return (
                                        <TableRow key={user.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                                        {user.namaLengkap.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold">{user.namaLengkap}</p>
                                                        <p className="text-xs text-muted-foreground">{user.nip}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                                {user.namaJabatan || 'Staf'}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-sm">
                                                {assessment ? assessment.nilaiKinerja : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-sm">
                                                {assessment ? assessment.nilaiPotensi : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                {box ? (
                                                    <Badge variant="outline" className={`${box.color} border-0 font-normal whitespace-nowrap`}>
                                                        {box.label.split('. ')[1]}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Belum dinilai</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                                                {assessment?.rekomendasiJabatan || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    size="sm" 
                                                    variant={assessment ? "outline" : "default"} 
                                                    className={!assessment ? "bg-blue-600 hover:bg-blue-700 h-8" : "h-8"}
                                                    onClick={() => onAssessClick(user, assessment)}
                                                >
                                                    {assessment ? <Edit2 size={14} className="mr-1"/> : null}
                                                    {assessment ? 'Update' : 'Nilai'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground hidden md:inline">Baris per halaman:</span>
                        <Select 
                            value={itemsPerPage.toString()} 
                            onValueChange={(v) => setItemsPerPage(Number(v))}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent>
                                {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                                    <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground ml-2">
                            <strong>{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> dari <strong>{totalItems}</strong>
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <span className="text-sm font-medium px-2">
                            Hal {currentPage} / {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronRight size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronsRight size={16} />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}