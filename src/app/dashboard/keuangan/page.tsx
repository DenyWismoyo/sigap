// Directory: src/app/dashboard/keuangan/page.tsx
// [OPTIMASI LAZY LOAD] 
// Mengubah import komponen Tab menjadi dynamic import.
// Pustaka berat (XLSX, Chart.js) yang ada di dalam tab Laporan/Dashboard
// TIDAK AKAN DIMUAT sampai user benar-benar mengklik tab tersebut.

"use client";

import React, { useState } from 'react';
import { Wallet, Plus, BookOpen, BarChart, Settings, FileCheck, Coins, Landmark, Layers, FileSpreadsheet, Store, Loader2 } from 'lucide-react';
import { useUserAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

// --- Impor Tabs ---
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// [OPTIMASI] Komponen Loading Skeleton untuk Tab
const TabLoading = () => (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm">Memuat modul...</p>
    </div>
);

// [OPTIMASI] Dynamic Imports untuk Tab yang Berat
const InputGuTab = dynamic(() => import('./tabs/InputGuTab'), { 
    loading: () => <TabLoading />,
    ssr: false 
});
const BukuKasTab = dynamic(() => import('./tabs/BukuKasTab'), { 
    loading: () => <TabLoading />, // Tab ini berat (XLSX)
    ssr: false 
});
const DashboardTab = dynamic(() => import('./tabs/DashboardTab'), { 
    loading: () => <TabLoading />, // Tab ini berat (Chart.js)
    ssr: false 
});
const SettingsTab = dynamic(() => import('./tabs/SettingsTab'), { 
    loading: () => <TabLoading />, 
    ssr: false 
});
const LaporanTab = dynamic(() => import('./tabs/LaporanTab'), { 
    loading: () => <TabLoading />, // Tab ini berat (XLSX)
    ssr: false 
});
const OpnameKasTab = dynamic(() => import('./tabs/OpnameKasTab'), { 
    loading: () => <TabLoading />, 
    ssr: false 
});
const PajakCenterTab = dynamic(() => import('./tabs/PajakCenterTab'), { 
    loading: () => <TabLoading />, 
    ssr: false 
});
const SpjGeneratorTab = dynamic(() => import('./tabs/SpjGeneratorTab'), { 
    loading: () => <TabLoading />, // Tab ini berat (XLSX)
    ssr: false 
});
const KertasKerjaTab = dynamic(() => import('./tabs/KertasKerjaTab'), { 
    loading: () => <TabLoading />, 
    ssr: false 
});
const VendorTab = dynamic(() => import('./tabs/VendorTab'), { 
    loading: () => <TabLoading />, 
    ssr: false 
});


export default function KeuanganPage() {
    const { userProfile, loading } = useUserAuth();
    const [activeTab, setActiveTab] = useState('input');

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!userProfile?.opdId) return <div className="p-8 text-center">Akses Ditolak.</div>;

    const canAccess = userProfile.role === 'admin_opd' || userProfile.role === 'super_admin' || userProfile.additionalRoles?.includes('bendahara');

    if (!canAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <Wallet size={48} className="mb-4 opacity-20"/>
                <h2 className="text-lg font-semibold">Akses Terbatas</h2>
                <p className="text-sm">Hanya Bendahara atau Admin OPD yang dapat mengakses menu ini.</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeInUp space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Wallet size={28} className="mr-3 text-emerald-600" />
                        Keuangan & Kas Kecil
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Pencatatan internal kas operasional (GU/LS) secara sederhana.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto pb-1 scrollbar-hide">
                    <TabsList className="w-max justify-start inline-flex bg-muted p-1 rounded-lg h-auto">
                        <TabsTrigger value="input" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <Plus size={18} /> 
                            <span className="hidden sm:inline">Input</span>
                        </TabsTrigger>
                        <TabsTrigger value="buku_kas" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <BookOpen size={18} /> 
                            <span className="hidden sm:inline">Buku Kas</span>
                        </TabsTrigger>
                        <TabsTrigger value="opname" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <Coins size={18} /> 
                            <span className="hidden sm:inline">Opname</span>
                        </TabsTrigger>
                         <TabsTrigger value="pajak" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <Landmark size={18} /> 
                            <span className="hidden sm:inline">Pajak</span>
                        </TabsTrigger>
                         <TabsTrigger value="spj" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <Layers size={18} /> 
                            <span className="hidden sm:inline">SPJ</span>
                        </TabsTrigger>
                        <TabsTrigger value="kertas_kerja" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <FileSpreadsheet size={18} /> 
                            <span className="hidden sm:inline">Kertas Kerja</span>
                        </TabsTrigger>
                        <TabsTrigger value="vendor" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <Store size={18} /> 
                            <span className="hidden sm:inline">Rekanan</span>
                        </TabsTrigger>
                        <TabsTrigger value="laporan" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <FileCheck size={18} /> 
                            <span className="hidden sm:inline">Laporan</span>
                        </TabsTrigger>
                        <TabsTrigger value="dashboard" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <BarChart size={18} /> 
                            <span className="hidden sm:inline">Ringkasan</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center justify-center gap-2 min-w-[80px] py-2 px-4">
                            <Settings size={18} /> 
                            <span className="hidden sm:inline">Pengaturan</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* [OPTIMASI] Gunakan conditional rendering yang ketat.
                   Komponen TabContent akan tetap di-mount (agar state terjaga jika menggunakan keepAlive libraries), 
                   tapi dengan dynamic import default Next.js, kode JS-nya baru ditarik saat di-render.
                   
                   Agar lebih agresif menghemat memori, kita bisa merender HANYA tab yang aktif.
                */}
                <div className="mt-6">
                    {activeTab === 'input' && <InputGuTab userProfile={userProfile} />}
                    {activeTab === 'buku_kas' && <BukuKasTab userProfile={userProfile} />}
                    {activeTab === 'opname' && <OpnameKasTab userProfile={userProfile} />}
                    {activeTab === 'pajak' && <PajakCenterTab userProfile={userProfile} />}
                    {activeTab === 'spj' && <SpjGeneratorTab userProfile={userProfile} />}
                    {activeTab === 'kertas_kerja' && <KertasKerjaTab userProfile={userProfile} />}
                    {activeTab === 'vendor' && <VendorTab userProfile={userProfile} />}
                    {activeTab === 'laporan' && <LaporanTab userProfile={userProfile} />}
                    {activeTab === 'dashboard' && <DashboardTab userProfile={userProfile} />}
                    {activeTab === 'settings' && <SettingsTab userProfile={userProfile} />}
                </div>
            </Tabs>
        </div>
    );
}