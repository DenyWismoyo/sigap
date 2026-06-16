// Lokasi File: src/app/dashboard/ruang-kerja/components/QuickAddTask.tsx
// Status: FINAL SSOT
// Deskripsi: Menggunakan useTugasActions untuk membuat tugas mandiri.

"use client";

import React, { useState, FormEvent } from 'react';
import { UserProfile, Jabatan } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useTugasActions } from '@/app/dashboard/hooks/useTugasActions';

interface QuickAddTaskProps {
  userProfile: UserProfile;
  effectiveJabatan: Jabatan;
  userUid: string; 
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({ 
  userProfile, 
  effectiveJabatan,
}) => {
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { createNewTask, isProcessing } = useTugasActions();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !userProfile) return;

    const taskData = {
        judulTugas: title,
        deskripsi: "Tugas cepat dibuat dari Ruang Kerja.",
        kepadaJabatanId: effectiveJabatan.id!, // Mandiri: Untuk saya
        kepadaJabatanNama: userProfile.namaLengkap,
        collaboratorIds: [],
        kategoriTugas: 'Lainnya' as const,
        prioritas: 'Sedang' as const,
        batasWaktu: null,
        isDelegated: false,
    };

    // Tugas mandiri: Pemberi tugas = Saya (sebagai UserProfile)
    // Penerima = Saya
    const success = await createNewTask(taskData, userProfile, [userProfile]);
    
    if (success) {
        setNewTaskTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <Input 
        type="text" 
        placeholder="Ketik tugas mandiri baru (lalu Enter)..."
        value={newTaskTitle}
        onChange={(e) => setNewTaskTitle(e.target.value)}
        disabled={isProcessing}
        className="bg-card" 
      />
      <Button type="submit" disabled={isProcessing || !newTaskTitle.trim()}>
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        <span className="hidden sm:inline ml-2">Tambah</span>
      </Button>
    </form>
  );
};

export default QuickAddTask;