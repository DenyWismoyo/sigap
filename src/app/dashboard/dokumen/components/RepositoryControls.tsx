// Lokasi: src/app/dashboard/dokumen/components/RepositoryControls.tsx
// [MODIFIKASI REFACTOR (Tahap 1)]
// - Komponen BARU.
// - Menggantikan tombol "Mode Kustomisasi".
// - Tombol tambah (Folder/Dokumen) sekarang selalu terlihat jika pengguna memiliki izin (`canCreate`).

"use client";

import React from 'react';
import { Plus, Link as LinkIcon } from 'lucide-react';

interface RepositoryControlsProps {
  canCreate: boolean;
  onAddFolder: () => void;
  onAddLink: () => void;
}

export default function RepositoryControls({ canCreate, onAddFolder, onAddLink }: RepositoryControlsProps) {
  
  // Jika pengguna tidak punya izin membuat, jangan tampilkan tombol apa pun.
  if (!canCreate) {
    return null; 
  }

  return (
    <div className='flex gap-2 items-center'>
      <button 
        onClick={onAddFolder} 
        className="flex items-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all active:scale-95 text-sm"
      >
        <Plus size={16} className="mr-2"/> Folder
      </button>
      <button 
        onClick={onAddLink} 
        className="flex items-center px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all active:scale-95 text-sm"
      >
        <LinkIcon size={16} className="mr-2"/> Dokumen
      </button>
    </div>
  );
}