/**
 * Directory: src/app/dashboard/talenta/components/succession/JobProjectionView.tsx
 * History Update:
 * - 2024-11-28: Added Dynamic Weighting inputs for succession criteria.
 * - 2024-11-28: Added 'IKU' (Indikator Kinerja Utama) field and AI Auto-fill for weights & indicators.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Briefcase, Settings2, Wand2, ShieldAlert, BrainCircuit, Loader2, Sliders, ListChecks } from 'lucide-react';
import { TargetPosition, JOB_STANDARDS, SuccessionWeights } from '../../data/succession-constants';
import { useToast } from '@/context/ToastContext'; 

interface JobProjectionViewProps {
    positions: TargetPosition[];
    isMutating: boolean;
    onAdd: (data: Omit<TargetPosition, 'id' | 'opdId'>) => Promise<boolean | undefined>;
    onUpdate: (id: string, data: Partial<TargetPosition>) => Promise<boolean | undefined>;
    onDelete: (id: string) => Promise<boolean | undefined>;
}

export default function JobProjectionView({ positions, isMutating, onAdd, onUpdate, onDelete }: JobProjectionViewProps) {
    const { addToast } = useToast(); 
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<TargetPosition | null>(null);
    const [formData, setFormData] = useState<Partial<TargetPosition>>({});
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Default Weights
    const defaultWeights: SuccessionWeights = { kinerja: 30, potensi: 30, kompetensi: 25, portofolio: 15 };
    const [weights, setWeights] = useState<SuccessionWeights>(defaultWeights);

    // State helper untuk IKU (Array to String di textarea)
    const [ikuText, setIkuText] = useState("");

    useEffect(() => {
        if (isFormOpen) {
            if (editingPosition && editingPosition.weights) {
                setWeights(editingPosition.weights);
            } else {
                setWeights(defaultWeights);
            }

            // Load IKU ke textarea
            if (editingPosition?.customProfile?.indicators) {
                setIkuText(editingPosition.customProfile.indicators.join('\n'));
            } else {
                setIkuText("");
            }
        }
    }, [isFormOpen, editingPosition]);

    const totalWeight = weights.kinerja + weights.potensi + weights.kompetensi + weights.portofolio;
    const isWeightValid = totalWeight === 100;

    const handleAddPosition = () => {
        setEditingPosition(null);
        setFormData({ 
            levelKey: 'Administrator', 
            risk: 'Medium',
            isCustom: false,
            customProfile: { tupoksiUtama: [], requiredCompetencies: [], indicators: [] }
        });
        setWeights(defaultWeights);
        setIkuText("");
        setIsFormOpen(true);
    };

    const handleEditPosition = (pos: TargetPosition) => {
        setEditingPosition(pos);
        setFormData({ ...pos });
        setIsFormOpen(true);
    };

    const handleDeletePosition = async (id: string) => {
        if (confirm("Hapus proyeksi jabatan ini?")) {
            await onDelete(id);
        }
    };

    const handleSavePosition = async () => {
        if (!formData.title) {
            addToast("Nama Jabatan wajib diisi.", "error"); return;
        }
        if (!isWeightValid) {
            addToast(`Total bobot harus 100% (Saat ini: ${totalWeight}%)`, "error"); return;
        }

        // Parse IKU Textarea kembali ke Array
        const indicatorsArray = ikuText.split('\n').filter(line => line.trim() !== "");

        const payload = {
            title: formData.title!,
            levelKey: formData.levelKey || 'Administrator',
            risk: formData.risk || 'Medium',
            isCustom: formData.isCustom ?? false, 
            customProfile: {
                ...formData.customProfile,
                indicators: indicatorsArray // Simpan IKU
            },
            weights: weights // Simpan bobot kustom
        };

        let success;
        if (editingPosition) {
            success = await onUpdate(editingPosition.id, payload);
        } else {
            success = await onAdd(payload);
        }
        if (success) setIsFormOpen(false);
    };

    const handleAutoFillProfile = async () => {
        if (!formData.title) {
            addToast("Harap isi 'Nama Jabatan' terlebih dahulu.", "error");
            return;
        }
        setIsAiLoading(true);
        try {
            const response = await fetch('/api/ai/generate-job-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTitle: formData.title,
                    jobLevel: formData.levelKey || 'Administrator'
                })
            });
            const result = await response.json();
            if (result.success && result.data) {
                const aiData = result.data;
                
                // 1. Update Profile Data
                setFormData(prev => ({
                    ...prev,
                    isCustom: true, 
                    customProfile: {
                        description: aiData.description || "Deskripsi tidak tersedia.",
                        tupoksiUtama: Array.isArray(aiData.tupoksiUtama) ? aiData.tupoksiUtama : [],
                        requiredCompetencies: Array.isArray(aiData.requiredCompetencies) ? aiData.requiredCompetencies : [],
                        minKinerja: Number(aiData.minKinerja) || 80,
                        minPotensi: Number(aiData.minPotensi) || 80,
                        indicators: Array.isArray(aiData.indicators) ? aiData.indicators : [] // Ambil IKU dari AI
                    }
                }));

                // 2. Update IKU Textarea UI
                if (Array.isArray(aiData.indicators)) {
                    setIkuText(aiData.indicators.join('\n'));
                }

                // 3. Update Weights Otomatis dari AI
                if (aiData.weights) {
                    setWeights({
                        kinerja: Number(aiData.weights.kinerja) || 30,
                        potensi: Number(aiData.weights.potensi) || 30,
                        kompetensi: Number(aiData.weights.kompetensi) || 25,
                        portofolio: Number(aiData.weights.portofolio) || 15
                    });
                }

                addToast("Profil, IKU, dan Bobot berhasil dibuat oleh AI!", "success");
            } else { throw new Error(result.error || "Gagal generate data."); }
        } catch (error: any) {
            console.error("AI Generate Error:", error);
            addToast(`Gagal: ${error.message}`, "error");
        } finally { setIsAiLoading(false); }
    };

    return (
        <>
            <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2"><Briefcase size={20}/> Kelola Daftar Proyeksi Jabatan</CardTitle>
                        <CardDescription>Tentukan kriteria, IKU, dan bobot penilaian suksesi secara spesifik.</CardDescription>
                    </div>
                    <Button onClick={handleAddPosition} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4"/> Tambah Proyeksi
                    </Button>
                </CardHeader>
                <CardContent>
                    {positions.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-xl bg-muted/20">
                            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3"/>
                            <p className="text-muted-foreground font-medium">Belum ada proyeksi jabatan.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {positions.map((pos) => (
                                <Card key={pos.id} className="relative group overflow-hidden border hover:border-blue-400 transition-all">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline">{pos.levelKey}</Badge>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditPosition(pos)}><Edit2 size={12}/></Button>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleDeletePosition(pos.id)}><Trash2 size={12}/></Button>
                                            </div>
                                        </div>
                                        <CardTitle className="text-base mt-2 leading-snug line-clamp-2" title={pos.title}>{pos.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert size={12}/> Risiko: <span className={`font-medium ${pos.risk === 'High' ? 'text-red-600' : 'text-yellow-600'}`}>{pos.risk}</span>
                                            </div>
                                            {/* Tampilkan Bobot */}
                                            <div className="grid grid-cols-4 gap-1 mt-2 bg-muted/50 p-2 rounded text-[10px] text-center">
                                                <div>
                                                    <span className="block font-bold">{pos.weights?.kinerja || 30}%</span>
                                                    <span className="text-muted-foreground">Kinerja</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold">{pos.weights?.potensi || 30}%</span>
                                                    <span className="text-muted-foreground">Potensi</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold">{pos.weights?.kompetensi || 25}%</span>
                                                    <span className="text-muted-foreground">Komp.</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold">{pos.weights?.portofolio || 15}%</span>
                                                    <span className="text-muted-foreground">Porto</span>
                                                </div>
                                            </div>
                                            {/* Indikator IKU */}
                                            {pos.customProfile?.indicators && pos.customProfile.indicators.length > 0 && (
                                                <div className="mt-2 pt-2 border-t">
                                                    <p className="flex items-center gap-1 font-medium text-[10px] mb-1">
                                                        <ListChecks size={10} /> {pos.customProfile.indicators.length} IKU Utama
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPosition ? 'Edit Profil Jabatan' : 'Tambah Proyeksi Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Jabatan</Label>
                                <Input placeholder="Contoh: Kepala Bidang Informatika" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})}/>
                            </div>
                            <div className="space-y-2">
                                <Label>Level Jabatan</Label>
                                <Select value={formData.levelKey} onValueChange={(val) => setFormData({...formData, levelKey: val})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(JOB_STANDARDS).map(key => <SelectItem key={key} value={key}>{key}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Tingkat Risiko Kekosongan</Label>
                                <Select value={formData.risk} onValueChange={(val: any) => setFormData({...formData, risk: val})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="High">High (Kritis)</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="Low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                         {/* Konfigurasi Bobot */}
                         <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                    <Sliders size={16}/> Konfigurasi Bobot Penilaian (%)
                                </h4>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" variant="outline" 
                                        onClick={handleAutoFillProfile} disabled={isAiLoading || !formData.title}
                                        className="h-7 text-xs bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                        {isAiLoading ? <Loader2 size={10} className="mr-1 animate-spin"/> : <Wand2 size={10} className="mr-1"/>}
                                        {isAiLoading ? 'AI Menganalisis...' : 'Set Otomatis via AI'}
                                    </Button>
                                    <Badge variant={isWeightValid ? "default" : "destructive"} className="text-[10px]">
                                        Total: {totalWeight}%
                                    </Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-center text-xs">
                                <div className="space-y-2">
                                    <Label>Kinerja</Label>
                                    <Input type="number" min="0" max="100" value={weights.kinerja} onChange={e => setWeights({...weights, kinerja: Number(e.target.value)})} className="h-8 text-center"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Potensi</Label>
                                    <Input type="number" min="0" max="100" value={weights.potensi} onChange={e => setWeights({...weights, potensi: Number(e.target.value)})} className="h-8 text-center"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Kompetensi</Label>
                                    <Input type="number" min="0" max="100" value={weights.kompetensi} onChange={e => setWeights({...weights, kompetensi: Number(e.target.value)})} className="h-8 text-center"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Portofolio</Label>
                                    <Input type="number" min="0" max="100" value={weights.portofolio} onChange={e => setWeights({...weights, portofolio: Number(e.target.value)})} className="h-8 text-center"/>
                                </div>
                            </div>
                             <p className="text-[10px] text-muted-foreground text-center">
                                Klik tombol AI di kanan atas untuk membiarkan sistem menyarankan bobot ideal sesuai jenis jabatan.
                            </p>
                         </div>
                         
                         <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <BrainCircuit size={16} className="text-purple-600"/> Profil Kompetensi & Tupoksi
                                </h4>
                            </div>
                            <div className="space-y-2">
                                <Label>Deskripsi Jabatan</Label>
                                <Textarea placeholder="Deskripsi singkat..." value={formData.customProfile?.description || ''} onChange={e => setFormData({...formData, isCustom: true, customProfile: { ...formData.customProfile, description: e.target.value }})} className="h-16" />
                            </div>

                             {/* [BARU] Input IKU */}
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <ListChecks size={14} /> Indikator Kinerja Utama (IKU)
                                    <span className="text-[10px] text-muted-foreground font-normal">(Pisahkan dengan baris baru)</span>
                                </Label>
                                <Textarea 
                                    placeholder="- Meningkatkan indeks SPBE..." 
                                    value={ikuText} 
                                    onChange={e => setIkuText(e.target.value)} 
                                    className="h-24 font-mono text-xs bg-white" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Min. Nilai Kinerja (0-100)</Label>
                                    <Input type="number" value={formData.customProfile?.minKinerja || 80} onChange={e => setFormData({...formData, isCustom: true, customProfile: { ...formData.customProfile, minKinerja: Number(e.target.value) }})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min. Nilai Potensi (0-100)</Label>
                                    <Input type="number" value={formData.customProfile?.minPotensi || 80} onChange={e => setFormData({...formData, isCustom: true, customProfile: { ...formData.customProfile, minPotensi: Number(e.target.value) }})} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isMutating}>Batal</Button>
                        <Button onClick={handleSavePosition} disabled={isMutating || !isWeightValid}>
                            {isMutating ? <Loader2 className="animate-spin mr-2"/> : null} 
                            Simpan Proyeksi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}