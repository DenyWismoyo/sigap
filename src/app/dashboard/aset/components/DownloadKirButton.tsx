// Directory: src/app/dashboard/aset/components/DownloadKirButton.tsx
// [UPDATE] Menambahkan prop 'kepalaOpd' untuk data pimpinan dinamis.

"use client";

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { RoomInventoryPdf } from './RoomInventoryPdf';
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from 'lucide-react';
import { AsetInventaris, UserProfile } from '@/types';

interface DownloadKirButtonProps {
    opdNama: string;
    ruangan: string;
    asetList: AsetInventaris[];
    penanggungJawab: UserProfile;
    assetsInSelectedRoom: AsetInventaris[];
    kepalaOpd: { nama: string; nip: string; jabatan: string }; // Data dinamis
}

const DownloadKirButton = ({ opdNama, ruangan, asetList, penanggungJawab, assetsInSelectedRoom, kepalaOpd }: DownloadKirButtonProps) => (
    <PDFDownloadLink
        document={
            <RoomInventoryPdf 
                opdNama={opdNama}
                ruangan={ruangan}
                asetList={asetList}
                penanggungJawab={penanggungJawab}
                kepalaOpd={kepalaOpd} // Teruskan ke PDF
            />
        }
        fileName={`KIR_${ruangan.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`}
    >
        {/* @ts-ignore */}
        {({ blob, url, loading, error }) => (
            <Button disabled={loading || assetsInSelectedRoom.length === 0} className="w-full sm:w-auto">
                {loading ? <Loader2 size={16} className="animate-spin mr-2"/> : <Printer size={16} className="mr-2"/>}
                {loading ? 'Menyiapkan PDF...' : 'Cetak KIR'}
            </Button>
        )}
    </PDFDownloadLink>
);

export default DownloadKirButton;