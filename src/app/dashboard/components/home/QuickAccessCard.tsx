"use client";

import React from 'react';
import Link from 'next/link';

interface QuickAccessCardProps {
  href: string;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}

export default function QuickAccessCard({ href, label, icon: Icon, colorClass }: QuickAccessCardProps) {
    return (
        <Link href={href}>
            <div className={`p-3 bg-card text-card-foreground rounded-xl shadow-sm border border-border flex flex-col items-center justify-center text-center h-28 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group`}>
                <div className={`p-2.5 ${colorClass.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20 rounded-full mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
                <p className="text-xs font-medium text-foreground mt-1 line-clamp-2 leading-tight">{label}</p>
            </div>
        </Link>
    );
}