/**
 * Directory: src/app/dashboard/evaluasi/page.tsx
 * Status: REVAMPED (New UI/UX)
 * Deskripsi: Halaman Dashboard Evaluasi Kinerja dengan fitur Drill-down OPD/Sub-OPD.
 * Menggunakan Chart.js untuk visualisasi dan logika agregasi client-side.
 */

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { KinerjaAgregat, OPD } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';
import { 
    TrendingUp, TrendingDown, Activity, Users, 
    Clock, CheckCircle, AlertTriangle, BarChart2, 
    Calendar, Building, Filter, ChevronDown 
} from 'lucide-react';
import { Chart, registerables, ChartConfiguration } from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { id } from 'date-fns/locale';

// --- Impor Komponen Shadcn ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Asumsi komponen ini ada, atau kita pakai input date biasa
import { Input } from "@/components/ui/input";

Chart.register(...registerables);

// --- Helper Components ---

const ScoreCard = ({ 
    title, 
    value, 
    subValue, 
    trend, 
    icon: Icon, 
    colorClass 
}: { 
    title: string, 
    value: string | number, 
    subValue?: string, 
    trend?: 'up' | 'down' | 'neutral',
    icon: any, 
    colorClass: string 
}) => {
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500';
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;

    return (
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
                    </div>
                    <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
                        <Icon className={`w-5 h-5 ${colorClass}`} />
                    </div>
                </div>
                {subValue && (
                    <div className="mt-2 flex items-center text-xs">
                        <TrendIcon className={`w-3 h-3 mr-1 ${trendColor}`} />
                        <span className={`${trendColor} font-medium`}>{subValue}</span>
                        <span className="text-muted-foreground ml-1">vs periode lalu</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function EvaluasiPage() {
    const { userProfile, loading: authLoading } = useUserAuth();
    // Gunakan hook master data untuk mendapatkan daftar OPD (cache)
    const { opdList, isLoading: isMasterLoading } = useMasterData(true);

    // State Filter
    const [selectedOpdId, setSelectedOpdId] = useState<string>("");
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // 30 hari terakhir
        end: new Date().toISOString().split('T')[0]
    });

    // State Data
    const [kinerjaData, setKinerjaData] = useState<KinerjaAgregat[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Refs Chart
    const trendChartRef = useRef<HTMLCanvasElement>(null);
    const responseChartRef = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<{ [key: string]: Chart | null }>({});

    // --- 1. Tentukan Daftar OPD yang Bisa Dilihat ---
    const availableOpds = useMemo(() => {
        if (!userProfile || !opdList.length) return [];

        // Jika Super Admin, tampilkan semua
        if (userProfile.role === 'super_admin') {
            const induk = opdList.filter(o => o.tipe === 'Induk').sort((a,b) => a.namaOpd.localeCompare(b.namaOpd));
            const sub = opdList.filter(o => o.tipe !== 'Induk').sort((a,b) => a.namaOpd.localeCompare(b.namaOpd));
            return [...induk, ...sub]; // Flat list, bisa diperbaiki jadi grup di Select
        }

        // Jika Admin/User Biasa
        const myOpdId = userProfile.opdId;
        const myOpd = opdList.find(o => o.id === myOpdId);

        if (!myOpd) return [];

        // Jika OPD Induk, cari Sub-OPD nya
        if (myOpd.tipe === 'Induk') {
            const children = opdList.filter(o => o.idOpdInduk === myOpdId);
            return [myOpd, ...children];
        }

        // Jika Sub-OPD, hanya lihat diri sendiri
        return [myOpd];
    }, [userProfile, opdList]);

    // Set default selected OPD saat load pertama
    useEffect(() => {
        if (availableOpds.length > 0 && !selectedOpdId) {
            setSelectedOpdId(availableOpds[0].id!);
        }
    }, [availableOpds, selectedOpdId]);

    // --- 2. Fetch Data Kinerja ---
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedOpdId) return;
            setLoadingData(true);
            try {
                const start = new Date(dateRange.start);
                const end = new Date(dateRange.end);
                end.setHours(23, 59, 59); // Akhir hari

                const q = query(
                    collection(db, 'kinerjaAgregat'),
                    where('opdId', '==', selectedOpdId),
                    where('tanggal', '>=', Timestamp.fromDate(start)),
                    where('tanggal', '<=', Timestamp.fromDate(end)),
                    orderBy('tanggal', 'asc')
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KinerjaAgregat));
                setKinerjaData(data);
            } catch (err) {
                console.error("Gagal fetch kinerja:", err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [selectedOpdId, dateRange]);

    // --- 3. Kalkulasi Metrik (Memoized) ---
    const stats = useMemo(() => {
        const totalDays = kinerjaData.length;
        if (totalDays === 0) return null;

        // Agregasi total
        let totalSurat = 0;
        let totalSelesaiTepatWaktuSum = 0; // Persentase kumulatif untuk rata-rata
        let totalResponseTimeSum = 0;
        let totalRevisiSum = 0;

        // Map untuk agregasi pegawai
        const pegawaiMap = new Map<string, any>();

        kinerjaData.forEach(day => {
            totalSurat += day.totalSuratMasuk || 0;
            totalSelesaiTepatWaktuSum += day.persentasePenyelesaianTepatWaktu || 0;
            totalResponseTimeSum += day.rataRataWaktuResponsDisposisi || 0;
            totalRevisiSum += day.tingkatRevisiDisposisi || 0;

            // Agregasi per pegawai (ambil snapshot terakhir atau akumulasi tugas selesai)
            day.kinerjaPerJabatan?.forEach(p => {
                const current = pegawaiMap.get(p.jabatanId) || { 
                    nama: p.namaPejabat, 
                    jabatan: p.namaJabatan,
                    tugasSelesai: 0,
                    tepatWaktuCount: 0,
                    disposisiDiterima: 0
                };
                current.tugasSelesai += p.totalTugasSelesai; // Hati-hati: ini snapshot harian atau delta? Asumsi snapshot akumulatif harian -> perlu logika khusus jika data backend adalah snapshot total.
                // Asumsi data backend 'totalTugasSelesai' adalah "selesai hari ini". Jika snapshot total, logika ini perlu disesuaikan. 
                // Berdasarkan kode backend: 'totalTugasSelesai' adalah filtered length hari itu. Jadi aman dijumlah.
                
                current.tepatWaktuCount += p.tugasSelesaiTepatWaktu;
                current.disposisiDiterima += p.totalDisposisiDiterima;
                pegawaiMap.set(p.jabatanId, current);
            });
        });

        const avgCompletion = totalSelesaiTepatWaktuSum / totalDays;
        const avgResponse = totalResponseTimeSum / totalDays;
        const avgRevisi = totalRevisiSum / totalDays;
        
        // Dummy trend calculation (karena backend belum support query "periode sebelumnya" secara efisien di sini, kita random logic untuk demo UI)
        // Di produksi, Anda perlu fetch data bulan lalu untuk komparasi nyata.
        const trendSurat = totalSurat > 50 ? 'up' : 'neutral'; 

        const topPegawai = Array.from(pegawaiMap.values())
            .sort((a, b) => b.tugasSelesai - a.tugasSelesai)
            .slice(0, 5); // Top 5

        return {
            totalSurat,
            avgCompletion,
            avgResponse,
            avgRevisi,
            trendSurat,
            topPegawai
        };
    }, [kinerjaData]);

    // --- 4. Render Charts ---
    useEffect(() => {
        // Destroy old charts
        Object.values(chartInstances.current).forEach(c => c?.destroy());

        if (!kinerjaData.length) return;

        const labels = kinerjaData.map(d => d.tanggal.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        const volumeData = kinerjaData.map(d => d.totalSuratMasuk);
        const performanceData = kinerjaData.map(d => d.persentasePenyelesaianTepatWaktu);
        const responseData = kinerjaData.map(d => d.rataRataWaktuResponsDisposisi);

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? '#374151' : '#e5e7eb';
        const textColor = isDark ? '#9ca3af' : '#4b5563';

        // Chart 1: Tren Volume & Kinerja
        if (trendChartRef.current) {
            chartInstances.current.trend = new Chart(trendChartRef.current, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Volume Surat',
                            data: volumeData,
                            borderColor: '#3b82f6', // Blue
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            yAxisID: 'y',
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Ketepatan Waktu (%)',
                            data: performanceData,
                            borderColor: '#10b981', // Green
                            borderDash: [5, 5],
                            yAxisID: 'y1',
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: textColor } },
                        y: { 
                            type: 'linear', display: true, position: 'left', 
                            title: { display: true, text: 'Jumlah Surat' },
                            grid: { color: gridColor }, ticks: { color: textColor } 
                        },
                        y1: { 
                            type: 'linear', display: true, position: 'right', 
                            grid: { drawOnChartArea: false },
                            min: 0, max: 100,
                            ticks: { color: '#10b981', callback: (v) => `${v}%` } 
                        },
                    },
                    plugins: { legend: { labels: { color: textColor } } }
                }
            });
        }

        // Chart 2: Waktu Respons Harian (Bar)
        if (responseChartRef.current) {
            chartInstances.current.response = new Chart(responseChartRef.current, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Rata-rata Waktu Respons (Jam)',
                        data: responseData,
                        backgroundColor: responseData.map(val => val > 4 ? '#ef4444' : '#f59e0b'), // Merah jika > 4 jam
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: { grid: { display: false }, ticks: { color: textColor } },
                        y: { grid: { color: gridColor }, ticks: { color: textColor } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        return () => {
            Object.values(chartInstances.current).forEach(c => c?.destroy());
        };
    }, [kinerjaData]);


    if (authLoading || isMasterLoading) {
        return <div className="p-8 text-center text-muted-foreground">Memuat data evaluasi...</div>;
    }

    if (availableOpds.length === 0) {
         return <div className="p-8 text-center text-red-500">Anda tidak memiliki akses ke data OPD manapun.</div>;
    }

    return (
        <div className="space-y-8 animate-fadeInUp pb-20">
            
            {/* HEADER & FILTER */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <BarChart2 className="mr-3 text-blue-600" size={32} />
                        Evaluasi Kinerja
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Pantau kesehatan organisasi, beban kerja, dan produktivitas tim.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="w-full sm:w-64">
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Unit Kerja (OPD)</label>
                        <Select value={selectedOpdId} onValueChange={setSelectedOpdId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih OPD" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableOpds.map(opd => (
                                    <SelectItem key={opd.id} value={opd.id!}>
                                        {opd.tipe === 'Sub-OPD' ? `↳ ${opd.namaOpd}` : opd.namaOpd}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Dari</label>
                            <Input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-36" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Sampai</label>
                            <Input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-36" />
                        </div>
                    </div>
                </div>
            </div>

            {loadingData ? (
                <div className="py-20 text-center text-muted-foreground">Mengambil data analitik...</div>
            ) : !stats ? (
                 <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">Belum ada data kinerja untuk periode ini.</div>
            ) : (
                <>
                    {/* SCORECARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ScoreCard 
                            title="Volume Surat Masuk" 
                            value={stats.totalSurat} 
                            subValue={"+12%"} trend="up" // Dummy trend logic
                            icon={Building} colorClass="text-blue-600" 
                        />
                        <ScoreCard 
                            title="Kecepatan Respons" 
                            value={`${stats.avgResponse.toFixed(1)} Jam`} 
                            subValue={"-0.5 Jam"} trend="up" // Lebih cepat = bagus (up sentiment)
                            icon={Clock} colorClass="text-yellow-600" 
                        />
                        <ScoreCard 
                            title="Ketepatan Waktu" 
                            value={`${stats.avgCompletion.toFixed(0)}%`} 
                            subValue={stats.avgCompletion > 90 ? "Excellent" : "Perlu Atensi"} trend={stats.avgCompletion > 90 ? "up" : "neutral"}
                            icon={CheckCircle} colorClass="text-green-600" 
                        />
                        <ScoreCard 
                            title="Rasio Revisi" 
                            value={`${stats.avgRevisi.toFixed(1)}%`} 
                            subValue={"Indikator Kualitas"} trend="neutral"
                            icon={AlertTriangle} colorClass="text-red-600" 
                        />
                    </div>

                    {/* CHARTS SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 shadow-sm">
                            <CardHeader>
                                <CardTitle>Tren Kinerja & Volume</CardTitle>
                                <CardDescription>Korelasi antara beban kerja (volume) dan efisiensi penyelesaian.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <canvas ref={trendChartRef}></canvas>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-1 shadow-sm">
                            <CardHeader>
                                <CardTitle>Kecepatan Respons Harian</CardTitle>
                                <CardDescription>Rata-rata waktu (jam) untuk merespons surat.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <canvas ref={responseChartRef}></canvas>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* LEADERBOARD & TABLES */}
                    <Tabs defaultValue="pegawai" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                            <TabsTrigger value="pegawai">Peringkat Kinerja Tim</TabsTrigger>
                            <TabsTrigger value="bottleneck">Deteksi Kemacetan (Beta)</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="pegawai" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Performers (Periode Ini)</CardTitle>
                                    <CardDescription>Berdasarkan jumlah tugas yang diselesaikan.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nama Pegawai</TableHead>
                                                <TableHead>Jabatan</TableHead>
                                                <TableHead className="text-right">Tugas Selesai</TableHead>
                                                <TableHead className="text-right">Disposisi Diterima</TableHead>
                                                <TableHead className="text-center">Performa</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stats.topPegawai.map((p, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">
                                                        {idx + 1}. {p.nama}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">{p.jabatan}</TableCell>
                                                    <TableCell className="text-right font-bold">{p.tugasSelesai}</TableCell>
                                                    <TableCell className="text-right">{p.disposisiDiterima}</TableCell>
                                                    <TableCell className="text-center">
                                                        {p.tepatWaktuCount > 0 && p.tugasSelesai > 0 
                                                            ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{(p.tepatWaktuCount / p.tugasSelesai * 100).toFixed(0)}% Tepat Waktu</Badge>
                                                            : <span className="text-muted-foreground">-</span>
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {stats.topPegawai.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data kinerja individu.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="bottleneck" className="mt-4">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Analisis Kemacetan (Bottlenecks)</CardTitle>
                                    <CardDescription>Unit kerja dengan beban tinggi atau respons lambat.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                        <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-2" />
                                        <p>Fitur ini sedang dalam pengembangan.</p>
                                        <p className="text-sm">Akan menampilkan jabatan mana yang memiliki tumpukan disposisi "Belum Diterima" terbanyak.</p>
                                    </div>
                                </CardContent>
                             </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}