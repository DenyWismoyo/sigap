// Lokasi: src/components/ui/breadcrumbs.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeMapping: Record<string, string> = {
  dashboard: 'Beranda',
  'ruang-kerja': 'Ruang Kerja',
  surat: 'Surat',
  upload: 'Upload',
  tugas: 'Tugas',
  delegasi: 'Delegasi',
  logbook: 'Logbook Harian',
  checklist: 'Checklist Pribadi',
  profil: 'Profil Pengguna',
  users: 'Manajemen User',
  opd: 'Manajemen OPD',
  jabatan: 'Manajemen Jabatan',
  templat: 'Bank Template',
  'surat-keluar': 'Surat Keluar',
  buat: 'Buat Baru',
  arsip: 'Arsip Digital',
  dokumen: 'Repository',
  notulensi: 'Notulensi Rapat',
  jadwal: 'Jadwal',
  pengumuman: 'Pengumuman',
  evaluasi: 'Evaluasi Kinerja',
  laporan: 'Laporan',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const pathNames = pathname.split('/').filter((path) => path);

  // Jangan tampilkan di halaman dashboard utama (home)
  if (pathname === '/dashboard') return null;

  return (
    <nav aria-label="breadcrumb" className="mb-4 hidden md:block">
      <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
        <li className="flex items-center">
          <Link href="/dashboard" className="hover:text-primary transition-colors">
            <Home size={16} />
          </Link>
        </li>
        {pathNames.map((link, index) => {
          const isLast = index === pathNames.length - 1;
          const href = `/${pathNames.slice(0, index + 1).join('/')}`;
          
          // Jika segmen URL adalah ID (panjang > 20), ganti teksnya jadi "Detail"
          let displayName = routeMapping[link] || link;
          if (link.length > 20) displayName = 'Detail';

          // Capitalize jika tidak ada di mapping
          if (displayName === link) {
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/-/g, ' ');
          }

          return (
            <React.Fragment key={index}>
              <ChevronRight size={14} className="text-muted-foreground/50" />
              <li>
                {isLast ? (
                  <span className="font-semibold text-foreground cursor-default">
                    {displayName}
                  </span>
                ) : (
                  <Link href={href} className="hover:text-primary transition-colors">
                    {displayName}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}