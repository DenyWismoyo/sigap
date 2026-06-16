// Lokasi: src/app/dashboard/ruang-kerja/components/InlineTugasKomentarForm.tsx
// File baru ini dibuat untuk menangani "Komentar Cepat" pada kartu tugas.

"use client";

import React, { useState, FormEvent, useMemo } from 'react';
import { TugasKomentar } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InlineTugasKomentarFormProps {
  tugasId: string;
  onSuccess: () => void;
}

const InlineTugasKomentarForm = ({
  tugasId,
  onSuccess,
}: InlineTugasKomentarFormProps) => {
  
  const { userProfile, actingJabatanProfile, jabatanProfile } = useUserAuth();
  const effectiveJabatan = useMemo(() => actingJabatanProfile || jabatanProfile, [actingJabatanProfile, jabatanProfile]);
  const { addToast } = useToast(); 
  
  const [komentar, setKomentar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!komentar.trim()) {
      setError("Komentar tidak boleh kosong.");
      return;
    }
    if (!userProfile || !effectiveJabatan) {
      setError("Sesi pengguna tidak valid.");
      return;
    }
    
    setLoading(true);

    try {
      // Logika ini identik dengan yang ada di TaskDetailModal
      await addDoc(collection(db, 'komentarTugas'), {
        tugasId: tugasId,
        userId: userProfile.uid,
        userName: userProfile.namaLengkap,
        userJabatan: effectiveJabatan.namaJabatan,
        komentar: komentar,
        timestamp: Timestamp.now(),
      } as Omit<TugasKomentar, 'id'>);
      
      setKomentar('');
      addToast("Komentar berhasil dikirim.", "success");
      onSuccess(); // Menutup form

    } catch (err: any) {
      console.error("Gagal mengirim komentar cepat:", err);
      setError(err.message || "Gagal mengirim komentar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={komentar}
        onChange={(e) => setKomentar(e.target.value)}
        placeholder="Tulis komentar progres atau pertanyaan..."
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
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !komentar.trim()}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kirim Komentar
        </Button>
      </div>
    </form>
  );
}

export default InlineTugasKomentarForm;