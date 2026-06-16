// Lokasi File: src/app/dashboard/ruang-kerja/components/RuangKerjaTutorialModal.tsx
// Deskripsi: File baru. Menambahkan modal tutorial untuk onboarding pengguna di halaman Ruang Kerja.
"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle, Inbox, Send, CheckSquare, CalendarDays, Zap } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Kunci untuk localStorage. Ganti versi (v1, v2) jika Anda ingin
 * tutorial ini muncul kembali untuk semua pengguna setelah ada update besar.
 */
const TUTORIAL_STORAGE_KEY = 'hasSeenRuangKerjaTutorial_v1';

export const RuangKerjaTutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  
  const handleClose = () => {
    // Set flag di localStorage agar tidak muncul lagi
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch (e) {
      console.error("Gagal menyimpan flag tutorial ke localStorage:", e);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-border p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center text-xl">
            <HelpCircle className="mr-3 text-blue-600" />
            Selamat Datang di Ruang Kerja Baru!
          </DialogTitle>
          <DialogDescription>
            Halaman ini adalah pusat komando digital Anda. Berikut adalah 3 bagian utamanya:
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] flex-1">
          <div className="px-6 space-y-4 text-foreground/90">
            
            {/* Bagian 1: Feed */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold text-foreground flex items-center">
                <Inbox size={16} className="mr-2 text-cyan-600"/>
                1. Kotak Masuk Aksi (Feed)
              </h3>
              <p className="text-sm mt-1">
                Kolom utama adalah "feed" pekerjaan Anda. Tampilannya akan berbeda berdasarkan peran Anda:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                <li><strong>Jika Anda Pimpinan:</strong> Anda akan melihat <Badge variant="outline">Surat Baru</Badge> dan <Badge variant="outline">Draf Persetujuan</Badge> yang menunggu aksi Anda.</li>
                <li><strong>Jika Anda Staf:</strong> Anda akan melihat <Badge variant="outline">Disposisi</Badge> dan <Badge variant="outline">Tugas</Badge> yang ditujukan khusus kepada Anda.</li>
              </ul>
            </div>

            {/* Bagian 2: Aksi Cepat */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold text-foreground flex items-center">
                <Zap size={16} className="mr-2 text-green-600"/>
                2. Aksi Cepat (Quick Actions)
              </h3>
              <p className="text-sm mt-1">
                Setiap kartu memiliki tombol aksi cepat. Anda tidak perlu pindah halaman untuk:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                <li><Badge variant="secondary">Disposisi Cepat</Badge> (Untuk Pimpinan).</li>
                <li><Badge variant="secondary">Tindak Lanjut</Badge> (Untuk Staf, dan otomatis tercatat di Logbook).</li>
                <li><Badge variant="secondary">Selesaikan Tugas</Badge> (Otomatis tercatat di Logbook).</li>
              </ul>
            </div>

            {/* Bagian 3: Agenda */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold text-foreground flex items-center">
                <CalendarDays size={16} className="mr-2 text-purple-600"/>
                3. Agenda Saya (7 Hari)
              </h3>
              <p className="text-sm mt-1">
                Kolom di sebelah kanan adalah agenda personal Anda untuk 7 hari ke depan, yang otomatis terisi dari:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                <li><Badge variant="outline">Surat Undangan</Badge> yang didisposisikan ke Anda.</li>
                <li><Badge variant="outline">Jadwal Internal</Badge> yang Anda buat atau hadiri.</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4 p-4 border-t border-border flex-shrink-0 bg-muted/50">
          <Button onClick={handleClose} className="w-full">Saya Mengerti, Mulai Bekerja</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RuangKerjaTutorialModal;