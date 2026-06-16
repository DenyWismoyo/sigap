// Lokasi: src/app/dashboard/components/StatCard.tsx
// [REFAKTOR SHADCN/UI]
// - Menggunakan <Card> shadcn/ui sebagai basis.
// - Mengganti kelas hardcoded dengan semantik (text-muted-foreground, text-foreground).
// - Memperbaiki bug React.cloneElement.

"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Asumsi path shadcn

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string; // Tailwind color class e.g., "text-blue-600"
}

export default function StatCard({ title, value, icon, colorClass }: StatCardProps) {
  // Ekstrak warna dasar dari text-color
  const bgColorClass = colorClass
    .replace('text-', 'bg-')
    .replace('600', '100')
    .replace('500', '100');

  // [PERBAIKAN] Cek apakah 'icon' adalah elemen React yang valid sebelum di-clone
  const iconElement = React.isValidElement(icon) 
    ? React.cloneElement(icon, { 
        // @ts-ignore // Menambahkan @ts-ignore untuk memaksa 'className'
        className: `w-5 h-5 ${colorClass}` 
      }) 
    : null;

  return (
    <Card className="shadow-md border-border transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {/* [PERBAIKAN] Gunakan dark:bg-opacity-20 untuk tema gelap */}
        <div className={`p-2 rounded-full ${bgColorClass} dark:bg-opacity-20`}>
          {iconElement}
        </div>
      </CardHeader>
      <CardContent>
        {/* [PERBAIKAN] Gunakan text-foreground */}
        <div className="text-2xl font-bold text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}