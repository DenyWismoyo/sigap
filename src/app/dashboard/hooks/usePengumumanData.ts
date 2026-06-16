/**
 * Directory: src/app/dashboard/hooks/usePengumumanData.ts
 * Deskripsi: Hook untuk mengambil Pengumuman aktif dengan caching.
 */

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Pengumuman } from '@/types';
import { useUserAuth } from '@/context/AuthContext';

const fetchPengumuman = async (opdId: string, role: string) => {
    const now = Timestamp.now();
    const q = query(
        collection(db, 'pengumuman'),
        where('tanggalSelesai', '>=', now.toDate())
    );
    
    const snap = await getDocs(q);
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pengumuman));

    // Filter manual di client karena query Firestore terbatas untuk logika OR kompleks
    return all.filter(p => {
        if (p.tanggalMulai.toMillis() > now.toMillis()) return false;
        
        if (p.target === 'Semua OPD') return true;
        if (p.opdId === opdId) return true;
        if (p.target === opdId) return true;
        
        const sharedIds = (p as any).sharedWithOpdIds as string[] | undefined;
        if (sharedIds && sharedIds.includes(opdId)) return true;
        
        if (role === 'super_admin') return true;
        
        return false;
    }).sort((a, b) => {
         if (a.penting !== b.penting) return (b.penting ? 1 : 0) - (a.penting ? 1 : 0);
         return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
};

export const usePengumumanData = () => {
    const { userProfile } = useUserAuth();

    const { data: announcements = [], isLoading } = useQuery({
        queryKey: ['pengumuman', userProfile?.opdId],
        queryFn: () => fetchPengumuman(userProfile!.opdId, userProfile!.role),
        enabled: !!userProfile?.opdId,
        staleTime: 1000 * 60 * 15, // Cache 15 menit
    });

    return { announcements, isLoading };
};