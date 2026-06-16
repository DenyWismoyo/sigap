/**
 * Directory: src/app/dashboard/talenta/page.tsx
 * History Update:
 * - 2024-11-28: Connected real data for Competency and Development tabs.
 */

"use client";

import React, { useState } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { useTalentData, TalentAssessment } from '@/app/dashboard/hooks/useTalentData';
import { UserProfile } from '@/types';
import { Award, LayoutGrid, List, AlertTriangle, Loader2, Users, GitMerge, BrainCircuit, GraduationCap } from 'lucide-react';
import dynamic from 'next/dynamic';

const DashboardTab = dynamic(() => import('./tabs/DashboardTab'), { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>, ssr: false });
const PegawaiTab = dynamic(() => import('./tabs/PegawaiTab'), { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>, ssr: false });
const TalentPoolTab = dynamic(() => import('./tabs/TalentPoolTab'), { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>, ssr: false });
const SuccessionTab = dynamic(() => import('./tabs/SuccessionTab'), { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>, ssr: false });
const CompetencyTab = dynamic(() => import('./tabs/CompetencyTab'), { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>, ssr: false });
const DevelopmentTab = dynamic(() => import('./tabs/DevelopmentTab'), { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>, ssr: false });

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; 
import AssessmentFormModal from './components/AssessmentFormModal';

export default function ManajemenTalentaPage() {
    const { userProfile, loading: authLoading } = useUserAuth();
    // [UPDATE] combinedData sekarang mengandung diklat & penghargaan
    const { combinedData, isLoading, saveAssessment } = useTalentData();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);
    const [selectedAssessment, setSelectedAssessment] = useState<TalentAssessment | undefined>(undefined);

    const handleAssessClick = (user: UserProfile, assessment?: TalentAssessment) => {
        setSelectedEmployee(user);
        setSelectedAssessment(assessment);
        setIsModalOpen(true);
    };

    const handleSave = async (data: TalentAssessment) => {
        await saveAssessment(data);
    };

    if (authLoading || isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10"/></div>;
    
    const canAccess = userProfile?.role === 'admin_opd' || userProfile?.role === 'super_admin' || userProfile?.additionalRoles?.includes('pengelola_tapem');

    if (!canAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-red-600">Akses Ditolak</h2>
                <p className="text-muted-foreground">Menu ini khusus untuk Pimpinan & Administrator Talenta.</p>
            </div>
        );
    }
    
    // Extract list pegawai
    const employeeList = combinedData.map(d => d.user);

    return (
        <div className="animate-fadeInUp pb-20 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Award size={32} className="mr-3 text-purple-600" />
                        Manajemen Talenta 360°
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Analisis komprehensif Kinerja, Potensi, Kompetensi, dan Pengembangan Karir.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto pb-2 mb-4">
                    <TabsList className="bg-muted p-1 rounded-lg inline-flex h-auto w-max">
                        <TabsTrigger value="dashboard" className="flex items-center gap-2 px-4 py-2">
                            <LayoutGrid size={16} /> Dashboard & 9-Box
                        </TabsTrigger>
                        <TabsTrigger value="kompetensi" className="flex items-center gap-2 px-4 py-2">
                            <BrainCircuit size={16} /> Analisis Kompetensi
                        </TabsTrigger>
                        <TabsTrigger value="pengembangan" className="flex items-center gap-2 px-4 py-2">
                            <GraduationCap size={16} /> Pengembangan & Diklat
                        </TabsTrigger>
                        <TabsTrigger value="pool" className="flex items-center gap-2 px-4 py-2">
                            <Users size={16} /> Talent Pool
                        </TabsTrigger>
                        <TabsTrigger value="succession" className="flex items-center gap-2 px-4 py-2">
                            <GitMerge size={16} /> Suksesi
                        </TabsTrigger>
                        <TabsTrigger value="pegawai" className="flex items-center gap-2 px-4 py-2">
                            <List size={16} /> Input Penilaian
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-2">
                    <TabsContent value="dashboard" className="mt-0 focus-visible:ring-0">
                        <DashboardTab combinedData={combinedData} onAssessClick={handleAssessClick} />
                    </TabsContent>
                    
                    <TabsContent value="kompetensi" className="mt-0 focus-visible:ring-0">
                        <CompetencyTab employees={employeeList} />
                    </TabsContent>

                    <TabsContent value="pengembangan" className="mt-0 focus-visible:ring-0">
                        {/* [UPDATE] Meneruskan seluruh combinedData agar bisa akses Diklat & Penghargaan */}
                        <DevelopmentTab combinedData={combinedData} />
                    </TabsContent>
                    
                    <TabsContent value="pool" className="mt-0 focus-visible:ring-0">
                        <TalentPoolTab combinedData={combinedData} />
                    </TabsContent>

                    <TabsContent value="succession" className="mt-0 focus-visible:ring-0">
                        <SuccessionTab combinedData={combinedData} />
                    </TabsContent>

                    <TabsContent value="pegawai" className="mt-0 focus-visible:ring-0">
                        <PegawaiTab combinedData={combinedData} onAssessClick={handleAssessClick} />
                    </TabsContent>
                </div>
            </Tabs>

            <AssessmentFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                employee={selectedEmployee}
                existingAssessment={selectedAssessment}
                onSave={handleSave}
                currentUserUid={userProfile!.uid}
            />
        </div>
    );
}