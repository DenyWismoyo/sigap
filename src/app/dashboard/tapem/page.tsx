"use client";

import React, { useState } from 'react';
import { 
    Landmark, Handshake, Map, FileText, Building2, Loader2, BookOpen 
} from 'lucide-react';
import { useUserAuth } from '@/context/AuthContext';
import { useTapemData } from '@/app/dashboard/hooks/useTapemData';

// Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Impor Tabs
import KerjaSamaTab from './tabs/KerjaSamaTab';
import KewilayahanTab from './tabs/KewilayahanTab';
import OtonomiTab from './tabs/OtonomiTab';
import KebijakanTab from './tabs/KebijakanTab'; 
import TupoksiTab from './tabs/TupoksiTab'; 

export default function TataPemerintahanPage() {
    const { loading: authLoading } = useUserAuth();
    const { isLoading } = useTapemData();
    const [activeTab, setActiveTab] = useState('tupoksi'); 

    if (authLoading || isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Memuat modul Si-Tapem...</span>
            </div>
        );
    }

    return (
        <div className="animate-fadeInUp space-y-6 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Landmark size={32} className="mr-3 text-indigo-600" />
                        Tata Pemerintahan 
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Pusat manajemen kerja sama daerah, administrasi kewilayahan, dan otonomi daerah.
                    </p>
                </div>
            </div>

            {/* MAIN TABS (Statistik sudah dihapus) */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto pb-2">
                    <TabsList className="w-max justify-start inline-flex bg-muted p-1 rounded-lg h-auto">
                        <TabsTrigger value="tupoksi" className="flex items-center gap-2 px-4 py-2">
                            <BookOpen size={16} /> Tupoksi
                        </TabsTrigger>
                        <TabsTrigger value="kerjasama" className="flex items-center gap-2 px-4 py-2">
                            <Handshake size={16} /> Kerja Sama Daerah
                        </TabsTrigger>
                        <TabsTrigger value="wilayah" className="flex items-center gap-2 px-4 py-2">
                            <Map size={16} /> Data Kewilayahan
                        </TabsTrigger>
                        <TabsTrigger value="otonomi" className="flex items-center gap-2 px-4 py-2">
                            <Building2 size={16} /> Otonomi & LPPD
                        </TabsTrigger>
                        <TabsTrigger value="kebijakan" className="flex items-center gap-2 px-4 py-2">
                            <FileText size={16} /> Produk Kebijakan
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-6">
                    <TabsContent value="tupoksi">
                        <TupoksiTab />
                    </TabsContent>

                    <TabsContent value="kerjasama">
                        <KerjaSamaTab />
                    </TabsContent>
                    
                    <TabsContent value="wilayah">
                        <KewilayahanTab />
                    </TabsContent>

                    <TabsContent value="otonomi">
                        <OtonomiTab />
                    </TabsContent>

                    <TabsContent value="kebijakan">
                        <KebijakanTab /> 
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}