"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset loading overlay saat route berubah (transisi selesai)
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Global event listener untuk mendeteksi navigasi ke detail surat dari komponen manapun
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        const btn = target.closest('button');
        
        let shouldShowOverlay = false;

        // 1. Deteksi link (href) menuju detail surat
        if (link) {
            const href = link.getAttribute('href');
            if (href && href.includes('/dashboard/surat/') && !href.includes('/upload')) {
                shouldShowOverlay = true;
            }
        }
        
        // 2. Deteksi tombol (Button) yang membuka detail surat
        if (btn) {
            const text = btn.textContent || '';
            if (text.includes('Buka Detail') || text.includes('Detail Surat') || text.includes('Detail Lengkap')) {
                shouldShowOverlay = true;
            }
        }

        if (shouldShowOverlay) {
            setIsNavigating(true);
        }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <>
      {/* Overlay Loading Global (Muncul otomatis saat deteksi klik surat) */}
      {isNavigating && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-card p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-border max-w-xs text-center animate-in zoom-in-95 duration-300">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground">Membuka Dokumen</p>
                  <p className="text-sm text-muted-foreground mt-2">Menyiapkan pratinjau surat dan data...</p>
              </div>
          </div>
      )}
      
      <motion.div
        key={pathname}
        // [OPTIMASI] Mulai dari posisi sedikit lebih dekat (y: 5) agar pergerakan lebih halus
        initial={{ opacity: 0, y: 5 }} 
        animate={{ opacity: 1, y: 0 }}
        // [OPTIMASI] Hapus exit animation.
        // Saat user klik menu, halaman lama langsung hilang, halaman baru fade-in.
        // Ini memberikan persepsi "instan".
        // exit={{ opacity: 0, y: -5 }} 
        transition={{
          duration: 0.15, // Percepat durasi dari default (biasanya 0.3s)
          ease: "easeOut",
        }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </>
  );
}