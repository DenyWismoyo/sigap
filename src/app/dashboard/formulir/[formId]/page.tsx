// Lokasi: src/app/dashboard/formulir/[formId]/page.tsx
// [REFACTOR TOTAL]
// - Dark Mode full support.
// - Validasi form yang lebih cantik.
// - Tombol Reset.
// - File input yang lebih rapi.

"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { useGoogleDriveUploader } from '@/app/dashboard/hooks/useGoogleDriveUploader';
import { useUserAuth } from '@/context/AuthContext';
import { Formulir, FormulirField, FormulirResponse } from '@/types';
import { Loader2, Send, CheckCircle, AlertCircle, ArrowLeft, RotateCcw, FileText } from 'lucide-react';
import Link from 'next/link';

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Komponen Field
const FormField = ({ field, value, onChange, onFileChange }: {
    field: FormulirField,
    value: any,
    onChange: (fieldId: string, value: any) => void,
    onFileChange: (fieldId: string, file: File | null) => void
}) => {
    const label = field.label;
    // Label styling yang konsisten
    const labelComponent = (
        <Label className="text-sm font-semibold text-foreground mb-2 block">
            {label} {field.required && <span className="text-red-500">*</span>}
        </Label>
    );

    switch (field.tipe) {
        case 'Teks Singkat':
            return (
                <div className="space-y-1">
                    {labelComponent}
                    <Input type="text" value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} required={field.required} className="bg-background" />
                </div>
            );
        case 'Teks Panjang':
            return (
                <div className="space-y-1">
                    {labelComponent}
                    <Textarea value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} rows={4} required={field.required} className="bg-background" />
                </div>
            );
        case 'Tanggal':
            return (
                <div className="space-y-1">
                    {labelComponent}
                    <Input type="date" value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} required={field.required} className="w-full md:w-auto bg-background" />
                </div>
            );
        case 'Pilihan Ganda':
            return (
                <div className="space-y-1">
                    {labelComponent}
                    <Select value={value || ''} onValueChange={(v) => onChange(field.id, v)} required={field.required}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih satu..." /></SelectTrigger>
                        <SelectContent>
                            {field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            );
        case 'Checkbox':
            return (
                <div className="space-y-2">
                    {labelComponent}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg border border-border bg-muted/30">
                        {field.options?.map(opt => (
                            <div key={opt} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${field.id}-${opt}`}
                                    checked={(value as string[] || []).includes(opt)}
                                    onCheckedChange={(checked) => {
                                        const currentVal = (value as string[] || []);
                                        const newVal = checked ? [...currentVal, opt] : currentVal.filter(v => v !== opt);
                                        onChange(field.id, newVal);
                                    }}
                                />
                                <Label htmlFor={`${field.id}-${opt}`} className="font-normal cursor-pointer text-foreground">{opt}</Label>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'Upload File':
            return (
                <div className="space-y-1">
                    {labelComponent}
                    <div className="flex items-center gap-3">
                        <Input
                            type="file"
                            onChange={(e) => onFileChange(field.id, e.target.files ? e.target.files[0] : null)}
                            className="cursor-pointer bg-background file:bg-primary/10 file:text-primary file:border-0 file:rounded-full file:px-4 file:text-xs hover:file:bg-primary/20 transition-all"
                            required={field.required}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Format yang didukung: PDF, Gambar, Docx. Max 10MB.</p>
                </div>
            );
        default:
            return null;
    }
};

export default function FillFormPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useUserAuth();
    const { uploadFile, uploadStatus, errorMessage: uploadError } = useGoogleDriveUploader();

    const [form, setForm] = useState<Formulir | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [formData, setFormData] = useState<{ [fieldId: string]: any }>({});
    const [fileData, setFileData] = useState<{ [fieldId: string]: File | null }>({});

    const formId = params.formId as string;

    useEffect(() => {
        if (!formId) return;
        const fetchForm = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'formulir', formId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setForm({ id: docSnap.id, ...docSnap.data() } as Formulir);
                } else {
                    setError("Formulir tidak ditemukan atau sudah dihapus.");
                }
            } catch (err) {
                console.error(err);
                setError("Gagal memuat formulir.");
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [formId]);

    const handleFormChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleFileChange = (fieldId: string, file: File | null) => {
        setFileData(prev => ({ ...prev, [fieldId]: file }));
    };

    const handleReset = () => {
        if (confirm("Yakin ingin mengosongkan formulir?")) {
            setFormData({});
            setFileData({});
            window.scrollTo(0,0);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form || !userProfile) return;
        setIsSubmitting(true);
        setError('');
        setSubmitSuccess(false);

        try {
            const finalData: { [fieldId: string]: any } = { ...formData };
            
            // 1. Upload File ke G-Drive (jika ada)
            const folderId = form.googleDriveFolderId;
            const fileFields = form.fields.filter(f => f.tipe === 'Upload File');
            
            if (fileFields.length > 0) {
                 if(!folderId) throw new Error("Konfigurasi folder upload tidak valid.");
                 
                 for (const field of fileFields) {
                    const fieldId = field.id;
                    const file = fileData[fieldId];
                    if (field.required && !file) throw new Error(`File wajib diupload untuk: ${field.label}`);

                    if (file) {
                        const fieldLabel = field.label || 'file';
                        const fileName = `${userProfile.nip}_${fieldLabel.replace(/\s+/g, '_')}_${file.name}`;
                        const link = await uploadFile(file, fileName, folderId);
                        if (link) {
                            finalData[fieldId] = link; 
                        } else {
                            throw new Error(uploadError || `Gagal mengunggah file "${field.label}"`);
                        }
                    }
                }
            }

            // 2. Simpan Respon
            const responsePayload: Omit<FormulirResponse, 'id'> = {
                formId: form.id!,
                opdId: form.opdId,
                submittedBy: userProfile.uid,
                submittedByName: userProfile.namaLengkap,
                submittedAt: Timestamp.now(),
                data: finalData,
            };
            
            await addDoc(collection(db, 'formulirResponse'), responsePayload);
            setSubmitSuccess(true);
            setFormData({});
            setFileData({});

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Gagal mengirimkan respon.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || authLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    if (error) return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Terjadi Kesalahan</h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
            <Button variant="link" asChild className="mt-4"><Link href="/dashboard">Kembali ke Dashboard</Link></Button>
        </div>
    );

    if (submitSuccess) return (
        <div className="max-w-md mx-auto mt-10">
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h1 className="text-2xl font-bold text-foreground">Terima Kasih!</h1>
                    <p className="text-muted-foreground mt-2">Respon Anda untuk "{form?.judul}" telah berhasil disimpan.</p>
                    <div className="flex gap-2 mt-6">
                        <Button onClick={() => { setSubmitSuccess(false); router.back(); }} variant="outline">Kembali</Button>
                        <Button onClick={() => setSubmitSuccess(false)}>Isi Lagi</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
    
    const isLoading = isSubmitting || uploadStatus === 'uploading';

    return (
        <div className="max-w-3xl mx-auto py-6 animate-fadeInUp">
            <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                <Link href="/dashboard"><ArrowLeft size={16} className="mr-2" /> Kembali ke Dashboard</Link>
            </Button>
            
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-3xl">{form?.judul}</CardTitle>
                    {form?.deskripsi && <CardDescription className="text-base mt-2">{form.deskripsi}</CardDescription>}
                </CardHeader>
                <Separator />
                <CardContent className="p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {form?.fields.sort((a,b) => {
                             // Sort basic string id (field_TIMESTAMP)
                             const timeA = parseInt(a.id.split('_')[1]) || 0;
                             const timeB = parseInt(b.id.split('_')[1]) || 0;
                             return timeA - timeB;
                        }).map(field => (
                            <FormField
                                key={field.id}
                                field={field}
                                value={formData[field.id]}
                                onChange={handleFormChange}
                                onFileChange={handleFileChange}
                            />
                        ))}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {uploadStatus === 'uploading' && (
                             <Alert className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <AlertTitle>Mengunggah...</AlertTitle>
                                <AlertDescription>Mohon tunggu sebentar, sedang mengunggah file Anda.</AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="flex items-center gap-3 pt-4">
                            <Button type="submit" disabled={isLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-lg h-12 px-8">
                                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                                Kirim Jawaban
                            </Button>
                            <Button type="button" variant="ghost" onClick={handleReset} disabled={isLoading} className="text-muted-foreground">
                                <RotateCcw className="mr-2 h-4 w-4" /> Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="bg-muted/30 py-3 text-xs text-muted-foreground text-center justify-center">
                     Formulir Internal SIGAP - Jangan bagikan password Anda melalui formulir ini.
                </CardFooter>
            </Card>
        </div>
    );
}