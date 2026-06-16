// Lokasi: src/app/dashboard/tugas/delegasi/page.tsx
// [REFACTOR SSOT]
// - Mengganti fetch manual dengan `useMasterData` (untuk data staf) dan `useTugasData` (untuk data tugas).
// - Menghapus duplikasi state dan effect.
// - Menggunakan data yang sudah di-cache di memori untuk performa instan.

"use client";

import React, { useState, useMemo } from 'react'; 
import { useUserAuth } from '@/context/AuthContext';
import { Tugas, UserProfile } from '@/types';
import TaskDetailModal from '../components/TaskDetailModal';
import { Briefcase, CheckCircle, Clock, AlertTriangle, Filter, User as UserIcon, Loader2 } from 'lucide-react';

// --- Import Hooks SSOT ---
import { useMasterData } from '@/app/dashboard/hooks/useMasterData';
import { useTugasData } from '@/app/dashboard/hooks/useTugasData';

// --- Impor Komponen Shadcn ---
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// --- Akhir Impor Shadcn ---


// Komponen Kartu Statistik
const StatCard = ({ title, value, icon, colorClass }: { title: string, value: number, icon: React.ReactNode, colorClass: string }) => (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-3 rounded-full ${colorClass.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20`}>
          {React.cloneElement(icon as React.ReactElement, { 
            // @ts-ignore
            className: `w-5 h-5 ${colorClass}` 
          })}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
);

// Komponen Kartu Tugas Ringkas
const TaskCard = ({ tugas, onClick }: { tugas: Tugas, onClick: () => void }) => {
    const isOverdue = tugas.batasWaktu && tugas.batasWaktu.toDate() < new Date() && tugas.status !== 'Selesai';
    const priorityStyles = {
        Tinggi: 'border-red-500',
        Sedang: 'border-yellow-500',
        Rendah: 'border-green-500',
    };

    return (
        <div onClick={onClick} className={`p-3 bg-card rounded-lg border-l-4 ${priorityStyles[tugas.prioritas]} shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer border border-border`}>
            <p className="font-semibold text-sm text-foreground line-clamp-2">{tugas.judulTugas}</p>
            {tugas.batasWaktu && (
                <div className={`mt-2 flex items-center text-xs ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                    <Clock size={12} className="mr-1.5"/>
                    <span>{tugas.batasWaktu.toDate().toLocaleDateString('id-ID')}</span>
                </div>
            )}
        </div>
    );
};

// --- Komponen Utama Halaman ---
export default function DelegasiTugasPage() {
    const { userProfile, actingJabatanProfile, loading: authLoading } = useUserAuth();
    
    // --- 1. DATA FETCHING (SSOT) ---
    
    // Ambil data master (User & Jabatan) dari cache global
    const { userMap, isLoading: isMasterLoading } = useMasterData(true);

    // Ambil tugas yang "Saya Berikan" (byMe) menggunakan hook tugas
    const { filteredTasks: allDelegatedTasks, isLoading: isTasksLoading } = useTugasData({
        statusFilter: 'Semua',
        assignmentFilter: 'byMe', // KUNCI: Hanya tugas dari saya
        typeFilter: 'all'
    });

    const [selectedTask, setSelectedTask] = useState<Tugas | null>(null);
    const [staffFilter, setStaffFilter] = useState('Semua');
    const [priorityFilter, setPriorityFilter] = useState<'Semua' | 'Tinggi' | 'Sedang' | 'Rendah'>('Semua');

    const isPimpinan = useMemo(() => actingJabatanProfile && actingJabatanProfile.level <= 5, [actingJabatanProfile]);

    // --- 2. DATA PROCESSING (Client-side) ---
    const { stats, staffList, filteredTasksByStaff } = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        // Hitung Statistik Global (Sebelum filter visual diterapkan)
        const tasksSelesai = allDelegatedTasks.filter(t => t.status === 'Selesai' && t.tanggalSelesai && t.tanggalSelesai.toDate() > thirtyDaysAgo).length;
        const tasksAktif = allDelegatedTasks.filter(t => t.status !== 'Selesai');
        const tasksTerlambat = tasksAktif.filter(t => t.batasWaktu && t.batasWaktu.toDate() < now).length;

        // Grouping per Staf
        const staffMap = new Map<string, { profile: UserProfile, tasks: Tugas[] }>();
        
        allDelegatedTasks.forEach(task => {
            // Gunakan userMap dari hook Master Data untuk mendapatkan profil staf
            const staffProfile = userMap.get(task.kepadaJabatanId); 
            
            if (staffProfile) {
                if (!staffMap.has(staffProfile.jabatanId)) {
                    staffMap.set(staffProfile.jabatanId, { profile: staffProfile, tasks: [] });
                }
                staffMap.get(staffProfile.jabatanId)!.tasks.push(task);
            }
        });
        
        const staffListWithTasks = Array.from(staffMap.values()).sort((a, b) => a.profile.namaLengkap.localeCompare(b.profile.namaLengkap));
        
        // Terapkan Filter Visual (Staf & Prioritas)
        const filteredMap = new Map<string, Tugas[]>();
        staffListWithTasks.forEach(staff => {
            // Cek filter staf
            if (staffFilter !== 'Semua' && staff.profile.jabatanId !== staffFilter) return;

            const tasks = staff.tasks.filter(task => {
                const priorityMatch = priorityFilter === 'Semua' || task.prioritas === priorityFilter;
                return priorityMatch;
            });
            
            // Sort tugas: Overdue & Terbaru dulu
            tasks.sort((a, b) => {
                 const aOverdue = a.batasWaktu && a.batasWaktu.toDate() < now && a.status !== 'Selesai';
                 const bOverdue = b.batasWaktu && b.batasWaktu.toDate() < now && b.status !== 'Selesai';
                 if (aOverdue && !bOverdue) return -1;
                 if (!aOverdue && bOverdue) return 1;
                 return b.tanggalDibuat.toMillis() - a.tanggalDibuat.toMillis();
            });

            if (tasks.length > 0 || staffFilter !== 'Semua') {
                 filteredMap.set(staff.profile.jabatanId, tasks);
            }
        });

        return {
            stats: {
                total: allDelegatedTasks.length,
                aktif: tasksAktif.length,
                terlambat: tasksTerlambat,
                selesai: tasksSelesai
            },
            staffList: staffListWithTasks.map(s => s.profile),
            filteredTasksByStaff: filteredMap
        };
    }, [allDelegatedTasks, userMap, staffFilter, priorityFilter]);


    if (authLoading || isTasksLoading || isMasterLoading) { 
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>Memuat Pusat Komando...</p>
            </div>
        );
    }
    
    if (!isPimpinan) {
        return <div className="p-6 text-center text-red-700 bg-red-100 rounded-lg border border-red-200">Halaman ini hanya dapat diakses oleh Pimpinan (Level Eselon/Struktural).</div>;
    }

    return (
        <div className="animate-fadeInUp pb-20">
            <h1 className="text-3xl font-bold text-foreground flex items-center mb-6">
                <Briefcase size={28} className="mr-3 text-cyan-600" />
                Pusat Komando Kinerja Tim
            </h1>

            {/* Kartu Metrik Utama */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Tugas Didelegasikan" value={stats.total} icon={<Briefcase className="text-gray-600" />} colorClass="text-gray-600" />
                <StatCard title="Tugas Sedang Dikerjakan" value={stats.aktif} icon={<Clock className="text-blue-600" />} colorClass="text-blue-600" />
                <StatCard title="Tugas Terlambat" value={stats.terlambat} icon={<AlertTriangle className="text-red-600" />} colorClass="text-red-600" />
                <StatCard title="Selesai (30 Hari Terakhir)" value={stats.selesai} icon={<CheckCircle className="text-green-600" />} colorClass="text-green-600" />
            </div>

            {/* Filter */}
            <div className="p-4 bg-card rounded-xl border border-border shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center text-sm font-semibold text-muted-foreground"><Filter size={16} className="mr-2"/> Filter:</div>
                <div className="flex-1 w-full md:w-auto">
                    <Select value={staffFilter} onValueChange={setStaffFilter}>
                        <SelectTrigger className="w-full md:w-[220px]">
                            <SelectValue placeholder="Semua Staf" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Semua">Semua Staf</SelectItem>
                            {staffList.map(staff => <SelectItem key={staff.jabatanId} value={staff.jabatanId}>{staff.namaLengkap}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex-1 w-full md:w-auto">
                    <Select value={priorityFilter} onValueChange={e => setPriorityFilter(e as any)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Semua Prioritas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Semua">Semua Prioritas</SelectItem>
                            <SelectItem value="Tinggi">Tinggi</SelectItem>
                            <SelectItem value="Sedang">Sedang</SelectItem>
                            <SelectItem value="Rendah">Rendah</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tampilan Tim (Beban Kerja) */}
            <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0 snap-x scroll-smooth">
                {filteredTasksByStaff.size > 0 ? (
                    Array.from(filteredTasksByStaff.entries()).map(([jabatanId, tasks]) => {
                        const staffProfile = userMap.get(jabatanId); 
                        if (!staffProfile) return null;

                        const activeTasksCount = tasks.filter(t => t.status !== 'Selesai').length;

                        return (
                            <div key={jabatanId} className="w-80 bg-muted/50 rounded-xl p-3 flex-shrink-0 flex flex-col h-[calc(100vh-350px)] border border-border snap-start">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {staffProfile.namaLengkap.charAt(0)}
                                    </div>
                                    <h3 className="font-bold text-foreground truncate flex-1">{staffProfile.namaLengkap}</h3>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeTasksCount > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                        {activeTasksCount}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                    {tasks.length > 0 ? tasks.map(task => (
                                        <TaskCard key={task.id} tugas={task} onClick={() => setSelectedTask(task)} />
                                    )) : (
                                        <p className="text-center text-xs text-muted-foreground py-4">Tidak ada tugas sesuai filter.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                     <div className="w-full text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                        <Briefcase size={48} className="mx-auto mb-3 text-muted-foreground/30"/>
                        <p className="font-semibold">Tidak ada tugas yang sesuai dengan filter.</p>
                        <p className="text-sm">Cobalah ubah filter atau delegasikan tugas baru.</p>
                     </div>
                )}
            </div>

            <TaskDetailModal
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                tugas={selectedTask}
                userCache={userMap} 
            />
        </div>
    );
}