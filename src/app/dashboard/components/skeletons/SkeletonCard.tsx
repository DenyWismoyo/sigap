// Lokasi: src/app/dashboard/components/skeletons/SkeletonCard.tsx
// [MODIFIKASI]
// - Mengganti div kustom dengan komponen <Skeleton> dari shadcn/ui.
// - Menggunakan bg-card sebagai basis.

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonCard = () => (
  <div className="bg-card rounded-lg shadow-sm border border-border p-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1 pr-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="mt-4 space-y-2 text-xs">
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/j3" />
    </div>
    <div className="border-t border-border p-4 mt-4 text-xs space-y-2">
       <Skeleton className="h-3 w-full" />
       <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);