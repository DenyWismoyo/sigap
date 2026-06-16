/**
 * Directory: src/app/dashboard/talenta/tabs/DevelopmentTab.tsx
 * History Update:
 * - 2024-11-28: Updated to use REAL DATA (Riwayat Diklat & Penghargaan) from Firestore.
 * - Added Employee Selector to view individual portfolios.
 */

"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TalentDataCombined } from '@/app/dashboard/hooks/useTalentData';
import { GraduationCap, Calendar, Plus, FileText, History, Medal, Search, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Impor Komponen Pencarian (Combobox) ---
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DevelopmentTabProps {
    combinedData: TalentDataCombined[];
}

export default function DevelopmentTab({ combinedData }: DevelopmentTabProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [openCombobox, setOpenCombobox] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // 1. Filter Pegawai untuk Combobox
    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return combinedData.slice(0, 5); // Tampilkan 5 awal jika kosong
        return combinedData
            .filter(d => d.user.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 10);
    }, [combinedData, searchTerm]);

    // 2. Ambil Data Pegawai Terpilih
    const selectedData = useMemo(() => 
        combinedData.find(d => d.user.uid === selectedUserId), 
    [combinedData, selectedUserId]);

    // 3. Kalkulasi Statistik (Untuk OPD jika belum pilih user, atau Individu jika sudah pilih)
    const stats = useMemo(() => {
        if (selectedData) {
            // Stats Individu
            const totalJP = selectedData.diklat.reduce((acc, curr) => acc + curr.durasiJam, 0);
            const totalAwards = selectedData.penghargaan.length;
            return { totalJP, totalAwards, label: "Statistik Individu" };
        } else {
            // Stats Seluruh OPD
            const totalJP = combinedData.reduce((acc, user) => acc + user.diklat.reduce((sum, d) => sum + d.durasiJam, 0), 0);
            const totalAwards = combinedData.reduce((acc, user) => acc + user.penghargaan.length, 0);
            return { totalJP, totalAwards, label: "Total Akumulasi OPD" };
        }
    }, [combinedData, selectedData]);

    const targetJP = 20; // Standar minimal 20 JP per orang

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Header / Selector */}
            <Card className="border-border shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-muted-foreground block mb-1">Pilih Pegawai untuk Lihat Detail</label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full max-w-md justify-between font-normal"
                                >
                                    {selectedData 
                                        ? selectedData.user.namaLengkap 
                                        : "Lihat Ringkasan OPD (Pilih Pegawai...)"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command shouldFilter={false}> 
                                    <CommandInput placeholder="Cari pegawai..." onValueChange={setSearchTerm} value={searchTerm}/>
                                    <CommandList>
                                        <CommandItem 
                                            value="all" 
                                            onSelect={() => { setSelectedUserId(""); setOpenCombobox(false); }}
                                            className="cursor-pointer font-bold border-b bg-muted/20"
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", selectedUserId === "" ? "opacity-100" : "opacity-0")} />
                                            Tampilkan Ringkasan OPD
                                        </CommandItem>
                                        {filteredEmployees.map((d) => (
                                            <CommandItem
                                                key={d.user.uid}
                                                value={d.user.namaLengkap}
                                                onSelect={() => { setSelectedUserId(d.user.uid); setOpenCombobox(false); }}
                                                className="cursor-pointer"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedUserId === d.user.uid ? "opacity-100" : "opacity-0")} />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{d.user.namaLengkap}</span>
                                                    <span className="text-xs text-muted-foreground">{d.user.namaJabatan || 'Staf'}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`border-l-4 ${stats.totalJP >= targetJP ? 'border-l-green-500' : 'border-l-blue-500'} shadow-sm`}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">{selectedData ? "Total JP (Individu)" : "Total JP (OPD)"}</p>
                                <h3 className="text-2xl font-bold">{stats.totalJP} JP</h3>
                            </div>
                            <GraduationCap className="text-blue-500 h-8 w-8" />
                        </div>
                        <div className="mt-2">
                             {selectedData && stats.totalJP >= targetJP ? 
                                <Badge variant="secondary" className="bg-green-100 text-green-800">Target 20JP Tercapai</Badge> : 
                                <span className="text-xs text-muted-foreground">Akumulasi Jam Pelajaran Diklat.</span>
                             }
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="shadow-sm border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Penghargaan</p>
                                <h3 className="text-2xl font-bold">{stats.totalAwards}</h3>
                            </div>
                            <Medal className="text-orange-500 h-8 w-8" />
                        </div>
                         <p className="text-xs text-muted-foreground mt-2">Prestasi yang tercatat.</p>
                    </CardContent>
                </Card>
            </div>

            {selectedData ? (
                // VIEW DETAIL INDIVIDU
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* Riwayat Diklat */}
                    <Card className="border-border shadow-sm">
                        <CardHeader className="border-b pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="text-gray-600" /> Riwayat Diklat & Pelatihan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Diklat</TableHead>
                                        <TableHead>Tahun</TableHead>
                                        <TableHead>JP</TableHead>
                                        <TableHead>Kategori</TableHead>
                                        <TableHead className="text-center">Bukti</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedData.diklat.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Tidak ada data diklat.</TableCell></TableRow>
                                    ) : (
                                        selectedData.diklat.map((d) => (
                                            <TableRow key={d.id}>
                                                <TableCell className="font-medium text-sm">
                                                    {d.namaDiklat}
                                                    <div className="text-xs text-muted-foreground">{d.penyelenggara}</div>
                                                </TableCell>
                                                <TableCell>{d.tahun}</TableCell>
                                                <TableCell>{d.durasiJam}</TableCell>
                                                <TableCell><Badge variant="outline">{d.kategori}</Badge></TableCell>
                                                <TableCell className="text-center">
                                                    {d.fileBuktiUrl ? (
                                                        <a href={d.fileBuktiUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Lihat</a>
                                                    ) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Riwayat Penghargaan */}
                    <Card className="border-border shadow-sm">
                        <CardHeader className="border-b pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Medal className="text-orange-500" /> Riwayat Penghargaan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Penghargaan</TableHead>
                                        <TableHead>Tahun</TableHead>
                                        <TableHead>Tingkat</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedData.penghargaan.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Tidak ada data penghargaan.</TableCell></TableRow>
                                    ) : (
                                        selectedData.penghargaan.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium text-sm">
                                                    {p.namaPenghargaan}
                                                    <div className="text-xs text-muted-foreground">{p.pemberi}</div>
                                                </TableCell>
                                                <TableCell>{p.tahun}</TableCell>
                                                <TableCell><Badge variant="secondary">{p.tingkat}</Badge></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                // VIEW AGREGAT OPD (Jika tidak ada user terpilih)
                <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/20 animate-in zoom-in-95">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Analisis Pengembangan Pegawai</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-md mx-auto mt-2">
                        Pilih pegawai pada menu di atas untuk melihat detail riwayat Diklat dan Penghargaan secara spesifik sebagai bahan pertimbangan penilaian talenta.
                    </p>
                </div>
            )}
        </div>
    );
}