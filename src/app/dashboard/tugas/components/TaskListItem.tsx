// Lokasi: src/app/dashboard/tugas/components/TaskListItem.tsx
// [MODIFIKASI TUGAS 2]
// - Menambahkan Checkbox di sebelah kiri untuk aksi cepat (selesai/buka kembali).
// - Checkbox ini memanggil onStatusChange.
// [MODIFIKASI V9 - LOGIKA PJ]
// - Mengubah 'canMarkDone' agar HANYA 'isAssignee' (PJ) yang bisa.
// - Mengubah tombol "Selesaikan Tugas" agar HANYA 'isAssignee' (PJ) yang bisa.

"use client";

import React, { useMemo } from 'react';
import { Tugas, UserProfile } from '@/types';
import { useUserAuth } from '@/context/AuthContext';
import { Mail, UserCheck, ChevronDown, ChevronUp, Clock, AlertCircle, MessageSquare, Users, Repeat, Trash2, CheckCircle, GripVertical } from 'lucide-react';
import Link from 'next/link';

// Impor komponen Shadcn
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox"; // <-- Impor Checkbox

interface TaskListItemProps {
  tugas: Tugas;
  isExpanded: boolean;
  onToggleExpand: (tugasId: string) => void;
  onOpenDetail: (tugas: Tugas) => void;
  onStatusChange: (tugasId: string, newStatus: Tugas['status']) => void;
  onDeleteTask: (tugas: Tugas) => void;
  userCache: Map<string, UserProfile>;
}

// Helper styling (disesuaikan untuk <Badge>)
const getPriorityBadgeVariant = (priority: 'Tinggi' | 'Sedang' | 'Rendah'): "destructive" | "default" | "secondary" => {
    switch (priority) {
        case 'Tinggi': return 'destructive'; 
        case 'Sedang': return 'default'; 
        default: return 'secondary';
    }
};

// Helper deadline (tetap sama)
const getDeadlineInfo = (deadline: Date) => {
    const now = new Date(); now.setHours(0, 0, 0, 0); 
    const deadlineDate = new Date(deadline); deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Terlewat ${Math.abs(diffDays)} hari`, color: 'text-red-600 dark:text-red-400', icon: <AlertCircle size={14} /> };
    if (diffDays === 0) return { text: 'Hari Ini', color: 'text-yellow-600 dark:text-yellow-400', icon: <Clock size={14} /> };
    return { text: `Sisa ${diffDays} hari`, color: 'text-muted-foreground', icon: <Clock size={14} /> };
};

export default function TaskListItem({ tugas, isExpanded, onToggleExpand, onOpenDetail, onStatusChange, onDeleteTask, userCache }: TaskListItemProps) {
    const { actingJabatanProfile } = useUserAuth();

    const penanggungJawab = useMemo(() => userCache.get(tugas.kepadaJabatanId), [tugas.kepadaJabatanId, userCache]);
    const deadlineInfo = tugas.batasWaktu ? getDeadlineInfo(tugas.batasWaktu.toDate()) : null;
    
    const isAssigner = actingJabatanProfile?.id === tugas.dariJabatanId;
    const isAssignee = actingJabatanProfile?.id === tugas.kepadaJabatanId;
    const isCollaborator = tugas.collaboratorIds?.includes(actingJabatanProfile?.id || '');

    // [MODIFIKASI V9] Hapus 'isCollaborator' dari 'canMarkDone'
    const canMarkDone = isAssignee && tugas.status !== 'Selesai';
    const canReopen = (isAssignee || isCollaborator || isAssigner) && tugas.status === 'Selesai';
    const canInteractCheckbox = canMarkDone || canReopen;

    const progress = useMemo(() => {
        if (!tugas.subTugas || tugas.subTugas.length === 0) return 0;
        const completed = tugas.subTugas.filter(st => st.selesai).length;
        return Math.round((completed / tugas.subTugas.length) * 100);
    }, [tugas.subTugas]);

    const canDelete = isAssigner || (isAssignee && (tugas.status === 'Baru' || tugas.status === 'Selesai'));

    const handleCheckboxChange = () => {
        if (tugas.status === 'Selesai') {
            onStatusChange(tugas.id!, 'Dikerjakan'); // Buka kembali
        } else {
            onStatusChange(tugas.id!, 'Selesai'); // Selesaikan
        }
    };

    return (
        <Card className={`transition-all duration-200 ${tugas.status === 'Selesai' ? 'bg-muted/50' : 'bg-card'}`}>
            <CardHeader 
              className="flex flex-row items-center p-4"
            >
                {/* --- [MODIFIKASI TUGAS 2] --- */}
                <div className="flex-shrink-0 pr-3">
                    <Checkbox
                        id={`check-${tugas.id}`}
                        checked={tugas.status === 'Selesai'}
                        onCheckedChange={handleCheckboxChange}
                        disabled={!canInteractCheckbox}
                        aria-label="Selesaikan tugas"
                    />
                </div>
                {/* --- Akhir Modifikasi --- */}

                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onToggleExpand(tugas.id!)}
                >
                    <div className="flex items-center gap-2">
                        {tugas.suratId && <span title="Tugas terkait surat"><Mail size={14} className="text-muted-foreground flex-shrink-0"/></span>}
                        <CardTitle className={`text-base font-semibold truncate ${tugas.status === 'Selesai' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {tugas.judulTugas}
                        </CardTitle>
                    </div>
                    {/* Info baris kedua (Desktop) */}
                    <CardDescription className="hidden md:flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-2">
                        <Badge variant={getPriorityBadgeVariant(tugas.prioritas)}>{tugas.prioritas}</Badge>
                        {tugas.kategoriTugas && <Badge variant="outline">{tugas.kategoriTugas}</Badge>}
                        <div className="flex items-center"><UserCheck size={14} className="mr-1.5" /><span>PJ: {penanggungJawab?.namaLengkap || '...'}</span></div>
                        {tugas.collaboratorIds && tugas.collaboratorIds.length > 0 && (<div className="flex items-center"><Users size={14} className="mr-1.5" /><span>+{tugas.collaboratorIds.length} Kolaborator</span></div>)}
                    </CardDescription>
                    {/* Info baris kedua (Mobile) */}
                    <CardDescription className="md:hidden flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-2">
                         <Badge variant={getPriorityBadgeVariant(tugas.prioritas)}>{tugas.prioritas}</Badge>
                         {tugas.status !== 'Selesai' && deadlineInfo && <div className={`flex items-center font-medium ${deadlineInfo.color}`}>{deadlineInfo.icon}<span className="ml-1.5">{deadlineInfo.text}</span></div>}
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
                    <div className="hidden md:flex items-center text-sm font-medium">
                        {tugas.status !== 'Selesai' && deadlineInfo && (
                            <div className={`flex items-center ${deadlineInfo.color}`}>
                                {deadlineInfo.icon}<span className="ml-1.5">{deadlineInfo.text}</span>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => onToggleExpand(tugas.id!)}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </Button>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="p-4 border-t border-border space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm text-foreground mb-1">Deskripsi</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tugas.deskripsi}</p>
                    </div>
                    
                    <div className="md:hidden space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center"><UserCheck size={14} className="mr-1.5" /><span>PJ: {penanggungJawab?.namaLengkap || '...'}</span></div>
                        {tugas.collaboratorIds && tugas.collaboratorIds.length > 0 && (<div className="flex items-center"><Users size={14} className="mr-1.5" /><span>+{tugas.collaboratorIds.length} Kolaborator</span></div>)}
                    </div>

                    {tugas.subTugas && tugas.subTugas.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-sm text-foreground mb-2">Progress Checklist ({progress}%)</h4>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                        {tugas.suratId && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/surat/${tugas.suratId}`}><Mail size={14} /> Lihat Surat</Link>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => onOpenDetail(tugas)}>
                            <MessageSquare size={14} /> Detail & Tim
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-4 border-t border-border">
                        <div className="flex-1 flex flex-wrap items-center gap-2">
                            {/* Tombol-tombol ini sekarang menjadi redundant karena ada Checkbox, 
                                tapi kita biarkan untuk alur yang lebih eksplisit jika pengguna membuka detail */}
                            {(isAssignee || isCollaborator) && tugas.status === 'Baru' && 
                              <Button size="sm" onClick={() => onStatusChange(tugas.id!, 'Dikerjakan')}>
                                Mulai Kerjakan
                              </Button>
                            }
                            {/* [MODIFIKASI V9] Tambahkan 'isAssignee' */}
                            {isAssignee && tugas.status === 'Dikerjakan' && 
                              <Button size="sm" onClick={() => onStatusChange(tugas.id!, 'Selesai')} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle size={14} /> Selesaikan Tugas
                              </Button>
                            }
                            {(isAssigner || (isAssignee || isCollaborator)) && tugas.status === 'Selesai' && 
                              <Button size="sm" onClick={() => onStatusChange(tugas.id!, 'Dikerjakan')} variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600">
                                <Repeat size={14} /> Buka Kembali
                              </Button>
                            }
                        </div>
                        {canDelete && 
                          <Button variant="destructive" size="sm" onClick={() => onDeleteTask(tugas)}>
                            <Trash2 size={14} /> Hapus Tugas
                          </Button>
                        }
                    </div>
                </CardContent>
            )}
        </Card>
    );
}