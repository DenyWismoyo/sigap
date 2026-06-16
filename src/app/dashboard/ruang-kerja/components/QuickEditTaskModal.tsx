// Lokasi File: src/app/dashboard/ruang-kerja/components/QuickEditTaskModal.tsx
// Status: FINAL SSOT
// Deskripsi: Menggunakan useTugasActions untuk semua update.
// [FIX TYPO] Mengubah 'setNewSubTugasText' menjadi 'setNewSubTaskText' agar sesuai dengan definisi useState.

"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Tugas, SubTugas, UserProfile, Jabatan } from '@/types';
import { useUserAuth } from '@/context/AuthContext'; 
import { useTugasActions } from '@/app/dashboard/hooks/useTugasActions'; // IMPORT HOOK
import { useBawahanList } from '@/app/dashboard/hooks/useBawahanList'; // IMPORT BAWAHAN HOOK

// Impor Shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from 'firebase/firestore';

interface QuickEditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tugas: Tugas | null;
  onSuccess: () => void; 
  userCache: Map<string, UserProfile>; 
  opdJabatans: Map<string, Jabatan>; 
}

const QuickEditTaskModal: React.FC<QuickEditTaskModalProps> = ({ 
  isOpen, onClose, tugas, onSuccess, userCache, opdJabatans 
}) => {
  
  const { userProfile } = useUserAuth();
  
  // --- SSOT HOOKS ---
  const { updateTaskDetail, addSubTask, toggleSubTask, removeSubTask, addCollaborator, removeCollaborator, isProcessing } = useTugasActions();
  const { bawahanList, isLoading: isStafLoading } = useBawahanList(userCache, opdJabatans);

  const [batasWaktu, setBatasWaktu] = useState<Date | undefined>(undefined);
  const [prioritas, setPrioritas] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');
  const [newSubTaskText, setNewSubTaskText] = useState('');
  
  // State Kolaborator
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [collaboratorPopoverOpen, setCollaboratorPopoverOpen] = useState(false);

  // Set initial state from props
  useEffect(() => {
    if (isOpen && tugas) {
      setBatasWaktu(tugas.batasWaktu ? tugas.batasWaktu.toDate() : undefined);
      setPrioritas(tugas.prioritas || 'Sedang');
      // [FIX TYPO] Gunakan setNewSubTaskText (bukan SubTugas)
      setNewSubTaskText('');
    }
  }, [isOpen, tugas]); 

  const canManageTeam = userProfile?.jabatanId === tugas?.dariJabatanId || userProfile?.jabatanId === tugas?.kepadaJabatanId;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!tugas?.id) return;
    
    const success = await updateTaskDetail(tugas.id, {
        batasWaktu: batasWaktu ? Timestamp.fromDate(batasWaktu) : null,
        prioritas: prioritas,
    });

    if (success) {
        onSuccess();
        onClose();
    }
  };

  // --- Handlers Granular menggunakan Hook ---
  
  const handleAddSubTask = async () => {
      if (!newSubTaskText.trim() || !tugas?.id) return;
      await addSubTask(tugas.id, { id: Date.now().toString(), teks: newSubTaskText, selesai: false });
      // [FIX TYPO] Gunakan setNewSubTaskText
      setNewSubTaskText('');
  };
  
  const handleToggleSubTask = async (id: string) => {
      if (!tugas?.id || !tugas.subTugas) return;
      await toggleSubTask(tugas.id, tugas.subTugas, id);
  };

  const handleDeleteSubTask = async (st: SubTugas) => {
      if (!tugas?.id) return;
      await removeSubTask(tugas.id, st);
  };

  const handleAddCollaborator = async (jabatanId: string) => {
      if (!tugas?.id) return;
      await addCollaborator(tugas.id, jabatanId);
      setCollaboratorPopoverOpen(false);
  };

  const handleRemoveCollaborator = async (jabatanId: string) => {
      if (!tugas?.id) return;
      await removeCollaborator(tugas.id, jabatanId);
  };

  if (!isOpen || !tugas) return null;

  // Helper untuk mencari user profile dari cache
  const getCollaboratorProfile = (id: string) => userCache.get(id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-card border-border p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle>Edit Cepat Tugas</DialogTitle>
          <DialogDescription className="truncate">{tugas.judulTugas}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sub Tugas */}
              <div className="space-y-4">
                <Label>Sub-Tugas / Checklist</Label>
                <ScrollArea className="rounded-md border p-3 h-60">
                  {tugas.subTugas?.map(st => (
                    <div key={st.id} className="flex items-center gap-3 py-1 group">
                      <Checkbox id={`qs-${st.id}`} checked={st.selesai} onCheckedChange={() => handleToggleSubTask(st.id)} />
                      <Label htmlFor={`qs-${st.id}`} className={`flex-1 ${st.selesai ? 'line-through text-muted-foreground' : ''}`}>{st.teks}</Label>
                      <Button type="button" onClick={() => handleDeleteSubTask(st)} variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><Trash2 size={14} className="text-red-500"/></Button>
                    </div>
                  ))}
                </ScrollArea>
                <div className="flex gap-2">
                    <Input value={newSubTaskText} onChange={e => setNewSubTaskText(e.target.value)} placeholder="Tambah item..." className="h-9 text-sm"/>
                    <Button type="button" onClick={handleAddSubTask} size="sm" variant="secondary" disabled={!newSubTaskText.trim()}><Plus size={16}/></Button>
                </div>
              </div>

              {/* Meta Data */}
              <div className="space-y-4">
                <div>
                  <Label>Prioritas</Label>
                  <Select value={prioritas} onValueChange={(v) => setPrioritas(v as any)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="Rendah">Rendah</SelectItem><SelectItem value="Sedang">Sedang</SelectItem><SelectItem value="Tinggi">Tinggi</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Batas Waktu</Label>
                  <DatePicker date={batasWaktu} setDate={setBatasWaktu} />
                </div>
                
                {canManageTeam && (
                  <div>
                    <Label>Kolaborator</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50 mt-1 min-h-[40px]">
                        {tugas.collaboratorIds?.map(id => {
                            const u = getCollaboratorProfile(id);
                            return u ? (
                                <Badge key={u.uid} variant="secondary" className="gap-1">{u.namaLengkap}<button type="button" onClick={() => handleRemoveCollaborator(u.jabatanId)}><X size={12}/></button></Badge>
                            ) : null;
                        })}
                        <Popover open={collaboratorPopoverOpen} onOpenChange={setCollaboratorPopoverOpen}>
                            <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs"><UserPlus size={14} className="mr-1"/> Tambah</Button></PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Cari bawahan..." />
                                    <CommandList>
                                        {isStafLoading ? <CommandEmpty>Memuat...</CommandEmpty> : bawahanList.map(u => (
                                            <CommandItem key={u.uid} onSelect={() => handleAddCollaborator(u.jabatanId)}>{u.namaLengkap}</CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t border-border flex-shrink-0 bg-muted/50">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Batal</Button>
            <Button type="submit" disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>} Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickEditTaskModal;