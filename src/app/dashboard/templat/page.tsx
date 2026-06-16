// Lokasi: src/app/dashboard/templat/page.tsx
// [MODIFIKASI]
// - Mengganti semua kelas dark:.. kustom dengan kelas semantik (bg-card, text-foreground, dll)
// - Menambahkan useMemo 'sortedOpdList' untuk menyortir OPD (Induk -> Sub)
// - Memperbarui <ScrollArea> di modal untuk menggunakan 'sortedOpdList' dan menampilkan indentasi.
// - Memperbaiki path impor menggunakan alias '@'.
// [PERBAIKAN 11/11/2025]
// - Memperbaiki Modal Tambah (handleAddTemplat) agar menggunakan 'sortedOpdList'
//   dan 'handleOpdCheckChange(opd)' agar konsisten dengan Modal Edit.
// - Menambahkan tombol 'Pilih Semua'/'Kosongkan' ke Modal Tambah.

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase'; // path @
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc, updateDoc, Timestamp, getDocs } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext'; // path @
import { InstruksiTemplat, OPD } from '@/types'; // path @
import { Trash2, Edit, X, Building, Save, Loader2 } from 'lucide-react';
import ConfirmModal from '@/app/dashboard/components/ConfirmModal'; // path @

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input"; // Tidak terpakai
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
// --- Akhir Impor Shadcn ---


export default function ManajemenTemplatPage() {
    const { userProfile } = useUserAuth();
    
    const [allOpds, setAllOpds] = useState<OPD[]>([]);
    
    const [opdTemplatList, setOpdTemplatList] = useState<InstruksiTemplat[]>([]);
    const [sharedTemplatList, setSharedTemplatList] = useState<InstruksiTemplat[]>([]);

    const [newTemplatText, setNewTemplatText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); 

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentTemplat, setCurrentTemplat] = useState<InstruksiTemplat | null>(null);
    
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isProcessing?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const [selectedOpds, setSelectedOpds] = useState<string[]>([]);
    
    // [MODIFIKASI] Buat callback untuk fetch data agar bisa dipanggil ulang
    const fetchData = useCallback(async () => {
        if (!userProfile?.opdId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        // Fetch OPD (hanya Super Admin)
        if (userProfile.role === 'super_admin' && allOpds.length === 0) {
            try {
                const opdSnapshot = await getDocs(collection(db, "opd"));
                setAllOpds(opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD)));
            } catch (err) {
                console.error("Gagal fetch OPD (ManajemenTemplatPage):", err);
            }
        }
        
        // Query templat OPD (onSnapshot)
        const qOpd = query(
            collection(db, "instruksiTemplat"), 
            where("opdId", "==", userProfile.opdId)
        );
        const unsubscribeOpd = onSnapshot(qOpd, (querySnapshot) => {
            const templats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstruksiTemplat));
            setOpdTemplatList(templats);
        }, (err) => {
            console.error(err);
            setError("Gagal memuat data templat OPD.");
            setLoading(false);
        });

        // Query templat dibagikan (onSnapshot)
        const qShared = query(
            collection(db, "instruksiTemplat"), 
            where("sharedWithOpdIds", "array-contains", userProfile.opdId)
        );
        const unsubscribeShared = onSnapshot(qShared, (querySnapshot) => {
            const templats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstruksiTemplat));
            setSharedTemplatList(templats);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError("Gagal memuat data templat global.");
            setLoading(false);
        });

        return () => {
            unsubscribeOpd();
            unsubscribeShared();
        };
    }, [userProfile, allOpds.length]); // [MODIFIKASI] Tambahkan dependensi

    useEffect(() => {
        fetchData();
    }, [fetchData]); // [MODIFIKASI] Panggil fetchData

    // [MODIFIKASI] Daftar OPD yang disortir (Induk -> Sub)
    const sortedOpdList = useMemo(() => {
        const indukOpds = allOpds
            .filter(opd => opd.tipe === 'Induk')
            .sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
        
        const sortedList: (OPD & { indent?: boolean })[] = [];
        indukOpds.forEach(induk => {
            sortedList.push(induk);
            const subOpds = allOpds
                .filter(opd => opd.idOpdInduk === induk.id)
                .sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
            // Tambahkan properti 'indent' untuk UI
            subOpds.forEach(sub => sortedList.push({ ...sub, indent: true }));
        });
        return sortedList;
    }, [allOpds]);

    const templatList = useMemo(() => {
        const all = [...opdTemplatList, ...sharedTemplatList];
        return Array.from(new Map(all.map(t => [t.id, t])).values());
    }, [opdTemplatList, sharedTemplatList]);

    const handleAddTemplat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplatText.trim() || !userProfile) {
            setError("Teks templat tidak boleh kosong.");
            return;
        }
        setError('');
        setIsProcessing(true); 

        try {
            const payload: any = {
                teksInstruksi: newTemplatText,
                opdId: userProfile.opdId,
                createdBy: userProfile.uid,
                createdAt: Timestamp.now(), // [TAMBAHAN] Tambah createdAt
            };
            if(userProfile.role === 'super_admin') {
                payload.sharedWithOpdIds = selectedOpds;
            }

            await addDoc(collection(db, 'instruksiTemplat'), payload);
            setNewTemplatText('');
            setSelectedOpds([]);
            // Tidak perlu panggil fetchData() karena onSnapshot akan update otomatis
        } catch (err) {
            console.error(err);
            setError("Gagal menyimpan templat baru.");
        } finally {
            setIsProcessing(false); 
        }
    };

    const handleDeleteTemplat = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus Templat',
            message: 'Apakah Anda yakin ingin menghapus templat ini?',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isProcessing: true })); 
                try {
                    await deleteDoc(doc(db, 'instruksiTemplat', id));
                    // Tidak perlu panggil fetchData()
                } catch (err) {
                    console.error(err);
                    setError("Gagal menghapus templat.");
                } finally {
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, isProcessing: false }); 
                }
            }
        });
    };

    const openEditModal = (templat: InstruksiTemplat) => {
        setCurrentTemplat(templat);
        setSelectedOpds(templat.sharedWithOpdIds || []);
        setIsEditModalOpen(true);
    };

    // [MODIFIKASI] Logika ini disalin dari knowledge/page.tsx
    const handleOpdCheckChange = (opd: OPD) => {
        const opdId = opd.id!;
        const isSelecting = !selectedOpds.includes(opdId);
        let newSelectedOpds: string[];

        if (isSelecting) {
            newSelectedOpds = [...selectedOpds, opdId];
        } else {
            newSelectedOpds = selectedOpds.filter(id => id !== opdId);
        }

        // Jika memilih/membatalkan Induk, pengaruhi Sub-OPD
        if (opd.tipe === 'Induk') {
            const subOpdIds = allOpds // Gunakan allOpds
                .filter(sub => sub.idOpdInduk === opdId)
                .map(sub => sub.id!);
            
            if (isSelecting) {
                newSelectedOpds = [...newSelectedOpds, ...subOpdIds];
            } else {
                newSelectedOpds = newSelectedOpds.filter(id => !subOpdIds.includes(id));
            }
        }
        setSelectedOpds(Array.from(new Set(newSelectedOpds)));
    };
    
    // [MODIFIKASI] Tombol untuk pilih semua/kosongkan
    const toggleSelectAll = (select: boolean) => {
        if (select) {
            setSelectedOpds(allOpds.map(opd => opd.id!));
        } else {
            setSelectedOpds([]);
        }
    };


    const handleUpdateTemplat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTemplat || !currentTemplat.teksInstruksi.trim()) {
            setError("Teks templat tidak boleh kosong.");
            return;
        }
        
        setIsProcessing(true); 
        try {
            const updatePayload: any = {
                teksInstruksi: currentTemplat.teksInstruksi,
            };
            if(userProfile?.role === 'super_admin') {
                updatePayload.sharedWithOpdIds = selectedOpds;
            }

            const templatRef = doc(db, 'instruksiTemplat', currentTemplat.id!);
            await updateDoc(templatRef, updatePayload);
            
            setIsEditModalOpen(false);
            setCurrentTemplat(null);
            setSelectedOpds([]);
            // Tidak perlu panggil fetchData()
        } catch (err) {
            console.error(err);
            setError("Gagal memperbarui templat.");
        } finally {
            setIsProcessing(false); 
        }
    };
    
    return (
        <div className="animate-fadeInUp">
            {/* [MODIFIKASI] Ganti dark mode kustom */}
            <h1 className="text-3xl font-bold text-foreground">Manajemen Templat Instruksi</h1>
            <p className="mt-2 text-muted-foreground">Buat dan kelola templat instruksi yang sering Anda gunakan untuk mempercepat proses disposisi.</p>
            
            <div className="p-6 mt-8 bg-card rounded-xl shadow-md border border-border">
                <h2 className="text-xl font-semibold text-foreground">Tambah Templat Baru</h2>
                {error && (
                    <Alert variant="destructive" className="my-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleAddTemplat} className="mt-4 space-y-4">
                    <div>
                        <Label htmlFor="templat-text">Teks Instruksi</Label>
                        <Textarea 
                            id="templat-text"
                            value={newTemplatText}
                            onChange={e => setNewTemplatText(e.target.value)}
                            rows={3}
                            placeholder="Contoh: Mohon segera ditindaklanjuti dan laporkan hasilnya."
                        />
                    </div>

                    {userProfile?.role === 'super_admin' && (
                        <div>
                            <Label className="font-bold text-sm flex items-center gap-2">
                                <Building size={16} /> Bagikan ke OPD (Opsional)
                            </Label>
                            {/* [PERBAIKAN 11/11/2025] Tambahkan tombol Pilih Semua/Kosongkan */}
                            <div className="flex justify-between items-center mt-2 mb-1">
                                <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(true)}>Pilih Semua</Button>
                                <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(false)}>Kosongkan</Button>
                            </div>
                            <ScrollArea className="mt-2 p-3 bg-muted rounded-lg max-h-48 border border-border space-y-2">
                                {/* [PERBAIKAN 11/11/2025] Ganti allOpds -> sortedOpdList dan perbaiki handler */}
                                {sortedOpdList.map(opd => (
                                    <div key={opd.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent">
                                        <Checkbox
                                            id={`cb-add-${opd.id!}`}
                                            checked={selectedOpds.includes(opd.id!)}
                                            onCheckedChange={() => handleOpdCheckChange(opd)}
                                        />
                                        <Label htmlFor={`cb-add-${opd.id!}`} className="text-sm cursor-pointer">
                                            {opd.indent ? '↳ ' : ''}{opd.namaOpd}
                                        </Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    <Button type="submit" disabled={isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Templat
                    </Button>
                </form>
            </div>

            <div className="mt-8 bg-card rounded-xl shadow-md border border-border">
                <h2 className="p-6 text-xl font-semibold text-foreground border-b border-border">Daftar Templat Tersimpan</h2>
                <div className="p-6">
                    {loading ? <p className="text-center text-muted-foreground">Memuat templat...</p> : (
                        <ul className="space-y-3">
                            {templatList.length > 0 ? templatList.map(templat => (
                                <li key={templat.id} className="flex justify-between items-center p-4 bg-muted rounded-lg border border-border">
                                    <p className="text-foreground italic">"{templat.teksInstruksi}"</p>
                                    <div className="flex space-x-3 flex-shrink-0">
                                        {(userProfile?.role === 'super_admin' || userProfile?.opdId === templat.opdId) && (
                                            <>
                                                <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditModal(templat)}>
                                                    <Edit size={18} className="text-yellow-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Hapus" onClick={() => handleDeleteTemplat(templat.id!)}>
                                                    <Trash2 size={18} className="text-red-600" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </li>
                            )) : (
                                <p className="text-center text-muted-foreground">Anda belum memiliki templat.</p>
                            )}
                        </ul>
                    )}
                </div>
            </div>

            {/* Modal Edit */}
            <Dialog open={isEditModalOpen} onOpenChange={() => { setIsEditModalOpen(false); setSelectedOpds([]); }}>
                <DialogContent className="sm:max-w-lg bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Edit Templat</DialogTitle>
                    </DialogHeader>
                    {currentTemplat && (
                        <form onSubmit={handleUpdateTemplat} className="mt-4 space-y-4">
                            <div>
                                <Label htmlFor="edit-templat-text">Teks Instruksi</Label>
                                <Textarea
                                    id="edit-templat-text"
                                    value={currentTemplat.teksInstruksi}
                                    onChange={e => setCurrentTemplat({ ...currentTemplat, teksInstruksi: e.target.value })}
                                    rows={4}
                                />
                            </div>
                            
                            {userProfile?.role === 'super_admin' && (
                                <div>
                                    <Label className="font-bold text-sm flex items-center gap-2">
                                        <Building size={16} /> Bagikan ke OPD (Opsional)
                                    </Label>
                                    {/* [MODIFIKASI] Tambahkan tombol Pilih Semua/Kosongkan */}
                                    <div className="flex justify-between items-center mt-2 mb-1">
                                        <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(true)}>Pilih Semua</Button>
                                        <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(false)}>Kosongkan</Button>
                                    </div>
                                    <ScrollArea className="mt-2 p-3 bg-muted rounded-lg max-h-48 border border-border space-y-2">
                                        {/* [MODIFIKASI] Gunakan sortedOpdList dan tambahkan indentasi */}
                                        {sortedOpdList.map(opd => (
                                            <div key={opd.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent">
                                                <Checkbox
                                                    id={`cb-edit-${opd.id!}`}
                                                    checked={selectedOpds.includes(opd.id!)}
                                                    onCheckedChange={() => handleOpdCheckChange(opd)}
                                                />
                                                <Label htmlFor={`cb-edit-${opd.id!}`} className="text-sm cursor-pointer">
                                                    {opd.indent ? '↳ ' : ''}{opd.namaOpd}
                                                </Label>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={isProcessing}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Perubahan
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, isProcessing: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isProcessing={confirmModal.isProcessing}
            />
        </div>
    );
}