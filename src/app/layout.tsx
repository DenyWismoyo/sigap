// Lokasi: src/app/layout.tsx
// [REFACTOR] Menggunakan AppProviders untuk struktur provider yang bersih.
// [INTEGRASI] Menambahkan ServiceWorkerReset untuk membersihkan cache PWA yang bermasalah.

import type { Metadata } from "next";
// import { Inter } from "next/font/google"; // Disable jika error build
import "./globals.css";
import { cn } from "@/lib/utils";
import AppProviders from "@/context/AppProviders";
import { ServiceWorkerReset } from "@/components/ServiceWorkerReset"; // [BARU] Import komponen reset

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | SIGAP',
    default: 'SIGAP - Sistem Integrasi & Administrasi Persuratan',
  },
  description: "SIGAP: Solusi E-Office Cerdas untuk Transformasi Digital Birokrasi.",
  keywords: ['SIGAP', 'e-office', 'administrasi persuratan', 'birokrasi modern'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="SIGAP" />
        <meta name="theme-color" content="#0284c7" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
          // inter.className 
        )}
      >
        {/* [BARU] ServiceWorkerReset dipasang di sini (paling atas dalam body).
            Ini akan berjalan sekali di sisi klien untuk memastikan tidak ada SW lama yang nyangkut.
        */}
        <ServiceWorkerReset />

        <AppProviders>
            {children}
        </AppProviders>
      </body>
    </html>
  );
}