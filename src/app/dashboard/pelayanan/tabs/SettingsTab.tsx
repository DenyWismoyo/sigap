// Lokasi: src/app/dashboard/pelayanan/tabs/SettingsTab.tsx
// [FIX ERROR] Menghapus impor 'Switch' yang menyebabkan error build.
// Kita menggunakan 'Checkbox' yang sudah tersedia.

"use client";

import React, { useState, useEffect } from 'react';
import { usePelayananData, CustomColumn } from '@/app/dashboard/hooks/usePelayananData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// [PERBAIKAN] Menghapus baris import Switch yang error
// import { Switch } from "@/components/ui/toggle"; 
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Settings, Save, GripVertical, Loader2 } from 'lucide-react';

export default function SettingsTab() {
    const { customColumns, saveSettings, isMutating } = usePelayananData();
    const [columns, setColumns] = useState<CustomColumn[]>([]);

    // Load initial data
    useEffect(() => {
        if (customColumns) {
            setColumns(customColumns);
        }
    }, [customColumns]);

    const addColumn = () => {
        const newCol: CustomColumn = {
            id: `col_${Date.now()}`,
            label: '',
            type: 'text',
            required: false,
            options: []
        };
        setColumns([...columns, newCol]);
    };

    const updateColumn = (index: number, field: keyof CustomColumn, value: any) => {
        const newCols = [...columns];
        newCols[index] = { ...newCols[index], [field]: value };
        setColumns(newCols);
    };
    
    const handleOptionsChange = (index: number, val: string) => {
        const opts = val.split(',').map(s => s.trim()).filter(s => s !== '');
        updateColumn(index, 'options', opts);
    };

    const removeColumn = (index: number) => {
        const newCols = columns.filter((_, i) => i !== index);
        setColumns(newCols);
    };

    const handleSave = () => {
        // Validasi sederhana
        const valid = columns.every(c => c.label.trim() !== '');
        if (!valid) {
            alert("Label kolom tidak boleh kosong.");
            return;
        }
        saveSettings(columns);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeInUp">
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="text-gray-600"/> Kustomisasi Formulir
                    </CardTitle>
                    <CardDescription>
                        Atur kolom data tambahan yang ingin dicatat (misal: Alamat, Kelurahan, RT/RW). 
                        Data ini akan muncul di formulir Pengambilan dan Layanan Umum.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {columns.map((col, idx) => (
                        <div key={col.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-muted/30 items-start">
                            <div className="mt-2 text-muted-foreground cursor-grab">
                                <GripVertical size={20}/>
                            </div>
                            
                            <div className="flex-1 space-y-4 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Label Kolom</Label>
                                        <Input 
                                            value={col.label} 
                                            onChange={e => updateColumn(idx, 'label', e.target.value)}
                                            placeholder="Contoh: Asal Kelurahan"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Tipe Input</Label>
                                        <Select value={col.type} onValueChange={v => updateColumn(idx, 'type', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Teks Singkat</SelectItem>
                                                <SelectItem value="dropdown">Pilihan (Dropdown)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {col.type === 'dropdown' && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2">
                                        <Label>Opsi Pilihan (Pisahkan dengan koma)</Label>
                                        <Input 
                                            defaultValue={col.options?.join(', ')}
                                            onBlur={e => handleOptionsChange(idx, e.target.value)}
                                            placeholder="Contoh: Desa A, Desa B, Desa C"
                                        />
                                        <p className="text-xs text-muted-foreground">Tekan enter atau klik luar untuk menyimpan opsi.</p>
                                    </div>
                                )}
                                
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`req-${col.id}`} 
                                        checked={col.required}
                                        onCheckedChange={(c) => updateColumn(idx, 'required', c as boolean)}
                                    />
                                    <Label htmlFor={`req-${col.id}`} className="text-sm font-normal cursor-pointer">Wajib Diisi</Label>
                                </div>
                            </div>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeColumn(idx)}
                            >
                                <Trash2 size={18}/>
                            </Button>
                        </div>
                    ))}

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                        <Button variant="outline" onClick={addColumn} className="border-dashed border-2">
                            <Plus size={16} className="mr-2"/> Tambah Kolom Baru
                        </Button>

                        <Button onClick={handleSave} disabled={isMutating} className="bg-green-600 hover:bg-green-700">
                            {isMutating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>} 
                            Simpan Pengaturan
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}