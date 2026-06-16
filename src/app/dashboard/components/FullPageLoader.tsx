// Lokasi: src/app/dashboard/components/FullPageLoader.tsx
// [PERBAIKAN DARK MODE v6]
// - Mengganti kelas hardcoded dengan `bg-background` dan `text-muted-foreground`

import React from 'react';
import Logo from './Logo';

const FullPageLoader = ({ message = "Memuat Data Pengguna..." }: { message?: string }) => {
  return (
    // [PERBAIKAN DARK MODE]
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background" aria-label="Memuat">
      <div className="flex flex-col items-center">
        <Logo className="h-16 w-40" />
        {/* Animasi titik-titik */}
        <div className="flex items-center space-x-2 mt-6">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        {/* [PERBAIKAN DARK MODE] */}
        <p className="mt-4 text-sm font-semibold text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default FullPageLoader;