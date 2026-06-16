// Lokasi: src/app/dashboard/dokumen/components/RepositoryHeader.tsx
// [PERBAIKAN DARK MODE]
// - Mengganti kelas `dark:...` kustom dengan kelas semantik shadcn/ui.
// - `bg-white dark:bg-dark-card` -> `bg-card`
// - `border-gray-200 dark:border-dark-border` -> `border-border`
// - `dark:bg-slate-700 dark:border-dark-border` -> `bg-muted border-border`
// - `text-gray-400` -> `text-muted-foreground`
// - `text-gray-500 dark:text-dark-text-secondary` -> `text-muted-foreground`
// - `hover:text-blue-600 dark:hover:text-blue-400` -> `hover:text-primary`

"use client";

import React from 'react';
import { Folder, Home, ChevronRight, Search } from 'lucide-react';
// --- Impor Komponen Shadcn ---
import { Input } from "@/components/ui/input";
// --- Akhir Impor Shadcn ---

interface RepositoryHeaderProps {
  folderPath: { id: string | null; namaFolder: string }[];
  onNavigate: (folderId: string | null) => void;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function RepositoryHeader({
  folderPath,
  onNavigate,
  searchTerm,
  onSearchChange
}: RepositoryHeaderProps) {
  return (
    // [PERBAIKAN DARK MODE]
    <div className="p-4 bg-card rounded-xl border border-border shadow-sm mb-6 space-y-4">
      
      {/* Search Bar */}
      <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          {/* [PERBAIKAN DARK MODE] Menggunakan <Input> shadcn */}
          <Input 
            type="text" 
            placeholder="Cari di folder ini..." 
            value={searchTerm} 
            onChange={onSearchChange} 
            className="pl-10 bg-muted" // bg-muted untuk sedikit kontras
          />
      </div>

      {/* Breadcrumbs */}
      {/* [PERBAIKAN DARK MODE] */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap py-1">
          {folderPath.map((p, i) => (
              <React.Fragment key={p.id || 'home'}>
                  <button 
                    onClick={() => onNavigate(p.id)} 
                    className="hover:underline flex items-center gap-1 hover:text-primary disabled:hover:no-underline disabled:opacity-50 disabled:cursor-default"
                    disabled={i === folderPath.length - 1} // Nonaktifkan link terakhir
                  >
                      {p.id === null ? <Home size={14}/> : <Folder size={14}/>} {p.namaFolder}
                  </button>
                  {i < folderPath.length - 1 && <ChevronRight size={14}/>}
              </React.Fragment>
          ))}
      </div>
    </div>
  );
}