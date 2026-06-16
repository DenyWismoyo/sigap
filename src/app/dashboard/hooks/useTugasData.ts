/**
 * Directory: src/app/dashboard/hooks/useTugasData.ts
 * Status: FINAL SSOT
 * Deskripsi: Hook untuk mengambil dan memfilter daftar tugas pengguna.
 * Menangani: Realtime subscription, Filtering (Status, Tipe, Penugasan), dan Counting.
 * [FIX TYPESCRIPT ERROR]
 * - Menambahkan fallback string '' atau non-null assertion (!) pada actingJabatanProfile.id
 * di dalam filter tasks untuk mengatasi error 'Type undefined is not assignable to type string'.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserAuth } from '@/context/AuthContext';
import { Tugas } from '@/types';

export type TaskStatusFilter = 'Semua' | 'Baru' | 'Dikerjakan' | 'Selesai';
export type TaskAssignmentFilter = 'all' | 'toMe' | 'byMe';
export type TaskTypeFilter = 'all' | 'surat' | 'internal';

interface UseTugasDataProps {
  statusFilter: TaskStatusFilter;
  assignmentFilter: TaskAssignmentFilter;
  typeFilter: TaskTypeFilter;
}

export const useTugasData = ({ statusFilter, assignmentFilter, typeFilter }: UseTugasDataProps) => {
  const { userProfile, actingJabatanProfile, loading: authLoading } = useUserAuth();
  
  const [allTasks, setAllTasks] = useState<Tugas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch All Tasks (Realtime)
  useEffect(() => {
    if (authLoading || !userProfile?.uid) return;

    setIsLoading(true);
    
    // Mengambil dari sub-koleksi 'tugasPerPengguna' untuk performa terbaik (sudah dipartisi per user)
    const q = query(
        collection(db, 'tugasPerPengguna', userProfile.uid, 'tugas'),
        orderBy('tanggalDibuat', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tugas));
        setAllTasks(tasks);
        setIsLoading(false);
    }, (err) => {
        console.error("Error fetching tasks:", err);
        setError(err.message);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, authLoading]);

  // 2. Filter & Sort Logic (Client-side)
  const filteredTasks = useMemo(() => {
      // Guard Clause: Pastikan actingJabatanProfile.id ada sebelum lanjut
      if (!actingJabatanProfile?.id) return [];

      return allTasks.filter(task => {
          // Filter by Status
          const statusMatch = statusFilter === 'Semua' || task.status === statusFilter;
          if (!statusMatch) return false;

          // Filter by Assignment (Peran)
          // toMe: Saya sebagai PJ atau Kolaborator
          // byMe: Saya sebagai Pemberi Tugas
          
          // [PERBAIKAN ERROR] Menggunakan actingJabatanProfile.id! karena sudah di-guard di atas
          const myId = actingJabatanProfile.id!; 

          const isToMe = task.kepadaJabatanId === myId || 
                         (task.collaboratorIds && task.collaboratorIds.includes(myId));
          
          const isByMe = task.dariJabatanId === myId;

          const assignmentMatch = 
              assignmentFilter === 'all' ? true :
              assignmentFilter === 'toMe' ? isToMe :
              assignmentFilter === 'byMe' ? isByMe : true;
          
          if (!assignmentMatch) return false;

          // Filter by Type (Surat vs Internal)
          const typeMatch = 
              typeFilter === 'all' ? true :
              typeFilter === 'surat' ? !!task.suratId :
              typeFilter === 'internal' ? !task.suratId : true;

          return typeMatch;
      });
  }, [allTasks, statusFilter, assignmentFilter, typeFilter, actingJabatanProfile]);

  // 3. Hitung Statistik (Counts) untuk Tab Badge
  const taskCounts = useMemo(() => {
    if (!actingJabatanProfile?.id) return { 'Baru': 0, 'Dikerjakan': 0, 'Selesai': 0, 'Semua': 0 };

    const counts = { 'Baru': 0, 'Dikerjakan': 0, 'Selesai': 0, 'Semua': 0 };
    
    // [PERBAIKAN] Definisi myId agar aman
    const myId = actingJabatanProfile.id;

    allTasks.forEach(task => {
        // Terapkan filter assignment & type saja
        const isToMe = task.kepadaJabatanId === myId || (task.collaboratorIds && task.collaboratorIds.includes(myId));
        const isByMe = task.dariJabatanId === myId;
        
        const assignmentMatch = 
              assignmentFilter === 'all' ? true :
              assignmentFilter === 'toMe' ? isToMe :
              assignmentFilter === 'byMe' ? isByMe : true;

        const typeMatch = 
              typeFilter === 'all' ? true :
              typeFilter === 'surat' ? !!task.suratId :
              typeFilter === 'internal' ? !task.suratId : true;

        if (assignmentMatch && typeMatch) {
            counts['Semua']++;
            if (counts[task.status as keyof typeof counts] !== undefined) {
                counts[task.status as keyof typeof counts]++;
            }
        }
    });

    return counts;
  }, [allTasks, assignmentFilter, typeFilter, actingJabatanProfile]);

  return {
      allTasks,       // Raw data (jarang dipakai langsung di UI, tapi berguna untuk debug)
      filteredTasks,  // Data yang sudah disaring untuk ditampilkan
      taskCounts,     // Statistik untuk badge tab
      isLoading,
      error
  };
};