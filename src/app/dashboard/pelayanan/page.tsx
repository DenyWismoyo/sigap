// Lokasi: src/app/dashboard/pelayanan/page.tsx
// [UI UPDATE] Menu Tab hanya icon di mobile (hidden md:inline) untuk estetika.

"use client";

import React, { useState } from 'react';
import { HeartHandshake, UserCheck, ClipboardList, History, AlertTriangle, BarChart2, Loader2, Settings } from 'lucide-react';
import { useUserAuth } from '@/context/AuthContext';

// Tabs
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PengambilanTab from './tabs/PengambilanTab';
import LayananUmumTab from './tabs/LayananUmumTab';
import RiwayatTab from './tabs/RiwayatTab';
import RekapitulasiTab from './tabs/RekapitulasiTab';
import SettingsTab from './tabs/SettingsTab'; 

export default function PelayananPage() {
    const { userProfile, loading: authLoading } = useUserAuth();
    const [activeTab, setActiveTab] = useState('pengambilan');

    if (authLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const canAccess = 
        userProfile?.role === 'admin_opd' || 
        userProfile?.role === 'super_admin' || 
        userProfile?.additionalRoles?.includes('petugas_pelayanan');

    if (!canAccess || !userProfile) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <AlertTriangle size={48} className="mb-4 opacity-20 text-yellow-500"/>
                <h2 className="text-lg font-semibold">Akses Terbatas</h2>
                <p className="text-sm text-center mt-2 max-w-md">
                    Anda tidak terdaftar sebagai Petugas Pelayanan. Hubungi Admin OPD untuk menambahkan peran ini pada akun Anda.
                </p>
            </div>
        );
    }
    
    const isAdmin = userProfile.role === 'admin_opd' || userProfile.role === 'super_admin';

    return (
        <div className="animate-fadeInUp space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <HeartHandshake size={32} className="mr-3 text-pink-600" />
                        Pelayanan Publik
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Loket digital untuk pencatatan layanan masyarakat.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    {/* [UI UPDATE] Menu Tab Responsive: Icon Only on Mobile */}
                    <TabsList className="w-full justify-start min-w-[320px] md:min-w-[700px] h-12 md:h-10">
                        <TabsTrigger value="pengambilan" className="flex items-center gap-2 flex-1">
                            <UserCheck size={18} /> 
                            <span className="hidden md:inline">Pengambilan (KTP/KK)</span>
                        </TabsTrigger>
                        <TabsTrigger value="umum" className="flex items-center gap-2 flex-1">
                            <ClipboardList size={18} /> 
                            <span className="hidden md:inline">Layanan Umum</span>
                        </TabsTrigger>
                        <TabsTrigger value="riwayat" className="flex items-center gap-2 flex-1">
                            <History size={18} /> 
                            <span className="hidden md:inline">Riwayat</span>
                        </TabsTrigger>
                        <TabsTrigger value="rekap" className="flex items-center gap-2 flex-1">
                            <BarChart2 size={18} /> 
                            <span className="hidden md:inline">Rekapitulasi</span>
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="settings" className="flex items-center gap-2 flex-none px-4">
                                <Settings size={18} /> 
                                <span className="hidden md:inline">Pengaturan</span>
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <div className="mt-6">
                    <TabsContent value="pengambilan">
                        <PengambilanTab userProfile={userProfile} />
                    </TabsContent>
                    
                    <TabsContent value="umum">
                        <LayananUmumTab userProfile={userProfile} />
                    </TabsContent>
                    
                    <TabsContent value="riwayat">
                        <RiwayatTab userProfile={userProfile} />
                    </TabsContent>

                    <TabsContent value="rekap">
                        <RekapitulasiTab userProfile={userProfile} />
                    </TabsContent>

                    {isAdmin && (
                        <TabsContent value="settings">
                            <SettingsTab />
                        </TabsContent>
                    )}
                </div>
            </Tabs>
        </div>
    );
}