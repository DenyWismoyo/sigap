// Lokasi: src/app/dashboard/components/skeletons/SkeletonAgenda.tsx
// [MODIFIKASI]
// - Mengganti div kustom dengan komponen <Skeleton> dari shadcn/ui.

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonAgenda = () => (
    <div className="p-3 bg-card rounded-lg border border-border">
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