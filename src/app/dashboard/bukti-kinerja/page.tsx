// Lokasi: src/app/dashboard/bukti-kinerja/page.tsx
// [UPDATE] Menambahkan Tahun pada format nama sub-folder otomatis (Angka. Tahun Bulan - Bukti E Kinerja)

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { useGoogleDriveUploader } from '../hooks/useGoogleDriveUploader';
import { BuktiKinerja } from '@/types';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle, Link as LinkIcon, ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle, } from "@/components/ui/alert";
// --- Akhir Impor Shadcn ---


const RiwayatItem = ({ item }: { item: BuktiKinerja }) => {
    return (
        <a 
            href={item.googleDriveLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-blue-500 hover:bg-accent transition-all"
        >
            <div className="flex items-center gap-3 min-w-0">
                <FileText size={20} className="text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.judul}</p>
                    <p className="text-xs text-muted-foreground">
                        {item.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>
            <ExternalLink size={16} className="text-muted-foreground/70 group-hover:text-blue-600 ml-2 flex-shrink-0" />
        </a>
    );
};

export default function BuktiKinerjaPage() {
    const { userProfile } = useUserAuth();
    const { uploadFile, uploadStatus, errorMessage, isReady } = useGoogleDriveUploader();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [judul, setJudul] = useState('');
    const [file, setFile] = useState<File | null>(null);
    
    const [riwayatList, setRiwayatList] = useState<BuktiKinerja[]>([]);
    const [loadingRiwayat, setLoadingRiwayat] = useState(true);
    const [isRiwayatLoadingMore, setIsRiwayatLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const ITEMS_PER_PAGE = 10;

    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [uploadError, setUploadError] = useState(''); 

    const linkNotSet = !userProfile?.googleDriveReportLink;

    const fetchRiwayat = useCallback(async (loadMore = false) => {
        if (!userProfile?.uid) return;

        if (loadMore) {
            setIsRiwayatLoadingMore(true);
        } else {
            setLoadingRiwayat(true);
            setRiwayatList([]); 
            setLastVisible(null);
            setHasMore(true);
        }

        try {
            let q = query(
                collection(db, 'buktiKinerja'),
                where('userId', '==', userProfile.uid),
                orderBy('createdAt', 'desc'),
                limit(ITEMS_PER_PAGE)
            );

            if (loadMore && lastVisible) {
                q = query(q, startAfter(lastVisible));
            }

            const snapshot = await getDocs(q);
            const newRiwayat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BuktiKinerja));
            
            setRiwayatList(prev => loadMore ? [...prev, ...newRiwayat] : newRiwayat);
            
            if (snapshot.docs.length > 0) {
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            }
            
            setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);

        } catch (error) {
            console.error("Error fetching riwayat:", error);
        } finally {
            setLoadingRiwayat(false);
            setIsRiwayatLoadingMore(false);
        }
    }, [userProfile?.uid, lastVisible]);

    useEffect(() => {
        if (userProfile?.uid) {
            fetchRiwayat(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile?.uid]);

    // Fungsi inti untuk meng-handle upload
    const handleUpload = async (fileToUpload: File | Blob) => {
        if (linkNotSet) {
            setUploadError("Harap atur ID Folder Google Drive di profil Anda terlebih dahulu.");
            return;
        }
        if (!judul.trim()) {
            setUploadError("Judul Bukti Dukung wajib diisi.");
            return;
        }
        const isFileInstance = fileToUpload instanceof File;

        setIsProcessing(true);
        setSuccessMessage('');
        setUploadError(''); 

        try {
            const dateObj = new Date();
            const dateStr = dateObj.toISOString().split('T')[0].replace(/-/g, '');
            const safeJudul = judul.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50).trim();
            
            let fileExtension = '.jpg'; 
            if (isFileInstance && fileToUpload.name) {
                const parts = fileToUpload.name.split('.');
                if (parts.length > 1) {
                    fileExtension = '.' + parts.pop();
                }
            }
            const finalFileName = `${dateStr} - ${safeJudul}${fileExtension}`;

            // --- [UPDATE] GENERATE NAMA SUB FOLDER ---
            // Format Lama: "1. Januari - Bukti E Kinerja"
            // Format Baru: "1. 2025 Januari - Bukti E Kinerja"
            const monthIndex = dateObj.getMonth() + 1; // 1-12
            const monthName = dateObj.toLocaleString('id-ID', { month: 'long' });
            const year = dateObj.getFullYear();
            const subFolderName = `${monthIndex}. ${year} ${monthName} - Bukti E Kinerja`;
            // ---

            const link = await uploadFile(
                fileToUpload, 
                finalFileName, 
                userProfile!.googleDriveReportLink,
                subFolderName // Kirim nama sub folder ke uploader
            );

            if (link && userProfile) {
                await addDoc(collection(db, 'buktiKinerja'), {
                    userId: userProfile.uid,
                    opdId: userProfile.opdId,
                    judul: judul,
                    googleDriveLink: link,
                    fileName: finalFileName,
                    fileType: fileToUpload.type,
                    createdAt: Timestamp.now(),
                } as Omit<BuktiKinerja, 'id'>);
                
                setSuccessMessage(`File berhasil diunggah ke folder "${subFolderName}"!`);
                setJudul('');
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                
                fetchRiwayat(false); 
            } else {
                throw new Error(errorMessage || "Upload Gagal. Link tidak diterima.");
            }
        } catch (err: any) {
            console.error("Upload process error:", err);
            setUploadError(err.message || "Gagal mengunggah file.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setUploadError("Silakan pilih file terlebih dahulu.");
            return;
        }
        await handleUpload(file);
    };

    const isUploadDisabled = isProcessing || !judul.trim() || !file || !isReady || linkNotSet;

    return (
        <div className="animate-fadeInUp">
            <h1 className="text-3xl font-bold text-foreground flex items-center mb-6">
                <Upload size={28} className="mr-3 text-blue-600"/> Upload Bukti Dukung E-Kinerja
            </h1>
            
            {linkNotSet && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" /> 
                    <AlertTitle>Folder Google Drive Belum Diatur</AlertTitle>
                    <AlertDescription>
                        Anda harus mengatur **ID Folder Google Drive** di halaman <Link href="/dashboard/profil" className="font-bold underline hover:text-yellow-600">Profil</Link> Anda sebelum dapat menggunakan fitur ini.
                    </AlertDescription>
                </Alert>
            )}

            <div className="p-6 bg-card rounded-xl shadow-md border border-border">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="judul">Judul Bukti Dukung</Label>
                        <Input 
                            id="judul"
                            type="text" 
                            value={judul} 
                            onChange={e => setJudul(e.target.value)} 
                            placeholder="Contoh: Laporan Kegiatan Harian"
                            disabled={isProcessing || linkNotSet}
                            required 
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">File akan otomatis masuk ke folder bulan ini (cth: 11. 2025 November - Bukti E Kinerja).</p>
                    </div>

                    <div>
                        <Label htmlFor="file-upload">Pilih File / Ambil Foto</Label>
                        <Input 
                            id="file-upload"
                            type="file" 
                            ref={fileInputRef}
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            capture="environment"
                            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                            className="mt-1"
                            disabled={isProcessing || linkNotSet}
                        />
                    </div>
                    
                    {uploadStatus === 'uploading' && (
                        <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <AlertDescription>Mengunggah file ke folder E-Kinerja...</AlertDescription>
                        </Alert>
                    )}
                    
                    {uploadError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{uploadError}</AlertDescription>
                        </Alert>
                    )}
                    {errorMessage && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}
                    {successMessage && (
                        <Alert variant="default" className="bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>{successMessage}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <Button 
                            type="submit" 
                            disabled={isUploadDisabled}
                            className="w-full flex-1"
                        >
                            <Upload size={16} className="mr-2"/> Upload
                        </Button>
                    </div>
                </form>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">Riwayat Upload Saya</h2>
                {loadingRiwayat ? (
                    <p className="text-center text-muted-foreground">Memuat riwayat...</p>
                ) : riwayatList.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 bg-card rounded-lg border border-dashed border-border">
                        Belum ada bukti dukung yang diunggah.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {riwayatList.map(item => (
                            <RiwayatItem key={item.id} item={item} />
                        ))}
                    </div>
                )}
                
                {hasMore && (
                    <div className="flex justify-center mt-6">
                        <Button
                            onClick={() => fetchRiwayat(true)}
                            disabled={isRiwayatLoadingMore}
                            variant="outline"
                        >
                            <ChevronDown size={16} className="mr-2" />
                            {isRiwayatLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}