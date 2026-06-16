/**
 * Directory: src/app/dashboard/hooks/useTalentData.ts
 * History Update:
 * - 2024-11-28: Integrated 'riwayat_diklat' and 'riwayat_penghargaan' into talent data fetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, RiwayatDiklat, RiwayatPenghargaan } from '@/types'; // Import tipe baru
import { useUserAuth } from '@/context/AuthContext';

export interface TalentAssessment {
  id?: string;
  userId: string;
  userNama: string;
  userNip: string;
  userJabatan: string;
  opdId: string;
  tahun: number;
  nilaiKinerja: number;
  nilaiPotensi: number;
  boxPosition: number;
  catatan: string;
  rekomendasiJabatan?: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// Interface Gabungan Lengkap
export interface TalentDataCombined {
    user: UserProfile;
    assessment?: TalentAssessment;
    hasAssessment: boolean;
    diklat: RiwayatDiklat[];
    penghargaan: RiwayatPenghargaan[];
}

export const calculateNineBox = (kinerja: number, potensi: number): number => {
  let x = 1; 
  let y = 1;

  if (kinerja > 90) x = 3;
  else if (kinerja >= 70) x = 2;

  if (potensi > 90) y = 3;
  else if (potensi >= 70) y = 2;

  if (y === 1) return x; 
  if (y === 2) return x + 3; 
  if (y === 3) return x + 6; 
  
  return 5; 
};

export const getBoxLabel = (box: number) => {
    switch(box) {
        case 1: return { label: "1. Iceberg / Risk", color: "bg-red-100 text-red-800 border-red-300", desc: "Kinerja rendah, potensi rendah. Perlu pembinaan tegas atau mutasi." };
        case 2: return { label: "2. Backstrom", color: "bg-orange-100 text-orange-800 border-orange-300", desc: "Kinerja sedang, potensi rendah. Perlu target yang lebih jelas." };
        case 3: return { label: "3. Workhorse", color: "bg-yellow-100 text-yellow-800 border-yellow-300", desc: "Kinerja tinggi, potensi rendah. Ahli di posisinya, pertahankan." };
        case 4: return { label: "4. Inconsistent", color: "bg-orange-100 text-orange-800 border-orange-300", desc: "Potensi sedang, kinerja rendah. Cari akar masalah kinerja." };
        case 5: return { label: "5. Core Employee", color: "bg-blue-100 text-blue-800 border-blue-300", desc: "Kinerja dan potensi seimbang. Tulang punggung organisasi." };
        case 6: return { label: "6. High Performer", color: "bg-green-100 text-green-800 border-green-300", desc: "Kinerja tinggi, potensi sedang. Siap tantangan baru di level sama." };
        case 7: return { label: "7. Potential Gem", color: "bg-yellow-100 text-yellow-800 border-yellow-300", desc: "Potensi tinggi, kinerja rendah. Mungkin salah penempatan." };
        case 8: return { label: "8. High Potential", color: "bg-green-100 text-green-800 border-green-300", desc: "Calon pemimpin masa depan. Beri mentoring intensif." };
        case 9: return { label: "9. STAR", color: "bg-purple-100 text-purple-800 border-purple-300", desc: "Kinerja dan potensi puncak. Siap promosi segera." };
        default: return { label: "Uncategorized", color: "bg-gray-100", desc: "-" };
    }
}

const getOpdHierarchyIds = async (rootOpdId: string) => {
    const ids = [rootOpdId];
    const q = query(collection(db, 'opd'), where('idOpdInduk', '==', rootOpdId));
    const snap = await getDocs(q);
    snap.forEach(doc => ids.push(doc.id));
    return ids;
}

export const useTalentData = () => {
  const { userProfile } = useUserAuth();
  const queryClient = useQueryClient();

  const opdId = userProfile?.opdId;
  const role = userProfile?.role;

  // 1. Fetch Users
  const fetchUsers = async () => {
    if (!role) return [];
    let userQuery;
    if (role === 'super_admin') {
        userQuery = query(collection(db, 'users'), where('status', '==', 'aktif'));
    } else if (opdId) {
        const targetOpdIds = await getOpdHierarchyIds(opdId);
        userQuery = query(collection(db, 'users'), where('opdId', 'in', targetOpdIds.slice(0, 10)), where('status', '==', 'aktif'));
    } else {
        return [];
    }
    const snap = await getDocs(userQuery);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
  };

  // 2. Fetch Assessments
  const fetchAssessments = async () => {
    const currentYear = new Date().getFullYear();
    let assessQuery;
    if (role === 'super_admin') {
         assessQuery = query(collection(db, 'talent_assessments'), where('tahun', '==', currentYear));
    } else if (opdId) {
        const targetOpdIds = await getOpdHierarchyIds(opdId);
        assessQuery = query(collection(db, 'talent_assessments'), where('opdId', 'in', targetOpdIds.slice(0, 10)), where('tahun', '==', currentYear));
    } else {
        return [];
    }
    const snap = await getDocs(assessQuery);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TalentAssessment));
  };

  // [NEW] 3. Fetch Diklat (Real Data)
  const fetchDiklatGlobal = async () => {
    let q;
    if (role === 'super_admin') {
        q = query(collection(db, 'riwayat_diklat'));
    } else if (opdId) {
        const targetOpdIds = await getOpdHierarchyIds(opdId);
        q = query(collection(db, 'riwayat_diklat'), where('opdId', 'in', targetOpdIds.slice(0, 10)));
    } else {
        return [];
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RiwayatDiklat));
  };

  // [NEW] 4. Fetch Penghargaan (Real Data)
  const fetchPenghargaanGlobal = async () => {
    let q;
    if (role === 'super_admin') {
        q = query(collection(db, 'riwayat_penghargaan'));
    } else if (opdId) {
        const targetOpdIds = await getOpdHierarchyIds(opdId);
        q = query(collection(db, 'riwayat_penghargaan'), where('opdId', 'in', targetOpdIds.slice(0, 10)));
    } else {
        return [];
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RiwayatPenghargaan));
  };

  const { data: employees = [], isLoading: usersLoading } = useQuery({ queryKey: ['talent_users', role, opdId], queryFn: fetchUsers, enabled: !!role && (role === 'super_admin' || !!opdId) });
  const { data: assessments = [], isLoading: assessLoading } = useQuery({ queryKey: ['talent_assessments', role, opdId], queryFn: fetchAssessments, enabled: !!role && (role === 'super_admin' || !!opdId) });
  
  // [NEW] Query Hooks
  const { data: allDiklat = [], isLoading: diklatLoading } = useQuery({ queryKey: ['talent_diklat_global', role, opdId], queryFn: fetchDiklatGlobal, enabled: !!role && (role === 'super_admin' || !!opdId) });
  const { data: allPenghargaan = [], isLoading: penghargaanLoading } = useQuery({ queryKey: ['talent_penghargaan_global', role, opdId], queryFn: fetchPenghargaanGlobal, enabled: !!role && (role === 'super_admin' || !!opdId) });

  // Menggabungkan semua data
  const combinedData: TalentDataCombined[] = employees.map(user => {
      const assessment = assessments.find(a => a.userId === user.uid);
      const userDiklat = allDiklat.filter(d => d.userId === user.uid);
      const userPenghargaan = allPenghargaan.filter(p => p.userId === user.uid);

      return {
          user,
          assessment,
          hasAssessment: !!assessment,
          diklat: userDiklat,
          penghargaan: userPenghargaan
      };
  });

  const saveMutation = useMutation({
      mutationFn: async (data: TalentAssessment) => {
          const docId = `${data.userId}_${data.tahun}`;
          await setDoc(doc(db, 'talent_assessments', docId), {
              ...data,
              boxPosition: calculateNineBox(data.nilaiKinerja, data.nilaiPotensi)
          }, { merge: true });
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['talent_assessments'] });
      }
  });

  return {
      combinedData,
      isLoading: usersLoading || assessLoading || diklatLoading || penghargaanLoading,
      saveAssessment: saveMutation.mutateAsync,
      isSaving: saveMutation.isPending
  };
};