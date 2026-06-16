// Directory: src/app/dashboard/aset/components/QrCodeModal.tsx
// [BARU] Modal untuk menampilkan dan mengunduh QR Code Aset.

"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from 'lucide-react';
import { AsetInventaris } from '@/types';

interface QrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    aset: AsetInventaris | null;
}

export default function QrCodeModal({ isOpen, onClose, aset }: QrCodeModalProps) {
    if (!aset || !aset.id) return null;

    // Menggunakan API QR Server (Gratis & Stabil)
    const qrValue = JSON.stringify({ id: aset.id, kode: aset.kodeAset, nama: aset.namaAset });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_${aset.kodeAset}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Gagal mengunduh QR", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-center">Kode Aset</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <div className="p-4 bg-white rounded-xl shadow-sm border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-lg">{aset.namaAset}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{aset.kodeAset}</p>
                    </div>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button onClick={handleDownload} className="w-full sm:w-auto">
                        <Download size={16} className="mr-2" /> Download QR
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}