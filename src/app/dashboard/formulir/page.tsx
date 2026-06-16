// Lokasi: src/app/dashboard/formulir/page.tsx
// [REFACTOR UI & DARK MODE]
// - Menggunakan komponen Shadcn UI (Card, Input, Skeleton).
// - Menerapkan kelas semantik untuk Dark Mode (bg-card, text-foreground).
// - Mempercantik tampilan kartu dan loading state.

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, and, or } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { Formulir } from '@/types';
import { Edit, FileText, Search, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

// --- Impor Komponen Shadcn ---
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// --- Akhir Impor Shadcn ---

// Komponen Kartu Formulir (Refactored)
const FormCard = ({ form }: { form: Formulir }) => {
    return (
        <Link href={`/dashboard/formulir/${form.id}`} className="h-full block">
            <Card className="h-full flex flex-col justify-between transition-all hover:border-primary hover:shadow-md group cursor-pointer bg-card border-border">
                <CardHeader className="pb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <FileText size={20} />
                    </div>
                    <CardTitle className="text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {form.judul}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 mt-1.5">
                        {form.deskripsi || 'Klik untuk mengisi formulir ini.'}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 border-t border-border mt-auto">
                    <div className="w-full flex justify-between items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        <span>Isi Formulir</span>
                        <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
};

// Skeleton Loading
const FormSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="pt-4 border-t border-border">
                    <Skeleton className="h-4 w-1/3 ml-auto" />
                </div>
            </div>
        ))}
    </div>
);

export default function DaftarFormulirPage() {
    const { userProfile, actingJabatanProfile, loading: authLoading } = useUserAuth();
    const [formulirList, setFormulirList] = useState<Formulir[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!userProfile?.opdId || !actingJabatanProfile?.id || authLoading) {
            if (!authLoading && !userProfile) setLoading(false);
            return;
        }
        
        setLoading(true);
        const myJabatanId = actingJabatanProfile.id;

        // Query logika: (Published AND (Global OR Specific Jabatan OR Legacy null check))
        const q = query(
            collection(db, 'formulir'), 
            and(
                where('isPublished', '==', true),
                or(
                    and(
                        where('opdId', '==', userProfile.opdId),
                        where('assignmentType', '==', 'all_opd')
                    ),
                    and(
                        where('assignmentType', '==', 'specific_jabatan'),
                        where('assignedToJabatanIds', 'array-contains', myJabatanId)
                    ),
                    // Fallback untuk data lama
                    and(
                        where('opdId', '==', userProfile.opdId),
                        where('assignmentType', '==', null)
                    )
                )
            )
        );

        getDocs(q).then(snap => {
            const formulirData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Formulir));
            // Sort client-side
            formulirData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            
            setFormulirList(formulirData);
            setLoading(false);
        }).catch(err => {
            console.error("Gagal mengambil daftar formulir:", err);
            setLoading(false);
        });

    }, [userProfile, actingJabatanProfile, authLoading]);

    const filteredFormulir = useMemo(() => {
        return formulirList.filter(form => 
            form.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (form.deskripsi || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [formulirList, searchTerm]);

    if (authLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (!userProfile) {
         return (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card">
                <p className="text-destructive">Gagal memuat profil pengguna. Silakan login kembali.</p>
            </div>
         );
    }

    return (
        <div className="animate-fadeInUp pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Edit size={32} className="mr-3 text-blue-600" />
                        Isi Formulir Internal
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Pilih dan isi formulir digital yang ditugaskan kepada Anda.
                    </p>
                </div>
            </div>

            <div className="relative mb-8">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input 
                    type="text" 
                    placeholder="Cari formulir berdasarkan judul atau deskripsi..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10 h-12 text-base bg-card border-border focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {loading ? (
                <FormSkeleton />
            ) : filteredFormulir.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <FileText size={32} className="opacity-50"/>
                    </div>
                    <p className="font-semibold text-lg text-foreground">Tidak Ada Formulir Tersedia</p>
                    <p className="text-sm max-w-md mx-auto mt-1">
                        {searchTerm 
                            ? `Tidak ditemukan formulir dengan kata kunci "${searchTerm}".` 
                            : "Saat ini tidak ada formulir yang ditugaskan untuk jabatan atau OPD Anda."}
                    </p>
                    {searchTerm && (
                        <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
                            Bersihkan Pencarian
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFormulir.map(form => (
                        <FormCard key={form.id} form={form} />
                    ))}
                </div>
            )}
        </div>
    );
}