// Lokasi: src/app/dashboard/pengumuman/page.tsx
// [MODIFIKASI FINAL - FIX TYPE ERROR]
// - Menambahkan interface 'FormPengumumanModalProps' yang sebelumnya hilang.
// - Memastikan semua prop (onSave, opdList, dll) terdefinisi dengan tipe yang benar.

"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy, getDocs, or, and } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useUserAuth } from '@/context/AuthContext';
import { Pengumuman, OPD, PengumumanAttachment, UserProfile } from '@/types';
import { 
  Plus, Megaphone, Pin, Edit, Trash2, X, Loader2, FileText, 
  Building, Image as ImageIcon, ChevronLeft, ChevronRight, Search, 
  Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { compressImage, formatDateRelative } from '@/lib/utils'; 

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription, 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
// --- Akhir Impor Shadcn ---

// Helper untuk cek apakah postingan baru (3 hari)
const isNewPost = (timestamp: Timestamp) => {
  const now = new Date();
  const postDate = timestamp.toDate();
  const diffTime = Math.abs(now.getTime() - postDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays <= 3;
};

type PengumumanFormData = Omit<Pengumuman, 'id' | 'createdAt' | 'penulis' | 'opdId' | 'target' | 'tanggalMulai' | 'tanggalSelesai'> & {
  id?: string;
  tanggalMulai: string;
  tanggalSelesai: string;
};

// --- [FIX] DEFINISI INTERFACE YANG HILANG ---
interface FormPengumumanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: PengumumanFormData, 
    files: File[], 
    targetConfig: { isGlobal: boolean, selectedOpds: string[] }
  ) => void;
  pengumumanToEdit: Pengumuman | null;
  isProcessing: boolean;
  userProfile: UserProfile | null;
  opdList: (OPD & { indent?: boolean })[];
}
// --- AKHIR FIX ---


// --- KOMPONEN CAROUSEL GAMBAR ---
const ImageCarousel = ({ images, altText, onClick, heightClass = "h-64 lg:h-auto" }: { images: string[], altText: string, onClick: () => void, heightClass?: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchMoveX = useRef<number | null>(null);
    const autoSlideInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        startAutoSlide();
        return () => stopAutoSlide();
    }, [images.length]); 

    const startAutoSlide = () => {
        if (images.length <= 1) return;
        stopAutoSlide();
        autoSlideInterval.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 20000); 
    };

    const stopAutoSlide = () => {
        if (autoSlideInterval.current) {
            clearInterval(autoSlideInterval.current);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        startAutoSlide();
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
        startAutoSlide();
    };

    // Touch Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        stopAutoSlide();
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        touchMoveX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchMoveX.current === null) {
             startAutoSlide(); return;
        }
        const diffX = touchStartX.current - touchMoveX.current;
        if (diffX > 50) setCurrentIndex((prev) => (prev + 1) % images.length);
        else if (diffX < -50) setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        
        touchStartX.current = null;
        touchMoveX.current = null;
        startAutoSlide();
    };

    if (!images || images.length === 0) return null;

    return (
        <div 
            className={`relative w-full ${heightClass} bg-muted/30 group overflow-hidden`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div 
                className="flex h-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {images.map((src, index) => (
                    <div key={index} className="min-w-full h-full relative cursor-pointer" onClick={onClick}>
                        <img 
                            src={src} 
                            alt={`${altText} - ${index + 1}`} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>

            {images.length > 1 && (
                <>
                    <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {images.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
                        ))}
                    </div>
                </>
            )}
             {images.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm z-10 flex items-center gap-1">
                    <ImageIcon size={10} /> {images.length}
                </div>
            )}
        </div>
    );
};


// --- KOMPONEN HERO CARD (Headline Berita) ---
const HeroAnnouncement = ({ 
    p, 
    isAdmin, 
    setLightboxData, 
    onEdit, 
    onDelete,
    userProfile 
}: { 
    p: Pengumuman, isAdmin: boolean, setLightboxData: any, onEdit: any, onDelete: any, userProfile: any 
}) => {
    const [isExpanded, setIsExpanded] = useState(false); // State untuk expand deskripsi

    // Normalisasi Gambar
    let displayImages: string[] = [];
    if (p.attachments && p.attachments.length > 0) {
        displayImages = p.attachments.filter(a => a.type.startsWith('image/')).map(a => a.url);
    } else if (p.attachmentUrl && p.attachmentType?.startsWith('image/')) {
        displayImages = [p.attachmentUrl];
    }

    const hasImage = displayImages.length > 0;

    return (
        <div className="mb-8 group relative bg-card rounded-2xl border border-border shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
             {/* Label Penting Absolut */}
             <div className="absolute top-0 left-0 bg-yellow-500 text-white text-xs font-bold px-4 py-1.5 rounded-br-xl z-20 shadow-md flex items-center gap-1">
                <Pin size={14} className="fill-current" /> PENGUMUMAN UTAMA
            </div>

            <div className={`flex flex-col ${hasImage ? 'lg:flex-row' : ''} h-full`}>
                {/* Gambar Hero (Lebar di Desktop) */}
                {hasImage && (
                    <div className="lg:w-7/12 relative h-64 lg:h-auto min-h-[300px] lg:min-h-[400px]">
                        <ImageCarousel 
                            images={displayImages} 
                            altText={p.judul} 
                            onClick={() => setLightboxData({ images: displayImages, index: 0 })}
                            heightClass="h-full"
                        />
                    </div>
                )}

                {/* Konten Hero */}
                <div className={`${hasImage ? 'lg:w-5/12' : 'w-full'} flex flex-col p-6 lg:p-8 justify-center relative`}>
                     
                     {/* Metadata */}
                     <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                        <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                           <Clock size={12} /> {formatDateRelative(p.createdAt)}
                        </span>
                        {p.target === 'Semua OPD' && <Badge variant="secondary" className="text-[10px]">Global</Badge>}
                     </div>

                     {/* Judul Besar */}
                     <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground leading-tight mb-4 group-hover:text-primary transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                        {p.judul}
                     </h2>

                     {/* Isi Excerpt (Expandable) */}
                     <div 
                        className={`prose prose-sm dark:prose-invert text-foreground/80 mb-4 cursor-pointer ${isExpanded ? '' : 'line-clamp-4 lg:line-clamp-6'}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                     >
                        <div dangerouslySetInnerHTML={{ __html: p.isi.replace(/\n/g, '<br />') }} />
                     </div>
                     
                     {/* Tombol Baca Selengkapnya (Jika panjang) */}
                     {p.isi.length > 200 && (
                         <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs font-bold text-primary hover:underline mb-4 flex items-center"
                         >
                            {isExpanded ? 'Sembunyikan' : 'Baca Selengkapnya'} 
                            {isExpanded ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}
                         </button>
                     )}

                     {/* Footer & Aksi */}
                     <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {p.penulis.charAt(0)}
                             </div>
                             <span>{p.penulis}</span>
                        </div>

                        {/* Kontrol Admin */}
                        {isAdmin && (userProfile.role === 'super_admin' || p.opdId === userProfile.opdId) && (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(p)} className="h-8 w-8 text-yellow-600">
                                    <Edit size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(p.id)} className="h-8 w-8 text-red-600">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
}

// --- KOMPONEN GRID CARD (Regular News) ---
const GridAnnouncement = ({ 
    p, 
    isAdmin, 
    setLightboxData, 
    onEdit, 
    onDelete,
    userProfile 
}: { 
    p: Pengumuman, isAdmin: boolean, setLightboxData: any, onEdit: any, onDelete: any, userProfile: any 
}) => {
    const [isExpanded, setIsExpanded] = useState(false); // State expand

    // Normalisasi Gambar
    let displayImages: string[] = [];
    let hasFile = false;
    
    if (p.attachments && p.attachments.length > 0) {
        displayImages = p.attachments.filter(a => a.type.startsWith('image/')).map(a => a.url);
        hasFile = true;
    } else if (p.attachmentUrl && p.attachmentType?.startsWith('image/')) {
        displayImages = [p.attachmentUrl];
        hasFile = true;
    } else if (p.attachmentUrl) {
        hasFile = true;
    }

    const hasImage = displayImages.length > 0;
    const isNew = isNewPost(p.createdAt);

    return (
        <Card className="group flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 border-border h-full">
            {/* Image Section */}
            {hasImage ? (
                <div className="relative h-48 w-full bg-muted/30 overflow-hidden">
                    <ImageCarousel 
                        images={displayImages} 
                        altText={p.judul} 
                        onClick={() => setLightboxData({ images: displayImages, index: 0 })}
                        heightClass="h-full"
                    />
                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 flex gap-2 z-10">
                        {p.penting && <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm"><Pin size={10} className="mr-1 fill-current"/> Penting</Badge>}
                        {isNew && <Badge className="bg-red-500 hover:bg-red-600 text-white shadow-sm animate-pulse">BARU</Badge>}
                    </div>
                </div>
            ) : (
                // Placeholder jika tidak ada gambar
                <div className="relative h-3 bg-gradient-to-r from-blue-500 to-purple-500">
                     <div className="absolute top-3 left-3 flex gap-2">
                        {p.penting && <Badge className="bg-yellow-500 text-white"><Pin size={10} className="mr-1 fill-current"/> Penting</Badge>}
                        {isNew && <Badge className="bg-red-500 text-white animate-pulse">BARU</Badge>}
                    </div>
                </div>
            )}

            <CardContent className="flex-1 p-5 flex flex-col">
                {/* Tanggal & Target */}
                <div className="flex justify-between items-center mb-2 text-xs text-muted-foreground">
                    <span>{formatDateRelative(p.createdAt)}</span>
                    {p.target === 'Semua OPD' ? <Badge variant="secondary" className="text-[10px] h-5">Global</Badge> : <Badge variant="outline" className="text-[10px] h-5">Internal</Badge>}
                </div>

                {/* Judul */}
                <h3 
                    className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors cursor-pointer" 
                    title={p.judul}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {p.judul}
                </h3>

                {/* Isi Ringkas (Expandable) */}
                <div 
                    className={`prose prose-sm dark:prose-invert text-muted-foreground text-sm mb-2 flex-1 cursor-pointer ${isExpanded ? '' : 'line-clamp-3'}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                     <div dangerouslySetInnerHTML={{ __html: p.isi.replace(/\n/g, '<br />') }} />
                </div>
                
                {/* Tombol Baca Selengkapnya */}
                {p.isi.length > 100 && (
                    <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs font-bold text-primary hover:underline mb-4 flex items-center self-start"
                    >
                    {isExpanded ? 'Sembunyikan' : 'Baca Selengkapnya'} 
                    {isExpanded ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}
                    </button>
                )}
                
                {/* Footer: Penulis & File */}
                <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center font-bold text-[10px]">
                            {p.penulis.charAt(0)}
                         </div>
                         <span className="truncate max-w-[100px]">{p.penulis}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tombol Download File */}
                        {hasFile && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Buka Lampiran">
                                <a href={p.attachments?.[0]?.url || p.attachmentUrl!} target="_blank" rel="noopener noreferrer">
                                    <FileText size={14}/>
                                </a>
                            </Button>
                        )}
                        
                        {/* Menu Admin */}
                        {isAdmin && (userProfile.role === 'super_admin' || p.opdId === userProfile.opdId) && (
                            <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-600" onClick={() => onEdit(p)}>
                                    <Edit size={14} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => onDelete(p.id)}>
                                    <Trash2 size={14} />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// --- MODAL FORM (TETAP SAMA) ---
const FormPengumumanModal = ({ isOpen, onClose, onSave, pengumumanToEdit, isProcessing, userProfile, opdList }: FormPengumumanModalProps) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<PengumumanFormData | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{ url: string, isImage: boolean, name: string }[]>([]);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isGlobal, setIsGlobal] = useState(false);
    const [selectedOpds, setSelectedOpds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (pengumumanToEdit) {
                setFormData({
                    ...pengumumanToEdit,
                    tanggalMulai: pengumumanToEdit.tanggalMulai.toDate().toISOString().split('T')[0],
                    tanggalSelesai: pengumumanToEdit.tanggalSelesai.toDate().toISOString().split('T')[0],
                });
                
                if (pengumumanToEdit.attachments && pengumumanToEdit.attachments.length > 0) {
                    setPreviews(pengumumanToEdit.attachments.map(att => ({
                        url: att.url,
                        isImage: att.type.startsWith('image/'),
                        name: att.fileName
                    })));
                } else if (pengumumanToEdit.attachmentUrl) {
                    setPreviews([{
                        url: pengumumanToEdit.attachmentUrl,
                        isImage: pengumumanToEdit.attachmentType?.startsWith('image/') || false,
                        name: pengumumanToEdit.attachmentFileName || 'File Lama'
                    }]);
                } else {
                    setPreviews([]);
                }

                if (pengumumanToEdit.target === 'Semua OPD') {
                    setIsGlobal(true); setSelectedOpds([]);
                } else {
                    setIsGlobal(false);
                    const shared = (pengumumanToEdit as any).sharedWithOpdIds;
                    if (shared && Array.isArray(shared)) {
                        setSelectedOpds(shared);
                    } else if (pengumumanToEdit.target !== 'Semua OPD' && pengumumanToEdit.target) {
                        setSelectedOpds([pengumumanToEdit.target]);
                    }
                }
            } else {
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                setFormData({
                    judul: '', isi: '', penting: false,
                    tanggalMulai: today.toISOString().split('T')[0],
                    tanggalSelesai: nextWeek.toISOString().split('T')[0],
                });
                setPreviews([]);
                setIsGlobal(false);
                setSelectedOpds([]);
            }
            setSelectedFiles([]);
            setIsCompressing(false);
        }
    }, [isOpen, pengumumanToEdit]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            if (newFiles.length > 5) {
                addToast("Maksimal 5 gambar/file per pengumuman.", "error");
                return;
            }
            setIsCompressing(true);
            const processedFiles: File[] = [];
            const newPreviews: typeof previews = [];
            for (const file of newFiles) {
                let fileToUse = file;
                if (file.type.startsWith('image/')) {
                    try { fileToUse = await compressImage(file, 0.7, 1280); } catch (err) { console.warn("Gagal kompresi:", err); }
                }
                processedFiles.push(fileToUse);
                newPreviews.push({
                    url: URL.createObjectURL(fileToUse),
                    isImage: file.type.startsWith('image/'),
                    name: file.name
                });
            }
            setSelectedFiles(processedFiles);
            setPreviews(newPreviews);
            setIsCompressing(false);
        }
    };
    
    const clearFiles = () => { setSelectedFiles([]); setPreviews([]); }
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => prev ? { ...prev, [name]: value } : null); };
    const handleCheckedChange = (checked: boolean) => { setFormData(prev => prev ? { ...prev, penting: checked } : null); };
    const handleOpdCheckChange = (opd: OPD) => {
        const opdId = opd.id!;
        const isSelecting = !selectedOpds.includes(opdId);
        let newSelectedOpds: string[];
        if (isSelecting) newSelectedOpds = [...selectedOpds, opdId];
        else newSelectedOpds = selectedOpds.filter(id => id !== opdId);
        if (opd.tipe === 'Induk') {
            const subOpdIds = opdList.filter(sub => sub.idOpdInduk === opdId).map(sub => sub.id!);
            if (isSelecting) newSelectedOpds = [...newSelectedOpds, ...subOpdIds];
            else newSelectedOpds = newSelectedOpds.filter(id => !subOpdIds.includes(id));
        }
        setSelectedOpds(Array.from(new Set(newSelectedOpds)));
        if (isGlobal) setIsGlobal(false);
    };
    const toggleGlobal = (checked: boolean) => { setIsGlobal(checked); if (checked) setSelectedOpds([]); };
    const toggleSelectAll = (select: boolean) => { if (select) setSelectedOpds(opdList.map(opd => opd.id!)); else setSelectedOpds([]); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(formData) onSave(formData, selectedFiles, { isGlobal, selectedOpds });
    };

    if (!isOpen || !formData) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border flex flex-col max-h-[90vh] p-0 gap-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{formData.id ? 'Edit' : 'Buat'} Pengumuman</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 overflow-y-auto px-6">
                        <div className="p-1 space-y-4 pb-4">
                            <div><Label htmlFor="judul">Judul</Label><Input id="judul" name="judul" type="text" value={formData.judul} onChange={handleChange} required /></div>
                            <div><Label htmlFor="isi">Isi Pengumuman</Label><Textarea id="isi" name="isi" value={formData.isi} onChange={handleChange} rows={5} /></div>
                            <div>
                                <Label>Lampiran (Max 5)</Label>
                                <div className="flex gap-2 items-center mt-1">
                                    <Input type="file" multiple accept="image/png, image/jpeg, application/pdf, .doc, .docx, .xls, .xlsx" onChange={handleFileChange} disabled={isCompressing}/>
                                    {previews.length > 0 && <Button type="button" variant="outline" size="icon" onClick={clearFiles} title="Hapus semua"><Trash2 size={16} className="text-red-500"/></Button>}
                                </div>
                                {isCompressing && <div className="mt-2 text-sm text-blue-600 flex items-center animate-pulse"><Loader2 size={14} className="mr-2 animate-spin"/> Mengompres gambar...</div>}
                                {previews.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        {previews.map((p, i) => (
                                            <div key={i} className="relative aspect-square bg-muted rounded-md overflow-hidden border border-border">
                                                {p.isImage ? <img src={p.url} alt="preview" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full p-2 text-center"><FileText size={24} className="text-muted-foreground"/><span className="text-xs mt-1 truncate w-full">{p.name}</span></div>}
                                                <div className="absolute top-1 right-1 bg-black/50 text-white text-[10px] px-1.5 rounded">{i + 1}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div><Label>Mulai Tayang</Label><Input name="tanggalMulai" type="date" value={formData.tanggalMulai} onChange={handleChange} required /></div>
                               <div><Label>Selesai Tayang</Label><Input name="tanggalSelesai" type="date" value={formData.tanggalSelesai} onChange={handleChange} required /></div>
                            </div>
                            <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                <Checkbox id="penting" checked={formData.penting} onCheckedChange={handleCheckedChange} />
                                <Label htmlFor="penting" className="font-medium cursor-pointer text-yellow-800 dark:text-yellow-500 flex items-center"><Pin size={16} className="mr-2" /> Tandai sebagai Pengumuman Penting</Label>
                            </div>
                            {userProfile?.role === 'super_admin' && (
                                <div className="space-y-3 border-t pt-4 mt-4">
                                    <Label className="text-base font-bold flex items-center"><Building size={18} className="mr-2"/> Target Audiens</Label>
                                    <div className="flex items-center space-x-2 mb-2"><Checkbox id="global-target" checked={isGlobal} onCheckedChange={toggleGlobal} /><Label htmlFor="global-target" className="font-semibold cursor-pointer">Semua OPD (Global)</Label></div>
                                    {!isGlobal && (
                                        <div className="border rounded-md p-3 bg-muted/30">
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="text-xs font-semibold text-muted-foreground">Pilih OPD:</Label>
                                                <div className="space-x-2">
                                                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(true)}>Pilih Semua</Button>
                                                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => toggleSelectAll(false)}>Kosongkan</Button>
                                                </div>
                                            </div>
                                            <ScrollArea className="h-40 pr-2">
                                                <div className="space-y-1">
                                                    {opdList.map(opd => (
                                                        <div key={opd.id} className="flex items-center gap-2 p-1 hover:bg-accent rounded">
                                                            <Checkbox id={`opd-${opd.id}`} checked={selectedOpds.includes(opd.id!)} onCheckedChange={() => handleOpdCheckChange(opd)} />
                                                            <Label htmlFor={`opd-${opd.id}`} className="text-sm font-normal cursor-pointer w-full">{opd.indent ? '↳ ' : ''}{opd.namaOpd}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                            <p className="text-xs text-muted-foreground mt-2 text-right">{selectedOpds.length} OPD dipilih.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-4 border-t border-border sticky bottom-0 bg-muted/50">
                        <Button type="submit" disabled={isProcessing || isCompressing}>
                            {isProcessing ? <><Loader2 size={16} className="mr-2 animate-spin"/> Menyimpan...</> : (isCompressing ? 'Mengompres...' : 'Simpan & Publikasikan')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


// --- KOMPONEN HALAMAN UTAMA ---
export default function PengumumanPage() {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pengumumanToEdit, setPengumumanToEdit] = useState<Pengumuman | null>(null);
    const [lightboxData, setLightboxData] = useState<{ images: string[], index: number } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [allOpds, setAllOpds] = useState<OPD[]>([]);
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'penting' | 'internal' | 'global'>('all');

    const isAdmin = userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu' || userProfile?.role === 'super_admin';

    const fetchData = useCallback(async () => {
        if (!userProfile?.opdId) return;
        setLoading(true);
        const now = Timestamp.now();
        try {
            const q = query(
                collection(db, 'pengumuman'),
                where('tanggalSelesai', '>=', new Date()) 
            );
            const snapshot = await getDocs(q);
            const allActive = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pengumuman));
            
            const myOpdId = userProfile.opdId;
            
            const visibleAnnouncements = allActive.filter(p => {
                if (p.target === 'Semua OPD') return true;
                if (p.opdId === myOpdId) return true; 
                if (p.target === myOpdId) return true; 
                const sharedIds = (p as any).sharedWithOpdIds as string[] | undefined;
                if (sharedIds && sharedIds.includes(myOpdId)) return true;
                if (userProfile.role === 'super_admin') return true;
                return false;
            });
            
            const sorted = visibleAnnouncements
                .filter(p => p.tanggalMulai.toMillis() <= now.toMillis()) 
                .sort((a, b) => {
                    if (a.penting !== b.penting) return (b.penting ? 1 : 0) - (a.penting ? 1 : 0); 
                    return b.createdAt.toMillis() - a.createdAt.toMillis(); 
                });
            
            setPengumumanList(sorted);

            if (userProfile.role === 'super_admin' && allOpds.length === 0) {
                const opdSnap = await getDocs(collection(db, 'opd'));
                setAllOpds(opdSnap.docs.map(d => ({ id: d.id, ...d.data() } as OPD)));
            }

        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    }, [userProfile?.opdId, userProfile?.role, allOpds.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const sortedOpdList = useMemo(() => {
        const indukOpds = allOpds.filter(opd => opd.tipe === 'Induk').sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
        const result: (OPD & { indent?: boolean })[] = [];
        indukOpds.forEach(induk => {
            result.push(induk);
            const subOpds = allOpds.filter(opd => opd.idOpdInduk === induk.id).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
            subOpds.forEach(sub => result.push({ ...sub, indent: true }));
        });
        const processedIds = new Set(result.map(r => r.id));
        allOpds.forEach(opd => { if (!processedIds.has(opd.id)) result.push(opd); });
        return result;
    }, [allOpds]);

    // --- FILTERING LOGIC ---
    const filteredList = useMemo(() => {
        return pengumumanList.filter(p => {
            const matchesSearch = 
                p.judul.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.isi.toLowerCase().includes(searchTerm.toLowerCase());
            let matchesType = true;
            if (filterType === 'penting') matchesType = p.penting;
            else if (filterType === 'internal') matchesType = p.target !== 'Semua OPD';
            else if (filterType === 'global') matchesType = p.target === 'Semua OPD';

            return matchesSearch && matchesType;
        });
    }, [pengumumanList, searchTerm, filterType]);

    const heroAnnouncement = useMemo(() => {
        if (filterType !== 'all' && filterType !== 'penting') return null; 
        return filteredList.find(p => p.penting);
    }, [filteredList, filterType]);

    const gridAnnouncements = useMemo(() => {
        if (!heroAnnouncement) return filteredList;
        return filteredList.filter(p => p.id !== heroAnnouncement.id);
    }, [filteredList, heroAnnouncement]);


    // --- CRUD Handlers ---
    const handleSave = async (data: PengumumanFormData, files: File[], targetConfig: { isGlobal: boolean, selectedOpds: string[] }) => {
        if (!userProfile || !data.judul) return;
        setIsProcessing(true);
        try {
            const newAttachments: PengumumanAttachment[] = [];
            for (const file of files) {
                const newFileName = `${Date.now()}_${file.name}`;
                const storageRef = ref(storage, `pengumuman/${newFileName}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                newAttachments.push({ url, fileName: newFileName, type: file.type });
            }
            
            let targetValue = userProfile.opdId; 
            let sharedIds: string[] = [];
            if (userProfile.role === 'super_admin') {
                if (targetConfig.isGlobal) {
                    targetValue = 'Semua OPD';
                } else if (targetConfig.selectedOpds.length > 0) {
                    targetValue = 'Custom';
                    sharedIds = targetConfig.selectedOpds;
                }
            }

            const payload: Partial<Pengumuman> = {
                judul: data.judul, isi: data.isi, penting: data.penting,
                tanggalMulai: Timestamp.fromDate(new Date(data.tanggalMulai)),
                tanggalSelesai: Timestamp.fromDate(new Date(data.tanggalSelesai)),
                target: targetValue, sharedWithOpdIds: sharedIds, 
            };

            if (newAttachments.length > 0) {
                payload.attachments = newAttachments;
                payload.attachmentUrl = null; payload.attachmentFileName = null; payload.attachmentType = null;
            }

            if (data.id) {
                await updateDoc(doc(db, 'pengumuman', data.id), payload);
                addToast("Pengumuman diperbarui.", "success");
            } else {
                await addDoc(collection(db, 'pengumuman'), {
                    ...payload, penulis: userProfile.namaLengkap, opdId: userProfile.opdId, createdAt: Timestamp.now(),
                });
                addToast("Pengumuman berhasil dibuat.", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Gagal menyimpan:", error);
            addToast("Gagal menyimpan pengumuman.", "error");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm("Hapus pengumuman ini?")) {
            await deleteDoc(doc(db, 'pengumuman', id));
            addToast("Pengumuman dihapus.", "success");
            fetchData();
        }
    };

    return (
        <div className="animate-fadeInUp pb-20">
            {/* HEADER & FILTER */}
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center">
                        <Megaphone size={28} className="mr-3 text-green-600" /> Papan Pengumuman
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Berita dan informasi terkini dari OPD.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => { setPengumumanToEdit(null); setIsModalOpen(true); }} className="bg-green-600 hover:bg-green-700">
                        <Plus size={18} className="mr-2" /> Buat Pengumuman
                    </Button>
                )}
            </div>

            {/* SEARCH & CHIPS */}
            <div className="mb-8 space-y-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <Input 
                        placeholder="Cari pengumuman..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-10 bg-card"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <Badge 
                        variant={filterType === 'all' ? 'default' : 'outline'} 
                        className="cursor-pointer px-4 py-1.5 text-sm"
                        onClick={() => setFilterType('all')}
                    >
                        Semua
                    </Badge>
                    <Badge 
                        variant={filterType === 'penting' ? 'default' : 'outline'} 
                        className="cursor-pointer px-4 py-1.5 text-sm hover:bg-yellow-100 hover:text-yellow-800 border-yellow-500 text-yellow-600"
                        onClick={() => setFilterType('penting')}
                    >
                        Penting
                    </Badge>
                    <Badge 
                        variant={filterType === 'internal' ? 'default' : 'outline'} 
                        className="cursor-pointer px-4 py-1.5 text-sm"
                        onClick={() => setFilterType('internal')}
                    >
                        Internal
                    </Badge>
                    <Badge 
                        variant={filterType === 'global' ? 'default' : 'outline'} 
                        className="cursor-pointer px-4 py-1.5 text-sm"
                        onClick={() => setFilterType('global')}
                    >
                        Global
                    </Badge>
                </div>
            </div>

            {loading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto h-8 w-8 text-muted-foreground" /></div> : (
                <div className="space-y-8">
                    {heroAnnouncement && (
                        <HeroAnnouncement 
                            p={heroAnnouncement} 
                            isAdmin={isAdmin} 
                            setLightboxData={setLightboxData} 
                            onEdit={(p: Pengumuman) => { setPengumumanToEdit(p); setIsModalOpen(true); }} 
                            onDelete={handleDelete}
                            userProfile={userProfile}
                        />
                    )}

                    {gridAnnouncements.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {gridAnnouncements.map(p => (
                                <GridAnnouncement 
                                    key={p.id} 
                                    p={p} 
                                    isAdmin={isAdmin} 
                                    setLightboxData={setLightboxData} 
                                    onEdit={(p: Pengumuman) => { setPengumumanToEdit(p); setIsModalOpen(true); }} 
                                    onDelete={handleDelete}
                                    userProfile={userProfile}
                                />
                            ))}
                        </div>
                    ) : !heroAnnouncement && (
                        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
                            <Megaphone size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                            <p className="font-semibold">Tidak ada pengumuman ditemukan.</p>
                        </div>
                    )}
                </div>
            )}

            <FormPengumumanModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave} 
                pengumumanToEdit={pengumumanToEdit} 
                isProcessing={isProcessing}
                userProfile={userProfile}
                opdList={sortedOpdList} 
            />

            <Dialog open={!!lightboxData} onOpenChange={(open) => !open && setLightboxData(null)}>
                <DialogContent className="sm:max-w-5xl bg-transparent border-none shadow-none p-0">
                     <div className="w-full h-full flex justify-center items-center relative group">
                        <Button 
                            className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                            onClick={() => setLightboxData(null)}
                            size="icon"
                        >
                            <X size={20} />
                        </Button>
                        
                        {lightboxData && (
                            <>
                                <img 
                                    src={lightboxData.images[lightboxData.index]} 
                                    alt="Lightbox" 
                                    className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                                    loading="lazy"
                                />
                                
                                {lightboxData.images.length > 1 && (
                                    <>
                                        <button 
                                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxData(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null);
                                            }}
                                        >
                                            <ChevronLeft size={32} />
                                        </button>
                                        <button 
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxData(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null);
                                            }}
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                            {lightboxData.index + 1} / {lightboxData.images.length}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}