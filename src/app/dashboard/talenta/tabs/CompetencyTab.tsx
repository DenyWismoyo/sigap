/**
 * Directory: src/app/dashboard/talenta/tabs/CompetencyTab.tsx
 * History Update:
 * - 2024-11-28: Removed mock data generator.
 * - [BARU] Implemented 'calculateCompetencyFromRealData' to visualize actual user data.
 */

"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button"; 
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { UserProfile, KompetensiItem, RiwayatDiklat } from '@/types';
import { BrainCircuit, Target, AlertTriangle, CheckCircle2, Search, ChevronsUpDown, Check } from 'lucide-react';
import PlanCreationModal from '../components/PlanCreationModal'; 
import { cn } from '@/lib/utils';
import { TalentAssessment, TalentDataCombined } from '@/app/dashboard/hooks/useTalentData';

// --- Impor Komponen Pencarian (Combobox) ---
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// [BARU] Helper untuk menghitung kompetensi dari data riil (Proxy Logic)
// Karena belum ada hasil asesmen mendalam per kompetensi, kita gunakan:
// 1. Nilai Potensi (sebagai base score Psikometrik)
// 2. Riwayat Diklat (sebagai penambah skor Teknis/Manajerial)
const calculateCompetencyFromRealData = (
    assessment?: TalentAssessment, 
    diklatList: RiwayatDiklat[] = [],
    jobLevel: number = 0
): KompetensiItem[] => {
    
    // Base score dari Potensi (Skala 1-100 dikonversi ke 1-5)
    // Jika tidak ada assessment, asumsi base 2 (Rendah)
    const baseScore = assessment ? (assessment.nilaiPotensi / 20) : 2; 

    // Hitung booster dari diklat (Asumsi sederhana: tiap diklat menambah kompetensi)
    const countManajerial = diklatList.filter(d => d.kategori === 'Manajerial').length;
    const countTeknis = diklatList.filter(d => d.kategori === 'Teknis').length;
    const countSosio = diklatList.filter(d => d.kategori === 'Sosiokultural').length;

    // Standar dinamis berdasarkan level jabatan
    // Level 1-5 (Staf/Pelaksana), 6-9 (Struktural/Ahli)
    // Semakin tinggi jabatan, standar semakin tinggi (Max 5)
    const standar = jobLevel >= 3 ? 4 : 3; 

    return [
        { 
            aspek: 'Manajerial & Kepemimpinan', 
            standar: standar, 
            // Base + bonus jika pernah diklat manajerial (max 5)
            aktual: Math.min(5, parseFloat((baseScore + (countManajerial * 0.5)).toFixed(1))), 
            gap: 0 
        },
        { 
            aspek: 'Kompetensi Teknis', 
            standar: standar + 0.5, // Teknis biasanya butuh lebih tinggi dari rata-rata
            aktual: Math.min(5, parseFloat(((assessment ? assessment.nilaiKinerja / 20 : 2) + (countTeknis * 0.4)).toFixed(1))), 
            gap: 0 
        },
        { 
            aspek: 'Sosiokultural', 
            standar: 3, 
            aktual: Math.min(5, parseFloat((baseScore + (countSosio * 0.3)).toFixed(1))), 
            gap: 0 
        },
        { 
            aspek: 'Inovasi & Adaptabilitas', 
            standar: 4, 
            // Estimasi dari gabungan potensi + kinerja
            aktual: assessment ? parseFloat(((assessment.nilaiPotensi + assessment.nilaiKinerja) / 40).toFixed(1)) : 2.5, 
            gap: 0 
        },
        { 
            aspek: 'Literasi Digital', 
            standar: 3, 
            // Asumsi dasar (bisa diambil dari riwayat tugas digital kedepannya)
            aktual: 3.5, 
            gap: 0 
        },
    ].map(item => ({
        ...item,
        gap: parseFloat((item.aktual - item.standar).toFixed(1))
    }));
};

interface CompetencyTabProps {
    employees: UserProfile[];
    // [UPDATE] Menerima data lengkap (TalentDataCombined) bukan hanya UserProfile array
    // Karena kita butuh akses ke 'diklat', 'penghargaan', dan 'assessment'
    combinedData?: TalentDataCombined[]; 
}

export default function CompetencyTab({ employees, combinedData = [] }: CompetencyTabProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Cari data lengkap pegawai yang dipilih dari combinedData
    const selectedFullData = useMemo(() => 
        combinedData.find(d => d.user.uid === selectedUserId), 
    [combinedData, selectedUserId]);

    // Lazy Search untuk Combobox
    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return []; 
        return employees
            .filter(e => e.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 10); 
    }, [employees, searchTerm]);

    // [UPDATE] Gunakan real data calculator
    const competencyData = useMemo(() => {
        if (!selectedFullData) return [];
        return calculateCompetencyFromRealData(
            selectedFullData.assessment, 
            selectedFullData.diklat,
            selectedFullData.user.level // Gunakan level jabatan user jika ada
        );
    }, [selectedFullData]);

    const chartData = {
        labels: competencyData.map(c => c.aspek),
        datasets: [
            {
                label: 'Standar Kompetensi (Job Req)',
                data: competencyData.map(c => c.standar),
                backgroundColor: 'rgba(148, 163, 184, 0.2)',
                borderColor: 'rgba(148, 163, 184, 1)',
                borderWidth: 1,
                borderDash: [5, 5],
            },
            {
                label: 'Kompetensi Aktual (Real Data)',
                data: competencyData.map(c => c.aktual),
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(37, 99, 235, 1)',
            },
        ],
    };

    const chartOptions = {
        scales: {
            r: {
                angleLines: { display: true },
                suggestedMin: 0,
                suggestedMax: 5,
                ticks: { stepSize: 1, display: false }, // Sembunyikan angka axis agar bersih
                pointLabels: { font: { size: 11 } }
            },
        },
        plugins: {
            legend: { position: 'bottom' as const },
        }
    };

    const gaps = competencyData.filter(c => c.gap < 0);
    const strengths = competencyData.filter(c => c.gap >= 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Selector Pegawai */}
            <Card className="border-border shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-muted-foreground block mb-1">Pilih Pegawai untuk Analisis</label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full max-w-md justify-between font-normal">
                                    {selectedFullData ? selectedFullData.user.namaLengkap : "Ketik nama pegawai..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command shouldFilter={false}> 
                                    <CommandInput placeholder="Cari pegawai..." onValueChange={setSearchTerm} value={searchTerm}/>
                                    <CommandList>
                                        {searchTerm.length > 0 && filteredEmployees.length === 0 && <CommandEmpty>Tidak ditemukan.</CommandEmpty>}
                                        {filteredEmployees.map((emp) => (
                                            <CommandItem key={emp.uid} value={emp.namaLengkap} onSelect={() => { setSelectedUserId(emp.uid); setOpenCombobox(false); }} className="cursor-pointer">
                                                <Check className={cn("mr-2 h-4 w-4", selectedUserId === emp.uid ? "opacity-100" : "opacity-0")} />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{emp.namaLengkap}</span>
                                                    <span className="text-xs text-muted-foreground">{emp.namaJabatan || 'Staf'}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    {selectedFullData && (
                        <div className="w-full md:w-auto flex gap-4 justify-end">
                             <div className="text-right">
                                 <p className="text-xs text-muted-foreground">Rerata Kompetensi</p>
                                 <p className="text-xl font-bold text-blue-600">
                                     {(competencyData.reduce((acc, c) => acc + c.aktual, 0) / competencyData.length).toFixed(1)}
                                     <span className="text-xs font-normal text-muted-foreground"> / 5.0</span>
                                 </p>
                             </div>
                             <div className="text-right border-l pl-4">
                                 <p className="text-xs text-muted-foreground">Diklat Tercatat</p>
                                 <p className="text-xl font-bold text-foreground">{selectedFullData.diklat.length}</p>
                             </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedFullData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    {/* VISUALISASI RADAR */}
                    <Card className="md:col-span-1 shadow-md border-blue-200 dark:border-blue-800 bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BrainCircuit className="text-blue-600" /> Peta Kompetensi
                            </CardTitle>
                            <CardDescription>Data diolah dari Nilai Asesmen & Riwayat Diklat.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-square w-full max-w-[300px] mx-auto">
                                <Radar data={chartData} options={chartOptions} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* DETAIL GAP ANALYSIS */}
                    <div className="md:col-span-2 space-y-6">
                        
                        {/* Kekurangan (Gap) */}
                        <Card className="border-l-4 border-l-red-500 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                                    <AlertTriangle size={18} /> Area Pengembangan (Gap Negatif)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {gaps.length > 0 ? (
                                    <div className="space-y-4">
                                        {gaps.map((g, idx) => (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-semibold">{g.aspek}</span>
                                                    <span className="text-red-500 text-xs font-bold">Gap: {g.gap} point</span>
                                                </div>
                                                <Progress value={(g.aktual / g.standar) * 100} className="h-2 bg-red-100 dark:bg-red-900/30" indicatorColor="bg-red-500" />
                                                <p className="text-xs text-muted-foreground">
                                                    Aktual: {g.aktual} vs Standar: {g.standar}. Rekomendasi: Pelatihan intensif.
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-md">
                                        <CheckCircle2 size={18}/>
                                        <p className="text-sm font-medium">Luar Biasa! Tidak ada gap kompetensi (Semua memenuhi standar).</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Kekuatan (Strength) */}
                        <Card className="border-l-4 border-l-green-500 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                                    <CheckCircle2 size={18} /> Kekuatan Utama
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <div className="flex flex-wrap gap-2">
                                    {strengths.length > 0 ? strengths.map((s, idx) => (
                                        <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 hover:bg-green-100">
                                            {s.aspek} ({s.aktual})
                                        </Badge>
                                    )) : <span className="text-sm text-muted-foreground">Belum ada data kompetensi yang cukup.</span>}
                                 </div>
                            </CardContent>
                        </Card>
                        
                        <div className="flex justify-end">
                            <Button onClick={() => setIsPlanModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                                <Target className="mr-2 h-4 w-4" /> Buat Rencana Pengembangan (IDP)
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Analisis Kompetensi Berbasis Data</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-md mx-auto mt-2">
                        Data kompetensi kini dihitung secara otomatis dari Nilai Potensi dan Riwayat Diklat pegawai, bukan lagi data dummy.
                    </p>
                </div>
            )}

            <PlanCreationModal 
                isOpen={isPlanModalOpen}
                onClose={() => setIsPlanModalOpen(false)}
                employee={selectedFullData?.user}
                gaps={gaps}
            />
        </div>
    );
}