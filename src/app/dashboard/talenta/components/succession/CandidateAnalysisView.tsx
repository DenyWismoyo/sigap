"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, BrainCircuit, ShieldAlert, Sparkles, Trophy, BookOpen, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TalentDataCombined, getBoxLabel } from '@/app/dashboard/hooks/useTalentData';
import { TargetPosition, JOB_STANDARDS, SuccessionWeights } from '../../data/succession-constants';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface CandidateAnalysisViewProps {
    combinedData: TalentDataCombined[];
    positions: TargetPosition[];
}

export default function CandidateAnalysisView({ combinedData, positions }: CandidateAnalysisViewProps) {
    const [selectedPositionId, setSelectedPositionId] = useState<string>(positions[0]?.id || '');
    const selectedPosition = useMemo(() => positions.find(p => p.id === selectedPositionId), [positions, selectedPositionId]);
    
    // Standar Jabatan & Bobot
    const activeStandard = useMemo(() => {
        if (!selectedPosition) return JOB_STANDARDS['Fungsional'];
        return selectedPosition.customProfile ? { ...JOB_STANDARDS[selectedPosition.levelKey], ...selectedPosition.customProfile } : JOB_STANDARDS[selectedPosition.levelKey];
    }, [selectedPosition]);

    const weights: SuccessionWeights = selectedPosition?.weights || { kinerja: 30, potensi: 30, kompetensi: 25, portofolio: 15 };

    // --- CANDIDATE MATCHING LOGIC (UPDATED) ---
    const candidates = useMemo(() => {
        if (!selectedPosition) return [];
        // Filter staff aktif saja
        const pool = combinedData.filter(d => d.user.role !== 'super_admin' && d.user.status === 'aktif');

        return pool.map(candidate => {
            // 1. Kinerja & Potensi (Dari Assessment)
            const kinerja = candidate.assessment?.nilaiKinerja || 0;
            const potensi = candidate.assessment?.nilaiPotensi || 0;
            
            // Normalize ke skala 100 (dengan penalti jika di bawah standar)
            // Jika memenuhi standar minKinerja, skor 100. Jika lebih, dapat bonus max 120.
            const scoreKinerja = Math.min(120, (kinerja / activeStandard.minKinerja) * 100);
            const scorePotensi = Math.min(120, (potensi / activeStandard.minPotensi) * 100);

            // 2. Kompetensi (Dari Gap Analysis Real Data)
            // Logika sederhana: Base 60, ditambah 5 poin per diklat yang relevan. Max 100.
            // (Di versi lanjut, bisa filter diklat berdasarkan kategori yang match dengan requirement)
            const relevantDiklat = candidate.diklat.length; 
            const scoreKompetensi = Math.min(100, 60 + (relevantDiklat * 5)); 

            // 3. Portofolio (Penghargaan)
            const awards = candidate.penghargaan.length;
            const scorePortofolio = Math.min(100, 50 + (awards * 15));

            // 4. Kalkulasi Total dengan Bobot Dinamis
            const totalMatch = (
                (scoreKinerja * (weights.kinerja / 100)) + 
                (scorePotensi * (weights.potensi / 100)) + 
                (scoreKompetensi * (weights.kompetensi / 100)) + 
                (scorePortofolio * (weights.portofolio / 100))
            );

            let readiness = 'Perlu Pengembangan';
            let readinessColor = 'bg-red-100 text-red-700';
            
            if (totalMatch >= 90) {
                readiness = 'Siap Sekarang (Ready Now)';
                readinessColor = 'bg-green-100 text-green-800 border-green-200';
            } else if (totalMatch >= 75) {
                readiness = 'Siap Dalam Waktu Dekat';
                readinessColor = 'bg-blue-100 text-blue-800 border-blue-200';
            } else if (totalMatch >= 60) {
                readiness = 'Potensial (Jangka Panjang)';
                readinessColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
            }

            return {
                ...candidate,
                matchScore: Math.round(totalMatch),
                details: { scoreKinerja, scorePotensi, scoreKompetensi, scorePortofolio },
                readiness,
                readinessColor
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5); // Top 5 Candidates
    }, [combinedData, selectedPosition, activeStandard, weights]);

    const topCandidate = candidates[0];

    // Chart Data untuk Top Candidate
    const radarData = {
        labels: ['Kinerja', 'Potensi', 'Kompetensi', 'Portofolio'],
        datasets: [
            {
                label: 'Kriteria Jabatan (Ideal)',
                data: [100, 100, 100, 100], 
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                borderColor: 'rgba(148, 163, 184, 0.5)',
                borderDash: [5, 5],
            },
            {
                label: topCandidate ? topCandidate.user.namaLengkap : 'Kandidat',
                data: topCandidate ? [
                    topCandidate.details.scoreKinerja,
                    topCandidate.details.scorePotensi,
                    topCandidate.details.scoreKompetensi,
                    topCandidate.details.scorePortofolio
                ] : [0,0,0,0],
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgba(37, 99, 235, 1)',
                pointBackgroundColor: 'rgba(37, 99, 235, 1)',
            }
        ]
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar: Daftar Posisi */}
            <div className="lg:col-span-4 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Target size={16}/> Target Suksesi
                </h3>
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                        {positions.map(pos => (
                            <div 
                                key={pos.id} 
                                onClick={() => setSelectedPositionId(pos.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all relative group ${
                                    selectedPositionId === pos.id 
                                    ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-500 shadow-md ring-1 ring-blue-500' 
                                    : 'bg-card border-border hover:border-blue-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="text-[10px] bg-background">{pos.levelKey}</Badge>
                                    <Badge variant={pos.risk === 'High' ? 'destructive' : 'secondary'} className="text-[10px]">
                                        {pos.risk} Risk
                                    </Badge>
                                </div>
                                <h4 className="font-bold text-sm leading-tight mb-2">{pos.title}</h4>
                                {/* Display Weights Mini */}
                                <div className="flex gap-1 text-[9px] text-muted-foreground">
                                    <span className="bg-muted px-1 rounded">Kin: {pos.weights?.kinerja || 30}%</span>
                                    <span className="bg-muted px-1 rounded">Pot: {pos.weights?.potensi || 30}%</span>
                                    <span className="bg-muted px-1 rounded">Komp: {pos.weights?.kompetensi || 25}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Analysis */}
            <div className="lg:col-span-8 space-y-6">
                {selectedPosition ? (
                    <>
                        {/* Insight Card */}
                        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                    <Sparkles size={18} className="fill-current animate-pulse"/> 
                                    Analisis Kecocokan Kandidat (Smart Match)
                                </CardTitle>
                                <CardDescription>
                                    Peringkat berdasarkan bobot: Kinerja ({weights.kinerja}%), Potensi ({weights.potensi}%), Kompetensi ({weights.kompetensi}%), Portofolio ({weights.portofolio}%).
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        {/* Top Candidates List */}
                        <div className="space-y-3">
                            {candidates.map((cand, index) => (
                                <div key={cand.user.uid} className="group flex flex-col md:flex-row gap-4 p-4 rounded-xl border bg-card hover:border-blue-400 transition-all relative overflow-hidden">
                                     <div className={`absolute top-0 left-0 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10 shadow-sm ${index === 0 ? 'bg-green-600' : 'bg-slate-500'}`}>
                                        RANK #{index + 1}
                                    </div>
                                    <div className="flex items-center gap-4 md:w-[40%] pl-2 pt-4 md:pt-0">
                                        <Avatar className="h-12 w-12 border shadow-sm">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${cand.user.namaLengkap}`} />
                                            <AvatarFallback>{cand.user.namaLengkap.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-sm">{cand.user.namaLengkap}</p>
                                            <p className="text-xs text-muted-foreground">{cand.user.namaJabatan}</p>
                                            <Badge className={`mt-1 text-[10px] ${cand.readinessColor} border-0`}>{cand.readiness}</Badge>
                                        </div>
                                    </div>
                                    
                                    {/* Score Breakdown */}
                                    <div className="flex-1 grid grid-cols-4 gap-2 text-center items-center text-xs border-l border-dashed pl-4">
                                        <div>
                                            <span className="block text-muted-foreground text-[9px] uppercase">Kinerja</span>
                                            <span className="font-bold text-blue-600">{cand.details.scoreKinerja.toFixed(0)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-muted-foreground text-[9px] uppercase">Potensi</span>
                                            <span className="font-bold text-blue-600">{cand.details.scorePotensi.toFixed(0)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-muted-foreground text-[9px] uppercase">Komp.</span>
                                            <span className="font-bold text-blue-600">{cand.details.scoreKompetensi.toFixed(0)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-muted-foreground text-[9px] uppercase">Total</span>
                                            <span className="font-black text-lg text-green-600">{cand.matchScore}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Radar Chart for Top Candidate */}
                        <div className="mt-6 bg-card p-4 rounded-xl border border-border shadow-sm">
                            <h4 className="text-sm font-bold mb-4 text-center">Profil Kompetensi Kandidat Terbaik</h4>
                            <div className="h-[300px] w-full flex justify-center">
                                <Radar 
                                    data={radarData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            r: {
                                                angleLines: { display: true },
                                                suggestedMin: 0,
                                                suggestedMax: 100,
                                                ticks: { stepSize: 20, display: false }
                                            }
                                        },
                                        plugins: {
                                            legend: { position: 'bottom' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-muted/10 border-2 border-dashed rounded-xl">
                        <Target size={32} className="text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-bold">Pilih Jabatan Target</h3>
                        <p className="text-sm text-muted-foreground">Pilih posisi di sebelah kiri untuk melihat kandidat terbaik.</p>
                    </div>
                )}
            </div>
        </div>
    );
}