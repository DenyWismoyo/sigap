/**
 * Lokasi: src/app/dashboard/tutorial/page.tsx
 * Deskripsi: Halaman galeri video tutorial Youtube.
 * Fitur:
 * - Menampilkan daftar video tutorial dalam grid.
 * - Embed Youtube player otomatis dari link.
 * - [UPDATE] Akses Upload & Hapus HANYA untuk 'super_admin'. User lain (termasuk Admin OPD) hanya Viewer.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/hooks/use-toast";
import { Youtube, Plus, Trash2, Film, Loader2, ShieldAlert } from 'lucide-react';

// --- Tipe Data ---
interface TutorialVideo {
  id: string;
  title: string;
  url: string;
  videoId: string;
  description: string;
  createdAt: any;
  uploaderName: string;
}

// --- Helper: Ekstrak Youtube ID ---
const getYoutubeVideoId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function TutorialPage() {
    const { userProfile } = useUserAuth();
    const { toast } = useToast();
    
    const [videos, setVideos] = useState<TutorialVideo[]>([]);
    const [loading, setLoading] = useState(true);
    
    // State Permission
    const [canManage, setCanManage] = useState(false);

    // State Form
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ title: '', url: '', description: '' });

    // 1. Cek Role (HANYA SUPER ADMIN YANG BISA UPLOAD)
    useEffect(() => {
        if (userProfile) {
            // [UPDATE] Logika diperketat: Hanya Super Admin yang boleh kelola tutorial global
            const isSuperAdmin = userProfile.role === 'super_admin';
            setCanManage(isSuperAdmin);
        }
    }, [userProfile]);

    // 2. Fetch Data Video Realtime
    useEffect(() => {
        const q = query(collection(db, 'tutorial_videos'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const videoData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as TutorialVideo));
            setVideos(videoData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching videos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 3. Handle Submit Video Baru
    const handleAddVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return; // Security check

        if (!formData.title || !formData.url) {
            toast({ title: "Gagal", description: "Judul dan Link Youtube wajib diisi.", variant: "destructive" });
            return;
        }

        const videoId = getYoutubeVideoId(formData.url);
        if (!videoId) {
            toast({ title: "Link Tidak Valid", description: "Mohon masukkan link Youtube yang valid.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'tutorial_videos'), {
                title: formData.title,
                url: formData.url,
                videoId: videoId,
                description: formData.description || '',
                createdAt: serverTimestamp(),
                uploaderId: userProfile?.uid,
                uploaderName: userProfile?.namaLengkap || 'Super Admin'
            });
            
            toast({ title: "Berhasil", description: "Video tutorial berhasil ditambahkan." });
            setIsAddOpen(false);
            setFormData({ title: '', url: '', description: '' });
        } catch (error) {
            console.error("Error adding video:", error);
            toast({ title: "Error", description: "Gagal menyimpan video.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. Handle Hapus Video
    const handleDeleteVideo = async (id: string) => {
        if (!canManage) return; // Security check
        
        if (!confirm("Apakah Anda yakin ingin menghapus video ini?")) return;
        try {
            await deleteDoc(doc(db, 'tutorial_videos', id));
            toast({ title: "Terhapus", description: "Video tutorial telah dihapus." });
        } catch (error) {
            toast({ title: "Error", description: "Gagal menghapus video.", variant: "destructive" });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 pb-20 animate-fadeInUp max-w-7xl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Youtube className="text-red-600 h-8 w-8" />
                        Tutorial Aplikasi
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Panduan penggunaan fitur-fitur aplikasi dalam format video.
                    </p>
                </div>

                {/* Tombol Tambah HANYA Muncul jika Super Admin */}
                {canManage && (
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                                <Plus className="mr-2 h-4 w-4" /> Tambah Video
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-card border-border">
                            <DialogHeader>
                                <DialogTitle>Tambah Video Tutorial</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddVideo} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Judul Video</Label>
                                    <Input 
                                        id="title" 
                                        placeholder="Contoh: Cara Mengisi Logbook Harian" 
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="url">Link Youtube</Label>
                                    <Input 
                                        id="url" 
                                        placeholder="https://www.youtube.com/watch?v=..." 
                                        value={formData.url}
                                        onChange={e => setFormData({...formData, url: e.target.value})}
                                    />
                                    <p className="text-xs text-muted-foreground">Pastikan link video bersifat 'Public' atau 'Unlisted'.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="desc">Deskripsi Singkat (Opsional)</Label>
                                    <Textarea 
                                        id="desc" 
                                        placeholder="Jelaskan isi video secara singkat..." 
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting} className="w-full">
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                        Simpan Video
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Memuat pustaka video...</p>
                </div>
            ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-card/50 text-center">
                    <Film className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground">Belum ada video tutorial</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                        {canManage 
                            ? "Silakan tambahkan video tutorial pertama Anda dengan mengklik tombol 'Tambah Video' di atas." 
                            : "Belum ada video tutorial yang tersedia saat ini."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video) => (
                        <Card key={video.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow border-border/60">
                            {/* Video Player Container */}
                            <div className="relative w-full pt-[56.25%] bg-black">
                                <iframe 
                                    className="absolute top-0 left-0 w-full h-full"
                                    src={`https://www.youtube.com/embed/${video.videoId}`}
                                    title={video.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                            
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-lg leading-tight line-clamp-2" title={video.title}>
                                    {video.title}
                                </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="p-4 pt-0 flex-grow">
                                {video.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                                        {video.description}
                                    </p>
                                )}
                            </CardContent>

                            {/* Admin Controls - HANYA SUPER ADMIN */}
                            {canManage && (
                                <CardFooter className="p-3 bg-muted/30 border-t border-border flex justify-between items-center">
                                    <Badge variant="outline" className="text-xs font-normal border-red-200 text-red-600 bg-red-50 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400">
                                        <ShieldAlert size={10} className="mr-1"/> Super Admin Only
                                    </Badge>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8"
                                        onClick={() => handleDeleteVideo(video.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}