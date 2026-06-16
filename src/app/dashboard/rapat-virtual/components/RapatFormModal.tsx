// Lokasi: src/app/dashboard/rapat-virtual/components/RapatFormModal.tsx
// [MODIFIKASI]
// - Mengganti 'div.modal-backdrop' kustom dengan <Dialog> shadcn/ui.
// - Mengganti form HTML standar (<input>, <select>, <button>, <label>)
//   dengan komponen <Input>, <Select>, <Button>, <Label> dari shadcn/ui.
// - Memperbaiki path impor menggunakan alias '@'.

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { X, Send, Loader2 } from 'lucide-react'; // [FIX] Impor Loader2

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// --- Akhir Impor Shadcn ---


interface RapatFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RapatFormModal({ isOpen, onClose }: RapatFormModalProps) {
  const { userProfile } = useUserAuth();
  const [formData, setFormData] = useState({
    kegiatan: '',
    jenis: 'Virtual' as 'Fisik' | 'Virtual',
    namaTempat: '',
    tautanRapat: '',
    tanggalMulai: new Date().toISOString().split('T')[0],
    jamMulai: '',
    jamSelesai: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
      if (isOpen) {
        setFormData({
            kegiatan: '',
            jenis: 'Virtual',
            namaTempat: '',
            tautanRapat: '',
            tanggalMulai: new Date().toISOString().split('T')[0],
            jamMulai: '',
            jamSelesai: '',
        });
        setError('');
      }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handler terpisah untuk <Select>
  const handleSelectChange = (value: 'Fisik' | 'Virtual') => {
      setFormData(prev => ({ ...prev, jenis: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kegiatan || !formData.jamMulai || !formData.jamSelesai || (formData.jenis === 'Fisik' && !formData.namaTempat) || (formData.jenis === 'Virtual' && !formData.tautanRapat)) {
        setError('Harap isi semua field yang relevan.');
        return;
    }
    
    setLoading(true);
    setError('');

    try {
        const payload = {
            ...formData,
            opdId: userProfile!.opdId,
            penanggungJawab: userProfile!.namaLengkap,
            tanggalMulai: Timestamp.fromDate(new Date(formData.tanggalMulai)),
            createdBy: userProfile!.uid,
            createdAt: Timestamp.now(),
            status: 'Disetujui' as const,
        };

        await addDoc(collection(db, 'jadwalTempat'), payload);
        onClose();
    } catch (err) {
        console.error("Gagal menyimpan jadwal:", err);
        setError("Terjadi kesalahan saat menyimpan jadwal.");
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Jadwalkan Rapat Baru
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-0 pt-4 space-y-4 overflow-y-auto px-6 max-h-[70vh]">
            {error && <p className="p-3 text-sm text-center text-red-700 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">{error}</p>}
            
            <div>
              <Label htmlFor="kegiatan">Judul Rapat</Label>
              <Input id="kegiatan" name="kegiatan" value={formData.kegiatan} onChange={handleChange} required />
            </div>

            <div>
              <Label htmlFor="jenis">Jenis Rapat</Label>
              <Select name="jenis" value={formData.jenis} onValueChange={handleSelectChange}>
                  <SelectTrigger id="jenis">
                      <SelectValue placeholder="Pilih jenis rapat" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Virtual">Online (Virtual)</SelectItem>
                      <SelectItem value="Fisik">Offline (Fisik)</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            
            {formData.jenis === 'Virtual' ? (
                <div>
                    <Label htmlFor="tautanRapat">Tautan Rapat (Zoom/Meet)</Label>
                    <Input id="tautanRapat" type="url" name="tautanRapat" value={formData.tautanRapat} onChange={handleChange} placeholder="https://..." required />
                </div>
            ) : (
                <div>
                    <Label htmlFor="namaTempat">Lokasi / Ruang Rapat</Label>
                    <Input id="namaTempat" type="text" name="namaTempat" value={formData.namaTempat} onChange={handleChange} required />
                </div>
            )}

            <div>
                <Label htmlFor="tanggalMulai">Tanggal</Label>
                <Input id="tanggalMulai" type="date" name="tanggalMulai" value={formData.tanggalMulai} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jamMulai">Jam Mulai</Label>
                <Input id="jamMulai" type="time" name="jamMulai" value={formData.jamMulai} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="jamSelesai">Jam Selesai</Label>
                <Input id="jamSelesai" type="time" name="jamSelesai" value={formData.jamSelesai} onChange={handleChange} required />
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6 p-4 border-t border-gray-200 dark:border-dark-border sticky bottom-0 bg-gray-50 dark:bg-slate-800/50">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 size={16} className="animate-spin mr-2" />}
              <Send size={16} className="mr-2"/> {loading ? 'Menyimpan...' : 'Simpan Jadwal'}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}