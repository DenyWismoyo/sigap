// Lokasi: src/app/dashboard/feedback/page.tsx
// [MODIFIKASI]
// - Mengganti <input>, <textarea>, <button>, <label>
//   dengan komponen <Input>, <Textarea>, <Button>, <Label> dari shadcn/ui.
// - Mengganti 'CustomRadioGroup' kustom dengan <RadioGroup> dan <RadioGroupItem> shadcn/ui
//   yang diberi style kustom agar terlihat seperti tombol.
// - Mengganti tampilan sukses/error dengan <Alert> shadcn/ui.
// - Memperbaiki path impor menggunakan alias '@'.
// [PERBAIKAN DARK MODE v6]
// - Mengganti semua kelas `dark:...` kustom dengan kelas semantik shadcn/ui.

"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/firebase'; // path @
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext'; // path @
import { FeedbackLaporan, KepuasanType, KemudahanType, TipeFeedbackType } from '@/types'; // path @
import { Send, CheckCircle, AlertCircle, MessageSquare, Smile, Meh, Frown, ThumbsUp, ThumbsDown, Sparkles, Bug, Loader2 } from 'lucide-react';
import Link from 'next/link';

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// --- Akhir Impor Shadcn ---


// Opsi untuk survei
const kepuasanOptions: { value: KepuasanType; label: string; icon: React.ReactNode }[] = [
  { value: "Sangat Puas", label: "Sangat Puas", icon: <Smile size={24} className="text-green-500" /> },
  { value: "Puas", label: "Puas", icon: <Smile size={24} className="text-green-400" /> },
  { value: "Cukup", label: "Cukup", icon: <Meh size={24} className="text-yellow-500" /> },
  { value: "Kurang Puas", label: "Kurang Puas", icon: <Frown size={24} className="text-orange-500" /> },
  { value: "Sangat Tidak Puas", label: "Sangat Tidak Puas", icon: <Frown size={24} className="text-red-500" /> },
];

const kemudahanOptions: { value: KemudahanType; label: string; icon: React.ReactNode }[] = [
  { value: "Sangat Mudah", label: "Sangat Mudah", icon: <ThumbsUp size={24} className="text-green-500" /> },
  { value: "Mudah", label: "Mudah", icon: <ThumbsUp size={24} className="text-green-400" /> },
  { value: "Cukup", label: "Cukup", icon: <Meh size={24} className="text-yellow-500" /> },
  { value: "Sulit", label: "Sulit", icon: <ThumbsDown size={24} className="text-orange-500" /> },
  { value: "Sangat Sulit", label: "Sangat Sulit", icon: <ThumbsDown size={24} className="text-red-500" /> },
];

const tipeOptions: { value: TipeFeedbackType; label: string; icon: React.ReactNode }[] = [
  { value: "Laporan Bug", label: "Laporan Bug", icon: <Bug size={20} className="text-red-500" /> },
  { value: "Saran Fitur", label: "Saran Fitur", icon: <Sparkles size={20} className="text-blue-500" /> },
  { value: "Komentar Umum", label: "Komentar Umum", icon: <MessageSquare size={20} className="text-gray-500" /> },
];

// Komponen Radio Button Kustom menggunakan shadcn
const CustomRadioGroup = ({ options, selectedValue, onChange, name }: {
  options: { value: string; label: string; icon: React.ReactNode }[];
  selectedValue: string;
  onChange: (value: any) => void;
  name: string;
}) => (
  <RadioGroup
    name={name}
    value={selectedValue}
    onValueChange={onChange}
    className="flex flex-wrap gap-3"
  >
    {options.map(opt => (
      <Label
        key={opt.value}
        htmlFor={`${name}-${opt.value}`}
        // [PERBAIKAN DARK MODE]
        className={`flex-1 min-w-[120px] flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
          selectedValue === opt.value
            ? 'border-primary bg-accent shadow-md' // Menggunakan border-primary dan bg-accent
            : 'border-border bg-card hover:bg-accent/50' // Menggunakan border-border dan bg-card
        }`}
      >
        <RadioGroupItem value={opt.value} id={`${name}-${opt.value}`} className="sr-only" />
        {opt.icon}
        <span className="text-sm font-medium text-center">{opt.label}</span>
      </Label>
    ))}
  </RadioGroup>
);

export default function FeedbackPage() {
  const { userProfile, actingJabatanProfile, loading: authLoading } = useUserAuth();
  const pathname = usePathname();

  const [kepuasan, setKepuasan] = useState<KepuasanType | ''>('');
  const [kemudahan, setKemudahan] = useState<KemudahanType | ''>('');
  const [tipe, setTipe] = useState<TipeFeedbackType | ''>('');
  const [halamanTerkait, setHalamanTerkait] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (pathname && pathname !== '/dashboard/feedback') {
      setHalamanTerkait(pathname);
    }
  }, [pathname]);

  const resetForm = () => {
    setKepuasan('');
    setKemudahan('');
    setTipe('');
    setDeskripsi('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!userProfile || !actingJabatanProfile) {
      setError("Sesi Anda tidak valid. Silakan login kembali.");
      return;
    }
    if (!kepuasan || !kemudahan || !tipe || !deskripsi) {
      setError("Mohon isi semua field yang wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      userId: userProfile.uid,
      userNip: userProfile.nip,
      userNama: userProfile.namaLengkap,
      userJabatan: actingJabatanProfile.namaJabatan,
      opdId: userProfile.opdId,
      kepuasan: kepuasan as KepuasanType,
      kemudahan: kemudahan as KemudahanType,
      tipe: tipe as TipeFeedbackType,
      deskripsi: deskripsi,
      status: "Baru",
      createdAt: Timestamp.now(),
    };
    
    if (halamanTerkait) {
      payload.halamanTerkait = halamanTerkait;
    }

    try {
      await addDoc(collection(db, 'feedbackLaporan'), payload as Omit<FeedbackLaporan, 'id'>);
      setSuccess(true);
      resetForm();
    } catch (err: any) {
      console.error("Gagal mengirim feedback:", err);
      setError("Terjadi kesalahan saat mengirim masukan Anda: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <p className="text-center p-8">Memuat...</p>;
  }

  if (success) {
    return (
      // [PERBAIKAN DARK MODE]
      <div className="max-w-2xl mx-auto p-8 bg-card rounded-xl shadow-md border border-border text-center">
        <Alert variant="default" className="bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
            <CheckCircle className="h-5 w-5" />
            <AlertTitle>Terima Kasih Atas Masukan Anda!</AlertTitle>
            <AlertDescription>
                Feedback Anda sangat berharga untuk menjadikan SIGAP lebih baik.
            </AlertDescription>
        </Alert>
        <Button
          onClick={() => setSuccess(false)}
          className="mt-6"
        >
          Kirim Feedback Lain
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fadeInUp">
      {/* [PERBAIKAN DARK MODE] */}
      <h1 className="text-3xl font-bold text-foreground flex items-center mb-6">
        <MessageSquare size={28} className="mr-3 text-blue-600" />
        Survei Kepuasan & Masukan Aplikasi
      </h1>

      {/* [PERBAIKAN DARK MODE] */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 bg-card rounded-xl shadow-md border border-border space-y-8">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <fieldset>
          {/* [PERBAIKAN DARK MODE] */}
          <Label className="block text-lg font-bold text-foreground mb-3">
            1. Secara keseluruhan, seberapa puas Anda dengan aplikasi SIGAP? <span className="text-red-500">*</span>
          </Label>
          <CustomRadioGroup
            name="kepuasan"
            options={kepuasanOptions}
            selectedValue={kepuasan}
            onChange={setKepuasan}
          />
        </fieldset>

        <fieldset>
          {/* [PERBAIKAN DARK MODE] */}
          <Label className="block text-lg font-bold text-foreground mb-3">
            2. Menurut Anda, seberapa mudah penggunaan aplikasi ini? <span className="text-red-500">*</span>
          </Label>
          <CustomRadioGroup
            name="kemudahan"
            options={kemudahanOptions}
            selectedValue={kemudahan}
            onChange={setKemudahan}
          />
        </fieldset>

        {/* [PERBAIKAN DARK MODE] */}
        <fieldset className="pt-6 border-t border-border">
          <Label className="block text-lg font-bold text-foreground mb-3">
            3. Apa tipe masukan yang ingin Anda berikan? <span className="text-red-500">*</span>
          </Label>
          <CustomRadioGroup
            name="tipe"
            options={tipeOptions}
            selectedValue={tipe}
            onChange={setTipe}
          />
        </fieldset>

        <div>
          {/* [PERBAIKAN DARK MODE] */}
          <Label htmlFor="halamanTerkait" className="block text-lg font-bold text-foreground mb-3">
            4. Masukan ini terkait halaman mana? (Opsional)
          </Label>
          <Input
            type="text"
            id="halamanTerkait"
            value={halamanTerkait}
            onChange={(e) => setHalamanTerkait(e.target.value)}
            placeholder="Contoh: /dashboard/surat/[id]"
          />
        </div>

        <div>
          {/* [PERBAIKAN DARK MODE] */}
          <Label htmlFor="deskripsi" className="block text-lg font-bold text-foreground mb-3">
            5. Jelaskan alasan, saran, atau laporan bug Anda di sini <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={5}
            placeholder="Mohon berikan rincian..."
            required
          />
        </div>

        {/* [PERBAIKAN DARK MODE] */}
        <div className="pt-6 border-t border-border">
          <Button
            type="submit"
            disabled={isSubmitting || authLoading}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send size={18} className="mr-2" />
            {isSubmitting ? 'Mengirim...' : 'Kirim Masukan'}
          </Button>
        </div>
      </form>
    </div>
  );
}