// Lokasi: src/app/dashboard/surat/[id]/components/ActivityLogSection.tsx
// [MODIFIKASI REFACCTOR (Tahap 1)]
// - Mengganti 'div.modal-backdrop' kustom dengan <Dialog> shadcn/ui.
// - Menggunakan <DialogHeader> dan <DialogTitle>.
// - Menggunakan <ScrollArea> untuk konten log.
// [PERBAIKAN DARK MODE v6]
// - Mengganti semua kelas `dark:...` kustom dengan kelas semantik shadcn/ui.

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ActivityLog } from '@/types';
import { History, X } from 'lucide-react';
import { formatDateRelative } from '@/lib/utils';
import Avatar from '../../../components/Avatar';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
// --- Akhir Impor Shadcn ---


interface ActivityLogSectionProps {
  suratId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityLogSection({ suratId, isOpen, onClose }: ActivityLogSectionProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suratId || !isOpen) return;

    setLoading(true);
    const q = query(
      collection(db, 'activityLogs'),
      where('suratId', '==', suratId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error("Gagal mengambil log aktivitas:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [suratId, isOpen]);

  // [MODIFIKASI] Gunakan <Dialog>
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        {/* [PERBAIKAN DARK MODE] */}
        <DialogContent className="sm:max-w-2xl bg-card border-border flex flex-col max-h-[70vh]">
            <DialogHeader>
                <DialogTitle className="flex items-center">
                    <History size={20} className="mr-3 text-muted-foreground" />
                    Log Aktivitas Surat
                </DialogTitle>
            </DialogHeader>
            {/* [MODIFIKASI] Gunakan <ScrollArea> */}
            <ScrollArea className="flex-1 overflow-y-auto -mx-6 px-6">
                <div className="relative space-y-6 py-4">
                    {/* [PERBAIKAN DARK MODE] */}
                    {loading && <p className="text-muted-foreground">Memuat log...</p>}
                    {!loading && logs.length === 0 && <p className="text-muted-foreground">Belum ada aktivitas tercatat.</p>}
                    
                    {logs.map(log => (
                    <div key={log.id} className="flex items-start space-x-3">
                        <Avatar name={log.actorName} className="w-8 h-8 mt-1 flex-shrink-0" />
                        
                        <div className="flex-1">
                            {/* [PERBAIKAN DARK MODE] */}
                            <p className="text-sm">
                                <span className="font-semibold text-foreground">{log.actorName}</span>
                                <span className="text-foreground/90"> {log.action.toLowerCase()}</span>
                            </p>
                            {log.details && (
                              <p className="mt-1 text-sm font-normal text-muted-foreground italic">"{log.details}"</p>
                            )}
                            <time className="mt-1 text-xs font-normal leading-none text-muted-foreground">{formatDateRelative(log.timestamp)}</time>
                        </div>
                    </div>
                    ))}
                </div>
            </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}