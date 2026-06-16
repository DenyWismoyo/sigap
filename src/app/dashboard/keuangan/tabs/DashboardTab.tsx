// Directory: src/app/dashboard/keuangan/tabs/DashboardTab.tsx
// [UPGRADE VISIONER] Dashboard Analitik Keuangan Lengkap
// - Grafik Realisasi vs Pagu.
// - Analisis Tren Arus Kas.
// - Top Pengeluaran (Pareto Analysis).
// - Daftar Rekening Kritis (Warning System).

"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useKeuanganData } from '@/app/dashboard/hooks/useKeuanganData';
import { Wallet, TrendingUp, TrendingDown, PieChart, AlertTriangle, Activity } from 'lucide-react';
import { Chart, registerables } from 'chart.js/auto';
import { Progress } from "@/components/ui/progress";

Chart.register(...registerables);

export default function DashboardTab({ userProfile }: { userProfile: UserProfile }) {
    const { rekeningSummary, transaksiList, saldoKas, isLoading } = useKeuanganData(userProfile);
    
    const chartTrendRef = useRef<HTMLCanvasElement>(null);
    const chartRealizationRef = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<{ [key: string]: Chart | null }>({});

    // --- STATISTIK UTAMA ---
    const stats = useMemo(() => {
        const totalPagu = rekeningSummary.reduce((sum, r) => sum + (r.anggaran || 0), 0);
        const totalRealisasi = rekeningSummary.reduce((sum, r) => sum + r.terpakai, 0);
        const totalMasuk = transaksiList.filter(t => t.tipe === 'Masuk').reduce((sum, t) => sum + t.jumlah, 0);
        const persenTotal = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;
        
        // Filter Rekening Kritis (Sisa < 20%)
        const criticalAccounts = rekeningSummary
            .filter(r => r.anggaran && r.anggaran > 0 && (r.sisa / r.anggaran) < 0.2)
            .sort((a, b) => (a.sisa / a.anggaran!) - (b.sisa / b.anggaran!))
            .slice(0, 5);

        return { totalPagu, totalRealisasi, totalMasuk, persenTotal, criticalAccounts };
    }, [rekeningSummary, transaksiList]);

    // --- RENDER CHART ---
    useEffect(() => {
        if (isLoading) return;

        // 1. Chart Tren Arus Kas (Bulanan)
        if (chartTrendRef.current) {
            if (chartInstances.current.trend) chartInstances.current.trend.destroy();
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
            const incomeData = new Array(12).fill(0);
            const expenseData = new Array(12).fill(0);

            transaksiList.forEach(t => {
                const month = t.tanggal.toDate().getMonth();
                if (t.tipe === 'Masuk') incomeData[month] += t.jumlah;
                else expenseData[month] += t.jumlah;
            });

            chartInstances.current.trend = new Chart(chartTrendRef.current, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        { label: 'Pemasukan', data: incomeData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
                        { label: 'Pengeluaran', data: expenseData, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.4, fill: true }
                    ]
                },
                options: { 
                    responsive: true, 
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // 2. Chart Top 5 Realisasi Anggaran (Bar)
        if (chartRealizationRef.current) {
            if (chartInstances.current.real) chartInstances.current.real.destroy();

            // Ambil top 5 rekening dengan pengeluaran terbesar
            const topSpenders = [...rekeningSummary]
                .sort((a, b) => b.terpakai - a.terpakai)
                .slice(0, 5);

            chartInstances.current.real = new Chart(chartRealizationRef.current, {
                type: 'bar',
                data: {
                    labels: topSpenders.map(r => r.nama.substring(0, 15) + '...'),
                    datasets: [{
                        label: 'Realisasi (Rp)',
                        data: topSpenders.map(r => r.terpakai),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } }
                }
            });
        }

        return () => {
            Object.values(chartInstances.current).forEach(c => c?.destroy());
        };
    }, [transaksiList, rekeningSummary, isLoading]);

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat analisis keuangan...</div>;

    return (
        <div className="space-y-6">
            {/* KARTU RINGKASAN */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Saldo Kas Tunai</p>
                                <h3 className="text-2xl font-bold mt-1">Rp {saldoKas.toLocaleString('id-ID')}</h3>
                            </div>
                            <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20}/></div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Total Belanja (YTD)</p>
                                <h3 className="text-2xl font-bold mt-1">Rp {stats.totalRealisasi.toLocaleString('id-ID')}</h3>
                            </div>
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><TrendingDown size={20}/></div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Total Pagu</p>
                                <h3 className="text-2xl font-bold mt-1">Rp {stats.totalPagu.toLocaleString('id-ID')}</h3>
                            </div>
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><PieChart size={20}/></div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Serapan Anggaran</p>
                                <h3 className="text-2xl font-bold mt-1">{stats.persenTotal.toFixed(1)}%</h3>
                            </div>
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Activity size={20}/></div>
                        </div>
                        <Progress value={stats.persenTotal} className="h-2 mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Tren Arus Kas Bulanan</CardTitle>
                        <CardDescription>Perbandingan Pemasukan (GU) vs Pengeluaran Belanja</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <canvas ref={chartTrendRef}></canvas>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Top 5 Kegiatan (Realisasi)</CardTitle>
                        <CardDescription>Kegiatan dengan serapan terbesar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <canvas ref={chartRealizationRef}></canvas>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* WARNING SYSTEM: REKENING KRITIS */}
            {stats.criticalAccounts.length > 0 && (
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center text-red-600">
                            <AlertTriangle size={20} className="mr-2"/>
                            Peringatan Dini: Rekening Menipis
                        </CardTitle>
                        <CardDescription>
                            Rekening berikut memiliki sisa anggaran kurang dari 20%. Harap berhati-hati dalam realisasi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.criticalAccounts.map(rek => (
                                <div key={rek.id} className="flex flex-col space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-foreground">{rek.nama}</span>
                                        <span className="text-red-600 font-bold">Sisa: Rp {rek.sisa.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                        <div className="bg-red-500 h-full" style={{ width: `${Math.min(rek.persenSerapan, 100)}%` }} />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Kode: {rek.kode}</span>
                                        <span>Terserap {rek.persenSerapan.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}