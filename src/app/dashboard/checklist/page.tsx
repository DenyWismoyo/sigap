// Lokasi: src/app/dashboard/checklist/page.tsx
// [PERBAIKAN 10/11/2025]
// - Melewatkan prop 'userCache' yang sekarang wajib di <FormTugas />.
// - Mengganti semua import alias '@/' menjadi path relatif '../' untuk memperbaiki build error.
// [PERBAIKAN ERROR BUILD 10/11/2025 v2]
// - Menghapus pengecekan 'uploader.uploadStatus === "authenticating"' karena tipe itu sudah tidak ada.

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '../../../lib/firebase'; // PERBAIKAN PATH
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, Timestamp, getDoc, setDoc, orderBy, getDocs } from 'firebase/firestore';
import { useUserAuth } from '../../../context/AuthContext'; // PERBAIKAN PATH
import { ChecklistBoard, ChecklistItem, LogbookKegiatan, LogbookHarian, Tugas, UserProfile } from '../../../types'; // PERBAIKAN PATH
import { Plus, Trash2, ClipboardList, Sparkles, Loader2, BookOpen, ChevronDown, ClipboardCheck, Send, MoreVertical, BrainCircuit, GripVertical, X, HelpCircle, Calendar, FileDown, ChevronLeft, ChevronRight, Edit, Link as LinkIcon, CheckSquare, Square, Save, ListChecks } from 'lucide-react';
import Link from 'next/link';
import FormTugas from '../tugas/components/FormTugas'; // PERBAIKAN PATH (tetap)
import { useGoogleDriveUploader, UploadStatus } from '../hooks/useGoogleDriveUploader'; // PERBAIKAN PATH (tetap)

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog"; // PERBAIKAN PATH
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"; // PERBAIKAN PATH
import { Button } from "../../../components/ui/button"; // PERBAIKAN PATH
import { Input } from "../../../components/ui/input"; // PERBAIKAN PATH
import { Label } from "../../../components/ui/label"; // PERBAIKAN PATH
import { Textarea } from "../../../components/ui/textarea"; // PERBAIKAN PATH
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert"; // PERBAIKAN PATH
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"; // PERBAIKAN PATH
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../components/ui/tabs"; // PERBAIKAN PATH
import { ScrollArea } from "../../../components/ui/scroll-area"; // PERBAIKAN PATH
import { Progress } from '../../../components/ui/progress'; // PERBAIKAN PATH
// --- Akhir Impor Shadcn ---


const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0]; 

type ItemStatus = 'Todo' | 'In Progress' | 'Done';

// --- Komponen Modal Bantuan (Refactored) ---
const BantuanHalamanModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <HelpCircle className="mr-3 text-blue-600" />
                        Bantuan: Checklist Pribadi Cerdas
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                  <div className="space-y-4 text-foreground/90">
                      {/* ... (Konten bantuan tetap sama) ... */}
                       <h3 className="font-semibold text-lg text-foreground">Apa Kegunaan Menu Ini?</h3>
                        <p>Menu "Checklist Pribadi" adalah alat bantu pribadi Anda (seperti Trello atau To-Do List) untuk mengelola pekerjaan sehari-hari. Anda bisa membuat "Papan" (Board) untuk setiap proyek atau topik, lalu mengisinya dengan "Item" (kartu) pekerjaan.</p>
                        <p>Menu ini bersifat <strong>pribadi</strong> dan tidak dapat dilihat oleh atasan atau rekan kerja, kecuali jika Anda mengubah item menjadi "Tugas" resmi.</p>
                        
                        <h3 className="font-semibold text-lg text-foreground">Cara Menggunakan:</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Membuat Papan (Board):</strong>
                                <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                    <li>Ketik nama proyek Anda (misal: "Persiapan Rapat Anggaran") di kotak "Buat Papan Baru", lalu klik tombol "+".</li>
                                    <li>Papan ini akan menjadi wadah untuk semua item pekerjaan Anda terkait proyek itu.</li>
                                </ul>
                            </li>
                            <li><strong>Menambah Item (Kartu):</strong>
                                <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                    <li>Di kolom "Todo", ketik item pekerjaan (misal: "Siapkan draf undangan") lalu tekan tombol "+".</li>
                                    <li>Gunakan tombol "AI" di sebelah form "Buat Papan Baru" untuk meminta AI memecah satu tujuan besar (misal: "Mengadakan rapat") menjadi beberapa item pekerjaan kecil secara otomatis.</li>
                                </ul>
                            </li>
                            <li><strong>Memindahkan Item:</strong>
                                <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                    <li><strong>Desktop:</strong> Klik dan seret (drag & drop) item dari "Todo" ke "In Progress" (saat dikerjakan), lalu ke "Done" (saat selesai).</li>
                                    <li><strong>Mobile:</strong> Klik tombol "Pindah" pada kartu item untuk memindahkannya antar kolom.</li>
                                </ul>
                            </li>
                            <li><strong>Integrasi (Paling Penting):</strong>
                                <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                                    <li><strong>Lapor ke Logbook:</strong> Setelah item ada di kolom "Done", klik tombol "Lapor" (ikon buku). Item ini akan otomatis tercatat di "Logbook Harian" Anda sebagai bukti kinerja.</li>
                                    <li><strong>Konversi ke Tugas:</strong> Jika item pekerjaan pribadi perlu didelegasikan, klik tombol "Tugas" (ikon kirim). Ini akan membuka form "Tugas Baru" dengan data yang sudah terisi, siap untuk ditugaskan ke staf Anda.</li>
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
// --- Akhir Modal Bantuan ---

// --- Komponen Modal Rekap Bulanan (Refactored) ---
interface RekapBulananModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile | null;
    uploader: {
        uploadFile: (file: File | Blob, fileName: string, customFolderId?: string | null) => Promise<string | null>;
        uploadStatus: UploadStatus;
        errorMessage: string;
        isReady: boolean;
    }
}
const RekapBulananModal = ({ isOpen, onClose, userProfile, uploader }: RekapBulananModalProps) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Format YYYY-MM
    const [rekapData, setRekapData] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            setRekapData('');
            setError('');
            setSuccess('');
            setIsGenerating(false);
            setIsUploading(false);
            setSelectedMonth(new Date().toISOString().slice(0, 7));
        }
    }, [isOpen]);

    const handleGenerateRekap = async () => {
        if (!userProfile) return;
        setIsGenerating(true);
        setError('');
        setSuccess('');
        setRekapData('');

        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const startDate = Timestamp.fromDate(new Date(year, month - 1, 1));
            const endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59)); // Hari terakhir di bulan itu

            const q = query(
                collection(db, 'logbookHarian'),
                where('userId', '==', userProfile.uid),
                where('tanggal', '>=', startDate),
                where('tanggal', '<=', endDate),
                orderBy('tanggal', 'asc')
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setRekapData("Tidak ada data kegiatan yang ditemukan untuk bulan ini.");
                return;
            }

            const monthName = new Date(year, month - 1).toLocaleString('id-ID', { month: 'long' });
            let rekapString = `LAPORAN KEGIATAN HARIAN (LOGBOOK)\n`;
            rekapString += `NAMA      : ${userProfile.namaLengkap.toUpperCase()}\n`;
            rekapString += `PERIODE   : ${monthName} ${year}\n`;
            rekapString += `===================================================\n\n`;

            snapshot.docs.forEach(doc => {
                const data = doc.data() as LogbookHarian;
                const tanggalStr = data.tanggal.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
                rekapString += `HARI/TANGGAL: ${tanggalStr}\n`;
                if (data.kegiatan.length === 0) {
                    rekapString += `- (Tidak ada kegiatan tercatat)\n`;
                } else {
                    data.kegiatan.forEach(keg => {
                        rekapString += `- [${keg.selesai ? 'SELESAI' : 'PROSES'}] ${keg.deskripsi}\n`;
                        if (keg.tugasTerkaitJudul) {
                            rekapString += `  (Terkait Tugas: ${keg.tugasTerkaitJudul})\n`;
                        }
                    });
                }
                rekapString += `\n`;
            });
            
            setRekapData(rekapString);

        } catch (err: any) {
            console.error(err);
            setError(`Gagal membuat rekap: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUploadRekap = async () => {
        if (!rekapData || !userProfile || !uploader.isReady) {
            setError("Rekap belum di-generate atau uploader belum siap.");
            return;
        }
        
        if (!userProfile.googleDriveReportLink) {
            setError("Folder Google Drive E-Kinerja Anda belum diatur. Harap atur di menu Profil.");
            return;
        }

        setIsUploading(true);
        setError('');
        setSuccess('');

        try {
            const rekapBlob = new Blob([rekapData], { type: 'text/plain;charset=utf-8' });
            const [year, month] = selectedMonth.split('-');
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('id-ID', { month: 'long' });
            const fileName = `Laporan_Logbook_${monthName}_${year}_${userProfile.namaLengkap.replace(/\s+/g, '_')}.txt`;

            const link = await uploader.uploadFile(rekapBlob, fileName, userProfile.googleDriveReportLink);

            if (link) {
                setSuccess(`Laporan berhasil diunggah ke Bukti Kinerja!`);
            } else {
                throw new Error(uploader.errorMessage || "Upload gagal tanpa pesan error.");
            }
        } catch (err: any) {
            console.error(err);
            setError(`Gagal mengunggah: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // [PERBAIKAN ERROR BUILD 10/11/2025] Hapus 'authenticating'
    const isLoading = isGenerating || isUploading || uploader.uploadStatus === 'uploading';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border flex flex-col max-h-[80vh]">
                <DialogHeader className="flex-shrink-0"> 
                    <DialogTitle>Rekapitulasi Logbook Bulanan</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-1 overflow-y-auto pr-6">
                    <div className="pt-4 space-y-4">
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        {success && <Alert variant="default" className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700"><AlertDescription>{success}</AlertDescription></Alert>}
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Label htmlFor="month-picker">Pilih Bulan & Tahun</Label>
                                <Input
                                    id="month-picker"
                                    type="month"
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(e.target.value)}
                                    disabled={isLoading}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex-shrink-0 sm:self-end">
                                <Button
                                    onClick={handleGenerateRekap}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    <Calendar size={16} className="mr-2" />
                                    {isGenerating ? 'Membuat...' : 'Generate Rekap'}
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="rekap-hasil">Hasil Rekapitulasi</Label>
                            <Textarea
                                id="rekap-hasil"
                                readOnly
                                value={rekapData}
                                placeholder="Klik 'Generate Rekap' untuk menampilkan data..."
                                rows={10}
                                className="mt-1 font-mono"
                            />
                        </div>
                    </div>
                </ScrollArea>
                
                <DialogFooter className="mt-4 pt-4 border-t border-border flex-shrink-0">
                    <Button
                        onClick={handleUploadRekap}
                        disabled={isLoading || !rekapData || !!success}
                        className="bg-green-600 hover:bg-green-700 w-full"
                    >
                        <FileDown size={16} className="mr-2" />
                        {isUploading ? 'Mengunggah...' : 'Upload ke Bukti Kinerja'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
// --- Akhir Modal Rekap ---

// --- Komponen ShortcutNav (Refactored) ---
const ShortcutNav = () => (
    <div className="mb-6 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-muted-foreground shrink-0">Akses Cepat:</span>
        <Button asChild variant="secondary" size="sm" className="rounded-full">
          <Link href="/dashboard/tugas"><ClipboardCheck size={14} /> Tugas</Link>
        </Button>
        <Button asChild variant="secondary" size="sm" className="rounded-full">
          <Link href="/dashboard/logbook"><BookOpen size={14} /> Logbook</Link>
        </Button>
    </div>
);

// --- Komponen MobileItemCard (Refactored) ---
const MobileItemCard = ({ item, onUpdateStatus, onDelete, onLogbook, onConvertToTugas }: { item: ChecklistItem, onUpdateStatus: (id: string, status: ItemStatus) => void, onDelete: (id: string) => void, onLogbook: (item: ChecklistItem) => void, onConvertToTugas: (item: ChecklistItem) => void }) => {
    
    const moveItem = (newStatus: ItemStatus) => {
        onUpdateStatus(item.id, newStatus);
    };

    return (
        <div className="bg-card p-3 rounded-md shadow-sm border border-border group">
            <p className="text-sm text-foreground">{item.teks}</p>
            <div className="flex justify-between items-center mt-2 gap-2">
                <div className="flex gap-2">
                    {item.status === 'Done' && (
                        <Button onClick={() => onLogbook(item)} variant="outline" size="sm" className="h-auto px-2 py-1 text-xs text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:bg-green-100">
                            <BookOpen size={14} className="mr-1"/> Lapor
                        </Button>
                    )}
                     <Button onClick={() => onConvertToTugas(item)} variant="outline" size="sm" className="h-auto px-2 py-1 text-xs text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 hover:bg-purple-100">
                        <Send size={14} className="mr-1"/> Tugas
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-auto px-2 py-1 text-xs">
                                Pindah <ChevronDown size={14} className="ml-1"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {item.status !== 'Todo' && <DropdownMenuItem onClick={() => moveItem('Todo')}>Ke "Todo"</DropdownMenuItem>}
                            {item.status !== 'In Progress' && <DropdownMenuItem onClick={() => moveItem('In Progress')}>Ke "Proses"</DropdownMenuItem>}
                            {item.status !== 'Done' && <DropdownMenuItem onClick={() => moveItem('Done')}>Ke "Selesai"</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => onDelete(item.id)} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600">
                        <Trash2 size={14}/>
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- Komponen AddItemModal (Mobile - Refactored) ---
const AddItemModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (text: string) => void }) => {
    const [text, setText] = useState('');
    
    useEffect(() => { if(isOpen) setText(''); }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                 <DialogHeader>
                    <DialogTitle>Tambah Item Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSave(text.trim()); } onClose(); }} className="flex gap-2 pt-2">
                    <Input 
                        type="text" 
                        value={text} 
                        onChange={e => setText(e.target.value)} 
                        placeholder="Tulis item baru..." 
                        autoFocus 
                    />
                    <Button type="submit" disabled={!text.trim()} size="icon">
                        <Send size={18}/>
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// --- Komponen AiModal (Refactored) ---
const AiModal = ({ isOpen, onClose, onGenerate }: { isOpen: boolean, onClose: () => void, onGenerate: (input: string) => Promise<void> }) => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    useEffect(() => {
        if(isOpen) {
            setInput('');
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setIsProcessing(true);
        await onGenerate(input.trim());
        onClose(); 
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <BrainCircuit size={20} className="mr-2 text-purple-500"/> AI Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Masukkan tujuan besar Anda, AI akan membantu memecahnya menjadi langkah-langkah kerja yang lebih kecil.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <Textarea 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder="Contoh: Menyelenggarakan rapat koordinasi persiapan acara 17 Agustus" 
                        rows={5}
                        autoFocus 
                    />
                    <Button onClick={handleGenerate} disabled={isProcessing || !input.trim()} className="w-full">
                        {isProcessing ? <Loader2 size={18} className="animate-spin mr-2"/> : <Sparkles size={16} className="mr-2"/>}
                        {isProcessing ? 'Memproses...' : 'Generate Langkah Kerja'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
// --- Akhir Modal AI ---


// --- Komponen Utama ---
export default function ChecklistPage() {
    const { userProfile, actingJabatanProfile, loading: authLoading } = useUserAuth();
    const uploader = useGoogleDriveUploader();
    const router = useRouter();
    const searchParams = useSearchParams();

    // [PERBAIKAN 10/11/2025] Tambahkan state cache
    const [localUserCache, setLocalUserCache] = useState<Map<string, UserProfile>>(new Map());
    const [isCacheLoading, setIsCacheLoading] = useState(true);

    const [boards, setBoards] = useState<ChecklistBoard[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [newBoardTitle, setNewBoardTitle] = useState('');

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isBantuanOpen, setIsBantuanOpen] = useState(false);
    const [isRekapOpen, setIsRekapOpen] = useState(false);

    const [isFormTugasOpen, setIsFormTugasOpen] = useState(false);
    const [initialTugasData, setInitialTugasData] = useState<{ judulTugas: string; deskripsi: string; } | undefined>(undefined);

    const [mobileTab, setMobileTab] = useState<ItemStatus>('Todo');
    const [isFabOpen, setIsFabOpen] = useState(false);

    const dragItem = useRef<string | null>(null);
    const dragOverItem = useRef<string | null>(null);
    const dragOverColumn = useRef<ItemStatus | null>(null);

    // [PERBAIKAN 10/11/2025] Tambahkan useEffect untuk fetch cache
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
              console.error("Gagal fetch local user cache for ChecklistPage:", err);
            } finally {
              setIsCacheLoading(false);
            }
          };
          fetchLocalCache();
        } else if (localUserCache.size > 0 || authLoading) {
            setIsCacheLoading(false);
        }
    }, [userProfile, authLoading, localUserCache.size]);


    const effectiveProfile = useMemo(() => localUserCache.get(actingJabatanProfile?.id!) || userProfile, [actingJabatanProfile, userProfile, localUserCache]);

    // Fungsi updateKegiatanList (untuk integrasi Logbook)
    const updateKegiatanList = async (kegiatanList: LogbookKegiatan[]) => {
        if (!effectiveProfile) return;

        const today = new Date();
        const dateStr = toYYYYMMDD(today);
        const docId = `${effectiveProfile.uid}_${dateStr}`;
        const docRef = doc(db, 'logbookHarian', docId);

        try {
            const docSnap = await getDoc(docRef);
            const existingKegiatan = docSnap.exists() ? docSnap.data().kegiatan : [];
            const mergedKegiatan = [...existingKegiatan, ...kegiatanList];
            await setDoc(docRef, { userId: effectiveProfile.uid, opdId: effectiveProfile.opdId, tanggal: Timestamp.fromDate(today), kegiatan: mergedKegiatan }, { merge: true });
            console.log("Logbook updated successfully for:", docId);
        } catch (error) {
            console.error("Error updating logbook:", error);
            alert("Gagal menyimpan ke logbook.");
        }
    };


    const handleAddBoard = async (title: string, taskId?: string | null) => {
        const boardTitle = title.trim();
        if (!userProfile || !boardTitle) return;

        if (taskId) {
            const q = query(collection(db, 'checklists'), where('userId', '==', userProfile.uid), where('tugasTerkaitId', '==', taskId));
            const existingSnapshot = await getDocs(q);
            if (!existingSnapshot.empty) {
                setActiveBoardId(existingSnapshot.docs[0].id);
                console.log(`Board already exists for task ${taskId}, activating board ${existingSnapshot.docs[0].id}`);
                return;
            } else {
                 console.log(`No existing board found for task ${taskId}, creating new board.`);
            }
        } else {
             console.log(`Creating a new board without a linked task.`);
        }

        const newBoard: Omit<ChecklistBoard, 'id'> = {
            userId: userProfile.uid,
            judul: boardTitle,
            items: [],
            createdAt: Timestamp.now(),
            ...(taskId && { tugasTerkaitId: taskId }),
        };

        try {
            const newBoardRef = await addDoc(collection(db, 'checklists'), newBoard);
            setActiveBoardId(newBoardRef.id);
            console.log("New board created with ID:", newBoardRef.id);
            setNewBoardTitle('');
        } catch (error) {
            console.error("Error adding new board:", error);
            alert("Gagal membuat papan checklist baru.");
        }

    };

    // useEffect untuk handling parameter URL
    useEffect(() => {
        if (!userProfile || loading) return;

        const createBoard = searchParams.get('createBoard');
        const boardTitle = searchParams.get('boardTitle');
        const taskId = searchParams.get('taskId');
        const boardId = searchParams.get('boardId');

        if (boardId) {
            console.log("Found boardId in URL:", boardId);
            const boardExists = boards.some(b => b.id === boardId);
            if (boardExists) {
                 setActiveBoardId(boardId);
            } else {
                console.warn(`Board with ID ${boardId} not found for this user.`);
                if (boards.length > 0 && !activeBoardId) setActiveBoardId(boards[0].id!);
            }
            router.replace('/dashboard/checklist', undefined);
            return;
        }

        if (createBoard === 'true' && boardTitle && taskId) {
            console.log("URL params found: createBoard=true, boardTitle, taskId. Attempting to add board.");
            handleAddBoard(boardTitle, taskId);
            router.replace('/dashboard/checklist', undefined);
        } else if (boards.length > 0 && !activeBoardId) {
            setActiveBoardId(boards[0].id!);
             console.log("No specific URL params or active board, activating the first board:", boards[0].id!);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, userProfile, loading, boards]);

    // useEffect untuk fetch data
    useEffect(() => {
        if (!userProfile) return;
        setLoading(true);
        const q = query(collection(db, 'checklists'), where('userId', '==', userProfile.uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistBoard));
            setBoards(fetchedBoards);
            setLoading(false);
        }, (error) => {
             console.error("Error fetching checklist boards:", error);
             setLoading(false);
        });
        return () => unsubscribe();
    }, [userProfile]);

    const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);
    const items = useMemo(() => activeBoard?.items || [], [activeBoard]);
    const todoItems = useMemo(() => items.filter(i => i.status === 'Todo'), [items]);
    const inProgressItems = useMemo(() => items.filter(i => i.status === 'In Progress'), [items]);
    const doneItems = useMemo(() => items.filter(i => i.status === 'Done'), [items]);

    const handleDeleteBoard = async (boardId: string) => {
        if(window.confirm(`Yakin ingin menghapus papan checklist "${boards.find(b=>b.id===boardId)?.judul}"? Semua item di dalamnya akan hilang.`)) {
            try {
                await deleteDoc(doc(db, 'checklists', boardId));
                if (activeBoardId === boardId) {
                    const remainingBoards = boards.filter(b => b.id !== boardId);
                    setActiveBoardId(remainingBoards.length > 0 ? remainingBoards[0].id! : null);
                }
            } catch (error) {
                console.error("Error deleting board:", error);
                alert("Gagal menghapus papan checklist.");
            }
        }
    };

    const handleAddItem = async (text: string) => {
        if (!activeBoard || !text.trim()) return;
        const newItem: ChecklistItem = { id: Date.now().toString(), teks: text.trim(), status: 'Todo' };
        try {
            await updateDoc(doc(db, 'checklists', activeBoard.id!), { items: [...(activeBoard.items || []), newItem] });
        } catch (error) {
             console.error("Error adding item:", error);
             alert("Gagal menambahkan item baru.");
        }
    };

    const handleUpdateItemStatus = async (itemId: string, newStatus: ItemStatus) => {
        if (!activeBoard) return;
        const updatedItems = activeBoard.items.map(item => item.id === itemId ? { ...item, status: newStatus } : item);
        try {
            await updateDoc(doc(db, 'checklists', activeBoard.id!), { items: updatedItems });
        } catch (error) {
             console.error("Error updating item status:", error);
             alert("Gagal memperbarui status item.");
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!activeBoard) return;
        const updatedItems = activeBoard.items.filter(item => item.id !== itemId);
         try {
            await updateDoc(doc(db, 'checklists', activeBoard.id!), { items: updatedItems });
        } catch (error) {
             console.error("Error deleting item:", error);
             alert("Gagal menghapus item.");
        }
    };

    const handleAiGenerate = async (aiInput: string) => {
        if (!aiInput.trim() || !activeBoard) return;
        try {
            const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
            if (!apiKey) throw new Error("API Key for AI service is not configured.");
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            const prompt = `Anda adalah asisten perencana tugas. Berdasarkan tujuan utama berikut: "${aiInput}", pecahlah menjadi langkah-langkah kerja (action items) yang jelas dan ringkas dalam format JSON array berisi string. Contoh output: ["Langkah 1", "Langkah 2", "Langkah 3"]`;
            const schema = { type: "ARRAY", items: { type: "STRING" } };
            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", responseSchema: schema }
            };
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
            const result = await response.json();
            const textPart = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart) {
                const generatedSteps: string[] = JSON.parse(textPart);
                const newItems: ChecklistItem[] = generatedSteps.map(step => ({
                    id: Date.now().toString() + Math.random().toString(16).slice(2),
                    teks: step,
                    status: 'Todo'
                }));
                await updateDoc(doc(db, 'checklists', activeBoard.id!), {
                    items: [...(activeBoard.items || []), ...newItems]
                });
            } else {
                throw new Error("Gagal mendapatkan respons langkah kerja dari AI.");
            }
        } catch (error: any) {
            console.error("AI Generation Error:", error);
            alert(`Gagal membuat langkah kerja dengan AI: ${error.message}`);
        }
    };

    const handleLogbookIntegration = async (item?: ChecklistItem) => {
        if (!activeBoard) return;
        const itemsToLog = item ? [item] : doneItems;
        if (itemsToLog.length === 0) {
            alert("Tidak ada item selesai yang dapat dilaporkan ke logbook.");
            return;
        }
        const newLogEntries: LogbookKegiatan[] = itemsToLog.map(i => ({
            id: i.id,
            deskripsi: i.teks,
            selesai: true,
            ...(activeBoard.tugasTerkaitId && {
                tugasTerkaitId: activeBoard.tugasTerkaitId,
                tugasTerkaitJudul: activeBoard.judul
            })
        }));
        try {
            await updateKegiatanList(newLogEntries);
            alert(`${itemsToLog.length} item berhasil dilaporkan ke Logbook Harian.`);
        } catch (error) {
            console.error("Gagal melaporkan ke logbook:", error);
        }
    };

    const handleConvertToTugas = (item: ChecklistItem) => {
        if (!activeBoard) return;
        setInitialTugasData({
            judulTugas: `Tugas dari Checklist: ${item.teks}`,
            deskripsi: `Item ini berasal dari papan checklist "${activeBoard.judul}".\n\nDetail item:\n${item.teks}`
        });
        setIsFormTugasOpen(true);
    };

    const onTugasCreated = async (newTaskId: string) => {
         if (!activeBoard || !initialTugasData) return;
         setIsFormTugasOpen(false);
         setInitialTugasData(undefined);
         alert("Tugas berhasil dibuat dari item checklist.");
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
        dragItem.current = itemId;
        const target = e.currentTarget;
        setTimeout(() => {
            if (target) {
                target.style.opacity = '0.5';
            }
        }, 0);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, targetItemId: string, targetColumn: ItemStatus) => {
        dragOverItem.current = targetItemId;
        dragOverColumn.current = targetColumn;
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetColumn: ItemStatus) => {
        e.preventDefault();
        if (!dragOverItem.current) {
            dragOverColumn.current = targetColumn;
        }
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        if (e.currentTarget) {
            e.currentTarget.style.opacity = '1';
        }
        dragItem.current = null;
        dragOverItem.current = null;
        dragOverColumn.current = null;
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetColumn: ItemStatus) => {
        if (!activeBoard || !dragItem.current) return;
        const draggedItemId = dragItem.current;
        const targetItemId = dragOverItem.current;
        const currentItems = [...activeBoard.items];
        const dragItemIndex = currentItems.findIndex(item => item.id === draggedItemId);
        if (dragItemIndex === -1) return;
        const draggedItem = { ...currentItems[dragItemIndex], status: targetColumn };
        currentItems.splice(dragItemIndex, 1);
        if (targetItemId) {
            const dropItemIndex = currentItems.findIndex(item => item.id === targetItemId);
            if (dropItemIndex !== -1) {
                currentItems.splice(dropItemIndex, 0, draggedItem);
            } else {
                currentItems.push(draggedItem);
            }
        } else {
             currentItems.push(draggedItem);
        }
         try {
            await updateDoc(doc(db, 'checklists', activeBoard.id!), { items: currentItems });
        } catch (error) {
             console.error("Error updating items after drop:", error);
             alert("Gagal memindahkan item.");
        }
        handleDragEnd(e);
    };

     const DesktopColumn = ({ title, items, status, onAddItem }: { title: string, items: ChecklistItem[], status: ItemStatus, onAddItem: (text: string) => void }) => {
        const [newItemText, setNewItemText] = useState('');
        return (
            <div
                className="flex-1 bg-muted rounded-lg p-3 flex flex-col h-[calc(100vh-280px)] min-w-[300px]"
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                onDragEnter={(e) => handleDragEnter(e, '', status)}
            >
                <h3 className="font-bold text-foreground px-1 mb-3 flex items-center justify-between sticky top-0 bg-muted py-2">
                    <span>{title} ({items.length})</span>
                    {status === 'Done' && items.length > 0 && (
                        <Button onClick={() => handleLogbookIntegration()} variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700/20">
                            <BookOpen size={14} className="mr-1"/> Lapor Semua
                        </Button>
                    )}
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-2">
                    {items.map(item => (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragEnd={handleDragEnd}
                            onDragEnter={(e) => handleDragEnter(e, item.id, status)}
                            className="bg-card p-3 rounded-md shadow-sm group cursor-grab active:cursor-grabbing border border-border"
                        >
                             <div className="float-right text-muted-foreground/50 opacity-0 group-hover:opacity-100 cursor-move -mt-1 -mr-1">
                                <GripVertical size={16} />
                            </div>
                            <p className="text-sm text-foreground">{item.teks}</p>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex gap-1 flex-wrap">
                                     {item.status === 'Done' && (
                                        <Button onClick={() => handleLogbookIntegration(item)} variant="ghost" size="sm" className="h-auto px-1 py-0.5 text-xs text-green-600 dark:text-green-300"><BookOpen size={14}/>Lapor</Button>
                                    )}
                                     <Button onClick={() => handleConvertToTugas(item)} variant="ghost" size="sm" className="h-auto px-1 py-0.5 text-xs text-purple-600 dark:text-purple-300"><Send size={14}/>Tugas</Button>
                                </div>
                                <Button onClick={() => handleDeleteItem(item.id)} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 shrink-0">
                                    <Trash2 size={14}/>
                                </Button>
                            </div>
                        </div>
                    ))}
                     <div onDragEnter={(e) => handleDragEnter(e, '', status)} className="h-2"></div>
                </div>
                 {status === 'Todo' && (
                    <form onSubmit={(e) => { e.preventDefault(); if(newItemText.trim()) {onAddItem(newItemText.trim());} setNewItemText(''); }} className="flex gap-2 mt-3 pt-3 border-t border-border sticky bottom-0 bg-muted py-2">
                        <Input type="text" value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder="Tambah item..." className="text-sm"/>
                        <Button type="submit" variant="secondary" disabled={!newItemText.trim()}>+</Button>
                    </form>
                )}
            </div>
        );
    };
    
    if (authLoading || isCacheLoading) {
        return <p className="text-center p-8">Memuat data pengguna...</p>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-auto pb-20 md:pb-0">
            <div className="flex-shrink-0 mb-4 px-4 md:px-0">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <ClipboardList size={28} className="mr-3 text-purple-600" />Checklist Pribadi Cerdas
                    </h1>
                     <Button onClick={() => setIsBantuanOpen(true)} title="Bantuan" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <HelpCircle size={20} />
                    </Button>
                </div>
                <ShortcutNav />
                 <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center p-4 bg-card rounded-xl border border-border shadow-sm">
                     <div className="flex gap-2 items-center w-full md:flex-1">
                        <Select value={activeBoardId || ''} onValueChange={e => setActiveBoardId(e)} disabled={boards.length === 0}>
                           <SelectTrigger className="w-full font-semibold">
                             <SelectValue placeholder="Belum ada papan" />
                           </SelectTrigger>
                           <SelectContent>
                             {boards.length > 0 ? boards.map(b => <SelectItem key={b.id} value={b.id!}>{b.judul}</SelectItem>) : null}
                           </SelectContent>
                        </Select>
                         {activeBoard && (
                            <Button onClick={() => handleDeleteBoard(activeBoardId!)} variant="ghost" size="icon" className="text-red-600 hover:text-red-700 shrink-0">
                                <Trash2 size={18}/>
                            </Button>
                         )}
                    </div>
                     <form onSubmit={(e) => { e.preventDefault(); if (newBoardTitle.trim()) handleAddBoard(newBoardTitle.trim(), null); }} className="flex gap-2 w-full md:flex-1 md:max-w-sm">
                        <Input type="text" value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)} placeholder="Buat Papan Baru..." className="text-sm"/>
                        <Button type="submit" disabled={!newBoardTitle.trim()}>+</Button>
                    </form>
                     <div className='flex gap-2 flex-shrink-0'>
                        <Button onClick={() => setIsAiModalOpen(true)} disabled={!activeBoard} className="bg-purple-600 hover:bg-purple-700">
                            <BrainCircuit size={16} className="mr-2"/> AI
                        </Button>
                        <Button onClick={() => setIsRekapOpen(true)} className="bg-green-600 hover:bg-green-700">
                            <Calendar size={16} className="mr-2"/> Rekap Bulanan
                        </Button>
                    </div>
                 </div>
            </div>

            {(loading && boards.length === 0) ? <p className="text-center py-10 text-muted-foreground">Memuat papan checklist...</p> : boards.length === 0 && !newBoardTitle ? (
                <div className="flex-1 flex items-center justify-center text-center p-4 bg-card rounded-lg border-2 border-dashed border-border mt-6 mx-4 md:mx-0">
                    <div>
                        <ClipboardList size={48} className="mx-auto text-muted-foreground/30 mb-4"/>
                        <h2 className="text-xl font-semibold">Buat Papan Checklist Pertamamu</h2>
                        <p className="text-muted-foreground mt-2">Gunakan form di atas untuk memulai.</p>
                    </div>
                </div>
            ) : !activeBoard && boards.length > 0 ? (
                 <div className="flex-1 flex items-center justify-center text-center p-4 mt-6 mx-4 md:mx-0">
                    <p className="text-muted-foreground">Pilih papan checklist dari dropdown di atas.</p>
                 </div>
            ) : activeBoard ? (
                <>
                    <div className="hidden md:flex flex-1 gap-6 overflow-x-auto pb-4 px-4 md:px-0">
                        <DesktopColumn title="Todo" items={todoItems} status="Todo" onAddItem={handleAddItem} />
                        <DesktopColumn title="In Progress" items={inProgressItems} status="In Progress" onAddItem={()=>{}} />
                        <DesktopColumn title="Done" items={doneItems} status="Done" onAddItem={()=>{}} />
                    </div>
                    <div className="md:hidden flex-1 flex flex-col mt-4">
                        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as ItemStatus)} className="flex-1 flex flex-col">
                            <div className="mx-4 md:mx-0 sticky top-[64px] bg-card z-10 rounded-t-lg">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="Todo">Todo ({todoItems.length})</TabsTrigger>
                                    <TabsTrigger value="In Progress">Proses ({inProgressItems.length})</TabsTrigger>
                                    <TabsTrigger value="Done">Selesai ({doneItems.length})</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="Todo" className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted rounded-b-lg mx-4 md:mx-0 mb-4">
                                {todoItems.length > 0 ? todoItems.map(item => <MobileItemCard key={item.id} item={item} onUpdateStatus={handleUpdateItemStatus} onDelete={handleDeleteItem} onLogbook={handleLogbookIntegration} onConvertToTugas={handleConvertToTugas}/>) : <p className="text-center text-sm text-muted-foreground py-4">Kosong</p>}
                            </TabsContent>
                             <TabsContent value="In Progress" className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted rounded-b-lg mx-4 md:mx-0 mb-4">
                                {inProgressItems.length > 0 ? inProgressItems.map(item => <MobileItemCard key={item.id} item={item} onUpdateStatus={handleUpdateItemStatus} onDelete={handleDeleteItem} onLogbook={handleLogbookIntegration} onConvertToTugas={handleConvertToTugas}/>) : <p className="text-center text-sm text-muted-foreground py-4">Kosong</p>}
                            </TabsContent>
                             <TabsContent value="Done" className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted rounded-b-lg mx-4 md:mx-0 mb-4">
                                {doneItems.length > 0 ? doneItems.map(item => <MobileItemCard key={item.id} item={item} onUpdateStatus={handleUpdateItemStatus} onDelete={handleDeleteItem} onLogbook={handleLogbookIntegration} onConvertToTugas={handleConvertToTugas}/>) : <p className="text-center text-sm text-muted-foreground py-4">Kosong</p>}
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            ) : null}

             <div className="md:hidden fixed bottom-[80px] right-6 z-40 flex flex-col items-center gap-3">
                {isFabOpen && (
                    <div className="flex flex-col items-center gap-3 animate-fadeInUp">
                        <Button onClick={() => { setIsAiModalOpen(true); setIsFabOpen(false); }} title="Generate dengan AI" disabled={!activeBoard} className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700" size="icon">
                            <BrainCircuit size={24}/>
                        </Button>
                        <Button onClick={() => { setIsItemModalOpen(true); setIsFabOpen(false); }} title="Tambah Item Baru" disabled={!activeBoard} className="w-12 h-12 rounded-full" size="icon">
                            <Plus size={24}/>
                        </Button>
                    </div>
                )}
                 <Button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className={`w-14 h-14 rounded-full shadow-lg transition-transform duration-300 ${isFabOpen ? 'rotate-45' : ''}`}
                    aria-label={isFabOpen ? 'Tutup menu' : 'Buka menu tambah'}
                    disabled={!activeBoard}
                    size="icon"
                 >
                    <Plus size={28} />
                 </Button>
            </div>

            {/* Render Modals */}
            <AddItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} onSave={handleAddItem} />
            <AiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onGenerate={handleAiGenerate} />
            
            {/* [PERBAIKAN 10/11/2025] Lewatkan userCache ke FormTugas */}
            <FormTugas 
                isOpen={isFormTugasOpen} 
                onClose={() => setIsFormTugasOpen(false)} 
                onSuccess={onTugasCreated} 
                initialData={initialTugasData}
                userCache={localUserCache} 
            />
            <BantuanHalamanModal isOpen={isBantuanOpen} onClose={() => setIsBantuanOpen(false)} />
            <RekapBulananModal 
                isOpen={isRekapOpen} 
                onClose={() => setIsRekapOpen(false)} 
                userProfile={effectiveProfile}
                uploader={uploader}
            />
        </div>
    );
}