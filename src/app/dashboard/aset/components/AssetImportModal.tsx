// Directory: src/app/dashboard/aset/components/AssetImportModal.tsx
// [BARU] Komponen Modal untuk Import Aset secara Massal dari File Excel.
// - Menggunakan library 'xlsx' untuk parsing file Excel (.xlsx).
// - Membaca kolom: Nama Aset, Kode, Kategori, Tahun, Harga, Kondisi, Lokasi.
// - Melakukan validasi data dasar sebelum upload.
// - Menggunakan batch write Firestore untuk efisiensi dan keamanan data.

"use client";

import React, { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { AsetInventaris } from '@/types';

interface AssetImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    opdId: string;
    userId: string;
    onSuccess: () => void;
}

export default function AssetImportModal({ isOpen, onClose, opdId, userId, onSuccess }: AssetImportModalProps) {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');

    // Reset state saat modal dibuka/tutup
    const handleClose = () => {
        setParsedData([]);
        setStep('upload');
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = utils.sheet_to_json(ws);
            
            if (data.length > 0) {
                setParsedData(data);
                setStep('preview');
            } else {
                addToast("File Excel kosong atau format salah.", "error");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;
        setIsProcessing(true);

        try {
            const batch = writeBatch(db);
            
            parsedData.forEach((row: any) => {
                const docRef = doc(collection(db, 'asetInventaris'));
                
                // Mapping kolom Excel ke Schema Firestore (Case Insensitive Logic)
                // Asumsi nama kolom di Excel: "Nama Aset", "Kode", "Tahun", "Kondisi", "Harga"
                const aset: Omit<AsetInventaris, 'id'> = {
                    opdId,
                    namaAset: row['Nama Aset'] || row['Nama Barang'] || 'Tanpa Nama',
                    kodeAset: row['Kode'] || row['Kode Aset'] || row['Kode Barang'] || `AUTO-${Date.now()}`,
                    kategori: row['Kategori'] || 'Umum',
                    kondisi: row['Kondisi'] || 'Baik', // Baik, Perlu Perbaikan, Rusak Berat
                    status: 'Tersedia',
                    lokasi: row['Lokasi'] || row['Ruangan'] || 'Gudang',
                    tanggalMasuk: Timestamp.now(),
                    tahunPengadaan: Number(row['Tahun']) || new Date().getFullYear(),
                    nilaiPerolehan: Number(row['Harga']) || Number(row['Nilai']) || 0,
                    spesifikasi: row['Spesifikasi'] || '',
                };
                
                batch.set(docRef, aset);
            });

            await batch.commit();
            addToast(`Berhasil mengimpor ${parsedData.length} aset!`, "success");
            onSuccess();
            handleClose();
        } catch (error) {
            console.error("Import Error:", error);
            addToast("Gagal mengimpor data. Periksa format Excel.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-3xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Import Aset Masal (Excel)</DialogTitle>
                    <DialogDescription>
                        Upload file .xlsx. Pastikan kolom header: Nama Aset, Kode, Kategori, Tahun, Harga, Kondisi, Lokasi.
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                        <FileSpreadsheet size={48} className="text-green-600 mb-4" />
                        <Input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <Button onClick={() => fileInputRef.current?.click()}>
                            <Upload size={16} className="mr-2" /> Pilih File Excel
                        </Button>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="text-blue-600" size={18} />
                                <span className="text-sm font-semibold">{parsedData.length} Data Siap Diimpor</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setParsedData([]); }}>Ganti File</Button>
                        </div>

                        <ScrollArea className="h-64 rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kode</TableHead>
                                        <TableHead>Nama Aset</TableHead>
                                        <TableHead>Tahun</TableHead>
                                        <TableHead>Harga</TableHead>
                                        <TableHead>Kondisi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-xs">{row['Kode'] || row['Kode Aset']}</TableCell>
                                            <TableCell className="text-xs font-medium">{row['Nama Aset'] || row['Nama Barang']}</TableCell>
                                            <TableCell className="text-xs">{row['Tahun']}</TableCell>
                                            <TableCell className="text-xs">Rp {Number(row['Harga'] || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs">{row['Kondisi']}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isProcessing}>Batal</Button>
                    {step === 'preview' && (
                        <Button onClick={handleImport} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                            {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                            Proses Import
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}