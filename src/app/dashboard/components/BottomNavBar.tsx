"use client";

import React from 'react';
import Link from 'next/link';
import { LayoutGrid, Briefcase, Inbox, ListChecks, Menu } from 'lucide-react';
import { DrawerTrigger } from "@/components/ui/drawer";
import { WelcomeSummary } from '@/types';

interface BottomNavBarProps {
  pathname: string;
  onLinkClick: (key: 'surat' | 'tugas' | 'none') => void;
  welcomeSummary: WelcomeSummary;
}

export default function BottomNavBar({ pathname, onLinkClick, welcomeSummary }: BottomNavBarProps) {
    const navLinks = [
        { href: '/dashboard', label: 'Beranda', icon: LayoutGrid, notifKey: 'none' as const },
        { href: '/dashboard/ruang-kerja', label: 'Ruang Kerja', icon: Briefcase, notifKey: 'none' as const },
        { href: '/dashboard/surat', label: 'Surat', icon: Inbox, notifKey: 'surat' as const },
        { href: '/dashboard/tugas', label: 'Tugas', icon: ListChecks, notifKey: 'tugas' as const },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden safe-area-bottom">
            {navLinks.map(link => {
                let notifCount = 0;
                if (link.notifKey === 'surat') notifCount = welcomeSummary.suratBaruCount || 0;
                if (link.notifKey === 'tugas') notifCount = welcomeSummary.tugasBaruCount || 0;
                
                const isActive = pathname === link.href;

                return (
                    <Link 
                        key={link.href} 
                        href={link.href} 
                        onClick={() => onLinkClick(link.notifKey)} 
                        className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                    >
                        {notifCount > 0 && (
                            <span className="absolute top-2 right-1/2 translate-x-3 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card animate-pulse">
                                {notifCount > 9 ? '!' : notifCount}
                            </span>
                        )}
                        <link.icon className={`w-5 h-5 mb-1 ${isActive ? 'fill-current opacity-20' : ''}`} />
                        <span className="text-[10px] font-medium">{link.label}</span>
                        {isActive && <span className="absolute bottom-0 w-8 h-1 bg-primary rounded-t-full" />}
                    </Link>
                );
            })}
            <DrawerTrigger asChild>
                <button className="flex flex-col items-center justify-center flex-1 h-full py-1 text-muted-foreground hover:text-primary transition-all duration-200 active:scale-95">
                    <Menu className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </DrawerTrigger>
        </div>
    );
}