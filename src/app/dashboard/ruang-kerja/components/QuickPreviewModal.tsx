// Lokasi: src/app/dashboard/ruang-kerja/components/QuickPreviewModal.tsx
// TUJUAN: Komponen modal baru untuk menampilkan pratinjau PDF surat
//         langsung di Ruang Kerja tanpa pindah halaman.

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import CachedPdfViewer from '@/app/dashboard/surat/[id]/components/CachedPdfViewer';
import { X } from 'lucide-react';

interface QuickPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

const QuickPreviewModal: React.FC<QuickPreviewModalProps> = ({ isOpen, onClose, fileUrl, fileName }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-medium truncate">
            Pratinjau Cepat: {fileName}
          </DialogTitle>
          <DialogClose asChild>
            <button 
              className="p-1 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-2 bg-gray-100 dark:bg-gray-900">
          <CachedPdfViewer fileUrl={fileUrl} fileName={fileName} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickPreviewModal;