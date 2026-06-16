// Lokasi File: src/app/dashboard/hooks/useUserSummaries.ts
// Status: 100% EFFICIENT (SINGLE READ SSOT)
// Deskripsi: Menghapus total hybrid fetching.
// Menggunakan dokumen 'userSummaries/{uid}' lalu meminjam memori cache surat.

"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, Timestamp,
  getDocs, documentId, onSnapshot, doc
} from 'firebase/firestore';
import { ActionableSuratItem, Disposisi, Surat, Tugas, WelcomeSummary } from '@/types';

// --- Hook 1: Mengambil Surat & Disposisi ---
export const useUserSuratSummary = (effectiveJabatanId?: string, cachedSuratList: Surat[] = []) => {
  const [actionableItems, setActionableItems] = useState<ActionableSuratItem[]>([]);
  const [welcomeSummary, setWelcomeSummary] = useState<WelcomeSummary>({
      disposisiBaru: 0,
      tindakLanjutMenunggu: 0,
      suratMenungguDisposisi: 0,
      tugasAktif: 0,
      tugasLewatBatasWaktu: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const suratListRef = useRef(cachedSuratList);
  useEffect(() => {
      suratListRef.current = cachedSuratList;
  }, [cachedSuratList]);

  useEffect(() => {
    if (!effectiveJabatanId) {
      setIsLoading(false);
      setActionableItems([]); 
      return;
    }
    
    setIsLoading(true);
    setError(null); 

    // HANYA 1 READ: Listen ke dokumen userSummaries
    const unsub = onSnapshot(doc(db, 'userSummaries', effectiveJabatanId), async (docSnap) => {
        if (!docSnap.exists()) {
            setActionableItems([]);
            setIsLoading(false);
            return;
        }

        try {
            const data = docSnap.data();
            
            // 1. Set Angka Summary untuk Notifikasi Lonceng
            setWelcomeSummary(prev => ({
                ...prev,
                disposisiBaru: data.disposisiBaruCount || 0,
                tindakLanjutMenunggu: data.tindakLanjutCount || 0,
                suratMenungguDisposisi: data.suratMenungguDisposisi || 0,
            }));

            const pendingDisposisiMap = data.pendingDisposisi || {};
            const disposisiList = Object.values(pendingDisposisiMap) as (Disposisi & { needsAcknowledge: boolean })[];

            if (disposisiList.length === 0) {
                setActionableItems([]);
                setIsLoading(false);
                return;
            }

            // 2. Cross-reference Surat dengan cache memori (Mencegah Read Tambahan)
            const suratMap = new Map<string, Surat>();
            suratListRef.current.forEach(s => {
                if (s.id) suratMap.set(s.id, s);
            });

            const suratIdsToFetch = new Set<string>();
            disposisiList.forEach(d => {
                if (!suratMap.has(d.suratId)) suratIdsToFetch.add(d.suratId);
            });

            // 3. Fetch ONLY missing surat (Hanya jalan jika cache kosong)
            const missingSuratIds = Array.from(suratIdsToFetch);
            if (missingSuratIds.length > 0) {
                const chunks: string[][] = [];
                for (let i = 0; i < missingSuratIds.length; i += 30) chunks.push(missingSuratIds.slice(i, i + 30));

                for (const chunk of chunks) {
                    const suratQuery = query(collection(db, 'surat'), where(documentId(), 'in', chunk));
                    const suratSnapshot = await getDocs(suratQuery);
                    suratSnapshot.forEach(d => suratMap.set(d.id, { id: d.id, ...d.data() } as Surat));
                }
            }

            // 4. Rakit Actionable Items
            const items: ActionableSuratItem[] = [];
            const now = Timestamp.now();

            for (const disp of disposisiList) {
                const surat = suratMap.get(disp.suratId);
                if (surat && surat.statusPenyelesaian !== 'Selesai' && surat.statusPenyelesaian !== 'Diarsipkan') {
                    const needsAcknowledge = disp.needsAcknowledge;
                    const needsTindakLanjut = !needsAcknowledge;
                    const isOverdue = !!(disp.batasWaktu && disp.batasWaktu < now && !needsAcknowledge);

                    items.push({
                        surat,
                        disposisi: disp,
                        needsAcknowledge,
                        needsTindakLanjut,
                        isOverdue
                    });
                }
            }

            // 5. Urutkan: Perlu Tindakan Paling Atas
            items.sort((a, b) => {
                if (a.needsAcknowledge && !b.needsAcknowledge) return -1;
                if (!a.needsAcknowledge && b.needsAcknowledge) return 1;
                return b.disposisi.tanggalDisposisi.toMillis() - a.disposisi.tanggalDisposisi.toMillis();
            });

            setActionableItems(items);

        } catch (err: any) {
            console.error("Error memproses userSummaries:", err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, (err) => {
        console.error("Gagal mendengarkan userSummaries:", err);
        setError(err);
        setIsLoading(false);
    });

    return () => unsub();
  }, [effectiveJabatanId]);

  return { actionableItems, welcomeSummary, isLoading, error, mutate: () => {} };
};

// --- Hook 2: Mengambil Tugas ---
export const useUserTugasSummary = (effectiveJabatanId?: string) => {
  const [tugasItems, setTugasItems] = useState<Tugas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [tugasSummaryStats, setTugasSummaryStats] = useState({
      tugasAktif: 0,
      tugasLewatBatasWaktu: 0
  });

  useEffect(() => {
      if (!effectiveJabatanId) {
          setIsLoading(false);
          return;
      }

      setIsLoading(true);
      const unsub = onSnapshot(doc(db, 'userSummaries', effectiveJabatanId), (docSnap) => {
          if (!docSnap.exists()) {
              setTugasItems([]);
              setIsLoading(false);
              return;
          }

          const data = docSnap.data();
          const pendingTugasMap = data.pendingTugas || {};
          const items = Object.values(pendingTugasMap) as Tugas[];
          
          let aktifCount = 0;
          let overdueCount = 0;
          const now = new Date();

          items.forEach((item) => {
              aktifCount++;
              if (item.batasWaktu && item.batasWaktu.toDate() < now) {
                  overdueCount++;
              }
          });

          items.sort((a, b) => {
              const aOverdue = a.batasWaktu && a.batasWaktu.toDate() < now;
              const bOverdue = b.batasWaktu && b.batasWaktu.toDate() < now;
              if (aOverdue && !bOverdue) return -1;
              if (!aOverdue && bOverdue) return 1;
              return (a.batasWaktu?.toMillis() || 0) - (b.batasWaktu?.toMillis() || 0);
          });

          setTugasItems(items);
          setTugasSummaryStats({ tugasAktif: aktifCount, tugasLewatBatasWaktu: overdueCount });
          setIsLoading(false);
      }, (err) => {
          console.error("Error fetching tugas summary:", err);
          setError(err);
          setIsLoading(false);
      });

      return () => unsub();
  }, [effectiveJabatanId]);

  return { tugasItems, tugasSummaryStats, isLoading, error, mutate: () => {} };
};