"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppsExternalPage() {
  // Ganti URL ini dengan URL Web App dari Google AppScript / AppSheet / Looker Studio Anda
  // Pastikan deployment AppScript diset ke "Anyone" atau "Anyone with Google Account" 
  // dan X-Frame-Options mengizinkan embedding.
  const embedUrl = "https://script.google.com/macros/s/AKfycbLx-placeholder-script-id/exec"; 
  
  // Opsi: Gunakan state jika ingin user bisa mengganti URL, 
  // tapi untuk kasus dinas biasanya hardcoded per halaman.

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Aplikasi Eksternal</h2>
            <p className="text-muted-foreground">
                Integrasi aplikasi tambahan (Google AppScript / Tools Lainnya).
            </p>
        </div>
        <Button variant="outline" onClick={() => window.open(embedUrl, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Buka di Tab Baru
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Informasi Integrasi</AlertTitle>
        <AlertDescription>
          Aplikasi di bawah ini berjalan di server eksternal. Pastikan Anda sudah login ke akun Google terkait jika diperlukan.
        </AlertDescription>
      </Alert>

      <Card className="h-[800px] flex flex-col overflow-hidden border-2">
        <CardContent className="p-0 flex-1">
            {/* Iframe Container */}
            <iframe 
                src={embedUrl}
                title="External App Integration"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </CardContent>
      </Card>
    </div>
  );
}