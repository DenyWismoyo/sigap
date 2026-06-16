// Directory: src/app/dashboard/pelayanan/tabs/RekapitulasiTab.tsx
// [UPDATE] Menambahkan Visualisasi Grafik (Bar Chart) untuk tren layanan.

"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { UserProfile } from '@/types';
import { usePelayananData } from '@/app/dashboard/hooks/usePelayananData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, CalendarRange, Calendar, Loader2, BarChart2, TrendingUp } from 'lucide-react';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

const SummaryCard = ({ title, value, icon, bgColor, textColor }: any) => (
    <Card className="shadow-sm border-border overflow-hidden">
        <CardContent className="p-6 flex items-center">
            <div className={`p-4 rounded-full mr-4 ${bgColor}`}>
                {React.cloneElement(icon, { className: `w-8 h-8 ${textColor}` })}
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            </div>
        </CardContent>
    </Card>
);

export default function RekapitulasiTab({ userProfile }: { userProfile: UserProfile }) {
    const { statsPeriodik, allTransactions, isLoading } = usePelayananData();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // Konversi objek rincian harian ke array untuk tabel
    const rincianHarianArray = useMemo(() => 
        Object.entries(statsPeriodik.rincianHarian || {}).sort(([,a], [,b]) => b - a)
    , [statsPeriodik]);

    // --- RENDER CHART ---
    useEffect(() => {
        if (isLoading || !chartRef.current || allTransactions.length === 0) return;

        // Destroy old chart
        if (chartInstance.current) chartInstance.current.destroy();

        // 1. Siapkan Data: Kelompokkan per Bulan (6 bulan terakhir)
        const monthsMap = new Map<string, { peng: number, umum: number }>();
        const today = new Date();
        
        // Inisialisasi 6 bulan terakhir
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
            monthsMap.set(key, { peng: 0, umum: 0 });
        }

        allTransactions.forEach(t => {
            const date = t.tanggal.toDate();
            // Hanya hitung jika masuk dalam range 6 bulan
            if (date > new Date(today.getFullYear(), today.getMonth() - 6, 1)) {
                const key = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
                if (monthsMap.has(key)) {
                    const curr = monthsMap.get(key)!;
                    if (t.kategori === 'Pengambilan') curr.peng = curr.peng + 1;
                    else curr.umum = curr.umum + 1;
                }
            }
        });

        const labels = Array.from(monthsMap.keys());
        const dataPeng = Array.from(monthsMap.values()).map(v => v.peng);
        const dataUmum = Array.from(monthsMap.values()).map(v => v.umum);

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? '#374151' : '#e5e7eb';
        const textColor = isDark ? '#9ca3af' : '#4b5563';

        chartInstance.current = new Chart(chartRef.current, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Pengambilan Dokumen',
                        data: dataPeng,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
                        borderRadius: 4,
                        stack: 'Stack 0',
                    },
                    {
                        label: 'Layanan Umum',
                        data: dataUmum,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
                        borderRadius: 4,
                        stack: 'Stack 0',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: { 
                        grid: { color: gridColor },
                        ticks: { color: textColor, stepSize: 1 },
                        beginAtZero: true
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, [allTransactions, isLoading]);

    if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-muted-foreground"/></div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            {/* Section 1: Kartu Utama */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard 
                    title="Total Harian (Hari Ini)" 
                    value={statsPeriodik.harian} 
                    icon={<CalendarDays />} 
                    bgColor="bg-blue-100 dark:bg-blue-900/40" 
                    textColor="text-blue-600 dark:text-blue-400" 
                />
                <SummaryCard 
                    title="Total Bulanan (Bulan Ini)" 
                    value={statsPeriodik.bulanan} 
                    icon={<CalendarRange />} 
                    bgColor="bg-green-100 dark:bg-green-900/40" 
                    textColor="text-green-600 dark:text-green-400" 
                />
                <SummaryCard 
                    title="Total Tahunan (Tahun Ini)" 
                    value={statsPeriodik.tahunan} 
                    icon={<Calendar />} 
                    bgColor="bg-purple-100 dark:bg-purple-900/40" 
                    textColor="text-purple-600 dark:text-purple-400" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section 2: Chart Tren */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-600"/>
                            Tren Pelayanan (6 Bulan Terakhir)
                        </CardTitle>
                        <CardDescription>Visualisasi volume layanan per bulan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 3: Tabel Rincian Harian */}
                <Card className="border-border shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart2 size={20} className="text-green-600"/>
                            Rincian Harian Detail
                        </CardTitle>
                        <CardDescription>
                            Pelayanan hari ini ({new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Jenis Layanan / Dokumen</TableHead>
                                        <TableHead className="text-right w-32">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rincianHarianArray.length > 0 ? (
                                        <>
                                            {rincianHarianArray.map(([jenis, jumlah], idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium text-xs">{jenis}</TableCell>
                                                    <TableCell className="text-right font-bold text-xs">{jumlah}</TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/30 font-bold">
                                                <TableCell>TOTAL</TableCell>
                                                <TableCell className="text-right text-primary">{statsPeriodik.harian}</TableCell>
                                            </TableRow>
                                        </>
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground text-sm">
                                                Belum ada pelayanan hari ini.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}