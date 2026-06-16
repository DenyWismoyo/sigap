/**
 * Directory: src/app/dashboard/ruang-kerja/components/VisionaryFeed.tsx
 * Status: UPDATED
 * Deskripsi: Feed utama Ruang Kerja. 
 * [UPDATE] Menghapus pemisahan zona "Perhatian Segera" dan "Lainnya".
 * Semua feed sekarang tampil menyatu berdasarkan urutan waktu terbaru di atas.
 */

"use client";

import React, { useMemo } from 'react';
import { motion, Variants } from "framer-motion"; 
import { RuangKerjaItem } from "@/types";
import RuangKerjaCard from "./RuangKerjaCard"; 
import { Zap, Mail, FileText, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// --- Konfigurasi Animasi ---
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemAnim: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 50 } 
  }
};

// --- Komponen Ringkasan Harian (Daily Briefing) ---
const DailyBriefing = ({ items, isPimpinan }: { items: RuangKerjaItem[], isPimpinan: boolean }) => {
    const stats = useMemo(() => {
        let suratBaru = 0;
        let draf = 0;
        let disposisi = 0;
        let tugas = 0;
        let urgent = 0;

        items.forEach(item => {
            if (item.type === 'surat_baru') suratBaru++;
            if (item.type === 'draf') draf++;
            if (item.type === 'surat_disposisi') disposisi++;
            if (item.type === 'tugas') tugas++;

            // Cek urgensi (logika sederhana)
            if (
                (item.type === 'surat_disposisi' && (item.isOverdue || item.surat.klasifikasi === 'Segera')) ||
                (item.type === 'tugas' && (item.tugas.prioritas === 'Tinggi')) ||
                (item.type === 'surat_baru' && item.surat.klasifikasi === 'Segera')
            ) {
                urgent++;
            }
        });

        return { suratBaru, draf, disposisi, tugas, urgent };
    }, [items]);

    if (items.length === 0) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
        >
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500 fill-yellow-500" />
                            Ringkasan Hari Ini
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {isPimpinan ? (
                                stats.suratBaru > 0 ? (
                                    <>Anda memiliki <strong className="text-blue-800 dark:text-blue-100">{stats.suratBaru} Surat Baru</strong> yang perlu didisposisikan.</>
                                ) : (
                                    "Tidak ada surat baru yang menunggu disposisi."
                                )
                            ) : (
                                stats.disposisi > 0 ? (
                                    <>Anda memiliki <strong className="text-blue-800 dark:text-blue-100">{stats.disposisi} Disposisi</strong> yang perlu ditindaklanjuti.</>
                                ) : (
                                    "Tidak ada disposisi baru yang belum diterima."
                                )
                            )}
                            {stats.urgent > 0 && (
                                <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
                                    ({stats.urgent} Mendesak)
                                </span>
                            )}
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {isPimpinan && stats.suratBaru > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-black/20 rounded-full border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-700 dark:text-blue-300">
                                <Mail size={14} /> {stats.suratBaru} Surat
                            </div>
                        )}
                        {isPimpinan && stats.draf > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-black/20 rounded-full border border-purple-200 dark:border-purple-800 text-xs font-medium text-purple-700 dark:text-purple-300">
                                <FileText size={14} /> {stats.draf} Draf
                            </div>
                        )}
                        {!isPimpinan && stats.tugas > 0 && (
                             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-black/20 rounded-full border border-green-200 dark:border-green-800 text-xs font-medium text-green-700 dark:text-green-300">
                                <ClipboardList size={14} /> {stats.tugas} Tugas
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

// Mendapatkan tipe props dari RuangKerjaCard secara otomatis
type RuangKerjaCardProps = React.ComponentProps<typeof RuangKerjaCard>;

// Extend tipe props
interface VisionaryFeedProps extends Omit<RuangKerjaCardProps, 'item' | 'isActionLoading'> {
  items: RuangKerjaItem[];
  loadingId: string | null;
}

export default function VisionaryFeed({ items, loadingId, isPimpinan, ...props }: VisionaryFeedProps) {

  const isItemLoading = (item: RuangKerjaItem) => {
    const itemId = item.type === 'surat_disposisi' ? item.disposisi.id 
                 : item.type === 'tugas' ? item.tugas.id 
                 : item.type === 'draf' ? item.draf.id 
                 : item.surat.id;
    return loadingId === itemId;
  };

  const getItemKey = (item: RuangKerjaItem) => {
     return item.type === 'surat_disposisi' ? item.disposisi.id 
          : item.type === 'tugas' ? item.tugas.id 
          : item.type === 'draf' ? item.draf.id 
          : item.surat.id;
  };

  return (
    <div className="space-y-6 pb-10">
      
      <DailyBriefing items={items} isPimpinan={isPimpinan} />

      {/* --- DAFTAR FEED KESELURUHAN --- */}
      {items.length > 0 && (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
        >
            {items.map((item) => (
                <motion.div key={getItemKey(item)} variants={itemAnim}>
                    <RuangKerjaCard 
                        item={item} 
                        isActionLoading={isItemLoading(item)}
                        isPimpinan={isPimpinan}
                        {...props} 
                    />
                </motion.div>
            ))}
        </motion.div>
      )}
    </div>
  );
}