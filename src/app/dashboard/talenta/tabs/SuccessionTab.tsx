/**
 * Directory: src/app/dashboard/talenta/tabs/SuccessionTab.tsx
 * History Update:
 * - 2024-11-28: Re-verified prop passing to JobProjectionView to ensure 'onAdd' is available.
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Users, TrendingUp, ShieldAlert, Sparkles, Settings2, Loader2
} from 'lucide-react';
import { TalentDataCombined } from '@/app/dashboard/hooks/useTalentData';
import { useSuccessionData } from '@/app/dashboard/hooks/useSuccessionData'; 
import JobProjectionView from '../components/succession/JobProjectionView';
import CandidateAnalysisView from '../components/succession/CandidateAnalysisView';

interface SuccessionTabProps {
    combinedData: TalentDataCombined[];
}

export default function SuccessionTab({ combinedData }: SuccessionTabProps) {
    // [SSOT] Pastikan hook ini mengembalikan 'addPosition'
    const { positions, isLoading, isMutating, addPosition, updatePosition, deletePosition } = useSuccessionData();
    
    const [activeMainTab, setActiveMainTab] = useState("analysis"); 

    const highRiskCount = positions.filter(p => p.risk === 'High').length;
    const poolCount = combinedData.filter(d => [8, 9].includes(d.assessment?.boxPosition || 0)).length;

    if (isLoading) {
        return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="animate-spin mr-2"/> Memuat data suksesi...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Perencanaan Suksesi</h2>
                        <p className="text-muted-foreground">Kelola proyeksi jabatan kosong dan temukan kandidat terbaik.</p>
                    </div>
                    <TabsList className="bg-muted p-1 rounded-lg">
                        <TabsTrigger value="analysis" className="flex items-center gap-2">
                            <Users size={16}/> Analisis Kandidat
                        </TabsTrigger>
                        <TabsTrigger value="projection" className="flex items-center gap-2">
                            <Settings2 size={16}/> Kelola Proyeksi & Profil
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="analysis" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0">
                            <CardContent className="p-6 relative overflow-hidden">
                                <ShieldAlert className="absolute top-4 right-4 h-24 w-24 text-white/10" />
                                <div className="relative z-10">
                                    <p className="text-blue-100 text-sm font-medium mb-1">Total Proyeksi Jabatan</p>
                                    <h3 className="text-4xl font-bold">{positions.length} <span className="text-xl font-normal">Posisi</span></h3>
                                    <div className="mt-4 flex gap-2">
                                        <Badge className="bg-red-500/30 text-white border-0">{highRiskCount} High Risk</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-muted-foreground text-sm font-medium">Kesiapan Suksesi</p>
                                        <h3 className="text-3xl font-bold mt-1 text-green-700">85%</h3>
                                        <p className="text-xs text-muted-foreground mt-2">Ketersediaan kandidat "Ready Now"</p>
                                    </div>
                                    <TrendingUp className="h-10 w-10 text-green-100" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-muted-foreground text-sm font-medium">Talent Pool</p>
                                        <h3 className="text-3xl font-bold mt-1 text-purple-700">
                                            {poolCount} <span className="text-xl font-normal text-muted-foreground">Pegawai</span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-2">Potensial (Box 8 & 9)</p>
                                    </div>
                                    <Sparkles className="h-10 w-10 text-purple-100" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <CandidateAnalysisView combinedData={combinedData} positions={positions} />
                </TabsContent>

                <TabsContent value="projection" className="mt-0">
                    <JobProjectionView 
                        positions={positions} 
                        isMutating={isMutating}
                        onAdd={addPosition} // [IMPORTANT] Pastikan ini terhubung
                        onUpdate={updatePosition}
                        onDelete={deletePosition}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}