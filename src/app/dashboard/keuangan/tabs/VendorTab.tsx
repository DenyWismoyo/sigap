// Directory: src/app/dashboard/keuangan/tabs/VendorTab.tsx
// [NEW FEATURE] Manajemen Data Rekanan (Vendor).
// - CRUD Vendor (Toko, CV, PT, Perseorangan).
// - Data: NPWP, Bank, Kontak.

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Vendor, UserProfile } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Save, Loader2, Store, Phone, CreditCard, Search } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function VendorTab({ userProfile }: { userProfile: UserProfile }) {
    const { addToast } = useToast();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [formData, setFormData] = useState<Partial<Vendor>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch Data
    useEffect(() => {
        if (!userProfile.opdId) return;
        const q = query(collection(db, 'keuangan_vendor'), where('opdId', '==', userProfile.opdId));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor));
            // Sortir berdasarkan nama toko
            list.sort((a, b) => a.namaToko.localeCompare(b.namaToko));
            setVendors(list);
            setLoading(false);
        });
        return () => unsub();
    }, [userProfile.opdId]);

    const filteredVendors = vendors.filter(v => 
        v.namaToko.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.namaPemilik || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (vendor?: Vendor) => {
        if (vendor) {
            setEditingVendor(vendor);
            setFormData(vendor);
        } else {
            setEditingVendor(null);
            setFormData({
                namaToko: '',
                alamat: '',
                npwp: '',
                namaPemilik: '',
                bank: '',
                noRekening: '',
                kategori: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.namaToko) {
            addToast("Nama Toko wajib diisi.", "error");
            return;
        }

        setIsProcessing(true);
        try {
            const payload = {
                ...formData,
                opdId: userProfile.opdId
            };

            if (editingVendor) {
                await updateDoc(doc(db, 'keuangan_vendor', editingVendor.id!), payload);
                addToast("Data rekanan diperbarui.", "success");
            } else {
                await addDoc(collection(db, 'keuangan_vendor'), {
                    ...payload,
                    createdAt: Timestamp.now()
                });
                addToast("Rekanan baru ditambahkan.", "success");
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            addToast("Gagal menyimpan data.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Hapus data rekanan ini?")) return;
        try {
            await deleteDoc(doc(db, 'keuangan_vendor', id));
            addToast("Rekanan dihapus.", "success");
        } catch (error) {
            addToast("Gagal menghapus.", "error");
        }
    };

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Store className="text-blue-600" /> Manajemen Rekanan & Vendor
                    </h2>
                    <p className="text-sm text-muted-foreground">Database toko, penyedia jasa, dan penerima pembayaran.</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus size={16} className="mr-2"/> Tambah Rekanan
                </Button>
            </div>

            <Card className="border-border shadow-sm">
                <div className="p-4 border-b flex items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                        <Input 
                            placeholder="Cari nama toko atau pemilik..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Nama Toko / Rekanan</TableHead>
                                <TableHead>Pemilik & Kontak</TableHead>
                                <TableHead>NPWP</TableHead>
                                <TableHead>Rekening Bank</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Memuat data...</TableCell></TableRow>
                            ) : filteredVendors.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data rekanan.</TableCell></TableRow>
                            ) : (
                                filteredVendors.map(v => (
                                    <TableRow key={v.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <div className="font-medium">{v.namaToko}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{v.alamat || '-'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{v.namaPemilik || '-'}</div>
                                            {v.kategori && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{v.kategori}</span>}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{v.npwp || '-'}</TableCell>
                                        <TableCell>
                                            {v.noRekening ? (
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-bold">{v.bank}</span>
                                                    <span className="font-mono">{v.noRekening}</span>
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(v)} className="text-yellow-600 hover:text-yellow-700 h-8 w-8">
                                                    <Edit size={14}/>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id!)} className="text-red-500 hover:text-red-600 h-8 w-8">
                                                    <Trash2 size={14}/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* MODAL FORM */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>{editingVendor ? 'Edit Rekanan' : 'Tambah Rekanan Baru'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div>
                            <Label>Nama Toko / Badan Usaha <span className="text-red-500">*</span></Label>
                            <Input 
                                value={formData.namaToko || ''} 
                                onChange={e => setFormData({...formData, namaToko: e.target.value})} 
                                placeholder="Contoh: CV. Maju Jaya / Toko Buku Abadi"
                                required 
                            />
                        </div>
                        <div>
                            <Label>Alamat Lengkap</Label>
                            <Input 
                                value={formData.alamat || ''} 
                                onChange={e => setFormData({...formData, alamat: e.target.value})} 
                                placeholder="Jalan..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nama Pemilik / Kontak</Label>
                                <Input 
                                    value={formData.namaPemilik || ''} 
                                    onChange={e => setFormData({...formData, namaPemilik: e.target.value})} 
                                />
                            </div>
                            <div>
                                <Label>NPWP (Untuk Pajak)</Label>
                                <Input 
                                    value={formData.npwp || ''} 
                                    onChange={e => setFormData({...formData, npwp: e.target.value})} 
                                    className="font-mono"
                                    placeholder="XX.XXX.XXX.X-XXX.XXX"
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg border border-border">
                            <Label className="mb-2 block items-center gap-2"><CreditCard size={14}/> Informasi Bank (Opsional)</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <Input 
                                        placeholder="Nama Bank" 
                                        value={formData.bank || ''} 
                                        onChange={e => setFormData({...formData, bank: e.target.value})}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        placeholder="Nomor Rekening" 
                                        value={formData.noRekening || ''} 
                                        onChange={e => setFormData({...formData, noRekening: e.target.value})}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label>Kategori</Label>
                            <Input 
                                value={formData.kategori || ''} 
                                onChange={e => setFormData({...formData, kategori: e.target.value})} 
                                placeholder="Misal: ATK, Katering, Percetakan"
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>} Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}