"use client";
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2 } from 'lucide-react';

export default function EvaluasiTab({ userProfile }: { userProfile: any }) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart2 className="w-16 h-16 text-blue-200 mb-4" />
                <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Evaluasi Kinerja (SAKIP)</h2>
                <p className="text-muted-foreground max-w-md mt-2">
                    Dashboard pemantauan capaian kinerja real-time, Perjanjian Kinerja (PK), dan pelaporan LKjIP otomatis.
                </p>
            </CardContent>
        </Card>
    );
}