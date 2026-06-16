// Lokasi: src/app/dashboard/tugas/components/TaskList.tsx
// [MODIFIKASI]
// - Menambahkan 'framer-motion' untuk menganimasikan daftar tugas.
// - Membungkus list dengan <motion.div variants={containerVariants}>
// - Membungkus <TaskListItem> dengan <motion.div variants={itemVariants}>
// - Menambahkan 'divide-y divide-border' untuk garis pemisah antar kartu

"use client";

import React, { useState } from 'react';
import { Tugas, UserProfile } from '@/types';
import TaskListItem from './TaskListItem';
import { ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion'; 

interface TaskListProps {
  tugasList: Tugas[];
  onOpenDetail: (tugas: Tugas) => void;
  onStatusChange: (tugasId: string, newStatus: Tugas['status']) => void;
  onDeleteTask: (tugas: Tugas) => void;
  userCache: Map<string, UserProfile>; 
}

// Varian animasi untuk kontainer
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Jarak waktu antar item
    },
  },
};

// Varian animasi untuk item
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function TaskList({ tugasList, onOpenDetail, onStatusChange, onDeleteTask, userCache }: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleToggleExpand = (tugasId: string) => {
    setExpandedTaskId(prevId => (prevId === tugasId ? null : tugasId));
  };

  if (tugasList.length === 0) {
    return (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
            <ClipboardList size={48} className="mx-auto text-muted-foreground/30"/>
            <p className="mt-4 font-semibold">Tidak ada tugas untuk ditampilkan.</p>
            <p className="text-sm">Coba ubah filter atau buat tugas baru.</p>
        </div>
    );
  }
  
  return (
    // --- MODIFIKASI WRAPPER INI ---
    // Menambahkan divide-y divide-border untuk garis pemisah
    <motion.div 
      className="space-y-3 divide-y divide-border"
      variants={containerVariants}
      initial="hidden"
      animate="show" // Animasikan saat komponen dimuat (atau saat tugasList berubah)
      key={tugasList.length} // Tambahkan key untuk memicu re-animasi jika jumlah tugas berubah
    >
    {/* --- --- */}
      {tugasList.map(tugas => (
        // --- MODIFIKASI WRAPPER INI ---
        // Menambahkan pt-3 agar spasi tetap ada di atas garis pemisah
        <motion.div key={tugas.id} variants={itemVariants} className="pt-3 first:pt-0">
          <TaskListItem
            tugas={tugas}
            isExpanded={expandedTaskId === tugas.id}
            onToggleExpand={handleToggleExpand}
            onOpenDetail={onOpenDetail}
            onStatusChange={onStatusChange}
            onDeleteTask={onDeleteTask}
            userCache={userCache} 
          />
        </motion.div>
        // --- ---
      ))}
    </motion.div>
  );
}