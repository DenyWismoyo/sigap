// Lokasi: src/app/dashboard/surat/[id]/components/ManualArchiveModal.tsx
// [MODIFIKASI REFACCTOR (Tahap 1 & 2)]
// - Mengganti 'div.modal-backdrop' kustom dengan <Dialog> shadcn/ui.
// - Mengganti form HTML standar (<input>, <button>, <label>)
//   dengan komponen <Input>, <Button>, <Label>, <Checkbox> dari shadcn/ui.
// - Menggunakan <ScrollArea> untuk daftar pengguna.

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Surat, UserProfile, Jabatan } from '../../../../../types';
import { X, Loader2, Archive, Search, User } from 'lucide-react';
import Avatar from '../../../components/Avatar';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
// --- Akhir Impor Shadcn ---


interface ManualArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  surat: Surat;
  onConfirm: (selectedJabatanIds: string[]) => void;
  isProcessing: boolean;
  userCache: Map<string, UserProfile>; // Map<jabatanId, UserProfile>
  allOpdJabatans: Jabatan[];
}

const ManualArchiveModal = ({ isOpen, onClose, surat, onConfirm, isProcessing, userCache, allOpdJabatans }: ManualArchiveModalProps) => {
  const [selectedJabatanIds, setSelectedJabatanIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedJabatanIds([]);
      setSearchTerm('');
      setErrorMessage('');
    }
  }, [isOpen]);

  const jabatansInOpd = useMemo(() => {
    if (!allOpdJabatans || allOpdJabatans.length === 0 || userCache.size === 0) return [];
    const searchLower = searchTerm.toLowerCase();
    return allOpdJabatans
      .filter(jabatan => jabatan.status === 'aktif') 
      .map(jabatan => {
        const user = userCache.get(jabatan.id!);
        return {
          jabatanId: jabatan.id!,
          namaJabatan: jabatan.namaJabatan,
          namaLengkap: user?.namaLengkap || '(Jabatan Kosong)',
          userExists: !!user
        };
      })
      .filter(item => 
        item.namaJabatan.toLowerCase().includes(searchLower) ||
        item.namaLengkap.toLowerCase().includes(searchLower)
      )
      .sort((a, b) => a.namaJabatan.localeCompare(b.namaJabatan));
  }, [allOpdJabatans, userCache, searchTerm]);

  const handleCheckboxChange = (jabatanId: string) => {
    setErrorMessage('');
    setSelectedJabatanIds(prev =>
      prev.includes(jabatanId)
        ? prev.filter(id => id !== jabatanId)
        : [...prev, jabatanId]
    );
  };

  const handleConfirmClick = () => {
    if (selectedJabatanIds.length === 0) {
      setErrorMessage("Pilih setidaknya satu penerima arsip.");
      return;
    }
    setErrorMessage('');
    onConfirm(selectedJabatanIds);
  };

  if (!isOpen) return null;

  // [MODIFIKASI] Gunakan <Dialog>
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Archive size={20} className="mr-3 text-gray-500" />
            Arsipkan Surat Manual
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-0 flex-1 overflow-y-auto space-y-4">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            Anda akan mengarsipkan surat: <strong className="text-gray-800 dark:text-dark-text-primary">"{surat.perihal}"</strong>.
            Pilih pengguna (berdasarkan jabatan) yang akan menerima salinan arsip ini di folder arsip pribadi mereka.
          </p>

          {errorMessage && (
            <p className="p-2 text-xs text-center text-red-700 bg-red-100 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-lg">{errorMessage}</p>
          )}

          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari nama atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* [MODIFIKASI] Gunakan <ScrollArea> */}
          <ScrollArea className="h-60 rounded-md border p-2 dark:border-dark-border">
            <div className="space-y-2">
              {jabatansInOpd.length > 0 ? (
                jabatansInOpd.map(item => (
                  <div key={item.jabatanId} className={`flex items-center p-2 rounded-md ${item.userExists ? 'hover:bg-gray-100 dark:hover:bg-slate-700' : 'opacity-50'}`}>
                    <Checkbox
                      id={item.jabatanId}
                      checked={selectedJabatanIds.includes(item.jabatanId)}
                      onCheckedChange={() => handleCheckboxChange(item.jabatanId)}
                      className="mr-3"
                      disabled={isProcessing || !item.userExists}
                    />
                    <Label 
                      htmlFor={item.jabatanId} 
                      className={`flex-1 flex items-center gap-3 ${item.userExists ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <Avatar name={item.namaLengkap} className="w-8 h-8" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-dark-text-primary">{item.namaLengkap}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{item.namaJabatan}</p>
                      </div>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center text-gray-500 dark:text-dark-text-secondary py-4">
                  {searchTerm ? 'Tidak ada hasil ditemukan.' : 'Tidak ada pengguna lain di OPD ini.'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-dark-border">
          <Button
            type="button"
            onClick={handleConfirmClick}
            disabled={isProcessing || selectedJabatanIds.length === 0}
          >
            {isProcessing ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : (
              <Archive size={16} className="mr-2" />
            )}
            {isProcessing ? 'Mengarsipkan...' : `Arsipkan ke ${selectedJabatanIds.length} Penerima`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualArchiveModal;