/**
 * Directory: src/app/dashboard/hooks/useMasterData.ts
 * Status: ULTIMATE OPTIMIZED (1 READ PER OPD)
 * Deskripsi: Menggunakan pola Master Data Document.
 */

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Jabatan, OPD } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { useCallback, useMemo } from 'react';

// Fetch Global OPD (Jarang berubah)
const fetchOpdList = async (): Promise<OPD[]> => {
  const q = query(collection(db, 'opd'), orderBy('namaOpd', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OPD));
};

// FETCH SUPER EFISIEN: 1 Read untuk seluruh pegawai OPD!
const fetchOpdMasterDocument = async (opdId: string) => {
    const docRef = doc(db, 'opdMasterData', opdId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
        // Berhasil mendapatkan 1 dokumen agregasi dari backend
        const data = snap.data();
        return {
            users: data.users as UserProfile[],
            jabatans: data.jabatans as Jabatan[]
        };
    } else {
        // FALLBACK: Jika backend belum membuat dokumen, fallback ke query normal
        console.warn("Master Document belum siap, menggunakan Fallback Query...");
        const [usersSnap, jabatansSnap] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('opdId', '==', opdId))),
            getDocs(query(collection(db, 'jabatan'), where('opdId', '==', opdId)))
        ]);
        return {
            users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)),
            jabatans: jabatansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jabatan))
        };
    }
};

export const useMasterData = (enabled: boolean = true, overrideOpdId?: string | null) => {
  const { userProfile } = useUserAuth();

  // [FASE A EKSEKUSI] PENYESUAIAN LOGIKA targetOpdId
  // Mengizinkan admin_opd menggunakan overrideOpdId (misal: melihat Sub-OPD nya)
  // Jika filter 'Semua', fallback kembali ke OPD miliknya agar query tetap valid.
  let targetOpdId = userProfile?.opdId;
  
  if ((userProfile?.role === 'super_admin' || userProfile?.role === 'admin_opd') && overrideOpdId && overrideOpdId !== 'Semua') {
      targetOpdId = overrideOpdId;
  }

  // 1. Query OPD List (Global)
  const { data: opdList = [], isLoading: loadingOpd } = useQuery({
    queryKey: ['master', 'opd'],
    queryFn: fetchOpdList,
    staleTime: 1000 * 60 * 60 * 24, 
    enabled: enabled,
  });

  // 2. Query Data Kepegawaian (1 READ Document Pattern)
  const { data: opdMaster, isLoading: loadingMaster } = useQuery({
      queryKey: ['master', 'opdData', targetOpdId],
      queryFn: () => fetchOpdMasterDocument(targetOpdId!),
      enabled: enabled && !!targetOpdId,
      staleTime: 1000 * 60 * 60, // 1 Jam cache
  });

  const users = opdMaster?.users || [];
  const jabatans = opdMaster?.jabatans || [];

  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach(u => { if (u.jabatanId) map.set(u.jabatanId, u); });
    return map;
  }, [users]);

  const jabatanMap = useMemo(() => {
    const map = new Map<string, Jabatan>();
    jabatans.forEach(j => { if (j.id) map.set(j.id, j); });
    return map;
  }, [jabatans]);

  const getUserNameByJabatanId = useCallback((jabatanId: string) => {
    return userMap.get(jabatanId)?.namaLengkap || 'N/A';
  }, [userMap]); 

  const getJabatanNameById = useCallback((jabatanId: string) => {
    return jabatanMap.get(jabatanId)?.namaJabatan || 'N/A';
  }, [jabatanMap]);

  return {
    userMap,
    jabatanMap,
    opdList,
    usersList: users,     
    jabatansList: jabatans, 
    isLoading: loadingOpd || loadingMaster,
    error: null, 
    getUserNameByJabatanId,
    getJabatanNameById
  };
};