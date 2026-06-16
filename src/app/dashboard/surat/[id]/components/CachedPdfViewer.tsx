// Lokasi: src/app/dashboard/surat/[id]/components/CachedPdfViewer.tsx
// [UPDATE] Penanganan khusus untuk Mobile yang tidak support native PDF rendering di iframe.
// - Menambahkan deteksi mobile -> Auto switch ke Google Docs Viewer.
// - Menambahkan tombol "Ganti Viewer" manual.
// - Menambahkan timeout safety agar tidak loading selamanya.

"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, FileText, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CachedPdfViewerProps {
  fileUrl: string;
  fileName: string;
}

const CachedPdfViewer = ({ fileUrl, fileName }: CachedPdfViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewerMode, setViewerMode] = useState<'native' | 'google'>('native');
  const [isMobile, setIsMobile] = useState(false);
  const [showTimeoutMsg, setShowTimeoutMsg] = useState(false);

  // 1. Deteksi Mobile saat mount
  useEffect(() => {
    const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
    const mobile = Boolean(userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i));
    setIsMobile(mobile);
    
    // Jika mobile, default gunakan Google Viewer karena iframe native sering gagal/download otomatis
    if (mobile) {
        setViewerMode('google');
    }
  }, []);

  // 2. Timeout Safety: Jika iframe tidak mengirim event onLoad dalam 8 detik, matikan loading
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
        timer = setTimeout(() => {
            setIsLoading(false);
            setShowTimeoutMsg(true); // Tampilkan pesan opsi lain
        }, 8000);
    }
    return () => clearTimeout(timer);
  }, [isLoading, viewerMode]); // Reset timer jika mode berubah

  const handleLoad = () => {
    setIsLoading(false);
    setShowTimeoutMsg(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const toggleViewerMode = () => {
    setIsLoading(true);
    setHasError(false);
    setShowTimeoutMsg(false);
    setViewerMode(prev => prev === 'native' ? 'google' : 'native');
  };

  // URL yang akan ditampilkan di iframe
  // Google Viewer butuh URL yang di-encode
  const iframeSrc = viewerMode === 'google' 
    ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : fileUrl;

  return (
    <div className="w-full h-full relative bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-border flex flex-col">
      
      {/* Header Kontrol Kecil */}
      <div className="bg-muted/30 border-b p-2 flex justify-between items-center text-xs">
         <div className="flex items-center gap-2 text-muted-foreground">
            {viewerMode === 'google' ? (
                <span className="flex items-center gap-1"><Smartphone size={12} /> Mode Mobile</span>
            ) : (
                <span className="flex items-center gap-1"><FileText size={12} /> Mode Native</span>
            )}
         </div>
         <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleViewerMode}
            className="h-6 px-2 text-xs hover:bg-primary/10 hover:text-primary"
            title="Ganti metode tampilan jika error"
         >
            <RefreshCw size={10} className="mr-1" /> Ganti Viewer
         </Button>
      </div>

      <div className="relative flex-1 w-full h-full">
        {/* Loading State */}
        {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 backdrop-blur-sm">
            <Loader2 className="animate-spin text-primary mb-2" size={32} />
            <p className="text-sm text-muted-foreground">Memuat dokumen...</p>
            {isMobile && viewerMode === 'native' && (
                <p className="text-xs text-orange-500 mt-2">Sedang mencoba mode native...</p>
            )}
            </div>
        )}

        {/* Error State / Fallback */}
        {(hasError || showTimeoutMsg) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background z-20">
                <FileText size={48} className="text-muted-foreground mb-4" />
                <p className="font-semibold text-foreground mb-1">
                    {hasError ? "Gagal memuat pratinjau" : "Pratinjau lambat dimuat"}
                </p>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                    Dokumen mungkin terlalu besar atau browser memblokir tampilan.
                </p>
                
                <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Button asChild variant="default">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={16} className="mr-2" /> Buka / Download PDF
                        </a>
                    </Button>
                    <Button variant="outline" onClick={toggleViewerMode}>
                        Coba {viewerMode === 'native' ? 'Google Viewer' : 'Native Viewer'}
                    </Button>
                </div>
            </div>
        )}

        {/* IFRAME UTAMA */}
        {/* Key ditambahkan agar iframe benar-benar re-render saat mode berubah */}
        <iframe
            key={viewerMode} 
            src={iframeSrc}
            className="w-full h-full border-0"
            title={fileName}
            onLoad={handleLoad}
            onError={handleError}
            allow="autoplay"
        />
      </div>
    </div>
  );
};

export default CachedPdfViewer;