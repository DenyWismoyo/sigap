// Lokasi: src/app/dashboard/components/SmartFab.tsx
// [NEW COMPONENT] Smart Floating Action Button
// Tombol aksi melayang yang berubah sesuai konteks halaman.
// Diposisikan di atas BottomNavBar (bottom-20) untuk mengisi ruang kosong.

"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Upload, FileSignature, CheckSquare, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserAuth } from '@/context/AuthContext';

export default function SmartFab() {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile } = useUserAuth();
  
  // Tentukan aksi berdasarkan path
  const getAction = () => {
    if (pathname === '/dashboard/surat') {
        // Hanya staf TU/Admin yang butuh upload
        if (userProfile?.role === 'staf_tu' || userProfile?.role === 'admin_opd') {
            return {
                icon: <Upload size={20} />,
                label: 'Upload Surat',
                onClick: () => router.push('/dashboard/surat/upload'),
                color: 'bg-blue-600 hover:bg-blue-700'
            };
        }
    }
    
    if (pathname === '/dashboard/tugas') {
        return {
            icon: <CheckSquare size={20} />,
            label: 'Tugas Baru',
            // Kita bisa mentrigger modal di sini, tapi untuk simpel redirect dulu atau gunakan state global UI
            // Idealnya gunakan UIContext untuk membuka modal global
            onClick: () => document.getElementById('btn-tugas-baru-desktop')?.click(), 
            color: 'bg-emerald-600 hover:bg-emerald-700'
        };
    }

    if (pathname === '/dashboard/persetujuan-draf') {
        return {
            icon: <FileSignature size={20} />,
            label: 'Buat Draf',
            onClick: () => {}, // Perlu integrasi dengan modal di page tersebut
            color: 'bg-purple-600 hover:bg-purple-700'
        };
    }

    // Default: Tidak ada FAB di halaman lain (atau bisa tombol general)
    return null;
  };

  const action = getAction();

  if (!action) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-20 right-4 z-40 md:hidden" // Posisi strategis di atas navbar
      >
        <Button
          onClick={action.onClick}
          className={`rounded-full shadow-lg h-14 px-6 ${action.color} text-white flex items-center gap-2 transition-transform active:scale-95`}
        >
          {action.icon}
          <span className="font-semibold">{action.label}</span>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}