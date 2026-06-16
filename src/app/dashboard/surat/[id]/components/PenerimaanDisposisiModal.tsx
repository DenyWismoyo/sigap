// Lokasi: src/app/dashboard/surat/[id]/components/PenerimaanDisposisiModal.tsx
// [MODIFIKASI ALUR PEMBERITAHUAN (Sesuai Rencana)]
// - Teks tombol diubah dari "Saya Mengerti & Arsipkan Surat" menjadi "Saya Mengerti & Terima".
// - Teks konfirmasi diubah agar tidak lagi menyebut "Arsipkan".
// - Ikon, warna, dan judul disamakan untuk 'Informational' dan 'Instructional'.
// [MODIFIKASI DARK MODE]
// - Mengganti kelas 'bg-white', 'text-gray-xxx' dengan 'bg-card', 'text-foreground', 'text-muted-foreground'.
// - Mengganti 'bg-gray-50' dengan 'bg-muted'.
// - Mengganti 'border-gray-200' dengan 'border-border'.

"use client";

import React from 'react';
import { Surat, Disposisi } from '../../../../../types';
// [MODIFIKASI] Hapus 'Archive'
import { Info, FileText, CheckCircle, Loader2 } from 'lucide-react';

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

interface PenerimaanDisposisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  surat: Surat;
  disposisi: Disposisi;
  jabatanPengirim: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function PenerimaanDisposisiModal({
  isOpen,
  onClose,
  surat,
  disposisi,
  jabatanPengirim,
  onConfirm,
  isLoading
}: PenerimaanDisposisiModalProps) {

  // [MODIFIKASI ALUR PEMBERITAHUAN]
  // Logika UI disederhanakan. Baik "Informational" maupun "Instructional"
  // sekarang memiliki alur "Terima" yang sama.

  const isInformational = disposisi.isInformational;

  // [PERBAIKAN] Ikon selalu Info
  const modalIcon = <Info size={24} className="text-blue-600 dark:text-blue-400" />;
  
  const modalTitle = isInformational
    ? "Konfirmasi Penerimaan Pemberitahuan"
    : "Konfirmasi Penerimaan Disposisi";

  const modalSubtitle = isInformational
    ? "Anda menerima pemberitahuan baru."
    : "Anda menerima instruksi baru.";

  const instruksiBg = isInformational
    ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800'
    : 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800';

  const instruksiText = isInformational
    ? 'text-indigo-800 dark:text-indigo-300'
    : 'text-blue-800 dark:text-blue-300';

  // [PERBAIKAN TEKS TOMBOL] Tidak lagi menyebut "Arsipkan"
  const buttonText = "Saya Mengerti & Terima";
  const buttonIcon = <CheckCircle size={18} />;
  const buttonClass = 'bg-green-600 hover:bg-green-700'; // Selalu tombol "Terima"

  // [PERBAIKAN TEKS KONFIRMASI] Tidak lagi menyebut "Arsipkan"
  const confirmationText = "Klik tombol di bawah untuk mengonfirmasi bahwa Anda telah membaca instruksi ini. Anda dapat menindaklanjutinya nanti dari halaman detail surat.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* [PERBAIKAN DARK MODE] */}
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${isInformational ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-blue-100 dark:bg-blue-900/50'}`}>
                    {modalIcon}
                </div>
                <div>
                    <DialogTitle>{modalTitle}</DialogTitle>
                    <DialogDescription>{modalSubtitle}</DialogDescription>
                </div>
            </div>
        </DialogHeader>

        <div className="p-6 pt-0 space-y-4">
            {/* [PERBAIKAN DARK MODE] */}
            <p className="text-muted-foreground">
                Dari: <strong className="text-foreground">{jabatanPengirim}</strong>.
            </p>

            {/* [PERBAIKAN DARK MODE] */}
            <div className="p-4 bg-muted border border-border rounded-lg">
                <p className="font-semibold text-foreground">Terkait Surat:</p>
                <p className="italic text-muted-foreground mt-1">"{surat.perihal}"</p>
            </div>

            <div className={`p-4 border rounded-lg ${instruksiBg}`}>
                <p className={`font-semibold ${instruksiText}`}>Isi {isInformational ? 'Pemberitahuan' : 'Instruksi'}:</p>
                <p className={`italic mt-1 ${instruksiText.replace('text-', 'text-opacity-90 ')}`}>{`"${disposisi.instruksi}"`}</p>
            </div>

            {/* [PERBAIKAN DARK MODE] */}
            <p className="text-sm text-muted-foreground pt-2">
                {confirmationText}
            </p>
        </div>

        {/* [PERBAIKAN DARK MODE] */}
        <DialogFooter className="p-6 bg-muted/50 border-t border-border rounded-b-xl">
            <Button
                onClick={onConfirm}
                disabled={isLoading}
                className={`w-full ${buttonClass}`}
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : buttonIcon}
                {isLoading ? 'Memproses...' : buttonText}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}