// Lokasi: src/app/dashboard/components/DelegasiWidget.tsx
// [MODIFIKASI]
// - Mengganti dropdown kustom dengan <Popover> + <Command> (untuk pencarian).
// - Mengganti <select> durasi dengan <Select> Shadcn.
// - Mengganti <input> alasan dengan <Input> Shadcn.
// - Mengganti <button> dengan <Button> Shadcn.
// - Mengganti semua kelas hardcoded (dark:...) dengan kelas semantik (bg-card, text-foreground, dll).
// [PERBAIKAN BUILD ERROR 11/11/2025]
// - Mengubah signature komponen untuk menerima `userCache` sebagai prop.
// - Menggunakan `userCache` untuk mendapatkan nama pejabat yang sudah terpilih (fallback).

"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { Jabatan, UserProfile } from '@/types'; // [PERBAIKAN] Impor UserProfile
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { Users, ChevronDown, Clock, X, Loader2, LogOut, CheckCircle, Search } from 'lucide-react';

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
// --- Akhir Impor Shadcn ---


// Opsi durasi delegasi
const durationOptions = [
    { value: '2h', label: '2 Jam dari Sekarang' },
    { value: '4h', label: '4 Jam dari Sekarang' },
    { value: 'eod', label: 'Hingga Akhir Jam Kerja' },
    { value: 'manual', label: 'Nonaktifkan Manual' },
];

// [PERBAIKAN] Terima userCache sebagai prop
export default function DelegasiWidget({ userCache }: { userCache: Map<string, UserProfile> }) {
    const { userProfile, jabatanProfile } = useUserAuth();
    const functions = getFunctions(db.app, "asia-southeast2");

    const [penerimaDelegasi, setPenerimaDelegasi] = useState<UserProfile | null>(null);
    const [isPenerimaLoading, setIsPenerimaLoading] = useState(true);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedJabatanId, setSelectedJabatanId] = useState('');
    const [selectedDurasi, setSelectedDurasi] = useState('2h');
    const [alasan, setAlasan] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const [searchStaf, setSearchStaf] = useState('');
    const [isStafLoading, setIsStafLoading] = useState(false);
    const [delegasiResults, setDelegasiResults] = useState<UserProfile[]>([]);

    const delegasiAktif = jabatanProfile?.delegasiSementara;
    const isDelegating = !!(delegasiAktif && delegasiAktif.berlakuHingga.toDate() > new Date());

    useEffect(() => {
        if (isDelegating && delegasiAktif && !penerimaDelegasi) {
            const fetchPenerima = async () => {
                setIsPenerimaLoading(true);
                try {
                    // [PERBAIKAN] Gunakan userCache dulu
                    const cachedUser = userCache.get(delegasiAktif.delegatedToJabatanId);
                    if (cachedUser) {
                        setPenerimaDelegasi(cachedUser);
                    } else {
                        // Fallback ke database jika tidak ada di cache
                        const q = query(
                            collection(db, "users"), 
                            where("jabatanId", "==", delegasiAktif.delegatedToJabatanId), 
                            limit(1)
                        );
                        const userSnap = await getDocs(q);
                        if (!userSnap.empty) {
                            setPenerimaDelegasi(userSnap.docs[0].data() as UserProfile);
                        } else {
                            setError("Tidak dapat menemukan data penerima delegasi.");
                        }
                    }
                } catch (err) {
                    console.error("Gagal fetch penerima delegasi:", err);
                    setError("Gagal memuat data penerima.");
                } finally {
                    setIsPenerimaLoading(false);
                }
            };
            fetchPenerima();
        } else {
            setIsPenerimaLoading(false);
        }
    }, [isDelegating, delegasiAktif, penerimaDelegasi, userCache]); // [PERBAIKAN] Tambah userCache

    // [PERBAIKAN] Gunakan userCache untuk pencarian, tidak perlu fetch
    useEffect(() => {
        if (!isDropdownOpen || searchStaf.length < 2 || !jabatanProfile) {
            setDelegasiResults([]);
            setIsStafLoading(false);
            return;
        }
        
        setIsStafLoading(true);
        const searchLower = searchStaf.toLowerCase();
        const results: UserProfile[] = [];
        
        userCache.forEach(user => {
            if (
                user.opdId === jabatanProfile.opdId &&
                user.level && jabatanProfile.level && user.level > jabatanProfile.level && // Hanya bawahan
                user.status === 'aktif' &&
                (user.searchKeywords?.some(kw => kw.startsWith(searchLower)) || user.namaLengkap.toLowerCase().includes(searchLower)) &&
                user.jabatanId !== jabatanProfile.id
            ) {
                results.push(user);
            }
        });
        
        setDelegasiResults(results.slice(0, 10)); // Batasi hasil
        setIsStafLoading(false);

    }, [searchStaf, jabatanProfile, isDropdownOpen, userCache]); // [PERBAIKAN] Ganti logic, tambah userCache

    const handleDelegasi = async () => {
        if (!selectedJabatanId) {
            setError('Silakan pilih pejabat yang akan didelegasikan.');
            return;
        }
        setIsProcessing(true);
        setError('');
        try {
            const aturDelegasi = httpsCallable(functions, 'aturDelegasiSementara');
            await aturDelegasi({
                delegatedToJabatanId: selectedJabatanId,
                durasi: selectedDurasi,
                alasan: alasan,
            });
            setIsDropdownOpen(false);
            window.location.reload(); 
        } catch (err: any) {
            setError(err.message || 'Gagal mengaktifkan delegasi.');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBatalkan = async () => {
        if (!window.confirm("Apakah Anda yakin ingin menonaktifkan delegasi sementara?")) return;
        setIsProcessing(true);
        try {
            const batalkanDelegasi = httpsCallable(functions, 'batalkanDelegasiSementara');
            await batalkanDelegasi();
            setIsDropdownOpen(false);
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Gagal menonaktifkan delegasi.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSelectUser = (user: UserProfile) => {
        setSelectedJabatanId(user.jabatanId);
        setSearchStaf(user.namaLengkap); 
        setIsDropdownOpen(false); 
    };

    return (
        <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={isDelegating ? 'default' : 'outline'}
                    className={`gap-2 ${
                        isDelegating 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : ''
                    }`}
                >
                    <Users size={16} />
                    <span>{isDelegating ? 'Wewenang Didelegasikan' : 'Delegasikan Wewenang'}</span>
                    {!isDelegating && <ChevronDown size={16} />}
                </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-80 bg-card p-0 border-border shadow-2xl" align="end">
                <div className="p-4 border-b border-border">
                    <h3 className="font-bold text-foreground">
                        {isDelegating ? 'Status Delegasi Aktif' : 'Delegasi Wewenang Sementara'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {isDelegating ? 'Wewenang disposisi sedang dialihkan.' : 'Alihkan wewenang disposisi surat baru.'}
                    </p>
                </div>

                {isDelegating ? (
                     <div className="p-4 space-y-3">
                         <Alert variant="default" className="bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
                             <AlertDescription className="text-center">
                                 <p className="text-sm">Didelegasikan kepada:</p>
                                 <p className="font-bold text-lg">{isPenerimaLoading ? 'Memuat...' : (penerimaDelegasi?.namaLengkap || 'N/A')}</p>
                                 <p className="text-xs">Berlaku hingga: {delegasiAktif.berlakuHingga.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                             </AlertDescription>
                         </Alert>
                        <Button
                            onClick={handleBatalkan}
                            disabled={isProcessing}
                            variant="destructive"
                            className="w-full gap-2"
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={16} />}
                            <span>{isProcessing ? 'Memproses...' : 'Nonaktifkan Delegasi'}</span>
                        </Button>
                     </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        <div>
                            <Label htmlFor="delegasi-search" className="text-sm font-semibold">Delegasikan Kepada</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="delegasi-search"
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between mt-1 font-normal"
                                    >
                                        {/* [PERBAIKAN] Gunakan userCache sebagai fallback */
                                        selectedJabatanId
                                            ? delegasiResults.find(u => u.jabatanId === selectedJabatanId)?.namaLengkap || userCache.get(selectedJabatanId)?.namaLengkap || "Pilih Pejabat"
                                            : "Pilih Pejabat..."}
                                        <Search size={16} className="ml-2 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput 
                                            placeholder="Cari nama atau jabatan..."
                                            value={searchStaf}
                                            onValueChange={setSearchStaf}
                                        />
                                        <CommandList>
                                            {isStafLoading && <CommandEmpty>Mencari...</CommandEmpty>}
                                            {!isStafLoading && delegasiResults.length > 0 ? delegasiResults.map(user => (
                                                <CommandItem
                                                    key={user.uid}
                                                    value={user.namaLengkap}
                                                    onSelect={() => handleSelectUser(user)}
                                                    className="cursor-pointer"
                                                >
                                                    <div>
                                                        <p className="font-semibold text-sm">{user.namaLengkap}</p>
                                                        <p className="text-xs text-muted-foreground">{user.namaJabatan}</p>
                                                    </div>
                                                </CommandItem>
                                            )) : (
                                                <CommandEmpty>{searchStaf.length < 2 ? 'Ketik min 2 huruf' : 'Staf tidak ditemukan.'}</CommandEmpty>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="durasi-select" className="text-sm font-semibold">Durasi</Label>
                            <Select value={selectedDurasi} onValueChange={setSelectedDurasi}>
                                <SelectTrigger id="durasi-select" className="w-full mt-1">
                                    <SelectValue placeholder="Pilih durasi" />
                                </SelectTrigger>
                                <SelectContent>
                                    {durationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="alasan" className="text-sm font-semibold">Alasan (Opsional)</Label>
                            <Input id="alasan" type="text" value={alasan} onChange={e => setAlasan(e.target.value)} placeholder="Contoh: Rapat mendadak" className="mt-1" />
                        </div>
                        <Button
                            onClick={handleDelegasi}
                            disabled={isProcessing || isStafLoading || !selectedJabatanId}
                            className="w-full gap-2"
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={16} />}
                            <span>{isProcessing ? 'Mengaktifkan...' : 'Aktifkan Delegasi'}</span>
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}