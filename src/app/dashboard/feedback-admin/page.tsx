// Lokasi: src/app/dashboard/feedback-admin/page.tsx
// [MODIFIKASI]
// - Mengganti `getDocs` dengan pagination.
// - Mengganti `<table>` dan `<select>` HTML dengan <Table> dan <Select> shadcn/ui.
// - Menambahkan tombol "Muat Lebih Banyak" dan "Export Excel".
// - Menambahkan <Script> untuk 'xlsx'.
// - Memperbaiki path impor menggunakan alias '@'.

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, doc, updateDoc, getDocs, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { FeedbackLaporan, FeedbackStatusType } from '@/types';
import { Chart, registerables, ChartConfiguration, ChartItem } from 'chart.js/auto';
import { Inbox, Loader2, CheckCircle, Smile, Meh, Frown, ThumbsUp, ThumbsDown, Bug, Sparkles, MessageSquare, Download, ChevronDown } from 'lucide-react';
import Script from 'next/script';

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// --- Akhir Impor Shadcn ---


Chart.register(...registerables);

declare global {
  interface Window {
    XLSX: any;
  }
}

// Helper untuk Chart
const createChart = (
  ctx: ChartItem, 
  instanceRef: React.MutableRefObject<Chart | null>, 
  config: ChartConfiguration
) => {
  if (instanceRef.current) {
    instanceRef.current.destroy();
  }
  instanceRef.current = new Chart(ctx, config);
};

const getChartColors = (isDarkMode: boolean) => {
  return isDarkMode
    ? ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#6b7280'] // Dark mode colors
    : ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#6b7280']; // Light mode colors
};

const ITEMS_PER_PAGE = 20; 

export default function FeedbackAdminPage() {
  const { userProfile, loading: authLoading } = useUserAuth();
  const [feedbackList, setFeedbackList] = useState<FeedbackLaporan[]>([]);
  const [loading, setLoading] = useState(true);

  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isExporting, setIsExporting] = useState(false); 

  const chartKepuasanRef = useRef<HTMLCanvasElement>(null);
  const chartKemudahanRef = useRef<HTMLCanvasElement>(null);
  const chartTipeRef = useRef<HTMLCanvasElement>(null);
  const chartKepuasanInstance = useRef<Chart | null>(null);
  const chartKemudahanInstance = useRef<Chart | null>(null);
  const chartTipeInstance = useRef<Chart | null>(null);

  const loadFeedback = useCallback(async (loadMore = false) => {
    if (userProfile?.role !== 'super_admin') return;
    
    if (loadMore) {
      if (!hasMore || isLoadingMore) return; 
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      setLastVisible(null); 
      setFeedbackList([]); 
      setHasMore(true); 
    }

    try {
      let q = query(
        collection(db, 'feedbackLaporan'),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      );

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      const newFeedback = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackLaporan));
      
      setFeedbackList(prev => loadMore ? [...prev, ...newFeedback] : newFeedback);
      
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastDoc || null);
      
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);

    } catch (error) {
      console.error("Gagal mengambil data feedback:", error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [userProfile, lastVisible, hasMore, isLoadingMore]); 

  useEffect(() => {
    if (userProfile?.role === 'super_admin') {
      loadFeedback(false); 
    } else if (!authLoading) {
      setLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, authLoading]); 

  const chartData = useMemo(() => {
    const kepuasanCounts: Record<string, number> = { "Sangat Puas": 0, "Puas": 0, "Cukup": 0, "Kurang Puas": 0, "Sangat Tidak Puas": 0 };
    const kemudahanCounts: Record<string, number> = { "Sangat Mudah": 0, "Mudah": 0, "Cukup": 0, "Sulit": 0, "Sangat Sulit": 0 };
    const tipeCounts: Record<string, number> = { "Laporan Bug": 0, "Saran Fitur": 0, "Komentar Umum": 0 };

    feedbackList.forEach(fb => {
      if (kepuasanCounts[fb.kepuasan] !== undefined) kepuasanCounts[fb.kepuasan]++;
      if (kemudahanCounts[fb.kemudahan] !== undefined) kemudahanCounts[fb.kemudahan]++;
      if (tipeCounts[fb.tipe] !== undefined) tipeCounts[fb.tipe]++;
    });

    return { kepuasanCounts, kemudahanCounts, tipeCounts };
  }, [feedbackList]);

  useEffect(() => {
    if (typeof Chart === 'undefined') return;
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const colors = getChartColors(isDarkMode);
    const textColor = isDarkMode ? '#e2e8f0' : '#334155';
    
    if (chartKepuasanRef.current) {
      createChart(chartKepuasanRef.current, chartKepuasanInstance, {
        type: 'pie',
        data: {
          labels: Object.keys(chartData.kepuasanCounts),
          datasets: [{ data: Object.values(chartData.kepuasanCounts), backgroundColor: colors }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor } }, title: { display: true, text: 'Tingkat Kepuasan (Data Dimuat)', color: textColor, font: { size: 16 } } } }
      });
    }

    if (chartKemudahanRef.current) {
      createChart(chartKemudahanRef.current, chartKemudahanInstance, {
        type: 'pie',
        data: {
          labels: Object.keys(chartData.kemudahanCounts),
          datasets: [{ data: Object.values(chartData.kemudahanCounts), backgroundColor: colors }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor } }, title: { display: true, text: 'Tingkat Kemudahan (Data Dimuat)', color: textColor, font: { size: 16 } } } }
      });
    }

    if (chartTipeRef.current) {
      createChart(chartTipeRef.current, chartTipeInstance, {
        type: 'bar',
        data: {
          labels: Object.keys(chartData.tipeCounts),
          datasets: [{ label: 'Jumlah Masukan', data: Object.values(chartData.tipeCounts), backgroundColor: colors.slice(0, 3) }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false }, title: { display: true, text: 'Tipe Masukan (Data Dimuat)', color: textColor, font: { size: 16 } } },
          scales: { y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 } }, x: { ticks: { color: textColor } } }
        }
      });
    }
    
    return () => {
        chartKepuasanInstance.current?.destroy();
        chartKemudahanInstance.current?.destroy();
        chartTipeInstance.current?.destroy();
    }
  }, [chartData]); 

  const handleStatusChange = async (id: string, newStatus: FeedbackStatusType) => {
    const docRef = doc(db, 'feedbackLaporan', id);
    try {
      await updateDoc(docRef, { status: newStatus });
      setFeedbackList(prevList =>
        prevList.map(fb =>
          fb.id === id ? { ...fb, status: newStatus } : fb
        )
      );
    } catch (err) {
      console.error("Gagal update status:", err);
      alert("Gagal memperbarui status.");
    }
  };

  const handleExportExcel = async () => {
      if (!userProfile) return;
      if (!window.XLSX) {
          alert("Library Excel (xlsx) belum dimuat. Mohon tunggu sebentar.");
          return;
      }
      
      setIsExporting(true);
      try {
          const q = query(collection(db, 'feedbackLaporan'), orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(q);
          const allFeedback = snapshot.docs.map(doc => doc.data() as FeedbackLaporan);

          const dataToExport = allFeedback.map(fb => ({
              Tanggal: fb.createdAt.toDate().toLocaleString('id-ID'),
              Pengirim: fb.userNama,
              Jabatan: fb.userJabatan,
              NIP: fb.userNip,
              Tipe: fb.tipe,
              Kepuasan: fb.kepuasan,
              Kemudahan: fb.kemudahan,
              Deskripsi: fb.deskripsi,
              Halaman: fb.halamanTerkait || '-',
              Status: fb.status
          }));

          const ws = window.XLSX.utils.json_to_sheet(dataToExport);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, "Feedback Report");
          window.XLSX.writeFile(wb, "Laporan_Feedback_Lengkap_SIGAP.xlsx");

      } catch (err) {
          console.error("Gagal mengekspor data:", err);
          alert("Gagal mengunduh laporan lengkap.");
      } finally {
          setIsExporting(false);
      }
  };

  if (authLoading || (loading && feedbackList.length === 0)) {
    return <p className="text-center p-8">Memuat dashboard feedback...</p>;
  }

  if (userProfile?.role !== 'super_admin') {
    return <div className="text-center p-8 text-red-600 bg-red-100 rounded-lg">Akses ditolak. Halaman ini hanya untuk Super Admin.</div>;
  }

  const getIcon = (type: 'kepuasan' | 'kemudahan' | 'tipe', value: string) => {
    if (type === 'kepuasan') {
      if (value.includes('Sangat Puas') || value.includes('Puas')) return <Smile className="text-green-500" />;
      if (value.includes('Cukup')) return <Meh className="text-yellow-500" />;
      return <Frown className="text-red-500" />;
    }
    if (type === 'kemudahan') {
      if (value.includes('Sangat Mudah') || value.includes('Mudah')) return <ThumbsUp className="text-green-500" />;
      if (value.includes('Cukup')) return <Meh className="text-yellow-500" />;
      return <ThumbsDown className="text-red-500" />;
    }
    if (type === 'tipe') {
      if (value === 'Laporan Bug') return <Bug className="text-red-500" />;
      if (value === 'Saran Fitur') return <Sparkles className="text-blue-500" />;
      return <MessageSquare className="text-gray-500" />;
    }
  };

  return (
    <div>
      <Script
        src="https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"
        strategy="lazyOnload"
      />

      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
          <Inbox size={28} className="mr-3 text-purple-600" />
          Dashboard Feedback & Survei
        </h1>
        <Button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isExporting ? (
            <Loader2 size={18} className="animate-spin mr-2" />
          ) : (
            <Download size={16} className="mr-2" />
          )}
          {isExporting ? 'Mengekspor...' : 'Export Laporan Lengkap (.xlsx)'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border"><canvas ref={chartKepuasanRef}></canvas></div>
        <div className="p-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border"><canvas ref={chartKemudahanRef}></canvas></div>
        <div className="p-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border"><canvas ref={chartTipeRef}></canvas></div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary p-4 border-b dark:border-dark-border">
          Daftar Masukan Pengguna ({feedbackList.length} dimuat)
        </h2>
        <div className="overflow-x-auto">
          {/* [MODIFIKASI] Gunakan <Table> shadcn */}
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pengirim</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kepuasan</TableHead>
                <TableHead>Kemudahan</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Halaman</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbackList.map(fb => (
                <TableRow key={fb.id}>
                  <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">{fb.createdAt.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</TableCell>
                  <TableCell className="font-medium text-gray-800 dark:text-slate-200">{fb.userNama}<br/><span className="text-xs text-gray-500 font-normal">{fb.userJabatan}</span></TableCell>
                  <TableCell><span className="flex items-center gap-2">{getIcon('tipe', fb.tipe)} {fb.tipe}</span></TableCell>
                  <TableCell><span className="flex items-center gap-2">{getIcon('kepuasan', fb.kepuasan)} {fb.kepuasan}</span></TableCell>
                  <TableCell><span className="flex items-center gap-2">{getIcon('kemudahan', fb.kemudahan)} {fb.kemudahan}</span></TableCell>
                  <TableCell className="min-w-[250px] max-w-xs truncate" title={fb.deskripsi}>{fb.deskripsi}</TableCell>
                  <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400" title={fb.halamanTerkait}>{fb.halamanTerkait || '-'}</TableCell>
                  <TableCell>
                    {/* [MODIFIKASI] Gunakan <Select> shadcn */}
                    <Select
                      value={fb.status}
                      onValueChange={(e) => handleStatusChange(fb.id!, e as FeedbackStatusType)}
                    >
                      <SelectTrigger className={`text-xs w-[120px] ${
                        fb.status === 'Baru' ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300' :
                        fb.status === 'Ditinjau' ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-300' :
                        'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baru">Baru</SelectItem>
                        <SelectItem value="Ditinjau">Ditinjau</SelectItem>
                        <SelectItem value="Selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {feedbackList.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center p-8 text-gray-500">
                    Belum ada feedback atau laporan yang masuk.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="p-4 border-t dark:border-dark-border flex justify-center">
            {/* [MODIFIKASI] Gunakan <Button> */}
            <Button
              onClick={() => loadFeedback(true)}
              disabled={isLoadingMore}
              variant="outline"
            >
              {isLoadingMore ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <ChevronDown size={16} className="mr-2" />
              )}
              {isLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}