// Lokasi: src/app/dashboard/portal-integrasi/page.tsx
// [REFACTOR SHADCN & DARK MODE]
// - Mengganti semua modal kustom (.modal-backdrop) dengan <Dialog> shadcn/ui.
// - Mengganti semua form HTML standar dengan <Input>, <Label>, <Button> shadcn/ui.
// - Mengganti input pencarian dengan <Input> shadcn/ui.
// - Mengganti semua kelas `dark:...` kustom dengan kelas semantik (bg-card, text-foreground, dll).
// [REFACTOR LAYOUT ELEGANCE]
// - Menghapus layout kartu (anchor <a>) yang tinggi dan memakan tempat.
// - Membuat komponen internal baru `LinkCard` yang jauh lebih ringkas (compact).
// - `LinkCard` menampilkan ikon, judul, dan deskripsi dalam satu baris.
// - Memindahkan tombol Edit/Hapus agar muncul di atas kartu saat hover.
// [PERBAIKAN 09/11/2025]
// - Menghapus baris 49-52 (destructuring props yang salah) yang menyebabkan error 'props is not defined'.

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { PersonalLink } from '@/types';
import { Plus, Link as LinkIcon, Search, Edit, Trash2, X, Save, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// --- Akhir Impor Shadcn ---


// --- [MODIFIKASI] Komponen Modal Form (Refactored) ---
const PortalLinkModal = ({ isOpen, onClose, onSave, linkToEdit, existingCategories, isProcessing, formState, setFormState }: {
    isOpen: boolean,
    onClose: () => void,
    onSave: (e: React.FormEvent) => void,
    linkToEdit: PersonalLink | null,
    existingCategories: string[],
    isProcessing: boolean,
    formState: { judul: string, url: string, deskripsi: string, kategori: string },
    setFormState: (state: any) => void
}) => {
    
    // [PERBAIKAN] Baris yang menyebabkan error telah dihapus.
    // Props `formState` dan `setFormState` sudah tersedia dari argumen fungsi.

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    <DialogTitle>{linkToEdit ? 'Edit Tautan' : 'Tautan Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSave} className="pt-2">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="judul">Judul Tautan</Label>
                            <Input id="judul" type="text" value={formState.judul} onChange={e => setFormState({...formState, judul: e.target.value})} required autoFocus/>
                        </div>
                        <div>
                            <Label htmlFor="url">URL</Label>
                            <Input id="url" type="url" value={formState.url} onChange={e => setFormState({...formState, url: e.target.value})} required placeholder="https://..."/>
                        </div>
                        <div>
                            <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                            <Input id="deskripsi" type="text" value={formState.deskripsi} onChange={e => setFormState({...formState, deskripsi: e.target.value})} />
                        </div>
                        <div>
                            <Label htmlFor="kategori">Kategori</Label>
                            <Input id="kategori" type="text" value={formState.kategori} onChange={e => setFormState({...formState, kategori: e.target.value})} required list="kategori-list" placeholder="Ketik atau pilih kategori"/>
                            <datalist id="kategori-list">
                                {existingCategories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                    </div>
                    <DialogFooter className="mt-6 pt-4 border-t border-border">
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing && <Loader2 size={16} className="animate-spin mr-2" />}
                            <Save size={16} className="mr-2"/> {isProcessing ? 'Menyimpan...' : 'Simpan Tautan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
// --- Akhir Modal Form ---

// --- [MODIFIKASI] Komponen Kartu Tautan (Ringkas) ---
const LinkCard = ({ link, onEdit, onDelete }: { 
    link: PersonalLink, 
    onEdit: () => void, 
    onDelete: () => void 
}) => {
  return (
    <div className="group relative">
      <a 
        href={link.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="group flex items-center justify-between p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md hover:border-primary transition-all h-full"
      >
        <div className="flex items-center gap-3 min-w-0">
          <LinkIcon size={18} className="text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{link.judul}</p>
            {link.deskripsi && (
              <p className="text-xs text-muted-foreground truncate">{link.deskripsi}</p>
            )}
          </div>
        </div>
        <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary ml-2 flex-shrink-0" />
      </a>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur-sm" onClick={onEdit} title="Edit Tautan">
          <Edit size={14} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur-sm text-destructive hover:text-destructive" onClick={onDelete} title="Hapus Tautan">
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}
// --- Akhir Komponen Kartu Tautan ---


// --- Komponen Utama ---
export default function PortalIntegrasiPage() {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    const [links, setLinks] = useState<PersonalLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [linkToEdit, setLinkToEdit] = useState<PersonalLink | null>(null);
    const [formState, setFormState] = useState({ judul: '', url: '', deskripsi: '', kategori: '' });
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchLinks = useCallback(async () => {
        if (!userProfile) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'personalLinks'), where('userId', '==', userProfile.uid), orderBy('kategori', 'asc'), orderBy('urutan', 'asc'));
            const snapshot = await getDocs(q); 
            setLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalLink)));
        } catch (error) {
            console.error("Error fetching links:", error);
            addToast("Gagal memuat tautan.", "error");
        } finally {
            setLoading(false);
        }
    }, [userProfile, addToast]);

    useEffect(() => {
        fetchLinks();
    }, [fetchLinks]);

    const groupedLinks = useMemo(() => {
        const filtered = links.filter(link => 
            link.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
            link.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (link.deskripsi || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.reduce((acc, link) => {
            const category = link.kategori || 'Tanpa Kategori';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(link);
            return acc;
        }, {} as Record<string, PersonalLink[]>);
    }, [links, searchTerm]);

    const existingCategories = useMemo(() => [...new Set(links.map(l => l.kategori))], [links]);

    const openModal = (link: PersonalLink | null) => {
        setLinkToEdit(link);
        setFormState(link ? { judul: link.judul, url: link.url, deskripsi: link.deskripsi || '', kategori: link.kategori } : { judul: '', url: '', deskripsi: '', kategori: '' });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || !formState.judul || !formState.url || !formState.kategori) {
             addToast("Judul, URL, dan Kategori wajib diisi.", "error");
             return;
        }
        setIsProcessing(true);
        try {
            if (linkToEdit) {
                const linkRef = doc(db, 'personalLinks', linkToEdit.id!);
                await updateDoc(linkRef, { ...formState });
                addToast('Tautan berhasil diperbarui.', 'success');
            } else {
                await addDoc(collection(db, 'personalLinks'), {
                    ...formState,
                    userId: userProfile.uid,
                    urutan: links.length,
                    createdAt: Timestamp.now(),
                });
                addToast('Tautan baru berhasil ditambahkan.', 'success');
            }
            setIsModalOpen(false);
            fetchLinks(); 
        } catch (error) {
            console.error("Gagal menyimpan tautan:", error);
            addToast("Gagal menyimpan tautan.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus tautan ini?")) {
            try {
                await deleteDoc(doc(db, 'personalLinks', id));
                addToast('Tautan berhasil dihapus.', 'success');
                fetchLinks(); 
            } catch (error) {
                 console.error("Gagal menghapus tautan:", error);
                 addToast("Gagal menghapus tautan.", "error");
            }
        }
    };

    return (
        <div className="animate-fadeInUp">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                {/* [PERBAIKAN DARK MODE] */}
                <h1 className="text-3xl font-bold text-foreground flex items-center">
                    <LinkIcon size={28} className="mr-3 text-green-600"/> Portal Integrasi
                </h1>
                <Button onClick={() => openModal(null)} className="bg-green-600 hover:bg-green-700">
                    <Plus size={18} className="mr-2"/> Tambah Tautan
                </Button>
            </div>

            <div className="relative mb-6">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input 
                    type="text" 
                    placeholder="Cari tautan..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10"
                />
            </div>

            {loading ? (
                <div className="text-center p-8 text-muted-foreground">
                    <Loader2 size={24} className="animate-spin mx-auto" />
                    <p>Memuat tautan pribadi...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.keys(groupedLinks).length === 0 ? (
                         <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                            <p className="font-semibold">Portal Anda masih kosong.</p>
                            <p className="text-sm">Klik tombol "Tambah Tautan" untuk memulai.</p>
                        </div>
                    ) : (
                        Object.keys(groupedLinks).sort().map(kategori => (
                            <section key={kategori}>
                                {/* [PERBAIKAN DARK MODE] */}
                                <h2 className="text-xl font-bold text-foreground mb-4 border-b-2 border-border pb-2">{kategori}</h2>
                                {/* [MODIFIKASI] Grid layout sekarang merender LinkCard yang ringkas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {groupedLinks[kategori].map(link => (
                                        <LinkCard 
                                            key={link.id} 
                                            link={link} 
                                            onEdit={() => openModal(link)} 
                                            onDelete={() => handleDelete(link.id!)}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            )}
            
            <PortalLinkModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                linkToEdit={linkToEdit}
                existingCategories={existingCategories}
                isProcessing={isProcessing}
                formState={formState}
                setFormState={setFormState}
            />
        </div>
    );
}