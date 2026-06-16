/**
 * Directory: src/app/dashboard/tugas/page.tsx
 * Status: FINAL SSOT
 * Deskripsi: Halaman Manajemen Tugas (Pusat Komando).
 * Menggunakan Hooks: useTugasData (Read), useTugasActions (Write), useMasterData (Cache).
 */

"use client";

import React, { useState, useMemo } from 'react';
import { useUserAuth } from '@/context/AuthContext'; 
import { useToast } from '@/context/ToastContext'; 
import { Tugas } from '@/types'; 
import FormTugas from './components/FormTugas';
import TaskDetailModal from './components/TaskDetailModal';
import { Plus, Filter, HelpCircle, ClipboardCheck, BookOpen, ListChecks } from 'lucide-react';
import TaskList from './components/TaskList';
import ConfirmModal from '../components/ConfirmModal'; 
import { SkeletonCard } from '../components/skeletons/SkeletonCard'; 
import Link from 'next/link';

// Hooks SSOT
import { useTugasData, TaskStatusFilter, TaskAssignmentFilter, TaskTypeFilter } from '@/app/dashboard/hooks/useTugasData';
import { useTugasActions } from '@/app/dashboard/hooks/useTugasActions';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';

// UI Components
import { Button } from "@/components/ui/button"; 
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"; 
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"; 
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"; 
import { Label } from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Komponen Modal Bantuan ---
const BantuanHalamanModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <HelpCircle className="mr-3 text-blue-600" />
                        Bantuan: Pusat Komando Tugas
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    <div className="space-y-4 text-foreground/90 pr-4">
                        <h3 className="font-semibold text-lg">Apa Kegunaan Menu Ini?</h3>
                        <p>Pusat Komando Tugas adalah tempat Anda mengelola seluruh pekerjaan, baik yang Anda terima dari atasan maupun yang Anda delegasikan ke tim.</p>
                        {/* ... Konten bantuan lainnya ... */}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Saya Mengerti</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ShortcutNav = () => (
    <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-muted-foreground">Akses Cepat:</span>
        <Button asChild variant="secondary" size="sm" className="rounded-full">
          <Link href="/dashboard/checklist"><ListChecks size={14} /> Checklist</Link>
        </Button>
         <Button asChild variant="secondary" size="sm" className="rounded-full">
          <Link href="/dashboard/logbook"><BookOpen size={14} /> Logbook</Link>
        </Button>
    </div>
);

export default function TugasSayaPage() {
  const { userProfile, loading: authLoading } = useUserAuth();
  const { addToast } = useToast();

  // 1. State Filter
  const [activeStatusTab, setActiveStatusTab] = useState<TaskStatusFilter>('Baru');
  const [assignmentFilter, setAssignmentFilter] = useState<TaskAssignmentFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>('all');

  // 2. State UI Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isBantuanOpen, setIsBantuanOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Tugas | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isProcessing?: boolean; }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isProcessing: false });

  // 3. Hooks SSOT
  // Fetch Data Tugas
  const { filteredTasks, taskCounts, isLoading: isTasksLoading } = useTugasData({
      statusFilter: activeStatusTab,
      assignmentFilter,
      typeFilter
  });
  
  // Actions (Update/Delete)
  const { updateTaskStatus, deleteTask, isProcessing: isActionProcessing } = useTugasActions();

  // Data Master (User Cache)
  const { userMap, isLoading: isCacheLoading } = useMasterData(true);

  // --- Handlers ---

  const handleStatusChange = async (tugasId: string, newStatus: Tugas['status']) => {
    const task = filteredTasks.find(t => t.id === tugasId);
    if (!task) return;

    const executeChange = async () => {
        const success = await updateTaskStatus(task, newStatus);
        if (success) setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    if (newStatus === 'Selesai') {
        setConfirmModal({
            isOpen: true, 
            title: 'Konfirmasi Selesai', 
            message: 'Apakah Anda yakin ingin menyelesaikan tugas ini?', 
            onConfirm: executeChange,
            isProcessing: isActionProcessing
        });
    } else {
        executeChange();
    }
  };

  const handleDeleteTask = (task: Tugas) => {
    setConfirmModal({
        isOpen: true, 
        title: "Hapus Tugas", 
        message: `Apakah Anda yakin ingin menghapus tugas "${task.judulTugas}"?`, 
        onConfirm: async () => {
            await deleteTask(task);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
        isProcessing: isActionProcessing
    });
  }

  const isLoading = authLoading || isTasksLoading || isCacheLoading;

  // Skeleton UI
  const renderSkeleton = () => (
      <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
  );

  return (
    <div className="animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
         <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Pusat Komando Tugas</h1>
              <Button variant="ghost" size="icon" onClick={() => setIsBantuanOpen(true)} title="Bantuan" className="text-muted-foreground hover:text-primary">
                  <HelpCircle size={20} />
              </Button>
            </div>
            <div className="mt-4">
                <ShortcutNav />
            </div>
         </div>
        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
           <Button variant="outline" onClick={() => setIsFilterModalOpen(true)} className="md:hidden">
              <Filter size={16} className="mr-2"/> Filter
           </Button>
          <Button onClick={() => setIsFormModalOpen(true)} className="w-full md:w-auto">
            <Plus size={16} className="mr-2" /> Tugas Baru
          </Button>
        </div>
      </div>
      
      {/* Filter Desktop */}
      <div className="hidden md:flex p-4 bg-card rounded-xl border border-border shadow-sm mb-6 items-center gap-4">
        <div className="text-sm font-semibold">Tampilkan:</div>
        <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Penugasan</SelectItem>
            <SelectItem value="toMe">Tugas Untuk Saya</SelectItem>
            <SelectItem value="byMe">Tugas Dari Saya</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="surat">Terkait Surat</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs Status */}
      <Tabs value={activeStatusTab} onValueChange={(v) => setActiveStatusTab(v as TaskStatusFilter)} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted">
            <TabsTrigger value="Baru">Baru ({taskCounts['Baru']})</TabsTrigger>
            <TabsTrigger value="Dikerjakan">Dikerjakan ({taskCounts['Dikerjakan']})</TabsTrigger>
            <TabsTrigger value="Selesai">Selesai ({taskCounts['Selesai']})</TabsTrigger>
            <TabsTrigger value="Semua">Semua ({taskCounts['Semua']})</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
            {isLoading ? renderSkeleton() : (
              <TaskList 
                  tugasList={filteredTasks} 
                  onOpenDetail={setSelectedTask} 
                  onStatusChange={handleStatusChange} 
                  onDeleteTask={handleDeleteTask}
                  userCache={userMap} 
              />
            )}
        </div>
      </Tabs>
      
      {/* Modals */}
      <FormTugas 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
        onSuccess={(newId) => { 
            addToast("Tugas baru berhasil dibuat!", "success");
            // Tidak perlu refresh manual, useTugasData realtime akan update
        }} 
        userCache={userMap} 
      />
      
      <TaskDetailModal 
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
        tugas={selectedTask} 
        userCache={userMap} 
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false, isProcessing: false })} 
        onConfirm={confirmModal.onConfirm} 
        title={confirmModal.title} 
        message={confirmModal.message}
        isProcessing={confirmModal.isProcessing || isActionProcessing}
      />
      
      {/* Mobile Filter Dialog */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
            <DialogHeader>
                <DialogTitle>Filter Tugas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                  <Label>Tampilkan</Label>
                  <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Penugasan</SelectItem>
                      <SelectItem value="toMe">Tugas Untuk Saya</SelectItem>
                      <SelectItem value="byMe">Tugas Dari Saya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipe Tugas</Label>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="surat">Terkait Surat</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsFilterModalOpen(false)} className="w-full">Terapkan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <BantuanHalamanModal isOpen={isBantuanOpen} onClose={() => setIsBantuanOpen(false)} />
    </div>
  );
}