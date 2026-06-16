"use client";
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Banknote } from 'lucide-react';

export default function AnggaranTab({ userProfile }: { userProfile: any }) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Banknote className="w-16 h-16 text-green-200 mb-4" />
                <h2 className="text-xl font-semibold text-green-900 dark:text-green-100">DPA Digital</h2>
                <p className="text-muted-foreground max-w-md mt-2">
                    Modul ini akan digunakan untuk menginput Pagu Anggaran per Sub-Kegiatan yang akan terintegrasi langsung dengan modul Keuangan.
                </p>
            </CardContent>
        </Card>
    );
}