// Directory: src/app/dashboard/hooks/useSuratActions.ts
// [FIXED] Menambahkan mekanisme 'Optimistic Updates' untuk Feed Ruang Kerja.
// Mencegah masalah "Ghosting" / Feed tidak hilang akibat Race Condition dengan Cloud Functions.

import { useState } from 'react';
import { 
  doc, updateDoc, deleteDoc, Timestamp, writeBatch, collection, 
  serverTimestamp, arrayUnion 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { useToast } from '@/context/ToastContext';
import { Surat, Disposisi, UserProfile, TindakLanjut } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export interface TindakLanjutPayload {
    isiLaporan: string;
    judulLaporan?: string;
    warnaLabel?: 'default' | 'red' | 'green' | 'blue' | 'yellow' | 'purple';
    checklist?: { id: string; teks: string; isDone: boolean }[];
}

export const useSuratActions = () => {
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth();
  const effectiveJabatan = actingJabatanProfile || jabatanProfile;
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const queryClient = useQueryClient();

  // --- HELPER: OPTIMISTIC UPDATES ---
  // Menghapus data dari cache UI secara instan sebelum server selesai memproses
  const optimisticRemoveDisposisi = (disposisiId: string) => {
      if (!effectiveJabatan?.id) return;
      queryClient.setQueryData(['feed', 'user_summaries', effectiveJabatan.id], (oldData: any) => {
          if (!oldData) return oldData;
          const newPending = { ...oldData.pendingDisposisi };
          if (newPending[disposisiId]) {
              delete newPending[disposisiId];
          }
          return { ...oldData, pendingDisposisi: newPending };
      });
  };

  const optimisticUpdateAcknowledge = (disposisiId: string) => {
      if (!effectiveJabatan?.id) return;
      queryClient.setQueryData(['feed', 'user_summaries', effectiveJabatan.id], (oldData: any) => {
          if (!oldData) return oldData;
          const newPending = { ...oldData.pendingDisposisi };
          if (newPending[disposisiId]) {
              newPending[disposisiId] = { ...newPending[disposisiId], needsAcknowledge: false };
          }
          return { ...oldData, pendingDisposisi: newPending };
      });
  };

  const refreshData = () => {
      queryClient.invalidateQueries({ queryKey: ['suratList'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] }); 
      
      // [FIX CRITICAL] Beri jeda 2.5 detik untuk Feed agar Cloud Functions
      // selesai mengupdate dokumen 'userSummaries' di backend.
      setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['feed'] });
      }, 2500);
  };

  const getActorName = () => {
    if (!userProfile || !effectiveJabatan) return 'User';
    return `${userProfile.namaLengkap} (${effectiveJabatan.namaJabatan})`;
  };

  // --- 1. DISPOSISI (Top-Down) ---
  const kirimDisposisi = async (
    surat: Surat,
    targets: UserProfile[],
    instruksi: string,
    batasWaktu?: Date,
    isRevising: boolean = false,
    oldDisposisiId?: string,
    isInformational: boolean = false
  ) => {
    if (!userProfile || !effectiveJabatan) {
        addToast("Sesi tidak valid.", "error");
        return false;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const actorName = getActorName();
      
      if (oldDisposisiId) {
          const oldRef = doc(db, 'disposisi', oldDisposisiId);
          if (isRevising) {
              batch.delete(oldRef);
          } else {
              batch.update(oldRef, { penerimaSelesai: arrayUnion(effectiveJabatan.id) });
          }
          // [SINKRONISASI UI INSTAN]
          optimisticRemoveDisposisi(oldDisposisiId);
      }

      const disposisiRef = doc(collection(db, 'disposisi'));
      const targetJabatanIds = targets.map(t => t.jabatanId);
      
      const disposisiData: Partial<Disposisi> = {
        suratId: surat.id,
        dariJabatanId: effectiveJabatan.id!,
        dariJabatanNama: effectiveJabatan.namaJabatan,
        opdId: effectiveJabatan.opdId,
        kepadaJabatanId: targetJabatanIds,
        instruksi: instruksi,
        tanggalDisposisi: serverTimestamp() as Timestamp,
        penerimaDiterima: [],
        status: 'Terkirim',
        isInformational: isInformational,
      };

      if (batasWaktu && !isInformational) {
          disposisiData.batasWaktu = Timestamp.fromDate(batasWaktu);
      }
      
      batch.set(disposisiRef, disposisiData);

      const suratRef = doc(db, 'surat', surat.id!);
      const suratUpdates: any = {};

      const idsToUnion = [effectiveJabatan.id!, ...targetJabatanIds].filter(Boolean);
      suratUpdates.terlibatJabatanIds = arrayUnion(...idsToUnion);

      if (!isInformational) {
        if (surat.statusPenyelesaian === 'Baru' || surat.statusPenyelesaian === 'Revisi Disposisi') {
            suratUpdates.statusPenyelesaian = 'Didisposisikan';
        }
      }

      suratUpdates.infoTampilan = {
          senderName: effectiveJabatan.namaJabatan,
          recipientNames: targets.length > 5 && isInformational 
              ? "Seluruh Pegawai OPD" 
              : Array.from(new Set(targets.map(t => t.namaLengkap))).join(', '),
          isInformational: isInformational
      };

      batch.update(suratRef, suratUpdates);
      
      const actionLog = isInformational ? "Pemberitahuan disebar" : (isRevising ? "Disposisi direvisi" : "Disposisi dikirim");
      await logActivity(surat.id!, actorName, actionLog, `Kepada: ${targets.map(t => t.namaLengkap).join(', ')}. Instruksi: ${instruksi}`);

      for (const userToNotify of targets) {
        if (userToNotify && userToNotify.uid && userToNotify.uid !== userProfile.uid) {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: userToNotify.uid, 
            userNip: userToNotify.nip,
            message: `${isInformational ? 'Pemberitahuan' : 'Disposisi'} dari ${actorName}: "${surat.perihal}"`,
            link: `/dashboard/surat/${surat.id!}`, 
            isRead: false, 
            timestamp: serverTimestamp() as Timestamp,
          });
        }
      }

      await batch.commit();
      addToast(`Berhasil mengirim ke ${targets.length} orang.`, "success");
      refreshData();
      return true;
    } catch (error: any) {
      console.error("Error kirim disposisi:", error);
      addToast(error.message, "error");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 2. ESKALASI SURAT (Bottom-Up) ---
  const eskalasiSurat = async (
    surat: Surat,
    atasanTarget: UserProfile,
    catatan: string,
    oldDisposisiId?: string
  ) => {
    if (!userProfile || !effectiveJabatan) {
        addToast("Sesi tidak valid.", "error");
        return false;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const actorName = getActorName();
      
      const eskalasiRef = doc(collection(db, 'disposisi'));
      const eskalasiData: Partial<Disposisi> = {
        suratId: surat.id,
        dariJabatanId: effectiveJabatan.id!,
        dariJabatanNama: effectiveJabatan.namaJabatan,
        opdId: effectiveJabatan.opdId,
        kepadaJabatanId: [atasanTarget.jabatanId],
        instruksi: catatan, 
        tanggalDisposisi: serverTimestamp() as Timestamp,
        penerimaDiterima: [],
        status: 'Terkirim',
        isInformational: false, 
      };

      batch.set(eskalasiRef, eskalasiData);

      const suratRef = doc(db, 'surat', surat.id!);
      const idsToUnion = [effectiveJabatan.id!, atasanTarget.jabatanId].filter(Boolean);
      batch.update(suratRef, { 
          statusPenyelesaian: 'Didisposisikan',
          terlibatJabatanIds: arrayUnion(...idsToUnion),
          infoTampilan: {
              senderName: effectiveJabatan.namaJabatan,
              recipientNames: atasanTarget.namaLengkap,
              isInformational: false
          }
      });
      
      await logActivity(surat.id!, actorName, "Menaikkan surat ke pimpinan", `Ke: ${atasanTarget.namaLengkap}. Catatan: ${catatan}`);

      if (atasanTarget.uid !== userProfile.uid) {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: atasanTarget.uid, 
          userNip: atasanTarget.nip,
          message: `Eskalasi Surat dari ${actorName}: "${surat.perihal}"`,
          link: `/dashboard/surat/${surat.id!}`, 
          isRead: false, 
          timestamp: serverTimestamp() as Timestamp,
        });
      }

      if (oldDisposisiId) {
          const oldRef = doc(db, 'disposisi', oldDisposisiId);
          batch.update(oldRef, { penerimaSelesai: arrayUnion(effectiveJabatan.id) });
          // [SINKRONISASI UI INSTAN]
          optimisticRemoveDisposisi(oldDisposisiId);
      }

      await batch.commit();
      addToast(`Surat berhasil dinaikkan ke pimpinan.`, "success");
      refreshData();
      return true;
    } catch (error: any) {
      console.error("Error eskalasi surat:", error);
      addToast(error.message, "error");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const terimaDisposisi = async (disposisi: Disposisi, surat: Surat) => {
    if (!userProfile || !effectiveJabatan?.id) return false;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const disposisiRef = doc(db, 'disposisi', disposisi.id!);
      batch.update(disposisiRef, { penerimaDiterima: arrayUnion(effectiveJabatan.id) });
      await logActivity(surat.id!, getActorName(), disposisi.isInformational ? "Menerima pemberitahuan" : "Menerima disposisi");
      
      // [SINKRONISASI UI INSTAN]
      optimisticUpdateAcknowledge(disposisi.id!);

      await batch.commit();
      addToast("Disposisi diterima.", "success");
      refreshData();
      return true;
    } catch (error: any) {
        addToast("Gagal menerima disposisi.", "error");
        return false;
    } finally {
        setIsProcessing(false);
    }
  };

  // --- MENGIRIM LAPORAN BARU (Payload Google Keep) ---
  const kirimTindakLanjut = async (
     surat: Surat, disposisi: Disposisi, 
     payload: TindakLanjutPayload, 
     fileData?: { url: string, name: string }, 
     opsi?: { buatTugasPengingat?: boolean, teruskanKe?: { targets: UserProfile[], instruksi: string }, isFinalAction?: boolean }
  ) => {
    if (!userProfile || !effectiveJabatan) return false;
    setIsProcessing(true);

    try {
        const batch = writeBatch(db);
        const actorName = getActorName();
        const isFinal = opsi?.isFinalAction || false;

        const tindakLanjutRef = doc(collection(db, 'tindakLanjut'));
        
        const tindakLanjutData: Omit<TindakLanjut, 'id'> = {
            suratId: surat.id!, 
            disposisiId: disposisi.id!, 
            jabatanId: effectiveJabatan.id!, 
            userId: userProfile.uid, 
            isiLaporan: payload.isiLaporan, 
            judulLaporan: payload.judulLaporan || '',
            warnaLabel: payload.warnaLabel || 'default',
            checklist: payload.checklist || [],
            tanggalLaporan: serverTimestamp() as Timestamp,
            opdId: surat.opdId,
            terlibatJabatanIds: surat.terlibatJabatanIds || [effectiveJabatan.id!],
            ...(fileData && { googleDriveLink: fileData.url, googleDriveFileName: fileData.name }),
        } as any; 

        batch.set(tindakLanjutRef, tindakLanjutData as any);

        const logText = payload.judulLaporan ? `[${payload.judulLaporan}] ${payload.isiLaporan}` : payload.isiLaporan;
        const actionLogText = isFinal ? "Menyelesaikan Tindak Lanjut (SELESAI)" : "Melaporkan Progres Tindak Lanjut";
        await logActivity(surat.id!, actorName, actionLogText, logText.substring(0, 100));

        const disposisiRef = doc(db, 'disposisi', disposisi.id!);
        if (isFinal) {
            batch.update(disposisiRef, { penerimaSelesai: arrayUnion(effectiveJabatan.id) });
            // [SINKRONISASI UI INSTAN]
            optimisticRemoveDisposisi(disposisi.id!);
        }

        const suratRef = doc(db, 'surat', surat.id!);
        const suratUpdates: any = { terlibatJabatanIds: arrayUnion(effectiveJabatan.id!) };

        if (isFinal) { suratUpdates.statusPenyelesaian = 'Selesai'; } 
        else { suratUpdates.statusPenyelesaian = 'Proses Tindak Lanjut'; }
        batch.update(suratRef, suratUpdates);
        
        await batch.commit();
        addToast(isFinal ? "Surat diselesaikan." : "Laporan dikirim.", "success");
        refreshData();
        return true;

    } catch (error: any) {
        console.error("Error kirim tindak lanjut:", error);
        addToast("Gagal mengirim tindak lanjut.", "error");
        return false;
    } finally {
        setIsProcessing(false);
    }
  };

  // --- MENGEDIT LAPORAN / CATATAN YANG SUDAH ADA ---
  const editTindakLanjut = async (
      tindakLanjutId: string,
      suratId: string,
      payload: TindakLanjutPayload
  ) => {
      if (!userProfile || !effectiveJabatan) return false;
      setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          const tlRef = doc(db, 'tindakLanjut', tindakLanjutId);
          
          batch.update(tlRef, {
              isiLaporan: payload.isiLaporan,
              judulLaporan: payload.judulLaporan || '',
              warnaLabel: payload.warnaLabel || 'default',
              checklist: payload.checklist || [],
          });

          const actorName = getActorName();
          const snippetText = payload.isiLaporan || (payload.checklist && payload.checklist.length > 0 ? "[Pembaruan Checklist]" : "");
          const logText = payload.judulLaporan ? `[Revisi Judul: ${payload.judulLaporan}] ${snippetText}` : `[Revisi Laporan] ${snippetText}`;
          
          await logActivity(suratId, actorName, "Merevisi Laporan/Catatan", logText.substring(0, 100));

          await batch.commit();
          addToast("Catatan berhasil diperbarui.", "success");
          refreshData();
          return true;
      } catch (error: any) {
          console.error("Error edit tindak lanjut:", error);
          addToast("Gagal memperbarui catatan.", "error");
          return false;
      } finally {
          setIsProcessing(false);
      }
  };

  const archiveSurat = async (surat: Surat, alasan: string = 'Diarsipkan manual') => {
    if (!surat.id) return false;
    setIsProcessing(true);
    try {
        const batch = writeBatch(db);
        const suratRef = doc(db, 'surat', surat.id);
        batch.update(suratRef, {
            statusPenyelesaian: 'Diarsipkan',
            diarsipkanOleh: userProfile?.uid || 'system',
            tanggalArsip: Timestamp.now(),
            alasanArsip: alasan
        });
        await logActivity(surat.id, getActorName(), 'Surat Diarsipkan', `Alasan: ${alasan}`);
        await batch.commit();
        addToast("Surat berhasil diarsipkan.", "success");
        refreshData(); 
        return true;
    } catch (error: any) {
        addToast("Gagal mengarsipkan surat.", "error");
        return false;
    } finally {
        setIsProcessing(false);
    }
  };

  const kembalikanDisposisi = async (disposisi: Disposisi, alasan: string, senderProfile?: UserProfile) => {
     if (!userProfile || !disposisi.id) return false;
     setIsProcessing(true);
     try {
        const batch = writeBatch(db);
        const disposisiRef = doc(db, 'disposisi', disposisi.id);
        batch.update(disposisiRef, { status: 'Dikembalikan', alasanPengembalian: alasan, dikembalikanPada: Timestamp.now() });
        const suratRef = doc(db, 'surat', disposisi.suratId);
        batch.update(suratRef, { statusPenyelesaian: 'Revisi Disposisi' });
        
        // [SINKRONISASI UI INSTAN]
        optimisticRemoveDisposisi(disposisi.id);

        await batch.commit();
        addToast('Disposisi dikembalikan.', 'success');
        refreshData(); 
        return true;
     } catch (err) {
         addToast('Gagal mengembalikan disposisi.', 'error');
         return false;
     } finally {
         setIsProcessing(false);
     }
  };

  const updateSurat = async (originalSurat: Surat, updatedData: Partial<Surat>, newFile?: File) => {
      if (!userProfile) return false;
      setIsProcessing(true);
      try {
          const suratRef = doc(db, 'surat', originalSurat.id);
          await updateDoc(suratRef, updatedData);
          addToast("Surat berhasil diperbarui.", "success");
          refreshData(); 
          return true;
      } catch (err) {
          addToast("Gagal memperbarui surat.", "error");
          return false;
      } finally {
          setIsProcessing(false);
      }
  };

  const deleteSurat = async (surat: Surat) => {
      if (!userProfile || !surat.id) return false;
      setIsProcessing(true);
      try {
          await deleteDoc(doc(db, 'surat', surat.id));
          addToast("Surat berhasil dihapus.", "success");
          refreshData(); 
          return true;
      } catch (err) {
          addToast("Gagal menghapus surat.", "error");
          return false;
      } finally {
          setIsProcessing(false);
      }
  };

  const distribusikanArsip = async (surat: Surat, targetUsers: UserProfile[]) => {
      if (!userProfile || !surat.id) return false;
      setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          targetUsers.forEach(u => {
              const arsipRef = doc(db, 'suratPerPengguna', u.uid, 'arsip', surat.id);
              batch.set(arsipRef, { ...surat, diarsipkanOleh: userProfile.uid, tanggalArsip: Timestamp.now() });
          });
          await batch.commit();
          addToast(`Surat berhasil diarsipkan ke ${targetUsers.length} penerima.`, 'success');
          return true;
      } catch (err) {
          addToast('Gagal mendistribusikan arsip.', 'error');
          return false;
      } finally {
          setIsProcessing(false);
      }
  };

  return {
    isProcessing,
    optimisticRemoveDisposisi,   // <-- EKSPOR FUNGSI INI
    optimisticUpdateAcknowledge, // <-- EKSPOR FUNGSI INI
    kirimDisposisi,
    eskalasiSurat,
    terimaDisposisi,
    kirimTindakLanjut,
    editTindakLanjut,
    archiveSurat,
    kembalikanDisposisi,
    distribusikanArsip,
    updateSurat,
    deleteSurat
  };
};