// Lokasi: src/app/dashboard/tugas/components/TaskDetailModal.tsx
// Status: FINAL SSOT (Fixed)
// Deskripsi: Menggunakan useTugasActions untuk interaksi granular (checklist, komentar, file).
// [FIX ERROR] Menghapus '...doc.data()' yang menyebabkan error build.
// [FIX IMPORT] Memastikan path relatif import benar (4 level ke atas untuk mencapai src/).

"use client";

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUserAuth } from '../../../../context/AuthContext'; // Path relatif ke src/context
import { Tugas, TugasKomentar, UserProfile, SubTugas, Surat } from '@/types';
import { X, Trash2, Plus, MessageSquare, Link as LinkIcon, Mail, Loader2, Send } from 'lucide-react';
import { formatDateRelative } from '@/lib/utils';
import CachedPdfViewer from '../../surat/[id]/components/CachedPdfViewer'; // Path relatif
import { useTugasActions } from '../../hooks/useTugasActions'; // Path relatif ke src/app/dashboard/hooks

// Shadcn (Path relatif ke src/components)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Badge } from "../../../../components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "../../../../components/ui/command";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Progress } from "../../../../components/ui/progress";

// Modal Surat (Sub-komponen)
const SuratViewerModal = ({ isOpen, onClose, suratData }: { isOpen: boolean, onClose: () => void, suratData: Surat | null }) => {
    if (!isOpen || !suratData) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-4xl h-[90vh] bg-card border-border flex flex-col p-0 gap-0">
                <DialogHeader className="flex-shrink-0 p-4 border-b border-border"><DialogTitle>{suratData.perihal}</DialogTitle></DialogHeader>
                <div className="flex-1 p-2 overflow-hidden"><CachedPdfViewer fileUrl={suratData.fileUrl} fileName={suratData.fileName} /></div>
            </DialogContent>
        </Dialog>
    );
};

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tugas: Tugas | null;
  userCache: Map<string, UserProfile>;
}

export default function TaskDetailModal({ isOpen, onClose, tugas, userCache }: TaskDetailModalProps) {
  const { userProfile, jabatanProfile } = useUserAuth();
  
  // Mengambil fungsi dari hook
  const { 
    addSubTask, toggleSubTask, removeSubTask, 
    addCollaborator, removeCollaborator, 
    addComment, addAttachment 
  } = useTugasActions();
  
  const [komentar, setKomentar] = useState('');
  const [daftarKomentar, setDaftarKomentar] = useState<TugasKomentar[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [newSubTaskText, setNewSubTaskText] = useState('');
  
  // Kolaborator Search
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [collaboratorResults, setCollaboratorResults] = useState<UserProfile[]>([]);
  const [collaboratorPopoverOpen, setCollaboratorPopoverOpen] = useState(false);

  const [isSuratViewerOpen, setIsSuratViewerOpen] = useState(false);
  const [suratTerkait, setSuratTerkait] = useState<Surat | null>(null);
  
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  // Subscribe Komentar
  useEffect(() => {
    if (!tugas?.id) return;
    const q = query(collection(db, 'komentarTugas'), where('tugasId', '==', tugas.id), orderBy('timestamp', 'asc'));
    
    // [FIX UTAMA] Menghapus referensi 'doc' yang salah
    const unsub = onSnapshot(q, (snap) => {
        setDaftarKomentar(snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data() 
        } as TugasKomentar)));
    });

    return () => unsub();
  }, [tugas]);

  // Search Kolaborator (Effect untuk pencarian lokal via userCache)
  useEffect(() => {
      if (!collaboratorSearch || !jabatanProfile) { setCollaboratorResults([]); return; }
      const lower = collaboratorSearch.toLowerCase();
      const results: UserProfile[] = [];
      userCache.forEach(u => {
          if (u.opdId === jabatanProfile.opdId && u.namaLengkap.toLowerCase().includes(lower)) {
              results.push(u);
          }
      });
      setCollaboratorResults(results.slice(0, 5));
  }, [collaboratorSearch, userCache, jabatanProfile]);

  const handleOpenSuratViewer = async () => {
    if (!tugas?.suratId) return;
    const snap = await getDoc(doc(db, 'surat', tugas.suratId));
    if (snap.exists()) { setSuratTerkait({ id: snap.id, ...snap.data() } as Surat); setIsSuratViewerOpen(true); }
  };

  const handleAddSubTask = async () => {
      if (!newSubTaskText.trim() || !tugas?.id) return;
      await addSubTask(tugas.id, { id: Date.now().toString(), teks: newSubTaskText, selesai: false });
      setNewSubTaskText(''); 
  };

  const handleToggleSubTask = async (subTaskId: string) => {
      if (!tugas?.id || !tugas.subTugas) return;
      await toggleSubTask(tugas.id, tugas.subTugas, subTaskId);
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

  const handleKomentarSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tugas?.id || !komentar.trim()) return;
      await addComment(tugas.id, komentar);
      setKomentar('');
  };

  const handleFileUpload = async () => {
    if (!file || !tugas?.id) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `lampiranTugas/${tugas.id}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);
      await addAttachment(tugas.id, { name: file.name, url, uploadedAt: Timestamp.now(), type: 'file' });
      setFile(null);
    } finally { setIsUploading(false); }
  };

  const handleAddLink = async () => {
      if (!tugas?.id || !linkUrl) return;
      await addAttachment(tugas.id, { name: linkName || linkUrl, url: linkUrl, uploadedAt: Timestamp.now(), type: 'link' });
      setShowLinkForm(false); setLinkUrl(''); setLinkName('');
  };

  if (!tugas) return null;
  
  const assigner = userCache.get(tugas.dariJabatanId);
  const assignee = userCache.get(tugas.kepadaJabatanId);
  const progress = tugas.subTugas && tugas.subTugas.length > 0 
    ? Math.round((tugas.subTugas.filter(s => s.selesai).length / tugas.subTugas.length) * 100) 
    : 0;

  const canManageTeam = userProfile?.jabatanId === tugas.dariJabatanId || userProfile?.jabatanId === tugas.kepadaJabatanId;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-3xl bg-card border-border flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="flex-shrink-0 p-4 border-b border-border">
             <div className="flex justify-between items-center">
                 <DialogTitle className="truncate pr-4">{tugas.judulTugas}</DialogTitle>
                 <div className="flex gap-2">
                    {tugas.suratId && <Button size="icon" variant="ghost" onClick={handleOpenSuratViewer}><Mail size={20}/></Button>}
                    <DialogClose asChild><Button size="icon" variant="ghost"><X size={20}/></Button></DialogClose>
                 </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
               {/* Info Dasar */}
               <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><Label className="text-muted-foreground">Dari</Label><p className="font-medium">{assigner?.namaLengkap || '...'}</p></div>
                  <div><Label className="text-muted-foreground">Kepada</Label><p className="font-medium">{assignee?.namaLengkap || '...'}</p></div>
                  <div className="col-span-2"><Label className="text-muted-foreground">Deskripsi</Label><p className="whitespace-pre-wrap">{tugas.deskripsi}</p></div>
               </div>

               {/* Kolaborator */}
               {canManageTeam && (
                 <div>
                   <Label className="mb-2 block">Kolaborator</Label>
                   <div className="flex flex-wrap gap-2 mb-2">
                      {tugas.collaboratorIds?.map(id => {
                        const user = userCache.get(id);
                        return user ? (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {user.namaLengkap}
                            <button onClick={() => handleRemoveCollaborator(id)}><X size={12} /></button>
                          </Badge>
                        ) : null;
                      })}
                      <Popover open={collaboratorPopoverOpen} onOpenChange={setCollaboratorPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs"><Plus size={12} className="mr-1" /> Tambah</Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[250px]">
                          <Command>
                            <CommandInput placeholder="Cari bawahan..." value={collaboratorSearch} onValueChange={setCollaboratorSearch} />
                            <CommandList>
                              {collaboratorResults.length === 0 ? <CommandEmpty>Tidak ditemukan</CommandEmpty> : 
                                collaboratorResults.map(u => (
                                  <CommandItem key={u.uid} onSelect={() => { handleAddCollaborator(u.jabatanId); }}>
                                    {u.namaLengkap}
                                  </CommandItem>
                                ))
                              }
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                   </div>
                 </div>
               )}

               {/* Sub Tugas */}
               <div>
                  <Label className="flex justify-between mb-2">Checklist <span className="text-muted-foreground">{progress}%</span></Label>
                  <Progress value={progress} className="h-2 mb-3"/>
                  <div className="space-y-2">
                      {tugas.subTugas?.map(st => (
                          <div key={st.id} className="flex items-center gap-3 group">
                              <Checkbox checked={st.selesai} onCheckedChange={() => handleToggleSubTask(st.id)}/>
                              <span className={`flex-1 text-sm ${st.selesai ? 'line-through text-muted-foreground' : ''}`}>{st.teks}</span>
                              <button onClick={() => handleDeleteSubTask(st)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={14}/></button>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                      <Input value={newSubTaskText} onChange={e => setNewSubTaskText(e.target.value)} placeholder="Tambah item..." className="h-8 text-sm"/>
                      <Button size="sm" onClick={handleAddSubTask} disabled={!newSubTaskText.trim()}><Plus size={14}/></Button>
                  </div>
               </div>

               {/* Lampiran */}
               <div>
                   <Label className="mb-2 block">Lampiran</Label>
                   <div className="flex flex-wrap gap-2 mb-2">
                       {tugas.lampiran?.map((l, i) => (
                           <Button key={i} variant="outline" size="sm" asChild>
                               <a href={l.url} target="_blank" className="gap-2"><LinkIcon size={12}/> {l.name}</a>
                           </Button>
                       ))}
                   </div>
                   {!showLinkForm ? (
                       <div className="flex gap-2">
                           <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="h-8 text-xs"/>
                           {file && <Button size="sm" onClick={handleFileUpload} disabled={isUploading}>{isUploading ? <Loader2 className="animate-spin"/> : 'Upload'}</Button>}
                           <Button size="sm" variant="ghost" onClick={() => setShowLinkForm(true)}>Link</Button>
                       </div>
                   ) : (
                       <div className="flex gap-2 items-center">
                           <Input placeholder="URL..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="h-8 text-xs"/>
                           <Input placeholder="Nama..." value={linkName} onChange={e => setLinkName(e.target.value)} className="h-8 text-xs w-24"/>
                           <Button size="sm" onClick={handleAddLink}>OK</Button>
                           <Button size="sm" variant="ghost" onClick={() => setShowLinkForm(false)}><X size={14}/></Button>
                       </div>
                   )}
               </div>

               {/* Komentar */}
               <div>
                   <Label className="mb-2 block">Komentar</Label>
                   <div className="bg-muted rounded-lg p-3 h-48 overflow-y-auto space-y-3 mb-3">
                       {daftarKomentar.map(k => (
                           <div key={k.id} className="text-sm">
                               <p className="font-bold text-xs">{k.userName} <span className="text-muted-foreground font-normal">{formatDateRelative(k.timestamp)}</span></p>
                               <p>{k.komentar}</p>
                           </div>
                       ))}
                   </div>
                   <form onSubmit={handleKomentarSubmit} className="flex gap-2">
                       <Input value={komentar} onChange={e => setKomentar(e.target.value)} placeholder="Tulis komentar..." className="flex-1"/>
                       <Button type="submit" size="icon"><Send size={16}/></Button>
                   </form>
               </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <SuratViewerModal isOpen={isSuratViewerOpen} onClose={() => setIsSuratViewerOpen(false)} suratData={suratTerkait} />
    </>
  );
}