"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Coffee, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateWidgetProps {
  filterType: 'semua' | 'surat' | 'tugas' | 'draf';
  userName?: string;
}

export default function EmptyStateWidget({ filterType, userName }: EmptyStateWidgetProps) {
  
  // Konfigurasi konten berdasarkan filter
  const contentMap = {
    semua: {
      title: "Luar Biasa! Ruang Kerja Bersih",
      desc: "Anda telah menyelesaikan semua pekerjaan hari ini. Waktunya untuk fokus ke hal strategis lainnya atau istirahat sejenak.",
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      action: "Lihat Arsip",
      href: "/dashboard/arsip"
    },
    surat: {
      title: "Semua Surat Telah Didisposisi",
      desc: "Kotak masuk surat Anda kosong. Tidak ada surat baru yang menunggu aksi.",
      icon: CheckCircle2,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      action: "Cek Logbook",
      href: "/dashboard/logbook"
    },
    tugas: {
      title: "Tugas Tuntas!",
      desc: "Produktivitas maksimal! Tidak ada tugas tertunda dalam daftar Anda.",
      icon: Star,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
      action: "Buat Tugas Baru",
      href: "/dashboard/tugas"
    },
    draf: {
      title: "Tidak Ada Draf Menunggu",
      desc: "Semua draf persetujuan telah diproses. Kerja tim yang hebat!",
      icon: Coffee,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      action: "Ke Dashboard",
      href: "/dashboard"
    }
  };

  const current = contentMap[filterType] || contentMap.semua;
  const Icon = current.icon;

  return (
    <Card className="relative overflow-hidden border-dashed border-2 border-border bg-card/50 p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
      
      {/* Animasi Latar Belakang (Confetti Sederhana) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-30">
        <motion.div 
            animate={{ y: [0, -20, 0], opacity: [0.5, 1, 0.5] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-10 text-yellow-400"
        >
            <Sparkles size={24} />
        </motion.div>
        <motion.div 
            animate={{ y: [0, 20, 0], opacity: [0.3, 0.8, 0.3] }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 right-20 text-blue-400"
        >
            <Sparkles size={32} />
        </motion.div>
        <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }} 
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-1/2 left-1/4 text-green-400"
        >
            <Star size={16} />
        </motion.div>
      </div>

      {/* Ikon Utama dengan Animasi Pop */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${current.bg}`}
      >
        <Icon size={48} className={current.color} />
      </motion.div>

      {/* Teks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-md z-10"
      >
        <h3 className="text-2xl font-bold text-foreground mb-2">
          {current.title}
        </h3>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {userName ? `Kerja bagus, ${userName}! ` : ''}
          {current.desc}
        </p>

        <Button asChild variant="outline" className="rounded-full px-6">
            <Link href={current.href}>
                {current.action}
            </Link>
        </Button>
      </motion.div>

    </Card>
  );
}