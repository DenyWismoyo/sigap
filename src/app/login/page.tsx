// Lokasi: src/app/login/page.tsx
// [PERBAIKAN DARK MODE]
// - Mengganti semua kelas 'dark:...' manual dengan kelas semantik shadcn/ui.
// - 'bg-gray-...' -> 'bg-background', 'bg-muted', 'bg-card'
// - 'text-gray-...' -> 'text-foreground', 'text-muted-foreground'
// - 'border-gray-...' -> 'border-border'

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useUserAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '../../app/dashboard/components/Logo';
import { ArrowLeft, Mail, Briefcase, FileText, Sparkles, Loader2 } from 'lucide-react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// --- Impor Komponen Shadcn ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
// --- Akhir Impor Shadcn ---


// Komponen utama dipisahkan agar bisa dibungkus Suspense
function LoginComponent() {
  const [loginMode, setLoginMode] = useState<'nip' | 'email'>('nip');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { logIn, logInWithNip } = useUserAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const impersonateToken = searchParams.get('impersonate_token');
    if (impersonateToken) {
        setLoading(true);
        signInWithCustomToken(auth, impersonateToken)
            .then(() => {
                router.push('/dashboard');
            })
            .catch((error) => {
                setError("Gagal melakukan 'Login Sebagai'. Token tidak valid atau sesi telah berakhir.");
                setLoading(false);
                console.error("Impersonation login error:", error);
            });
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMode === 'nip') {
        await logInWithNip(identifier, password);
      } else {
        await logIn(identifier, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || "Login gagal. Silakan periksa kembali data Anda.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: 'nip' | 'email') => {
    setLoginMode(mode);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  if (searchParams.get('impersonate_token')) {
    return (
        // [PERBAIKAN DARK MODE]
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="text-center flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-lg font-semibold text-foreground">Mempersiapkan sesi "Login Sebagai"...</p>
                {error && (
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
  }

  return (
    // [PERBAIKAN DARK MODE]
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      
      {/* [PERBAIKAN DARK MODE] */}
      <Card className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl border-border">
        
        {/* === Kolom 1: Sisi Informatif === */}
        {/* [PERBAIKAN DARK MODE] */}
        <div className="relative hidden md:flex flex-col justify-center bg-card p-8 lg:p-12">
          <div className="relative z-10 w-full">
            <div>
              <Logo className="h-16" />
              {/* [PERBAIKAN DARK MODE] */}
              <h1 className="text-3xl font-bold mt-6 text-foreground">
                Transformasi Digital untuk Birokrasi Modern.
              </h1>
              <p className="text-lg text-muted-foreground mt-4">
                SIGAP mengorkestrasikan seluruh alur kerja Anda dalam satu platform cerdas.
              </p>
            </div>
            
            <div className="mt-10">
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <Mail size={20} className="text-primary mt-1 shrink-0" />
                  <div>
                    {/* [PERBAIKAN DARK MODE] */}
                    <h3 className="font-semibold text-foreground">Disposisi Digital</h3>
                    <p className="text-sm text-muted-foreground">Lacak alur surat secara real-time.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Briefcase size={20} className="text-primary mt-1 shrink-0" />
                  <div>
                    {/* [PERBAIKAN DARK MODE] */}
                    <h3 className="font-semibold text-foreground">Ruang Kerja Terpusat</h3>
                    <p className="text-sm text-muted-foreground">Semua disposisi, tugas, dan agenda.</p>
                  </div>
                </li>
                 <li className="flex items-start gap-4">
                  <FileText size={20} className="text-primary mt-1 shrink-0" />
                  <div>
                    {/* [PERBAIKAN DARK MODE] */}
                    <h3 className="font-semibold text-foreground">Laporan E-Kinerja</h3>
                    <p className="text-sm text-muted-foreground">Catat logbook harian dan unggah bukti.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* === Kolom 2: Form Login === */}
        {/* [PERBAIKAN DARK MODE] */}
        <div className="flex items-center justify-center bg-background p-8 md:p-12">
          <div className="w-full max-w-md">
            {/* [PERBAIKAN DARK MODE] */}
            <CardHeader className="p-0 mb-6 text-center">
              <CardTitle className="text-2xl font-bold text-foreground">Selamat Datang</CardTitle>
              <CardDescription>Silakan masuk ke akun Anda</CardDescription>
            </CardHeader>
            
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs value={loginMode} onValueChange={(value) => handleModeChange(value as 'nip' | 'email')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="nip">Pengguna (NIP)</TabsTrigger>
                  <TabsTrigger value="email">Staf/Admin (Email)</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div>
                {/* [PERBAIKAN DARK MODE] */}
                <Label htmlFor="identifier" className="text-sm font-bold text-foreground">
                  {loginMode === 'nip' ? 'NIP' : 'Email'}
                </Label>
                <Input
                  id="identifier"
                  type={loginMode === 'nip' ? 'text' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={loginMode === 'nip' ? 'Masukkan NIP Anda' : 'Masukkan email Anda'}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Memproses...' : 'Login'}
                </Button>
              </div>
            </form>
          </div>
        </div>

      </Card>

      <div className="mt-8 text-center">
        {/* [PERBAIKAN DARK MODE] */}
        <Button asChild variant="link" className="text-muted-foreground hover:text-primary">
          <Link href="/">
              <ArrowLeft size={16} className="mr-1" />
              Kembali ke Halaman Utama
          </Link>
        </Button>
      </div>

    </div>
  );
}

// Komponen wrapper yang menyertakan Suspense
export default function LoginPage() {
    return (
        <Suspense fallback={
            // [PERBAIKAN DARK MODE]
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <LoginComponent />
        </Suspense>
    );
}