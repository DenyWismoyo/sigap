/**
 * Directory: src/app/dashboard/talenta/tabs/TalentPoolTab.tsx
 * History Update:
 * - 2024-11-27: Initial creation.
 * - 2024-11-27: Added "Talent Pool" logic for grouping employees based on 9-Box Grid.
 * - 2024-11-28: Added header info.
 */

"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserProfile } from '@/types';
import { TalentAssessment } from '@/app/dashboard/hooks/useTalentData';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, TrendingUp, AlertTriangle, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TalentPoolTabProps {
    combinedData: { user: UserProfile; assessment?: TalentAssessment; hasAssessment: boolean }[];
}

export default function TalentPoolTab({ combinedData }: TalentPoolTabProps) {
    
    // Grouping Data
    const pools = useMemo(() => {
        return {
            stars: combinedData.filter(d => d.assessment?.boxPosition === 9),
            highPotentials: combinedData.filter(d => d.assessment?.boxPosition === 8),
            futureLeaders: combinedData.filter(d => d.assessment?.boxPosition === 7),
            coreEmployees: combinedData.filter(d => [5, 6].includes(d.assessment?.boxPosition || 0)),
            underperformers: combinedData.filter(d => [1, 2, 4].includes(d.assessment?.boxPosition || 0)),
        };
    }, [combinedData]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. STAR TALENT (SIAP PROMOSI) */}
                <TalentGroupCard 
                    title="Star Talent (Box 9)"
                    description="Kandidat utama untuk promosi jabatan strategis. Kinerja dan Potensi Puncak."
                    data={pools.stars}
                    icon={<Star className="text-purple-600" />}
                    colorClass="border-l-4 border-l-purple-600 bg-purple-50 dark:bg-purple-900/10"
                    badgeColor="bg-purple-600 hover:bg-purple-700"
                />

                {/* 2. HIGH POTENTIAL (CADANGAN PEMIMPIN) */}
                <TalentGroupCard 
                    title="High Potential (Box 8)"
                    description="Aset masa depan. Perlu rotasi atau tantangan baru untuk menguji kesiapan."
                    data={pools.highPotentials}
                    icon={<TrendingUp className="text-green-600" />}
                    colorClass="border-l-4 border-l-green-600 bg-green-50 dark:bg-green-900/10"
                    badgeColor="bg-green-600 hover:bg-green-700"
                />

                {/* 3. POTENTIAL GEM (PERLU MENTORING) */}
                <TalentGroupCard 
                    title="Potential Gem (Box 7)"
                    description="Potensi tinggi tapi kinerja belum maksimal. Perlu mentoring atau penyesuaian tugas."
                    data={pools.futureLeaders}
                    icon={<UserCheck className="text-yellow-600" />}
                    colorClass="border-l-4 border-l-yellow-600 bg-yellow-50 dark:bg-yellow-900/10"
                    badgeColor="bg-yellow-600 hover:bg-yellow-700"
                />

                {/* 4. UNDERPERFORMER (PERLU PERHATIAN) */}
                <TalentGroupCard 
                    title="Perlu Pembinaan (Box 1, 2, 4)"
                    description="Kinerja atau potensi di bawah standar. Memerlukan rencana perbaikan kinerja (PIP)."
                    data={pools.underperformers}
                    icon={<AlertTriangle className="text-red-600" />}
                    colorClass="border-l-4 border-l-red-600 bg-red-50 dark:bg-red-900/10"
                    badgeColor="bg-red-600 hover:bg-red-700"
                />
            </div>
            
            <Card className="border-dashed border-2">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="text-blue-600"/> Core Employees (Box 5 & 6)
                    </CardTitle>
                    <CardDescription>
                        Tulang punggung organisasi. Kinerja stabil dan dapat diandalkan. Total: <strong>{pools.coreEmployees.length} Pegawai</strong>.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}

const TalentGroupCard = ({ title, description, data, icon, colorClass, badgeColor }: any) => (
    <Card className={`shadow-sm ${colorClass}`}>
        <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        {icon} {title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs opacity-90">
                        {description}
                    </CardDescription>
                </div>
                <Badge className={`${badgeColor} text-white`}>{data.length}</Badge>
            </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-48 pr-4">
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center">Belum ada kandidat.</p>
                ) : (
                    <div className="space-y-3">
                        {data.map((item: any) => (
                            <div key={item.user.id} className="bg-white/80 dark:bg-black/20 p-3 rounded-lg border border-black/5 shadow-sm flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                    <span className="font-semibold text-sm">{item.user.namaLengkap}</span>
                                    <span className="text-[10px] font-mono opacity-70">NIP: {item.user.nip}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{item.user.namaJabatan || 'Staf'}</p>
                                {item.assessment?.rekomendasiJabatan && (
                                    <div className="mt-1 pt-1 border-t border-dashed border-black/10">
                                        <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                                            Rekomendasi: {item.assessment.rekomendasiJabatan}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            {data.length > 0 && (
                <div className="mt-4 pt-2 border-t border-black/5 flex justify-end">
                    <Button variant="ghost" size="sm" className="text-xs h-7">Lihat Detail</Button>
                </div>
            )}
        </CardContent>
    </Card>
);