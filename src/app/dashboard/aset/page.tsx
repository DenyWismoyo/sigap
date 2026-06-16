// Directory: src/app/dashboard/aset/page.tsx
// [UPDATE] Menggunakan komponen tab yang sudah dipisah.

"use client";

import React, { useState } from 'react';
import { Package, ArrowRightLeft, Wrench, Loader2 } from 'lucide-react';
import { useUserAuth } from '@/context/AuthContext';

// --- Impor Tabs ---
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import InventarisTab from '@/app/dashboard/aset/tabs/InventarisTab';
import PeminjamanTab from '@/app/dashboard/aset/tabs/PeminjamanTab';
import MaintenanceTab from '@/app/dashboard/aset/tabs/MaintenanceTab';

export default function ManajemenAsetPage() {
    const { userProfile, loading } = useUserAuth();
    const [activeTab, setActiveTab] = useState('inventaris');

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!userProfile?.opdId) return <div className="p-8 text-center">Akses Ditolak.</div>;

    return (
        <div className="animate-fadeInUp space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Package size={28} className="mr-3 text-green-600" />
                        Manajemen Aset Terpadu
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Sistem pelacakan, peminjaman, dan pemeliharaan aset daerah.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="inventaris" className="flex items-center gap-2">
                        <Package size={16} /> Inventaris
                    </TabsTrigger>
                    <TabsTrigger value="peminjaman" className="flex items-center gap-2">
                        <ArrowRightLeft size={16} /> Sirkulasi
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="flex items-center gap-2">
                        <Wrench size={16} /> Pemeliharaan
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="inventaris">
                        <InventarisTab userProfile={userProfile} />
                    </TabsContent>
                    
                    <TabsContent value="peminjaman">
                        <PeminjamanTab userProfile={userProfile} />
                    </TabsContent>
                    
                    <TabsContent value="maintenance">
                        <MaintenanceTab userProfile={userProfile} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}