// Lokasi: src/app/dashboard/jadwal/components/JadwalFormModal.tsx
// [PERBAIKAN ERROR BUILD]
// - Menambahkan type casting `as 'Fisik' | 'Virtual'` pada properti `jenis` di dalam useEffect
//   untuk mengatasi error tipe data saat build.
// [PERBAIKAN DARK MODE v6]
// - Mengganti semua kelas `dark:...` kustom dengan kelas semantik shadcn/ui.

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, Timestamp, updateDoc, doc } from 'firebase/firestore'; 
import { useUserAuth } from '@/context/AuthContext';
import { X, Send, Loader2 } from 'lucide-react'; 
import { JadwalTempat } from '@/types'; 

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


interface JadwalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; 
  jadwalToEdit: JadwalTempat | null;
  selectedDate: Date; 
  initialData?: Partial<JadwalTempat>; 
}

export default function JadwalFormModal({ isOpen, onClose, onSuccess, jadwalToEdit, selectedDate, initialData }: JadwalFormModalProps) {
  const { userProfile } = useUserAuth();
  
  // Definisi tipe state secara eksplisit agar aman
  type FormData = {
    kegiatan: string;
    jenis: 'Fisik' | 'Virtual';
    namaTempat: string;
    tautanRapat: string;
    tanggalMulai: string;
    jamMulai: string;
    jamSelesai: string;
    jumlahPersonil: string;
    penanggungJawab: string;
  };

  const [formData, setFormData] = useState<FormData>({
    kegiatan: '',
    jenis: 'Fisik',
    namaTempat: '',
    tautanRapat: '',
    tanggalMulai: new Date().toISOString().split('T')[0],
    jamMulai: '',
    jamSelesai: '',
    jumlahPersonil: '', 
    penanggungJawab: '', 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
      if (isOpen) {
        let data: FormData;
        if (jadwalToEdit) {
            data = {
                kegiatan: jadwalToEdit.kegiatan,
                // [PERBAIKAN] Tambahkan casting 'as ...' di sini
                jenis: (jadwalToEdit.jenis as 'Fisik' | 'Virtual') || 'Fisik',
                namaTempat: jadwalToEdit.namaTempat || '',
                tautanRapat: jadwalToEdit.tautanRapat || '',
                tanggalMulai: jadwalToEdit.tanggalMulai.toDate().toISOString().split('T')[0],
                jamMulai: jadwalToEdit.jamMulai,
                jamSelesai: jadwalToEdit.jamSelesai,
                jumlahPersonil: jadwalToEdit.jumlahPersonil?.toString() || '',
                penanggungJawab: jadwalToEdit.penanggungJawab,
            };
        } else if (initialData) {
             data = {
                kegiatan: initialData.kegiatan || '',
                // [PERBAIKAN] Tambahkan casting 'as ...' di sini juga
                jenis: (initialData.jenis as 'Fisik' | 'Virtual') || 'Fisik',
                namaTempat: initialData.namaTempat || '',
                tautanRapat: initialData.tautanRapat || '',
                tanggalMulai: initialData.tanggalMulai ? (initialData.tanggalMulai as Timestamp).toDate().toISOString().split('T')[0] : selectedDate.toISOString().split('T')[0],
                jamMulai: initialData.jamMulai || '',
                jamSelesai: initialData.jamSelesai || '',
                jumlahPersonil: initialData.jumlahPersonil?.toString() || '',
                penanggungJawab: initialData.penanggungJawab || userProfile?.namaLengkap || '',
            };
        } else {
            data = {
                kegiatan: '',
                jenis: 'Fisik',
                namaTempat: '',
                tautanRapat: '',
                tanggalMulai: selectedDate.toISOString().split('T')[0],
                jamMulai: '',
                jamSelesai: '',
                jumlahPersonil: '',
                penanggungJawab: userProfile?.namaLengkap || '',
            };
        }
        setFormData(data);
        setError('');
      }
  }, [isOpen, jadwalToEdit, selectedDate, userProfile, initialData]);

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
        // [PERBAIKAN BUG] Gabungkan tanggal dan jam dengan benar
        // Buat objek Date dari tanggalMulai (YYYY-MM-DD)
        const datePart = new Date(formData.tanggalMulai + 'T00:00:00');
        // Ambil jam dan menit dari jamMulai
        const [hours, minutes] = formData.jamMulai.split(':').map(Number);
        // Set jam dan menit ke objek Date
        datePart.setHours(hours, minutes);
        
        const payload = {
            kegiatan: formData.kegiatan,
            jenis: formData.jenis,
            namaTempat: formData.jenis === 'Fisik' ? formData.namaTempat : '',
            tautanRapat: formData.jenis === 'Virtual' ? formData.tautanRapat : '',
            opdId: userProfile!.opdId,
            penanggungJawab: formData.penanggungJawab || userProfile!.namaLengkap,
            tanggalMulai: Timestamp.fromDate(datePart), // Gunakan objek Date yang sudah digabung
            jamMulai: formData.jamMulai,
            jamSelesai: formData.jamSelesai,
            jumlahPersonil: formData.jumlahPersonil ? Number(formData.jumlahPersonil) : null,
        };

        if (jadwalToEdit) {
            const jadwalRef = doc(db, 'jadwalTempat', jadwalToEdit.id!);
            // [PERBAIKAN ERROR] Buat updatePayload secara eksplisit
            const updatePayload = {
              ...payload,
              // Tambahkan field yang mungkin di-update di logic lama Anda jika ada
              // e.g., status: 'Disetujui' // (Jika admin mengedit, status kembali disetujui)
            };
            await updateDoc(jadwalRef, updatePayload);
        } else {
            await addDoc(collection(db, 'jadwalTempat'), {
                ...payload,
                createdBy: userProfile!.uid,
                createdAt: Timestamp.now(),
                status: 'Disetujui' as const, // Default disetujui jika dibuat manual
            });
        }
        
        onSuccess();
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
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {jadwalToEdit ? 'Edit Jadwal' : 'Jadwal Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-0 pt-4 space-y-4 overflow-y-auto px-6 max-h-[70vh]">
            {error && <p className="p-3 text-sm text-center text-red-700 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">{error}</p>}
            
            <div>
              <Label htmlFor="kegiatan">Judul Kegiatan/Rapat</Label>
              <Input id="kegiatan" name="kegiatan" value={formData.kegiatan} onChange={handleChange} required />
            </div>

            <div>
              <Label htmlFor="jenis">Jenis Rapat</Label>
              <Select name="jenis" value={formData.jenis} onValueChange={handleSelectChange}>
                  <SelectTrigger id="jenis">
                      <SelectValue placeholder="Pilih jenis rapat" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Fisik">Offline (Fisik)</SelectItem>
                      <SelectItem value="Virtual">Online (Virtual)</SelectItem>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="penanggungJawab">Penanggung Jawab</Label>
                    <Input id="penanggungJawab" type="text" name="penanggungJawab" value={formData.penanggungJawab} onChange={handleChange} required />
                 </div>
                 <div>
                    <Label htmlFor="jumlahPersonil">Jumlah Personil</Label>
                    <Input id="jumlahPersonil" type="number" name="jumlahPersonil" value={formData.jumlahPersonil} onChange={handleChange} placeholder="Opsional" min="0" />
                 </div>
            </div>

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
          
          <DialogFooter className="mt-6 p-4 border-t border-border sticky bottom-0 bg-muted/50">
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