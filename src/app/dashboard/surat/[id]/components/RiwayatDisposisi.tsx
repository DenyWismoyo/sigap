// Lokasi: src/app/dashboard/surat/[id]/components/RiwayatDisposisi.tsx
// [UPDATE MOBILE UI]: Padding dan ukuran Avatar diperkecil untuk ponsel

"use client";

import React, { useState } from 'react';
import { Disposisi, UserProfile } from '@/types';
import { Loader2, Users } from 'lucide-react';
import { formatDateRelative } from '@/lib/utils';
import Avatar from '@/app/dashboard/components/Avatar';
import { useSuratActions } from '@/app/dashboard/hooks/useSuratActions'; 

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RiwayatDisposisiProps {
  disposisiList: Disposisi[];
  suratId: string;
  userProfile: UserProfile | null; 
  onUpdate: () => void;
  jabatanCache: Map<string, string>; 
  userCache: Map<string, UserProfile>; 
}

export default function RiwayatDisposisi({ disposisiList, suratId, userProfile, onUpdate, jabatanCache, userCache }: RiwayatDisposisiProps) {
  const { kembalikanDisposisi, isProcessing } = useSuratActions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDisposisi, setSelectedDisposisi] = useState<Disposisi | null>(null);
  const [alasan, setAlasan] = useState('');

  const openReturnModal = (disposisi: Disposisi) => {
    setSelectedDisposisi(disposisi);
    setIsModalOpen(true);
  };

  const closeReturnModal = () => {
    setIsModalOpen(false);
    setSelectedDisposisi(null);
    setAlasan('');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasan || !selectedDisposisi) return;

    const senderProfile = userCache?.get(selectedDisposisi.dariJabatanId);
    
    const success = await kembalikanDisposisi(selectedDisposisi, alasan, senderProfile);
    
    if (success) {
        closeReturnModal();
        onUpdate(); 
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'Dikembalikan') return <span className="px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-full">{status}</span>;
    return null;
  };

   const renderPenerima = (disposisi: Disposisi) => {
       const recipientCount = disposisi.kepadaJabatanId.length;
       const isBulk = disposisi.isInformational && recipientCount > 5;

       if (isBulk) {
           return <span className="font-semibold text-foreground">Seluruh Pegawai OPD</span>;
       } else {
           const namesToShow = disposisi.kepadaJabatanId.slice(0, 3).map(id => {
               const snapshotList = (disposisi as any).penerimaSnapshot || [];
               const snapshotUser = snapshotList.find((p: any) => p.jabatanId === id);

               const cachedUser = userCache?.get(id);
               const jabatanName = jabatanCache?.get(id);
               
               if (snapshotUser) return snapshotUser.nama; 
               if (cachedUser) return cachedUser.namaLengkap; 
               if (jabatanName) return `${jabatanName} (Kosong)`; 
               return 'Jabatan Tidak Dikenal';
           });

           const remainingCount = recipientCount - 3;
           const displayText = remainingCount > 0
               ? `${namesToShow.join(', ')}, dan ${remainingCount} lainnya`
               : namesToShow.join(', ');

           return <span className="font-semibold text-foreground">{displayText}</span>;
       }
   };

  const getPengirimInfo = (disposisi: Disposisi) => {
      if (disposisi.dariJabatanNama) return { 
          nama: disposisi.dariJabatanNama, 
          jabatan: jabatanCache?.get(disposisi.dariJabatanId) || '...'
      };
      
      const user = userCache?.get(disposisi.dariJabatanId);
      if (user) return { 
          nama: user.namaLengkap, 
          jabatan: jabatanCache?.get(disposisi.dariJabatanId) || '...'
      };

      const jabatanName = jabatanCache?.get(disposisi.dariJabatanId);
      return { 
          nama: jabatanName || 'Pengirim Tidak Dikenal', 
          jabatan: 'Jabatan Kosong / Tidak Dikenal' 
      };
  };

  return (
    <>
      <div className="w-full bg-card rounded-xl shadow-sm border border-border flex flex-col">
          <div className="flex justify-between items-center p-3 md:p-6 border-b border-border">
              <h2 className="text-base md:text-xl font-semibold text-foreground flex items-center">
                  <Users size={18} className="mr-2 md:mr-3 text-muted-foreground" />
                  Riwayat Disposisi
              </h2>
          </div>
          <div className="p-3 md:p-6 overflow-y-auto max-h-96">
            {disposisiList.length > 0 ? (
              <ul className="space-y-3 md:space-y-4">
                {disposisiList.map(d => {
                  const isRecipient = userProfile && d.kepadaJabatanId.includes(userProfile.jabatanId);
                  const canBeReturned = isRecipient && d.status !== 'Dikembalikan';
                  
                  const { nama: pengirimNama, jabatan: pengirimJabatan } = getPengirimInfo(d);
                  const safeAvatarName = pengirimNama && pengirimNama !== 'Pengirim Tidak Dikenal' ? pengirimNama : '?';

                  return (
                    // Penyesuaian Padding Mobile
                    <li key={d.id} className="p-3 md:p-4 text-xs md:text-sm rounded-lg bg-muted border border-border">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-2.5 md:space-x-3 min-w-0">
                            {/* Penyesuaian Ukuran Avatar Mobile */}
                            <Avatar name={safeAvatarName} className="w-8 h-8 md:w-10 md:h-10 mt-0.5 md:mt-1 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-muted-foreground truncate leading-tight">
                                    <strong className="text-foreground">{pengirimNama}</strong>
                                    <span className="text-[10px] md:text-xs"> ({pengirimJabatan})</span>
                                </p>
                                <p className="text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                                    <strong>Kepada:</strong> {renderPenerima(d)}
                                </p>
                                <p className="mt-1.5 md:mt-2 italic text-foreground/90 leading-snug">"{d.instruksi}"</p>
                                {d.batasWaktu && <p className="mt-1 text-[10px] md:text-xs text-yellow-700 dark:text-yellow-400"><strong>Batas Waktu:</strong> {d.batasWaktu.toDate().toLocaleDateString('id-ID')}</p>}
                                {d.status === 'Dikembalikan' && <p className="mt-1 text-[10px] md:text-xs text-red-700 dark:text-red-400 leading-snug"><strong>Alasan Pengembalian:</strong> {d.alasanPengembalian}</p>}
                            </div>
                        </div>
                        <div className="flex-shrink-0 pl-2">
                            {getStatusBadge(d.status)}
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-2 md:mt-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                          <p className="text-[10px] md:text-xs text-muted-foreground">{formatDateRelative(d.tanggalDisposisi)}</p>
                          {canBeReturned && (<button onClick={() => openReturnModal(d)} title="Kembalikan Disposisi" className="px-2 py-1 text-[10px] md:text-xs font-bold text-white bg-yellow-500 rounded-md hover:bg-yellow-600 transition-colors">Kembalikan</button>)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (<p className="mt-4 text-xs md:text-sm text-muted-foreground text-center py-4">Belum ada riwayat disposisi.</p>)}
          </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={closeReturnModal}>
        <DialogContent className="sm:max-w-lg bg-card border-border w-[95vw] md:w-full rounded-xl">
          <DialogHeader>
            <DialogTitle>Kembalikan Disposisi</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Anda akan mengembalikan disposisi kepada <span className="font-semibold text-foreground">{selectedDisposisi?.dariJabatanNama || jabatanCache?.get(selectedDisposisi?.dariJabatanId || '')}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturnSubmit} className="mt-2 space-y-4">
              <div>
                  <Label htmlFor="alasan-pengembalian" className="text-xs md:text-sm">Alasan Pengembalian (Wajib)</Label>
                  <Textarea 
                    id="alasan-pengembalian"
                    value={alasan} 
                    onChange={e => setAlasan(e.target.value)} 
                    rows={3} 
                    required 
                    autoFocus
                    className="text-sm mt-1"
                  />
              </div>
              <DialogFooter className="pt-2 md:pt-4 flex-row gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={closeReturnModal} disabled={isProcessing} className="w-1/2 md:w-auto text-xs md:text-sm h-9">
                    Batal
                  </Button>
                  <Button type="submit" variant="destructive" disabled={isProcessing || !alasan.trim()} className="w-1/2 md:w-auto text-xs md:text-sm h-9">
                    {isProcessing && <Loader2 size={14} className="animate-spin mr-1.5"/>}
                    {isProcessing ? 'Mengirim...' : 'Kirim'}
                  </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}