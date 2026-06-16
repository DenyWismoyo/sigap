// Lokasi: src/app/dashboard/profil/page.tsx
// [MODIFIKASI]
// - Menambahkan informasi email Google yang terhubung di UI.
// - Tetap menyertakan tombol Bantuan Verifikasi Google.

"use client";

import React, { useState, useEffect, useMemo } from 'react'; 
import { useUserAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { UserProfile } from '@/types'; 
import { UserCircle, ShieldCheck, Save, KeyRound, Palette, Users, Mail, Link as LinkIcon, CheckCircle, AlertTriangle, Loader2, HelpCircle, AlertOctagon, ArrowRight } from 'lucide-react';
import DelegasiWidget from '../components/DelegasiWidget';
import ConfirmModal from '../components/ConfirmModal';

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
// --- Akhir Impor Shadcn ---

export default function ProfilPage() {
    const { user, userProfile, jabatanProfile, loading: authLoading } = useUserAuth();
    const { fontSize, setFontSize } = useTheme();
    const { addToast } = useToast();

    // State for profile form
    const [namaLengkap, setNamaLengkap] = useState('');
    const [nomorWa, setNomorWa] = useState('');
    const [personalEmail, setPersonalEmail] = useState('');
    const [googleDriveLink, setGoogleDriveLink] = useState('');
    const [linkHelperText, setLinkHelperText] = useState('');
    const [googleCalendarSyncEnabled, setGoogleCalendarSyncEnabled] = useState(false);
    
    const [isProfileSaving, setIsProfileSaving] = useState(false);

    // State for password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);
    
    // User Cache State
    const [localUserCache, setLocalUserCache] = useState<Map<string, UserProfile>>(new Map());
    const [isCacheLoading, setIsCacheLoading] = useState(true);

    // Modal States
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isProcessing: false,
    });

    const isPimpinan = useMemo(() => jabatanProfile && jabatanProfile.level <= 5, [jabatanProfile]);

    useEffect(() => {
        if (userProfile) {
            setNamaLengkap(userProfile.namaLengkap);
            setNomorWa(userProfile.nomorWa || '');
            setPersonalEmail(userProfile.personalEmail || '');
            setGoogleDriveLink(userProfile.googleDriveReportLink || '');
            setGoogleCalendarSyncEnabled(userProfile.googleCalendarSyncEnabled || false);
        }
    }, [userProfile]);
    
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
              console.error("Gagal fetch local user cache for Profil:", err);
            } finally {
              setIsCacheLoading(false);
            }
          };
          fetchLocalCache();
        } else if (localUserCache.size > 0 || authLoading) {
            setIsCacheLoading(false);
        }
    }, [userProfile, authLoading, localUserCache.size]);


    const handleConnectGoogle = () => {
        if (userProfile) {
            const statePayload = JSON.stringify({ userId: userProfile.nip, redirectUrl: '/dashboard/profil' });
            const state = btoa(statePayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            window.location.href = `/api/google/auth?state=${state}`;
        }
    };

    const handleDisconnectGoogle = () => {
        if (userProfile) {
            setConfirmModal({
                isOpen: true,
                title: 'Konfirmasi Putuskan Sambungan',
                message: 'Anda yakin ingin memutuskan sambungan Google? Sinkronisasi otomatis (termasuk kalender) akan berhenti.',
                isProcessing: false,
                onConfirm: () => {
                    setConfirmModal(prev => ({ ...prev, isProcessing: true }));
                    window.location.href = `/api/google/disconnect?userId=${userProfile.nip}`;
                },
            });
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile?.nip) {
             addToast('ID Pengguna (NIP) tidak ditemukan.', 'error');
             return;
        }
        setIsProfileSaving(true);
        try {
            const userRef = doc(db, 'users', userProfile.nip);
            await updateDoc(userRef, {
                namaLengkap,
                nomorWa,
                personalEmail: personalEmail.trim() || null,
                googleDriveReportLink: googleDriveLink.trim() || null,
                googleCalendarSyncEnabled: googleCalendarSyncEnabled,
            });
            addToast('Profil berhasil diperbarui.', 'success');
            setLinkHelperText('');
        } catch (error) {
            console.error("Error updating profile:", error);
            addToast('Gagal memperbarui profil.', 'error');
        } finally {
            setIsProfileSaving(false);
        }
    };

    const handleGoogleLinkChange = (value: string) => {
        const regex = /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/;
        const match = value.match(regex);

        if (match && match[1]) {
            setGoogleDriveLink(match[1]);
            setLinkHelperText('Link folder terdeteksi, ID telah diekstrak secara otomatis.');
        } else {
            setGoogleDriveLink(value);
            setLinkHelperText('');
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast('Password baru tidak cocok.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            addToast('Password baru minimal harus 6 karakter.', 'error');
            return;
        }
        if (!user || !user.email) {
            addToast('Sesi pengguna tidak valid atau email utama tidak ditemukan.', 'error');
            return;
        }
        setIsPasswordSaving(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            addToast('Password berhasil diubah.', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Error changing password:", error);
            if (error.code === 'auth/wrong-password') {
                addToast('Password saat ini salah.', 'error');
            } else if (error.code === 'auth/requires-recent-login') {
                addToast('Sesi login Anda sudah terlalu lama. Silakan logout dan login kembali untuk mengubah password.', 'error');
            } else {
                addToast('Gagal mengubah password. Pastikan password saat ini benar atau coba logout dan login kembali.', 'error');
            }
        } finally {
            setIsPasswordSaving(false);
        }
    };

    if (authLoading || isCacheLoading) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
                <Loader2 size={24} className="animate-spin mr-3" />
                Memuat profil...
            </div>
        );
    }

    return (
        <div className="animate-fadeInUp space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Profil & Pengaturan</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <Card className="lg:col-span-2 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <UserCircle size={22} className="mr-3 text-primary" />
                            Informasi Profil
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                                    <Input id="namaLengkap" type="text" value={namaLengkap} onChange={e => setNamaLengkap(e.target.value)} required />
                                </div>
                                <div>
                                    <Label htmlFor="nomorWa">Nomor WhatsApp</Label>
                                    <Input id="nomorWa" type="tel" value={nomorWa} onChange={e => setNomorWa(e.target.value)} placeholder="Contoh: 628123..." />
                                </div>
                                <div>
                                    <Label htmlFor="personalEmail">Email Kontak Pribadi</Label>
                                    <Input id="personalEmail" type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} placeholder="Masukkan email aktif Anda" />
                                </div>
                            </div>

                            <div className="p-4 bg-muted rounded-lg border border-border space-y-4">
                                <h3 className="text-lg font-semibold text-foreground flex items-center">
                                    Integrasi Google
                                </h3>
                                <div>
                                    <Label htmlFor="googleDriveLink">ID Folder Google Drive (Opsional)</Label>
                                    <div className="relative">
                                        <LinkIcon size={16} className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            id="googleDriveLink"
                                            type="text"
                                            value={googleDriveLink}
                                            onChange={e => handleGoogleLinkChange(e.target.value)}
                                            placeholder="Tempelkan Link atau ID Folder GDrive..."
                                            className="pl-10"
                                        />
                                    </div>
                                    {linkHelperText && (
                                        <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
                                            <CheckCircle size={14} className="mr-1.5" />
                                            {linkHelperText}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Untuk upload "Bukti E-Kinerja". Pastikan akun Anda memiliki izin 'Editor' pada folder ini.
                                    </p>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Koneksi Akun & Kalender</Label>
                                    {/* [MODIFIKASI] Menampilkan Email Google */}
                                    {userProfile?.googleRefreshToken ? (
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800/50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center">
                                                        <CheckCircle size={16} className="mr-2"/> Terhubung ke Google
                                                    </p>
                                                    {userProfile.googleEmail && (
                                                        <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 ml-6">
                                                            {userProfile.googleEmail}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button type="button" variant="link" className="text-red-600 dark:text-red-400 h-auto p-0" onClick={handleDisconnectGoogle}>Putuskan?</Button>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/50">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="googleCalendarSyncEnabled"
                                                        disabled={!userProfile?.googleRefreshToken}
                                                        checked={googleCalendarSyncEnabled}
                                                        onCheckedChange={(checked) => setGoogleCalendarSyncEnabled(checked as boolean)}
                                                    />
                                                    <Label 
                                                        htmlFor="googleCalendarSyncEnabled"
                                                        className={`text-sm ${!userProfile?.googleRefreshToken ? 'text-muted-foreground/50' : 'text-foreground/90'}`}
                                                    >
                                                        Sinkronkan jadwal & agenda ke Google Calendar
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" onClick={handleConnectGoogle} className="flex-1 gap-2">
                                                <svg className="w-4 h-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#FFC107" d="M43.611 20.083H42V20H24V28H35.303C34.643 30.637 31.956 32.657 28.182 32.657C23.945 32.657 20.455 29.167 20.455 24.93C20.455 20.693 23.945 17.203 28.182 17.203C30.407 17.203 32.339 18.043 33.821 19.397L39.043 14.175C35.836 11.45 32.227 10 28.182 10C18.605 10 10.545 17.953 10.545 27.49C10.545 37.027 18.605 44.98 28.182 44.98C37.758 44.98 44.98 37.13 44.98 27.653C44.98 26.24 44.88 24.893 44.695 23.573L43.611 20.083Z" /><path fill="#FF3D00" d="M6.306 14.69C2.478 21.034 2.478 28.948 6.306 35.292L11.528 30.07C9.501 27.24 9.501 22.742 11.528 19.912L6.306 14.69Z" /><path fill="#4CAF50" d="M28.182 44.98C32.368 44.98 36.16 43.407 39.043 40.803L33.821 35.58C32.06 36.81 29.98 37.34 28.182 37.34C23.945 37.34 20.455 33.85 20.455 29.613L15.15 34.888C18.357 41.59 24.368 44.98 28.182 44.98Z" /><path fill="#1976D2" d="M43.611 20.083H42V20H24V28H35.303C34.643 30.637 31.956 32.657 28.182 32.657C23.945 32.657 20.455 29.167 20.455 24.93C20.455 20.693 23.945 17.203 28.182 17.203C30.407 17.203 32.339 18.043 33.821 19.397L39.043 14.175C35.836 11.45 32.227 10 28.182 10C18.605 10 10.545 17.953 10.545 27.49C10.545 37.027 18.605 44.98 28.182 44.98C37.758 44.98 44.98 37.13 44.98 27.653C44.98 26.24 44.88 24.893 44.695 23.573L43.611 20.083Z" /></svg>
                                                Hubungkan Akun Google
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => setIsHelpModalOpen(true)} className="text-muted-foreground">
                                                <HelpCircle size={20} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="emailLogin">Email Login Awal (Tidak dapat diubah)</Label>
                                <Input id="emailLogin" type="email" value={userProfile?.email || ''} disabled />
                            </div>
                            
                            <Button type="submit" disabled={isProfileSaving}>
                                <Save size={16} className="mr-2" />
                                {isProfileSaving ? 'Menyimpan...' : 'Simpan Profil'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Palette size={22} className="mr-3 text-purple-600" />
                                Pengaturan Tampilan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Label>Ukuran Teks Aplikasi</Label>
                            <ToggleGroup
                                type="single"
                                value={fontSize}
                                onValueChange={(value) => { if (value) setFontSize(value as 'small' | 'normal' | 'large'); }}
                                className="mt-2 grid grid-cols-3 gap-2"
                            >
                                <ToggleGroupItem value="small" aria-label="Kecil">Kecil</ToggleGroupItem>
                                <ToggleGroupItem value="normal" aria-label="Normal">Normal</ToggleGroupItem>
                                <ToggleGroupItem value="large" aria-label="Besar">Besar</ToggleGroupItem>
                            </ToggleGroup>
                        </CardContent>
                    </Card>

                    {isPimpinan && (
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Users size={22} className="mr-3 text-cyan-600" />
                                    Delegasi Wewenang
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center md:justify-start">
                                <DelegasiWidget userCache={localUserCache} />
                            </CardContent>
                        </Card>
                    )}

                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <ShieldCheck size={22} className="mr-3 text-green-600" />
                                Ubah Password
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <Label htmlFor="currentPassword">Password Saat Ini</Label>
                                        <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                    </div>
                                    <div>
                                        <Label htmlFor="newPassword">Password Baru</Label>
                                        <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                    </div>
                                    <div>
                                        <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                    </div>
                                </div>
                                <Button type="submit" variant="secondary" disabled={isPasswordSaving}>
                                    <KeyRound size={16} className="mr-2" />
                                    {isPasswordSaving ? 'Menyimpan...' : 'Ubah Password'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* MODAL BANTUAN GOOGLE */}
            <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                             <AlertOctagon size={20}/> Masalah Koneksi Google?
                        </DialogTitle>
                        <DialogDescription>
                            Jika Anda melihat layar merah peringatan <strong>"Google hasn't verified this app"</strong>, ikuti langkah ini:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 text-sm text-muted-foreground">
                        <div className="flex gap-3 items-start bg-muted p-3 rounded-lg">
                            <span className="font-bold text-lg text-foreground">1.</span>
                            <div>
                                Klik tulisan <span className="font-bold text-foreground">"Advanced"</span> (atau "Lanjutan") di bagian kiri bawah layar peringatan tersebut.
                            </div>
                        </div>
                         <div className="flex gap-3 items-start bg-muted p-3 rounded-lg">
                            <span className="font-bold text-lg text-foreground">2.</span>
                            <div>
                                Klik link <span className="font-bold text-foreground">"Go to [Nama App] (unsafe)"</span> di bagian paling bawah.
                            </div>
                        </div>
                        <div className="flex gap-3 items-start bg-muted p-3 rounded-lg">
                            <span className="font-bold text-lg text-foreground">3.</span>
                            <div>
                                Klik <span className="font-bold text-foreground">"Continue"</span> (Lanjutkan) untuk memberikan izin.
                            </div>
                        </div>
                        <p className="text-xs italic mt-2 text-center">
                            Hal ini aman karena aplikasi ini adalah milik internal instansi Anda, hanya saja belum diverifikasi publik oleh Google.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsHelpModalOpen(false)}>Saya Mengerti</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, isProcessing: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isProcessing={confirmModal.isProcessing}
                confirmText="Ya, Putuskan"
            />
        </div>
    );
}