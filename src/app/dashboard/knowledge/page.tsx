"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'; // <-- Impor useRef
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp, getDocs, orderBy } from 'firebase/firestore';
import { useUserAuth } from '../../../context/AuthContext';
import { KnowledgeArticle, OPD, UserProfile } from '../../../types';
import { Plus, Search, Edit, Trash2, X, Save, HelpCircle, Eye, Link as LinkIcon, Building, Loader2, BookText, FileQuestion, LifeBuoy, Upload } from 'lucide-react'; // <-- Impor Upload
import { useToast } from '../../../context/ToastContext';
import { useTheme } from '../../../context/ThemeContext'; 
import dynamic from 'next/dynamic'; 
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm'; 

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
// HAPUS: import { Textarea } from "@/components/ui/textarea"; // Diganti MDEditor
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { ScrollArea } from "../../../components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
// --- Akhir Impor Shadcn ---

// --- Impor MDEditor (Editor Markdown) ---
// Ini adalah editor yang sama dengan yang digunakan di Notulensi
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);
// --- Akhir Impor MDEditor ---


// --- Komponen Modal Bantuan (Tidak Berubah) ---
const BantuanHalamanModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl bg-card border-border">
            <DialogHeader>
                <DialogTitle className="flex items-center">
                    <HelpCircle className="mr-3 text-blue-600" />
                    Bantuan: Knowledge Base
                </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] -mx-6 px-6">
              <div className="space-y-4 text-foreground/90">
                  <h3 className="font-semibold text-lg text-foreground">Apa Kegunaan Menu Ini?</h3>
                  <p>Menu "Knowledge Base" adalah pusat arsip panduan, SOP (Standar Operasional Prosedur), atau informasi penting lainnya yang berlaku di OPD Anda.</p>
                  <p className="font-bold">Pembaruan: Halaman ini sekarang berfungsi sebagai CMS (Content Management System) untuk "Asisten SIGAP" (Chatbot). Tutorial yang Anda tulis di sini akan menjadi "otak" bagi AI untuk menjawab pertanyaan pengguna.</p>
                  
                  <h3 className="font-semibold text-lg text-foreground">Cara Menggunakan:</h3>
                  <ol className="list-decimal list-inside space-y-2">
                      <li><strong>Melihat Artikel:</strong>
                          <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                              <li>Gunakan bilah pencarian atau filter kategori untuk menemukan artikel.</li>
                              <li>Klik pada kartu artikel untuk membacanya.</li>
                          </ul>
                      </li>
                      <li><strong>Mengelola Artikel (Admin/Staf TU):</strong>
                          <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                              <li>Klik tombol "Buat Artikel Baru".</li>
                              <li>Isi Judul dan Kategori (misal: "Tutorial Aplikasi").</li>
                              <li>Gunakan **Editor Teks** baru untuk menulis konten panduan (Anda bisa menggunakan Bold, Italic, Lists, dll).</li>
                              <li>Klik "Simpan Artikel" untuk mempublikasikannya. Artikel ini akan langsung bisa dicari oleh Asisten SIGAP (Chatbot).</li>
                          </ul>
                      </li>
                  </ol>
              </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Saya Mengerti</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
// --- Akhir Modal Bantuan ---

// --- Komponen Modal Form (DIROMBAK: Menambahkan Fitur Impor) ---
const FormModal = ({ isOpen, onClose, onSave, articleToEdit, existingCategories, isProcessing, userProfile, opdList, onOpdCheckChange, selectedOpds, onSelectAll, onDeselectAll, formState, setFormState }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (e: React.FormEvent) => void, 
    articleToEdit: KnowledgeArticle | null,
    existingCategories: string[],
    isProcessing: boolean,
    userProfile: UserProfile | null, 
    opdList: (OPD & { indent?: boolean })[],
    selectedOpds: string[],
    onOpdCheckChange: (opd: OPD) => void,
    onSelectAll: () => void,
    onDeselectAll: () => void
    formState: any, 
    setFormState: (state: any) => void 
}) => {
    
    // Ambil tema (light/dark) untuk MDEditor
    const { theme } = useTheme(); 
    const { addToast } = useToast(); // <-- Gunakan hook toast
    const fileInputRef = useRef<HTMLInputElement>(null); // <-- Ref untuk input file

    if (!isOpen || !formState) return null;

    // --- FUNGSI BARU UNTUK IMPOR KONTEN ---
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Cek tipe file (Markdown atau Teks Polos)
            if (file.type === 'text/markdown' || file.name.endsWith('.md') || file.type === 'text/plain' || file.name.endsWith('.txt')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target?.result as string;
                    // Set konten ke state MDEditor
                    setFormState((prev: any) => ({ ...prev, konten: content }));
                    addToast('Konten berhasil diimpor.', 'success');
                };
                reader.readAsText(file);
            } else {
                addToast('Gagal: Harap pilih file .md atau .txt', 'error');
            }
            // Reset input file agar bisa impor file yang sama lagi
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    // --- AKHIR FUNGSI BARU ---

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl bg-card border-border flex flex-col max-h-[90vh] p-0 gap-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{articleToEdit ? 'Edit Artikel' : 'Artikel Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSave} className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 overflow-y-auto px-6">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="judul">Judul Artikel</Label>
                                <Input id="judul" type="text" value={formState.judul} onChange={e => setFormState({...formState, judul: e.target.value})} required autoFocus/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="kategori">Kategori</Label>
                                    <Input id="kategori" type="text" value={formState.kategori} onChange={e => setFormState({...formState, kategori: e.target.value})} placeholder="Contoh: Tutorial Aplikasi" required list="kategori-list"/>
                                    <datalist id="kategori-list">
                                        <option value="Tutorial Aplikasi" />
                                        <option value="SOP Kepegawaian" />
                                        {existingCategories.map(cat => <option key={cat} value={cat} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <Label htmlFor="attachmentUrl">Tautan Lampiran (Opsional)</Label>
                                    <Input id="attachmentUrl" type="url" value={formState.attachmentUrl} onChange={e => setFormState({...formState, attachmentUrl: e.target.value})} placeholder="https://docs.google.com/..."/>
                                </div>
                            </div>
                            
                            {/* --- PEROMBAKAN UTAMA: Mengganti Textarea dengan MDEditor --- */}
                            <div>
                                {/* --- MODIFIKASI: Tambahkan tombol Impor --- */}
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="konten">Konten</Label>
                                    
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={14} className="mr-2" />
                                        Impor (.md / .txt)
                                    </Button>
                                </div>
                                {/* --- AKHIR MODIFIKASI --- */}

                                <div data-color-mode={theme} className="mt-1">
                                  <MDEditor
                                    height={300}
                                    value={formState.konten}
                                    onChange={(val) => setFormState({...formState, konten: val || ''})}
                                    preview="edit"
                                  />
                                </div>
                                {/* --- INPUT FILE TERSEMBUNYI --- */}
                                <Input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileImport} 
                                    className="hidden" 
                                    accept=".md, .txt, text/markdown, text/plain"
                                />
                                {/* --- AKHIR INPUT FILE --- */}
                            </div>
                            {/* --- AKHIR PEROMBAKAN --- */}
                        
                            {userProfile?.role === 'super_admin' && (
                                <div>
                                    <Label className="font-bold text-sm flex items-center gap-2">
                                        <Building size={16} /> Bagikan ke OPD (Opsional)
                                    </Label>
                                    <div className="flex justify-between items-center mt-2 mb-1">
                                        <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onSelectAll}>Pilih Semua</Button>
                                        <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onDeselectAll}>Kosongkan</Button>
                                    </div>
                                    <ScrollArea className="h-48 rounded-md border p-3 border-border space-y-2">
                                        {opdList.map(opd => (
                                            <div key={opd.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent">
                                                <Checkbox
                                                    id={`cb-edit-${opd.id!}`}
                                                    checked={selectedOpds.includes(opd.id!)}
                                                    onCheckedChange={() => onOpdCheckChange(opd)}
                                                />
                                                <Label htmlFor={`cb-edit-${opd.id!}`} className="text-sm cursor-pointer">
                                                    {(opd as any).indent ? '↳ ' : ''}{opd.namaOpd}
                                                </Label>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="mt-6 p-4 border-t border-border sticky bottom-0 bg-muted/50">
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing && <Loader2 size={16} className="animate-spin mr-2" />}
                            <Save size={16} className="mr-2"/> {isProcessing ? 'Menyimpan...' : 'Simpan Artikel'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
// --- Akhir Modal Form ---

// --- Komponen Modal View (DIROMBAK: Menggunakan ReactMarkdown) ---
const ViewModal = ({ isOpen, onClose, article, isAdmin, onEdit, onDelete }: {
    isOpen: boolean,
    onClose: () => void,
    article: KnowledgeArticle | null,
    isAdmin: boolean,
    onEdit: (article: KnowledgeArticle) => void,
    onDelete: (id: string) => void
}) => {
    if (!isOpen || !article) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl bg-card border-border flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-foreground truncate pr-4">
                        {article.judul}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                        {article.kategori}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto -mx-6 px-6">
                    <div className="py-2">
                        {/* --- PEROMBAKAN UTAMA: Mengganti innerHTML dengan ReactMarkdown --- */}
                        <article className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {article.konten}
                            </ReactMarkdown>
                        </article>
                        {/* --- AKHIR PEROMBAKAN --- */}
                        
                        {article.attachmentUrl && (
                            <Button asChild variant="default" size="sm" className="bg-green-600 hover:bg-green-700 my-4 no-underline">
                                <a href={article.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                    <LinkIcon size={16} className="mr-2" />
                                    Buka Dokumen Lampiran
                                </a>
                            </Button>
                        )}
                    </div>
                </ScrollArea>
                {isAdmin && (
                    <DialogFooter className="mt-6 p-4 border-t border-border sticky bottom-0 bg-muted/50">
                        <Button variant="outline" onClick={() => onEdit(article)}><Edit size={16} className="mr-2"/> Edit</Button>
                        <Button variant="destructive" onClick={() => onDelete(article.id!)}><Trash2 size={16} className="mr-2"/> Hapus</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};
// --- Akhir Modal View ---

// --- Komponen Utama Halaman (Logika tidak berubah, hanya perbaikan UI) ---
export default function KnowledgeBasePage() {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    
    // State Data
    const [localOpdList, setLocalOpdList] = useState<OPD[]>([]);
    const [opdArticles, setOpdArticles] = useState<KnowledgeArticle[]>([]);
    const [sharedArticles, setSharedArticles] = useState<KnowledgeArticle[]>([]);
    
    // State UI
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [isBantuanOpen, setIsBantuanOpen] = useState(false);
    
    // State Modal
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // State Data Modal
    const [articleToEdit, setArticleToEdit] = useState<KnowledgeArticle | null>(null);
    const [viewingArticle, setViewingArticle] = useState<KnowledgeArticle | null>(null);
    const [formState, setFormState] = useState({ judul: '', kategori: '', konten: '', attachmentUrl: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedOpds, setSelectedOpds] = useState<string[]>([]);

    const isAdmin = useMemo(() => userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu' || userProfile?.role === 'super_admin', [userProfile]);

     const fetchArticles = useCallback(async () => {
        if (!userProfile?.opdId) return;
        setLoading(true);
        try {
            const qOpd = query(collection(db, 'knowledgeBase'), where('opdId', '==', userProfile.opdId), orderBy('lastUpdatedAt', 'desc'));
            const snapOpd = await getDocs(qOpd);
            setOpdArticles(snapOpd.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeArticle)));

            const qShared = query(collection(db, 'knowledgeBase'), where('sharedWithOpdIds', 'array-contains', userProfile.opdId), orderBy('lastUpdatedAt', 'desc'));
            const snapShared = await getDocs(qShared);
            setSharedArticles(snapShared.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeArticle)));

            if (userProfile.role === 'super_admin') {
                const opdSnapshot = await getDocs(collection(db, 'opd'));
                setLocalOpdList(opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD)));
            }
        } catch (error) {
            console.error("Error fetching articles:", error);
            addToast("Gagal memuat artikel.", "error");
        } finally {
            setLoading(false);
        }
    }, [userProfile, addToast]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const articles = useMemo(() => {
        const all = [...opdArticles, ...sharedArticles];
        return Array.from(new Map(all.map(a => [a.id, a])).values());
    }, [opdArticles, sharedArticles]);

    const categories = useMemo(() => {
        const allCategories = articles.map(a => a.kategori);
        // Pastikan "Tutorial Aplikasi" selalu ada di daftar
        allCategories.push("Tutorial Aplikasi");
        return ['Semua', ...Array.from(new Set(allCategories))];
    }, [articles]);

    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            const matchCategory = selectedCategory === 'Semua' || article.kategori.toLowerCase() === selectedCategory.toLowerCase();
            const matchSearch = searchTerm === '' || 
                article.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
                article.konten.toLowerCase().includes(searchTerm.toLowerCase());
            return matchCategory && matchSearch;
        });
    }, [articles, searchTerm, selectedCategory]);

    // DIROMBAK: Mengelompokkan berdasarkan kategori
    const groupedArticles = useMemo(() => {
        return filteredArticles.reduce((acc, article) => {
            const category = article.kategori || 'Lainnya';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(article);
            return acc;
        }, {} as Record<string, KnowledgeArticle[]>);
    }, [filteredArticles]);

    const sortedOpdList = useMemo(() => {
        const indukOpds = localOpdList.filter(opd => opd.tipe === 'Induk').sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
        const sortedList: (OPD & { indent?: boolean })[] = [];
        indukOpds.forEach(induk => {
            sortedList.push(induk);
            const subOpds = localOpdList.filter(opd => opd.idOpdInduk === induk.id).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
            subOpds.forEach(sub => sortedList.push({ ...sub, indent: true }));
        });
        return sortedList;
    }, [localOpdList]);

    const openFormModal = (article: KnowledgeArticle | null = null) => {
        setArticleToEdit(article);
        setFormState(article ? { judul: article.judul, kategori: article.kategori, konten: article.konten, attachmentUrl: article.attachmentUrl || '' } : { judul: '', kategori: 'Tutorial Aplikasi', konten: '', attachmentUrl: '' });
        setSelectedOpds(article?.sharedWithOpdIds || []);
        setIsFormModalOpen(true);
        setIsViewModalOpen(false);
    };

    const openViewModal = (article: KnowledgeArticle) => {
        setViewingArticle(article);
        setIsViewModalOpen(true);
    };

    const handleOpdCheckChange = (opd: OPD) => {
        const opdId = opd.id!;
        const isSelecting = !selectedOpds.includes(opdId);
        let newSelectedOpds: string[];
        if (isSelecting) { newSelectedOpds = [...selectedOpds, opdId]; } 
        else { newSelectedOpds = selectedOpds.filter(id => id !== opdId); }
        if (opd.tipe === 'Induk') {
            const subOpdIds = localOpdList.filter(sub => sub.idOpdInduk === opdId).map(sub => sub.id!);
            if (isSelecting) { newSelectedOpds = [...newSelectedOpds, ...subOpdIds]; } 
            else { newSelectedOpds = newSelectedOpds.filter(id => !subOpdIds.includes(id)); }
        }
        setSelectedOpds(Array.from(new Set(newSelectedOpds)));
    };
    
    const handleSelectAll = () => { setSelectedOpds(localOpdList.map(opd => opd.id!)); };
    const handleDeselectAll = () => { setSelectedOpds([]); };

    const handleSaveArticle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || !formState.judul || !formState.kategori || !formState.konten) {
            addToast("Harap isi semua kolom wajib.", "error");
            return;
        }
        setIsProcessing(true);
        try {
            const superAdminPayload = userProfile.role === 'super_admin' ? { sharedWithOpdIds: selectedOpds } : {};
            
            const payload = {
                judul: formState.judul,
                kategori: formState.kategori,
                konten: formState.konten,
                attachmentUrl: formState.attachmentUrl || null, 
                lastUpdatedAt: Timestamp.now(),
                ...superAdminPayload
            };

            if (articleToEdit) {
                const articleRef = doc(db, 'knowledgeBase', articleToEdit.id!);
                await updateDoc(articleRef, payload);
                addToast('Artikel berhasil diperbarui.', 'success');
            } else {
                await addDoc(collection(db, 'knowledgeBase'), {
                    ...payload,
                    opdId: userProfile.opdId,
                    createdBy: userProfile.uid,
                    createdAt: Timestamp.now(),
                });
                addToast('Artikel baru berhasil dibuat.', 'success');
            }
            setIsFormModalOpen(false);
            setSelectedOpds([]); 
            fetchArticles(); 
        } catch (error) {
            console.error("Gagal menyimpan artikel:", error);
            addToast("Gagal menyimpan artikel.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteArticle = async (id: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus artikel ini?")) {
            try {
                await deleteDoc(doc(db, 'knowledgeBase', id));
                if(viewingArticle?.id === id) { setIsViewModalOpen(false); }
                fetchArticles();
                addToast('Artikel berhasil dihapus.', 'success');
            } catch (error) {
                console.error("Gagal menghapus artikel:", error);
                addToast("Gagal menghapus artikel.", "error");
            }
        }
    };
    
    // Helper untuk ikon kategori
    const getCategoryIcon = (kategori: string) => {
        if (kategori.toLowerCase().includes('tutorial')) return <LifeBuoy className="text-blue-500" />;
        if (kategori.toLowerCase().includes('sop')) return <FileQuestion className="text-orange-500" />;
        return <BookText className="text-gray-500" />;
    };
    
    return (
        <div className="animate-fadeInUp">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <HelpCircle size={28} className="mr-3 text-blue-600" />
                        Pusat Bantuan (Knowledge Base)
                    </h1>
                    <Button variant="ghost" size="icon" onClick={() => setIsBantuanOpen(true)} title="Bantuan" className="text-muted-foreground hover:text-primary">
                        <HelpCircle size={20} />
                    </Button>
                </div>
                {isAdmin && (
                    <Button onClick={() => openFormModal(null)}>
                        <Plus size={18} className="mr-2" /> Buat Artikel Baru
                    </Button>
                )}
            </div>

            {/* --- DIROMBAK: Filter/Search Bar --- */}
            <Card className="shadow-sm border-border mb-6">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative md:col-span-2">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                        <Input type="text" placeholder="Cari berdasarkan judul atau konten..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
                    </div>
                    <div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            {/* --- AKHIR DIROMBAK --- */}

            {loading ? <p className="text-center p-8 text-muted-foreground">Memuat artikel...</p> : (
            <div className="space-y-8">
                {Object.keys(groupedArticles).length > 0 ? Object.keys(groupedArticles).sort().map(kategori => (
                    <section key={kategori}>
                        {/* --- DIROMBAK: Tampilan Judul Kategori --- */}
                        <div className="flex items-center gap-3 mb-4 border-b-2 border-border pb-2">
                            {getCategoryIcon(kategori)}
                            <h2 className="text-xl font-bold text-foreground">{kategori}</h2>
                        </div>
                        {/* --- AKHIR DIROMBAK --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedArticles[kategori].map(article => (
                                // --- DIROMBAK: Tampilan Kartu Artikel ---
                                <Card 
                                    key={article.id} 
                                    className="group flex flex-col justify-between transition-all hover:shadow-lg hover:border-primary cursor-pointer h-full" 
                                    onClick={() => openViewModal(article)}
                                >
                                    <CardHeader>
                                        <CardTitle className="text-lg leading-tight line-clamp-2">{article.judul}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {/* Strip Markdown untuk preview */}
                                            {article.konten.replace(/(\*\*|__|\*|_|\[.*\]\(.*\))/g, "").substring(0, 120)}...
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex justify-between items-end">
                                        <span className="text-xs text-muted-foreground">
                                            {article.attachmentUrl && <LinkIcon size={12} className="inline mr-1" />}
                                            Diperbarui: {article.lastUpdatedAt.toDate().toLocaleDateString('id-ID')}
                                        </span>
                                        {isAdmin && (userProfile?.role === 'super_admin' || userProfile?.opdId === article.opdId) && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openFormModal(article); }} title="Edit">
                                                    <Edit size={16}/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteArticle(article.id!); }} title="Hapus">
                                                    <Trash2 size={16}/>
                                                </Button>
                                            </div>
                                        )}
                                    </CardFooter>
                                </Card>
                                // --- AKHIR DIROMBAK ---
                            ))}
                        </div>
                    </section>
                )) : (
                    <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                        <p className="font-semibold">Tidak ada artikel ditemukan</p>
                        <p className="text-sm">Tidak ada artikel yang cocok dengan pencarian Anda.</p>
                    </div>
                )}
            </div>
          )}

            <FormModal 
                isOpen={isFormModalOpen} 
                onClose={() => { setIsFormModalOpen(false); setSelectedOpds([]); }} 
                formState={formState}
                setFormState={setFormState}
                onSave={handleSaveArticle}
                articleToEdit={articleToEdit} 
                existingCategories={categories.filter(c => c !== 'Semua')}
                isProcessing={isProcessing}
                userProfile={userProfile}
                opdList={sortedOpdList}
                selectedOpds={selectedOpds}
                onOpdCheckChange={handleOpdCheckChange}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
            />
            
            <ViewModal 
                isOpen={isViewModalOpen} 
                onClose={() => setIsViewModalOpen(false)} 
                article={viewingArticle} 
                isAdmin={isAdmin && (userProfile?.role === 'super_admin' || userProfile?.opdId === viewingArticle?.opdId)}
                onEdit={openFormModal} 
                onDelete={handleDeleteArticle} 
            />

             <BantuanHalamanModal isOpen={isBantuanOpen} onClose={() => setIsBantuanOpen(false)} />
        </div>
    );
}