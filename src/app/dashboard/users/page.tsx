// Lokasi: src/app/dashboard/users/page.tsx
// [UPDATE INTEGRITAS DATA]
// - Menambahkan Validasi "Kursi Kosong" (Double Occupancy Check) pada handleMutasiSubmit.
// - Mencegah mutasi jika jabatan tujuan masih diisi oleh user aktif lain.
// - [UPDATE STAF TU] Memberikan akses manajemen user kepada staf_tu (terbatas pada OPD).
// [FASE C EKSEKUSI] Membuka akses manajemen lintas hierarki (Induk ke Sub-OPD) untuk Admin Induk.
// [OPTIMISTIC UPDATE] Data yang baru ditambah/diedit/mutasi langsung muncul tanpa refresh.

"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, app, functions } from '@/lib/firebase'; 
import { doc, updateDoc, setDoc, collection, writeBatch, addDoc, Timestamp, serverTimestamp, getDocs, query, where, deleteDoc } from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from "firebase/functions";
import { UserProfile, FunctionalRole, OPD, Jabatan, RiwayatMutasi, TipeMutasi } from '@/types'; 
import { useUserAuth } from '@/context/AuthContext';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData'; 
import { useQueryClient } from '@tanstack/react-query'; // <-- Import React Query Client
import { UserPlus, FilePenLine, KeyRound, LogIn, Upload, Download, AlertTriangle, MoreVertical, Search, Briefcase, Loader2, Shield, FileSpreadsheet, CheckCircle, X, Save, Users, ShieldCheck, ArrowRightLeft, Building2, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

// --- Impor Komponen Shadcn ---
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox"; 
import { Badge } from "@/components/ui/badge";

type UserRole = UserProfile['role'];
type UserStatus = UserProfile['status'];

// [SETUP] Inisialisasi App Sekunder
const appName = "secondaryImportUserApp";
let secondaryApp: any;
try {
  secondaryApp = initializeApp(app.options, appName);
} catch (error) {
  secondaryApp = app; 
}
const secondaryAuth = getAuth(secondaryApp);

const ConfirmActionModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Ya, Lanjutkan", isProcessing = false }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string, confirmText?: string, isProcessing?: boolean }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-foreground">
                        <AlertTriangle className="mr-3 text-yellow-500" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-muted-foreground">{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
                    <Button type="button" variant="destructive" onClick={onConfirm} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin" /> : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const UserCard = ({ user, getJabatanName, getOpdName, onEdit, onReset, onLoginAs, onSelect, isSelected, onMutasi, onDelete }: { user: UserProfile, getJabatanName: (id: string) => string, getOpdName: (id: string) => string, onEdit: (u: UserProfile) => void, onReset: (u: UserProfile) => void, onLoginAs: (u: UserProfile) => void, onSelect: (id: string, checked: boolean) => void, isSelected: boolean, onMutasi: (u: UserProfile) => void, onDelete: (u: UserProfile) => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setIsMenuOpen(false); }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);
    return (
        <div className={`p-4 rounded-lg shadow-sm border ${isSelected ? 'bg-blue-50 border-blue-400 dark:bg-blue-900/20' : 'bg-card border-border'}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 min-w-0"> 
                     <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={(checked) => onSelect(user.id!, checked as boolean)} 
                        className="mt-1 shrink-0"
                     />
                    <div className="min-w-0"> 
                        <p className="font-bold text-foreground truncate">{user.namaLengkap}</p>
                        <span className={`px-2 py-0.5 mt-1 inline-block text-xs font-semibold rounded-full ${user.status === 'aktif' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>{user.status}</span>
                    </div>
                </div>
                <div ref={menuRef} className="relative shrink-0"> 
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 -m-2 text-muted-foreground rounded-full hover:bg-accent"><MoreVertical size={18}/></button>
                     {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-48 bg-popover rounded-md shadow-lg border border-border z-10">
                            <button onClick={() => { onEdit(user); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-foreground"><FilePenLine size={14}/> Edit Data Lengkap</button>
                            <button onClick={() => { onMutasi(user); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-foreground text-orange-600"><ArrowRightLeft size={14}/> Mutasi / Pindah</button>
                            <button onClick={() => { onReset(user); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-foreground"><KeyRound size={14}/> Reset Pass</button>
                            <button onClick={() => { onLoginAs(user); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-foreground"><LogIn size={14}/> Login Sebagai</button>
                            <div className="h-px bg-border my-1"></div>
                            <button onClick={() => { onDelete(user); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20"><Trash2 size={14}/> Hapus User</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm text-muted-foreground">
                <p className="truncate"><strong>Jabatan:</strong> {getJabatanName(user.jabatanId)}</p>
                <p className="truncate"><strong>OPD:</strong> {getOpdName(user.opdId)}</p>
            </div>
        </div>
    );
};

export default function ManajemenUserPage() {
    const { userProfile, opdConfig } = useUserAuth();
    const queryClient = useQueryClient(); // <-- Inisialisasi Query Client
    
    // SSOT Data & Filters
    const [opdFilter, setOpdFilter] = useState('Semua'); 
    const [opdSearchTerm, setOpdSearchTerm] = useState('');

    const { 
        userMap, 
        jabatanMap, 
        opdList, 
        isLoading: isMasterLoading, 
        getJabatanNameById 
    } = useMasterData(true, opdFilter !== 'Semua' ? opdFilter : null);

    const userList = useMemo(() => Array.from(userMap.values()), [userMap]);

    // [FASE C EKSEKUSI] Cek apakah user adalah Admin Induk
    const isAdminInduk = useMemo(() => {
        if (userProfile?.role !== 'admin_opd') return false;
        const myOpd = opdList.find(o => o.id === userProfile.opdId);
        return myOpd?.tipe === 'Induk';
    }, [userProfile, opdList]);

    const opdMapByName = useMemo(() => {
        const map = new Map<string, string>();
        opdList.forEach(o => map.set(o.namaOpd.toLowerCase().trim(), o.id!));
        return map;
    }, [opdList]);

    const jabatanMapByName = useMemo(() => {
        const map = new Map<string, string>();
        jabatanMap.forEach(j => map.set(j.namaJabatan.toLowerCase().trim(), j.id!));
        return map;
    }, [jabatanMap]);

    // Initial Filter Setup
    useEffect(() => {
        if ((userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu') && userProfile.opdId && opdFilter === 'Semua') {
            setOpdFilter(userProfile.opdId);
        }
    }, [userProfile, opdFilter]);

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
    
    // --- MODAL STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isLoginAsModalOpen, setIsLoginAsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importOpdId, setImportOpdId] = useState('');
    const [isBatchRoleModalOpen, setIsBatchRoleModalOpen] = useState(false);
    const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
    const [mutasiTargetOpdId, setMutasiTargetOpdId] = useState('');
    const [mutasiTargetJabatanId, setMutasiTargetJabatanId] = useState('');
    const [mutasiNomorSk, setMutasiNomorSk] = useState('');
    const [mutasiAlasan, setMutasiAlasan] = useState('');
    const [mutasiTanggal, setMutasiTanggal] = useState(new Date().toISOString().split('T')[0]);

    const [targetJabatanList, setTargetJabatanList] = useState<Jabatan[]>([]);
    const [isLoadingTargetJabatan, setIsLoadingTargetJabatan] = useState(false);

    // Data Processing State
    const [batchRoles, setBatchRoles] = useState<FunctionalRole[]>([]);
    const [importData, setImportData] = useState<any[]>([]);
    const [isImportProcessing, setIsImportProcessing] = useState(false);
    const [importLog, setImportLog] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [selectedAdditionalRoles, setSelectedAdditionalRoles] = useState<FunctionalRole[]>([]);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', confirmText: 'Ya, Lanjutkan', onConfirm: () => {} });

    const availableAdditionalRoles: { value: FunctionalRole, label: string }[] = [
        { value: 'pengurus_barang', label: 'Pengurus Barang (Akses Aset)' },
        { value: 'notulis_rapat', label: 'Notulis Rapat' },
        { value: 'bendahara', label: 'Bendahara (Akses Keuangan)' },
        { value: 'petugas_pelayanan', label: 'Petugas Pelayanan (Front Office)' },
        { value: 'pengelola_tapem', label: 'Pengelola Tata Pemerintahan (Si-Tapem)' },
        { value: 'petugas_kelurahan', label: 'Petugas Registrasi Kelurahan (SKW)' },
        { value: 'petugas_kecamatan', label: 'Verifikator Kecamatan (SKW)' },
        { value: 'operator_surat', label: 'Operator Surat (Akses Upload Surat)' },
    ];

    const filteredUsers = useMemo(() => {
        let users = userList;
        if (opdFilter !== 'Semua') {
            users = users.filter(u => u.opdId === opdFilter);
        }
        users = users.filter(u => u.role !== 'super_admin');
        if (opdSearchTerm) {
            const lowerSearch = opdSearchTerm.toLowerCase();
            users = users.filter(u => u.namaLengkap.toLowerCase().includes(lowerSearch));
        }
        return users.sort((a, b) => {
            const jabatanA = jabatanMap.get(a.jabatanId);
            const jabatanB = jabatanMap.get(b.jabatanId);
            const levelA = jabatanA?.level ?? 99;
            const levelB = jabatanB?.level ?? 99;
            if (levelA !== levelB) return levelA - levelB;
            return (jabatanA?.namaJabatan || '').localeCompare(jabatanB?.namaJabatan || '');
        });
    }, [userList, opdFilter, jabatanMap, opdSearchTerm]);

    // [FASE C EKSEKUSI] Perbaikan hirarki dropdown
    const filteredOpdOptions = useMemo(() => {
        const indukOpds = opdList.filter(o => o.tipe === 'Induk').sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
        const result: OPD[] = [];
        indukOpds.forEach(induk => {
            result.push(induk);
            const sub = opdList.filter(o => o.idOpdInduk === induk.id).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
            result.push(...sub);
        });
        const usedIds = new Set(result.map(r => r.id));
        opdList.forEach(o => { if (!usedIds.has(o.id)) result.push(o); });
        
        if (userProfile?.role === 'admin_opd') {
             const myOpdId = userProfile.opdId;
             return result.filter(o => o.id === myOpdId || o.idOpdInduk === myOpdId);
        } else if (userProfile?.role === 'staf_tu') {
             return result.filter(o => o.id === userProfile.opdId);
        }
        return result;
    }, [opdList, userProfile]);

    const getOpdName = useCallback((id: string): string => {
        return opdList.find(o => o.id === id)?.namaOpd || 'N/A';
    }, [opdList]);
    
    const setFlashMessage = (type: 'success' | 'error', text: string) => {
        setGlobalMessage({ type, text });
        setTimeout(() => setGlobalMessage({ type: '', text: '' }), 5000);
    };

    const openModal = (modal: 'edit' | 'reset' | 'loginAs' | 'import' | 'mutasi', user?: UserProfile) => {
        setCurrentUser(user ? { ...user } : null);
        
        if (modal === 'edit' && user) {
            setSelectedAdditionalRoles(user.additionalRoles || []);
            setIsEditModalOpen(true);
        } else if (modal === 'reset') {
            setIsResetModalOpen(true);
        } else if (modal === 'loginAs') {
            setIsLoginAsModalOpen(true);
        } else if (modal === 'import') {
            setImportData([]);
            setImportLog([]);
            setIsImportModalOpen(true);
        } else if (modal === 'mutasi' && user) {
            setMutasiTargetOpdId(user.opdId);
            setMutasiTargetJabatanId('');
            setMutasiNomorSk('');
            setMutasiAlasan('');
            setTargetJabatanList([]); 
            setIsMutasiModalOpen(true);
        }
    };

    const handleBulkDelete = () => {
        if (selectedUsers.length === 0) return;
        const usersToDelete = selectedUsers.map(id => userList.find(u => u.id === id)).filter(u => u !== undefined && u.uid !== userProfile?.uid) as UserProfile[];
        if (usersToDelete.length === 0) { setFlashMessage('error', 'Tidak ada pengguna valid yang dipilih.'); return; }

        setConfirmModalState({
            isOpen: true, title: `Hapus ${usersToDelete.length} Pengguna`, message: `PERINGATAN: Hapus PERMANEN?`, confirmText: `Hapus`,
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    const batch = writeBatch(db);
                    usersToDelete.forEach(u => { if (u.id) batch.delete(doc(db, 'users', u.id)); });
                    await batch.commit();
                    const deleteAuthFunction = httpsCallable(functions, 'deleteUserByAdmin');
                    const authPromises = usersToDelete.map(u => deleteAuthFunction({ uid: u.uid }).catch(e => console.warn(`Auth del fail ${u.uid}:`, e)));
                    await Promise.all(authPromises);
                    
                    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['master', 'opdData'] }), 2000);

                    setFlashMessage('success', `Berhasil menghapus ${usersToDelete.length} pengguna.`); setSelectedUsers([]); 
                } catch (error: any) { setFlashMessage('error', `Gagal hapus massal: ${error.message}`); } finally { setConfirmModalState(prev => ({ ...prev, isOpen: false })); setIsProcessing(false); }
            }
        });
    };

    const handleDeleteUser = (user: UserProfile) => {
        if (user.uid === userProfile?.uid) { setFlashMessage('error', 'Anda tidak dapat menghapus akun Anda sendiri.'); return; }
        setConfirmModalState({
            isOpen: true, title: 'Hapus Pengguna', message: `Hapus ${user.namaLengkap}?`, confirmText: 'Hapus',
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    if (user.id) await deleteDoc(doc(db, 'users', user.id));
                    try { const deleteAuthFunction = httpsCallable(functions, 'deleteUserByAdmin'); await deleteAuthFunction({ uid: user.uid }); } catch (authError: any) { console.warn("Auth del fail:", authError); }
                    
                    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['master', 'opdData', user.opdId] }), 2000);
                    setFlashMessage('success', `Pengguna ${user.namaLengkap} dihapus.`);
                } catch (error: any) { setFlashMessage('error', `Gagal menghapus: ${error.message}`); } finally { setConfirmModalState(prev => ({ ...prev, isOpen: false })); setIsProcessing(false); }
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
         e.preventDefault();
        if (!currentUser || !currentUser.id) return;
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "users", currentUser.id), { 
                namaLengkap: currentUser.namaLengkap, jabatanId: currentUser.jabatanId, role: currentUser.role, 
                status: currentUser.status, additionalRoles: selectedAdditionalRoles, email: currentUser.email, nomorWa: currentUser.nomorWa || ''
            });

            // --- [OPTIMISTIC UPDATE] ---
            queryClient.setQueryData(['master', 'opdData', currentUser.opdId], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    users: oldData.users.map((u: any) => u.id === currentUser.id ? { 
                        ...u, 
                        namaLengkap: currentUser.namaLengkap, 
                        jabatanId: currentUser.jabatanId, 
                        role: currentUser.role, 
                        status: currentUser.status, 
                        additionalRoles: selectedAdditionalRoles, 
                        email: currentUser.email, 
                        nomorWa: currentUser.nomorWa || '' 
                    } : u)
                };
            });
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['master', 'opdData', currentUser.opdId] }), 3000);
            // ---------------------------

            setFlashMessage('success', 'Data lengkap pengguna berhasil diperbarui.'); setIsEditModalOpen(false);
        } catch (err: any) { setFlashMessage('error', err.message || 'Gagal memperbarui.'); } finally { setIsProcessing(false); }
    };

    useEffect(() => {
        const fetchTargetJabatans = async () => {
            if (!mutasiTargetOpdId) { setTargetJabatanList([]); return; }
            if (opdFilter === mutasiTargetOpdId && jabatanMap.size > 0) {
                 const localList = Array.from(jabatanMap.values()).filter(j => j.opdId === mutasiTargetOpdId && j.status === 'aktif');
                 setTargetJabatanList(prev => { if (prev.length === localList.length && prev.length > 0 && prev[0].id === localList[0].id) { return prev; } return localList; });
                 return;
            }
            setIsLoadingTargetJabatan(true);
            try {
                const q = query(collection(db, 'jabatan'), where('opdId', '==', mutasiTargetOpdId), where('status', '==', 'aktif'));
                const snapshot = await getDocs(q);
                const fetchedList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Jabatan));
                setTargetJabatanList(fetchedList);
            } catch (error) { console.error("Gagal ambil jabatan:", error); setTargetJabatanList([]); } finally { setIsLoadingTargetJabatan(false); }
        };
        if (isMutasiModalOpen) fetchTargetJabatans();
    }, [mutasiTargetOpdId, isMutasiModalOpen]);

    const sortedTargetJabatanList = useMemo(() => [...targetJabatanList].sort((a, b) => a.level - b.level), [targetJabatanList]);

    const handleMutasiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !mutasiTargetOpdId || !mutasiTargetJabatanId) {
            alert("Mohon lengkapi OPD dan Jabatan tujuan.");
            return;
        }

        setIsProcessing(true);

        try {
            const qCheck = query(
                collection(db, 'users'), 
                where('jabatanId', '==', mutasiTargetJabatanId),
                where('status', '==', 'aktif')
            );
            
            const snapshotCheck = await getDocs(qCheck);
            
            if (!snapshotCheck.empty) {
                const existingUser = snapshotCheck.docs[0].data() as UserProfile;
                if (existingUser.uid !== currentUser.uid) {
                    throw new Error(`GAGAL MUTASI: Jabatan tujuan masih diisi oleh "${existingUser.namaLengkap}". Harap mutasi atau nonaktifkan pejabat lama terlebih dahulu.`);
                }
            }

            const isBedaOpd = currentUser.opdId !== mutasiTargetOpdId;
            const tipeMutasi: TipeMutasi = isBedaOpd ? 'Mutasi Antar OPD' : 'Rotasi Internal';

            const batch = writeBatch(db);
            const userRef = doc(db, 'users', currentUser.id!); 
            const timestamp = Timestamp.fromDate(new Date());

            batch.update(userRef, {
                opdId: mutasiTargetOpdId,
                jabatanId: mutasiTargetJabatanId,
                updatedAt: timestamp
            });
            
            const targetOpdName = getOpdName(mutasiTargetOpdId);
            const targetJabatanObj = targetJabatanList.find(j => j.id === mutasiTargetJabatanId);
            const targetJabatanName = targetJabatanObj ? targetJabatanObj.namaJabatan : "Tidak Diketahui";
            
            const riwayatRef = doc(collection(db, 'riwayat_mutasi'));
            
            const riwayatData: RiwayatMutasi = {
                id: riwayatRef.id,
                userId: currentUser.uid,
                namaUser: currentUser.namaLengkap,
                nipUser: currentUser.nip,
                opdAsalId: currentUser.opdId,
                namaOpdAsal: getOpdName(currentUser.opdId),
                jabatanAsalId: currentUser.jabatanId,
                namaJabatanAsal: getJabatanNameById(currentUser.jabatanId),
                opdTujuanId: mutasiTargetOpdId,
                namaOpdTujuan: targetOpdName,
                jabatanTujuanId: mutasiTargetJabatanId,
                namaJabatanTujuan: targetJabatanName,
                tanggalMutasi: Timestamp.fromDate(new Date(mutasiTanggal)),
                nomorSk: mutasiNomorSk,
                alasan: mutasiAlasan,
                tipe: tipeMutasi,
                mutatedByUserId: userProfile?.uid || 'system',
                createdAt: timestamp
            };
            
            batch.set(riwayatRef, riwayatData);

            await batch.commit();

            // --- [OPTIMISTIC UPDATE MUTASI] ---
            const updatedUser = { ...currentUser, opdId: mutasiTargetOpdId, jabatanId: mutasiTargetJabatanId };

            // 1. Hapus dari cache OPD lama
            queryClient.setQueryData(['master', 'opdData', currentUser.opdId], (oldData: any) => {
                if (!oldData) return oldData;
                return { ...oldData, users: oldData.users.filter((u: any) => u.id !== currentUser.id) };
            });

            // 2. Tambahkan ke cache OPD baru (jika beda OPD)
            if (isBedaOpd) {
                queryClient.setQueryData(['master', 'opdData', mutasiTargetOpdId], (oldData: any) => {
                    if (!oldData) return oldData;
                    return { ...oldData, users: [...oldData.users, updatedUser] };
                });
            }

            // 3. Trigger Invalidate untuk sinkronisasi dengan Cloud Function
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['master', 'opdData', currentUser.opdId] });
                queryClient.invalidateQueries({ queryKey: ['master', 'opdData', mutasiTargetOpdId] });
            }, 3000);
            // ---------------------------------

            setFlashMessage('success', `Berhasil melakukan ${tipeMutasi} untuk ${currentUser.namaLengkap}.`);
            setIsMutasiModalOpen(false);
            setCurrentUser(null);
        } catch (err: any) {
            console.error(err);
            setFlashMessage('error', err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBatchRoleSave = async () => {
        if (selectedUsers.length === 0) return;
        setIsProcessing(true);
        try {
            const batch = writeBatch(db);
            selectedUsers.forEach(userId => { const userRef = doc(db, 'users', userId); batch.update(userRef, { additionalRoles: batchRoles }); });
            await batch.commit();
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['master', 'opdData'] }), 2000);
            setFlashMessage('success', `Berhasil update peran untuk ${selectedUsers.length} pengguna.`); setIsBatchRoleModalOpen(false); setSelectedUsers([]); setBatchRoles([]);
        } catch (error: any) { setFlashMessage('error', 'Gagal update massal.'); } finally { setIsProcessing(false); }
    };

    const handleDownloadTemplate = () => {
        const csvContent = "namaLengkap,nip,email,password,namaJabatan,role\nBudi Santoso,198001012000031001,budi@example.com,password123,Kepala Bidang Informatika,user";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'template_user.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: (results) => { setImportData(results.data); },
                error: (error) => { setGlobalMessage({ type: 'error', text: `Gagal membaca file: ${error.message}` }); }
            });
        }
    };

    const handleImportUsers = async () => {
        if (importData.length === 0) { alert("Tidak ada data untuk diimpor."); return; }
        
        let targetOpdId = userProfile?.opdId;
        if (userProfile?.role === 'super_admin' || isAdminInduk) { 
            targetOpdId = importOpdId || (opdFilter !== 'Semua' ? opdFilter : '');
            if (!targetOpdId) { 
                alert("Pilih OPD target dulu."); return; 
            } 
        }
        if (!targetOpdId) { alert("ID OPD tidak ditemukan."); return; }

        setIsImportProcessing(true); setImportLog([]); const logs: string[] = [];

        for (const [index, row] of importData.entries()) {
            const rowNum = index + 1;
            const { namaLengkap, nip, email, password, namaJabatan, role } = row;
            if (!namaLengkap || !nip || !email || !password || !namaJabatan) { logs.push(`Row ${rowNum}: Gagal - Data tidak lengkap.`); continue; }
            const jabatanId = jabatanMapByName.get(namaJabatan.toLowerCase().trim());
            if (!jabatanId) { logs.push(`Row ${rowNum}: Gagal - Jabatan "${namaJabatan}" tidak ditemukan.`); continue; }
            try {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                await setDoc(doc(db, 'users', nip), { uid: userCredential.user.uid, namaLengkap, nip, email, opdId: targetOpdId, jabatanId, role: role || 'user', status: 'aktif', createdAt: new Date() });
                logs.push(`Row ${rowNum}: Sukses.`);
            } catch (err: any) { logs.push(`Row ${rowNum}: Gagal - ${err.message}`); }
            setImportLog([...logs]);
        }
        
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['master', 'opdData'] }), 2000);
        setIsImportProcessing(false); setImportLog(logs); setFlashMessage('success', "Impor selesai. Lihat log untuk detail."); if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSelectUser = (id: string, checked: boolean) => { setSelectedUsers(prev => checked ? [...prev, id] : prev.filter(userId => userId !== id)); };
    const resetImportModal = () => { setIsImportModalOpen(false); setImportData([]); setImportLog([]); setImportOpdId(''); };

    return (
        <div className="animate-fadeInUp pb-20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div><h1 className="text-3xl font-bold text-foreground">Manajemen Pengguna</h1><p className="text-muted-foreground">Kelola akun, peran, dan mutasi pegawai.</p></div>
                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                    <Button onClick={() => openModal('import')} variant="outline"><Upload size={16} className="mr-2" /> Impor</Button>
                    <Button asChild><Link href="/dashboard/users/register"><UserPlus size={16} className="mr-2" /> Daftarkan</Link></Button>
                </div>
            </div>

            {globalMessage.text && (
                <Alert variant={globalMessage.type === 'success' ? 'default' : 'destructive'} className={`my-4 ${globalMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700' : ''}`}>
                    <AlertDescription>{globalMessage.text}</AlertDescription>
                </Alert>
            )}

            {selectedUsers.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200"><Users size={18} /> <span className="font-semibold">{selectedUsers.length}</span> pengguna dipilih</div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isProcessing}><Trash2 size={16} className="mr-2" /> Hapus {selectedUsers.length} Data Terpilih</Button>
                        <Button size="sm" onClick={() => { setBatchRoles([]); setIsBatchRoleModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white"><ShieldCheck size={16} className="mr-2" /> Atur Peran Massal</Button>
                    </div>
                </div>
            )}

            <div className="mt-6 p-4 bg-card rounded-xl border border-border shadow-sm space-y-4">
                {(userProfile?.role === 'super_admin' || isAdminInduk) && (
                     <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <div><Label htmlFor="opd-search" className="mb-1">Cari Nama Pengguna</Label><div className="relative"><Input id="opd-search" type="text" placeholder="Ketik nama pengguna..." value={opdSearchTerm} onChange={e => setOpdSearchTerm(e.target.value)} className="pl-8" /><Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /></div></div>
                        <div className="md:col-span-2">
                             <Label htmlFor="opd-select" className="mb-1">Pilih OPD untuk Menampilkan Data</Label>
                            <Select value={opdFilter} onValueChange={setOpdFilter}>
                                <SelectTrigger id="opd-select"><SelectValue placeholder="-- Pilih OPD --" /></SelectTrigger>
                                <SelectContent>
                                    {userProfile?.role === 'super_admin' && <SelectItem value="Semua">-- Semua OPD --</SelectItem>}
                                    {filteredOpdOptions.map(opd => <SelectItem key={opd.id} value={opd.id!}>{opd.tipe === 'Sub-OPD' ? ` - ${opd.namaOpd}` : opd.namaOpd}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                     </div>
                )}
                {['admin_opd', 'staf_tu'].includes(userProfile?.role || '') && opdConfig && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>OPD: <strong>{getOpdName(userProfile?.opdId || '')}</strong></span><span>Kuota: {userList.filter(u => u.status === 'aktif').length} / {opdConfig.kuotaPengguna}</span></div>
                )}
            </div>

            <div className="mt-8">
                {isMasterLoading ? ( <div className="text-center p-8 text-muted-foreground"><Loader2 className="animate-spin mx-auto h-8 w-8 mb-2"/>Memuat data...</div> ) : (filteredUsers.length === 0) ? ( <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed border-border"><p className="font-semibold">Tidak Ada Pengguna Ditemukan</p><p className="text-sm">Silakan pilih filter OPD yang lain atau tambahkan pengguna baru.</p></div> ) : (
                    <>
                        <div className="space-y-4 md:hidden">{filteredUsers.map(user => ( <UserCard key={user.id} user={user} getJabatanName={getJabatanNameById} getOpdName={getOpdName} onEdit={u => openModal('edit', u)} onReset={u => openModal('reset', u)} onLoginAs={u => openModal('loginAs', u)} onMutasi={u => openModal('mutasi', u)} onDelete={handleDeleteUser} onSelect={handleSelectUser} isSelected={selectedUsers.includes(user.id!)} /> ))}</div>
                        <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                            <Table>
                                <TableHeader><TableRow><TableHead className="w-10 text-center"><Checkbox checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={(checked) => setSelectedUsers(checked ? filteredUsers.map(u => u.id!) : [])} aria-label="Pilih Semua"/></TableHead><TableHead>Nama</TableHead><TableHead>Jabatan</TableHead><TableHead>OPD</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredUsers.map(user => (
                                        <TableRow key={user.id} data-state={selectedUsers.includes(user.id!) ? 'selected' : ''}>
                                            <TableCell className="text-center"><Checkbox checked={selectedUsers.includes(user.id!)} onCheckedChange={(checked) => handleSelectUser(user.id!, checked as boolean)} aria-label="Pilih Baris"/></TableCell>
                                            <TableCell className="font-medium">{user.namaLengkap}</TableCell><TableCell>{getJabatanNameById(user.jabatanId)}</TableCell><TableCell className="text-muted-foreground text-sm">{getOpdName(user.opdId)}</TableCell>
                                            <TableCell><Badge variant={user.status === 'aktif' ? 'default' : 'destructive'} className={user.status === 'aktif' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>{user.status}</Badge></TableCell>
                                            <TableCell className="flex items-center justify-center space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => openModal('mutasi', user)} title="Mutasi Pegawai"><ArrowRightLeft size={16} className="text-orange-600"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => openModal('edit', user)} title="Edit"><FilePenLine size={16} className="text-blue-600"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)} title="Hapus Permanen"><Trash2 size={16} className="text-red-600"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            {/* --- MODAL MUTASI --- */}
            {isMutasiModalOpen && currentUser && (
                <Dialog open={isMutasiModalOpen} onOpenChange={setIsMutasiModalOpen}>
                    <DialogContent className="sm:max-w-lg bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-orange-600">
                                <ArrowRightLeft size={20}/> Form Mutasi / Rotasi Pegawai
                            </DialogTitle>
                            <DialogDescription>
                                Memindahkan <strong>{currentUser.namaLengkap}</strong> ke unit atau jabatan baru.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleMutasiSubmit} className="space-y-4 py-2">
                            <div className="p-3 bg-muted rounded-lg text-sm grid grid-cols-2 gap-2 border border-border">
                                <div><span className="text-muted-foreground block text-xs">OPD Saat Ini</span> {getOpdName(currentUser.opdId)}</div>
                                <div><span className="text-muted-foreground block text-xs">Jabatan Saat Ini</span> {getJabatanNameById(currentUser.jabatanId)}</div>
                            </div>

                            <div className="space-y-3">
                                <Label>OPD Tujuan</Label>
                                <Select 
                                    value={mutasiTargetOpdId} 
                                    onValueChange={(v) => { setMutasiTargetOpdId(v); setMutasiTargetJabatanId(''); }} 
                                    disabled={userProfile?.role === 'staf_tu' || (userProfile?.role === 'admin_opd' && !isAdminInduk)}
                                >
                                    <SelectTrigger><SelectValue placeholder="Pilih OPD Tujuan" /></SelectTrigger>
                                    <SelectContent>
                                        {filteredOpdOptions.map(o => <SelectItem key={o.id} value={o.id!}>{o.tipe === 'Sub-OPD' ? ` - ${o.namaOpd}` : o.namaOpd}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label>Jabatan Baru (di OPD Tujuan)</Label>
                                <Select value={mutasiTargetJabatanId} onValueChange={setMutasiTargetJabatanId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingTargetJabatan ? "Memuat jabatan..." : "Pilih Jabatan..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingTargetJabatan ? (
                                            <div className="p-2 text-sm text-muted-foreground text-center"><Loader2 className="animate-spin inline mr-2 h-4 w-4"/> Mengambil data...</div>
                                        ) : sortedTargetJabatanList.length > 0 ? (
                                            sortedTargetJabatanList.map(j => {
                                                return <SelectItem key={j.id} value={j.id!}>{j.namaJabatan}</SelectItem>
                                            })
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                {mutasiTargetOpdId ? "Tidak ada jabatan aktif di OPD ini" : "Pilih OPD dulu"}
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Tanggal Berlaku (TMT)</Label><Input type="date" value={mutasiTanggal} onChange={e => setMutasiTanggal(e.target.value)} required /></div>
                                <div><Label>Nomor SK (Opsional)</Label><Input placeholder="No. SK..." value={mutasiNomorSk} onChange={e => setMutasiNomorSk(e.target.value)} /></div>
                            </div>
                            
                            <div><Label>Alasan / Keterangan</Label><Textarea placeholder="Contoh: Promosi jabatan, kebutuhan organisasi..." value={mutasiAlasan} onChange={e => setMutasiAlasan(e.target.value)} rows={2}/></div>

                        </form>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsMutasiModalOpen(false)}>Batal</Button>
                            <Button onClick={handleMutasiSubmit} disabled={isProcessing || !mutasiTargetJabatanId} className="bg-orange-600 hover:bg-orange-700 text-white">
                                {isProcessing ? <Loader2 className="mr-2 animate-spin"/> : <ArrowRightLeft className="mr-2 h-4 w-4"/>}
                                Proses Mutasi
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {isEditModalOpen && currentUser && (
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Data Lengkap Pengguna</DialogTitle>
                            <DialogDescription>Sesuaikan informasi profil, kontak, dan hak akses pengguna.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdate} className="mt-4 space-y-4">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>NIP (ID Dokumen)</Label>
                                    <Input value={currentUser.nip} disabled className="bg-muted" />
                                    <p className="text-[10px] text-muted-foreground">NIP tidak dapat diubah karena digunakan sebagai ID sistem.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama Lengkap</Label>
                                    <Input 
                                        value={currentUser.namaLengkap} 
                                        onChange={e => setCurrentUser({ ...currentUser, namaLengkap: e.target.value })} 
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input 
                                        type="email"
                                        value={currentUser.email} 
                                        onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })} 
                                    />
                                     <p className="text-[10px] text-muted-foreground">Perubahan email di sini hanya update data profil, bukan login Auth.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nomor WhatsApp</Label>
                                    <Input 
                                        type="tel"
                                        value={currentUser.nomorWa || ''} 
                                        onChange={e => setCurrentUser({ ...currentUser, nomorWa: e.target.value })} 
                                        placeholder="628..."
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg space-y-3">
                                 <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                                    <Briefcase size={16} />
                                    <span className="font-semibold text-sm">Data Kepegawaian (Koreksi)</span>
                                 </div>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label className="text-xs">OPD (Unit Kerja)</Label>
                                        <Input value={getOpdName(currentUser.opdId)} disabled className="bg-muted text-xs" />
                                     </div>
                                     <div className="space-y-2">
                                        <Label className="text-xs">Jabatan</Label>
                                        <Select value={currentUser.jabatanId} onValueChange={(v) => setCurrentUser({ ...currentUser, jabatanId: v })}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Array.from(jabatanMap.values())
                                                    .filter(j => j.opdId === currentUser.opdId)
                                                    .map(j => <SelectItem key={j.id} value={j.id!}>{j.namaJabatan}</SelectItem>)
                                                }
                                            </SelectContent>
                                        </Select>
                                     </div>
                                 </div>
                                 <div className="text-[10px] text-muted-foreground mt-2">
                                    * Gunakan menu <strong>Mutasi</strong> untuk perpindahan jabatan/OPD resmi dengan SK.
                                 </div>
                            </div>

                            <div className="p-3 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800 rounded-lg space-y-3">
                                 <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-1">
                                    <ShieldCheck size={16} />
                                    <span className="font-semibold text-sm">Hak Akses & Role Aplikasi</span>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Role Utama</Label>
                                        <Select value={currentUser.role} onValueChange={(v) => setCurrentUser({ ...currentUser, role: v as UserRole })}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User (Pegawai)</SelectItem>
                                                <SelectItem value="staf_tu">Staf TU (Tata Usaha)</SelectItem>
                                                {userProfile?.role !== 'staf_tu' && <SelectItem value="admin_opd">Admin OPD</SelectItem>}
                                                {userProfile?.role === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Status Akun</Label>
                                         <Select value={currentUser.status} onValueChange={(v) => setCurrentUser({ ...currentUser, status: v as UserStatus })}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="aktif">Aktif</SelectItem>
                                                <SelectItem value="nonaktif">Nonaktif (Blokir)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                 </div>

                                 <div className="space-y-2 pt-2 border-t border-yellow-200 dark:border-yellow-800/30">
                                    <Label className="text-xs mb-2 block">Role Fungsional Tambahan</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableAdditionalRoles.map((roleOption) => (
                                            <div key={roleOption.value} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`role-${roleOption.value}`} 
                                                    checked={selectedAdditionalRoles.includes(roleOption.value)} 
                                                    onCheckedChange={() => setSelectedAdditionalRoles(prev => prev.includes(roleOption.value) ? prev.filter(r => r !== roleOption.value) : [...prev, roleOption.value])}
                                                />
                                                <Label htmlFor={`role-${roleOption.value}`} className="font-normal cursor-pointer text-xs">{roleOption.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4" />}
                                    Simpan Perubahan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
            
            <Dialog open={isBatchRoleModalOpen} onOpenChange={setIsBatchRoleModalOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader><DialogTitle>Atur Peran Massal</DialogTitle></DialogHeader>
                    <div className="p-4 border border-border rounded-lg bg-muted/30 my-2 space-y-3">
                        {availableAdditionalRoles.map((roleOption) => (
                            <div key={roleOption.value} className="flex items-center space-x-2">
                                <Checkbox id={`batch-role-${roleOption.value}`} checked={batchRoles.includes(roleOption.value)} onCheckedChange={() => setBatchRoles(prev => prev.includes(roleOption.value) ? prev.filter(r => r !== roleOption.value) : [...prev, roleOption.value])} />
                                <Label htmlFor={`batch-role-${roleOption.value}`} className="font-normal cursor-pointer text-sm">{roleOption.label}</Label>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBatchRoleModalOpen(false)}>Batal</Button>
                        <Button onClick={handleBatchRoleSave} disabled={isProcessing}>Simpan Massal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isImportModalOpen} onOpenChange={resetImportModal}>
                 <DialogContent className="sm:max-w-2xl bg-card border-border">
                     <DialogHeader>
                         <DialogTitle className="flex items-center gap-2">
                             <FileSpreadsheet className="text-green-600"/> Import Pengguna (CSV)
                         </DialogTitle>
                     </DialogHeader>
                     
                     <div className='space-y-4 py-2'>
                        {(userProfile?.role === 'super_admin' || isAdminInduk) && (
                            <div>
                                <Label>OPD Target (Default / Fallback)</Label>
                                <Select value={importOpdId || (opdFilter !== 'Semua' ? opdFilter : '')} onValueChange={setImportOpdId}>
                                    <SelectTrigger><SelectValue placeholder="Pilih OPD Target" /></SelectTrigger>
                                    <SelectContent>
                                        {filteredOpdOptions.map(opd => (
                                            <SelectItem key={opd.id} value={opd.id!}>{opd.tipe === 'Sub-OPD' ? ` - ${opd.namaOpd}` : opd.namaOpd}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border border-dashed rounded-lg bg-muted/30">
                            <div className="flex-1 w-full">
                                <Label>Upload File CSV</Label>
                                <Input 
                                    type="file" 
                                    accept=".csv" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Header wajib: <strong>namaLengkap, nip, email, password, namaJabatan</strong>.<br/>
                                    Opsional: role (default: user), nomorWa.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="mt-6 sm:mt-0">
                                <Download size={16} className="mr-2"/> Template
                            </Button>
                        </div>

                        {importData.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted px-3 py-2 text-xs font-bold border-b flex justify-between items-center">
                                    <span>Preview ({importData.length} baris)</span>
                                    <Button variant="ghost" size="sm" onClick={() => { setImportData([]); setImportLog([]); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="h-6 text-xs text-red-500"><X size={14} className="mr-1"/> Batal</Button>
                                </div>
                                <ScrollArea className="h-40">
                                    <Table>
                                        <TableHeader>
                                            <TableRow><TableHead className="h-8 text-xs">Nama</TableHead><TableHead className="h-8 text-xs">Jabatan</TableHead><TableHead className="h-8 text-xs">Email</TableHead></TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {importData.slice(0, 5).map((row, i) => (
                                                <TableRow key={i} className="h-8">
                                                    <TableCell className="py-1 text-xs">{row.namaLengkap}</TableCell>
                                                    <TableCell className="py-1 text-xs">{row.namaJabatan}</TableCell>
                                                    <TableCell className="py-1 text-xs">{row.email}</TableCell>
                                                </TableRow>
                                            ))}
                                            {importData.length > 5 && <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground">... dan {importData.length - 5} lainnya</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        )}
                        
                        {importLog.length > 0 && (
                             <div className="bg-black text-white p-3 rounded-lg font-mono text-xs h-32 overflow-y-auto">
                                 {importLog.map((log, i) => <div key={i}>{log}</div>)}
                             </div>
                        )}
                     </div>

                     <DialogFooter>
                         <Button variant="outline" onClick={resetImportModal}>Tutup</Button>
                         <Button onClick={handleImportUsers} disabled={isImportProcessing || importData.length === 0} className="bg-green-600 hover:bg-green-700">
                             {isImportProcessing ? <Loader2 className="mr-2 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>} 
                             Proses Import
                         </Button>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>

            <ConfirmActionModal 
                isOpen={confirmModalState.isOpen} 
                onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))} 
                onConfirm={confirmModalState.onConfirm} 
                title={confirmModalState.title} 
                message={confirmModalState.message} 
                confirmText={confirmModalState.confirmText}
                isProcessing={isProcessing} 
            />
        </div>
    );
}