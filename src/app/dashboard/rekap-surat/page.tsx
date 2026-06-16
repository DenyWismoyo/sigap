"use client";

// Lokasi: src/app/dashboard/rekap-surat/page.tsx
// [OPTIMASI FASE 3] Code Splitting Extreme.
// - Menghapus dependensi CDN statis untuk XLSX.
// - Menggunakan dynamic import('xlsx') hanya saat tombol Export diklik.
// - Ini mengurangi beban load awal halaman secara signifikan.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import { Surat, OPD } from "@/types";
import StatCard from "../components/StatCard";
import { FileText, Clock, CheckCircle, Archive, Loader2, Download, Search, Building, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SuratStats = {
  total: number;
  pending: number;
  selesai: number;
  diarsip: number;
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function RekapSuratPage() {
  const { userProfile, loading: authLoading } = useUserAuth();

  const [suratList, setSuratList] = useState<Surat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [opdList, setOpdList] = useState<OPD[]>([]);
  const [selectedOpdId, setSelectedOpdId] = useState<string>("Semua");

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isAdminOrTU = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.role === "admin_opd" || userProfile.role === "staf_tu" || userProfile.role === "super_admin";
  }, [userProfile]);
  
  const isSuperAdmin = userProfile?.role === "super_admin";

  useEffect(() => {
    const fetchOpds = async () => {
        if (isSuperAdmin) {
            try {
                const q = query(collection(db, "opd"), orderBy("namaOpd", "asc"));
                const snapshot = await getDocs(q);
                setOpdList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD)));
            } catch (err) { console.error(err); }
        }
    };
    if (!authLoading) fetchOpds();
  }, [isSuperAdmin, authLoading]);

  const sortedOpdOptions = useMemo(() => {
    if (!opdList.length) return [];
    const indukOpds = opdList.filter(o => o.tipe === 'Induk' || !o.idOpdInduk);
    const result: (OPD & { label: string })[] = [];
    indukOpds.forEach(induk => {
        result.push({ ...induk, label: induk.namaOpd });
        const subs = opdList.filter(s => s.idOpdInduk === induk.id);
        subs.forEach(sub => result.push({ ...sub, label: `— ${sub.namaOpd}` }));
    });
    const processedIds = new Set(result.map(r => r.id));
    opdList.forEach(opd => { if (!processedIds.has(opd.id)) result.push({ ...opd, label: opd.namaOpd }); });
    return result;
  }, [opdList]);

  const fetchSurat = useCallback(async () => {
    if (!userProfile || !isAdminOrTU) { setLoading(false); return; }
    setLoading(true);
    try {
      const endDt = new Date(endDate);
      endDt.setDate(endDt.getDate() + 1);
      const conditions = [
          where("tanggalDiterima", ">=", Timestamp.fromDate(new Date(startDate))),
          where("tanggalDiterima", "<", Timestamp.fromDate(endDt))
      ];
      if (isSuperAdmin) {
          if (selectedOpdId !== "Semua") conditions.push(where("opdId", "==", selectedOpdId));
      } else {
          conditions.push(where("opdId", "==", userProfile.opdId));
      }
      const q = query(collection(db, "surat"), ...conditions);
      const querySnapshot = await getDocs(q);
      const allSurat = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Surat));
      allSurat.sort((a, b) => b.tanggalDiterima.toMillis() - a.tanggalDiterima.toMillis());
      setSuratList(allSurat);
      setCurrentPage(1);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  }, [userProfile, isAdminOrTU, startDate, endDate, isSuperAdmin, selectedOpdId]);

  useEffect(() => {
    if (!authLoading) fetchSurat();
  }, [authLoading, fetchSurat]);

  const filteredSurat = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return suratList.filter(surat =>
        surat.perihal.toLowerCase().includes(searchLower) ||
        surat.nomorSurat.toLowerCase().includes(searchLower) ||
        surat.pengirim.toLowerCase().includes(searchLower)
    );
  }, [suratList, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const totalPages = Math.ceil(filteredSurat.length / itemsPerPage);
  const paginatedSurat = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSurat.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSurat, currentPage, itemsPerPage]);

  const stats: SuratStats = useMemo(() => {
    return filteredSurat.reduce((acc, surat) => {
        acc.total += 1;
        if (surat.statusPenyelesaian === "Selesai") acc.selesai += 1;
        else if (surat.statusPenyelesaian === "Diarsipkan") acc.diarsip += 1;
        else acc.pending += 1;
        return acc;
    }, { total: 0, pending: 0, selesai: 0, diarsip: 0 });
  }, [filteredSurat]);

  // [OPTIMASI FASE 3] Dynamic Import XLSX
  const handleExport = async () => {
    if (filteredSurat.length === 0) { alert("Tidak ada data untuk diekspor."); return; }
    setIsExporting(true);

    try {
      // Dynamic Import: Hanya load pustaka saat tombol diklik
      const XLSX = await import('xlsx');
      
      const dataToExport = filteredSurat.map((surat) => {
        let namaOpd = '';
        if (isSuperAdmin) {
             const opd = opdList.find(o => o.id === surat.opdId);
             namaOpd = opd ? opd.namaOpd : surat.opdId;
        }
        return {
            ...(isSuperAdmin && { "OPD": namaOpd }),
            Perihal: surat.perihal,
            "Nomor Surat": surat.nomorSurat,
            Pengirim: surat.pengirim,
            "Tanggal Diterima": surat.tanggalDiterima.toDate().toLocaleDateString("id-ID"),
            Status: surat.statusPenyelesaian,
            Jenis: surat.jenisSurat || "Lainnya",
            Klasifikasi: surat.klasifikasi,
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Surat");
      
      const opdLabel = isSuperAdmin && selectedOpdId !== 'Semua' 
        ? opdList.find(o => o.id === selectedOpdId)?.namaOpd.replace(/\s+/g, '_') 
        : (isSuperAdmin ? 'SEMUA_OPD' : 'Rekap_Surat');
        
      XLSX.writeFile(wb, `${opdLabel}_${startDate}_sd_${endDate}.xlsx`);

    } catch (err) {
      console.error("Gagal ekspor Excel:", err);
      alert("Gagal memuat modul ekspor atau terjadi kesalahan.");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Selesai': return "secondary"; 
        case 'Diarsipkan': return "outline";
        case 'Baru': return "default"; 
        case 'Revisi Disposisi': return "destructive"; 
        default: return "default";
    }
  };

  if (authLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Memuat...</span></div>;
  if (!isAdminOrTU) return <div className="flex h-full items-center justify-center"><div className="text-center text-red-500 p-4 bg-red-100 rounded-lg"><h2 className="text-lg font-bold">Akses Ditolak</h2></div></div>;

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Rekapitulasi Surat {isSuperAdmin && selectedOpdId === "Semua" ? "(Global)" : ""}</h1>
        <p className="text-muted-foreground">{isSuperAdmin ? "Pantau pergerakan surat di seluruh Perangkat Daerah." : "Pantau dan ekspor data surat masuk di OPD Anda."}</p>
      </div>

      <Card className="shadow-md border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {isSuperAdmin && (
                <div className="lg:col-span-1">
                    <Label htmlFor="opdFilter" className="flex items-center gap-2 mb-1"><Building size={14} /> Filter OPD</Label>
                    <Select value={selectedOpdId} onValueChange={setSelectedOpdId}>
                        <SelectTrigger id="opdFilter"><SelectValue placeholder="Pilih OPD" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Semua" className="font-bold">Semua Perangkat Daerah</SelectItem>
                            {sortedOpdOptions.map((opd) => (<SelectItem key={opd.id} value={opd.id!}>{opd.label}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="lg:col-span-1"><Label htmlFor="startDate">Dari Tanggal</Label><Input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1"/></div>
            <div className="lg:col-span-1"><Label htmlFor="endDate">Sampai Tanggal</Label><Input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1"/></div>
            <div className="relative lg:col-span-1">
              <Label htmlFor="search">Cari</Label>
              <Search size={18} className="absolute left-3 top-[42px] text-muted-foreground pointer-events-none"/>
              <Input type="text" id="search" placeholder="Perihal, nomor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-1 pl-10"/>
            </div>
            <Button onClick={handleExport} className="w-full bg-green-600 hover:bg-green-700 lg:col-span-1" disabled={filteredSurat.length === 0 || loading || isExporting}>
              {isExporting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Download className="h-5 w-5 mr-2" />}
              {isExporting ? "Memproses..." : "Ekspor Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Surat" value={stats.total} icon={<FileText className="h-6 w-6 text-blue-500" />} colorClass="text-blue-500" />
          <StatCard title="Surat Pending" value={stats.pending} icon={<Clock className="h-6 w-6 text-yellow-500" />} colorClass="text-yellow-500" />
          <StatCard title="Surat Selesai" value={stats.selesai} icon={<CheckCircle className="h-6 w-6 text-green-500" />} colorClass="text-green-500" />
          <StatCard title="Surat Diarsip" value={stats.diarsip} icon={<Archive className="h-6 w-6 text-gray-500" />} colorClass="text-gray-500" />
        </div>
      )}

      <Card className="shadow-md border-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Surat</CardTitle>
          <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Baris per halaman:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[70px] h-8"><SelectValue placeholder={itemsPerPage} /></SelectTrigger>
                  <SelectContent>{ITEMS_PER_PAGE_OPTIONS.map(opt => (<SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>))}</SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Memuat...</span></div> : paginatedSurat.length > 0 ? (
              <>
                <Table className="min-w-[600px]">
                    <TableHeader>
                    <TableRow>
                        <TableHead>Perihal</TableHead>
                        {isSuperAdmin && <TableHead>OPD Tujuan</TableHead>}
                        <TableHead>Nomor Surat</TableHead>
                        <TableHead>Pengirim</TableHead>
                        <TableHead>Tgl Diterima</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paginatedSurat.map((surat) => (
                        <TableRow key={surat.id}>
                        <TableCell className="font-medium max-w-xs truncate" title={surat.perihal}>{surat.perihal}</TableCell>
                        {isSuperAdmin && <TableCell>{opdList.find(o => o.id === surat.opdId)?.namaOpd || 'N/A'}</TableCell>}
                        <TableCell>{surat.nomorSurat}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={surat.pengirim}>{surat.pengirim}</TableCell>
                        <TableCell>{surat.tanggalDiterima.toDate().toLocaleDateString("id-ID")}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(surat.statusPenyelesaian)}>{surat.statusPenyelesaian}</Badge></TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-muted/20">
                    <div className="text-sm text-muted-foreground">Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredSurat.length)}</strong> dari <strong>{filteredSurat.length}</strong></div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft size={16} /></Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                        <span className="text-sm font-medium px-2">Hal {currentPage} / {totalPages}</span>
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight size={16} /></Button>
                    </div>
                </div>
              </>
            ) : <p className="text-center p-6 text-muted-foreground">Tidak ada data surat ditemukan.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};