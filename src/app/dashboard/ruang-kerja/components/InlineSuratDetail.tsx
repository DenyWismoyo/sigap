/**
 * Directory: src/app/dashboard/ruang-kerja/components/InlineSuratDetail.tsx
 * History Updates:
 * - 2024-11-21: Initial creation. Komponen untuk menampilkan detail ringkas dan preview surat di dalam Ruang Kerja Card.
 * - 2024-11-21 (v2): Menambahkan bagian 'Perihal Surat' di atas grid metadata.
 */

"use client";

import React, { useState } from 'react';
import { Surat } from '@/types';
import { FileText, User, Calendar, MapPin, ChevronDown, ChevronUp, Maximize2, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CachedPdfViewer from '@/app/dashboard/surat/[id]/components/CachedPdfViewer';
import Link from 'next/link';

interface InlineSuratDetailProps {
  surat: Surat;
}

export default function InlineSuratDetail({ surat }: InlineSuratDetailProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-4 border border-border rounded-lg overflow-hidden bg-card shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header Detail - Klik untuk toggle expand/collapse */}
      <div 
        className="p-3 bg-muted/50 border-b border-border flex justify-between items-center cursor-pointer hover:bg-muted transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h4 className="text-xs font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
            <FileText size={14} className="text-blue-600" />
            Detail Surat & Dokumen
        </h4>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </Button>
      </div>

      {isExpanded && (
        <div>
            <div className="p-4 bg-background space-y-4">
                
                {/* [BARU] Bagian Perihal Surat */}
                <div className="p-3 bg-muted/40 rounded-md border border-border">
                    <h5 className="text-xs font-bold text-foreground mb-1 flex items-center gap-2">
                        <AlignLeft size={14} className="text-primary" /> 
                        Perihal / Hal
                    </h5>
                    <p className="text-sm text-foreground leading-relaxed">
                        {surat.perihal}
                    </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <User size={14} className="mt-0.5 text-primary shrink-0" />
                            <div>
                                <span className="block font-semibold text-foreground">Pengirim</span>
                                <span>{surat.pengirim}</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <FileText size={14} className="mt-0.5 text-primary shrink-0" />
                            <div>
                                <span className="block font-semibold text-foreground">Nomor Surat</span>
                                <span>{surat.nomorSurat}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <Calendar size={14} className="mt-0.5 text-primary shrink-0" />
                            <div>
                                <span className="block font-semibold text-foreground">Tanggal Surat</span>
                                <span>{surat.tanggalSurat?.toDate ? surat.tanggalSurat.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</span>
                            </div>
                        </div>
                        {surat.jenisSurat === 'Undangan' && surat.detailAgenda && (
                            <div className="flex items-start gap-2">
                                <MapPin size={14} className="mt-0.5 text-purple-500 shrink-0" />
                                <div>
                                    <span className="block font-semibold text-foreground">Lokasi Acara</span>
                                    <span>{surat.detailAgenda.lokasi}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PDF Viewer Container */}
            <div className="border-t border-border relative group">
                {/* Tombol Buka Fullscreen (muncul saat hover) */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" asChild className="h-8 text-xs shadow-md bg-white/90 hover:bg-white dark:bg-black/80 dark:hover:bg-black">
                        <Link href={`/dashboard/surat/${surat.id}`} target="_blank">
                            <Maximize2 size={14} className="mr-1.5"/> Buka Layar Penuh
                        </Link>
                    </Button>
                </div>

                {/* Area PDF - Tinggi dibatasi agar tetap nyaman di dalam kartu */}
                <div className="h-[500px] w-full bg-gray-100 dark:bg-slate-900">
                    <CachedPdfViewer fileUrl={surat.fileUrl} fileName={surat.fileName} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
}