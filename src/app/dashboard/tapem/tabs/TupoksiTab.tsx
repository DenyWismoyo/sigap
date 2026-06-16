"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, CheckCircle2, Building2, FileText, Activity, Map, Handshake } from 'lucide-react';

export default function TupoksiTab() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Hero Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-md">
                <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                        <BookOpen className="w-12 h-12 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Tugas Pokok & Fungsi (TUPOKSI)</h2>
                        <p className="text-blue-100 leading-relaxed max-w-3xl">
                            Bagian Tata Pemerintahan mempunyai tugas melaksanakan penyiapan perumusan kebijakan daerah, 
                            mengoordinasikan perangkat daerah, melaksanakan pemantauan dan evaluasi kebijakan, 
                            serta membina administrasi pemerintahan dan kewilayahan, kerja sama, dan otonomi daerah.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Rincian Fungsi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Kebijakan & Koordinasi */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <FileText className="w-5 h-5" /> Perumusan Kebijakan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Menyiapkan bahan perumusan kebijakan teknis di bidang administrasi pemerintahan, kewilayahan, dan kerja sama.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Mengoordinasikan penyusunan produk hukum daerah terkait tata pemerintahan (Perda/Perwal).
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Koordinasi Perangkat Daerah */}
                <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <Building2 className="w-5 h-5" /> Koordinasi Perangkat Daerah
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Mengoordinasikan pelaksanaan tugas perangkat daerah dalam penyelenggaraan pemerintahan umum.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Memfasilitasi penyelesaian permasalahan penyelenggaraan pemerintahan di tingkat Kecamatan dan Kelurahan.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Pemantauan & Evaluasi */}
                <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                            <Activity className="w-5 h-5" /> Pemantauan & Evaluasi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Melaksanakan pemantauan dan evaluasi pelaksanaan kebijakan daerah di bidang pemerintahan.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Menyusun laporan kinerja penyelenggaraan pemerintahan daerah (LPPD) dan LKPJ.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Pembinaan Kewilayahan & Kerja Sama */}
                <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                            <Map className="w-5 h-5" /> Kewilayahan & Kerja Sama
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Membina administrasi kewilayahan, batas daerah, dan penamaan rupa bumi.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Memfasilitasi dan mengelola kerja sama daerah (dalam negeri, luar negeri, dan pihak ketiga).
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}