// Lokasi: src/app/dashboard/surat/upload/page.tsx
// [UPDATE] Mendaftarkan Pimpinan Tertinggi secara otomatis pada 'terlibatJabatanIds' saat upload default.
// [UPDATE] Implementasi Anti-Spam Rate Limiter di sisi Klien (UI Cooldown).
// [UPDATE CLOUD FUNCTION] Memindahkan proses request Gemini API ke Backend (Firebase Cloud Functions).
// [UPDATE KEAMANAN] Menambahkan validasi Human Check (Math CAPTCHA) sebelum eksekusi AI.

"use client";

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Surat } from '@/types';
import Link from 'next/link';
import { daftarPengirimSurat } from '@/data/pengirimSurat';
import Script from 'next/script';
import { Lock, Upload, Sparkles, Loader2, CheckCircle, CloudOff, FileText, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { savePendingSurat } from '@/lib/offlineSync';
import { useMasterData } from '@/app/dashboard/hooks/useMasterData'; 

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// --- Akhir Impor Shadcn ---

const UploadIcon = () => (
    <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
    </svg>
);

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

// Konstanta Jeda Waktu (Harus sinkron atau sedikit lebih lama dari Backend)
const AI_COOLDOWN_SECONDS = 30;

function UploadSuratComponent() {
  const { userProfile, opdConfig, loading: authLoading } = useUserAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams(); 
  
  const { jabatanMap } = useMasterData(true);
  
  const [nomorSurat, setNomorSurat] = useState('');
  const [perihal, setPerihal] = useState('');
  const [pengirim, setPengirim] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [klasifikasi, setKlasifikasi] = useState<'Biasa' | 'Penting' | 'Segera' | 'Rahasia'>('Biasa');
  const [jenisSurat, setJenisSurat] = useState<Surat['jenisSurat']>('Lainnya');
  const [tujuanJabatanId, setTujuanJabatanId] = useState<string>('none'); 
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [tanggalAgenda, setTanggalAgenda] = useState('');
  const [jamAgenda, setJamAgenda] = useState('');
  const [jamSelesaiAgenda, setJamSelesaiAgenda] = useState('');
  const [lokasiAcara, setLokasiAcara] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [isPdfJsReady, setIsPdfJsReady] = useState(false);
  const [isCheckingShare, setIsCheckingShare] = useState(true); 

  // [TAMBAHAN] State untuk Cooldown Timer AI
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // [TAMBAHAN] State untuk Math CAPTCHA
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [mathChallenge, setMathChallenge] = useState<{text: string, answer: number} | null>(null);
  const [userMathAnswer, setUserMathAnswer] = useState('');
  const [mathError, setMathError] = useState('');

  const isAiReaderEnabled = useMemo(() => {
    if (userProfile?.role === 'super_admin') return true;
    return opdConfig?.features?.aiSuratReader ?? false;
  }, [opdConfig, userProfile]);

  const canAccess = useMemo(() => {
      if (!userProfile) return false;
      if (['admin_opd', 'staf_tu', 'super_admin'].includes(userProfile.role)) return true;
      if (userProfile.additionalRoles?.includes('operator_surat')) return true;
      return false;
  }, [userProfile]);

  const pimpinanList = useMemo(() => {
      if (!userProfile?.opdId) return [];
      return Array.from(jabatanMap.values()).filter(
          j => j.opdId === userProfile.opdId && j.level <= 5 && j.status === 'aktif'
      ).sort((a, b) => a.level - b.level);
  }, [jabatanMap, userProfile]);

  // Pengecekan Cooldown di localStorage saat komponen dimount
  useEffect(() => {
      if (!userProfile?.uid) return;
      
      const lastCall = localStorage.getItem(`ai_last_call_${userProfile.uid}`);
      if (lastCall) {
          const timeElapsed = Math.floor((Date.now() - parseInt(lastCall)) / 1000);
          if (timeElapsed < AI_COOLDOWN_SECONDS) {
              setCooldownRemaining(AI_COOLDOWN_SECONDS - timeElapsed);
          }
      }
  }, [userProfile?.uid]);

  // Effect untuk menjalankan hitung mundur cooldown
  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (cooldownRemaining > 0) {
          interval = setInterval(() => {
              setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0));
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (isCheckingShare) {
       const sharedTitle = searchParams.get('perihal');
       const sharedText = searchParams.get('tambahan_perihal');
       let combinedText = '';
       if (sharedTitle) combinedText += sharedTitle;
       if (sharedText) combinedText += `\n${sharedText}`;
       if (combinedText) {
           setPerihal(combinedText.trim());
       }
       setIsCheckingShare(false); 
    }
  }, [searchParams, isCheckingShare]);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      if (files[0].type !== "application/pdf") {
        addToast("File harus berformat PDF.", "error");
        setAnalysisSuccess(false);
        return;
      }
      if (files[0].size > 5 * 1024 * 1024) { 
        addToast("Ukuran file maksimal adalah 5MB.", "error");
        setAnalysisSuccess(false);
        return;
      }
      setFile(files[0]);
      setAnalysisSuccess(false);
      setOfflineMessage('');
    }
  };

  // --- LOGIKA MATH CAPTCHA ---
  const generateMathQuestion = () => {
    const operations = ['+', '-', '*', '/'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let num1 = 0, num2 = 0, answer = 0, text = '';

    switch (op) {
      case '+':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        text = `Berapa hasil dari ${num1} + ${num2}?`;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 20) + 10; // num1 selalu lebih besar
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        text = `Berapa hasil dari ${num1} - ${num2}?`;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        text = `Berapa hasil dari ${num1} x ${num2}?`;
        break;
      case '/':
        num2 = Math.floor(Math.random() * 9) + 2; // Hindari bagi 1 atau 0
        answer = Math.floor(Math.random() * 10) + 1;
        num1 = num2 * answer;
        text = `Berapa hasil dari ${num1} dibagi ${num2}?`;
        break;
    }
    setMathChallenge({ text, answer });
    setUserMathAnswer('');
    setMathError('');
  };

  const openMathChallenge = () => {
    if (cooldownRemaining > 0) {
        addToast(`Sistem Anti-Spam aktif. Tunggu ${cooldownRemaining} detik lagi.`, "error");
        return;
    }
    if (!file) {
      addToast("Silakan pilih file PDF terlebih dahulu.", "error");
      return;
    }
    if (!isPdfJsReady || !window.pdfjsLib) {
      addToast("Pustaka PDF sedang disiapkan, mohon tunggu sebentar...", "info");
      return;
    }
    
    generateMathQuestion();
    setIsMathModalOpen(true);
  };

  const verifyMathChallenge = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (parseInt(userMathAnswer) === mathChallenge?.answer) {
        setIsMathModalOpen(false);
        handleAutoRead(); // Jika benar, jalankan AI
    } else {
        setMathError('Jawaban salah. Sistem memberikan soal baru.');
        generateMathQuestion(); // Acak soal baru jika salah
    }
  };
  // ---------------------------
  
  const handleAutoRead = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisSuccess(false);

    // Set waktu mulai panggilan (Anti-Spam Klien)
    if (userProfile?.uid) {
        localStorage.setItem(`ai_last_call_${userProfile.uid}`, Date.now().toString());
        setCooldownRemaining(AI_COOLDOWN_SECONDS);
    }

    try {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = async (event) => {
        if (!event.target?.result) {
            setIsAnalyzing(false);
            throw new Error("Gagal membaca file.");
        }
        
        try {
            const pdfjsLib = window.pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

            const pdf = await pdfjsLib.getDocument(event.target.result as ArrayBuffer).promise;
            const page = await pdf.getPage(1);
            
            // Turunkan skala rendering PDF menjadi 1.0 (Resolusi standar)
            const viewport = page.getViewport({ scale: 1.0 }); 
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) throw new Error("Gagal membuat konteks kanvas.");

            await page.render({ canvasContext: context, viewport }).promise;
            
            // Kompresi ke 0.6 (60% kualitas) untuk mencegah Bandwidth API
            const base64ImageData = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

            const functionsInstance = getFunctions(db.app, 'asia-southeast2');
            const extractDataAI = httpsCallable(functionsInstance, 'extractSuratDataAIV2');
            
            const result = await extractDataAI({ base64Image: base64ImageData });
            const parsedData = result.data as any;

            setNomorSurat(parsedData.nomorSurat || '');
            setPerihal(parsedData.perihal || '');
            setPengirim(parsedData.pengirim || '');
            setTanggalSurat(parsedData.tanggalSurat || '');
            setJenisSurat(parsedData.jenisSurat || 'Lainnya');
            
            if (parsedData.detailAgenda) {
                setTanggalAgenda(parsedData.detailAgenda.tanggal || '');
                setJamAgenda(parsedData.detailAgenda.jamMulai || '');
                setJamSelesaiAgenda(parsedData.detailAgenda.jamSelesai || '');
                setLokasiAcara(parsedData.detailAgenda.lokasi || '');
            } else {
                setTanggalAgenda('');
                setJamAgenda('');
                setJamSelesaiAgenda('');
                setLokasiAcara('');
            }
            
            setAnalysisSuccess(true);
            addToast("Data surat berhasil diekstrak lengkap via AI Server!", "success");

        } catch (err: any) {
            console.error(err);
            // Tangkap pesan Error (Termasuk 429 HttpsError dari backend)
            addToast(err.message || "Gagal menganalisis dokumen via Server.", "error");
        } finally {
            setIsAnalyzing(false);
        }
      };
      
      fileReader.onerror = () => {
          addToast("Gagal membaca file lokal.", "error");
          setIsAnalyzing(false);
      }
    } catch (err: any) {
        console.error(err);
        addToast("Terjadi kesalahan sistem.", "error");
        setIsAnalyzing(false);
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragging(true);
    } else if (e.type === 'dragleave') {
        setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileChange(e.dataTransfer.files);
    }
  };

  const handleOfflineSubmit = async (
    newSuratData: Omit<Surat, 'id' | 'fileUrl' | 'fileName'>,
    file: File
  ) => {
    console.log("Offline mode detected. Saving to IndexedDB...");
    try {
        await savePendingSurat(newSuratData, file);

        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const swRegistration = await navigator.serviceWorker.ready;
            await (swRegistration as unknown as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('upload-surat-baru');
        }
        setOfflineMessage("Koneksi terputus. Surat disimpan offline dan akan diunggah nanti.");
        setNomorSurat(''); setPerihal(''); setPengirim(''); setTanggalSurat('');
        setFile(null); setKlasifikasi('Biasa'); setJenisSurat('Lainnya'); setTujuanJabatanId('none');
        setTanggalAgenda(''); setJamAgenda(''); setLokasiAcara(''); setJamSelesaiAgenda('');
        setAnalysisSuccess(false);
        addToast("Disimpan di mode offline.", "info");

    } catch (syncError: any) {
        console.error("Gagal menyimpan offline:", syncError);
        addToast(`Gagal menyimpan data offline.`, "error");
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOfflineMessage('');

    if (!file || !nomorSurat || !perihal || !pengirim || !tanggalSurat || !jenisSurat || !userProfile) {
      addToast('Semua field wajib diisi.', "error");
      return;
    }
    if (jenisSurat === 'Undangan' && (!tanggalAgenda || !jamAgenda || !lokasiAcara)) {
      addToast('Detail Agenda wajib diisi untuk Undangan.', "error");
      return;
    }
    
    setIsConfirmModalOpen(true);
  };

  const executeUpload = async () => {
    setIsConfirmModalOpen(false);
    setIsUploading(true);

    const detailAgendaPayload = jenisSurat === 'Undangan' ? {
        tanggal: Timestamp.fromDate(new Date(tanggalAgenda)),
        jam: jamAgenda,
        lokasi: lokasiAcara,
        jamSelesai: jamSelesaiAgenda || null
    } : null;

    const terlibatIds = [];
    if (userProfile?.jabatanId) terlibatIds.push(userProfile.jabatanId);
    
    if (tujuanJabatanId !== 'none') {
        terlibatIds.push(tujuanJabatanId);
    } else {
        if (pimpinanList.length > 0) {
            terlibatIds.push(pimpinanList[0].id!);
        }
    }

    const uniqueTerlibatIds = Array.from(new Set(terlibatIds));

    const newSuratData: Omit<Surat, 'id' | 'fileUrl' | 'fileName'> = {
      nomorSurat,
      perihal,
      pengirim,
      tanggalSurat: Timestamp.fromDate(new Date(tanggalSurat)),
      tanggalDiterima: Timestamp.now(), 
      klasifikasi,
      statusPenyelesaian: 'Baru',
      createdBy: userProfile!.uid,
      opdId: userProfile!.opdId,
      jenisSurat: jenisSurat,
      detailAgenda: detailAgendaPayload,
      tujuanJabatanId: tujuanJabatanId !== 'none' ? tujuanJabatanId : null,
      terlibatJabatanIds: uniqueTerlibatIds,
    };

    if (!navigator.onLine) {
        await handleOfflineSubmit(newSuratData, file!);
        setIsUploading(false);
        return; 
    }

    try {
      const storageRef = ref(storage, `surat/${Date.now()}_${file!.name}`);
      const uploadResult = await uploadBytes(storageRef, file!);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      const finalSuratData: Omit<Surat, 'id'> = { ...newSuratData, fileUrl: downloadURL, fileName: file!.name, };
      await addDoc(collection(db, 'surat'), finalSuratData as any);
      addToast('Surat berhasil diunggah!', 'success');
      router.push('/dashboard/surat');
    } catch (err: any) {
      if (err.code === 'storage/cannot-slice-blob' || err.message.includes('network')) {
          await handleOfflineSubmit(newSuratData, file!);
      } else {
          addToast('Gagal mengunggah surat.', 'error');
          console.error(err);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const selectedPimpinan = useMemo(() => {
    if (tujuanJabatanId === 'none') return 'Pimpinan Puncak (Kepala Dinas / Setara)';
    const pimpinan = pimpinanList.find(p => p.id === tujuanJabatanId);
    return pimpinan ? pimpinan.namaJabatan : 'Tidak Diketahui';
  }, [tujuanJabatanId, pimpinanList]);

  if (authLoading) return <div className="text-center p-8">Memuat...</div>;

  if (!canAccess) {
      return (
          <div className="flex h-screen items-center justify-center">
              <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-red-700">Akses Ditolak</h2>
                  <p className="text-red-600 mt-2">Anda tidak memiliki izin untuk mengunggah surat baru.</p>
                  <Button variant="outline" className="mt-4" onClick={() => router.back()}>Kembali</Button>
              </div>
          </div>
      );
  }

  return (
    <> 
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"
        strategy="lazyOnload"
        onLoad={() => { setIsPdfJsReady(true); }}
      />
      <div className="animate-fadeInUp">
        <Link href="/dashboard/surat" className="text-primary hover:underline text-sm mb-4 inline-block">&larr; Kembali ke Kotak Masuk</Link>
        
        <div className="p-6 bg-card rounded-xl shadow-md border border-border">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Upload size={24} className="text-primary" />
              Upload Surat Baru
          </h1>
          <p className="text-muted-foreground text-sm mt-1 mb-6">Isi detail surat atau gunakan AI untuk membaca otomatis.</p>
          
          {analysisSuccess && (
            <Alert variant="default" className="my-4 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Sukses Menganalisis</AlertTitle>
                <AlertDescription>
                    AI berhasil membaca dokumen (termasuk detail agenda). Silakan verifikasi data di bawah sebelum menyimpan.
                </AlertDescription>
            </Alert>
          )}
          
          {offlineMessage && (
            <Alert variant="default" className="my-4 bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700">
                <CloudOff className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Mode Offline</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                    {offlineMessage}
                </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePreSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-border rounded-lg bg-muted/40">
                <div>
                  <Label className="mb-2 block">File Surat (PDF, Max 5MB)</Label>
                  <div 
                    onDragEnter={handleDragEvents}
                    onDragOver={handleDragEvents}
                    onDragLeave={handleDragEvents}
                    onDrop={handleDrop}
                    className="flex items-center justify-center w-full">
                      <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-input border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent transition-colors ${isDragging ? "border-primary bg-accent" : ""}`}>
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {file ? (
                                <div className="text-center">
                                    <FileText className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="font-semibold text-foreground text-sm">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              ) : (
                                <>
                                    <UploadIcon />
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Klik upload</span> atau seret file</p>
                                    <p className="text-xs text-muted-foreground/80">PDF (MAX. 5MB)</p>
                                </>
                              )}
                          </div>
                          <Input id="dropzone-file" type="file" className="hidden" onChange={(e) => handleFileChange(e.target.files)} accept=".pdf" />
                      </label>
                  </div> 
                </div>
                <div className="flex flex-col items-center justify-center h-full">
                    {isAiReaderEnabled ? (
                      <Button
                          type="button"
                          onClick={openMathChallenge}
                          disabled={!file || isAnalyzing || !isPdfJsReady || cooldownRemaining > 0}
                          variant={cooldownRemaining > 0 ? "outline" : "secondary"}
                          className={`w-full h-12 text-base font-medium shadow-sm transition-all ${cooldownRemaining > 0 ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900 cursor-not-allowed' : ''}`}
                      >
                          {isAnalyzing ? (
                              <Loader2 className="animate-spin mr-2" />
                          ) : cooldownRemaining > 0 ? (
                              <Clock className="mr-2" size={18} />
                          ) : (
                              <Sparkles className="mr-2 text-purple-500" />
                          )}
                          {isAnalyzing 
                             ? 'Menganalisis...' 
                             : cooldownRemaining > 0 
                                ? `Tunggu ${cooldownRemaining}s` 
                                : 'Baca Isi Surat Otomatis'
                          }
                      </Button>
                    ) : (
                      <Button
                          type="button"
                          disabled={true}
                          variant="outline"
                          className="w-full h-12"
                      >
                          <Lock size={16} className="mr-2" />
                          Baca Otomatis (Fitur Premium)
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 text-center max-w-xs">
                        {isAiReaderEnabled 
                          ? (isPdfJsReady ? 'AI akan meringkas perihal, mengambil nama Instansi pengirim, dan detail agenda.' : 'Menyiapkan sistem AI...')
                          : 'Hubungi admin untuk mengaktifkan fitur AI Reader.'
                        }
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomorSurat">Nomor Surat</Label>
                  <Input id="nomorSurat" type="text" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} required placeholder="Contoh: 005/123/2024" />
                </div>
                <div>
                    <Label htmlFor="tanggalSurat">Tanggal Surat</Label>
                    <Input id="tanggalSurat" type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)} required />
                </div>
            </div>

            <div>
              <Label htmlFor="perihal">Perihal (Ringkasan)</Label>
              <Textarea 
                id="perihal"
                value={perihal} 
                onChange={e => setPerihal(e.target.value)} 
                rows={2}
                required 
                placeholder="Isi ringkasan perihal surat..."
              />
            </div>
            
            <div>
                  <Label htmlFor="pengirim">Asal Surat / Pengirim (Instansi)</Label>
                  <Input 
                      id="pengirim"
                      type="text" 
                      value={pengirim} 
                      onChange={e => setPengirim(e.target.value)} 
                      required 
                      list="pengirim-list"
                      placeholder="Ketik instansi pengirim..."
                  />
                  <datalist id="pengirim-list">
                      {daftarPengirimSurat.map(p => <option key={p} value={p} />)}
                  </datalist>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="jenisSurat">Jenis Surat</Label>
                  <Select value={jenisSurat} onValueChange={(value) => setJenisSurat(value as Surat['jenisSurat'])} required>
                      <SelectTrigger id="jenisSurat">
                          <SelectValue placeholder="-- Pilih Jenis --" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Undangan">Undangan</SelectItem>
                          <SelectItem value="Pemberitahuan">Pemberitahuan</SelectItem>
                          <SelectItem value="Permohonan">Permohonan</SelectItem>
                          <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <div>
                    <Label htmlFor="klasifikasi">Klasifikasi Keamanan</Label>
                    <Select value={klasifikasi} onValueChange={(value) => setKlasifikasi(value as any)} required>
                        <SelectTrigger id="klasifikasi">
                            <SelectValue placeholder="Pilih klasifikasi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Biasa">Biasa</SelectItem>
                            <SelectItem value="Penting">Penting</SelectItem>
                            <SelectItem value="Segera">Segera</SelectItem>
                            <SelectItem value="Rahasia">Rahasia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="tujuanPimpinan">Arahkan ke Pimpinan (Opsional)</Label>
                    <Select value={tujuanJabatanId} onValueChange={setTujuanJabatanId}>
                        <SelectTrigger id="tujuanPimpinan">
                            <SelectValue placeholder="Biarkan kosong (Default)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Default (Pimpinan Puncak) --</SelectItem>
                            {pimpinanList.map(p => (
                                <SelectItem key={p.id} value={p.id!}>
                                    {p.namaJabatan}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {jenisSurat === 'Undangan' && (
              <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Detail Jadwal Agenda
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="tanggalAgenda">Tanggal Acara</Label>
                        <Input id="tanggalAgenda" type="date" value={tanggalAgenda} onChange={e => setTanggalAgenda(e.target.value)} required />
                      </div>
                      <div>
                        <Label htmlFor="jamAgenda">Jam Mulai</Label>
                        <Input id="jamAgenda" type="time" value={jamAgenda} onChange={e => setJamAgenda(e.target.value)} required />
                      </div>
                      <div>
                        <Label htmlFor="jamSelesaiAgenda">Jam Selesai (Opsional)</Label>
                        <Input id="jamSelesaiAgenda" type="time" value={jamSelesaiAgenda} onChange={e => setJamSelesaiAgenda(e.target.value)} />
                      </div>
                  </div>
                  <div>
                    <Label htmlFor="lokasiAcara">Lokasi Acara</Label>
                    <Input id="lokasiAcara" type="text" value={lokasiAcara} onChange={e => setLokasiAcara(e.target.value)} placeholder="Contoh: Ruang Rapat Utama / Zoom Meeting" required />
                  </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-border">
                <Button type="submit" disabled={isUploading || !file} className="w-full h-12 text-lg shadow-lg">
                    {isUploading ? (
                        <>
                            <Loader2 className="animate-spin mr-2" /> Mengunggah...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2" /> Upload dan Simpan Surat
                        </>
                    )}
                </Button>
            </div>
          </form>
        </div>
      </div>

      {/* --- MODAL MATH CAPTCHA --- */}
      {isMathModalOpen && mathChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Verifikasi Keamanan</h2>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4">
                    Untuk mencegah penyalahgunaan sistem AI, silakan jawab pertanyaan berikut dengan benar.
                </p>

                {mathError && (
                    <Alert variant="destructive" className="mb-4 py-2 px-3 border-red-500/50">
                        <AlertDescription className="text-sm font-medium">{mathError}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={verifyMathChallenge} className="space-y-4">
                    <div className="bg-muted/40 p-4 rounded-lg border border-border/50 text-center mb-4">
                        <Label className="text-lg md:text-xl font-extrabold text-foreground block mb-3">
                            {mathChallenge.text}
                        </Label>
                        <Input 
                            type="number" 
                            value={userMathAnswer} 
                            onChange={(e) => setUserMathAnswer(e.target.value)} 
                            placeholder="Ketik angka jawaban..."
                            required
                            autoFocus
                            className="text-center text-xl font-bold h-12 border-primary/30 focus-visible:ring-primary/50"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2 border-t border-border/50 mt-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full sm:w-auto"
                            onClick={() => setIsMathModalOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" className="w-full sm:w-auto">
                            Verifikasi
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL KONFIRMASI UPLOAD */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-primary">
                    <AlertTriangle className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Konfirmasi Tujuan Surat</h2>
                </div>
                
                <p className="text-muted-foreground mb-4">
                    Mohon periksa kembali apakah surat ini sudah diarahkan ke pimpinan yang tepat sebelum diunggah.
                </p>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3 mb-6 border border-border">
                    <div>
                        <span className="text-xs text-muted-foreground block">Nomor Surat</span>
                        <span className="font-medium text-foreground">{nomorSurat}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">Perihal</span>
                        <span className="font-medium text-foreground line-clamp-2">{perihal}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground block font-semibold">Akan Muncul di Ruang Kerja:</span>
                        <span className="font-bold text-primary text-lg">{selectedPimpinan}</span>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsConfirmModalOpen(false)}
                        disabled={isUploading}
                    >
                        Kembali & Edit
                    </Button>
                    <Button 
                        type="button" 
                        onClick={executeUpload}
                        disabled={isUploading}
                        className="min-w-[140px]"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Upload Surat'}
                    </Button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}

export default function UploadSuratPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Memuat halaman...</div>}>
            <UploadSuratComponent />
        </Suspense>
    );
}