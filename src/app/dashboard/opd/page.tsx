/**
 * Directory: src/app/dashboard/opd/page.tsx
 * History Updates:
 * - 2024-11-20: Refactoring menggunakan `useMasterData` (SSOT).
 * - Menambahkan tampilan ID untuk debugging relasi Induk-Sub.
 */

"use client";

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { OPD } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData'; 
import { Save, FilePenLine, Archive, ArchiveRestore, Loader2, Copy } from 'lucide-react'; // [UPDATE] Import Copy
import ConfirmModal from '@/app/dashboard/components/ConfirmModal';
import { useToast } from '@/context/ToastContext'; // [UPDATE] Import Toast

// --- Impor Komponen Shadcn ---
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function ManajemenOpdPage() {
  const { userProfile, loading: authLoading } = useUserAuth();
  const { addToast } = useToast();
  
  // --- DATA FETCHING (SSOT) ---
  const { opdList, isLoading: isMasterLoading } = useMasterData(true);
  
  // --- STATE ---
  const [namaOpd, setNamaOpd] = useState('');
  const [alamat, setAlamat] = useState('');
  const [tipeOpd, setTipeOpd] = useState<'Induk' | 'Sub-OPD'>('Induk');
  const [selectedInduk, setSelectedInduk] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentOpd, setCurrentOpd] = useState<OPD | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); 

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isProcessing?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // COMPUTED LISTS
  const opdIndukList = useMemo(() => opdList.filter(opd => opd.tipe === 'Induk' && opd.status === 'aktif'), [opdList]);
  
  const visibleOpdList = useMemo(() => {
    // 1. Ambil semua induk, urutkan nama
    const sortedInduk = opdList
        .filter(opd => opd.tipe === 'Induk')
        .sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));

    const sortedList: OPD[] = [];
    
    // 2. Loop induk, masukkan induk lalu masukkan anak-anaknya tepat di bawahnya
    sortedInduk.forEach(induk => {
        sortedList.push(induk);
        const subOpd = opdList
            .filter(opd => opd.idOpdInduk === induk.id)
            .sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
        sortedList.push(...subOpd);
    });
    
    // 3. Tangani 'Yatim Piatu' (Sub OPD yang induknya tidak ketemu/terhapus, atau Induk baru)
    const processedIds = new Set(sortedList.map(o => o.id));
    opdList.forEach(o => { if (!processedIds.has(o.id)) sortedList.push(o); });

    return sortedList.filter(opd => showArchived ? opd.status === 'nonaktif' : opd.status !== 'nonaktif');
  }, [opdList, showArchived]);

  // HANDLERS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!namaOpd || !alamat) { setError("Nama OPD dan Alamat tidak boleh kosong."); return; }
    if (tipeOpd === 'Sub-OPD' && !selectedInduk) { setError("Pilih OPD Induk untuk Sub-OPD."); return; }
    
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "opd"), { 
        namaOpd, alamat, tipe: tipeOpd, 
        idOpdInduk: tipeOpd === 'Induk' ? null : selectedInduk,
        status: 'aktif'
      });
      setNamaOpd(''); setAlamat(''); setTipeOpd('Induk'); setSelectedInduk(null);
      addToast("OPD berhasil ditambahkan", "success");
    } catch (err) {
      setError("Gagal menambahkan OPD baru.");
      console.error(err);
    } finally { setIsProcessing(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOpd || !currentOpd.id) return;
    setIsProcessing(true);
    try {
      const opdRef = doc(db, "opd", currentOpd.id);
      await updateDoc(opdRef, {
        namaOpd: currentOpd.namaOpd,
        alamat: currentOpd.alamat,
        tipe: currentOpd.tipe,
        idOpdInduk: currentOpd.tipe === 'Induk' ? null : currentOpd.idOpdInduk,
      });
      setIsEditModalOpen(false);
      setCurrentOpd(null);
      addToast("Data OPD diperbarui", "success");
    } catch (err) {
      setError("Gagal memperbarui OPD.");
    } finally { setIsProcessing(false); }
  };
  
  const handleToggleArchive = async (opdToToggle: OPD) => {
    const { id, status } = opdToToggle;
    if (!id) return;
    const newStatus = status === 'aktif' ? 'nonaktif' : 'aktif';
    const action = newStatus === 'nonaktif' ? 'mengarsipkan' : 'mengaktifkan kembali';
    setConfirmModal({
        isOpen: true, title: `Konfirmasi ${action}`, message: `Apakah Anda yakin ingin ${action} OPD ini?`,
        onConfirm: async () => {
            setConfirmModal(prev => ({ ...prev, isProcessing: true }));
            try { await updateDoc(doc(db, "opd", id), { status: newStatus }); addToast(`OPD berhasil di${newStatus === 'aktif' ? 'aktifkan' : 'arsipkan'}`, "success"); } 
            catch (err) { setError(`Gagal ${action} OPD.`); } 
            finally { setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, isProcessing: false }); }
        }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast("ID disalin ke clipboard", "info");
  };

  if (authLoading) return <div className="text-center p-8 text-muted-foreground">Memeriksa otorisasi...</div>;
  if (userProfile?.role !== 'super_admin' && userProfile?.role !== 'admin_opd') return <div className="p-6 text-center text-red-700 bg-red-100 rounded-lg">Akses ditolak. Hanya Admin yang boleh mengakses halaman ini.</div>;

  return (
    <div className="animate-fadeInUp pb-20">
      <h1 className="text-3xl font-bold text-foreground">Manajemen OPD & Struktur Wilayah</h1>
      <p className="text-muted-foreground mt-2">Kelola data Kecamatan (Induk) dan Kelurahan (Sub-OPD) di sini agar muncul di fitur SKW.</p>
      
      <div className="p-6 mt-6 bg-card rounded-xl shadow-md border border-border">
        <h2 className="text-xl font-semibold text-foreground">Tambah Unit Kerja Baru</h2>
        {error && <Alert variant="destructive" className="my-4"><AlertDescription>{error}</AlertDescription></Alert>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nama Unit / OPD</Label><Input value={namaOpd} onChange={e => setNamaOpd(e.target.value)} placeholder="Contoh: Kelurahan Banjarsari" required /></div>
            <div><Label>Alamat Kantor</Label><Input value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jl. Jendral Sudirman No..." required /></div>
            <div>
                <Label>Tipe Unit</Label>
                <Select value={tipeOpd} onValueChange={e => setTipeOpd(e as 'Induk' | 'Sub-OPD')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Induk">🏢 Induk (Kecamatan/Dinas)</SelectItem>
                        <SelectItem value="Sub-OPD">🏠 Sub-OPD (Kelurahan/UPT)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {tipeOpd === 'Sub-OPD' && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <Label className="text-blue-900">Induk Unit (Atasan)</Label>
                <Select value={selectedInduk || ''} onValueChange={e => setSelectedInduk(e)}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih Unit Induk --" /></SelectTrigger>
                    <SelectContent>
                        {opdIndukList.map(opd => (
                            <SelectItem key={opd.id} value={opd.id!}>
                                {opd.namaOpd} <span className="text-xs text-muted-foreground ml-2">({opd.id})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-blue-700 mt-1">Pastikan memilih Kecamatan yang benar agar data terhubung.</p>
              </div>
            )}
          </div>
          <Button type="submit" disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Unit Kerja
          </Button>
        </form>
      </div>
      
      <div className="mt-8 bg-card rounded-xl shadow-md border border-border">
        <div className="p-6 flex justify-between items-center border-b border-border">
            <div>
                <h2 className="text-xl font-semibold text-foreground">Struktur Organisasi</h2>
                <p className="text-xs text-muted-foreground">Menampilkan hierarki Induk dan Sub-Unit</p>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="showArchived" checked={showArchived} onCheckedChange={() => setShowArchived(!showArchived)} />
                <Label htmlFor="showArchived" className="text-sm font-medium cursor-pointer">Tampilkan Arsip (Non-Aktif)</Label>
            </div>
        </div>
        <div className="p-0 overflow-x-auto">
          {isMasterLoading ? <p className="text-center p-8 text-muted-foreground"><Loader2 className="animate-spin inline mr-2"/>Memuat struktur...</p> : (
            <table className="w-full text-left">
              <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                      <th className="p-3 pl-6 font-medium text-muted-foreground">Nama Unit Kerja</th>
                      <th className="p-3 font-medium text-muted-foreground">ID Sistem</th>
                      <th className="p-3 font-medium text-muted-foreground">Tipe</th>
                      <th className="p-3 font-medium text-muted-foreground">Induk</th>
                      <th className="p-3 font-medium text-muted-foreground text-center">Aksi</th>
                  </tr>
              </thead>
              <tbody>
                {visibleOpdList.map(opd => (
                  <tr key={opd.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className={`p-3 ${opd.tipe === 'Sub-OPD' ? 'pl-8' : 'pl-6 font-bold'}`}>
                        <div className="flex flex-col">
                            <span>{opd.tipe === 'Sub-OPD' ? '↳ ' : '🏢 '}{opd.namaOpd}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{opd.alamat}</span>
                        </div>
                    </td>
                    <td className="p-3">
                        <Badge variant="outline" className="font-mono text-[10px] cursor-pointer hover:bg-muted" onClick={() => copyToClipboard(opd.id || '')}>
                            {opd.id} <Copy size={10} className="ml-1"/>
                        </Badge>
                    </td>
                    <td className="p-3">
                        <Badge variant={opd.tipe === 'Induk' ? 'default' : 'secondary'}>{opd.tipe}</Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                        {opd.idOpdInduk ? (
                            <span className="flex items-center gap-1">
                                🏢 {opdList.find(i => i.id === opd.idOpdInduk)?.namaOpd || 'Unknown'}
                            </span>
                        ) : '-'}
                    </td>
                    <td className="flex items-center justify-center p-3 space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentOpd(opd); setIsEditModalOpen(true); }}><FilePenLine size={16} className="text-yellow-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleArchive(opd)}>{opd.status === 'aktif' ? <Archive size={16} className="text-red-600" /> : <ArchiveRestore size={16} className="text-green-600" />}</Button>
                    </td>
                  </tr>
                ))}
                {visibleOpdList.length === 0 && (
                    <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Belum ada data OPD. Silakan tambah baru.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Modal Edit */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader><DialogTitle>Edit Unit Kerja</DialogTitle></DialogHeader>
            {currentOpd && (
                <form onSubmit={handleUpdate} className="mt-4 space-y-4">
                    <div><Label>Nama Unit</Label><Input value={currentOpd.namaOpd} onChange={e => setCurrentOpd({ ...currentOpd, namaOpd: e.target.value })} required/></div>
                    <div><Label>Alamat</Label><Input value={currentOpd.alamat} onChange={e => setCurrentOpd({ ...currentOpd, alamat: e.target.value })} required/></div>
                    {/* Tipe dan Induk biasanya tidak diedit sembarangan karena merusak struktur, jadi disembunyikan di edit simpel */}
                    <DialogFooter><Button type="submit" disabled={isProcessing}>{isProcessing && <Loader2 className="mr-2 animate-spin"/>}Simpan Perubahan</Button></DialogFooter>
                </form>
            )}
        </DialogContent>
      </Dialog>

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} isProcessing={confirmModal.isProcessing} />
    </div>
  );
}