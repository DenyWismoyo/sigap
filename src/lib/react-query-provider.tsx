// Lokasi: src/lib/react-query-provider.tsx
// [UPDATE FASE 6 - PILAR 2]: Menjinakkan agresivitas refetch React Query.
// - Mematikan refetch saat pindah tab (Window Focus).
// - Memperpanjang umur data (Stale Time) menjadi 5 menit.

"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // [PENTING] Mematikan pengambilan data otomatis setiap kali user 
            // berpindah tab browser (misal dari tab WhatsApp kembali ke aplikasi ini).
            // Ini akan memotong ribuan query Firestore yang tidak perlu setiap harinya.
            refetchOnWindowFocus: false,
            
            // [PENTING] Mengatur data agar dianggap "segar" selama 5 menit.
            // Jika sebuah komponen di-unmount lalu dirender lagi dalam kurun waktu 5 menit,
            // ia akan mengambil data dari memori RAM, bukan menembak server Firestore.
            staleTime: 5 * 60 * 1000, 
            
            // Membatasi percobaan ulang jika query gagal (mencegah spam network)
            retry: 1, 
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}