"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { PersonalLink } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Link as LinkIcon, Plus, Trash2, Loader2, Globe, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/context/ToastContext';

export default function QuickLinksWidget() {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    const [links, setLinks] = useState<PersonalLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newLink, setNewLink] = useState({ judul: '', url: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!userProfile?.uid) return;
        
        // Mengambil tautan pribadi user
        const q = query(
            collection(db, 'personalLinks'), 
            where('userId', '==', userProfile.uid),
            orderBy('createdAt', 'desc'),
            limit(10) // Batasi 10 agar widget tetap ringkas
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalLink));
            setLinks(fetchedLinks);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching quick links:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLink.judul || !newLink.url || !userProfile) return;

        // Auto-fix URL jika lupa http/https
        let urlToSave = newLink.url;
        if (!/^https?:\/\//i.test(urlToSave)) {
            urlToSave = 'https://' + urlToSave;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'personalLinks'), {
                userId: userProfile.uid,
                judul: newLink.judul,
                url: urlToSave,
                kategori: 'Quick Link',
                urutan: 0,
                createdAt: Timestamp.now()
            });
            addToast("Tautan berhasil ditambahkan", "success");
            setNewLink({ judul: '', url: '' });
            setIsAddOpen(false);
        } catch (error) {
            console.error("Error adding link:", error);
            addToast("Gagal menambahkan tautan", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Hapus tautan ini?")) return;
        try {
            await deleteDoc(doc(db, 'personalLinks', id));
            addToast("Tautan dihapus", "success");
        } catch (error) {
             console.error("Error deleting link:", error);
             addToast("Gagal menghapus tautan", "error");
        }
    }

    return (
        <Card className="shadow-sm border-border flex flex-col">
            <CardHeader className="p-4 py-3 bg-muted/30 border-b border-border flex-shrink-0 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Globe size={16} className="text-cyan-600" /> Portal Pintar
                </CardTitle>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-background">
                            <Plus size={12} className="mr-1" /> Tambah
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>Tambah Tautan Cepat</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddLink} className="space-y-4 pt-2">
                            <div>
                                <Label htmlFor="judul">Nama Tautan</Label>
                                <Input 
                                    id="judul" 
                                    value={newLink.judul} 
                                    onChange={e => setNewLink({...newLink, judul: e.target.value})}
                                    placeholder="Contoh: Website SIPD / Drive Tim" 
                                    required 
                                />
                            </div>
                            <div>
                                <Label htmlFor="url">URL Website</Label>
                                <Input 
                                    id="url" 
                                    value={newLink.url} 
                                    onChange={e => setNewLink({...newLink, url: e.target.value})}
                                    placeholder="www.example.com" 
                                    required 
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
                 <ScrollArea className="h-[180px]">
                    {loading ? (
                         <div className="flex justify-center items-center h-full p-4"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground"/></div>
                    ) : links.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground text-xs gap-1">
                            <LinkIcon size={24} className="opacity-20 mb-1" />
                            <p>Belum ada tautan tersimpan.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 p-3">
                            {links.map(link => (
                                <div key={link.id} className="group relative flex items-center p-2 rounded-md border border-border bg-background hover:border-primary/50 hover:shadow-sm transition-all">
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center min-w-0 gap-2.5" title={link.url}>
                                        <div className="w-7 h-7 rounded-full bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center flex-shrink-0 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800 overflow-hidden">
                                            {/* Menggunakan Google Favicon Service untuk ikon otomatis */}
                                            <img 
                                                src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=64`} 
                                                alt="icon" 
                                                className="w-4 h-4 object-contain"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            <ExternalLink size={12} className="absolute opacity-0" /> 
                                        </div>
                                        <span className="text-xs font-medium truncate text-foreground group-hover:text-primary transition-colors">{link.judul}</span>
                                    </a>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); handleDelete(link.id!); }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-500 transition-all bg-background/90 rounded-md shadow-sm border border-border"
                                        title="Hapus Tautan"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                 </ScrollArea>
            </CardContent>
        </Card>
    );
}