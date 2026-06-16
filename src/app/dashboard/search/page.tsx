// Lokasi: src/app/dashboard/search/page.tsx
// [MODIFIKASI]
// - Mengganti semua kelas hardcoded (bg-gray-50, text-gray-900, dark:...)
//   dengan kelas semantik shadcn/ui (bg-card, text-foreground, text-muted-foreground)
//   untuk implementasi dark mode yang benar.
// - Memperbaiki path impor.

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, or, limit } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { Surat, UserProfile } from '@/types';
import { FileText, User as UserIcon, Search, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// [MODIFIKASI] Komponen item hasil pencarian dengan styling shadcn
const SearchResultItem = ({ href, icon, title, subtitle }: { href: string, icon: React.ReactNode, title: string, subtitle: string }) => (
    <Link href={href} className="block">
        <div className="flex items-center p-4 bg-card rounded-lg hover:bg-accent border border-border transition-colors">
            <div className="mr-4 text-primary">{icon}</div>
            <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
        </div>
    </Link>
);

// [MODIFIKASI] Skeleton untuk loading
const SearchSkeleton = () => (
    <div className="grid grid-cols-1 gap-4">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-4 bg-card rounded-lg border border-border">
                <Skeleton className="h-10 w-10 rounded-full mr-4" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        ))}
    </div>
);


function SearchComponent() {
    const searchParams = useSearchParams();
    const { userProfile } = useUserAuth();

    const [results, setResults] = useState<{ surat: Surat[], pengguna: UserProfile[] }>({ surat: [], pengguna: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const searchTerm = searchParams.get('q') || '';

    useEffect(() => {
        if (!searchTerm || !userProfile) {
            setLoading(false);
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            setError('');
            setResults({ surat: [], pengguna: [] });

            try {
                const searchLower = searchTerm.toLowerCase();
                const searchTokens = searchLower.split(/\s+/).filter(Boolean).slice(0, 10);

                let suratQuery;
                const suratCollectionRef = collection(db, 'surat');

                const baseQuery = userProfile.role === 'super_admin'
                    ? suratCollectionRef
                    : query(suratCollectionRef, where('opdId', '==', userProfile.opdId));

                if (searchTokens.length > 0) {
                    suratQuery = query(
                        baseQuery, 
                        where('searchKeywords', 'array-contains-any', searchTokens),
                        limit(30)
                    );
                } else {
                    suratQuery = query(baseQuery, limit(30));
                }
                
                const suratSnapshot = await getDocs(suratQuery);
                const filteredSurat = suratSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Surat));
                
                // (Pencarian pengguna tetap non-aktif untuk performa)
                let filteredPengguna: UserProfile[] = [];
                
                setResults({
                    surat: filteredSurat,
                    pengguna: filteredPengguna,
                });

            } catch (err: any) {
                console.error("Gagal melakukan pencarian:", err);
                setError("Terjadi kesalahan saat mencari data. Pastikan indeks Firestore telah dibuat jika diminta oleh pesan error di konsol.");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [searchTerm, userProfile]);

    if (!searchTerm) {
        // [MODIFIKASI] Styling dark mode
        return <p className="text-center text-muted-foreground">Silakan masukkan kata kunci di bilah pencarian di atas.</p>;
    }
    
    if (error) {
        return <p className="text-center text-red-600">{error}</p>;
    }

    const totalResults = results.surat.length + results.pengguna.length;

    return (
        <div>
            {/* [MODIFIKASI] Styling dark mode */}
            <h1 className="text-3xl font-bold text-foreground">Hasil Pencarian</h1>
            <p className="mt-2 text-muted-foreground">
                Ditemukan {totalResults} hasil untuk kata kunci <span className="font-semibold text-foreground">"{searchTerm}"</span>
            </p>
            
            {loading ? (
                <div className="mt-8 space-y-8">
                    <SearchSkeleton />
                </div>
            ) : totalResults === 0 ? (
                // [MODIFIKASI] Styling dark mode
                <div className="mt-8 text-center text-muted-foreground bg-card p-8 rounded-lg border border-dashed border-border">
                    <Search size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                    <p>Tidak ada hasil yang ditemukan.</p>
                    <p className="text-sm">Coba gunakan kata kunci yang berbeda.</p>
                </div>
            ) : (
                <div className="mt-8 space-y-8">
                    {results.surat.length > 0 && (
                        <section>
                            {/* [MODIFIKASI] Styling dark mode */}
                            <h2 className="text-xl font-semibold text-foreground mb-4">Surat Ditemukan ({results.surat.length})</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {results.surat.map(surat => (
                                    <SearchResultItem 
                                        key={surat.id}
                                        href={`/dashboard/surat/${surat.id}`}
                                        icon={<FileText size={24} />}
                                        title={surat.perihal}
                                        subtitle={`Nomor: ${surat.nomorSurat} | Dari: ${surat.pengirim}`}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {userProfile?.role === 'super_admin' && results.pengguna.length > 0 && (
                        <section>
                            {/* [MODIFIKASI] Styling dark mode */}
                            <h2 className="text-xl font-semibold text-foreground mb-4">Pengguna Ditemukan ({results.pengguna.length})</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {results.pengguna.map(pengguna => (
                                    <SearchResultItem 
                                        key={pengguna.id}
                                        href={`/dashboard/users`}
                                        icon={<UserIcon size={24} />}
                                        title={pengguna.namaLengkap}
                                        subtitle={`Email: ${pengguna.email}`}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                Memuat...
            </div>
        }>
            <SearchComponent />
        </Suspense>
    );
}