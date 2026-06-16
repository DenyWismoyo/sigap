/**
 * Directory: src/app/dashboard/components/Sidebar.tsx
 * History Update:
 * - 2024-11-28: Added "Portofolio Kompetensi" menu item.
 * - [UPDATE] Added "Tutorial Aplikasi" menu item.
 * - [UPDATE] Menambahkan akses 'operator_surat' untuk menu Unggah Surat dan Arsip Surat.
 * - [NEW] Menambahkan menu "Layanan SKW" untuk petugas kelurahan dan kecamatan.
 * - [UPDATE] Memberikan akses 'staf_tu' ke menu Master Pengguna.
 */

"use client";

import React, { memo, useMemo } from 'react';
import Logo from './Logo';
import {
    LayoutDashboard, Mail, ClipboardCheck, BookOpen,
    Users, ListChecks, Calendar, Upload, Archive, 
    FolderArchive, HelpCircle, Megaphone, AreaChart, 
    BarChart3, UserCog, Building, Briefcase, FileSignature, 
    Package, ClipboardList, LinkIcon, Inbox, Edit, 
    MessageSquare, FilePlus, FileText, DollarSign, 
    ClipboardEdit, Home, Zap,
    Files, Wallet, Compass, HeartHandshake, Landmark,
    ScrollText, Award, GraduationCap, Youtube, 
    ToyBrick
} from 'lucide-react';
import { Jabatan, OpdConfig, UserProfile, WelcomeSummary, FunctionalRole } from '@/types'; 

interface NavItem {
    href: string;
    label: string;
    icon: any;
    allowedRoles: string[];
    allowedAdditionalRoles?: FunctionalRole[]; 
    section: string;
    notificationKey?: string;
    featureFlag?: string;
    colorClass: string;
}

export const userHasAccess = (item: NavItem, userProfile: UserProfile, jabatanProfile: Jabatan | null, opdConfig: OpdConfig | null) => {
     const isPimpinan = jabatanProfile && jabatanProfile.level <= 5;
     let roleMatch = item.allowedRoles.includes(userProfile.role);
     if (['/dashboard/evaluasi', '/dashboard/tugas/delegasi'].includes(item.href) && isPimpinan) roleMatch = true;
     if (!roleMatch && item.allowedAdditionalRoles && userProfile.additionalRoles) {
         const hasAdditional = item.allowedAdditionalRoles.some(role => userProfile.additionalRoles?.includes(role));
         if (hasAdditional) roleMatch = true;
     }
     if (!roleMatch) return false;
     if (item.featureFlag) {
         if (userProfile.role === 'super_admin') return true;
         return opdConfig?.features?.[item.featureFlag as keyof typeof opdConfig.features] === true;
     }
     return true;
};

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'ruangKerja', colorClass: 'text-cyan-600' },
  { href: '/dashboard/ruang-kerja', label: 'Ruang Kerja Saya', icon: Briefcase, allowedRoles: ['user', 'admin_opd', 'super_admin'], section: 'ruangKerja', colorClass: 'text-cyan-600' },
  { href: '/dashboard/surat', label: 'Kotak Masuk Surat', icon: Mail, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'ruangKerja', notificationKey: 'suratBaruCount', colorClass: 'text-cyan-600' }, 
  { href: '/dashboard/tugas', label: 'Tugas Saya', icon: ClipboardCheck, allowedRoles: ['user', 'admin_opd', 'super_admin'], section: 'ruangKerja', notificationKey: 'tugasBaruCount', colorClass: 'text-cyan-600' }, 
  { href: '/dashboard/logbook', label: 'Logbook Harian', icon: BookOpen, allowedRoles: ['user', 'admin_opd', 'super_admin'], section: 'ruangKerja', colorClass: 'text-orange-600' }, 
  { href: '/dashboard/portal-integrasi', label: 'Portal Integrasi', icon: LinkIcon, allowedRoles: ['user', 'admin_opd', 'super_admin'], section: 'ruangKerja', colorClass: 'text-blue-600' },
  
  // --- PRODUKTIVITAS ---
  { href: '/dashboard/checklist', label: 'Checklist Pribadi', icon: ClipboardList, allowedRoles: ['user', 'admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-green-600' }, 
  { href: '/dashboard/bukti-kinerja', label: 'Bukti E-Kinerja', icon: FileText, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-green-600' },
  { href: '/dashboard/kompetensi', label: 'Portofolio Kompetensi', icon: GraduationCap, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-purple-600' },
  { href: '/dashboard/surat-keluar/buat', label: 'Buat Surat Keluar', icon: FilePlus, allowedRoles: ['staf_tu', 'admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-green-600' }, 
  { href: '/dashboard/tugas/delegasi', label: 'Delegasi Tugas', icon: Users, allowedRoles: ['admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-green-600' },
  { href: '/dashboard/bank-templat', label: 'Bank Template', icon: Files, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-green-600' },
  { href: '/dashboard/persetujuan-draf', label: 'Persetujuan Draf', icon: FileSignature, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'produktivitas', featureFlag: 'persetujuanDraf', colorClass: 'text-green-600' },
  { href: '/dashboard/formulir', label: 'Isi Formulir', icon: Edit, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-green-600' }, 
  { href: '/dashboard/feedback', label: 'Survei & Feedback', icon: MessageSquare, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'produktivitas', colorClass: 'text-green-600' },
  
  // --- KOORDINASI ---
  { href: '/dashboard/notulensi', label: 'Notulensi Rapat', icon: ListChecks, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], allowedAdditionalRoles: ['notulis_rapat'], section: 'koordinasi', colorClass: 'text-purple-600' },
  { href: '/dashboard/jadwal', label: 'Jadwal Internal', icon: Calendar, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'koordinasi', colorClass: 'text-purple-600' }, 
  { href: '/dashboard/pelayanan', label: 'Pelayanan Publik', icon: HeartHandshake, allowedRoles: ['admin_opd', 'super_admin'], allowedAdditionalRoles: ['petugas_pelayanan'], section: 'koordinasi', colorClass: 'text-pink-600' },
  { href: '/dashboard/tapem', label: 'Tata Pemerintahan', icon: Landmark, allowedRoles: ['admin_opd', 'super_admin'], allowedAdditionalRoles: ['pengelola_tapem'], section: 'koordinasi', colorClass: 'text-indigo-600' },
  // [NEW] Menu SKW
  { href: '/dashboard/skw', label: 'Layanan SKW', icon: ScrollText, allowedRoles: ['admin_opd', 'super_admin'], allowedAdditionalRoles: ['petugas_kelurahan', 'petugas_kecamatan'], section: 'koordinasi', colorClass: 'text-orange-600' },

  // --- ANALITIKA ---
  { href: '/dashboard/talenta', label: 'Manajemen Talenta', icon: Award, allowedRoles: ['super_admin'], allowedAdditionalRoles: ['pengelola_tapem'], section: 'analitika', colorClass: 'text-purple-600' },
  
  // --- INFORMASI ---
  { href: '/dashboard/surat/upload', label: 'Unggah Surat Baru', icon: Upload, allowedRoles: ['staf_tu', 'admin_opd'], allowedAdditionalRoles: ['operator_surat'], section: 'informasi', colorClass: 'text-yellow-600' }, 
  { href: '/dashboard/arsip', label: 'Arsip Surat', icon: Archive, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], allowedAdditionalRoles: ['operator_surat'], section: 'informasi', colorClass: 'text-yellow-600' }, 
  { href: '/dashboard/dokumen', label: 'Repository Dokumen', icon: FolderArchive, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'informasi', colorClass: 'text-yellow-600' },
  { href: '/dashboard/knowledge', label: 'Knowledge Base', icon: HelpCircle, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'informasi', colorClass: 'text-yellow-600' },
  { href: '/dashboard/tutorial', label: 'Tutorial Aplikasi', icon: Youtube, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'informasi', colorClass: 'text-red-600' },
  { href: '/dashboard/pengumuman', label: 'Papan Pengumuman', icon: Megaphone, allowedRoles: ['user', 'staf_tu', 'admin_opd', 'super_admin'], section: 'informasi', colorClass: 'text-yellow-600' },
  { href: '/dashboard/aset', label: 'Manajemen Aset', icon: Package, allowedRoles: ['staf_tu', 'admin_opd', 'super_admin'], allowedAdditionalRoles: ['pengurus_barang'], section: 'informasi', featureFlag: 'manajemenAset', colorClass: 'text-yellow-600' },
  { href: '/dashboard/keuangan', label: 'Manajemen Keuangan', icon: Wallet, allowedRoles: ['admin_opd', 'super_admin'], allowedAdditionalRoles: ['bendahara'], section: 'informasi', colorClass: 'text-emerald-600' },
  
  // --- ANALITIKA LANJUTAN ---
  { href: '/dashboard/evaluasi', label: 'Evaluasi Kinerja', icon: AreaChart, allowedRoles: ['admin_opd', 'super_admin'], section: 'analitika', featureFlag: 'analitika', colorClass: 'text-pink-600' },
  { href: '/dashboard/perencanaan', label: 'Perencanaan (Si-RANA)', icon: Compass, allowedRoles: ['admin_opd', 'super_admin'], section: 'analitika', colorClass: 'text-indigo-600' },
  { href: '/dashboard/rekap-surat', label: 'Rekap Surat', icon: FileText, allowedRoles: ['staf_tu', 'admin_opd', 'super_admin'], section: 'analitika', colorClass: 'text-pink-600' },
  { href: '/dashboard/laporan', label: 'Laporan Umum', icon: BarChart3, allowedRoles: ['super_admin'], section: 'analitika', colorClass: 'text-pink-600' },
  { href: '/dashboard/laporan-langganan', label: 'Laporan Langganan', icon: DollarSign, allowedRoles: ['super_admin'], section: 'analitika', colorClass: 'text-pink-600' },
  
  // --- ADMINISTRASI ---
  // [UPDATE] Menambahkan 'staf_tu' pada allowedRoles
  { href: '/dashboard/users', label: 'Master Pengguna', icon: UserCog, allowedRoles: ['staf_tu', 'admin_opd', 'super_admin'], section: 'administrasi', colorClass: 'text-red-600' },
  { href: '/dashboard/opd', label: 'Master OPD', icon: Building, allowedRoles: ['super_admin'], section: 'administrasi', colorClass: 'text-red-600' },
  { href: '/dashboard/jabatan', label: 'Master Jabatan', icon: Briefcase, allowedRoles: ['admin_opd', 'super_admin'], section: 'administrasi', colorClass: 'text-red-600' },
  { href: '/dashboard/templat', label: 'Templat Disposisi', icon: FileSignature, allowedRoles: ['admin_opd', 'super_admin'], section: 'administrasi', colorClass: 'text-red-600' },
  { href: '/dashboard/form-builder', label: 'Kelola Formulir', icon: ClipboardEdit, allowedRoles: ['staf_tu', 'admin_opd', 'super_admin'], section: 'administrasi', featureFlag: 'formBuilder', colorClass: 'text-red-600' },
  { href: '/dashboard/feedback-admin', label: 'Dashboard Feedback', icon: Inbox, allowedRoles: ['super_admin'], section: 'administrasi', colorClass: 'text-red-600' },
];

export const sections = [
    { id: 'ruangKerja', title: 'Ruang Kerja', icon: Home },
    { id: 'produktivitas', title: 'Produktivitas', icon: Zap },
    { id: 'koordinasi', title: 'Koordinasi', icon: Users },
    { id: 'informasi', title: 'Informasi', icon: FolderArchive },
    { id: 'analitika', title: 'Analitika', icon: AreaChart },
    { id: 'administrasi', title: 'Administrasi', icon: UserCog },
];

interface SidebarProps {
    userProfile: UserProfile;
    jabatanProfile: Jabatan | null;
    opdConfig: OpdConfig | null;
    isAdminOpd: boolean;
    myPackageName: string;
    activeSectionId: string | null; 
    onMenuEnter: (sectionId: string) => void; 
    welcomeSummary: WelcomeSummary; 
}

const Sidebar = memo(({ 
  userProfile, 
  jabatanProfile, 
  opdConfig, 
  isAdminOpd, 
  myPackageName,
  activeSectionId,
  onMenuEnter,
  welcomeSummary
}: SidebarProps) => {

  const notificationCounts = useMemo(() => ({
      suratBaruCount: welcomeSummary.suratBaruCount || 0,
      tugasBaruCount: welcomeSummary.tugasBaruCount || 0
  }), [welcomeSummary.suratBaruCount, welcomeSummary.tugasBaruCount]);

  const visibleSections = useMemo(() => {
    return sections.filter(section => {
        return navItems.some((item) => 
            item.section === section.id && 
            userHasAccess(item, userProfile, jabatanProfile, opdConfig)
        );
    });
  }, [userProfile, jabatanProfile, opdConfig]);

  const sectionHasNotification = (sectionId: string) => {
      return navItems.some((item) => {
          if (item.section !== sectionId) return false;
          if (item.notificationKey && (notificationCounts as any)[item.notificationKey] > 0) {
              return true;
          }
          return false;
      });
  };

  const quotaPercentage = useMemo(() => {
      if (!isAdminOpd || !opdConfig) return 0;
      return Math.min((opdConfig.penggunaAktifSaatIni / opdConfig.kuotaPengguna) * 100, 100);
  }, [isAdminOpd, opdConfig]);

  return (
    <aside className="relative w-20 bg-card text-foreground flex flex-col border-r border-border h-full z-50">
      <div className="p-4 h-16 flex items-center justify-center border-b border-border">
        <Logo className="h-8 w-10" />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden py-4 space-y-1 custom-scrollbar">
         {visibleSections.map(section => {
             const Icon = section.icon;
             const isActive = activeSectionId === section.id;
             const hasNotif = sectionHasNotification(section.id);

             return (
                 <button
                    key={section.id}
                    onMouseEnter={() => onMenuEnter(section.id)}
                    className={`group relative flex items-center justify-center w-full px-2 py-3 transition-colors
                        ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}
                    `}
                 >
                     <div className="relative">
                        <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : ''}`} />
                        {hasNotif && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-card"></span>
                            </span>
                        )}
                     </div>
                     <span className="absolute left-16 ml-2 hidden group-hover:block px-2 py-1 text-xs font-semibold text-popover-foreground bg-popover rounded-md shadow-md whitespace-nowrap z-50 border border-border animate-in fade-in slide-in-from-left-2 duration-200">
                        {section.title}
                     </span>
                 </button>
             )
         })}
      </div>

      <div className="p-2 border-t border-border text-center flex flex-col items-center gap-2">
          {isAdminOpd && opdConfig && (
            <div className="w-10 h-1 bg-muted rounded-full overflow-hidden" title={`Kuota: ${opdConfig.penggunaAktifSaatIni}/${opdConfig.kuotaPengguna}`}>
               <div className="bg-primary h-full" style={{ width: `${quotaPercentage}%` }} />
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary cursor-default" title={userProfile.namaLengkap}>
             {userProfile.namaLengkap.charAt(0)}
          </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";

export default Sidebar;