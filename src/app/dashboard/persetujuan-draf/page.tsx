// Lokasi: src/app/dashboard/persetujuan-draf/page.tsx
// [MODIFIKASI]
// - Mengganti modal kustom (.modal-backdrop) dengan <Dialog> shadcn/ui.
// - Mengganti form HTML standar dengan <Input>, <Label>, <Textarea>, <Button> shadcn/ui.
// - Mengganti pencarian atasan dengan <Popover> dan <Command> shadcn/ui.
// - Mengganti tab kustom dengan <Tabs> shadcn/ui.
// - Menggunakan <Alert> untuk info GDrive.
// - Memperbaiki path impor menggunakan alias '@'.
// [PERBAIKAN DARK MODE v6]
// - Mengganti semua kelas `dark:...` kustom dengan kelas semantik shadcn/ui.

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase'; // path @
import { 
    collection, query, where, onSnapshot, addDoc, doc, Timestamp, orderBy, getDocs, limit,
    QueryDocumentSnapshot, DocumentData, QuerySnapshot 
} from 'firebase/firestore'; 
import { useUserAuth } from '@/context/AuthContext'; // path @
import { DrafPersetujuan, ApprovalStep, RiwayatPersetujuan, Jabatan, BankTemplate, UserProfile } from '@/types'; // path @
import { FileSignature, Plus, Search, Users, Check, ExternalLink, Files, X, Send, RotateCcw, AlertCircle, Info, Building, FileSpreadsheet, Edit, HelpCircle, Loader2 } from 'lucide-react';
import Avatar from '@/app/dashboard/components/Avatar'; // path @
import { formatDateRelative } from '@/lib/utils'; // path @
import Link from 'next/link';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"; // path @
import { Button } from "@/components/ui/button"; // path @
import { Input } from "@/components/ui/input"; // path @
import { Label } from "@/components/ui/label"; // path @
import { Textarea } from "@/components/ui/textarea"; // path @
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // path @
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // path @
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"; // path @
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"; // path @
import { ScrollArea } from "@/components/ui/scroll-area"; // path @
// --- Akhir Impor Shadcn ---


// --- Komponen Modal Bantuan (Refactored) ---
const BantuanHalamanModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* [PERBAIKAN DARK MODE] */}
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <HelpCircle className="mr-3 text-blue-600" />
                        Bantuan: Persetujuan Dokumen Internal
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                    {/* [PERBAIKAN DARK MODE] */}
                    <div className="space-y-4 text-foreground/90">
                        <h3 className="font-semibold text-lg text-foreground">Apa Kegunaan Menu Ini?</h3>
                        <p>Menu "Persetujuan Dokumen Internal" adalah fitur untuk mengelola dan melacak proses persetujuan draf dokumen (seperti Nota Dinas, SK, atau Laporan) secara berjenjang sebelum dokumen tersebut final.</p>
                        <h3 className="font-semibold text-lg text-foreground">Cara Menggunakan:</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Memulai Persetujuan Baru:</strong>
                                <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                    <li>Klik tombol "Mulai Persetujuan Baru".</li>
                                    <li>Isi "Judul Draf" (Contoh: Draf SK Tim A).</li>
                                    <li>Tempel "Link Google Doc" draf Anda. Pastikan link diatur agar "Siapapun dengan link dapat memberi komentar".</li>
                                    <li>Anda bisa memilih "Bank Template" untuk mengisi link secara otomatis.</li>
                                    <li>Tambahkan "Alur Persetujuan" dengan mencari nama atasan Anda secara berurutan (dari level terendah ke tertinggi).</li>
                                    <li>Klik "Kirim untuk Persetujuan" untuk mengirim, atau "Simpan Draf" untuk menyimpan tanpa mengirim.</li>
                                </ul>
                            </li>
                            <li><strong>Menindaklanjuti (Untuk Pimpinan):</strong>
                                <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                    <li>Draf yang perlu persetujuan Anda akan muncul di tab "Perlu Persetujuan Saya".</li>
                                    <li>Klik pada draf tersebut untuk membukanya.</li>
                                    <li>Buka Google Doc, berikan komentar/sugesti di sana jika perlu.</li>
                                    <li>Kembali ke aplikasi SIGAP, lalu "Setujui & Teruskan" (jika sudah baik) atau "Kembalikan untuk Revisi" (jika perlu perbaikan, isi kolom komentar).</li>
                                </ul>
                            </li>
                            <li><strong>Menindaklanjuti (Untuk Pembuat Draf):</strong>
                                <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                    <li>Jika draf Anda dikembalikan (status "Perlu Revisi"), perbaiki draf di Google Doc.</li>
                                    <li>Setelah selesai, buka kembali draf di SIGAP dan klik "Kirim Ulang Hasil Revisi".</li>
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
};

// --- Komponen Modal Pilih Bank Template (Refactored) ---
const BankTemplateModal = ({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (template: BankTemplate) => void }) => {
    const { userProfile } = useUserAuth();
    const [templates, setTemplates] = useState<BankTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen || !userProfile) return;
        setLoading(true);
        const q1 = query(collection(db, 'bankTemplate'), where('opdId', '==', userProfile.opdId));
        const q2 = query(collection(db, 'bankTemplate'), where('sharedWithOpdIds', 'array-contains', userProfile.opdId));
        const unsub1 = onSnapshot(q1, (snap1) => {
            const opdTemplates = snap1.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankTemplate));
            setTemplates(prev => {
                const shared = prev.filter(p => p.opdId !== userProfile.opdId);
                const all = [...opdTemplates, ...shared];
                return Array.from(new Map(all.map(t => [t.id, t])).values());
            });
            setLoading(false);
        });
        const unsub2 = onSnapshot(q2, (snap2) => {
            const sharedTemplates = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankTemplate));
            setTemplates(prev => {
                const opd = prev.filter(p => p.opdId === userProfile.opdId);
                const all = [...opd, ...sharedTemplates];
                return Array.from(new Map(all.map(t => [t.id, t])).values());
            });
            setLoading(false);
        });
        return () => { unsub1(); unsub2(); };
    }, [isOpen, userProfile]);

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => 
            t.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.kategori.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [templates, searchTerm]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* [PERBAIKAN DARK MODE] */}
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Pilih dari Bank Template</DialogTitle>
                </DialogHeader>
                {/* [PERBAIKAN DARK MODE] */}
                <div className="border-b border-border pb-4">
                    <Input
                        type="text"
                        placeholder="Cari templat..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <ScrollArea className="max-h-96 -mx-6 px-6">
                    <div className="space-y-2">
                        {loading && <p>Memuat templat...</p>}
                        {!loading && filteredTemplates.length === 0 && <p>Tidak ada templat ditemukan.</p>}
                        {filteredTemplates.map(template => (
                            <Button
                                key={template.id}
                                variant="ghost"
                                onClick={() => onSelect(template)}
                                className="w-full justify-start h-auto"
                            >
                                <FileSpreadsheet size={20} className="text-blue-500 shrink-0 mr-3" />
                                <div className="flex-1 text-left">
                                    {/* [PERBAIKAN DARK MODE] */}
                                    <p className="font-semibold text-foreground">{template.judul}</p>
                                    <p className="text-xs text-muted-foreground">{template.kategori}</p>
                                </div>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

// --- Komponen Modal Form Pengajuan Draf (Refactored) ---
const FormPersetujuanModal = ({ isOpen, onClose, onSave, onCheckLink, userProfile, actingJabatanProfile, userCache }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (data: any, send: boolean) => Promise<void>,
    onCheckLink: (url: string) => boolean,
    userProfile: UserProfile | null,
    actingJabatanProfile: Jabatan | null,
    userCache: Map<string, UserProfile>
}) => {
    
    const [judul, setJudul] = useState('');
    const [googleDocUrl, setGoogleDocUrl] = useState('');
    const [approvalChain, setApprovalChain] = useState<ApprovalStep[]>([]);
    
    const [atasanSearch, setAtasanSearch] = useState('');
    const [atasanResults, setAtasanResults] = useState<UserProfile[]>([]);
    const [isAtasanLoading, setIsAtasanLoading] = useState(false);
    const [isAtasanPopoverOpen, setIsAtasanPopoverOpen] = useState(false);
    
    const [isBankTemplateModalOpen, setIsBankTemplateModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [linkError, setLinkError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setJudul('');
            setGoogleDocUrl('');
            setApprovalChain([]);
            setAtasanSearch('');
            setAtasanResults([]);
            setIsProcessing(false);
            setLinkError('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (atasanSearch.length < 2) {
            setAtasanResults([]);
            setIsAtasanLoading(false);
            return;
        }
        const fetchAtasan = async () => {
            if (!actingJabatanProfile) return;
            setIsAtasanLoading(true);
            const searchLower = atasanSearch.toLowerCase();
            const currentChainIds = new Set(approvalChain.map(step => step.jabatanId));
            const q = query(
                collection(db, 'users'),
                where('opdId', '==', actingJabatanProfile.opdId),
                where('level', '<', actingJabatanProfile.level),
                where('status', '==', 'aktif'),
                where('searchKeywords', 'array-contains', searchLower),
                limit(10)
            );
            try {
                const snapshot = await getDocs(q);
                const users = snapshot.docs.map(doc => doc.data() as UserProfile);
                setAtasanResults(users.filter(u => !currentChainIds.has(u.jabatanId)));
            } catch (error) { console.error("Error fetching atasan:", error); } 
            finally { setIsAtasanLoading(false); }
        };
        const debounce = setTimeout(fetchAtasan, 300);
        return () => clearTimeout(debounce);
    }, [atasanSearch, actingJabatanProfile, approvalChain]);

    const addStep = (user: UserProfile) => {
        setApprovalChain(prev => [...prev, {
            jabatanId: user.jabatanId!,
            namaJabatan: user.namaJabatan || 'Jabatan Tdk Ditemukan',
            status: 'Menunggu'
        }]);
        setAtasanSearch('');
        setAtasanResults([]);
        setIsAtasanPopoverOpen(false);
    };

    const removeStep = (jabatanId: string) => {
        setApprovalChain(prev => prev.filter(step => step.jabatanId !== jabatanId));
    };

    const handleSelectTemplate = (template: BankTemplate) => {
        setGoogleDocUrl(template.googleDriveUrl);
        setIsBankTemplateModalOpen(false);
    };

    const handleUrlBlur = () => {
        if (!onCheckLink(googleDocUrl)) {
            setLinkError("URL tidak valid. Pastikan link berisi '/copy' atau '/template/preview'.");
        } else {
            setLinkError('');
        }
    };

    const handleSubmit = async (send: boolean) => {
        if (!judul || !googleDocUrl || (send && approvalChain.length === 0)) {
            alert("Judul, Link Google Doc, dan minimal 1 Atasan di Alur Persetujuan wajib diisi untuk mengirim.");
            return;
        }
        if (linkError) {
            alert("Harap perbaiki URL Google Doc sebelum melanjutkan.");
            return;
        }
        setIsProcessing(true);
        const data = { judul, googleDocUrl, approvalChain };
        await onSave(data, send);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                {/* [PERBAIKAN DARK MODE] */}
                <DialogContent className="sm:max-w-3xl bg-card border-border flex flex-col max-h-[90vh] p-0 gap-0">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>{ "Mulai Persetujuan Draf Baru"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex flex-col overflow-hidden">
                        <ScrollArea className="flex-1 overflow-y-auto px-6">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="judul">Judul Draf</Label>
                                    <Input id="judul" type="text" value={judul} onChange={e => setJudul(e.target.value)} placeholder="Contoh: Draf SK Tim A" required autoFocus/>
                                </div>
                                <div>
                                    <Label htmlFor="gdoc-url">Link Google Doc</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id="gdoc-url"
                                            type="url" 
                                            value={googleDocUrl} 
                                            onChange={e => setGoogleDocUrl(e.target.value)} 
                                            onBlur={handleUrlBlur} 
                                            className={`${linkError ? 'border-red-500' : ''}`} 
                                            placeholder="Tempel link Google Doc..." 
                                            required 
                                        />
                                        <Button onClick={() => setIsBankTemplateModalOpen(true)} type="button" variant="outline" size="icon" title="Ambil dari Bank Template">
                                            <Files size={20} />
                                        </Button>
                                    </div>
                                    {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
                                    <Alert variant="default" className="mt-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700">
                                        <AlertCircle size={16} />
                                        <AlertDescription className="text-xs">
                                            **PENTING:** Pastikan link Google Doc diatur ke **"Siapapun dengan link dapat memberi komentar"**.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                                <div>
                                    <Label>Alur Persetujuan (Berjenjang)</Label>
                                    {/* [PERBAIKAN DARK MODE] */}
                                    <div className="p-3 border rounded-lg border-border space-y-2 min-h-[150px]">
                                        {approvalChain.map((step, index) => (
                                            <div key={step.jabatanId} className="flex items-center justify-between p-2 bg-muted rounded">
                                                <div className="flex items-center">
                                                    <span className="text-xs font-bold text-muted-foreground w-10">{index + 1}.</span>
                                                    <span>{userCache.get(step.jabatanId)?.namaLengkap || step.namaJabatan}</span>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeStep(step.jabatanId)}>
                                                    <X size={16}/>
                                                </Button>
                                            </div>
                                        ))}
                                        <Popover open={isAtasanPopoverOpen} onOpenChange={setIsAtasanPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Input 
                                                    type="text" 
                                                    value={atasanSearch} 
                                                    onChange={e => {
                                                        setAtasanSearch(e.target.value);
                                                        if (e.target.value.length >= 2) setIsAtasanPopoverOpen(true); else setIsAtasanPopoverOpen(false);
                                                    }}
                                                    placeholder="Cari atasan untuk ditambah..." 
                                                />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                <Command>
                                                    <CommandList>
                                                        {isAtasanLoading && <CommandEmpty>Mencari...</CommandEmpty>}
                                                        {!isAtasanLoading && atasanResults.length > 0 ? atasanResults.map(u => (
                                                            <CommandItem
                                                              key={u.uid}
                                                              onSelect={() => addStep(u)}
                                                              className="cursor-pointer"
                                                            >
                                                                <div>
                                                                    <p className="font-semibold text-sm">{u.namaLengkap}</p>
                                                                    {/* [PERBAIKAN DARK MODE] */}
                                                                    <p className="text-xs text-muted-foreground">{u.namaJabatan}</p>
                                                                </div>
                                                            </CommandItem>
                                                        )) : (
                                                          <CommandEmpty>{atasanSearch.length < 2 ? 'Ketik min 2 huruf' : 'Atasan tidak ditemukan.'}</CommandEmpty>
                                                        )}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                        {/* [PERBAIKAN DARK MODE] */}
                        <DialogFooter className="mt-6 p-4 flex justify-between bg-muted/50 border-t border-border sticky bottom-0">
                            <Button type="button" variant="outline" onClick={() => handleSubmit(false)} disabled={isProcessing}>
                                Simpan Draf
                            </Button>
                            <Button type="submit" onClick={() => handleSubmit(true)} disabled={isProcessing || approvalChain.length === 0}>
                                <Send size={16} className="mr-2"/> {isProcessing ? 'Mengirim...' : 'Kirim untuk Persetujuan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            <BankTemplateModal isOpen={isBankTemplateModalOpen} onClose={() => setIsBankTemplateModalOpen(false)} onSelect={handleSelectTemplate} />
        </>
    );
};
// --- Akhir Modal Form ---

// --- Komponen DrafCard (Refactored) ---
const DrafCard = ({ draf, userCache }: { draf: DrafPersetujuan, userCache: Map<string, UserProfile> }) => {
    
    const getStatusInfo = () => {
        switch (draf.status) {
            case 'Draf': return { text: 'Draf', color: 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300', icon: <Edit size={12} /> };
            case 'Proses Review':
                if (draf.approvalChain.length === 0 || draf.currentStep >= draf.approvalChain.length) {
                     return { text: 'Proses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: <Users size={12} /> };
                }
                const reviewer = draf.approvalChain[draf.currentStep];
                const reviewerName = userCache.get(reviewer.jabatanId)?.namaLengkap?.split(' ')[0] || reviewer.namaJabatan;
                return { text: `Menunggu: ${reviewerName}`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: <Users size={12} /> };
            case 'Revisi': return { text: 'Perlu Revisi', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300', icon: <RotateCcw size={12} /> };
            case 'Selesai': return { text: 'Selesai', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', icon: <Check size={12} /> };
            case 'Ditolak': return { text: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: <X size={12} /> };
            default: return { text: draf.status, color: 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300', icon: <Info size={12} /> };
        }
    };
    const statusInfo = getStatusInfo();

    return (
        <Link href={`/dashboard/persetujuan-draf/${draf.id}`}>
            {/* [PERBAIKAN DARK MODE] */}
            <div className="p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                    {/* [PERBAIKAN DARK MODE] */}
                    <p className="font-semibold text-foreground pr-4 line-clamp-2">{draf.judul}</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex items-center gap-1.5 ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.text}
                    </span>
                </div>
                {/* [PERBAIKAN DARK MODE] */}
                <div className="mt-2 text-xs text-muted-foreground">
                    {draf.pembuatNama ? `Oleh: ${draf.pembuatNama}` : (draf.createdAt && draf.createdAt.toDate ? 
                        `Diajukan pada: ${draf.createdAt.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}` : 
                        'Tanggal tidak valid'
                    )}
                </div>
            </div>
        </Link>
    );
};
// --- Akhir DrafCard ---

// --- Halaman Utama ---
export default function PersetujuanDrafPage() {
    const { userProfile, actingJabatanProfile, loading: authLoading } = useUserAuth();
    
    const [localUserCache, setLocalUserCache] = useState<Map<string, UserProfile>>(new Map());
    const [isCacheLoading, setIsCacheLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'perluPersetujuan' | 'drafSaya'>('perluPersetujuan');
    const [drafSayaList, setDrafSayaList] = useState<DrafPersetujuan[]>([]);
    const [perluPersetujuanList, setPerluPersetujuanList] = useState<DrafPersetujuan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [isBantuanOpen, setIsBantuanOpen] = useState(false);

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
                console.error("Gagal fetch local user cache for PersetujuanDrafPage:", err);
                } finally {
                setIsCacheLoading(false);
                }
            };
            fetchLocalCache();
        } else if (localUserCache.size > 0 || authLoading) { 
            setIsCacheLoading(false);
        }
    }, [userProfile, authLoading, localUserCache.size]); 


    useEffect(() => {
        if (!userProfile || !actingJabatanProfile) return;
        setLoading(true);
        const q1 = query(
            collection(db, 'drafPersetujuan'), 
            where('createdBy', '==', userProfile.uid),
            orderBy('createdAt', 'desc')
        );
        const unsub1 = onSnapshot(q1, (snap: QuerySnapshot<DocumentData>) => {
            setDrafSayaList(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as DrafPersetujuan)));
            setLoading(false);
        });

        const q2 = query(
            collection(db, 'drafPersetujuan'),
            where('penerimaTugasJabatanId', '==', actingJabatanProfile.id),
            where('status', '==', 'Proses Review'),
            orderBy('createdAt', 'desc')
        );
        const unsub2 = onSnapshot(q2, (snap: QuerySnapshot<DocumentData>) => {
            setPerluPersetujuanList(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as DrafPersetujuan)));
            setLoading(false);
        });

        return () => { unsub1(); unsub2(); };
    }, [userProfile, actingJabatanProfile]);

    const checkLinkValidity = (url: string): boolean => {
        if (!url || url.trim() === '') return false;
        return url.includes('/copy') || url.includes('/template/preview');
    };

    const handleSaveDraf = async (data: { judul: string, googleDocUrl: string, approvalChain: ApprovalStep[] }, send: boolean) => {
        if (!userProfile || !actingJabatanProfile) return;
        const { judul, googleDocUrl, approvalChain } = data;
        const status = send ? 'Proses Review' : 'Draf';
        const riwayatAwal: RiwayatPersetujuan = {
            timestamp: Timestamp.now(),
            actorName: `${userProfile.namaLengkap} (${actingJabatanProfile.namaJabatan})`,
            action: send ? 'Mengajukan' : 'Meneruskan', 
            comments: send ? 'Mengirim draf untuk persetujuan' : 'Draf disimpan'
        };
        const pembuatNama = localUserCache.get(actingJabatanProfile.id!)?.namaLengkap || userProfile.namaLengkap;
        const newDraf: Omit<DrafPersetujuan, 'id'> = {
            judul, googleDocUrl,
            opdId: userProfile.opdId,
            createdBy: userProfile.uid,
            pembuatNama: pembuatNama,
            createdAt: Timestamp.now(),
            status: status,
            currentStep: 0,
            approvalChain: approvalChain,
            approvalJabatanIds: approvalChain.map(step => step.jabatanId),
            riwayat: [riwayatAwal],
            penerimaTugasJabatanId: null, // [FIX] Awalnya null
        };
        // [FIX] Tetapkan penerimaTugasJabatanId jika 'send'
        if (send && approvalChain.length > 0) {
            newDraf.penerimaTugasJabatanId = approvalChain[0].jabatanId;
        }

        try {
            await addDoc(collection(db, 'drafPersetujuan'), newDraf as any); 
            setIsModalOpen(false);
        } catch (error) {
            console.error("Gagal menyimpan draf:", error);
            alert("Gagal menyimpan draf.");
        }
    };

    return (
        <div className="animate-fadeInUp">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    {/* [PERBAIKAN DARK MODE] */}
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <FileSignature size={28} className="mr-3 text-purple-600" />
                        Persetujuan Dokumen Internal
                    </h1>
                    {/* [PERBAIKAN DARK MODE] */}
                    <Button onClick={() => setIsBantuanOpen(true)} title="Bantuan" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <HelpCircle size={20} />
                    </Button>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="shrink-0">
                    <Plus size={18} className="mr-2" /> Mulai Persetujuan Baru
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="perluPersetujuan">
                        Perlu Persetujuan Saya
                        {perluPersetujuanList.length > 0 && <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">{perluPersetujuanList.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="drafSaya">Draf Saya ({drafSayaList.length})</TabsTrigger>
                </TabsList>
                
                {/* [PERBAIKAN DARK MODE] */}
                {(loading || authLoading || isCacheLoading) && <p className="text-center py-8 text-muted-foreground">Memuat draf...</p>}

                {!(loading || authLoading || isCacheLoading) && (
                    <>
                        <TabsContent value="perluPersetujuan" className="mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {perluPersetujuanList.length > 0 ? (
                                    perluPersetujuanList.map(draf => <DrafCard key={draf.id} draf={draf} userCache={localUserCache} />)
                                ) : (
                                    // [PERBAIKAN DARK MODE]
                                    <p className="md:col-span-3 text-center text-muted-foreground py-10">Tidak ada draf yang memerlukan persetujuan Anda saat ini.</p>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="drafSaya" className="mt-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {drafSayaList.length > 0 ? (
                                    drafSayaList.map(draf => <DrafCard key={draf.id} draf={draf} userCache={localUserCache} />)
                                ) : (
                                    // [PERBAIKAN DARK MODE]
                                    <p className="md:col-span-3 text-center text-muted-foreground py-10">Anda belum mengajukan draf apapun.</p>
                                )}
                            </div>
                        </TabsContent>
                    </>
                )}
            </Tabs>

            <FormPersetujuanModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveDraf}
                onCheckLink={checkLinkValidity}
                userProfile={userProfile}
                actingJabatanProfile={actingJabatanProfile}
                userCache={localUserCache}
            />
            <BantuanHalamanModal isOpen={isBantuanOpen} onClose={() => setIsBantuanOpen(false)} />
        </div>
    );
}