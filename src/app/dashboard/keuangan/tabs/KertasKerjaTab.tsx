// Directory: src/app/dashboard/keuangan/tabs/KertasKerjaTab.tsx
// [UPDATE] Menambahkan input 'Kategori' dan fitur 'Import Kolom dari Excel'.

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { UserProfile, KertasKerja, KertasKerjaRow, KertasKerjaColumn, KertasKerjaColumnType } from '@/types';
import { 
    Plus, Trash2, Save, Loader2, FileSpreadsheet, Link as LinkIcon, 
    ExternalLink, Table as TableIcon, ArrowLeft, MoreVertical, Upload, FileInput 
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { read, utils } from 'xlsx'; // Pastikan 'xlsx' terinstall

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// --- MODAL BUAT KERTAS KERJA BARU ---
const CreateWorksheetModal = ({ isOpen, onClose, opdId, userId, onSuccess }: any) => {
    const { addToast } = useToast();
    
    const [judul, setJudul] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [kategori, setKategori] = useState(''); // [BARU] State kategori
    const [tipe, setTipe] = useState<'manual' | 'link'>('manual');
    const [url, setUrl] = useState('');
    
    const excelInputRef = useRef<HTMLInputElement>(null);
    
    // State untuk Kolom Dinamis
    const [columns, setColumns] = useState<KertasKerjaColumn[]>([
        { id: 'col_1', label: 'Uraian', type: 'text' }
    ]);
    
    const [isProcessing, setIsProcessing] = useState(false);

    const addColumn = () => {
        const newId = `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setColumns([...columns, { id: newId, label: '', type: 'text' }]);
    };

    const removeColumn = (index: number) => {
        const newCols = [...columns];
        newCols.splice(index, 1);
        setColumns(newCols);
    };

    const updateColumn = (index: number, field: keyof KertasKerjaColumn, value: string) => {
        const newCols = [...columns];
        newCols[index] = { ...newCols[index], [field]: value };
        setColumns(newCols);
    };

    // [BARU] Fungsi Import Header Excel
    const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = utils.sheet_to_json(ws, { header: 1 });
            
            if (data && data.length > 0) {
                const headers = data[0] as string[];
                // Konversi header menjadi kolom aplikasi
                const newCols: KertasKerjaColumn[] = headers.map((h, i) => ({
                    id: `col_import_${i}_${Date.now()}`,
                    label: h,
                    type: 'text' // Default tipe text, user bisa ubah nanti
                }));
                
                setColumns(newCols);
                addToast("Header berhasil diimpor dari Excel!", "success");
            }
        };
        reader.readAsBinaryString(file);
        
        // Reset input agar bisa pilih file yang sama lagi
        if (excelInputRef.current) excelInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!judul) {
            addToast("Judul wajib diisi", "error");
            return;
        }
        if (tipe === 'link' && !url) {
             addToast("URL wajib diisi untuk tipe link", "error");
             return;
        }
        if (tipe === 'manual' && columns.some(c => !c.label)) {
            addToast("Semua label kolom harus diisi.", "error");
            return;
        }

        setIsProcessing(true);
        try {
            const payload: Omit<KertasKerja, 'id'> = {
                opdId,
                judul,
                deskripsi,
                kategori: kategori || 'Umum', // Default kategori Umum
                tipe,
                createdBy: userId,
                createdAt: Timestamp.now(),
                ...(tipe === 'link' ? { urlEksternal: url } : { kolom: columns })
            };

            await addDoc(collection(db, 'keuangan_kertas_kerja'), payload);
            addToast("Kertas kerja berhasil dibuat", "success");
            onSuccess();
            onClose();
            
            // Reset
            setJudul(''); setDeskripsi(''); setKategori(''); setTipe('manual'); setUrl(''); 
            setColumns([{ id: 'col_1', label: 'Uraian', type: 'text' }]);
        } catch (e) {
            console.error(e);
            addToast("Gagal menyimpan kertas kerja", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Buat Kertas Kerja Baru</DialogTitle>
                    <DialogDescription>Buat tabel kustom atau sematkan link spreadsheet.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <Label>Judul Tugas / Kertas Kerja</Label>
                        <Input value={judul} onChange={e => setJudul(e.target.value)} placeholder="Contoh: Rekapitulasi SP2D Gaji" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Kategori</Label>
                            <Input 
                                value={kategori} 
                                onChange={e => setKategori(e.target.value)} 
                                placeholder="Misal: Gaji / Aset / Rutin" 
                                list="kategori-list"
                            />
                            <datalist id="kategori-list">
                                <option value="Gaji & Tunjangan" />
                                <option value="Barang & Jasa" />
                                <option value="Aset Daerah" />
                                <option value="Laporan Bulanan" />
                            </datalist>
                        </div>
                        <div>
                            <Label>Tipe Kertas Kerja</Label>
                            <Select value={tipe} onValueChange={(v: any) => setTipe(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Tabel Manual (Database)</SelectItem>
                                    <SelectItem value="link">Tautan Spreadsheet Eksternal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label>Deskripsi (Opsional)</Label>
                        <Input value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder="Keterangan tambahan..." />
                    </div>

                    {tipe === 'link' ? (
                        <div>
                            <Label>URL Spreadsheet (Google Sheets / Excel Online)</Label>
                            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                        </div>
                    ) : (
                        <div className="border rounded-md p-3 bg-muted/30">
                            <div className="flex justify-between items-center mb-2">
                                <Label className="font-bold">Konfigurasi Kolom Tabel</Label>
                                
                                {/* [BARU] Tombol Import Excel */}
                                <div className="flex gap-2">
                                    <Input 
                                        type="file" 
                                        ref={excelInputRef}
                                        className="hidden" 
                                        accept=".xlsx, .xls"
                                        onChange={handleExcelImport}
                                    />
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-7 text-xs bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                                        onClick={() => excelInputRef.current?.click()}
                                    >
                                        <FileSpreadsheet size={12} className="mr-1"/> Import Header Excel
                                    </Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="h-48 pr-2">
                                {columns.map((col, idx) => (
                                    <div key={col.id} className="flex gap-2 mb-2 items-center">
                                        <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                                        <Input 
                                            value={col.label} 
                                            onChange={e => updateColumn(idx, 'label', e.target.value)} 
                                            placeholder="Nama Kolom" 
                                            className="h-8 text-sm flex-1"
                                        />
                                        <Select value={col.type} onValueChange={v => updateColumn(idx, 'type', v)}>
                                            <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Teks</SelectItem>
                                                <SelectItem value="number">Angka</SelectItem>
                                                <SelectItem value="currency">Rupiah</SelectItem>
                                                <SelectItem value="date">Tanggal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeColumn(idx)} disabled={columns.length === 1}>
                                            <Trash2 size={14}/>
                                        </Button>
                                    </div>
                                ))}
                            </ScrollArea>
                            
                            <Button variant="outline" size="sm" onClick={addColumn} className="w-full mt-2 border-dashed">
                                <Plus size={14} className="mr-2"/> Tambah Kolom Manual
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin"/> : 'Simpan'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- KOMPONEN DETAIL KERTAS KERJA (MANUAL) ---
const ManualWorksheetView = ({ worksheet, onBack }: { worksheet: KertasKerja, onBack: () => void }) => {
    const [rows, setRows] = useState<KertasKerjaRow[]>([]);
    const [newRowData, setNewRowData] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'keuangan_kertas_kerja_rows'), 
            where('kertasKerjaId', '==', worksheet.id),
            orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as KertasKerjaRow)));
            setLoading(false);
        });
        return () => unsub();
    }, [worksheet.id]);

    const handleAddRow = async () => {
        if (!worksheet.id) return;
        try {
            await addDoc(collection(db, 'keuangan_kertas_kerja_rows'), {
                kertasKerjaId: worksheet.id,
                data: newRowData,
                createdAt: Timestamp.now()
            });
            setNewRowData({});
        } catch (e) {
            console.error(e);
            alert("Gagal menambah data.");
        }
    };

    const handleDeleteRow = async (id: string) => {
        if (confirm("Hapus baris ini?")) {
            await deleteDoc(doc(db, 'keuangan_kertas_kerja_rows', id));
        }
    };

    const handleInputChange = (colId: string, value: string) => {
        setNewRowData((prev: any) => ({ ...prev, [colId]: value }));
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={onBack} className="p-0 hover:bg-transparent h-auto mr-2">
                        <ArrowLeft className="mr-1 h-4 w-4"/> Kembali
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {worksheet.judul}
                            {worksheet.kategori && <Badge variant="secondary" className="text-xs font-normal">{worksheet.kategori}</Badge>}
                        </h2>
                        <p className="text-sm text-muted-foreground">{worksheet.deskripsi}</p>
                    </div>
                </div>
            </div>

            <Card className="border-border shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12 text-center">No</TableHead>
                                {worksheet.kolom?.map(col => (
                                    <TableHead key={col.id}>{col.label}</TableHead>
                                ))}
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, idx) => (
                                <TableRow key={row.id}>
                                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                                    {worksheet.kolom?.map(col => (
                                        <TableCell key={col.id}>
                                            {col.type === 'currency' 
                                                ? `Rp ${Number(row.data[col.id] || 0).toLocaleString('id-ID')}`
                                                : row.data[col.id]}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteRow(row.id!)}>
                                            <Trash2 size={14}/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* Baris Input Baru */}
                            <TableRow className="bg-muted/20">
                                <TableCell className="text-center"><Plus size={14} className="mx-auto"/></TableCell>
                                {worksheet.kolom?.map(col => (
                                    <TableCell key={col.id} className="p-2">
                                        <Input 
                                            className="h-8 bg-background" 
                                            type={col.type === 'number' || col.type === 'currency' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                                            placeholder={col.label}
                                            value={newRowData[col.id] || ''}
                                            onChange={e => handleInputChange(col.id, e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); }}
                                        />
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" onClick={handleAddRow}>
                                        <Save size={14}/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

// --- KOMPONEN UTAMA TAB ---
export default function KertasKerjaTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    const [worksheets, setWorksheets] = useState<KertasKerja[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWorksheet, setSelectedWorksheet] = useState<KertasKerja | null>(null);

    useEffect(() => {
        if (!userProfile.opdId) return;
        const q = query(collection(db, 'keuangan_kertas_kerja'), where('opdId', '==', userProfile.opdId), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setWorksheets(snap.docs.map(d => ({ id: d.id, ...d.data() } as KertasKerja)));
            setLoading(false);
        });
        return () => unsub();
    }, [userProfile.opdId]);

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus kertas kerja ini? Data yang ada di dalamnya akan hilang.")) return;
        try {
            await deleteDoc(doc(db, 'keuangan_kertas_kerja', id));
            addToast("Kertas kerja dihapus.", "success");
        } catch (e) {
            addToast("Gagal menghapus.", "error");
        }
    };

    if (selectedWorksheet) {
        return <ManualWorksheetView worksheet={selectedWorksheet} onBack={() => setSelectedWorksheet(null)} />;
    }

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Kertas Kerja & Penugasan</h2>
                    <p className="text-muted-foreground text-sm">Kumpulan worksheet khusus atau tautan eksternal untuk keperluan pelaporan.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus size={16} className="mr-2"/> Buat Baru
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Memuat data...</div>
            ) : worksheets.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3"/>
                    <h3 className="font-semibold">Belum ada Kertas Kerja</h3>
                    <p className="text-sm text-muted-foreground">Buat tabel manual atau sematkan link spreadsheet di sini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {worksheets.map(ws => (
                        <Card key={ws.id} className="group hover:border-primary transition-all cursor-pointer" onClick={() => {
                            if (ws.tipe === 'link' && ws.urlEksternal) {
                                window.open(ws.urlEksternal, '_blank');
                            } else {
                                setSelectedWorksheet(ws);
                            }
                        }}>
                            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                <div className={`p-2 rounded-md ${ws.tipe === 'link' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {ws.tipe === 'link' ? <LinkIcon size={20}/> : <TableIcon size={20}/>}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical size={16}/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(ws.id!) }}>
                                            <Trash2 size={14} className="mr-2"/> Hapus
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-2">
                                    {ws.kategori && <Badge variant="secondary" className="mb-1 mr-1 text-[10px]">{ws.kategori}</Badge>}
                                    <CardTitle className="text-base mb-1 line-clamp-1">{ws.judul}</CardTitle>
                                </div>
                                <CardDescription className="text-xs line-clamp-2 min-h-[2.5em]">
                                    {ws.deskripsi || (ws.tipe === 'link' ? 'Tautan Eksternal' : 'Tabel Kustom')}
                                </CardDescription>
                            </CardContent>
                            <CardFooter className="pt-0">
                                {ws.tipe === 'link' ? (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <ExternalLink size={10}/> Buka Spreadsheet
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-xs">
                                        {ws.kolom?.length || 0} Kolom
                                    </Badge>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <CreateWorksheetModal 
                isOpen={isCreateOpen} 
                onClose={() => setIsCreateOpen(false)} 
                opdId={userProfile.opdId} 
                userId={userProfile.uid} 
                onSuccess={() => {}}
            />
        </div>
    );
}