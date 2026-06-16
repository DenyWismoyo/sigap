// Lokasi: src/app/dashboard/components/ConfirmModal.tsx
// [REFAKTOR SHADCN/UI]
// - Mengganti <div modal-backdrop> kustom dengan <Dialog> dari shadcn/ui.
// - Mengganti <button> standar dengan <Button variant="..."> dari shadcn/ui.
// [PERBAIKAN DARK MODE v6]
// - Menghapus kelas hardcoded (bg-white, dark:bg-dark-card, text-gray-...)
// - Mengganti dengan kelas semantik shadcn/ui (bg-card, text-foreground, text-muted-foreground)

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // Impor komponen Dialog shadcn
import { Button } from "@/components/ui/button"; // Impor komponen Button shadcn
import { Loader2, AlertTriangle } from 'lucide-react'; // Ikon X tidak lagi diperlukan

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isProcessing?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Ya, Lanjutkan",
  isProcessing = false
}: ConfirmModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* [PERBAIKAN] Menggunakan kelas semantik bg-card dan border-border */}
      <DialogContent className="sm:max-w-md bg-card border-border"> 
        
        <DialogHeader>
          {/* [PERBAIKAN] Menggunakan kelas semantik text-foreground */}
          <DialogTitle className="flex items-center text-lg font-semibold text-foreground">
            <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
            {title}
          </DialogTitle>
          {/* [PERBAIKAN] Menggunakan kelas semantik text-muted-foreground */}
          <DialogDescription className="pt-2 text-muted-foreground">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            // [PERBAIKAN] Menghapus className dark:... kustom
          >
            Batal
          </Button>
          <Button
            variant="destructive" 
            onClick={onConfirm}
            disabled={isProcessing}
            className="min-w-[120px]" 
          >
            {isProcessing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
        
      </DialogContent>
    </Dialog>
  );
}