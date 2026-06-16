// Lokasi: src/app/dashboard/components/skeletons/RuangKerjaSkeleton.tsx
// [REFAKTOR SHADCN/UI]
// - Menggunakan <Skeleton /> dari shadcn/ui untuk menggantikan div kustom.
// - Memberikan efek shimmer/pulse yang konsisten.

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton"; // Asumsi path shadcn

/**
 * Skeleton ini meniru layout 3-kolom dari Dashboard/Ruang Kerja
 * untuk memberikan pengalaman pemuatan yang lebih mulus menggunakan shadcn/ui.
 */
const RuangKerjaSkeleton = () => {
  // Skeleton untuk satu kartu
  const CardSkeleton = () => (
    <div className="p-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-6 w-[100px]" />
        </div>
      </div>
    </div>
  );

  // Skeleton untuk satu item agenda
  const AgendaSkeleton = () => (
    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-dark-border">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1 pr-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="text-center flex-shrink-0">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-16 mt-1" />
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );

  return (
    <div>
      {/* Skeleton Header Halaman */}
      <Skeleton className="h-10 w-1/2 mb-2" />
      <Skeleton className="h-4 w-3/4 mb-8" />
      
      {/* Skeleton Tampilan Desktop & Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
        {/* Kolom 1: Aksi / Menu Cepat */}
        <div className="space-y-6">
          <Skeleton className="h-6 w-1/2 mb-4" />
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
        
        {/* Kolom 2: Tugas / Menu Cepat */}
        <div className="space-y-6">
           <Skeleton className="h-6 w-1/2 mb-4" />
           <div className="p-4 bg-white dark:bg-dark-card rounded-xl shadow-md border border-gray-200 dark:border-dark-border space-y-3">
              <CardSkeleton />
           </div>
        </div>

        {/* Kolom 3: Agenda */}
        <div className="space-y-6">
           <Skeleton className="h-6 w-1/2 mb-4" />
           <div className="p-4 bg-white dark:bg-dark-card rounded-xl shadow-md border border-gray-200 dark:border-dark-border space-y-3">
              <AgendaSkeleton />
              <AgendaSkeleton />
           </div>
        </div>
      </div>
    </div>
  );
};

export default RuangKerjaSkeleton;