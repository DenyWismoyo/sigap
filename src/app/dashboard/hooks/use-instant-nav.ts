// Directory: src/hooks/use-instant-nav.ts
// History Update:
// - [BARU] Hook khusus untuk menangani navigasi programatik menggunakan useTransition.
// - Mencegah UI "freeze" saat berpindah halaman berat.

"use client";

import { useRouter } from "next/navigation";
import { useTransition, useCallback } from "react";
// Pastikan library nprogress terinstall: npm i nprogress @types/nprogress
// Jika belum ada, Anda bisa menghapus baris terkait NProgress atau menginstallnya.
import NProgress from "nprogress"; 

// Konfigurasi NProgress visual
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 });

export function useInstantNav() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /**
   * Wrapper untuk router.push yang menggunakan transition
   * Memberikan feel 'instant' karena tidak memblokir main thread
   */
  const navigate = useCallback((href: string) => {
    // Jika sudah di halaman yang sama, jangan lakukan apa-apa
    if (typeof window !== 'undefined' && window.location.pathname === href) return;

    NProgress.start(); // Mulai visual loading bar di atas
    
    startTransition(() => {
      router.push(href);
      // NProgress akan selesai secara otomatis saat next.js menyelesaikan navigasi
      // atau di-handle oleh useEffect di layout/component
    });
  }, [router]);

  /**
   * Fungsi untuk prefetch halaman secara manual (misal saat hover tombol)
   */
  const prefetch = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

  return {
    navigate,
    prefetch,
    isPending // Bisa digunakan untuk menampilkan loading state lokal kecil (misal di tombol)
  };
}