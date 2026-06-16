// Directory: src/app/dashboard/keuangan/components/QrAuditModal.tsx
// [NEW COMPONENT] Modal untuk menampilkan QR Code Audit.

"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from 'lucide-react';
import { KeuanganTransaksi } from '@/types';

interface QrAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaksi: KeuanganTransaksi | null;
    opdNama: string;
}

export default function QrAuditModal({ isOpen, onClose, transaksi, opdNama }: QrAuditModalProps) {
    if (!transaksi) return null;

    // Data yang akan dienkode dalam QR
    // Idealnya ini adalah URL ke halaman detail transaksi di aplikasi (Public/Private)
    // Untuk sekarang, kita gunakan URL mock atau deep link internal
    // Format: SIGAP-AUDIT-V1|OPD_ID|TX_ID
    const qrContent = `SIGAP-AUDIT|${transaksi.opdId}|${transaksi.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrContent)}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_AUDIT_${transaksi.uraian.substring(0, 10).replace(/\s/g, '_')}.png`;
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
                    <DialogTitle className="text-center flex items-center justify-center gap-2">
                        <QrCode className="text-blue-600"/> E-Audit Vault Access
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <div className="p-4 bg-white rounded-xl shadow-sm border-2 border-dashed">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-xs font-bold uppercase text-muted-foreground">{opdNama}</p>
                        <p className="text-sm font-medium line-clamp-2">{transaksi.uraian}</p>
                        <p className="text-xs font-mono text-muted-foreground">{transaksi.tanggal.toDate().toLocaleDateString('id-ID')} | Rp {transaksi.jumlah.toLocaleString('id-ID')}</p>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        Tempelkan QR ini pada kuitansi fisik. Auditor dapat memindai untuk melihat bukti dukung digital.
                    </p>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button onClick={handleDownload} className="w-full bg-blue-600 hover:bg-blue-700">
                        <Download size={16} className="mr-2" /> Download Label QR
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}