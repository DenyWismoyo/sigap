// Lokasi: src/app/dashboard/users/register/page.tsx
// [MODIFIKASI REFACCTOR (Tahap 2)]
// - Mengganti <input> dan <select> HTML dengan <Input> dan <Select> shadcn/ui.
// - Mengganti <button> dengan <Button> shadcn/ui.
// - Menggunakan <Label> untuk semua label.
// [UPDATE STAF TU]
// - Mengizinkan staf_tu untuk mendaftarkan user baru (terkunci di OPD mereka).
// [UPDATE DARK MODE]
// - Standardisasi class Tailwind menggunakan variabel Shadcn UI (bg-card, text-foreground, border-border)
// [FASE D EKSEKUSI]
// - Mengizinkan admin_opd (tipe Induk) untuk mendaftarkan user baru ke Sub-OPD di bawahnya.
// - Pengecekan limit kuota akan diadaptasi membaca kuota dari OPD target pendaftaran.
// [OPTIMISTIC UPDATE]
// - Menambahkan useQueryClient untuk memasukkan user baru ke cache seketika agar muncul tanpa refresh.
// [VALIDASI DOUBLE OCCUPANCY]
// - Menampilkan nama pengguna yang sedang menduduki jabatan di dropdown.
// - Menampilkan peringatan (Warning) jika admin memilih jabatan yang sudah terisi.

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, app, functions } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, query, where, getDoc } from 'firebase/firestore';
import { OPD, Jabatan, UserProfile } from '@/types';
import Link from 'next/link';
import { useUserAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { useQueryClient } from '@tanstack/react-query'; // <-- Import React Query Client

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'; // Ditambahkan AlertTriangle
import { Alert, AlertDescription } from "@/components/ui/alert";
// --- Akhir Impor Shadcn ---

type UserRole = UserProfile['role'];

// Inisialisasi app Firebase sekunder untuk pembuatan user
const appName = "secondaryRegistrationApp";
let secondaryApp;
try {
  secondaryApp = initializeApp(app.options, appName);
} catch (error) {
  secondaryApp = app; // Fallback jika inisialisasi gagal (misal: HMR)
}
const secondaryAuth = getAuth(secondaryApp);

export default function RegisterUserPage() {
  const router = useRouter();
  const { userProfile, opdConfig } = useUserAuth();
  const queryClient = useQueryClient(); // <-- Inisialisasi Query Client
  
  const [opdList, setOpdList] = useState<OPD[]>([]);
  const [jabatanList, setJabatanList] = useState<Jabatan[]>([]);
  const [usersInSelectedOpd, setUsersInSelectedOpd] = useState<UserProfile[]>([]); // State baru untuk cek penghuni jabatan
  
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nip, setNip] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [selectedOpd, setSelectedOpd] = useState('');
  const [selectedJabatan, setSelectedJabatan] = useState('');
  const [nomorWa, setNomorWa] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // [FASE D] Menentukan apakah user saat ini adalah Admin Induk
  const isAdminInduk = useMemo(() => {
    if (userProfile?.role !== 'admin_opd') return false;
    const myOpd = opdList.find(o => o.id === userProfile.opdId);
    return myOpd?.tipe === 'Induk';
  }, [userProfile, opdList]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [opdSnapshot, jabatanSnapshot] = await Promise.all([
        getDocs(collection(db, "opd")),
        getDocs(collection(db, "jabatan"))
      ]);
      const opds = opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD));
      const jabatans = jabatanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Jabatan));
      setOpdList(opds);
      setJabatanList(jabatans);
      
      // [UPDATE] Set initial OPD untuk admin_opd ATAU staf_tu
      const initialOpdId = (userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu') 
        ? userProfile.opdId 
        : (opds.length > 0 ? opds[0].id! : '');
      setSelectedOpd(initialOpdId);
      
    } catch (err: unknown) { 
      setError("Gagal mengambil data master.");
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // [BARU] Fetch User Aktif ketika OPD dipilih untuk mengetahui jabatan mana yang sudah terisi
  useEffect(() => {
    const fetchUsersInOpd = async () => {
        if (!selectedOpd) {
            setUsersInSelectedOpd([]);
            return;
        }
        try {
            const q = query(
                collection(db, 'users'), 
                where('opdId', '==', selectedOpd), 
                where('status', '==', 'aktif')
            );
            const snap = await getDocs(q);
            setUsersInSelectedOpd(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        } catch (err) {
            console.error("Gagal mengambil data user di OPD ini:", err);
        }
    };
    fetchUsersInOpd();
  }, [selectedOpd]);

  const filteredOpdList = useMemo(() => {
    const indukOpds = opdList.filter(o => o.tipe === 'Induk').sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
    const result: OPD[] = [];
    indukOpds.forEach(induk => {
        result.push(induk);
        const sub = opdList.filter(o => o.idOpdInduk === induk.id).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
        result.push(...sub);
    });
    const usedIds = new Set(result.map(r => r.id));
    opdList.forEach(o => { if (!usedIds.has(o.id)) result.push(o); });
    
    // Admin Induk melihat OPD sendiri dan sub-OPD di bawahnya
    if (userProfile?.role === 'admin_opd') {
         const myOpdId = userProfile.opdId;
         return result.filter(o => o.id === myOpdId || o.idOpdInduk === myOpdId);
    } else if (userProfile?.role === 'staf_tu') {
         return result.filter(o => o.id === userProfile.opdId);
    }
    return result;
  }, [opdList, userProfile]);

  const filteredJabatanList = useMemo(() => {
    if (!selectedOpd) return [];
    return jabatanList.filter(j => j.opdId === selectedOpd);
  }, [jabatanList, selectedOpd]);

  useEffect(() => {
      if (filteredJabatanList.length > 0) {
          const isCurrentJabatanValid = filteredJabatanList.some(j => j.id === selectedJabatan);
          if (!isCurrentJabatanValid) {
              setSelectedJabatan(''); // Default ke "Pilih..."
          }
      } else {
          setSelectedJabatan('');
      }
  }, [selectedOpd, filteredJabatanList, selectedJabatan]);

  // [BARU] Map untuk melacak siapa menduduki jabatan apa
  const jabatanOccupancyMap = useMemo(() => {
      const map = new Map<string, UserProfile[]>();
      usersInSelectedOpd.forEach(u => {
          const list = map.get(u.jabatanId) || [];
          list.push(u);
          map.set(u.jabatanId, list);
      });
      return map;
  }, [usersInSelectedOpd]);

  // [BARU] Pengecekan spesifik untuk jabatan yang sedang dipilih
  const selectedJabatanOccupants = useMemo(() => {
      if (!selectedJabatan) return [];
      return jabatanOccupancyMap.get(selectedJabatan) || [];
  }, [selectedJabatan, jabatanOccupancyMap]);

  // [UPDATE] Label jabatan kini menampilkan nama penghuni jika ada
  const getJabatanLabel = useCallback((jabatan: Jabatan) => {
    let label = jabatan.namaJabatan;
    
    // Informasi atasan
    if (jabatan.idAtasan) {
        const atasan = jabatanList.find(j => j.id === jabatan.idAtasan);
        label += ` (Atasan: ${atasan?.namaJabatan || 'Tidak Ditemukan'})`;
    }

    // Informasi kursi terisi
    const occupants = jabatanOccupancyMap.get(jabatan.id!);
    if (occupants && occupants.length > 0) {
        const names = occupants.map(o => o.namaLengkap).join(', ');
        label += ` — [Terisi: ${names}]`;
    }

    return label;
  }, [jabatanList, jabatanOccupancyMap]);

  const availableRoles = useMemo(() => {
    if (userProfile?.role === 'super_admin') {
        return [
            { value: 'user', label: 'User' },
            { value: 'staf_tu', label: 'Staf TU' },
            { value: 'admin_opd', label: 'Admin OPD' }, 
        ];
    }
    // [UPDATE] Staf TU dan Admin OPD memiliki opsi yang sama
    if (userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu') {
        return [
            { value: 'user', label: 'User' },
            { value: 'staf_tu', label: 'Staf TU' },
        ];
    }
    return [];
  }, [userProfile]);

  useEffect(() => {
    if (availableRoles.length > 0) {
      setRole(availableRoles[0].value as UserRole);
    }
  }, [availableRoles]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !namaLengkap || !selectedJabatan || !nip) {
      setError("Semua field wajib diisi, termasuk Jabatan dan NIP.");
      return;
    }
    setLoading(true);

    try {
      // [UPDATE] Validasi kuota yang adaptif sesuai OPD target
      if (userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu') {
        let currentKuota = opdConfig?.kuotaPengguna || 0;
        
        // Ambil kuota Sub-OPD target jika Admin Induk mendaftar untuk Sub-OPD nya
        if (selectedOpd !== userProfile.opdId) {
             const targetConfigDoc = await getDoc(doc(db, 'opdConfigs', selectedOpd));
             if (targetConfigDoc.exists()) {
                 currentKuota = targetConfigDoc.data().kuotaPengguna || 0;
             }
        }
        
        const q = query(collection(db, 'users'), 
                      where('opdId', '==', selectedOpd), 
                      where('status', '==', 'aktif'));
        const snapshot = await getDocs(q);
        const penggunaAktif = snapshot.size;

        if (penggunaAktif + 1 > currentKuota) {
          throw new Error(`Gagal mendaftarkan pengguna di OPD yang dipilih. Kuota pengguna aktif sudah habis (${penggunaAktif}/${currentKuota}). Silakan hubungi Super Admin untuk menambah kuota.`);
        }
      }

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCredential.user.uid;

      const userDocRef = doc(db, "users", nip);

      await setDoc(userDocRef, {
        uid: newUid,
        namaLengkap,
        nip,
        email,
        opdId: selectedOpd,
        jabatanId: selectedJabatan,
        role,
        status: 'aktif',
        nomorWa: nomorWa,
      });

      // --- [OPTIMISTIC UPDATE] ---
      // 1. Sisipkan user baru secara instan ke dalam cache React Query
      const newUserObj = {
        id: nip,
        uid: newUid,
        namaLengkap,
        nip,
        email,
        opdId: selectedOpd,
        jabatanId: selectedJabatan,
        role,
        status: 'aktif' as UserProfile['status'],
        nomorWa: nomorWa,
      };

      queryClient.setQueryData(['master', 'opdData', selectedOpd], (oldData: any) => {
          if (!oldData) return oldData;
          return {
              ...oldData,
              users: [...oldData.users, newUserObj]
          };
      });

      // 2. Berikan trigger refresh asli 3 detik kemudian untuk mengambil hasil akhir dari Cloud Function Aggregator
      setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['master', 'opdData', selectedOpd] });
      }, 3000);
      // ---------------------------
      
      alert('Pengguna baru berhasil dibuat!');
      router.push('/dashboard/users');

    } catch (err: unknown) {
      if (err instanceof Error) {
        let message = err.message;
        if (message.includes('auth/email-already-in-use')) {
            message = 'Email ini sudah terdaftar. Silakan gunakan email lain.';
        } else if (message.includes('auth/weak-password')) {
            message = 'Password terlalu lemah. Harap gunakan minimal 6 karakter.';
        }
        setError(message);
      } else {
        setError("Terjadi kesalahan yang tidak diketahui.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-muted-foreground">Memuat data master...</div>;
  }

  return (
    <div className="animate-fadeInUp max-w-4xl mx-auto pb-12">
      <Button asChild variant="link" className="px-0 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard/users">
          <ArrowLeft size={16} className="mr-2" /> Kembali ke Manajemen Pengguna
        </Link>
      </Button>
      
      <div className="p-6 mt-4 bg-card rounded-xl shadow-md border border-border">
        <h1 className="text-2xl font-bold text-foreground">Daftarkan Pengguna Baru</h1>
        <p className="mt-1 text-sm text-muted-foreground">Proses ini akan membuat akun login dan profil pengguna sekaligus.</p>
        
        {error && (
            <Alert variant="destructive" className="my-4">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="md:col-span-2">
            <Label htmlFor="namaLengkap">Nama Lengkap</Label>
            <Input id="namaLengkap" type="text" value={namaLengkap} onChange={e => setNamaLengkap(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
          </div>
          <div>
            <Label htmlFor="nip">NIP (akan menjadi ID Dokumen)</Label>
            <Input id="nip" type="text" value={nip} onChange={e => setNip(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="nomorWa">Nomor WhatsApp (Opsional)</Label>
            <Input id="nomorWa" type="tel" value={nomorWa} onChange={e => setNomorWa(e.target.value)} placeholder="Contoh: 628123456789" />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="opd">OPD</Label>
            {/* [UPDATE] Buka Dropdown jika user adalah Super Admin atau Admin Induk */}
            <Select 
                value={selectedOpd} 
                onValueChange={setSelectedOpd} 
                disabled={userProfile?.role === 'staf_tu' || (userProfile?.role === 'admin_opd' && !isAdminInduk)}
            >
              <SelectTrigger id="opd">
                <SelectValue placeholder="Pilih OPD" />
              </SelectTrigger>
              <SelectContent>
                {filteredOpdList.map(opd => (
                    <SelectItem key={opd.id} value={opd.id!}>
                        {opd.tipe === 'Sub-OPD' ? ` - ${opd.namaOpd}` : opd.namaOpd}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="jabatan">Jabatan</Label>
            <Select value={selectedJabatan} onValueChange={setSelectedJabatan} required>
              <SelectTrigger id="jabatan">
                <SelectValue placeholder="Pilih jabatan" />
              </SelectTrigger>
              <SelectContent>
                {filteredJabatanList.length > 0 ? (
                    filteredJabatanList.map(j => <SelectItem key={j.id} value={j.id!}>{getJabatanLabel(j)}</SelectItem>)
                ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">Tidak ada jabatan di OPD ini</div>
                )}
              </SelectContent>
            </Select>

            {/* [BARU] Peringatan Jika Jabatan Sudah Terisi */}
            {selectedJabatanOccupants.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex gap-3 text-sm text-yellow-800 dark:text-yellow-300 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <strong>Peringatan Kursi Jabatan Ganda!</strong><br/>
                        Jabatan ini sudah diisi oleh: <strong>{selectedJabatanOccupants.map(o => o.namaLengkap).join(', ')}</strong>.<br/>
                        Menambahkan pengguna pada jabatan yang sama dapat menyebabkan error pada arus disposisi/surat. 
                        Harap <Link href="/dashboard/jabatan" className="underline font-bold">buat jabatan baru</Link> terlebih dahulu, atau nonaktifkan/mutasi pejabat lama. (Hubungi Admin OPD Induk jika Anda tidak memiliki akses).
                    </div>
                </div>
            )}
          </div>
          <div className="md:col-span-2 mt-2">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Mendaftarkan...' : 'Daftarkan Pengguna'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}