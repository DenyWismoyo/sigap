// Lokasi: src/app/dashboard/formulir/[formId]/responses/page.tsx
// [REFACTOR]
// - Menambahkan kartu ringkasan statistik.
// - Mempercantik tabel data dengan scroll area.
// - Dark mode support.

"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { Formulir, FormulirResponse } from '@/types';
import { Loader2, AlertCircle, ArrowLeft, Download, ExternalLink, Users, Clock, FileText } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

// --- Impor Shadcn ---
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function FormResponsesPage() {
    const params = useParams();
    const { userProfile, loading: authLoading } = useUserAuth();

    const [form, setForm] = useState<Formulir | null>(null);
    const [responses, setResponses] = useState<FormulirResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const formId = params.formId as string;
    const isAdmin = userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu' || userProfile?.role === 'super_admin';

    useEffect(() => {
        if (!formId || !userProfile || !isAdmin) {
            if (!authLoading && !isAdmin) setError("Anda tidak memiliki izin untuk melihat halaman ini.");
            setLoading(false);
            return;
        }

        const fetchForm = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'formulir', formId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().opdId === userProfile.opdId) {
                    setForm({ id: docSnap.id, ...docSnap.data() } as Formulir);
                } else {
                    setError("Formulir tidak ditemukan atau Anda tidak memiliki akses.");
                }
            } catch (err) {
                console.error(err);
                setError("Gagal memuat formulir.");
            }
        };
        fetchForm();
    }, [formId, userProfile, isAdmin, authLoading]);

    useEffect(() => {
        if (!form) return;

        const q = query(
            collection(db, 'formulirResponse'),
            where('formId', '==', form.id),
            orderBy('submittedAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormulirResponse)));
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError("Gagal memuat respon.");
            setLoading(false);
        });

        return () => unsub();
    }, [form]);

    const handleExport = () => {
        if (!form || responses.length === 0) return;

        const headers = ['Waktu Submit', 'Pengisi', ...form.fields.map(f => f.label)];
        const data = responses.map(res => {
            const row: any = {
                'Waktu Submit': res.submittedAt.toDate().toLocaleString('id-ID'),
                'Pengisi': res.submittedByName,
            };
            form.fields.forEach(field => {
                const value = res.data[field.id];
                if (Array.isArray(value)) {
                    row[field.label] = value.join(', ');
                } else {
                    row[field.label] = value;
                }
            });
            return row;
        });

        const ws = utils.json_to_sheet(data, { header: headers });
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Respon");
        writeFile(wb, `Respon_${form.judul.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
    };

    if (loading || authLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (error) return (
        <div className="p-8 text-center">
            <div className="inline-block p-4 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 mb-4"><AlertCircle size={32} /></div>
            <h2 className="text-xl font-bold mb-2">{error}</h2>
            <Button variant="outline" asChild><Link href="/dashboard/form-builder">Kembali</Link></Button>
        </div>
    );
    
    if (!form) return null;

    return (
        <div className="max-w-7xl mx-auto animate-fadeInUp pb-20">
            <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent">
                <Link href="/dashboard/form-builder" className="flex items-center text-muted-foreground hover:text-primary">
                    <ArrowLeft size={16} className="mr-2" /> Kembali ke Pengelola
                </Link>
            </Button>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{form.judul}</h1>
                    <p className="text-muted-foreground mt-1">Analisis respon yang masuk secara real-time.</p>
                </div>
                <Button onClick={handleExport} disabled={responses.length === 0} className="bg-green-600 hover:bg-green-700">
                    <Download size={18} className="mr-2" /> Export Excel
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6 flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600"><Users size={24}/></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Respon</p>
                            <h3 className="text-2xl font-bold">{responses.length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center space-x-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600"><Clock size={24}/></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Respon Terakhir</p>
                            <h3 className="text-sm font-bold">
                                {responses.length > 0 ? responses[0].submittedAt.toDate().toLocaleDateString('id-ID') : '-'}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center space-x-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600"><FileText size={24}/></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Jumlah Pertanyaan</p>
                            <h3 className="text-2xl font-bold">{form.fields.length}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="overflow-hidden border-border">
                <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-lg">Data Tabel Respon</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {responses.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <p>Belum ada data respon untuk ditampilkan.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px] bg-background sticky top-0">Waktu Submit</TableHead>
                                        <TableHead className="w-[200px] bg-background sticky top-0">Pengisi</TableHead>
                                        {form.fields.map(field => (
                                            <TableHead key={field.id} className="min-w-[200px] bg-background sticky top-0">{field.label}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {responses.map(res => (
                                        <TableRow key={res.id}>
                                            <TableCell className="font-medium whitespace-nowrap">{res.submittedAt.toDate().toLocaleString('id-ID')}</TableCell>
                                            <TableCell>{res.submittedByName}</TableCell>
                                            {form.fields.map(field => {
                                                const data = res.data[field.id];
                                                return (
                                                    <TableCell key={field.id}>
                                                        {field.tipe === 'Upload File' && data ? (
                                                            <Button asChild variant="link" className="p-0 h-auto text-blue-600">
                                                                <a href={data} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                                                    <ExternalLink size={14} /> Lihat File
                                                                </a>
                                                            </Button>
                                                        ) : Array.isArray(data) ? (
                                                            <span className="inline-flex flex-wrap gap-1">
                                                                {data.map((item, i) => (
                                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs border">{item}</span>
                                                                ))}
                                                            </span>
                                                        ) : (
                                                            <span className="line-clamp-2" title={String(data)}>{data}</span>
                                                        )}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}