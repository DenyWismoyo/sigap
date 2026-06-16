"use client";
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from 'lucide-react';

export default function ProgramSettingsTab({ userProfile }: { userProfile: any }) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Settings className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Master Data Program</h2>
                <p className="text-muted-foreground max-w-md mt-2">
                    Kelola database Program, Kegiatan, dan Sub-Kegiatan OPD Anda di sini.
                </p>
            </CardContent>
        </Card>
    );
}