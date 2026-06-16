// Lokasi: src/app/dashboard/bank-templat/page.tsx
// [MODIFIKASI PANDUAN LENGKAP]
// - Memperbarui TemplateGuideModal dengan daftar variabel yang sangat lengkap.
// - Mengelompokkan variabel (Pokok, Penandatangan, Undangan/Khusus).
// - Menambahkan tips "Variabel Kustom".

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { BankTemplate, OPD } from '@/types';
import { Plus, Search, Edit, Trash2, Save, Building, FileText, ExternalLink, Files, HelpCircle, Loader2, CheckSquare, Square, BookOpen, Copy, Check, AlertTriangle } from 'lucide-react';
import ConfirmModal from '@/app/dashboard/components/ConfirmModal'; 

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from '@/context/ToastContext'; // Impor Toast

// --- Komponen Modal Panduan Variabel (DIPERBARUI) ---
const TemplateGuideModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { addToast } = useToast();
    
    // Daftar variabel dikelompokkan
    const variableGroups = [
        {
            title: "Data Pokok Surat",
            vars: [
                { code: '{{no_surat}}', desc: 'Nomor Surat (Contoh: 800/123/2024)' },
                { code: '{{sifat}}', desc: 'Sifat (Biasa/Penting/Rahasia)' },
                { code: '{{lampiran}}', desc: 'Jumlah lampiran' },
                { code: '{{perihal}}', desc: 'Perihal / Hal surat' },
                { code: '{{kepada}}', desc: 'Nama/Jabatan Tujuan' },
                { code: '{{di_tempat}}', desc: 'Lokasi Tujuan (Contoh: di Tempat)' },
                { code: '{{tanggal}}', desc: 'Tanggal Surat (Format: 20 Mei 2025)' },
                { code: '{{isi_surat}}', desc: 'Isi Paragraf Utama' },
                { code: '{{penutup}}', desc: 'Kalimat Penutup' },
            ]
        },
        {
            title: "Penandatangan",
            vars: [
                { code: '{{nama_pengirim}}', desc: 'Nama Pejabat' },
                { code: '{{nip_pengirim}}', desc: 'NIP Pejabat' },
                { code: '{{jabatan_pengirim}}', desc: 'Jabatan Pejabat (Kop TTD)' },
            ]
        },
        {
            title: "Variabel Khusus (Opsional)",
            vars: [
                { code: '{{hari}}', desc: 'Hari Acara (Misal: Senin)' },
                { code: '{{waktu}}', desc: 'Waktu Acara (Misal: 09.00 WIB)' },
                { code: '{{tempat}}', desc: 'Tempat Acara' },
                { code: '{{acara}}', desc: 'Nama Kegiatan/Acara' },
                { code: '{{kustom_1}}', desc: 'Anda bisa buat variabel sendiri!' },
            ]
        }
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast(`Kode ${text} disalin!`, 'success');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-card border-border flex flex-col max-h-[90vh] p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
                    <DialogTitle className="flex items-center text-xl">
                        <BookOpen className="mr-2 text-blue-600" />
                        Panduan & Daftar Kode Variabel (Placeholder)
                    </DialogTitle>
                    <DialogDescription>
                        Gunakan kode ini di dalam Google Doc Anda agar sistem dapat mengisinya secara otomatis.
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm">
                            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-base">Cara Kerja "Template Pintar":</h4>
                            <ol className="list-decimal pl-5 space-y-2 text-blue-700 dark:text-blue-200">
                                <li>Buka file Template di <strong>Google Docs</strong>.</li>
                                <li>Di tempat yang datanya ingin diubah otomatis, ketik kode dalam kurung kurawal ganda. <br/>Contoh: <em>"Yth. {'{{kepada}}'} di Tempat"</em>.</li>
                                <li>Sistem akan mencari teks <code>{'{{kepada}}'}</code> dan menggantinya dengan inputan dari form "Buat Surat".</li>
                                <li><strong>FITUR BARU:</strong> Anda bebas membuat kode sendiri (misal: <code>{'{{nama_pelanggar}}'}</code>) dan menambahkannya saat mengisi form surat nanti!</li>
                            </ol>
                        </div>

                        <div className="space-y-6">
                            {variableGroups.map((group, idx) => (
                                <div key={idx}>
                                    <h4 className="font-bold text-foreground mb-3 border-b pb-1 border-border">{group.title}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {group.vars.map((v, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => copyToClipboard(v.code)}
                                                className="flex flex-col justify-center p-3 rounded-lg border border-border bg-card hover:bg-accent cursor-pointer group transition-all hover:border-primary shadow-sm"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <code className="text-sm font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{v.code}</code>
                                                    <Copy size={14} className="text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <p className="text-xs text-muted-foreground">{v.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </ScrollArea>
                <DialogFooter className="p-4 border-t border-border bg-muted/30">
                    <Button onClick={onClose}>Tutup Panduan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ... (SISA KODE: Komponen Utama BankTemplatePage sama seperti sebelumnya, pastikan TemplateGuideModal dipanggil dengan benar) ...

// --- Komponen Utama ---
export default function BankTemplatePage() {
    const { userProfile } = useUserAuth();
    
    // ... (State dan Fetch Logic sama seperti file sebelumnya) ...
    const [localOpdList, setLocalOpdList] = useState<OPD[]>([]);
    const [opdTemplates, setOpdTemplates] = useState<BankTemplate[]>([]);
    const [sharedTemplates, setSharedTemplates] = useState<BankTemplate[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<BankTemplate | null>(null);
    const [formState, setFormState] = useState({ judul: '', url: '', deskripsi: '', kategori: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [selectedOpds, setSelectedOpds] = useState<string[]>([]);
    const [isGlobalTemplate, setIsGlobalTemplate] = useState(false);
    
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isProcessing?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const isAdmin = useMemo(() => userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu' || userProfile?.role === 'super_admin', [userProfile]);

    const fetchTemplates = useCallback(async () => {
        if (!userProfile?.opdId) {
            setLoading(false); 
            return;
        }
        setLoading(true);

        try {
            const qOpd = query(collection(db, 'bankTemplate'), where('opdId', '==', userProfile.opdId), orderBy('createdAt', 'desc'));
            const snapOpd = await getDocs(qOpd);
            setOpdTemplates(snapOpd.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankTemplate)));

            const qShared = query(collection(db, 'bankTemplate'), where('sharedWithOpdIds', 'array-contains', userProfile.opdId));
            const snapShared = await getDocs(qShared);
            const sharedData = snapShared.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankTemplate));
            setSharedTemplates(sharedData.filter(t => t.opdId !== userProfile.opdId));

            if (userProfile.role === 'super_admin') {
                const opdSnapshot = await getDocs(collection(db, 'opd'));
                setLocalOpdList(opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD)));
            }

        } catch (error) {
            console.error("Error fetching templates:", error);
        } finally {
            setLoading(false);
        }
    }, [userProfile]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const allTemplates = useMemo(() => [...opdTemplates, ...sharedTemplates], [opdTemplates, sharedTemplates]);

    const openModal = (template: BankTemplate | null) => {
        setTemplateToEdit(template);
        setFormState(template ? { judul: template.judul, url: template.googleDriveUrl, deskripsi: template.deskripsi || '', kategori: template.kategori } : { judul: '', url: '', deskripsi: '', kategori: 'Surat Keluar' });
        setSelectedOpds(template?.sharedWithOpdIds || []);
        setIsGlobalTemplate(false); 
        setIsModalOpen(true);
    };

    const handleToggleGlobal = (checked: boolean) => {
        setIsGlobalTemplate(checked);
        if (checked) {
            setSelectedOpds(localOpdList.map(opd => opd.id!));
        } else {
            setSelectedOpds([]);
        }
    };

    const handleOpdCheckChange = (opdId: string) => {
        if (selectedOpds.includes(opdId)) {
            setSelectedOpds(prev => prev.filter(id => id !== opdId));
            setIsGlobalTemplate(false); 
        } else {
            setSelectedOpds(prev => [...prev, opdId]);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || !formState.judul || !formState.url || !formState.kategori) {
            alert("Judul, URL Google Doc, dan Kategori wajib diisi.");
            return;
        }

        if (!formState.url.includes('docs.google.com/document')) {
             alert("Harap masukkan Link Google Docs yang valid (https://docs.google.com/document/d/...).");
             return;
        }

        setIsProcessing(true);
        try {
            const superAdminPayload = userProfile.role === 'super_admin' ? { sharedWithOpdIds: selectedOpds } : {};
            
            const payload = {
                judul: formState.judul,
                deskripsi: formState.deskripsi,
                kategori: formState.kategori,
                googleDriveUrl: formState.url,
                opdId: userProfile.opdId,
                createdBy: userProfile.uid,
                ...superAdminPayload
            };

            if (templateToEdit) {
                const linkRef = doc(db, 'bankTemplate', templateToEdit.id!);
                await updateDoc(linkRef, payload);
            } else {
                await addDoc(collection(db, 'bankTemplate'), {
                    ...payload,
                    createdAt: Timestamp.now(),
                });
            }
            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            console.error("Gagal menyimpan templat:", error);
            alert("Gagal menyimpan templat.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus Template',
            message: 'Apakah Anda yakin ingin menghapus templat ini?',
            onConfirm: async () => {
                setConfirmModal(prev => ({...prev, isProcessing: true}));
                try {
                    await deleteDoc(doc(db, 'bankTemplate', id));
                    fetchTemplates();
                } catch (error) {
                    console.error(error);
                    alert("Gagal menghapus templat.");
                } finally {
                     setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, isProcessing: false });
                }
            }
        });
    };
    
    return (
        <div className="animate-fadeInUp">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <Files size={28} className="mr-3 text-green-600"/>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Bank Template & Kop Surat</h1>
                        <p className="text-sm text-muted-foreground">Kelola template surat dinas. Admin OPD upload Kop Surat masing-masing di sini.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsGuideOpen(true)}>
                        <BookOpen size={18} className="mr-2"/> Panduan & Variabel
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => openModal(null)} className="bg-green-600 hover:bg-green-700">
                            <Plus size={18} className="mr-2"/> Tambah Template
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {allTemplates.map(template => (
                    <Card key={template.id} className="flex flex-col justify-between border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-lg truncate" title={template.judul}>{template.judul}</CardTitle>
                            <CardDescription>{template.kategori}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-between">
                             <Button variant="outline" size="sm" asChild>
                                <a href={template.googleDriveUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink size={14} className="mr-2"/> Buka Doc
                                </a>
                            </Button>
                            {(userProfile?.role === 'super_admin' || userProfile?.opdId === template.opdId) && (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openModal(template)}>
                                        <Edit size={16} className="text-yellow-600"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id!)}>
                                        <Trash2 size={16} className="text-red-600"/>
                                    </Button>
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Modal Form */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg bg-card border-border flex flex-col max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{templateToEdit ? 'Edit Template' : 'Template Baru'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                        <ScrollArea className="flex-1 overflow-y-auto px-6 -mx-6">
                            <div className="space-y-4 p-1">
                                <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                    <HelpCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        Pastikan dokumen Google Doc memiliki akses <strong>"Anyone with link can VIEW"</strong>. <br/>
                                        Klik tombol <strong>"Panduan & Variabel"</strong> di halaman utama untuk melihat kode yang bisa digunakan.
                                    </AlertDescription>
                                </Alert>

                                <div>
                                    <Label htmlFor="judul">Judul Template</Label>
                                    <Input id="judul" value={formState.judul} onChange={e => setFormState({...formState, judul: e.target.value})} placeholder="Contoh: Master Kop Surat Dinas Kesehatan" required/>
                                </div>
                                <div>
                                    <Label htmlFor="kategori">Kategori</Label>
                                    <Input id="kategori" value={formState.kategori} onChange={e => setFormState({...formState, kategori: e.target.value})} placeholder="Surat Keluar / SK / Nota Dinas" required/>
                                </div>
                                <div>
                                    <Label htmlFor="url">Link Google Doc</Label>
                                    <Input id="url" value={formState.url} onChange={e => setFormState({...formState, url: e.target.value})} placeholder="https://docs.google.com/document/d/..." required/>
                                </div>
                                <div>
                                    <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                                    <Input id="deskripsi" value={formState.deskripsi} onChange={e => setFormState({...formState, deskripsi: e.target.value})} placeholder="Contoh: Digunakan untuk perjalanan dinas luar kota"/>
                                </div>
                                
                                {userProfile?.role === 'super_admin' && (
                                    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                                        <Label className="font-bold flex items-center gap-2">
                                            <Building size={16}/> Distribusi Template (Injeksi)
                                        </Label>
                                        
                                        <div className="flex items-center space-x-2 border-b pb-3 mb-2">
                                            <Checkbox id="global-check" checked={isGlobalTemplate} onCheckedChange={handleToggleGlobal} />
                                            <Label htmlFor="global-check" className="cursor-pointer font-semibold">Bagikan ke SEMUA OPD (Global)</Label>
                                        </div>
                                        
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {localOpdList.map(opd => (
                                                <div key={opd.id} className="flex items-center gap-2">
                                                    <Checkbox 
                                                        id={opd.id} 
                                                        checked={selectedOpds.includes(opd.id!)} 
                                                        onCheckedChange={() => handleOpdCheckChange(opd.id!)}
                                                    />
                                                    <Label htmlFor={opd.id} className="text-sm font-normal cursor-pointer">{opd.namaOpd}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="mt-6 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>} Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            <TemplateGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isProcessing={confirmModal.isProcessing}
            />
        </div>
    );
}