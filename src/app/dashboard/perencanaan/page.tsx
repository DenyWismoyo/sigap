// Directory: src/app/dashboard/perencanaan/page.tsx
// [NEW MODULE] Si-RANA (Sistem Perencanaan & Kinerja).
// Menampilkan tab: Renstra, Anggaran (DPA), Evaluasi (SAKIP), Settings.

"use client";

import React, { useState } from 'react';
import { Compass, Target, Banknote, BarChart2, Settings } from 'lucide-react';
import { useUserAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// --- Impor Tabs ---
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// --- Placeholder untuk Tab Components ---
import RenstraTab from './tabs/RenstraTab';
import AnggaranTab from './tabs/AnggaranTab';
import EvaluasiTab from './tabs/EvaluasiTab';
import ProgramSettingsTab from './tabs/ProgramSettingsTab';

export default function PerencanaanPage() {
    const { userProfile, loading } = useUserAuth();
    const [activeTab, setActiveTab] = useState('renstra');

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!userProfile?.opdId) return <div className="p-8 text-center">Akses Ditolak.</div>;

    // Cek hak akses: Hanya Admin OPD, Super Admin, atau Pimpinan (Eselon 2/3/4)
    const canAccess = userProfile.role === 'admin_opd' || userProfile.role === 'super_admin' || (userProfile.level && userProfile.level <= 4);

    if (!canAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <Compass size={48} className="mb-4 opacity-20"/>
                <h2 className="text-lg font-semibold">Akses Terbatas</h2>
                <p className="text-sm">Hanya Admin OPD atau Pejabat Struktural yang dapat mengakses modul perencanaan.</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeInUp space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Compass size={28} className="mr-3 text-indigo-600" />
                        Perencanaan & Kinerja (Si-RANA)
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Sistem manajemen kinerja terintegrasi (Renstra, DPA, SAKIP).
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto pb-1 scrollbar-hide">
                    <TabsList className="w-max justify-start inline-flex bg-muted p-1 rounded-lg h-auto">
                        <TabsTrigger value="renstra" className="flex items-center justify-center gap-2 min-w-[120px] py-2 px-4">
                            <Target size={18} /> 
                            <span className="hidden sm:inline">Perencanaan Strategis</span>
                        </TabsTrigger>
                        <TabsTrigger value="anggaran" className="flex items-center justify-center gap-2 min-w-[120px] py-2 px-4">
                            <Banknote size={18} /> 
                            <span className="hidden sm:inline">Anggaran (DPA)</span>
                        </TabsTrigger>
                        <TabsTrigger value="evaluasi" className="flex items-center justify-center gap-2 min-w-[120px] py-2 px-4">
                            <BarChart2 size={18} /> 
                            <span className="hidden sm:inline">Evaluasi (SAKIP)</span>
                        </TabsTrigger>
                         <TabsTrigger value="settings" className="flex items-center justify-center gap-2 min-w-[120px] py-2 px-4">
                            <Settings size={18} /> 
                            <span className="hidden sm:inline">Master Data</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-6">
                    <TabsContent value="renstra" className="mt-0 focus-visible:ring-0">
                        <RenstraTab userProfile={userProfile} />
                    </TabsContent>
                    
                    <TabsContent value="anggaran" className="mt-0 focus-visible:ring-0">
                        <AnggaranTab userProfile={userProfile} />
                    </TabsContent>

                    <TabsContent value="evaluasi" className="mt-0 focus-visible:ring-0">
                        <EvaluasiTab userProfile={userProfile} />
                    </TabsContent>

                    <TabsContent value="settings" className="mt-0 focus-visible:ring-0">
                        <ProgramSettingsTab userProfile={userProfile} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}