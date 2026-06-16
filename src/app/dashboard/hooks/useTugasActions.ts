/**
 * Directory: src/app/dashboard/hooks/useTugasActions.ts
 * Status: FINAL COMPLETE SSOT
 * Deskripsi: Hook pusat untuk SEMUA mutasi tugas.
 * [UPDATE LOGBOOK OTOMATIS]
 * - Menambahkan pencatatan otomatis ke Logbook saat membuat tugas baru.
 */

import { useState } from 'react';
import { 
    doc, writeBatch, collection, Timestamp, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, updateDoc, addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Tugas, UserProfile, SubTugas, TugasLampiran } from '@/types';
import { logActivity } from '@/lib/activityLogger';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { updateLogbook } from '@/lib/logbookUtils'; // Import helper

export const useTugasActions = () => {
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth();
  const effectiveJabatan = actingJabatanProfile || jabatanProfile;
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const getActorName = () => `${userProfile?.namaLengkap} (${effectiveJabatan?.namaJabatan})`;

  // --- 1. CORE ACTIONS (CREATE, UPDATE STATUS, DELETE) ---

  const createNewTask = async (
      taskData: Omit<Tugas, 'id' | 'opdId' | 'dariJabatanId' | 'dariJabatanNama' | 'tanggalDibuat' | 'status'>,
      pemberiTugasUser: UserProfile,
      recipientsToNotify: UserProfile[] 
  ) => {
      if (!userProfile || !effectiveJabatan) return false;
      setIsProcessing(true);

      try {
          const batch = writeBatch(db);
          const tugasRef = doc(collection(db, 'tugas'));
          const opdId = userProfile.opdId;
          
          const newTugas: Omit<Tugas, 'id'> = {
              ...taskData,
              opdId,
              dariJabatanId: pemberiTugasUser.jabatanId,
              dariJabatanNama: pemberiTugasUser.namaLengkap,
              tanggalDibuat: Timestamp.now(),
              status: 'Baru',
          };

          batch.set(tugasRef, newTugas);

          // Fan-out ke pemberi tugas
          batch.set(doc(db, 'tugasPerPengguna', pemberiTugasUser.uid, 'tugas', tugasRef.id), newTugas);
          
          // Fan-out ke penerima & kolaborator
          recipientsToNotify.forEach(u => {
              if (u.uid !== pemberiTugasUser.uid) {
                  batch.set(doc(db, 'tugasPerPengguna', u.uid, 'tugas', tugasRef.id), newTugas);
              }
          });

          if (taskData.suratId && taskData.suratPerihal) {
            await logActivity(taskData.suratId, getActorName(), `Membuat tugas baru: "${taskData.judulTugas}"`);
            const suratRef = doc(db, 'surat', taskData.suratId);
            batch.update(suratRef, { statusPenyelesaian: 'Proses Tindak Lanjut' });
          }

          for (const u of recipientsToNotify) {
              if (u.uid === userProfile.uid) continue;
              const notifRef = doc(collection(db, 'notifications'));
              batch.set(notifRef, {
                  userId: u.uid, userNip: u.nip, 
                  message: `Tugas baru: "${taskData.judulTugas}"`, 
                  link: '/dashboard/tugas', isRead: false, timestamp: Timestamp.now() 
              });
              if (u.nomorWa) sendWhatsAppNotification(u.nomorWa, 'tugas_baru', [getActorName(), taskData.judulTugas]).catch(console.error);
          }

          await batch.commit();

          // --- [AUTO LOGBOOK] ---
          // Mencatat pemberian tugas ke logbook pimpinan
          try {
            const logDesc = `Memberikan tugas: "${taskData.judulTugas}" kepada ${taskData.kepadaJabatanNama}`;
            await updateLogbook(userProfile.uid, userProfile.opdId, new Date(), {
                id: `auto_task_${tugasRef.id}_${Date.now()}`,
                deskripsi: logDesc,
                selesai: true, // Aksi memberi tugas dianggap selesai
                tugasTerkaitId: tugasRef.id,
                tugasTerkaitJudul: taskData.judulTugas
            });
            console.log("Auto-logbook pemberian tugas berhasil.");
          } catch (logErr) {
            console.error("Gagal auto-logbook:", logErr);
          }
          // --- [AKHIR AUTO LOGBOOK] ---

          return tugasRef.id;

      } catch (error: any) {
          console.error("Create Task Error:", error);
          addToast(error.message || "Gagal membuat tugas.", 'error');
          return null;
      } finally {
          setIsProcessing(false);
      }
  };

  const updateTaskStatus = async (task: Tugas, newStatus: Tugas['status']) => {
      if (!userProfile || !effectiveJabatan) return false;
      setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          const tugasRef = doc(db, 'tugas', task.id!);
          const updateData: any = { status: newStatus };
          let logMessage = '';

          if (newStatus === 'Selesai') {
              updateData.tanggalSelesai = Timestamp.now();
              logMessage = `Menyelesaikan tugas: "${task.judulTugas}"`;
          } else if (newStatus === 'Dikerjakan' && task.status === 'Selesai') {
              updateData.tanggalSelesai = null;
              logMessage = `Membuka kembali (revisi) tugas: "${task.judulTugas}"`;
          } else {
              logMessage = `Mengubah status tugas menjadi "${newStatus}"`;
          }

          batch.update(tugasRef, updateData);
          const myCopyRef = doc(db, 'tugasPerPengguna', userProfile.uid, 'tugas', task.id!);
          batch.update(myCopyRef, updateData);

          if (task.suratId) {
              await logActivity(task.suratId, getActorName(), logMessage);
          }
          
          await batch.commit();
          addToast(`Status diubah menjadi ${newStatus}`, 'success');
          return true;
      } catch (error: any) {
          addToast("Gagal memperbarui status.", 'error');
          return false;
      } finally {
          setIsProcessing(false);
      }
  };

  const updateTaskDetail = async (taskId: string, updates: Partial<Tugas>) => {
      if (!userProfile) return false;
      setIsProcessing(true);
      try {
          const tugasRef = doc(db, 'tugas', taskId);
          await updateDoc(tugasRef, updates);
          await updateDoc(doc(db, 'tugasPerPengguna', userProfile.uid, 'tugas', taskId), updates);
          addToast('Detail tugas diperbarui.', 'success');
          return true;
      } catch (err: any) {
          addToast(`Gagal update: ${err.message}`, 'error');
          return false;
      } finally {
          setIsProcessing(false);
      }
  };

  const deleteTask = async (task: Tugas) => {
      if (!userProfile || !effectiveJabatan) return false;
      setIsProcessing(true);
      try {
          await deleteDoc(doc(db, 'tugas', task.id!));
          await deleteDoc(doc(db, 'tugasPerPengguna', userProfile.uid, 'tugas', task.id!));
          if (task.suratId) await logActivity(task.suratId, getActorName(), `Menghapus tugas: "${task.judulTugas}"`);
          addToast("Tugas berhasil dihapus.", "success");
          return true;
      } catch (error: any) {
          addToast("Gagal menghapus tugas.", 'error');
          return false;
      } finally {
          setIsProcessing(false);
      }
  };

  // --- 2. SUB-TASK ACTIONS ---
  const addSubTask = async (taskId: string, subTask: SubTugas) => {
      try {
          await updateDoc(doc(db, 'tugas', taskId), { subTugas: arrayUnion(subTask) });
          return true;
      } catch (e) { console.error(e); return false; }
  };

  const toggleSubTask = async (taskId: string, subTugasList: SubTugas[], subTaskId: string) => {
      try {
          const updatedList = subTugasList.map(st => st.id === subTaskId ? { ...st, selesai: !st.selesai } : st);
          await updateDoc(doc(db, 'tugas', taskId), { subTugas: updatedList });
          return updatedList;
      } catch (e) { console.error(e); return null; }
  };

  const removeSubTask = async (taskId: string, subTask: SubTugas) => {
      try {
          await updateDoc(doc(db, 'tugas', taskId), { subTugas: arrayRemove(subTask) });
          return true;
      } catch (e) { console.error(e); return false; }
  };

  // --- 3. COLLABORATOR ACTIONS ---
  const addCollaborator = async (taskId: string, jabatanId: string) => {
      try {
          await updateDoc(doc(db, 'tugas', taskId), { collaboratorIds: arrayUnion(jabatanId) });
          return true;
      } catch (e) { console.error(e); return false; }
  };

  const removeCollaborator = async (taskId: string, jabatanId: string) => {
      try {
          await updateDoc(doc(db, 'tugas', taskId), { collaboratorIds: arrayRemove(jabatanId) });
          return true;
      } catch (e) { console.error(e); return false; }
  };

  // --- 4. COMMENT & ATTACHMENT ACTIONS ---
  const addComment = async (taskId: string, komentar: string) => {
      if(!userProfile || !effectiveJabatan) return false;
      try {
          await addDoc(collection(db, 'komentarTugas'), {
              tugasId: taskId,
              userId: userProfile.uid,
              userName: userProfile.namaLengkap,
              userJabatan: effectiveJabatan.namaJabatan,
              komentar: komentar,
              timestamp: serverTimestamp()
          });
          return true;
      } catch (e) { console.error(e); return false; }
  };

  const addAttachment = async (taskId: string, attachment: TugasLampiran) => {
      try {
          await updateDoc(doc(db, 'tugas', taskId), { lampiran: arrayUnion(attachment) });
          return true;
      } catch (e) { console.error(e); return false; }
  };

  return {
      createNewTask,
      updateTaskStatus,
      updateTaskDetail,
      deleteTask,
      addSubTask,
      toggleSubTask,
      removeSubTask,
      addCollaborator,
      removeCollaborator,
      addComment,
      addAttachment,
      isProcessing
  };
};