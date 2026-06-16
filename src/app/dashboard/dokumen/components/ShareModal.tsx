// Lokasi: src/app/dashboard/dokumen/components/ShareModal.tsx
// [MODIFIKASI]
// - Mengganti 'div.modal-backdrop' kustom dengan <Dialog> shadcn/ui.
// - Mengganti form HTML standar dengan <Button>, <Label>, <Checkbox> shadcn/ui.
// - Menggunakan <ScrollArea> untuk daftar OPD.
// - Memperbaiki path impor menggunakan alias '@'.

"use client";

import React, { useState, useEffect } from 'react';
import { DokumenFolder, DokumenLink, OPD } from '@/types'; // path @
import { X, Building, Loader2, Save } from 'lucide-react';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"; // path @
import { Button } from "@/components/ui/button"; // path @
import { Checkbox } from "@/components/ui/checkbox"; // path @
import { Label } from "@/components/ui/label"; // path @
import { ScrollArea } from "@/components/ui/scroll-area"; // path @
// --- Akhir Impor Shadcn ---


// Tipe gabungan dari page.tsx
type RepositoryItemCombined = (DokumenFolder & { type: 'folder' }) | (DokumenLink & { type: 'link' });

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedOpdIds: string[]) => void;
  isProcessing: boolean;
  item: RepositoryItemCombined | null;
  opdList: (OPD & { indent?: boolean })[]; // [MODIFIKASI] Terima OPD yang sudah di-indent
  initialSelectedOpds: string[];
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
  item,
  opdList,
  initialSelectedOpds
}) => {
  const [selectedOpds, setSelectedOpds] = useState<string[]>(initialSelectedOpds);

  useEffect(() => {
    if (isOpen) {
      setSelectedOpds(initialSelectedOpds);
    }
  }, [isOpen, initialSelectedOpds]);

  if (!isOpen || !item) return null;

  const handleOpdCheckChange = (opd: OPD) => {
    const opdId = opd.id!;
    const isSelecting = !selectedOpds.includes(opdId);
    let newSelectedOpds: string[];

    if (isSelecting) {
        newSelectedOpds = [...selectedOpds, opdId];
    } else {
        newSelectedOpds = selectedOpds.filter(id => id !== opdId);
    }

    if (opd.tipe === 'Induk') {
        const subOpdIds = opdList
            .filter(sub => sub.idOpdInduk === opdId)
            .map(sub => sub.id!);
        
        if (isSelecting) {
            newSelectedOpds = [...newSelectedOpds, ...subOpdIds];
        } else {
            newSelectedOpds = newSelectedOpds.filter(id => !subOpdIds.includes(id));
        }
    }
    setSelectedOpds(Array.from(new Set(newSelectedOpds)));
  };

  const toggleSelectAll = (select: boolean) => {
    if (select) {
        setSelectedOpds(opdList.map(opd => opd.id!));
    } else {
        setSelectedOpds([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedOpds);
  };
  
  const namaItem = item.type === 'folder' ? item.namaFolder : item.namaDokumen;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bagikan "{namaItem}"</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-0 pt-4 space-y-4 overflow-y-auto px-6">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  Pilih OPD mana saja yang dapat melihat dan mengakses item ini. Fitur ini hanya untuk Super Admin.
              </p>
              <div>
                  <Label className="font-bold text-sm flex items-center gap-2">
                      <Building size={16} /> Bagikan ke OPD
                  </Label>
                  <div className="flex justify-between items-center mt-2 mb-1">
                      <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(true)}>
                          Pilih Semua
                      </Button>
                      <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(false)}>
                          Kosongkan
                      </Button>
                  </div>
                  
                  <ScrollArea className="h-60 rounded-md border p-3 dark:border-dark-border space-y-2">
                      {opdList.map(opd => (
                          <div key={opd.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                              <Checkbox
                                  id={opd.id!}
                                  checked={selectedOpds.includes(opd.id!)}
                                  onCheckedChange={() => handleOpdCheckChange(opd)}
                                  disabled={isProcessing}
                              />
                              <Label htmlFor={opd.id!} className="text-sm cursor-pointer">
                                  {(opd as any).indent ? '↳ ' : ''}{opd.namaOpd}
                              </Label>
                          </div>
                      ))}
                  </ScrollArea>
              </div>
          </div>
          
          <DialogFooter className="mt-6 p-4 border-t border-gray-200 dark:border-dark-border sticky bottom-0 bg-gray-50 dark:bg-slate-800/50">
              <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
                  Batal
              </Button>
              <Button type="submit" disabled={isProcessing}>
                  {isProcessing && <Loader2 size={16} className="animate-spin mr-2" />}
                  <Save size={16} className="mr-2"/> {isProcessing ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;