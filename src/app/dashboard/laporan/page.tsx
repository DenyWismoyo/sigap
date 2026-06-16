// Lokasi: src/app/dashboard/laporan/page.tsx
// [OPTIMASI FASE 3]
// - Menghapus import statis 'chart.js'.
// - Menggunakan dynamic import untuk Chart.js di dalam useEffect.
// - Ini memastikan library grafik yang berat hanya dimuat di klien setelah halaman render.

"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { OPD } from '../../../types';
import { useUserAuth } from '../../../context/AuthContext';
import { Mail, CheckCircle, Clock } from 'lucide-react';
// [DIHAPUS] Import statis Chart.js dihapus
// import { Chart, registerables } from 'chart.js/auto';

// --- Impor Komponen Shadcn ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LaporanMingguan {
    id: string;
    opdId: string;
    namaOpd: string;
    totalSuratMasuk: number;
    suratSelesai: number;
    suratTerlambat: number;
    rataRataWaktuResponsJam: number;
    timestamp: Timestamp;
}

const StatCard = ({ title, value, icon, colorClass }: { title: string; value: string | number; icon: React.ReactNode; colorClass: string }) => (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-3 rounded-full ${colorClass.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20`}>
          {React.cloneElement(icon as React.ReactElement, { 
            // @ts-ignore
            className: `w-5 h-5 ${colorClass}` 
          })}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
);

export default function LaporanPage() {
    const { userProfile } = useUserAuth();
    const [laporanList, setLaporanList] = useState<LaporanMingguan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

    const chartRef = useRef<HTMLCanvasElement | null>(null);
    // Gunakan 'any' untuk chart instance karena kita tidak mengimpor tipe secara statis
    const chartInstance = useRef<any>(null);

    useEffect(() => {
        const fetchLaporan = async () => {
            if (!selectedDate) return;
            setLoading(true);
            try {
                const endDate = new Date(selectedDate);
                endDate.setHours(23, 59, 59, 999);
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 7);
                
                const q = query(collection(db, "laporanMingguan"), where("timestamp", ">=", startDate), where("timestamp", "<=", endDate), orderBy("timestamp", "desc"));
                const laporanSnapshot = await getDocs(q);
                const latestReports = new Map<string, LaporanMingguan>();
                laporanSnapshot.docs.forEach(doc => {
                    const report = { id: doc.id, ...doc.data() } as LaporanMingguan;
                    if (!latestReports.has(report.opdId)) latestReports.set(report.opdId, report);
                });
                setLaporanList(Array.from(latestReports.values()));
            } catch (error) { console.error("Gagal mengambil data:", error); } 
            finally { setLoading(false); }
        };
        fetchLaporan();
    }, [selectedDate]);

    const { totalSurat, suratSelesai, suratLewatBatasWaktu, opdChartData } = useMemo(() => {
        if (laporanList.length === 0) return { totalSurat: 0, suratSelesai: 0, suratLewatBatasWaktu: 0, opdChartData: { labels: [], datasets: [] } };
        
        const stats = laporanList.reduce((acc, curr) => {
            acc.totalSurat += curr.totalSuratMasuk;
            acc.suratSelesai += curr.suratSelesai;
            acc.suratLewatBatasWaktu += curr.suratTerlambat;
            return acc;
        }, { totalSurat: 0, suratSelesai: 0, suratLewatBatasWaktu: 0 });

        const chartData = {
            labels: laporanList.map(l => l.namaOpd),
            datasets: [{
                label: 'Jumlah Surat per OPD',
                data: laporanList.map(l => l.totalSuratMasuk),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        };
        return { ...stats, opdChartData: chartData };
    }, [laporanList]);

    // [OPTIMASI] Dynamic Import Chart.js
    useEffect(() => {
        const renderChart = async () => {
            if (chartRef.current && opdChartData.labels.length > 0) {
                // Import Dinamis di sini
                const { Chart, registerables } = await import('chart.js/auto');
                Chart.register(...registerables);

                const isDarkMode = document.documentElement.classList.contains('dark');
                const textColor = isDarkMode ? '#cbd5e1' : '#334155';
                const gridColor = isDarkMode ? '#334155' : '#e5e7eb';

                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
                
                chartInstance.current = new Chart(chartRef.current, {
                    type: 'bar',
                    data: opdChartData as any,
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { color: textColor } } },
                        scales: { 
                            y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor} }, 
                            x: { ticks: { color: textColor }, grid: { color: gridColor } } 
                        } 
                    }
                });
            }
        };

        renderChart();
        
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [opdChartData]);

    if (userProfile?.role !== 'super_admin') return <div className="p-6 text-center text-red-700 bg-red-100 rounded-lg">Akses ditolak.</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground">Laporan & Analitika Kinerja</h1>
            <Card className="mt-6 shadow-sm border-border">
                <CardContent className="p-4">
                    <div>
                        <Label htmlFor="reportDate" className="font-bold text-foreground mb-1">Tampilkan Laporan Mingguan Terbaru Dari Tanggal:</Label>
                        <Input id="reportDate" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto"/>
                    </div>
                </CardContent>
            </Card>

            {loading ? <p className='text-center text-muted-foreground p-8'>Memuat laporan...</p> : (
                <>
                    <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-3">
                        <StatCard title="Total Surat" value={totalSurat} icon={<Mail className="text-blue-600" />} colorClass="text-blue-600" />
                        <StatCard title="Surat Selesai" value={suratSelesai} icon={<CheckCircle className="text-green-600" />} colorClass="text-green-600" />
                        <StatCard title="Lewat Batas Waktu" value={suratLewatBatasWaktu} icon={<Clock className="text-red-600" />} colorClass="text-red-600" />
                    </div>
                    <Card className="mt-8 shadow-sm border-border">
                        <CardHeader><CardTitle className="text-xl">Surat per OPD (Mingguan)</CardTitle></CardHeader>
                        <CardContent className="p-6"><canvas ref={chartRef}></canvas></CardContent>
                    </Card>
                    <Card className="mt-8 shadow-sm border-border">
                        <CardHeader><CardTitle className="text-xl">Detail Laporan per OPD</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Nama OPD</TableHead><TableHead>Total Surat</TableHead><TableHead>Selesai</TableHead><TableHead>Terlambat</TableHead><TableHead>Rata-rata Respons (Jam)</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {laporanList.length > 0 ? laporanList.map(laporan => (
                                            <TableRow key={laporan.id}>
                                                <TableCell className="font-semibold">{laporan.namaOpd}</TableCell>
                                                <TableCell>{laporan.totalSuratMasuk}</TableCell>
                                                <TableCell>{laporan.suratSelesai}</TableCell>
                                                <TableCell className={`font-medium ${laporan.suratTerlambat > 0 ? 'text-red-600' : ''}`}>{laporan.suratTerlambat}</TableCell>
                                                <TableCell>{laporan.rataRataWaktuResponsJam}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground p-8">Tidak ada data laporan.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}