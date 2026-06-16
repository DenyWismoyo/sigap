// Lokasi: src/app/dashboard/form-builder/page.tsx
// [FIX CRITICAL ERROR]
// - Menambahkan sanitasi data pada 'handleSubmit' untuk menghapus nilai 'undefined'
//   dari properti 'options' pada fields. Firestore menolak 'undefined'.

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, Timestamp, getDocs, orderBy } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext'; 
import { Formulir, FormulirField, FormulirFieldType, FormulirResponse, Jabatan, UserProfile } from '@/types'; 
import { 
    Plus, ClipboardEdit, Edit, Trash2, Save, Share2, BarChart, 
    Users, UserCheck, Loader2, Copy, ArrowUp, ArrowDown, GripVertical, MoreVertical, Eraser,
    Info, List
} from 'lucide-react';
import Avatar from '@/app/dashboard/components/Avatar'; 
import { useToast } from '@/context/ToastContext'; 
import { useLocalStorage } from '@/app/dashboard/hooks/useLocalStorage'; 

// --- Impor Komponen Shadcn ---
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert"; 
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
// --- Akhir Impor Shadcn ---

// --- Komponen Pemilih Jabatan (Scroll Diperbaiki) ---
const JabatanSelector = ({ allJabatans, userCache, selectedIds, onToggle, opdId }: {
    allJabatans: Jabatan[],
    userCache: Map<string, UserProfile>,
    selectedIds: string[],
    onToggle: (jabatanId: string) => void,
    opdId: string
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredJabatans = useMemo(() => {
        if (!allJabatans) return [];
        return allJabatans
            .filter(j => 
                j.opdId === opdId &&
                (
                    j.namaJabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (userCache.get(j.id!)?.namaLengkap || '').toLowerCase().includes(searchTerm.toLowerCase())
                )
            )
            .sort((a, b) => a.level - b.level);
    }, [allJabatans, userCache, searchTerm, opdId]);

    return (
        <div className="space-y-3">
            <Input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau jabatan..."
                className="bg-background"
            />
            <ScrollArea className="h-60 rounded-md border border-border p-2 bg-card">
                {filteredJabatans.length > 0 ? filteredJabatans.map(j => {
                    const user = userCache.get(j.id!);
                    return (
                        <div key={j.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                           <Checkbox
                                id={j.id!}
                                checked={selectedIds.includes(j.id!)}
                                onCheckedChange={() => onToggle(j.id!)}
                           />
                            <Label htmlFor={j.id!} className="flex-1 flex items-center gap-2 cursor-pointer">
                                <Avatar name={user?.namaLengkap || '?'} className="w-7 h-7 text-[10px]" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{user?.namaLengkap || '(Belum Ada Pejabat)'}</p>
                                    <p className="text-xs text-muted-foreground">{j.namaJabatan}</p>
                                </div>
                            </Label>
                        </div>
                    )
                }) : <p className="text-sm text-center text-muted-foreground py-4">Tidak ditemukan.</p>}
            </ScrollArea>
        </div>
    );
};

// --- Tipe Data Draft Cache ---
interface FormBuilderDraft {
    judul: string;
    deskripsi: string;
    googleDriveFolderId: string;
    fields: FormulirField[];
    assignmentType: 'all_opd' | 'specific_jabatan';
    assignedToJabatanIds: string[];
}

// --- Komponen Modal Pembuat Form (Dengan Tabs & Cache) ---
const FormBuilderModal = ({ isOpen, onClose, onSave, formToEdit, userCache, opdJabatans }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (data: Partial<Formulir>) => void, 
    formToEdit: Formulir | null,
    userCache: Map<string, UserProfile>,
    opdJabatans: Jabatan[]
}) => {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast(); 

    // State Form
    const [judul, setJudul] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [googleDriveFolderId, setGoogleDriveFolderId] = useState('');
    const [fields, setFields] = useState<FormulirField[]>([]);
    const [assignmentType, setAssignmentType] = useState<'all_opd' | 'specific_jabatan'>('all_opd');
    const [assignedToJabatanIds, setAssignedToJabatanIds] = useState<string[]>([]);
    
    // State UI
    const [isProcessing, setIsProcessing] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState("info"); 

    // Hook Cache 
    const [draftData, setDraftData, removeDraftData] = useLocalStorage<FormBuilderDraft | null>('form_builder_draft', null);
    const lastSavedDraftStr = useRef<string>('');

    // State untuk menambah field baru
    const [newLabel, setNewLabel] = useState('');
    const [newTipe, setNewTipe] = useState<FormulirFieldType>('Teks Singkat');
    const [newOptions, setNewOptions] = useState('');
    const [newRequired, setNewRequired] = useState(false);

    // --- Efek Inisialisasi (Load Data) ---
    useEffect(() => {
        if (isOpen) {
            setDraftLoaded(false);
            setActiveTab("info"); 
            
            if (formToEdit) {
                setJudul(formToEdit.judul);
                setDeskripsi(formToEdit.deskripsi || '');
                setGoogleDriveFolderId(formToEdit.googleDriveFolderId || '');
                setFields(formToEdit.fields || []);
                setAssignmentType(formToEdit.assignmentType || 'all_opd');
                setAssignedToJabatanIds(formToEdit.assignedToJabatanIds || []);
            } else {
                let cached = draftData;
                if (!cached && typeof window !== 'undefined') {
                    try {
                        const raw = window.localStorage.getItem('form_builder_draft');
                        if (raw) cached = JSON.parse(raw);
                    } catch (e) { console.error(e); }
                }

                if (cached && (cached.judul || cached.fields.length > 0)) {
                    setJudul(cached.judul || '');
                    setDeskripsi(cached.deskripsi || '');
                    setGoogleDriveFolderId(cached.googleDriveFolderId || '');
                    setFields(cached.fields || []);
                    setAssignmentType(cached.assignmentType || 'all_opd');
                    setAssignedToJabatanIds(cached.assignedToJabatanIds || []);
                    setDraftLoaded(true);
                } else {
                    setJudul('');
                    setDeskripsi('');
                    setGoogleDriveFolderId('');
                    setFields([]);
                    setAssignmentType('all_opd');
                    setAssignedToJabatanIds([]);
                }
            }
            
            resetNewFieldForm();
            setIsProcessing(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, formToEdit]); 

    // --- Efek Auto-Save ke Cache ---
    useEffect(() => {
        if (isOpen && !formToEdit) {
            const currentData: FormBuilderDraft = {
                judul,
                deskripsi,
                googleDriveFolderId,
                fields,
                assignmentType,
                assignedToJabatanIds
            };
            
            const currentStr = JSON.stringify(currentData);
            if (currentStr !== lastSavedDraftStr.current) {
                setDraftData(currentData);
                lastSavedDraftStr.current = currentStr;
            }
        }
    }, [judul, deskripsi, googleDriveFolderId, fields, assignmentType, assignedToJabatanIds, isOpen, formToEdit, setDraftData]);


    const resetNewFieldForm = () => {
        setNewTipe('Teks Singkat');
        setNewLabel('');
        setNewOptions('');
        setNewRequired(false);
    }

    const handleClearDraft = () => {
        if (confirm("Hapus draft formulir ini?")) {
            setJudul('');
            setDeskripsi('');
            setGoogleDriveFolderId('');
            setFields([]);
            setAssignedToJabatanIds([]);
            setDraftData(null);
            removeDraftData();
            setDraftLoaded(false);
            lastSavedDraftStr.current = ''; 
        }
    };

    const handleAddField = () => {
        if (!newLabel.trim()) {
            addToast("Label field tidak boleh kosong.", "error");
            return;
        }
        const newField: FormulirField = {
            id: `field_${Date.now()}`,
            label: newLabel.trim(),
            tipe: newTipe,
            required: newRequired,
            options: (newTipe === 'Pilihan Ganda' || newTipe === 'Checkbox') ? newOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
        };
        setFields([...fields, newField]);
        resetNewFieldForm();
    };

    const handleRemoveField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };
    
    const moveFieldUp = (index: number) => {
        if (index === 0) return;
        const newFields = [...fields];
        [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
        setFields(newFields);
    };

    const moveFieldDown = (index: number) => {
        if (index === fields.length - 1) return;
        const newFields = [...fields];
        [newFields[index + 1], newFields[index]] = [newFields[index], newFields[index + 1]];
        setFields(newFields);
    };

    const duplicateField = (field: FormulirField) => {
        const clonedField = { ...field, id: `field_${Date.now()}`, label: `${field.label} (Copy)` };
        setFields([...fields, clonedField]);
    };

    const handleToggleJabatan = (jabatanId: string) => {
        setAssignedToJabatanIds(prev =>
            prev.includes(jabatanId)
                ? prev.filter(id => id !== jabatanId)
                : [...prev, jabatanId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!judul.trim()) {
            addToast("Judul formulir wajib diisi.", "error");
            setActiveTab("info"); 
            return;
        }
        if (fields.some(f => f.tipe === 'Upload File') && !googleDriveFolderId.trim()) {
            addToast("ID Folder Google Drive wajib diisi jika ada field 'Upload File'.", "error"); 
            setActiveTab("info");
            return;
        }
        if (fields.length === 0) {
            addToast("Formulir harus memiliki minimal satu pertanyaan.", "error");
            setActiveTab("questions");
            return;
        }
        if (assignmentType === 'specific_jabatan' && assignedToJabatanIds.length === 0) {
            addToast("Pilih setidaknya satu jabatan untuk penugasan spesifik.", "error");
            setActiveTab("info");
            return;
        }

        setIsProcessing(true);
        
        // [FIX] Sanitasi data 'fields' untuk menghapus 'undefined'
        // JSON.stringify akan otomatis menghilangkan key dengan nilai undefined
        const sanitizedFields = JSON.parse(JSON.stringify(fields));

        const data: Partial<Formulir> = {
            judul,
            deskripsi,
            fields: sanitizedFields, // Gunakan data yang sudah bersih
            isPublished: true, 
            assignmentType,
            assignedToJabatanIds: assignmentType === 'specific_jabatan' ? assignedToJabatanIds : [],
        };

        const trimmedFolderId = googleDriveFolderId.trim();
        if (trimmedFolderId) {
            data.googleDriveFolderId = trimmedFolderId;
        }

        await onSave(data);
        
        if (!formToEdit) {
            removeDraftData();
            setDraftData(null);
            lastSavedDraftStr.current = '';
        }
        
        setIsProcessing(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-card border-border flex flex-col max-h-[90vh] p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b border-border flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <DialogTitle className="text-xl">{formToEdit ? 'Edit Formulir' : 'Buat Formulir Baru'}</DialogTitle>
                        
                        {/* Indikator Draft */}
                        {!formToEdit && (draftLoaded || (draftData && (draftData.judul || draftData.fields.length > 0))) && (
                            <div className="flex items-center gap-2 mr-6">
                                <span className="text-[10px] text-green-600 dark:text-green-400 italic animate-pulse hidden sm:inline">
                                    Draft dipulihkan
                                </span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={handleClearDraft} title="Hapus Draft">
                                    <Eraser size={14} />
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Tabs */}
                    <div className="px-6 pt-4 pb-2 border-b border-border bg-muted/10">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="info" className="flex items-center gap-2">
                                <Info size={16}/> Informasi Umum
                            </TabsTrigger>
                            <TabsTrigger value="questions" className="flex items-center gap-2">
                                <List size={16}/> Pertanyaan 
                                {fields.length > 0 && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]">{fields.length}</span>}
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                        {/* Tab Content: Informasi Umum */}
                        <TabsContent value="info" className="flex-1 overflow-hidden mt-0 p-0 data-[state=active]:flex flex-col">
                            <ScrollArea className="flex-1 px-6 py-4">
                                <div className="space-y-6">
                                    {draftLoaded && (
                                        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 py-2">
                                            <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-300">
                                                Formulir dipulihkan dari sesi sebelumnya.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="judul">Judul Formulir <span className="text-red-500">*</span></Label>
                                            <Input id="judul" type="text" value={judul} onChange={e => setJudul(e.target.value)} required className="mt-1" placeholder="Contoh: Survei Kepuasan" />
                                        </div>
                                        <div>
                                            <Label htmlFor="gdrive">ID Folder Google Drive</Label>
                                            <Input id="gdrive" type="text" value={googleDriveFolderId} onChange={e => setGoogleDriveFolderId(e.target.value)} placeholder="Wajib jika ada upload file" className="mt-1" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                                        <Textarea id="deskripsi" value={deskripsi} onChange={e => setDeskripsi(e.target.value)} rows={3} className="mt-1" placeholder="Jelaskan tujuan formulir..." />
                                    </div>
                                    
                                    <Card className="border-border bg-muted/30">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold">Target Responden</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <RadioGroup value={assignmentType} onValueChange={(v) => setAssignmentType(v as any)} className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex items-center space-x-2 border p-3 rounded-md bg-card w-full sm:w-auto">
                                                    <RadioGroupItem value="all_opd" id="r1" />
                                                    <Label htmlFor="r1" className="cursor-pointer font-medium">Semua Pegawai</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 border p-3 rounded-md bg-card w-full sm:w-auto">
                                                    <RadioGroupItem value="specific_jabatan" id="r2" />
                                                    <Label htmlFor="r2" className="cursor-pointer font-medium">Jabatan Tertentu</Label>
                                                </div>
                                            </RadioGroup>

                                            {assignmentType === 'specific_jabatan' && (
                                                <div className="pt-2 animate-in slide-in-from-top-2 fade-in">
                                                    <Label className="mb-2 block text-xs uppercase text-muted-foreground font-bold">Pilih Jabatan:</Label>
                                                    <JabatanSelector
                                                        allJabatans={opdJabatans}
                                                        userCache={userCache}
                                                        selectedIds={assignedToJabatanIds}
                                                        onToggle={handleToggleJabatan}
                                                        opdId={userProfile?.opdId || ''}
                                                    />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* Tab Content: Pertanyaan */}
                        <TabsContent value="questions" className="flex-1 overflow-hidden mt-0 p-0 data-[state=active]:flex flex-col">
                             <ScrollArea className="flex-1 px-6 py-4">
                                <div className="space-y-6">
                                    {/* Daftar Field */}
                                    <div className="space-y-3">
                                        {fields.length === 0 ? (
                                            <div className="text-sm text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20 flex flex-col items-center justify-center">
                                                <List size={40} className="opacity-20 mb-2"/>
                                                <p>Belum ada pertanyaan.</p>
                                                <p className="text-xs">Gunakan form di bawah untuk menambah.</p>
                                            </div>
                                        ) : (
                                            fields.map((field, index) => (
                                                <Card key={field.id} className="group relative border-border hover:border-primary/50 transition-colors">
                                                    <CardContent className="p-3 flex items-start gap-3">
                                                        <div className="mt-1 text-muted-foreground cursor-grab active:cursor-grabbing">
                                                            <GripVertical size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-foreground">{index + 1}. {field.label}</span>
                                                                {field.required && <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">WAJIB</span>}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                                <span className="font-medium text-foreground bg-muted px-1.5 rounded">{field.tipe}</span>
                                                                {field.options && <span className="opacity-75 truncate max-w-[200px]">Options: {field.options.join(', ')}</span>}
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1">
                                                            <div className="flex flex-col gap-1 mr-2">
                                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveFieldUp(index)} disabled={index === 0} title="Naik"><ArrowUp size={12} /></Button>
                                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveFieldDown(index)} disabled={index === fields.length - 1} title="Turun"><ArrowDown size={12} /></Button>
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={16} /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => duplicateField(field)}><Copy size={14} className="mr-2"/> Duplikat</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRemoveField(field.id)} className="text-red-600 focus:text-red-600"><Trash2 size={14} className="mr-2"/> Hapus</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                    
                                    {/* Form Tambah Field */}
                                    <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold flex items-center text-primary">
                                                <Plus size={16} className="mr-2"/> Tambah Pertanyaan Baru
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="newLabel" className="text-xs">Label Pertanyaan</Label>
                                                    <Input id="newLabel" type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Tulis pertanyaan..." className="mt-1 h-9 bg-background" />
                                                </div>
                                                <div>
                                                    <Label htmlFor="newTipe" className="text-xs">Tipe Jawaban</Label>
                                                    <Select value={newTipe} onValueChange={(v) => setNewTipe(v as FormulirFieldType)}>
                                                        <SelectTrigger id="newTipe" className="mt-1 h-9 bg-background"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Teks Singkat">Teks Singkat</SelectItem>
                                                            <SelectItem value="Teks Panjang">Teks Panjang</SelectItem>
                                                            <SelectItem value="Pilihan Ganda">Pilihan Ganda</SelectItem>
                                                            <SelectItem value="Checkbox">Checkbox</SelectItem>
                                                            <SelectItem value="Tanggal">Tanggal</SelectItem>
                                                            <SelectItem value="Upload File">Upload File</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            
                                            {(newTipe === 'Pilihan Ganda' || newTipe === 'Checkbox') && (
                                                <div className="animate-in slide-in-from-top-1 fade-in">
                                                    <Label htmlFor="newOptions" className="text-xs">Opsi Jawaban (pisahkan dengan koma)</Label>
                                                    <Input id="newOptions" type="text" value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="Ya, Tidak, Mungkin" className="mt-1 h-9 bg-background" />
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox id="newRequired" checked={newRequired} onCheckedChange={(c) => setNewRequired(c as boolean)} />
                                                    <Label htmlFor="newRequired" className="cursor-pointer text-sm font-normal">Wajib Diisi</Label>
                                                </div>
                                                <Button type="button" onClick={handleAddField} size="sm">Tambahkan ke Form</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                             </ScrollArea>
                        </TabsContent>

                        {/* Footer Global */}
                        <DialogFooter className="p-4 border-t border-border bg-muted/40 flex-shrink-0">
                            <Button type="submit" disabled={isProcessing} className="w-full sm:w-auto">
                                {isProcessing ? <Loader2 size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} 
                                Simpan Formulir
                            </Button>
                        </DialogFooter>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

// ... (ResponseModal dan FormBuilderPage tetap sama) ...

// --- Komponen Modal Lihat Respon (Refactored) ---
const ResponseModal = ({ isOpen, onClose, form }: { isOpen: boolean, onClose: () => void, form: Formulir | null }) => {
    const [responses, setResponses] = useState<FormulirResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !form) return;
        setLoading(true);
        
        const fetchResponses = async () => {
            try {
                const q = query(
                    collection(db, 'formulirResponse'), 
                    where('formId', '==', form.id), 
                    orderBy('submittedAt', 'desc')
                );
                const snap = await getDocs(q); 
                setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormulirResponse)));
            } catch (error) {
                console.error("Gagal memuat respon:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchResponses();
        
    }, [isOpen, form]);

    if (!form) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Respon: {form.judul}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto -mx-6 px-6">
                    {loading ? <p>Memuat respon...</p> : responses.length === 0 ? <p>Belum ada respon.</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Waktu Submit</TableHead>
                                    <TableHead>Pengisi</TableHead>
                                    {form.fields.map(field => (
                                        <TableHead key={field.id}>{field.label}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {responses.map(res => (
                                    <TableRow key={res.id}>
                                        <TableCell className="whitespace-nowrap">{res.submittedAt.toDate().toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="font-medium">{res.submittedByName}</TableCell>
                                        {form.fields.map(field => {
                                            const data = res.data[field.id];
                                            return (
                                                <TableCell key={field.id}>
                                                    {field.tipe === 'Upload File' && data ? (
                                                        <Button asChild variant="link" size="sm" className="p-0 h-auto">
                                                            <a href={data} target="_blank" rel="noopener noreferrer">Lihat File</a>
                                                        </Button>
                                                    ) : Array.isArray(data) ? (
                                                        data.join(', ')
                                                    ) : (
                                                        data
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

// --- Halaman Utama (Admin) (Refactored) ---
export default function FormBuilderPage() {
    const { userProfile, loading: authLoading } = useUserAuth();
    const { addToast } = useToast(); 
    const [formulirList, setFormulirList] = useState<Formulir[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [localUserCache, setLocalUserCache] = useState<Map<string, UserProfile>>(new Map());
    const [localOpdJabatans, setLocalOpdJabatans] = useState<Jabatan[]>([]);
    const [isCacheLoading, setIsCacheLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [formToEdit, setFormToEdit] = useState<Formulir | null>(null);
    const [formToView, setFormToView] = useState<Formulir | null>(null);
    const [shareLink, setShareLink] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false); 

    const isAdmin = userProfile?.role === 'admin_opd' || userProfile?.role === 'staf_tu' || userProfile?.role === 'super_admin';

    const fetchForms = useCallback(async () => {
        if (!userProfile || !isAdmin) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const q = query(
                collection(db, 'formulir'), 
                where('opdId', '==', userProfile.opdId), 
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q); 
            setFormulirList(snap.docs.map(d => ({ id: d.id, ...d.data() } as Formulir)));
        } catch (error) {
            console.error("Error fetching formulir:", error);
        } finally {
            setLoading(false);
        }
    }, [userProfile, isAdmin]);
    
    useEffect(() => {
        if (!authLoading) {
            fetchForms();
        }
    }, [authLoading, fetchForms]);

    useEffect(() => {
        if (userProfile?.opdId && (localUserCache.size === 0 || localOpdJabatans.length === 0) && !authLoading && isAdmin) {
            const fetchLocalData = async () => {
                setIsCacheLoading(true);
                try {
                    const jabatansQuery = query(collection(db, "jabatan"), where("opdId", "==", userProfile.opdId));
                    const jabatansSnapshot = await getDocs(jabatansQuery);
                    const jabatans = jabatansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Jabatan));
                    setLocalOpdJabatans(jabatans);

                    const usersInOpdQuery = query(collection(db, "users"), where("opdId", "==", userProfile.opdId));
                    const usersSnapshot = await getDocs(usersInOpdQuery);
                    const userCacheMap = new Map<string, UserProfile>();
                    usersSnapshot.forEach(doc => {
                        const user = { id: doc.id, ...doc.data() } as UserProfile;
                        if (user.jabatanId) {
                            userCacheMap.set(user.jabatanId, user);
                        }
                    });
                    setLocalUserCache(userCacheMap);
                } catch (err) {
                    console.error("Gagal fetch data lokal for FormBuilder:", err);
                } finally {
                    setIsCacheLoading(false);
                }
            };
            fetchLocalData();
        } else if (!isAdmin || authLoading) {
             setIsCacheLoading(false);
        }
    }, [userProfile, authLoading, localUserCache.size, localOpdJabatans.length, isAdmin]);

    const handleSave = async (data: Partial<Formulir>) => {
        if (!userProfile) return;
        try {
            if (formToEdit) {
                const docRef = doc(db, 'formulir', formToEdit.id!);
                await updateDoc(docRef, data);
                addToast('Formulir berhasil diperbarui.', 'success'); 
            } else {
                await addDoc(collection(db, 'formulir'), {
                    ...data,
                    opdId: userProfile.opdId,
                    createdBy: userProfile.uid,
                    createdAt: Timestamp.now(),
                });
                addToast('Formulir baru berhasil dibuat.', 'success'); 
            }
            setIsModalOpen(false);
            fetchForms(); 
        } catch (error) {
            console.error("Gagal menyimpan formulir:", error);
            addToast("Gagal menyimpan formulir.", "error"); 
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus formulir ini? Semua respon juga akan terhapus.")) {
            // TODO: Hapus juga sub-koleksi respon (memerlukan cloud function)
            await deleteDoc(doc(db, 'formulir', id));
            addToast('Formulir berhasil dihapus.', 'success'); 
            fetchForms(); 
        }
    };

    const openShareModal = (form: Formulir) => {
        const link = `${window.location.origin}/dashboard/formulir/${form.id}`;
        setShareLink(link);
        setIsCopied(false);
        setIsShareModalOpen(true); 
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink);
        addToast("Tautan berhasil disalin!", "success"); 
    };

    if (authLoading || loading || isCacheLoading) { 
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>;
    }

    if (!isAdmin) {
        return <div className="text-center p-8 bg-white dark:bg-dark-card rounded-lg">Halaman ini hanya untuk Admin OPD, Staf TU, atau Super Admin.</div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                    <ClipboardEdit size={28} className="mr-3 text-green-600" />
                    Kelola Formulir Internal
                </h1>
                <Button onClick={() => { setFormToEdit(null); setIsModalOpen(true); }} className="shrink-0">
                    <Plus size={18} className="mr-2" /> Buat Formulir Baru
                </Button>
            </div>

            {formulirList.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-dark-text-secondary bg-white dark:bg-dark-card rounded-xl border-2 border-dashed dark:border-dark-border">
                    <p className="font-semibold">Belum ada formulir yang dibuat.</p>
                    <p className="text-sm">Klik "Buat Formulir Baru" untuk memulai.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {formulirList.map(form => (
                        <Card key={form.id} className="flex flex-col justify-between group hover:border-primary/50 transition-all">
                            <CardHeader>
                                <CardTitle className="line-clamp-2 text-lg">{form.judul}</CardTitle>
                                <CardDescription className="line-clamp-3 text-xs">{form.deskripsi || 'Tidak ada deskripsi'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {form.assignmentType === 'specific_jabatan' ? (
                                    <span className="flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded w-fit">
                                        <UserCheck size={14} className="mr-1.5" /> {form.assignedToJabatanIds?.length || 0} Jabatan
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded w-fit">
                                        <Users size={14} className="mr-1.5" /> Semua Pegawai
                                    </span>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between items-center pt-0">
                                <Button variant="link" className="p-0 h-auto text-xs" asChild>
                                    <a href={`/dashboard/formulir/${form.id}/responses`}><BarChart size={14} className="mr-1"/> Lihat Respon</a>
                                </Button>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openShareModal(form)} title="Bagikan">
                                        <Share2 size={14}/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFormToEdit(form); setIsModalOpen(true); }} title="Edit">
                                        <Edit size={14}/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(form.id!)} title="Hapus">
                                        <Trash2 size={14}/>
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <FormBuilderModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave} 
                formToEdit={formToEdit} 
                userCache={localUserCache}
                opdJabatans={localOpdJabatans}
            />
            
            <ResponseModal isOpen={isResponseModalOpen} onClose={() => setIsResponseModalOpen(false)} form={formToView} />
        
            <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border">
                    <DialogHeader>
                        <DialogTitle>Bagikan Tautan Formulir</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Bagikan tautan ini agar pegawai lain dapat mengisinya.</p>
                        <div className="flex gap-2">
                            <Input type="text" readOnly value={shareLink} className="bg-muted" />
                            <Button onClick={copyToClipboard} size="icon" variant="outline">
                                <Copy size={16} />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}