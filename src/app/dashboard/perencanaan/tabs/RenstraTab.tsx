// Directory: src/app/dashboard/perencanaan/tabs/RenstraTab.tsx
// [NEW] Modul Manajemen Renstra (Visi Misi & Sasaran Strategis).
// Memungkinkan OPD menetapkan arah kebijakan 5 tahunan dan indikatornya.

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, Timestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { Renstra, SasaranStrategis, IndikatorSasaran, UserProfile } from '@/types';
import { Loader2, Save, Plus, Trash2, Edit, Target, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

// --- MODAL TAMBAH/EDIT SASARAN ---
const SasaranModal = ({ isOpen, onClose, onSave, sasaranToEdit, renstraId, opdId }: {
    isOpen: boolean,
    onClose: () => void,
    onSave: () => void,
    sasaranToEdit: SasaranStrategis | null,
    renstraId: string,
    opdId: string
}) => {
    const { addToast } = useToast();
    const [deskripsi, setDeskripsi] = useState('');
    const [indikators, setIndikators] = useState<IndikatorSasaran[]>([
        { id: Date.now().toString(), nama: '', satuan: '', target: [] }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (sasaranToEdit) {
                setDeskripsi(sasaranToEdit.deskripsi);
                setIndikators(sasaranToEdit.indikator);
            } else {
                setDeskripsi('');
                setIndikators([{ id: Date.now().toString(), nama: '', satuan: '', target: [] }]);
            }
        }
    }, [isOpen, sasaranToEdit]);

    const handleAddIndikator = () => {
        setIndikators([...indikators, { id: Date.now().toString(), nama: '', satuan: '', target: [] }]);
    };

    const handleRemoveIndikator = (id: string) => {
        setIndikators(indikators.filter(i => i.id !== id));
    };

    const updateIndikator = (id: string, field: keyof IndikatorSasaran, value: any) => {
        setIndikators(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    };
    
    // Update Target Tahunan (Tahun 1 - 5)
    const updateTarget = (id: string, tahunIdx: number, val: string) => {
        setIndikators(prev => prev.map(i => {
            if (i.id !== id) return i;
            const newTarget = [...(i.target || [])];
            // Pastikan array cukup panjang
            while(newTarget.length <= tahunIdx) newTarget.push({ tahun: 2021 + newTarget.length, target: 0 });
            
            newTarget[tahunIdx] = { ...newTarget[tahunIdx], target: val };
            return { ...i, target: newTarget };
        }));
    };

    const handleSubmit = async () => {
        if (!deskripsi.trim()) {
            addToast("Deskripsi sasaran wajib diisi", "error");
            return;
        }
        setIsProcessing(true);
        try {
            const payload = {
                opdId,
                renstraId,
                deskripsi,
                indikator: indikators,
                createdAt: Timestamp.now()
            };

            if (sasaranToEdit?.id) {
                await updateDoc(doc(db, 'perencanaan_sasaran', sasaranToEdit.id), payload);
                addToast("Sasaran berhasil diperbarui", "success");
            } else {
                await addDoc(collection(db, 'perencanaan_sasaran'), payload);
                addToast("Sasaran baru ditambahkan", "success");
            }
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            addToast("Gagal menyimpan sasaran", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{sasaranToEdit ? 'Edit Sasaran Strategis' : 'Tambah Sasaran Strategis'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Deskripsi Sasaran</Label>
                        <Textarea 
                            value={deskripsi} 
                            onChange={e => setDeskripsi(e.target.value)} 
                            placeholder="Contoh: Meningkatnya kualitas infrastruktur jalan..."
                        />
                    </div>
                    
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-bold">Indikator Kinerja Utama (IKU)</Label>
                            <Button size="sm" variant="outline" onClick={handleAddIndikator}><Plus size={14} className="mr-1"/> Tambah IKU</Button>
                        </div>
                        
                        {indikators.map((iku, idx) => (
                            <div key={iku.id} className="space-y-3 border-b pb-4 mb-4 last:border-0 last:pb-0">
                                <div className="flex gap-2 items-start">
                                    <span className="mt-2 text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                        <div className="md:col-span-3">
                                            <Input 
                                                placeholder="Nama Indikator (misal: Persentase Jalan Mantap)" 
                                                value={iku.nama}
                                                onChange={e => updateIndikator(iku.id, 'nama', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Input 
                                                placeholder="Satuan (%)" 
                                                value={iku.satuan}
                                                onChange={e => updateIndikator(iku.id, 'satuan', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleRemoveIndikator(iku.id)}>
                                        <Trash2 size={16}/>
                                    </Button>
                                </div>
                                
                                {/* Target 5 Tahun */}
                                <div className="grid grid-cols-5 gap-2 ml-6">
                                    {[0,1,2,3,4].map(y => (
                                        <div key={y}>
                                            <Label className="text-xs text-muted-foreground">Thn {y+1}</Label>
                                            <Input 
                                                className="h-8 text-xs" 
                                                placeholder="0"
                                                value={iku.target?.[y]?.target || ''}
                                                onChange={e => updateTarget(iku.id, y, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN COMPONENT ---
export default function RenstraTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    
    const [renstra, setRenstra] = useState<Renstra | null>(null);
    const [sasaranList, setSasaranList] = useState<SasaranStrategis[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form Visi Misi
    const [visi, setVisi] = useState('');
    const [misiList, setMisiList] = useState<string[]>(['']);
    const [periodeAwal, setPeriodeAwal] = useState(new Date().getFullYear());
    const [isSavingRenstra, setIsSavingRenstra] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sasaranToEdit, setSasaranToEdit] = useState<SasaranStrategis | null>(null);

    // 1. Fetch Data Renstra & Sasaran
    const fetchData = async () => {
        if (!userProfile.opdId) return;
        setLoading(true);
        try {
            // Ambil Renstra Aktif
            const qRenstra = query(
                collection(db, 'perencanaan_renstra'), 
                where('opdId', '==', userProfile.opdId),
                where('isActive', '==', true)
            );
            const snapRenstra = await getDocs(qRenstra);
            
            if (!snapRenstra.empty) {
                const data = { id: snapRenstra.docs[0].id, ...snapRenstra.docs[0].data() } as Renstra;
                setRenstra(data);
                setVisi(data.visi);
                setMisiList(data.misi && data.misi.length > 0 ? data.misi : ['']);
                setPeriodeAwal(data.periodeAwal);

                // Ambil Sasaran Strategis berdasarkan Renstra ID
                const qSasaran = query(
                    collection(db, 'perencanaan_sasaran'),
                    where('renstraId', '==', data.id)
                );
                const snapSasaran = await getDocs(qSasaran);
                setSasaranList(snapSasaran.docs.map(d => ({ id: d.id, ...d.data() } as SasaranStrategis)));
            } else {
                setRenstra(null); // Belum ada renstra
            }
        } catch (err) {
            console.error(err);
            addToast("Gagal memuat data Renstra", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile.opdId]);

    // 2. Handler Simpan Visi Misi
    const handleSaveVisiMisi = async () => {
        setIsSavingRenstra(true);
        try {
            const payload = {
                opdId: userProfile.opdId,
                periodeAwal,
                periodeAkhir: periodeAwal + 5,
                visi,
                misi: misiList.filter(m => m.trim() !== ''),
                isActive: true,
                createdAt: Timestamp.now()
            };

            if (renstra?.id) {
                await updateDoc(doc(db, 'perencanaan_renstra', renstra.id), payload);
                addToast("Renstra berhasil diperbarui", "success");
            } else {
                await addDoc(collection(db, 'perencanaan_renstra'), payload);
                addToast("Renstra baru berhasil dibuat", "success");
                fetchData(); // Refresh untuk dapat ID
            }
        } catch (e) {
            console.error(e);
            addToast("Gagal menyimpan Renstra", "error");
        } finally {
            setIsSavingRenstra(false);
        }
    };

    const handleMisiChange = (index: number, val: string) => {
        const newMisi = [...misiList];
        newMisi[index] = val;
        setMisiList(newMisi);
    };

    const addMisiRow = () => setMisiList([...misiList, '']);
    const removeMisiRow = (index: number) => setMisiList(misiList.filter((_, i) => i !== index));

    // 3. Handler Sasaran
    const handleDeleteSasaran = async (id: string) => {
        if (!confirm("Yakin hapus sasaran ini?")) return;
        try {
            await deleteDoc(doc(db, 'perencanaan_sasaran', id));
            addToast("Sasaran dihapus", "success");
            fetchData();
        } catch (e) {
            addToast("Gagal menghapus", "error");
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin mb-2"/>Memuat Renstra...</div>;

    return (
        <div className="space-y-8 animate-fadeInUp">
            
            {/* BAGIAN 1: IDENTITAS RENSTRA (VISI MISI) */}
            <Card className="border-t-4 border-t-blue-600 shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl">Identitas Renstra</CardTitle>
                            <CardDescription>Visi, Misi, dan Periode Perencanaan Jangka Menengah.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label>Periode Awal:</Label>
                            <Input 
                                type="number" 
                                className="w-24" 
                                value={periodeAwal} 
                                onChange={e => setPeriodeAwal(Number(e.target.value))} 
                                min={2000} max={2100}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Visi OPD</Label>
                        <Textarea 
                            value={visi} 
                            onChange={e => setVisi(e.target.value)} 
                            placeholder="Tuliskan visi organisasi di sini..."
                            className="min-h-[80px]"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-semibold">Misi OPD</Label>
                            <Button size="sm" variant="outline" onClick={addMisiRow}><Plus size={14} className="mr-1"/> Tambah Misi</Button>
                        </div>
                        {misiList.map((m, idx) => (
                            <div key={idx} className="flex gap-2">
                                <span className="mt-2 text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                                <Input value={m} onChange={e => handleMisiChange(idx, e.target.value)} placeholder={`Misi ke-${idx + 1}`} />
                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeMisiRow(idx)} disabled={misiList.length === 1}><Trash2 size={16}/></Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveVisiMisi} disabled={isSavingRenstra} className="bg-blue-600 hover:bg-blue-700">
                            {isSavingRenstra ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} 
                            Simpan Visi & Misi
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* BAGIAN 2: SASARAN STRATEGIS & IKU */}
            {renstra && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Target className="text-green-600"/> Sasaran Strategis & IKU
                        </h2>
                        <Button onClick={() => { setSasaranToEdit(null); setIsModalOpen(true); }} className="bg-green-600 hover:bg-green-700">
                            <Plus size={16} className="mr-2"/> Tambah Sasaran
                        </Button>
                    </div>

                    {sasaranList.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3"/>
                            <p className="text-muted-foreground">Belum ada Sasaran Strategis yang ditetapkan.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sasaranList.map((sasaran, idx) => (
                                <Accordion type="single" collapsible key={sasaran.id} className="bg-card border rounded-lg px-4 shadow-sm">
                                    <AccordionItem value={sasaran.id!} className="border-b-0">
                                        <div className="flex items-center justify-between py-4">
                                            <AccordionTrigger className="hover:no-underline flex-1 py-0 pr-4 text-left">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">Sasaran {idx + 1}</Badge>
                                                        <span className="font-semibold text-base line-clamp-1">{sasaran.deskripsi}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 ml-1">
                                                        {sasaran.indikator?.length || 0} Indikator Kinerja
                                                    </p>
                                                </div>
                                            </AccordionTrigger>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" onClick={() => { setSasaranToEdit(sasaran); setIsModalOpen(true); }} className="text-yellow-600"><Edit size={16}/></Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteSasaran(sasaran.id!)} className="text-red-600"><Trash2 size={16}/></Button>
                                            </div>
                                        </div>
                                        <AccordionContent>
                                            <div className="pl-2 pb-4 pt-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/50">
                                                            <TableHead>Indikator Kinerja Utama (IKU)</TableHead>
                                                            <TableHead className="w-[100px]">Satuan</TableHead>
                                                            <TableHead className="text-center">Tahun 1</TableHead>
                                                            <TableHead className="text-center">Tahun 2</TableHead>
                                                            <TableHead className="text-center">Tahun 3</TableHead>
                                                            <TableHead className="text-center">Tahun 4</TableHead>
                                                            <TableHead className="text-center">Tahun 5</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sasaran.indikator?.map((iku, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium">{iku.nama}</TableCell>
                                                                <TableCell>{iku.satuan}</TableCell>
                                                                {[0,1,2,3,4].map(y => (
                                                                    <TableCell key={y} className="text-center">
                                                                        {iku.target?.[y]?.target || '-'}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {renstra && (
                <SasaranModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={fetchData}
                    sasaranToEdit={sasaranToEdit}
                    renstraId={renstra.id!}
                    opdId={userProfile.opdId}
                />
            )}
        </div>
    );
}