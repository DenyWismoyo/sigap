// Lokasi: src/app/dashboard/jadwal/components/JadwalDetailModal.tsx
// [PERBAIKAN DARK MODE v6]
// - Mengganti semua kelas `dark:...` kustom dengan kelas semantik shadcn/ui.
// - Mengganti 'div.modal-backdrop' kustom dengan <Dialog> shadcn/ui.
// - Mengganti <button> standar dengan <Button> shadcn/ui.
// - Mengganti <textarea> untuk alasan penolakan dengan <Textarea> shadcn/ui.
// - Menggunakan <DialogHeader>, <DialogTitle>, <DialogDescription>, <DialogFooter>.
// - Menggunakan <Badge> untuk status.

"use client";

import React, { useState } from 'react';
import { JadwalTempat } from '@/types';
import { X, Calendar, Clock, MapPin, User, Check, Trash2, Edit, AlertTriangle, Users, ExternalLink, Loader2 } from 'lucide-react';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label"; 
// --- Akhir Impor Shadcn ---


interface JadwalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: JadwalTempat | null;
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onEdit: (jadwal: JadwalTempat) => void;
  onDelete: (id: string) => void;
}

export default function JadwalDetailModal({ isOpen, onClose, jadwal, isAdmin, onApprove, onReject, onEdit, onDelete }: JadwalDetailModalProps) {
    const [reason, setReason] = useState('');
    const [showRejectionForm, setShowRejectionForm] = useState(false);
    // [FIX] Tambahkan state loading
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen || !jadwal) return null;

    const getStatusBadge = () => {
        switch (jadwal.status) {
            case 'Disetujui': return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Disetujui</Badge>;
            case 'Menunggu Persetujuan': return <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Menunggu Persetujuan</Badge>;
            case 'Ditolak': return <Badge variant="destructive">Ditolak</Badge>;
            default: return <Badge variant="outline">{jadwal.status}</Badge>;
        }
    };
    
    // [FIX] Tambahkan async, await, dan loading state
    const handleReject = async () => {
        if (!reason.trim()) {
            alert("Alasan penolakan tidak boleh kosong.");
            return;
        }
        setIsProcessing(true);
        await onReject(jadwal.id!, reason);
        setIsProcessing(false);
    };

    const handleApprove = async () => {
        setIsProcessing(true);
        await onApprove(jadwal.id!);
        setIsProcessing(false);
    };
    
    const handleDelete = async () => {
         setIsProcessing(true);
        await onDelete(jadwal.id!);
        setIsProcessing(false);
    }

    const handleModalClose = () => {
        onClose();
        setTimeout(() => {
            setShowRejectionForm(false);
            setReason('');
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleModalClose}>
            {/* [PERBAIKAN DARK MODE] */}
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    {/* [PERBAIKAN DARK MODE] */}
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Detail Jadwal Internal
                    </DialogTitle>
                    <DialogDescription className="flex justify-between items-start pt-2">
                        <span className="flex-1 text-lg font-bold text-foreground pr-4">
                            {jadwal.kegiatan}
                        </span>
                        {getStatusBadge()}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="p-6 pt-0 space-y-4">
                    {/* [PERBAIKAN DARK MODE] */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-center"><User size={14} className="mr-3"/> <strong>PJ:</strong> <span className="text-foreground ml-1">{jadwal.penanggungJawab}</span></p>
                        
                        {jadwal.jenis === 'Virtual' && jadwal.tautanRapat ? (
                            <div className="flex items-center">
                                <ExternalLink size={14} className="mr-3"/> 
                                <strong>Lokasi:</strong>
                                <a 
                                    href={jadwal.tautanRapat} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="ml-1 text-primary hover:underline"
                                >
                                    Buka Tautan Rapat
                                </a>
                            </div>
                        ) : (
                            <p className="flex items-center"><MapPin size={14} className="mr-3"/> <strong>Tempat:</strong> <span className="text-foreground ml-1">{jadwal.namaTempat}</span></p>
                        )}

                        <p className="flex items-center"><Calendar size={14} className="mr-3"/> <strong>Tanggal:</strong> <span className="text-foreground ml-1">{jadwal.tanggalMulai.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                        <p className="flex items-center"><Clock size={14} className="mr-3"/> <strong>Waktu:</strong> <span className="text-foreground ml-1">{jadwal.jamMulai} - {jadwal.jamSelesai}</span></p>
                        {jadwal.jumlahPersonil && (
                            <p className="flex items-center"><Users size={14} className="mr-3"/> <strong>Jumlah Personil:</strong> <span className="text-foreground ml-1">{jadwal.jumlahPersonil} orang</span></p>
                        )}
                    </div>
                     {jadwal.status === 'Ditolak' && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Alasan Ditolak:</strong> {jadwal.alasanDitolak}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {isAdmin && (
                    <DialogFooter className="p-6 pt-0 sm:justify-between">
                        {jadwal.status === 'Menunggu Persetujuan' && !showRejectionForm && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <Button variant="outline" onClick={() => onEdit(jadwal)} disabled={isProcessing} className="flex-1"><Edit size={16} /> Ubah</Button>
                                <Button variant="destructive" onClick={() => setShowRejectionForm(true)} disabled={isProcessing} className="flex-1"><X size={16} /> Tolak</Button>
                                <Button onClick={handleApprove} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700">
                                    {isProcessing && <Loader2 size={16} className="animate-spin" />}
                                    <Check size={16} /> Setujui
                                </Button>
                            </div>
                        )}
                        {showRejectionForm && (
                            <div className="space-y-2 w-full">
                                <Label htmlFor="reason">Alasan Penolakan</Label>
                                <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} rows={2} required />
                                <div className="flex justify-end space-x-3">
                                    <Button variant="ghost" onClick={() => setShowRejectionForm(false)} disabled={isProcessing}>Batal</Button>
                                    <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !reason.trim()}>
                                        {isProcessing && <Loader2 size={16} className="animate-spin" />}
                                        Kirim Penolakan
                                    </Button>
                                </div>
                            </div>
                        )}
                        {jadwal.status === 'Disetujui' && (
                             <Button variant="destructive" onClick={handleDelete} disabled={isProcessing} className="w-full sm:w-auto">
                                {isProcessing && <Loader2 size={16} className="animate-spin" />}
                                <Trash2 size={16} /> Batalkan Jadwal
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}