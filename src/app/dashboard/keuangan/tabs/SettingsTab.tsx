// Directory: src/app/dashboard/keuangan/tabs/SettingsTab.tsx
// [FIX] Memperbaiki UX Upload PDF
// - Mengubah strategi loading script PDF.js ke 'afterInteractive' (lebih cepat).
// - Menambahkan indikator visual 'Menyiapkan Mesin PDF' di area dropzone.
// - Membungkus FileReader dalam Promise untuk error handling yang lebih baik.

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { KeuanganRekening, UserProfile } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Loader2, FileSpreadsheet, Upload, CheckCircle, AlertTriangle, ArrowRight, FileText, Sparkles, CloudCog } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { read, utils } from 'xlsx'; 
import Script from 'next/script'; 

// Definisi tipe window untuk PDF.js
declare global {
    interface Window {
        pdfjsLib: any;
    }
}

// --- MODAL IMPORT CERDAS (EXCEL & PDF) ---
const ImportModal = ({ 
    isOpen, 
    onClose, 
    opdId,
    onSuccess 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    opdId: string,
    onSuccess: () => void 
}) => {
    const { addToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    
    // State Mapping Kolom
    const [mapKode, setMapKode] = useState('');
    const [mapUraian, setMapUraian] = useState('');
    const [mapAnggaran, setMapAnggaran] = useState('');
    
    const [step, setStep] = useState<1 | 2>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPdfJsReady, setIsPdfJsReady] = useState(false); // State PDF.js
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

    // Cek ketersediaan PDF.js saat modal dibuka
    useEffect(() => {
        if (isOpen) {
            // Reset state
            setFile(null);
            setHeaders([]);
            setPreviewData([]);
            setExcelData([]);
            setMapKode('');
            setMapUraian('');
            setMapAnggaran('');
            setStep(1);
            setIsProcessing(false);
            setIsAiAnalyzing(false);

            // Cek ulang apakah library sudah siap di window
            if (window.pdfjsLib) {
                setIsPdfJsReady(true);
            }
        }
    }, [isOpen]);

    // --- FUNGSI PROSES PDF (AI) ---
    const processPdfWithAi = async (fileToProcess: File) => {
        // Double check
        if (!isPdfJsReady || !window.pdfjsLib) {
            addToast("Sistem PDF belum siap sepenuhnya. Silakan coba sesaat lagi.", "info");
            return;
        }

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) {
            addToast("API Key AI tidak ditemukan.", "error");
            return;
        }

        setIsAiAnalyzing(true); // Mulai indikator loading

        try {
            // Bungkus FileReader dalam Promise agar kita bisa await
            const base64Image = await new Promise<string>((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.readAsArrayBuffer(fileToProcess);
                
                fileReader.onload = async (event) => {
                    try {
                        if (!event.target?.result) throw new Error("Gagal membaca file buffer");

                        const pdfjsLib = window.pdfjsLib;
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
                        
                        const pdf = await pdfjsLib.getDocument(event.target.result).promise;
                        const page = await pdf.getPage(1); // Ambil halaman 1
                        const viewport = page.getViewport({ scale: 2.0 }); 
                        
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        if (!context) throw new Error("Gagal render canvas");

                        await page.render({ canvasContext: context, viewport }).promise;
                        const base64 = canvas.toDataURL('image/png').split(',')[1];
                        resolve(base64);
                    } catch (err) {
                        reject(err);
                    }
                };
                fileReader.onerror = (e) => reject(e);
            });

            // 2. Kirim ke Gemini AI
            const prompt = `
                Analisis gambar dokumen anggaran (RKA/DPA) ini.
                Ekstrak data tabel menjadi array JSON.
                Ambil kolom: "Kode Rekening", "Uraian", dan "Jumlah/Pagu Anggaran".
                
                Abaikan baris header, tanda tangan, atau total. Ambil baris item saja.
                Format JSON yang diharapkan:
                [
                    { "kode": "5.1.02...", "uraian": "Belanja ATK", "anggaran": 1500000 },
                    ...
                ]
                Pastikan 'anggaran' adalah number (hilangkan Rp dan titik).
                Kembalikan HANYA JSON Array murni tanpa markdown.
            `;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inlineData: { mimeType: "image/png", data: base64Image } }
                            ]
                        }]
                    })
                }
            );

            const result = await response.json();
            const textRes = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (textRes) {
                // Bersihkan format JSON
                const jsonStr = textRes.replace(/```json|```/g, '').trim();
                const parsedData = JSON.parse(jsonStr);

                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    setExcelData(parsedData);
                    setPreviewData(parsedData.slice(0, 5));
                    
                    // Fake Headers agar sesuai logika Excel
                    const aiHeaders = ['kode', 'uraian', 'anggaran'];
                    setHeaders(aiHeaders);
                    
                    // Auto Map
                    setMapKode('kode');
                    setMapUraian('uraian');
                    setMapAnggaran('anggaran');
                    
                    addToast(`AI berhasil mengekstrak ${parsedData.length} baris data!`, "success");
                    setStep(2);
                } else {
                    throw new Error("AI tidak menemukan data tabel yang valid.");
                }
            }
        } catch (err: any) {
            console.error("AI Processing Error:", err);
            addToast(`Gagal memproses PDF: ${err.message || "Terjadi kesalahan"}`, "error");
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    // Fungsi Utama Handle File
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);

            if (selectedFile.type === 'application/pdf') {
                // Proses PDF dengan AI
                await processPdfWithAi(selectedFile);
            } else {
                // Proses Excel (Logika Lama)
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const bstr = evt.target?.result;
                    const wb = read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const rawData = utils.sheet_to_json(ws, { header: 1 });
                    
                    if (rawData.length > 0) {
                        const headerRow = rawData[0] as string[];
                        setHeaders(headerRow);
                        const jsonData = utils.sheet_to_json(ws);
                        setExcelData(jsonData);
                        setPreviewData(jsonData.slice(0, 5));
                        
                        // Auto-Detect
                        headerRow.forEach((h, idx) => {
                            const lowerH = String(h).toLowerCase();
                            if (lowerH.includes('kode') || lowerH.includes('rekening') || lowerH.includes('mak')) setMapKode(h);
                            if (lowerH.includes('uraian') || lowerH.includes('nama') || lowerH.includes('kegiatan')) setMapUraian(h);
                            if (lowerH.includes('pagu') || lowerH.includes('anggaran') || lowerH.includes('jumlah') || lowerH.includes('total')) setMapAnggaran(h);
                        });
                        setStep(2);
                    }
                };
                reader.readAsBinaryString(selectedFile);
            }
        }
    };

    const handleImport = async () => {
        if (!opdId || !mapKode || !mapUraian) return;
        setIsProcessing(true);

        try {
            const batch = writeBatch(db);
            let count = 0;
            const batchLimit = 450; 

            const validRows = excelData.filter(row => row[mapKode] && row[mapUraian]);

            for (const row of validRows) {
                const kode = String(row[mapKode]).trim();
                const nama = String(row[mapUraian]).trim();
                let anggaranRaw = row[mapAnggaran];
                let anggaran = 0;
                
                if (typeof anggaranRaw === 'number') {
                    anggaran = anggaranRaw;
                } else if (typeof anggaranRaw === 'string') {
                    const cleanStr = anggaranRaw.replace(/[^0-9,\-]/g, '').replace(/,/g, '.'); 
                    anggaran = parseFloat(cleanStr) || 0;
                }

                if (kode.toLowerCase() === 'kode' || nama.toLowerCase() === 'uraian') continue;

                const docRef = doc(collection(db, 'keuangan_rekening'));
                batch.set(docRef, {
                    opdId,
                    kode,
                    nama,
                    anggaran,
                    createdAt: Timestamp.now()
                });
                count++;
                if (count % batchLimit === 0) await batch.commit();
            }

            if (count % batchLimit !== 0) await batch.commit();

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Import error:", error);
            alert("Gagal mengimpor data.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600" size={24} />
                        Import Data Anggaran (Excel / PDF)
                    </DialogTitle>
                    <DialogDescription>
                        Upload file Excel (.xlsx) atau PDF (RKA/DPA). AI akan otomatis membaca tabel dari PDF.
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30 transition-colors hover:bg-muted/50">
                        
                        {/* INDIKATOR VISUAL STATUS PDF.JS */}
                        {!isPdfJsReady ? (
                             <div className="flex flex-col items-center animate-pulse py-4">
                                <CloudCog size={48} className="text-muted-foreground mb-2" />
                                <p className="text-sm font-semibold text-muted-foreground">Menyiapkan Mesin Pembaca PDF...</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Mohon tunggu sebentar sebelum mengupload PDF.</p>
                            </div>
                        ) : isAiAnalyzing ? (
                            <div className="flex flex-col items-center animate-pulse py-4">
                                <Sparkles size={48} className="text-purple-500 mb-4 animate-spin" />
                                <p className="text-sm font-semibold text-purple-600">AI sedang membaca dokumen PDF...</p>
                                <p className="text-xs text-muted-foreground mt-1">Mohon tunggu, sedang mengekstrak tabel (estimasi 5-10 detik).</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-4 mb-4">
                                    <FileSpreadsheet size={32} className="text-green-600" />
                                    <FileText size={32} className="text-red-500" />
                                </div>
                                <Label 
                                    htmlFor="file-upload" 
                                    className={`cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium flex items-center gap-2 shadow-sm ${!isPdfJsReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Upload size={16} /> Pilih File (Excel / PDF)
                                </Label>
                                <Input 
                                    id="file-upload" 
                                    type="file" 
                                    accept=".xlsx, .xls, .pdf" 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                    disabled={!isPdfJsReady} // Disable jika belum siap
                                />
                                <p className="text-xs text-muted-foreground mt-3 text-center max-w-xs">
                                    Mendukung file RKA/DPA. <br/> Untuk PDF, AI akan membaca halaman pertama sebagai sampel struktur.
                                </p>
                            </>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        {file?.type === 'application/pdf' && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800 flex items-start gap-3">
                                <Sparkles className="text-purple-600 mt-0.5 shrink-0" size={18}/>
                                <div>
                                    <p className="text-xs font-bold text-purple-800 dark:text-purple-300">Hasil Analisis AI</p>
                                    <p className="text-xs text-purple-700 dark:text-purple-400">
                                        Data di bawah diekstrak otomatis dari PDF. Pastikan kolom sudah sesuai sebelum menyimpan.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Kolom Kode <span className="text-red-500">*</span></Label>
                                <Select value={mapKode} onValueChange={setMapKode}>
                                    <SelectTrigger className="h-8"><SelectValue placeholder="Pilih" /></SelectTrigger>
                                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Kolom Uraian <span className="text-red-500">*</span></Label>
                                <Select value={mapUraian} onValueChange={setMapUraian}>
                                    <SelectTrigger className="h-8"><SelectValue placeholder="Pilih" /></SelectTrigger>
                                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Kolom Pagu</Label>
                                <Select value={mapAnggaran} onValueChange={setMapAnggaran}>
                                    <SelectTrigger className="h-8"><SelectValue placeholder="Pilih" /></SelectTrigger>
                                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                            <div className="bg-muted px-3 py-2 text-xs font-semibold border-b">Preview Data (5 Baris Pertama)</div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-card hover:bg-card">
                                        <TableHead className="h-8 text-xs">Kode</TableHead>
                                        <TableHead className="h-8 text-xs">Uraian</TableHead>
                                        <TableHead className="h-8 text-xs text-right">Anggaran</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.map((row, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50">
                                            <TableCell className="py-2 text-xs font-mono">{row[mapKode] || '-'}</TableCell>
                                            <TableCell className="py-2 text-xs">{row[mapUraian] || '-'}</TableCell>
                                            <TableCell className="py-2 text-xs text-right">{row[mapAnggaran] ? row[mapAnggaran].toLocaleString() : '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 2 && (
                        <Button variant="ghost" onClick={() => { setStep(1); setFile(null); }}>
                            Ulangi Upload
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    {step === 2 && (
                        <Button onClick={handleImport} disabled={!mapKode || !mapUraian || isProcessing} className="bg-green-600 hover:bg-green-700">
                            {isProcessing ? <Loader2 className="mr-2 animate-spin" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                            Mulai Import
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function SettingsTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    const [rekeningList, setRekeningList] = useState<KeuanganRekening[]>([]);
    const [kode, setKode] = useState('');
    const [nama, setNama] = useState('');
    const [anggaran, setAnggaran] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!userProfile.opdId) return;
        const q = query(collection(db, 'keuangan_rekening'), where('opdId', '==', userProfile.opdId));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as KeuanganRekening));
            list.sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
            setRekeningList(list);
        });
        return () => unsub();
    }, [userProfile.opdId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kode || !nama) return;
        setIsProcessing(true);
        try {
            await addDoc(collection(db, 'keuangan_rekening'), {
                opdId: userProfile.opdId,
                kode,
                nama,
                anggaran: Number(anggaran) || 0,
                createdAt: Timestamp.now()
            });
            setKode(''); setNama(''); setAnggaran('');
            addToast("Rekening berhasil ditambahkan.", "success");
        } catch (error) {
            addToast("Gagal menambah rekening.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Hapus rekening ini?")) return;
        try {
            await deleteDoc(doc(db, 'keuangan_rekening', id));
            addToast("Rekening dihapus.", "success");
        } catch (error) {
            addToast("Gagal menghapus.", "error");
        }
    };

    const handleImportSuccess = () => {
        addToast("Import Data Berhasil!", "success");
        setIsImportModalOpen(false);
    };

    const filteredList = rekeningList.filter(r => 
        r.kode.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.nama.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAnggaran = rekeningList.reduce((sum, r) => sum + (r.anggaran || 0), 0);

    return (
        <div className="space-y-6">
             {/* [PERBAIKAN] Menggunakan strategi 'afterInteractive' agar lebih cepat */}
             <Script
                src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"
                strategy="afterInteractive"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form Input Manual */}
                <Card className="md:col-span-1 h-fit border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Tambah Manual</CardTitle>
                        <CardDescription>Input satu per satu</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <Label>Kode Rekening (MAK)</Label>
                                <Input value={kode} onChange={e => setKode(e.target.value)} placeholder="Contoh: 5.1.02.01.01" required />
                            </div>
                            <div>
                                <Label>Uraian Rekening</Label>
                                <Input value={nama} onChange={e => setNama(e.target.value)} placeholder="Belanja Alat Tulis Kantor" required />
                            </div>
                            <div>
                                <Label>Pagu Anggaran (Rp)</Label>
                                <Input type="number" value={anggaran} onChange={e => setAnggaran(e.target.value)} placeholder="0" />
                            </div>
                            <Button type="submit" className="w-full" disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 animate-spin"/> : <Plus className="mr-2"/>} Tambah
                            </Button>
                            
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ATAU</span></div>
                            </div>

                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                                onClick={() => setIsImportModalOpen(true)}
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Import (Excel / PDF)
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Tabel Daftar */}
                <Card className="md:col-span-2 border-border shadow-sm flex flex-col h-full">
                    <CardHeader className="border-b flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg">Daftar Rekening Anggaran</CardTitle>
                            <CardDescription>Total Pagu: <strong>Rp {totalAnggaran.toLocaleString('id-ID')}</strong></CardDescription>
                        </div>
                        <div className="w-1/3">
                             <Input 
                                placeholder="Cari kode / uraian..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-8"
                             />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <div className="h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead>Kode</TableHead>
                                        <TableHead>Uraian</TableHead>
                                        <TableHead className="text-right">Pagu Anggaran</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rekeningList.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Belum ada data rekening.</TableCell></TableRow>
                                    ) : filteredList.length === 0 ? (
                                         <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Tidak ditemukan.</TableCell></TableRow>
                                    ) : (
                                        filteredList.map(r => (
                                            <TableRow key={r.id} className="hover:bg-muted/50">
                                                <TableCell className="font-mono text-xs font-medium">{r.kode}</TableCell>
                                                <TableCell className="text-sm">{r.nama}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">Rp {(r.anggaran || 0).toLocaleString('id-ID')}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id!)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                                                        <Trash2 size={14}/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                opdId={userProfile.opdId}
                onSuccess={handleImportSuccess}
            />
        </div>
    );
}