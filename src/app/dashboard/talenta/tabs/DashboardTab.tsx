/**
 * Directory: src/app/dashboard/talenta/tabs/DashboardTab.tsx
 * History Update:
 * - 2024-11-27: Initial creation of 9-Box Matrix visualization.
 * - 2024-11-27: Added summary statistics cards (Star, High Potential, etc).
 */

"use client";

import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, FileText, Users } from 'lucide-react';
import { MatrixBox } from '../components/MatrixBox';
import { UserProfile } from '@/types';
import { TalentAssessment } from '@/app/dashboard/hooks/useTalentData';

interface DashboardTabProps {
    combinedData: { user: UserProfile; assessment?: TalentAssessment; hasAssessment: boolean }[];
    onAssessClick: (user: UserProfile, assessment?: TalentAssessment) => void;
}

export default function DashboardTab({ combinedData, onAssessClick }: DashboardTabProps) {

    // Grouping Data untuk Matriks
    const matrixData = useMemo(() => {
        const groups: Record<number, typeof combinedData> = {
            1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: []
        };
        
        combinedData.forEach(item => {
            if (item.assessment?.boxPosition) {
                groups[item.assessment.boxPosition].push(item);
            }
        });
        return groups;
    }, [combinedData]);

    // Statistik Cepat
    const stats = useMemo(() => {
        return {
            star: matrixData[9].length,
            highPotential: matrixData[8].length,
            totalDinilai: combinedData.filter(d => d.hasAssessment).length,
            totalPegawai: combinedData.length
        };
    }, [matrixData, combinedData]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">Star (Box 9)</p>
                            <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.star} Pegawai</h3>
                        </div>
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-full">
                            <Star className="text-purple-600 dark:text-purple-300 h-6 w-6 fill-current" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-800 dark:text-green-300 font-medium">High Potential (Box 8)</p>
                            <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.highPotential} Pegawai</h3>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                            <TrendingUp className="text-green-600 dark:text-green-400 h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Sudah Dinilai</p>
                            <h3 className="text-2xl font-bold text-foreground">
                                {stats.totalDinilai} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalPegawai}</span>
                            </h3>
                        </div>
                        <FileText className="text-muted-foreground h-6 w-6" />
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Total Populasi</p>
                            <h3 className="text-2xl font-bold text-foreground">{stats.totalPegawai}</h3>
                        </div>
                        <Users className="text-muted-foreground h-6 w-6" />
                    </CardContent>
                </Card>
            </div>

            {/* MATRIX GRID */}
            <Card className="border-border shadow-md overflow-hidden">
                <div className="relative bg-card p-6 overflow-x-auto">
                    <div className="min-w-[900px] pb-6 pl-8">
                        
                        {/* Label Sumbu Y (Potensi) */}
                        <div className="absolute left-2 top-1/2 -rotate-90 text-xs font-bold tracking-widest text-muted-foreground transform -translate-y-1/2">
                            POTENSI (TINGGI &uarr;)
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Baris Atas (Potensi Tinggi) */}
                            <MatrixBox number={7} data={matrixData[7]} onSelect={onAssessClick} label="7. Potential Gem" color="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800" />
                            <MatrixBox number={8} data={matrixData[8]} onSelect={onAssessClick} label="8. High Potential" color="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" />
                            <MatrixBox number={9} data={matrixData[9]} onSelect={onAssessClick} label="9. STAR" color="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800" isStar />

                            {/* Baris Tengah (Potensi Sedang) */}
                            <MatrixBox number={4} data={matrixData[4]} onSelect={onAssessClick} label="4. Inconsistent" color="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" />
                            <MatrixBox number={5} data={matrixData[5]} onSelect={onAssessClick} label="5. Core Employee" color="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" />
                            <MatrixBox number={6} data={matrixData[6]} onSelect={onAssessClick} label="6. High Performer" color="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" />

                            {/* Baris Bawah (Potensi Rendah) */}
                            <MatrixBox number={1} data={matrixData[1]} onSelect={onAssessClick} label="1. Iceberg / Risk" color="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" />
                            <MatrixBox number={2} data={matrixData[2]} onSelect={onAssessClick} label="2. Backstrom" color="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" />
                            <MatrixBox number={3} data={matrixData[3]} onSelect={onAssessClick} label="3. Workhorse" color="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800" />
                        </div>

                        {/* Label Sumbu X (Kinerja) */}
                        <div className="text-center mt-4 text-xs font-bold tracking-widest text-muted-foreground">
                            KINERJA (TINGGI &rarr;)
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}