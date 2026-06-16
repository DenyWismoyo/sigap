// Lokasi: src/app/dashboard/dokumen/page.tsx
// VERSI FINAL:
// - Menggunakan layout list sederhana (sesuai permintaan user).
// - Menggunakan struktur data tunggal 'repositoryItems' (Fase 1 - perbaikan bug).
// - Menggunakan izin 'canCreate' & 'canManageItem' (Tugas 2 - perbaikan izin).
// - DIrombak total menggunakan komponen Shadcn UI & Dark Mode.
// - [PERBAIKAN] Menambahkan 'limit' ke import firestore (memperbaiki bug hapus).
// - [PERBAIKAN] Mengganti window.confirm dengan Shadcn 'ConfirmModal'.
// - [PERBAIKAN 10/11/2025] Memperbaiki path import 'ConfirmModal'.
// - [PERBAIKAN BUILD 11/11/2025] Mengganti tipe DragEvent ke HTMLElement
// - [PERBAIKAN BUILD 11/11/2025 v2] Memperbaiki semua path impor

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase'; // [PERBAIKAN] Path
import {
  collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy,
  limit 
} from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext'; // [PERBAIKAN] Path
import { useToast } from '@/context/ToastContext'; // [PERBAIKAN] Path
import { UserProfile, OPD, DocumentIconType } from '@/types'; // [PERBAIKAN] Path
import {
  Folder, FileText, Plus, X, Link as LinkIcon, Home, FolderArchive, Search,
  FileSpreadsheet, FileVideo, FileImage, FileArchive, MoreVertical, Edit, Trash2, Loader2,
  Save, Building
} from 'lucide-react';

// --- Impor Komponen Shadcn ---
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"; // [PERBAIKAN] Path
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // [PERBAIKAN] Path
import { Button } from "@/components/ui/button"; // [PERBAIKAN] Path
import { Input } from "@/components/ui/input"; // [PERBAIKAN] Path
import { Label } from "@/components/ui/label"; // [PERBAIKAN] Path
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"; // [PERBAIKAN] Path
import { Card, CardContent } from "@/components/ui/card"; // [PERBAIKAN] Path
import { Checkbox } from "@/components/ui/checkbox"; // [PERBAIKAN] Path
import { ScrollArea } from "@/components/ui/scroll-area"; // [PERBAIKAN] Path
import ConfirmModal from '@/app/dashboard/components/ConfirmModal'; // [PERBAIKAN] Path
// --- Akhir Impor Shadcn ---


// --- Tipe Data Lokal (Sesuai Fase 1) ---
interface RepositoryItem {
  id: string;
  opdId: string;
  parentId: string | null;
  type: 'folder' | 'link';
  nama: string; // Nama folder atau nama link
  url?: string;
  deskripsi?: string;
  tipeDokumen?: DocumentIconType;
  createdBy: string;
  createdAt: Timestamp;
  sharedWithOpdIds?: string[];
}
// --- Akhir Tipe Data Lokal ---


// Helper untuk ikon
const getItemIcon = (item: RepositoryItem) => {
  if (item.type === "folder") {
    return <Folder size={24} className="text-yellow-500 flex-shrink-0"/>;
  }
  switch (item.tipeDokumen) {
    case "sheet": return <FileSpreadsheet size={24} className="text-green-500 flex-shrink-0" />;
    case "doc": return <FileText size={24} className="text-blue-500 flex-shrink-0" />;
    case "pdf": return <FileText size={24} className="text-red-500 flex-shrink-0" />;
    case "video": return <FileVideo size={24} className="text-purple-500 flex-shrink-0" />;
    case "image": return <FileImage size={24} className="text-indigo-500 flex-shrink-0" />;
    case "zip": return <FileArchive size={24} className="text-yellow-600 flex-shrink-0" />;
    default: return <LinkIcon size={24} className="text-gray-500 flex-shrink-0" />;
  }
};


// --- Komponen Baris Item (Menggunakan Shadcn Dropdown) ---
interface RepositoryItemRowProps {
  item: RepositoryItem;
  users: Map<string, string>;
  canManage: boolean;
  onItemClick: (item: RepositoryItem) => void;
  onEdit: (item: RepositoryItem) => void;
  onDelete: (item: RepositoryItem) => void;
  // [PERBAIKAN BUILD] Ganti HTMLDivElement -> HTMLElement
  onDragStart: (e: React.DragEvent<HTMLElement>, item: RepositoryItem) => void;
  onDragEnd: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, targetFolderId: string | null) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
}

const RepositoryItemRow: React.FC<RepositoryItemRowProps> = ({
  item, users, canManage, onItemClick, onEdit, onDelete,
  onDragStart, onDragEnd, onDrop, onDragOver
}) => {
  return (
    <div
      key={item.id}
      className="group flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-primary hover:bg-accent"
      draggable={canManage}
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => {
        if (item.type === 'folder') {
          onDrop(e, item.id);
        } else {
          onDrop(e, item.parentId);
        }
      }}
    >
      <button
        onClick={() => onItemClick(item)}
        className="flex items-center gap-3 text-left flex-1 min-w-0"
      >
        {getItemIcon(item)}
        <div className="min-w-0">
          <p className={`font-semibold ${item.type === 'link' ? 'text-primary' : 'text-foreground'} truncate`}>
            {item.nama}
          </p>
          {item.type === 'link' && (
            <p className="text-sm text-muted-foreground truncate">{item.deskripsi}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Dibuat oleh: {users.get(item.createdBy) || '...'}
          </p>
        </div>
      </button>
      
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 flex-shrink-0 h-8 w-8">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Edit size={14} className="mr-2" /> Ganti Nama
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
              <Trash2 size={14} className="mr-2" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
// --- Akhir Komponen Baris Item ---


// --- Komponen Utama Halaman ---
export default function RepositoryDokumenPage() {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    
    // State Data
    const [items, setItems] = useState<RepositoryItem[]>([]);
    const [users, setUsers] = useState<Map<string, string>>(new Map());
    const [localOpdList, setLocalOpdList] = useState<OPD[]>([]);
    
    // State UI
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<{ id: string | null; nama: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State Modal
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RepositoryItem | null>(null);
    const [selectedOpds, setSelectedOpds] = useState<string[]>([]);
    
    // State Form Modal
    const [modalNama, setModalNama] = useState('');
    const [modalDeskripsi, setModalDeskripsi] = useState('');
    const [modalUrl, setModalUrl] = useState('');
    const [modalTipeDokumen, setModalTipeDokumen] = useState<DocumentIconType>('lainnya');

    // State Drag & Drop
    const [draggedItem, setDraggedItem] = useState<RepositoryItem | null>(null);

    // State untuk modal konfirmasi hapus
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isProcessing: false
    });
    
    // Izin untuk MEMBUAT: Semua pengguna yang login bisa membuat.
    const canCreate = useMemo(() => !!userProfile, [userProfile]);
    
    // Izin untuk MENGELOLA (Edit/Hapus/Pindah): Admin/TU, atau pembuat asli item tersebut.
    const canManageItem = useCallback((item: RepositoryItem) => {
        if (!userProfile) return false;
        if (userProfile.role === 'super_admin') return true;
        if ((userProfile.role === 'admin_opd' || userProfile.role === 'staf_tu') && item.opdId === userProfile.opdId) return true;
        return userProfile.uid === item.createdBy;
    }, [userProfile]);
    
    // Fungsi Fetch Data Tunggal
    const fetchData = useCallback(async () => {
        if (!userProfile?.opdId) return;
        setLoading(true);
        try {
            const qOpd = query(collection(db, 'repositoryItems'), where('opdId', '==', userProfile.opdId));
            const qShared = query(collection(db, 'repositoryItems'), where('sharedWithOpdIds', 'array-contains', userProfile.opdId));
            const qUsers = query(collection(db, 'users'), where('opdId', '==', userProfile.opdId));
            
            const [opdSnapshot, sharedSnapshot, usersSnapshot] = await Promise.all([
                getDocs(qOpd),
                getDocs(qShared),
                getDocs(qUsers)
            ]);

            const userMap = new Map<string, string>();
            usersSnapshot.forEach(doc => { const data = doc.data() as UserProfile; userMap.set(data.uid, data.namaLengkap); });
            setUsers(userMap);

            const allItems = new Map<string, RepositoryItem>();
            opdSnapshot.docs.forEach(doc => allItems.set(doc.id, { id: doc.id, ...doc.data() } as RepositoryItem));
            sharedSnapshot.docs.forEach(doc => allItems.set(doc.id, { id: doc.id, ...doc.data() } as RepositoryItem));
            
            setItems(Array.from(allItems.values()));

            if (userProfile.role === 'super_admin') {
                const opdSnapshot = await getDocs(collection(db, 'opd'));
                setLocalOpdList(opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD)));
            }

        } catch (error) {
            console.error("Error fetching repository data:", error);
            addToast("Gagal memuat data repository.", "error");
        } finally {
            setLoading(false);
        }
    }, [userProfile?.opdId, userProfile?.role, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // Breadcrumbs (folderPath)
    useEffect(() => {
        const path: { id: string | null; nama: string }[] = [{ id: null, nama: 'Home' }];
        let currentId: string | null = currentFolderId;
        while (currentId) {
            const folder = items.find(f => f.id === currentId && f.type === 'folder');
            if (folder) {
                path.splice(1, 0, { id: folder.id, nama: folder.nama });
                currentId = folder.parentId;
            } else { break; }
        }
        setFolderPath(path);
    }, [currentFolderId, items]);

    // Filter Item
    const filteredItems = useMemo(() => {
        return items
            .filter(f => f.parentId === currentFolderId && f.nama.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return a.nama.localeCompare(b.nama);
            });
    }, [items, currentFolderId, searchTerm]);
    
    // Memoize daftar OPD yang di-indent
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

    // --- Logika Modal dan CRUD ---
    
    const openModal = (type: 'folder' | 'link', item: RepositoryItem | null) => {
        setEditingItem(item);
        if (type === 'folder') {
            setModalNama(item?.nama || '');
            setIsFolderModalOpen(true);
        } else {
            setModalNama(item?.nama || '');
            setModalDeskripsi(item?.deskripsi || '');
            setModalUrl(item?.url || '');
            setModalTipeDokumen(item?.tipeDokumen || 'lainnya');
            setIsLinkModalOpen(true);
        }
        setSelectedOpds(item?.sharedWithOpdIds || []);
    };

    const closeModals = () => {
        setIsFolderModalOpen(false); 
        setIsLinkModalOpen(false);
        setEditingItem(null);
        setModalNama('');
        setModalDeskripsi('');
        setModalUrl('');
        setModalTipeDokumen('lainnya');
        setSelectedOpds([]);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, isProcessing: false });
    };

    const handleSaveFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || !modalNama) return;
        setIsProcessing(true);

        try {
            const superAdminPayload = userProfile.role === 'super_admin' ? { sharedWithOpdIds: selectedOpds } : {};

            if (editingItem) {
                await updateDoc(doc(db, 'repositoryItems', editingItem.id!), { 
                    nama: modalNama,
                    ...superAdminPayload 
                });
                addToast('Folder berhasil diperbarui.', 'success');
            } else {
                const payload: Omit<RepositoryItem, 'id'> = { 
                    nama: modalNama, 
                    opdId: userProfile.opdId, 
                    parentId: currentFolderId, 
                    createdBy: userProfile.uid, 
                    createdAt: Timestamp.now(),
                    type: 'folder',
                    ...superAdminPayload
                };
                await addDoc(collection(db, 'repositoryItems'), payload);
                addToast('Folder baru berhasil dibuat.', 'success');
            }
            closeModals();
            fetchData();
        } catch (error) {
            console.error("Gagal menyimpan folder:", error);
            addToast("Gagal menyimpan folder.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || !modalNama || !modalUrl) return;
        setIsProcessing(true);

        const linkData = {
            nama: modalNama,
            deskripsi: modalDeskripsi,
            url: modalUrl,
            tipeDokumen: modalTipeDokumen
        };
        const superAdminPayload = userProfile.role === 'super_admin' ? { sharedWithOpdIds: selectedOpds } : {};

        try {
            if (editingItem) {
                await updateDoc(doc(db, 'repositoryItems', editingItem.id!), {
                    ...linkData,
                    ...superAdminPayload
                });
                addToast('Dokumen berhasil diperbarui.', 'success');
            } else {
                const payload: Omit<RepositoryItem, 'id'> = { 
                    ...linkData, 
                    opdId: userProfile.opdId, 
                    parentId: currentFolderId, 
                    createdBy: userProfile.uid, 
                    createdAt: Timestamp.now(),
                    type: 'link',
                    ...superAdminPayload
                };
                await addDoc(collection(db, 'repositoryItems'), payload);
                addToast('Dokumen baru berhasil ditambahkan.', 'success');
            }
            closeModals();
            fetchData();
        } catch (error) {
            console.error("Gagal menyimpan link:", error);
            addToast("Gagal menyimpan dokumen.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = (item: RepositoryItem) => {
        if (!canManageItem(item)) {
            addToast("Anda tidak memiliki izin untuk menghapus item ini.", "error");
            return;
        }
        setConfirmModal({
            isOpen: true,
            title: `Hapus ${item.type === 'folder' ? 'Folder' : 'Dokumen'}`,
            message: `Apakah Anda yakin ingin menghapus "${item.nama}"? Tindakan ini tidak dapat diurungkan.`,
            isProcessing: false,
            onConfirm: () => executeDelete(item)
        });
    };

    const executeDelete = async (item: RepositoryItem) => {
        setConfirmModal(prev => ({ ...prev, isProcessing: true }));
        try {
            if (item.type === 'folder') {
                const q = query(collection(db, 'repositoryItems'), where('parentId', '==', item.id), limit(1));
                const subItemsSnap = await getDocs(q);
                if (!subItemsSnap.empty) {
                    addToast('Gagal: Folder harus kosong sebelum dihapus. Pindahkan semua item di dalamnya terlebih dahulu.', 'error');
                    closeModals();
                    return;
                }
            }
            await deleteDoc(doc(db, 'repositoryItems', item.id!));
            addToast('Item berhasil dihapus.', 'success');
            fetchData();
        } catch (error) {
            console.error("Gagal menghapus:", error);
            addToast("Gagal menghapus item.", "error");
        } finally {
            closeModals();
        }
    };
    
    // Handler Checkbox OPD
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
    const toggleSelectAll = (select: boolean) => {
        if (select) { setSelectedOpds(localOpdList.map(opd => opd.id!)); } 
        else { setSelectedOpds([]); }
    };
    
    // --- Logika Drag & Drop ---
    // [PERBAIKAN BUILD] Ganti HTMLDivElement -> HTMLElement
    const handleDragStart = (e: React.DragEvent<HTMLElement>, item: RepositoryItem) => {
        if (!canManageItem(item)) { 
            e.preventDefault(); 
            return; 
        }
        setDraggedItem(item);
        e.dataTransfer.setData("text/plain", item.id);
        e.currentTarget.style.opacity = '0.4';
    };

    const handleDragOver = (e: React.DragEvent<HTMLElement>) => { // [PERBAIKAN BUILD] Ganti HTMLDivElement -> HTMLElement
        e.preventDefault();
    };

    const handleDragEnd = (e: React.DragEvent<HTMLElement>) => { // [PERBAIKAN BUILD] Ganti HTMLDivElement -> HTMLElement
        if (e.currentTarget.style) {
            e.currentTarget.style.opacity = '1';
        }
        setDraggedItem(null);
    };

    const handleDrop = async (e: React.DragEvent<HTMLElement>, targetFolderId: string | null) => { // [PERBAIKAN BUILD] Ganti HTMLDivElement -> HTMLElement
        e.preventDefault();
        e.stopPropagation(); 
        
        if (!draggedItem) return;
        if (!canManageItem(draggedItem)) return; 
        if (draggedItem.parentId === targetFolderId) return;
        if (draggedItem.id === targetFolderId) return;

        let checkParentId = targetFolderId;
        while (checkParentId) {
            if (checkParentId === draggedItem.id) {
                addToast("Tidak dapat memindahkan folder ke dalam dirinya sendiri.", "error");
                setDraggedItem(null);
                return;
            }
            const parentFolder = items.find(f => f.id === checkParentId);
            checkParentId = parentFolder ? parentFolder.parentId : null;
        }
        
        try {
            await updateDoc(doc(db, 'repositoryItems', draggedItem.id), { 
                parentId: targetFolderId 
            });
            fetchData();
            addToast(`Item "${draggedItem.nama}" berhasil dipindahkan.`, 'success');
        } catch (err) {
            console.error("Gagal memindahkan item:", err);
            addToast("Gagal memindahkan item.", "error");
        } finally {
            setDraggedItem(null);
        }
    };

    return (
        <div className="animate-fadeInUp">
            <h1 className="text-3xl font-bold text-foreground flex items-center mb-6">
                <FolderArchive size={28} className="mr-3 text-blue-600"/> Repository Dokumen
            </h1>

            {/* Header Kontrol (Shadcn) */}
            <Card className="shadow-sm border-border mb-6">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        {canCreate && (
                            <div className="flex gap-2">
                               <Button onClick={() => openModal('folder', null)}>
                                   <Plus size={16} className="mr-2"/> Folder Baru
                               </Button>
                               <Button onClick={() => openModal('link', null)} variant="secondary">
                                   <LinkIcon size={16} className="mr-2"/> Tambah Dokumen
                               </Button>
                            </div>
                        )}
                        <div className="relative flex-1 md:max-w-xs">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                            <Input 
                                type="text" 
                                placeholder="Cari di folder ini..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="pl-10"
                            />
                        </div>
                    </div>
                     <div 
                        className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap py-2 rounded-lg"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, null)} // Drop ke root (Home)
                     >
                        {folderPath.map((p, i) => (
                            <React.Fragment key={p.id || 'home'}>
                                <button 
                                    onClick={() => setCurrentFolderId(p.id)} 
                                    className="hover:underline flex items-center gap-1 p-1 hover:text-primary disabled:hover:no-underline disabled:text-foreground disabled:cursor-default"
                                    disabled={i === folderPath.length - 1}
                                    onDragOver={handleDragOver} // [PERBAIKAN BUILD] Tambah handler
                                    onDrop={(e) => handleDrop(e, p.id)} // [PERBAIKAN BUILD] Tambah handler
                                >
                                    {p.id === null ? <Home size={14}/> : <Folder size={14}/>} {p.nama}
                                </button>
                                {i < folderPath.length - 1 && <span className="text-muted-foreground">/</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Daftar Item */}
            {loading ? (
                <div className="text-center p-8 text-muted-foreground">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                    <p>Memuat item...</p>
                </div>
            ) : (
                <div 
                    className="space-y-3"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, currentFolderId)}
                >
                    {filteredItems.map(item => (
                        <RepositoryItemRow
                            key={item.id}
                            item={item}
                            users={users}
                            canManage={canManageItem(item)}
                            onItemClick={(item) => item.type === 'folder' ? setCurrentFolderId(item.id) : window.open(item.url, '_blank')}
                            onEdit={(item) => openModal(item.type, item)}
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        />
                    ))}
                    {!loading && filteredItems.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                            <p className="font-semibold">{searchTerm ? 'Tidak ada hasil ditemukan' : 'Folder ini kosong'}</p>
                            {searchTerm && <p className="text-sm">Coba kata kunci lain.</p>}
                        </div>
                    )}
                </div>
            )}
            
            {/* Modal Folder (Shadcn) */}
            <Dialog open={isFolderModalOpen} onOpenChange={closeModals}>
                <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>{editingItem ? 'Edit Folder' : 'Folder Baru'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveFolder} className="flex flex-col max-h-[80vh]">
                        <ScrollArea className="flex-1 px-6">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="namaFolder">Nama Folder</Label>
                                    <Input 
                                        id="namaFolder" 
                                        name="namaFolder" 
                                        type="text" 
                                        value={modalNama}
                                        onChange={(e) => setModalNama(e.target.value)}
                                        className="mt-1" 
                                        required autoFocus
                                    />
                                </div>
                                
                                {userProfile?.role === 'super_admin' && (
                                    <div>
                                        <Label className="font-bold text-sm flex items-center gap-2 mb-2">
                                            <Building size={16} /> Bagikan ke OPD (Opsional)
                                        </Label>
                                        <div className="flex justify-between items-center mb-1">
                                            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(true)}>Pilih Semua</Button>
                                            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(false)}>Kosongkan</Button>
                                        </div>
                                        <ScrollArea className="h-40 rounded-md border p-3">
                                            {sortedOpdList.map(opd => (
                                                <div key={opd.id} className="flex items-center gap-2 p-1.5">
                                                    <Checkbox
                                                        id={`cb-folder-${opd.id}`}
                                                        checked={selectedOpds.includes(opd.id!)}
                                                        onCheckedChange={() => handleOpdCheckChange(opd)}
                                                    />
                                                    <Label htmlFor={`cb-folder-${opd.id}`} className="cursor-pointer text-sm">
                                                        {opd.indent ? '↳ ' : ''}{opd.namaOpd}
                                                    </Label>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 pt-4 mt-4 border-t border-border flex-shrink-0">
                            <Button type="button" variant="outline" onClick={closeModals} disabled={isProcessing}>Batal</Button>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Modal Link (Shadcn) */}
            <Dialog open={isLinkModalOpen} onOpenChange={closeModals}>
                <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>{editingItem ? 'Edit Dokumen' : 'Tambah Dokumen Baru'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveLink} className="flex flex-col max-h-[80vh]">
                        <ScrollArea className="flex-1 px-6">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="namaDokumen">Nama Dokumen</Label>
                                    <Input id="namaDokumen" name="namaDokumen" type="text" value={modalNama} onChange={(e) => setModalNama(e.target.value)} required autoFocus />
                                </div>
                                <div>
                                    <Label htmlFor="deskripsi">Deskripsi</Label>
                                    <Input id="deskripsi" name="deskripsi" type="text" value={modalDeskripsi} onChange={(e) => setModalDeskripsi(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="url">URL/Tautan</Label>
                                    <Input id="url" name="url" type="url" value={modalUrl} onChange={(e) => setModalUrl(e.target.value)} required />
                                </div>
                                <div>
                                    <Label htmlFor="tipeDokumen">Tipe Ikon</Label>
                                    <Select name="tipeDokumen" value={modalTipeDokumen} onValueChange={(v) => setModalTipeDokumen(v as DocumentIconType)}>
                                        <SelectTrigger id="tipeDokumen">
                                            <SelectValue placeholder="Pilih tipe ikon" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="doc">Dokumen (doc, pages)</SelectItem>
                                            <SelectItem value="sheet">Spreadsheet (xls, numbers)</SelectItem>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="image">Gambar</SelectItem>
                                            <SelectItem value="video">Video</SelectItem>
                                            <SelectItem value="zip">Arsip (zip, rar)</SelectItem>
                                            <SelectItem value="lainnya">Lainnya (Link)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {userProfile?.role === 'super_admin' && (
                                    <div>
                                        <Label className="font-bold text-sm flex items-center gap-2 mb-2">
                                            <Building size={16} /> Bagikan ke OPD (Opsional)
                                        </Label>
                                        <div className="flex justify-between items-center mb-1">
                                            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(true)}>Pilih Semua</Button>
                                            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(false)}>Kosongkan</Button>
                                        </div>
                                        <ScrollArea className="h-40 rounded-md border p-3">
                                            {sortedOpdList.map(opd => (
                                                <div key={opd.id} className="flex items-center gap-2 p-1.5">
                                                    <Checkbox
                                                        id={`cb-link-${opd.id}`}
                                                        checked={selectedOpds.includes(opd.id!)}
                                                        onCheckedChange={() => handleOpdCheckChange(opd)}
                                                    />
                                                    <Label htmlFor={`cb-link-${opd.id}`} className="cursor-pointer text-sm">
                                                        {opd.indent ? '↳ ' : ''}{opd.namaOpd}
                                                    </Label>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 pt-4 mt-4 border-t border-border flex-shrink-0">
                            <Button type="button" variant="outline" onClick={closeModals} disabled={isProcessing}>Batal</Button>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* [PERBAIKAN] Render Modal Konfirmasi Hapus */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeModals} // Gunakan closeModals untuk mereset state
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isProcessing={confirmModal.isProcessing}
                confirmText="Ya, Hapus"
            />

        </div>
    );
}