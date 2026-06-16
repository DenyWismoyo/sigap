// Lokasi: src/app/dashboard/ruang-kerja/components/InlineTugasKomentar.tsx
// [MODIFIKASI V3 - Disederhanakan]
// - Menghapus semua logika @ mention (Popover, Command, state, useEffect terkait).
// - Mengembalikan komponen ini ke fungsi dasarnya: menampilkan riwayat dan form balasan.
// - Ini untuk mengatasi keluhan pengguna tentang "hilang fokus" dan "auto search"
//   dan mengembalikan ke "penulisan normal".

"use client";

import React, { useState, FormEvent, useMemo, useEffect, useRef } from 'react';
import { TugasKomentar, UserProfile } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, formatDateRelative } from '@/lib/utils';
// Impor untuk @ mention Dihapus

interface InlineTugasKomentarProps {
  tugasId: string;
  userCache: Map<string, UserProfile>;
  onSuccess: () => void;
}

const InlineTugasKomentar = ({
  tugasId,
  userCache,
  onSuccess,
}: InlineTugasKomentarProps) => {
  
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth();
  const effectiveJabatan = useMemo(() => actingJabatanProfile || jabatanProfile, [actingJabatanProfile, jabatanProfile]);
  const { addToast } = useToast(); 
  
  const [komentarList, setKomentarList] = useState<TugasKomentar[]>([]);
  const [loadingKomentar, setLoadingKomentar] = useState(true);
  
  const [komentar, setKomentar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // State untuk @ mention Dihapus

  // 1. Ambil riwayat komentar
  useEffect(() => {
    setLoadingKomentar(true);
    const q = query(
      collection(db, 'komentarTugas'), 
      where('tugasId', '==', tugasId), 
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setKomentarList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TugasKomentar)));
      setLoadingKomentar(false);
      
      // Auto-scroll ke bawah saat komentar baru masuk
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
      
    }, (err) => {
      console.error("Gagal fetch komentar:", err);
      setError("Gagal memuat riwayat komentar.");
      setLoadingKomentar(false);
    });

    return () => unsubscribe();
  }, [tugasId]);

  // 2. Logika kirim komentar
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!komentar.trim() || !userProfile || !effectiveJabatan) {
      setError("Sesi tidak valid atau komentar kosong.");
      return;
    }
    
    setLoading(true);

    try {
      await addDoc(collection(db, 'komentarTugas'), {
        tugasId: tugasId,
        userId: userProfile.uid,
        userName: userProfile.namaLengkap,
        userJabatan: effectiveJabatan.namaJabatan,
        komentar: komentar,
        timestamp: Timestamp.now(),
      } as Omit<TugasKomentar, 'id'>);
      
      setKomentar('');
    } catch (err: any) {
      console.error("Gagal mengirim komentar cepat:", err);
      setError(err.message || "Gagal mengirim komentar.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Logika untuk @ Mention Dihapus

  return (
    <div className="space-y-4">
      {/* 1. Tampilkan Riwayat Komentar */}
      <ScrollArea className="h-48 pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {loadingKomentar && (
            <p className="text-sm text-muted-foreground text-center">Memuat riwayat...</p>
          )}
          {!loadingKomentar && komentarList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">Belum ada komentar.</p>
          )}
          {komentarList.map(k => {
            const user = k.userId ? Array.from(userCache.values()).find(u => u.uid === k.userId) : null;
            const initials = getInitials(k.userName);
            const isMe = user?.uid === userProfile?.uid;
            
            return (
              <div key={k.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className={`flex-1 rounded-lg px-3 py-2 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className={`text-sm font-semibold ${isMe ? 'text-primary-foreground' : 'text-foreground'}`}>{k.userName}</p>
                  <p className={`text-sm whitespace-pre-wrap ${isMe ? 'text-primary-foreground/90' : 'text-foreground/90'}`}>{k.komentar}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{formatDateRelative(k.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* 2. Tampilkan Form Balasan (tanpa Popover) */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={komentar}
          onChange={(e) => setKomentar(e.target.value)} // Menggunakan handler standar
          placeholder="Tulis balasan komentar..."
          className="mt-1"
          rows={3}
          disabled={loading}
          autoFocus
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-between items-center">
          <Button type="button" variant="ghost" size="sm" onClick={onSuccess}>
            Tutup
          </Button>
          <Button type="submit" disabled={loading || !komentar.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kirim
          </Button>
        </div>
      </form>
    </div>
  );
}

export default InlineTugasKomentar;