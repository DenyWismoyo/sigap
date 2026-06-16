// Lokasi: src/app/dashboard/notulensi/page.tsx
// [MODIFIKASI INTEGRASI]
// - Mengimpor 'NotulensiFormModal' dari komponen terpisah agar bisa disharing.
// - Kode menjadi lebih bersih.

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase'; 
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext'; 
import { NotulensiRapat, Tugas, UserProfile } from '@/types'; 
import { 
    Plus, ListChecks, Search, Edit, Trash2, Send, Eye, FileDown, 
    HelpCircle, MoreVertical,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Loader2
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import ConfirmModal from '@/app/dashboard/components/ConfirmModal'; 
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import FormTugas from '@/app/dashboard/tugas/components/FormTugas';

// [BARU] Import komponen modal yang sudah diekstrak
import NotulensiFormModal from './components/NotulensiFormModal';

// --- Impor Library Eksternal ---
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// --- Akhir Impor Shadcn ---


// --- Komponen Modal Bantuan ---
const BantuanHalamanModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <HelpCircle className="mr-3 text-blue-600" />
                        Bantuan: Notulensi Rapat
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                  <div className="space-y-4 text-foreground/90">
                      <h3 className="font-semibold text-lg text-foreground">Apa Kegunaan Menu Ini?</h3>
                      <p>Menu "Notulensi Rapat" adalah fitur untuk membuat, menyimpan, dan melihat risalah atau catatan hasil rapat secara digital. Fitur ini dilengkapi "AI Assistant" untuk membantu Anda menyusun draf notulensi dari catatan mentah.</p>
                      
                      <h3 className="font-semibold text-lg text-foreground">Cara Menggunakan:</h3>
                      <ol className="list-decimal list-inside space-y-2">
                          <li><strong>Membuat Notulensi Baru:</strong>
                              <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                  <li>Klik tombol "Buat Notulensi".</li>
                                  <li>Isi detail rapat seperti Judul, Tanggal, Pemimpin, Notulis, dan daftar Peserta (pisahkan per baris).</li>
                                  <li><strong>Fitur Baru:</strong> Tulisan Anda di kolom "Isi Notulensi" akan tersimpan otomatis sebagai draf jika Anda tidak sengaja menutup modal.</li>
                              </ul>
                          </li>
                          {/* ... konten bantuan lainnya ... */}
                      </ol>
                  </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Saya Mengerti</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// --- Komponen Modal Detail Notulensi (Tidak Berubah) ---
const NotulensiDetailModal = ({ isOpen, onClose, notulensi, onEdit, onDelete, onConvertToTugas }: { 
    isOpen: boolean, 
    onClose: () => void, 
    notulensi: NotulensiRapat | null, 
    onEdit: (n: NotulensiRapat) => void, 
    onDelete: (id: string) => void,
    onConvertToTugas: (text: string) => void
}) => {
    const { userProfile } = useUserAuth();
    if (!isOpen || !notulensi) return null;

    const canManage = userProfile?.uid === notulensi.createdBy;

    const { mainContent, actionItems } = useMemo(() => {
        const content = notulensi.isiNotulensi || '';
        const tindakLanjutRegex = /^(?:\n)?\*\*(Tindak Lanjut|Action Items)(?:\s\(Action Items\))?\*\*(?:\n)?/im;
        const splitContent = content.split(tindakLanjutRegex);
        const main = splitContent[0] || content; 
        const actionsRaw = splitContent[2] || '';
        const actionItemRegex = /-\s\[\s\]\s(.*?)(?=\n- \[ \]|\n\n|\n\*|$)/g;
        const items: string[] = [];
        let match;
        while ((match = actionItemRegex.exec(actionsRaw)) !== null) {
            items.push(match[1].trim());
        }
        return { mainContent: main, actionItems: items };
    }, [notulensi.isiNotulensi]);

    const handleExportToWord = async () => {
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "NOTULENSI RAPAT",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        text: notulensi.judulRapat,
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                    new Paragraph({ text: `Tanggal Rapat:\t${notulensi.tanggalRapat.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` }),
                    new Paragraph({ text: `Pemimpin Rapat:\t${notulensi.pemimpinRapat}` }),
                    new Paragraph({ text: `Notulis:\t\t${notulensi.notulis}`, spacing: { after: 200 } }),
                    
                    new Paragraph({
                        text: "Peserta Rapat:",
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 200, after: 100 },
                    }),
                    ...notulensi.peserta.split('\n').map(peserta => new Paragraph({ text: peserta.trim(), bullet: { level: 0 } })),
                    
                    new Paragraph({
                        text: "Isi Pembahasan & Keputusan:",
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 400, after: 100 },
                    }),
                    ...mainContent.split('\n').map(line => {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                            return new Paragraph({
                                children: [new TextRun({ text: trimmedLine.slice(2, -2), bold: true })],
                                spacing: { before: 150 },
                            });
                        }
                        if (trimmedLine.startsWith('- ')) {
                             return new Paragraph({ text: trimmedLine.substring(2), bullet: { level: 0 } });
                        }
                         if (trimmedLine.startsWith('---')) {
                             return new Paragraph({ text: '', border: { bottom: { color: "auto", space: 1, style: "single", size: 6 } }, spacing: { before: 200, after: 200 }});
                         }
                        return new Paragraph(trimmedLine);
                    }),
                    new Paragraph({
                        text: "Tindak Lanjut (Action Items):",
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 400, after: 100 },
                    }),
                    ...(actionItems.length > 0
                        ? actionItems.map(item => new Paragraph({ text: item, bullet: { level: 0 } }))
                        : [new Paragraph({ children: [new TextRun({ text: "(Tidak ada)", italics: true })] })]
                    ),
                ],
            }],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Notulensi - ${notulensi.judulRapat}.docx`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-card border-border flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-foreground truncate pr-4">
                        {notulensi.judulRapat}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto -mx-6 px-6">
                    <div className="py-2">
                        <article className="prose prose-sm dark:prose-invert max-w-none">
                            <p><strong>Tanggal:</strong> {notulensi.tanggalRapat.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p><strong>Pemimpin:</strong> {notulensi.pemimpinRapat}</p>
                            <p><strong>Notulis:</strong> {notulensi.notulis}</p>
                            <h4>Peserta:</h4>
                            <ul className="list-disc pl-5">
                                {notulensi.peserta.split('\n').map((p, i) => p.trim() && <li key={i}>{p.trim()}</li>)}
                            </ul>
                            <hr />
                            
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {mainContent}
                            </ReactMarkdown>
                        </article>

                        {actionItems.length > 0 && (
                            <div className="mt-6 not-prose">
                                <h4 className="text-lg font-semibold text-foreground mb-3">Tindak Lanjut (Action Items)</h4>
                                <div className="space-y-2">
                                    {actionItems.map((item, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted rounded-md border border-border">
                                            <p className="text-sm text-foreground flex-1">
                                                <span className="font-mono text-muted-foreground mr-2">{index + 1}.</span>
                                                {item}
                                            </p>
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                onClick={() => onConvertToTugas(item)}
                                                className="shrink-0"
                                            >
                                                <Send size={14} className="mr-2"/> Jadikan Tugas
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="p-4 border-t border-border">
                    {canManage && (
                      <>
                        <Button variant="outline" onClick={() => onEdit(notulensi)}><Edit size={16} className="mr-2"/> Edit</Button>
                        <Button variant="destructive" onClick={() => onDelete(notulensi.id!)}><Trash2 size={16} className="mr-2"/> Hapus</Button>
                      </>
                    )}
                    <Button variant="default" onClick={handleExportToWord}><FileDown size={16} className="mr-2"/> Export ke Word</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
// --- Akhir Modal Detail ---

// --- Pilihan Item per Halaman ---
const ITEMS_PER_PAGE_OPTIONS = [9, 18, 27, 54];

// --- Komponen Utama Halaman ---
export default function NotulensiPage() {
    const { userProfile, opdConfig, loading: authLoading } = useUserAuth(); 
    const { addToast } = useToast();
    const { theme } = useTheme(); 
    
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [notulensiList, setNotulensiList] = useState<NotulensiRapat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9); // Default 9 untuk layout grid (3x3)

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedNotulensi, setSelectedNotulensi] = useState<NotulensiRapat | null>(null);
    const [notulensiToEdit, setNotulensiToEdit] = useState<NotulensiRapat | null>(null);
    const [isProcessing, setIsProcessing] = useState(false); 

    const [isBantuanOpen, setIsBantuanOpen] = useState(false);

    const [localUserCache, setLocalUserCache] = useState<Map<string, UserProfile>>(new Map());
    const [isCacheLoading, setIsCacheLoading] = useState(true);

    const [isTugasModalOpen, setIsTugasModalOpen] = useState(false);
    const [tugasInitialData, setTugasInitialData] = useState<{ judulTugas: string; deskripsi: string; } | undefined>(undefined);
    
    const [urlInitialData, setUrlInitialData] = useState<any>(null);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isProcessing: false, 
    });

    // User umum pun boleh membuat notulensi
    const canCreate = userProfile?.role === 'user' || userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu' || userProfile?.role === 'super_admin';

    // --- Cache Fetch ---
    useEffect(() => {
        if (userProfile?.opdId && localUserCache.size === 0 && !authLoading) {
          const fetchLocalCache = async () => {
            setIsCacheLoading(true);
            try {
              const usersInOpdQuery = query(collection(db, "users"), where("opdId", "==", userProfile.opdId));
              const usersSnapshot = await getDocs(usersInOpdQuery);
              const userCacheMap = new Map<string, UserProfile>();
              usersSnapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() } as UserProfile;
                if (user.jabatanId) {
                  userCacheMap.set(user.jabatanId, user); 
                }
              });
              setLocalUserCache(userCacheMap);
            } catch (err) {
              console.error("Gagal fetch local user cache for NotulensiPage:", err);
            } finally {
              setIsCacheLoading(false);
            }
          };
          fetchLocalCache();
        } else if (localUserCache.size > 0 || authLoading) {
            setIsCacheLoading(false);
        }
    }, [userProfile, authLoading, localUserCache.size]);

    // --- Notulensi Fetch ---
    const fetchNotulensi = useCallback(async () => {
        if (!userProfile?.opdId) return;
        setLoading(true);
        try {
            // Fetch semua data dulu (client-side pagination)
            const q = query(collection(db, 'notulensi'), where('opdId', '==', userProfile.opdId), orderBy('tanggalRapat', 'desc'));
            const snapshot = await getDocs(q);
            setNotulensiList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotulensiRapat)));
        } catch (error) {
            console.error("Error fetching notulensi:", error);
        } finally {
            setLoading(false);
        }
    }, [userProfile?.opdId]);

    useEffect(() => {
        fetchNotulensi();
    }, [fetchNotulensi]);
    
    // --- URL Init Effect ---
    useEffect(() => {
        const buatBaru = searchParams.get('buat_baru');
        const data = searchParams.get('data');
        
        if (buatBaru === 'true' && data && userProfile) {
            try {
                const initialData = JSON.parse(decodeURIComponent(data));
                setUrlInitialData(initialData); // Simpan ke state agar bisa di-pass ke modal
                setNotulensiToEdit(null); 
                setIsFormOpen(true); 
                router.replace('/dashboard/notulensi', undefined); 
            } catch (e) {
                console.error("Gagal parse data notulensi dari URL", e);
                router.replace('/dashboard/notulensi', undefined);
            }
        }
    }, [searchParams, userProfile, router]);

    const handleSaveNotulensi = async (formData: any, isEditing: boolean) => {
        if (!userProfile) return;
        setIsProcessing(true);
        const payload = {
            ...formData,
            tanggalRapat: Timestamp.fromDate(new Date(formData.tanggalRapat)),
        };
        try {
            if (isEditing && notulensiToEdit?.id) {
                const notulensiRef = doc(db, 'notulensi', notulensiToEdit.id);
                await updateDoc(notulensiRef, payload);
                addToast("Notulensi berhasil diperbarui.", "success");
            } else {
                const finalPayload = {
                    ...payload,
                    opdId: userProfile.opdId,
                    createdBy: userProfile.uid,
                    createdAt: Timestamp.now(),
                };
                await addDoc(collection(db, 'notulensi'), finalPayload);
                addToast("Notulensi berhasil dibuat.", "success");
            }
            setIsFormOpen(false);
            setNotulensiToEdit(null);
            fetchNotulensi();
        } catch (error) {
            console.error("Gagal menyimpan:", error);
            addToast("Gagal menyimpan notulensi.", "error");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDeleteNotulensi = (id: string) => {
        const notulensiToDelete = notulensiList.find(n => n.id === id);
        if (!notulensiToDelete) return;
        setConfirmModal({
            isOpen: true,
            title: 'Konfirmasi Hapus Notulensi',
            message: `Apakah Anda yakin ingin menghapus notulensi untuk rapat "${notulensiToDelete.judulRapat}"? Tindakan ini tidak dapat diurungkan.`,
            isProcessing: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({...prev, isProcessing: true}));
                try {
                    await deleteDoc(doc(db, 'notulensi', id));
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, isProcessing: false });
                    setIsDetailOpen(false); 
                    fetchNotulensi();
                    addToast("Notulensi dihapus.", "success");
                } catch (error) {
                    console.error("Gagal menghapus notulensi:", error);
                    addToast("Gagal menghapus notulensi.", "error");
                    setConfirmModal(prev => ({...prev, isProcessing: false}));
                }
            }
        });
    };

    const filteredNotulensi = useMemo(() => {
        return notulensiList.filter(n => 
            n.judulRapat.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [notulensiList, searchTerm]);

    // Reset ke halaman 1 jika search berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // --- LOGIKA PAGINATION ---
    const totalItems = filteredNotulensi.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const paginatedNotulensi = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredNotulensi.slice(startIndex, endIndex);
    }, [filteredNotulensi, currentPage, itemsPerPage]);

    const goToFirstPage = () => setCurrentPage(1);
    const goToLastPage = () => setCurrentPage(totalPages);
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    const handleOpenForm = (notulensi: NotulensiRapat | null) => {
        setNotulensiToEdit(notulensi);
        setUrlInitialData(null);
        setIsFormOpen(true);
        setIsDetailOpen(false);
    };

    const handleViewDetail = (notulensi: NotulensiRapat) => {
        setSelectedNotulensi(notulensi);
        setIsDetailOpen(true);
    };

    const handleConvertToTugas = (teksTindakLanjut: string) => {
      if (!selectedNotulensi) return;
      setTugasInitialData({
        judulTugas: `Tindak Lanjut Rapat: ${selectedNotulensi.judulRapat}`,
        deskripsi: teksTindakLanjut
      });
      setIsTugasModalOpen(true);
      setIsDetailOpen(false); 
    };

    return (
        <div className="animate-fadeInUp pb-20 md:pb-0">
            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <ListChecks size={28} className="mr-3 text-blue-600"/>Notulensi Rapat
                    </h1>
                    <Button variant="ghost" size="icon" onClick={() => setIsBantuanOpen(true)} title="Bantuan" className="text-muted-foreground hover:text-primary">
                        <HelpCircle size={20} />
                    </Button>
                </div>
                {/* Tombol Buat Notulensi Menonjol */}
                {canCreate && (
                    <Button onClick={() => handleOpenForm(null)} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 shadow-md">
                        <Plus size={18} className="mr-2" /> Buat Notulensi
                    </Button>
                )}
            </div>

            {/* --- Search & Filter Bar --- */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <Input 
                        type="text" 
                        placeholder="Cari judul rapat..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-10"
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Per halaman:</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(v) => {
                            setItemsPerPage(Number(v));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                            {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* --- Content Grid --- */}
            {(loading || isCacheLoading) ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
                    <p>Memuat notulensi...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedNotulensi.length > 0 ? paginatedNotulensi.map(notulensi => (
                            <Card 
                                key={notulensi.id} 
                                className="group flex flex-col justify-between transition-all hover:shadow-lg hover:border-primary cursor-pointer" 
                                onClick={() => handleViewDetail(notulensi)}
                            >
                                <CardHeader>
                                    <CardDescription className="text-xs">
                                        {notulensi.tanggalRapat.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </CardDescription>
                                    <CardTitle className="line-clamp-2 text-lg leading-tight">{notulensi.judulRapat}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {/* Strip markdown simple untuk preview */}
                                        {notulensi.isiNotulensi.replace(/[*_#]/g, '')}
                                    </p>
                                </CardContent>
                                <CardFooter className="flex justify-between items-end pt-0">
                                    <div className="text-xs text-muted-foreground">
                                        <span className="font-semibold">Notulis:</span> {notulensi.notulis.split(' ')[0]}
                                    </div>
                                    
                                    {userProfile?.uid === notulensi.createdBy && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => e.stopPropagation()} 
                                                >
                                                    <MoreVertical size={16}/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuItem onClick={() => handleOpenForm(notulensi)}>
                                                    <Edit size={14} className="mr-2"/> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteNotulensi(notulensi.id!)} className="text-destructive focus:text-destructive">
                                                    <Trash2 size={14} className="mr-2"/> Hapus
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </CardFooter>
                            </Card>
                        )) : (
                            <div className="md:col-span-3 text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                                <ListChecks size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                                <p className="font-semibold">{searchTerm ? "Tidak ada notulensi yang cocok." : "Belum ada notulensi rapat."}</p>
                                <p className="text-sm mt-1">Mulai buat notulensi pertama Anda dengan tombol di atas.</p>
                            </div>
                        )}
                    </div>

                    {/* --- Pagination Controls --- */}
                    {totalItems > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 py-4 border-t border-border">
                            <p className="text-sm text-muted-foreground text-center sm:text-left">
                                Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> dari <strong>{totalItems}</strong> notulensi
                            </p>
                            
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={goToFirstPage}
                                    disabled={currentPage === 1}
                                    title="Halaman Pertama"
                                >
                                    <ChevronsLeft size={16} />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                    title="Sebelumnya"
                                >
                                    <ChevronLeft size={16} />
                                </Button>
                                
                                <div className="flex items-center justify-center min-w-[80px] text-sm font-medium">
                                    Halaman {currentPage} / {totalPages}
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                    title="Selanjutnya"
                                >
                                    <ChevronRight size={16} />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={goToLastPage}
                                    disabled={currentPage === totalPages}
                                    title="Halaman Terakhir"
                                >
                                    <ChevronsRight size={16} />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
            
            {/* Floating Action Button (Mobile Only) */}
            <div className="md:hidden fixed bottom-20 right-6 z-40">
                <Button onClick={() => handleOpenForm(null)} className="w-14 h-14 rounded-full shadow-lg" size="icon">
                    <Plus size={28}/>
                </Button>
            </div>
            
            {/* Modals */}
            <NotulensiFormModal 
              isOpen={isFormOpen} 
              onClose={() => { setIsFormOpen(false); setNotulensiToEdit(null); }} 
              onSave={handleSaveNotulensi} 
              notulensiToEdit={notulensiToEdit}
              opdConfig={opdConfig}
              isProcessing={isProcessing}
              theme={theme} 
              initialData={urlInitialData} 
            />
            <NotulensiDetailModal 
              isOpen={isDetailOpen} 
              onClose={() => setIsDetailOpen(false)} 
              notulensi={selectedNotulensi} 
              onEdit={handleOpenForm} 
              onDelete={handleDeleteNotulensi}
              onConvertToTugas={handleConvertToTugas}
            />
            <FormTugas
                isOpen={isTugasModalOpen}
                onClose={() => setIsTugasModalOpen(false)}
                onSuccess={() => addToast("Tugas berhasil dibuat dari notulensi!", "success")}
                initialData={tugasInitialData}
                userCache={localUserCache} 
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false, isProcessing: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isProcessing={confirmModal.isProcessing}
            />
            <BantuanHalamanModal isOpen={isBantuanOpen} onClose={() => setIsBantuanOpen(false)} />
        </div>
    );
}