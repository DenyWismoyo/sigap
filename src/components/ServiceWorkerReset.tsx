"use client";

import { useEffect } from "react";

/**
 * Komponen ini berfungsi untuk memaksa browser menghapus Service Worker lama
 * dan cache yang mungkin korup akibat upgrade Next.js.
 * * Cara pakai: Import dan letakkan di root layout.tsx atau halaman utama dashboard.
 */
export function ServiceWorkerReset() {
  useEffect(() => {
    // Ganti string ini jika di masa depan Anda perlu melakukan reset massal lagi
    const RESET_TOKEN = 'reset-pwa-next15-v1'; 
    const STORAGE_KEY = 'app_pwa_reset_status';

    const performReset = async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

      const hasReset = localStorage.getItem(STORAGE_KEY) === RESET_TOKEN;

      if (!hasReset) {
        console.warn('[System] Mendeteksi kebutuhan reset Service Worker. Memulai pembersihan...');

        try {
          // 1. Dapatkan semua registrasi Service Worker aktif
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (registrations.length === 0) {
              // Jika tidak ada SW, tandai selesai dan keluar
              localStorage.setItem(STORAGE_KEY, RESET_TOKEN);
              return;
          }

          const unregisterPromises = registrations.map(registration => {
            console.log('[System] Menghapus Service Worker:', registration.scope);
            return registration.unregister();
          });

          await Promise.all(unregisterPromises);

          // 2. Hapus Cache Storage (Opsional tapi sangat disarankan untuk kasus error "Connection Closed")
          // Karena cache lama mungkin berisi file JS Next.js versi lama yang bentrok
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            const deletePromises = cacheNames.map(name => {
                console.log('[System] Menghapus Cache:', name);
                return caches.delete(name);
            });
            await Promise.all(deletePromises);
          }

          // 3. Simpan tanda bahwa reset sudah berhasil dilakukan
          localStorage.setItem(STORAGE_KEY, RESET_TOKEN);
          console.log('[System] Reset selesai. Reloading...');

          // 4. Hard Reload halaman untuk memastikan browser mengambil aset baru dari jaringan
          window.location.reload();

        } catch (error) {
          console.error('[System] Gagal melakukan reset SW:', error);
        }
      }
    };

    performReset();
  }, []);

  return null; // Komponen ini invisible
}