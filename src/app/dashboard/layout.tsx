// Lokasi: src/app/dashboard/layout.tsx
// [UPDATE] Menambahkan SmartFab untuk mengisi ruang kosong di mobile dengan fungsi berguna.
// [FIX] Menampilkan GlobalSearch di tampilan mobile (menghapus class 'hidden sm:block').
// [UPDATE] Menghapus pemanggilan komponen WelcomeSummaryModal.
// [FIX] Perbaikan logika setup Firebase Cloud Messaging (FCM) Token agar trigger izin pop-up berjalan.

"use client";

import React, { ReactNode, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useUserAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext'; 
import { useToastContext } from '@/context/ToastContext'; 
import { useRouter, usePathname } from 'next/navigation';

// Komponen Modular (Refactored)
import GlobalSearch from './components/GlobalSearch';
import ThemeToggleButton from './components/ThemeToggleButton';
import Sidebar, { navItems, sections } from './components/Sidebar'; 
import BottomNavBar from './components/BottomNavBar';       
import MobileMenuSheet from './components/MobileMenuSheet'; 
import MegaMenuPanel from './components/MegaMenuPanel';     
import SmartFab from './components/SmartFab'; // [BARU] Import SmartFab

import { app, db } from '@/lib/firebase'; 
import { getMessaging, onMessage } from "firebase/messaging"; 
import { getFCMToken } from '@/lib/firebase-messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Toast from './components/Toast';
import FullPageLoader from './components/FullPageLoader';
import ConfirmModal from './components/ConfirmModal';
import PageTransition from './components/PageTransition'; 
import Breadcrumbs from '@/components/ui/breadcrumbs'; 
import ScrollToTop from '@/components/ui/scroll-to-top'; 
import NetworkStatus from '@/components/ui/network-status';
import RouteProgress from '@/components/ui/route-progress'; 

import { Menu, Bell, ChevronDown, UserCircle, LogOut, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button"; 
import { ScrollArea } from '@/components/ui/scroll-area'; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateRelative } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import type { UserProfile, Jabatan, OpdConfig, WelcomeSummary } from '@/types'; 

const ToastContainer = () => {
  const { toasts, removeToast } = useToastContext();
  return (
    // [UPDATE] Naikkan posisi toast mobile agar tidak tertutup bottom nav
    <div className="fixed bottom-24 md:bottom-4 right-4 z-[9999] w-full max-w-sm space-y-3 pointer-events-none px-4 md:px-0">
      {toasts.map(toast => <div key={toast.id} className="pointer-events-auto"><Toast message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} /></div>)}
    </div>
  );
};

const DashboardLayoutContent = ({ children }: { children: ReactNode }) => {
  const { user, userProfile, jabatanProfile, pltJabatanList, actingJabatanProfile, setActingJabatan, loading, logOut, isImpersonating, opdConfig } = useUserAuth(); 
  const { welcomeSummary, notifikasiList, resetNotificationCount } = useNotification();
  
  const router = useRouter();
  const pathname = usePathname();
  const { addToast } = useToastContext();

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null); 
  const megaMenuTimerRef = useRef<NodeJS.Timeout | null>(null); 
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const shouldShowLoader = loading && !userProfile;

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  // ============================================================================
  // PERBAIKAN UTAMA: SETUP PUSH NOTIFICATION (FCM)
  // ============================================================================
  useEffect(() => {
    let unsubscribe: any;
    
    // Pastikan proses ini hanya berjalan jika user sudah login, tidak sedang loading, dan di sisi client (browser)
    if (!loading && user && userProfile && typeof window !== 'undefined' && 'Notification' in window && app) {
        const setupFCM = async () => {
             try {
                 // 1. Langsung panggil getFCMToken. 
                 // Ini akan memicu pop-up "Allow Notifications" di browser jika user belum pernah memberikan izin.
                 const token = await getFCMToken();
                 
                 // 2. Jika user mengizinkan (Allow) dan token berhasil dibuat, simpan ke Firestore
                 if (token && userProfile.nip) {
                     await updateDoc(doc(db, 'users', userProfile.nip), { 
                         fcmTokens: arrayUnion(token) 
                     });
                     console.log("✅ FCM Token berhasil di-generate dan disimpan ke database.");
                 }

                 // 3. Setup listener untuk notifikasi yang masuk saat aplikasi sedang DIBUKA (Foreground)
                 // Hanya daftarkan listener jika permission sudah 'granted'
                 if (Notification.permission === 'granted') {
                     unsubscribe = onMessage(getMessaging(app), (pl) => { 
                         if(pl.notification) {
                             addToast(pl.notification.title || 'Info', 'info'); 
                         }
                     });
                 }
             } catch (error) {
                 console.error("❌ Gagal melakukan setup FCM:", error);
             }
        }
        
        setupFCM();
    }
    
    // Cleanup listener saat komponen di-unmount
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [loading, user, userProfile, addToast]);
  // ============================================================================

  const handleLogoutClick = () => { setIsLogoutConfirmOpen(true); setIsProfileDropdownOpen(false); };
  const executeLogout = async () => { setIsLoggingOut(true); try { await logOut(); router.push('/login'); } catch (e) { console.error(e); setIsLoggingOut(false); setIsLogoutConfirmOpen(false); } };
  const handleBottomNavClick = (key: 'surat' | 'tugas' | 'none') => { if(key !== 'none') resetNotificationCount(key); };
  const handleMenuEnter = (sectionId: string) => { if (megaMenuTimerRef.current) { clearTimeout(megaMenuTimerRef.current); megaMenuTimerRef.current = null; } setActiveSectionId(sectionId); };
  const handleMenuLeave = () => { megaMenuTimerRef.current = setTimeout(() => setActiveSectionId(null), 300); };
  const handlePanelEnter = () => { if (megaMenuTimerRef.current) { clearTimeout(megaMenuTimerRef.current); megaMenuTimerRef.current = null; } }

  if (shouldShowLoader) return <FullPageLoader message="Memuat data pengguna..." />;
  if (!userProfile) return null;

  const myPackageName = opdConfig?.packageName || "Dasar";
  const isAdminOpd = userProfile?.role === 'admin_opd';
  const totalNotifCount = (welcomeSummary.suratBaruCount || 0) + (welcomeSummary.tugasBaruCount || 0);

  return (
      <>
        <NetworkStatus />
        <RouteProgress />

        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          
          {/* Sidebar Desktop */}
          <div className="relative hidden md:flex h-screen z-40" onMouseLeave={handleMenuLeave}>
             <Sidebar 
                userProfile={userProfile}
                jabatanProfile={jabatanProfile}
                opdConfig={opdConfig}
                isAdminOpd={isAdminOpd}
                myPackageName={myPackageName}
                welcomeSummary={welcomeSummary} 
                activeSectionId={activeSectionId}
                onMenuEnter={handleMenuEnter}
             />
             
             <AnimatePresence>
              {activeSectionId && (
                <motion.div
                  key="mega-menu"
                  className="absolute left-full top-0 h-full"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onMouseEnter={handlePanelEnter} 
                >
                  <MegaMenuPanel 
                      sectionId={activeSectionId}
                      onClose={() => setActiveSectionId(null)}
                      navItems={navItems}
                      userProfile={userProfile}
                      jabatanProfile={jabatanProfile}
                      opdConfig={opdConfig} 
                      welcomeSummary={welcomeSummary} 
                      pathname={pathname}
                      resetNotificationCount={resetNotificationCount}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {isImpersonating && (
                  <div className="bg-destructive text-destructive-foreground text-center py-2 text-sm font-bold flex items-center justify-center shadow-lg z-40 sticky top-0">
                      <AlertCircle size={16} className="mr-2 animate-pulse"/>
                      Bertindak sebagai: {userProfile?.namaLengkap}
                      <button onClick={handleLogoutClick} className="ml-4 flex items-center text-xs font-semibold bg-destructive-foreground text-destructive px-2 py-1 rounded-md"><LogOut size={14} className="mr-1"/> Kembali</button>
                  </div>
              )}

              <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-card/80 backdrop-blur-md border-b border-border h-16 transition-all duration-200">
                <div className="flex items-center space-x-4">
                    <DrawerTrigger asChild><button className="text-muted-foreground md:hidden p-2 hover:bg-accent rounded-full"><Menu size={24} /></button></DrawerTrigger>
                </div>
                <div className="flex items-center space-x-3 md:space-x-6">
                  {/* [PERBAIKAN] Menghapus class 'hidden sm:block' agar Search muncul di HP */}
                  <div><GlobalSearch /></div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent-foreground hover:bg-accent/50">
                        <Bell size={20} />
                        {totalNotifCount > 0 && <span className="absolute top-1.5 right-1.5 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-background"></span></span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0 shadow-xl border-border">
                      <div className="p-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-foreground text-sm">Notifikasi Terbaru</h3></div>
                      <ScrollArea className="h-[300px]">
                        {notifikasiList.length === 0 ? <p className="text-sm text-muted-foreground text-center p-8">Tidak ada notifikasi baru.</p> : 
                          <div className="divide-y divide-border">{notifikasiList.map((notif) => (
                              <Link key={notif.id} href={notif.link || '/dashboard'} className={`block p-4 hover:bg-accent/50 transition-colors ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                <p className={`text-sm font-medium leading-snug ${!notif.isRead ? 'text-primary' : 'text-foreground'}`}>{notif.message}</p>
                                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Clock size={10}/> {notif.timestamp ? formatDateRelative(notif.timestamp) : 'Baru saja'}</p>
                              </Link>
                            ))}</div>
                        }
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  <ThemeToggleButton />
                  <div className="relative">
                      <button onClick={() => setIsProfileDropdownOpen(p => !p)} className="flex items-center space-x-2 group p-1 rounded-full hover:bg-accent transition-all">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center font-bold text-primary-foreground text-sm shadow-sm group-hover:shadow-md transition-all">{userProfile.namaLengkap.charAt(0).toUpperCase()}</div>
                          <span className="hidden md:inline text-sm font-medium text-foreground pr-2">{userProfile.namaLengkap.split(' ')[0]}</span>
                          <ChevronDown size={14} className="hidden md:inline text-muted-foreground transition-transform group-hover:translate-y-0.5"/>
                      </button>
                      <AnimatePresence>
                        {isProfileDropdownOpen && (
                            <motion.div key="profile-dropdown" className="absolute right-0 mt-2 w-64 bg-popover rounded-xl shadow-xl border border-border z-50 origin-top-right overflow-hidden" initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} onMouseLeave={() => setIsProfileDropdownOpen(false)}>
                                <div className="p-4 border-b border-border bg-muted/30"><p className="font-semibold text-foreground truncate">{userProfile.namaLengkap}</p><p className="text-xs text-muted-foreground truncate">{actingJabatanProfile?.namaJabatan || userProfile.email}</p></div>
                                {(jabatanProfile || pltJabatanList.length > 0) && (
                                    <div className="p-2 border-b border-border"><label className="block px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Switch Role</label>
                                        {jabatanProfile && <button onClick={() => { setActingJabatan(null); setIsProfileDropdownOpen(false); }} className={`w-full flex items-center px-3 py-2 text-left text-sm rounded-md transition-colors ${!actingJabatanProfile || actingJabatanProfile?.id === jabatanProfile?.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent'}`}>{(!actingJabatanProfile || actingJabatanProfile?.id === jabatanProfile?.id) && <CheckCircle size={14} className="mr-2"/>}<div className="flex-1 truncate">{jabatanProfile?.namaJabatan} <span className="text-xs opacity-70">(Definitif)</span></div></button>}
                                        {pltJabatanList.map((plt: Jabatan) => <button key={plt.id} onClick={() => { setActingJabatan(plt.id!); setIsProfileDropdownOpen(false); }} className={`w-full flex items-center px-3 py-2 mt-1 text-left text-sm rounded-md transition-colors ${actingJabatanProfile?.id === plt.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent'}`}>{actingJabatanProfile?.id === plt.id && <CheckCircle size={14} className="mr-2"/>}<div className="flex-1 truncate">{plt.namaJabatan} <span className="text-xs text-yellow-600 dark:text-yellow-400">(Plt.)</span></div></button>)}
                                    </div>
                                )}
                                <div className="p-1.5">
                                    <Link href="/dashboard/profil" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center px-3 py-2 text-sm text-foreground rounded-md hover:bg-accent transition-colors"><UserCircle size={16} className="mr-2 text-muted-foreground"/> Profil & Akun</Link>
                                    <button onClick={handleLogoutClick} className="w-full flex items-center px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><LogOut size={16} className="mr-2"/> Logout</button>
                                </div>
                            </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
                </div>
              </header>
              
              {/* [FIX UI] Main Content Area */}
              {/* 'pb-20' (80px) sudah cukup untuk BottomNavBar (64px) + Margin (16px) */}
              <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6 lg:p-8 lg:pb-8 bg-muted/10 relative scroll-smooth">
                <ScrollToTop />
                <div className="w-full min-h-full flex flex-col">
                    <Breadcrumbs />
                    <PageTransition>{children}</PageTransition>
                    <footer className="mt-auto py-6 text-center text-xs text-muted-foreground hidden md:block">
                        <p>&copy; {new Date().getFullYear()} SIGAP. Sistem Integrasi & Administrasi Persuratan.</p>
                    </footer>
                </div>
              </main>
            </div>
            
            {/* [BARU] Smart FAB */}
            <SmartFab />

            <BottomNavBar 
                pathname={pathname} 
                onLinkClick={handleBottomNavClick as any} 
                welcomeSummary={welcomeSummary} 
            />

            <DrawerContent className="md:hidden h-[85vh]">
                <DrawerHeader className="text-left px-6 border-b border-border pb-4">
                    <DrawerTitle className="text-xl font-bold">Menu Utama</DrawerTitle>
                    <DrawerDescription>Akses cepat ke seluruh modul SIGAP.</DrawerDescription>
                </DrawerHeader>
                <MobileMenuSheet 
                    userProfile={userProfile} 
                    jabatanProfile={jabatanProfile} 
                    opdConfig={opdConfig} 
                    onLinkClick={() => setIsMobileDrawerOpen(false)} 
                />
                <DrawerFooter className="pt-2 border-t border-border">
                    <DrawerClose asChild><Button variant="outline" className="w-full h-12 text-base">Tutup Menu</Button></DrawerClose>
                </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <ConfirmModal isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} onConfirm={executeLogout} title="Konfirmasi Logout" message="Apakah Anda yakin ingin keluar dari aplikasi?" confirmText="Ya, Logout" isProcessing={isLoggingOut} />
        </div>
        <ToastContainer />
      </>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}