"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { Loader2, Plus, Trash2, Edit2, Save, X, BookOpen, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TupoksiItem {
    id: string;
    jenisWilayah: 'Kecamatan' | 'Kelurahan';
    kategori: 'Tugas' | 'Fungsi';
    uraian: string;
    dasarHukum?: string;
    createdAt: any;
}

export default function TupoksiWilayahManager() {
    const { addToast } = useToast();
    const [activeLevel, setActiveLevel] = useState<'Kecamatan' | 'Kelurahan'>('Kecamatan');
    const [items, setItems] = useState<TupoksiItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        kategori: 'Tugas' as 'Tugas' | 'Fungsi',
        uraian: '',
        dasarHukum: ''
    });

    // Fetch Data Realtime
    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, 'tapem_tupoksi_wilayah'), 
            where('jenisWilayah', '==', activeLevel),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as TupoksiItem));
            setItems(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeLevel]);

    const handleSave = async () => {
        if (!formData.uraian.trim()) {
            addToast("Uraian tidak boleh kosong", "error");
            return;
        }

        try {
            if (isEditing) {
                await updateDoc(doc(db, 'tapem_tupoksi_wilayah', isEditing), {
                    kategori: formData.kategori,
                    uraian: formData.uraian,
                    dasarHukum: formData.dasarHukum
                });
                addToast("Tupoksi berhasil diperbarui", "success");
            } else {
                await addDoc(collection(db, 'tapem_tupoksi_wilayah'), {
                    jenisWilayah: activeLevel,
                    kategori: formData.kategori,
                    uraian: formData.uraian,
                    dasarHukum: formData.dasarHukum,
                    createdAt: Timestamp.now()
                });
                addToast("Tupoksi berhasil ditambahkan", "success");
            }
            resetForm();
        } catch (error) {
            console.error(error);
            addToast("Gagal menyimpan data", "error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus butir tupoksi ini?")) return;
        try {
            await deleteDoc(doc(db, 'tapem_tupoksi_wilayah', id));
            addToast("Data dihapus", "success");
        } catch (error) {
            addToast("Gagal menghapus", "error");
        }
    };

    const handleEdit = (item: TupoksiItem) => {
        setIsEditing(item.id);
        setFormData({
            kategori: item.kategori,
            uraian: item.uraian,
            dasarHukum: item.dasarHukum || ''
        });
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({ kategori: 'Tugas', uraian: '', dasarHukum: '' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        Manajemen Tupoksi {activeLevel}
                    </h3>
                    <p className="text-sm text-muted-foreground">Kelola standar Tugas Pokok dan Fungsi untuk seluruh {activeLevel}.</p>
                </div>
                <div className="bg-muted p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setActiveLevel('Kecamatan')}
                        className={`px-4 py-2 text-sm rounded-md transition-all ${activeLevel === 'Kecamatan' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Kecamatan
                    </button>
                    <button
                        onClick={() => setActiveLevel('Kelurahan')}
                        className={`px-4 py-2 text-sm rounded-md transition-all ${activeLevel === 'Kelurahan' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Kelurahan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Input */}
                <Card className="lg:col-span-1 h-fit border-indigo-100 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{isEditing ? 'Edit Tupoksi' : 'Tambah Tupoksi Baru'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Kategori</label>
                            <Select 
                                value={formData.kategori} 
                                onValueChange={(v: 'Tugas' | 'Fungsi') => setFormData({...formData, kategori: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tugas">Tugas Pokok</SelectItem>
                                    <SelectItem value="Fungsi">Fungsi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Uraian</label>
                            <Textarea 
                                placeholder="Contoh: Mengoordinasikan kegiatan pemberdayaan masyarakat..." 
                                value={formData.uraian}
                                onChange={(e) => setFormData({...formData, uraian: e.target.value})}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Dasar Hukum (Opsional)</label>
                            <Input 
                                placeholder="Contoh: Perwali No. XX Tahun 20XX" 
                                value={formData.dasarHukum}
                                onChange={(e) => setFormData({...formData, dasarHukum: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            {isEditing && (
                                <Button variant="ghost" size="sm" onClick={resetForm} className="flex-1">
                                    <X className="w-4 h-4 mr-2" /> Batal
                                </Button>
                            )}
                            <Button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                {isEditing ? 'Simpan Perubahan' : 'Tambah'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* List View */}
                <Card className="lg:col-span-2 border-indigo-100 shadow-sm">
                    <CardContent className="p-6">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
                        ) : (
                            <div className="space-y-6">
                                {/* Section Tugas */}
                                <div>
                                    <h4 className="font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" /> Tugas Pokok
                                    </h4>
                                    <div className="space-y-2">
                                        {items.filter(i => i.kategori === 'Tugas').length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic pl-4">Belum ada data tugas pokok.</p>
                                        ) : (
                                            items.filter(i => i.kategori === 'Tugas').map((item, idx) => (
                                                <div key={item.id} className="group flex items-start justify-between gap-4 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all">
                                                    <div className="flex gap-3">
                                                        <span className="text-sm font-mono text-muted-foreground mt-0.5">{idx + 1}.</span>
                                                        <div>
                                                            <p className="text-sm text-foreground">{item.uraian}</p>
                                                            {item.dasarHukum && (
                                                                <p className="text-xs text-muted-foreground mt-1 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-0.5 rounded">
                                                                    Dasar: {item.dasarHukum}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                                                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                                                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-dashed" />

                                {/* Section Fungsi */}
                                <div>
                                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" /> Fungsi
                                    </h4>
                                    <div className="space-y-2">
                                        {items.filter(i => i.kategori === 'Fungsi').length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic pl-4">Belum ada data fungsi.</p>
                                        ) : (
                                            items.filter(i => i.kategori === 'Fungsi').map((item, idx) => (
                                                <div key={item.id} className="group flex items-start justify-between gap-4 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all">
                                                    <div className="flex gap-3">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-sm text-foreground">{item.uraian}</p>
                                                            {item.dasarHukum && (
                                                                <p className="text-xs text-muted-foreground mt-1 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-0.5 rounded">
                                                                    Dasar: {item.dasarHukum}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                                                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                                                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}