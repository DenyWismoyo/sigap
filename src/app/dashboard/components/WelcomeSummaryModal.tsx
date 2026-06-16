// Lokasi: src/app/dashboard/components/WelcomeSummaryModal.tsx
// [MODIFIKASI]
// - Mengganti 'div.modal-backdrop' kustom dengan <Dialog> shadcn/ui.
// - Mengganti <button> standar dengan <Button> shadcn/ui.
// - Mengganti kelas hardcoded dengan kelas semantik (bg-card, text-foreground, dll).
// - Memperbarui `SummaryItem` untuk menggunakan kelas semantik.

"use client";

import React from 'react';
import Link from 'next/link';
import { X, Mail, AlertTriangle, ClipboardCheck, Inbox, Edit } from 'lucide-react';
import Logo from './Logo';
import { WelcomeSummary } from '@/types';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// --- Akhir Impor Shadcn ---

interface WelcomeSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summaryData: WelcomeSummary;
    userName: string;
}

const SummaryItem = ({ count, label, href, icon, colorClass }: { count: number, label: string, href: string, icon: React.ReactNode, colorClass: string }) => {
    if (count === 0) return null;

    return (
        <Link href={href} className="block group">
            {/* [PERBAIKAN DARK MODE] */}
            <div className={`p-4 rounded-lg flex items-center justify-between transition-all border-l-4 ${colorClass} bg-muted hover:bg-accent`}>
                <div className="flex items-center">
                    <div className="mr-4">{icon}</div>
                    <div>
                        {/* [PERBAIKAN DARK MODE] */}
                        <p className="text-2xl font-bold text-foreground">{count}</p>
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    </div>
                </div>
                {/* [PERBAIKAN DARK MODE] */}
                <div className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1">&rarr;</div>
            </div>
        </Link>
    );
};

export default function WelcomeSummaryModal({ isOpen, onClose, summaryData, userName }: WelcomeSummaryModalProps) {
    if (!isOpen) return null;

    // Hitung total item yang relevan untuk ditampilkan
    const totalItems = summaryData.disposisiBaru + 
                       summaryData.tindakLanjutMenunggu + 
                       summaryData.suratMenungguDisposisi +
                       summaryData.tugasAktif +
                       summaryData.tugasLewatBatasWaktu;

    // Jangan tampilkan modal jika tidak ada data sama sekali
    if (totalItems === 0) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader className="text-center items-center">
                    <Logo className="h-12 w-32 mx-auto mb-4" />
                    <DialogTitle className="text-xl font-bold text-foreground">
                        Selamat Datang Kembali, {userName}!
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                        Berikut adalah ringkasan pekerjaan yang perlu perhatian Anda.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-2 space-y-3">
                    <SummaryItem 
                        count={summaryData.disposisiBaru}
                        label="Disposisi Baru Belum Diterima"
                        href="/dashboard/ruang-kerja"
                        icon={<Mail size={28} className="text-blue-500" />}
                        colorClass="border-blue-500"
                    />
                    <SummaryItem 
                        count={summaryData.tindakLanjutMenunggu}
                        label="Surat Menunggu Tindak Lanjut"
                        href="/dashboard/ruang-kerja"
                        icon={<Edit size={28} className="text-orange-500" />}
                        colorClass="border-orange-500"
                    />
                     <SummaryItem 
                        count={summaryData.suratMenungguDisposisi}
                        label="Surat Baru Menunggu Disposisi"
                        href="/dashboard/surat"
                        icon={<Inbox size={28} className="text-yellow-500" />}
                        colorClass="border-yellow-500"
                    />
                    <SummaryItem 
                        count={summaryData.tugasAktif}
                        label="Total Tugas Aktif"
                        href="/dashboard/tugas"
                        icon={<ClipboardCheck size={28} className="text-green-500" />}
                        colorClass="border-green-500"
                    />
                    <SummaryItem 
                        count={summaryData.tugasLewatBatasWaktu}
                        label="Tugas Lewat Batas Waktu"
                        href="/dashboard/tugas"
                        icon={<AlertTriangle size={28} className="text-red-500" />}
                        colorClass="border-red-500"
                    />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} className="w-full">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}