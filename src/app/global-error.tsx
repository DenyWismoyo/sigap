// Directory: src/app/global-error.tsx
// History Update:
// - [BARU] File ini dibuat untuk menangani error global pada aplikasi Next.js.
// - Menambahkan deteksi "ChunkLoadError" untuk mengatasi masalah cache setelah deployment baru.
// - Jika error chunk terdeteksi, aplikasi akan otomatis melakukan hard reload.

"use client";

import { useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error captured:", error);
    
    // Deteksi ChunkLoadError (Masalah Cache PWA setelah Deploy)
    // Error ini terjadi ketika browser mencoba mengambil file JS lama yang sudah dihapus di server setelah deploy baru.
    const isChunkError = error.message && (
        error.message.toLowerCase().includes("loading chunk") ||
        error.message.toLowerCase().includes("undefined is not a function") ||
        error.message.toLowerCase().includes("minified react error")
    );

    if (isChunkError) {
       // Jika terdeteksi error chunk/cache, paksa reload halaman untuk mengambil aset baru
       console.log("Chunk load error detected. Reloading page...");
       window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="max-w-md space-y-4 rounded-lg border bg-white p-8 shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <RefreshCw className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Aplikasi Telah Diperbarui
          </h2>
          <p className="text-sm text-gray-500">
            Versi baru aplikasi tersedia. Kami mendeteksi ketidakcocokan data lokal. Silakan muat ulang untuk mendapatkan performa terbaik.
          </p>
          <div className="flex justify-center gap-2">
            <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Muat Ulang Sekarang
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
             Error Code: {error.digest || "Client-Exception"}
          </p>
        </div>
      </body>
    </html>
  );
}