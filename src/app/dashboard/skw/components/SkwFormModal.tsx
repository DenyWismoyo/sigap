import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkwRequest, SkwAhliWaris, SkwSaksi, SkwJenisLayanan } from "@/types";
import { 
    Loader2, Plus, Trash2, Upload, FileText, Users, User, 
    ArrowLeft, Home, FileBadge, UserCheck, RefreshCcw,
    Baby, Replace
} from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SkwFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<SkwRequest>) => void;
  initialData?: SkwRequest | null;
  isSubmitting?: boolean;
}

const defaultAhliWaris: SkwAhliWaris = {
  id: '', nama: '', nik: '', tempatLahir: '', tanggalLahir: '', hubungan: '', alamat: ''
};

const defaultSaksi: SkwSaksi = {
  id: '', nama: '', nik: '', umur: '', pekerjaan: '', alamat: ''
};

export default function SkwFormModal({ 
  isOpen, onClose, onSubmit, initialData, isSubmitting = false 
}: SkwFormModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("utama");
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'selection' | 'form'>('selection');

  const [formData, setFormData] = useState<Partial<SkwRequest>>({
    jenis: 'Umum',
    // Data Default
    namaPemohon: '', nikPemohon: '', alamatPemohon: '',
    // Data Almarhum
    namaAlmarhum: '', nikAlmarhum: '', tanggalMeninggal: '', tempatMeninggal: '', alamatAlmarhum: '',
    // Data Perwalian
    namaAnak: '', tempatTanggalLahirAnak: '', namaAyah: '', namaIbu: '',
    // Data Ralat
    ralatDari: '', ralatMenjadi: '',
    // Meta
    nomorSurat: '', tanggalSurat: new Date().toISOString().split('T')[0], status: 'Diajukan',
    ahliWaris: [], saksi: [], lampiranUrl: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
            ...initialData,
            ahliWaris: initialData.ahliWaris || [],
            saksi: initialData.saksi || []
        });
        setStep('form');
      } else {
        setFormData({
          jenis: 'Umum',
          namaPemohon: '', nikPemohon: '', alamatPemohon: '',
          namaAlmarhum: '', nikAlmarhum: '', tanggalMeninggal: '', tempatMeninggal: '', alamatAlmarhum: '',
          namaAnak: '', tempatTanggalLahirAnak: '', namaAyah: '', namaIbu: '',
          ralatDari: '', ralatMenjadi: '',
          nomorSurat: '', tanggalSurat: new Date().toISOString().split('T')[0], status: 'Diajukan',
          ahliWaris: [], saksi: [], lampiranUrl: ''
        });
        setStep('selection');
      }
      setActiveTab("utama");
    }
  }, [isOpen, initialData]);

  const isFullForm = ['Tanah', 'Umum'].includes(formData.jenis || '');

  const handleTypeSelect = (type: SkwJenisLayanan) => {
      setFormData(prev => ({ ...prev, jenis: type }));
      setStep('form');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
        const storage = getStorage();
        const appId = 'default-app-id'; 
        const storageRef = ref(storage, `artifacts/${appId}/public/data/skw-files/${Date.now()}-${file.name}`);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        setFormData(prev => ({ ...prev, lampiranUrl: url }));
        toast({ title: "Upload Berhasil", description: "File lampiran telah berhasil diunggah." });
    } catch(e) { 
        console.error("Upload error:", e);
        toast({ title: "Upload Gagal", description: "Terjadi kesalahan saat mengunggah file.", variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };
  
  const addAhliWaris = () => setFormData(prev => ({...prev, ahliWaris: [...(prev.ahliWaris||[]), {...defaultAhliWaris, id: Math.random().toString()}]}));
  const removeAhliWaris = (id:string) => setFormData(prev => ({...prev, ahliWaris: (prev.ahliWaris||[]).filter(x => x.id !== id)}));
  const updateAhliWaris = (id:string, f:keyof SkwAhliWaris, v:string) => setFormData(prev => ({...prev, ahliWaris: (prev.ahliWaris||[]).map(x => x.id===id ? {...x, [f]:v} : x)}));

  const addSaksi = () => setFormData(prev => ({...prev, saksi: [...(prev.saksi||[]), {...defaultSaksi, id: Math.random().toString()}]}));
  const removeSaksi = (id:string) => setFormData(prev => ({...prev, saksi: (prev.saksi||[]).filter(x => x.id !== id)}));
  const updateSaksi = (id:string, f:keyof SkwSaksi, v:string) => setFormData(prev => ({...prev, saksi: (prev.saksi||[]).map(x => x.id===id ? {...x, [f]:v} : x)}));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const SelectionScreen = () => (
    <div className="flex flex-col h-full p-6">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Pilih Jenis Layanan SKW</h2>
            <p className="text-muted-foreground">Silakan pilih kategori permohonan untuk menyesuaikan formulir yang dibutuhkan.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <Card className="cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all group" onClick={() => handleTypeSelect('Tanah')}>
                <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                    <div className="p-4 rounded-full bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform"><Home size={32} /></div>
                    <div><h3 className="font-bold text-lg">Keperluan Tanah</h3><p className="text-sm text-muted-foreground mt-1">Pengurusan sertifikat tanah & waris.</p></div>
                </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group" onClick={() => handleTypeSelect('Umum')}>
                <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                    <div className="p-4 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform"><FileBadge size={32} /></div>
                    <div><h3 className="font-bold text-lg">Keperluan Umum</h3><p className="text-sm text-muted-foreground mt-1">Administrasi bank, taspen, dll.</p></div>
                </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all group" onClick={() => handleTypeSelect('Perwalian')}>
                <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                    <div className="p-4 rounded-full bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform"><UserCheck size={32} /></div>
                    <div><h3 className="font-bold text-lg">Perwalian</h3><p className="text-sm text-muted-foreground mt-1">Penetapan wali untuk anak di bawah umur.</p></div>
                </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all group" onClick={() => handleTypeSelect('Ralat')}>
                <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                    <div className="p-4 rounded-full bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform"><RefreshCcw size={32} /></div>
                    <div><h3 className="font-bold text-lg">Ralat Identitas</h3><p className="text-sm text-muted-foreground mt-1">Perbaikan kesalahan penulisan nama/data.</p></div>
                </CardContent>
            </Card>
        </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center gap-4">
          {step === 'form' && !initialData && (
              <Button variant="ghost" size="icon" onClick={() => setStep('selection')} className="-ml-2"><ArrowLeft size={18} /></Button>
          )}
          <DialogTitle>
             {step === 'selection' ? 'Buat Permohonan Baru' : `Formulir SKW - ${formData.jenis} ${initialData ? '(Edit)' : ''}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'selection' ? (
            <SelectionScreen />
        ) : (
            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-6 pt-2 border-b bg-muted/20">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="utama" className="gap-2"><User size={14}/> Utama</TabsTrigger>
                            <TabsTrigger value="ahliwaris" disabled={!isFullForm} className={cn("gap-2", !isFullForm && "opacity-50 cursor-not-allowed")}><Users size={14}/> Ahli Waris</TabsTrigger>
                            <TabsTrigger value="saksi" className="gap-2"><Users size={14}/> Saksi</TabsTrigger>
                            <TabsTrigger value="arsip" className="gap-2"><FileText size={14}/> Arsip</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 px-6 py-4">
                        <TabsContent value="utama" className="mt-0 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* SECTION PEMOHON (Semua Tipe) */}
                                <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 h-fit">
                                    <h3 className="font-semibold flex items-center gap-2 text-primary">
                                        <User size={16} /> Data Pemohon {formData.jenis === 'Perwalian' && '(Wali)'}
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="space-y-1"><Label>Nama Pemohon</Label><Input name="namaPemohon" value={formData.namaPemohon} onChange={handleChange} required /></div>
                                        <div className="space-y-1"><Label>NIK Pemohon</Label><Input name="nikPemohon" value={formData.nikPemohon} onChange={handleChange} required /></div>
                                        <div className="space-y-1"><Label>Alamat Pemohon</Label><Textarea name="alamatPemohon" value={formData.alamatPemohon} onChange={handleChange} rows={3} /></div>
                                    </div>
                                </div>

                                {/* SECTION KHUSUS PERWALIAN (Anak & Orang Tua) */}
                                {formData.jenis === 'Perwalian' && (
                                    <div className="space-y-4 border p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 h-fit border-purple-200">
                                        <h3 className="font-semibold flex items-center gap-2 text-purple-700">
                                            <Baby size={16} /> Data Anak & Orang Tua
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="space-y-1"><Label>Nama Anak</Label><Input name="namaAnak" value={formData.namaAnak} onChange={handleChange} placeholder="Anak yang dimohonkan perwalian" required /></div>
                                            <div className="space-y-1"><Label>TTL Anak</Label><Input name="tempatTanggalLahirAnak" value={formData.tempatTanggalLahirAnak} onChange={handleChange} placeholder="Tempat, YYYY-MM-DD" /></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1"><Label>Nama Ayah</Label><Input name="namaAyah" value={formData.namaAyah} onChange={handleChange} placeholder="Ayah Kandung" /></div>
                                                <div className="space-y-1"><Label>Nama Ibu</Label><Input name="namaIbu" value={formData.namaIbu} onChange={handleChange} placeholder="Ibu Kandung" /></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION KHUSUS RALAT */}
                                {formData.jenis === 'Ralat' && (
                                    <div className="space-y-4 border p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 h-fit border-amber-200">
                                        <h3 className="font-semibold flex items-center gap-2 text-amber-700">
                                            <Replace size={16} /> Detail Ralat Identitas
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground text-xs uppercase font-bold">Tertulis / Semula</Label>
                                                <Input name="ralatDari" value={formData.ralatDari} onChange={handleChange} placeholder="Contoh: Nama di KK salah" className="bg-white" />
                                            </div>
                                            <div className="flex justify-center -my-2 text-amber-500"><ArrowLeft className="rotate-[-90deg]" size={20}/></div>
                                            <div className="space-y-1">
                                                <Label className="text-emerald-600 text-xs uppercase font-bold">Seharusnya / Menjadi</Label>
                                                <Input name="ralatMenjadi" value={formData.ralatMenjadi} onChange={handleChange} placeholder="Contoh: Nama sesuai Akta Kelahiran" className="bg-emerald-50 border-emerald-200" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION ALMARHUM (Hanya Tanah & Umum) */}
                                {isFullForm && (
                                    <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 h-fit">
                                        <h3 className="font-semibold flex items-center gap-2 text-destructive">
                                            <User size={16} /> Data Almarhum
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="space-y-1"><Label>Nama Almarhum</Label><Input name="namaAlmarhum" value={formData.namaAlmarhum} onChange={handleChange} /></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1"><Label>NIK Almarhum</Label><Input name="nikAlmarhum" value={formData.nikAlmarhum} onChange={handleChange} /></div>
                                                <div className="space-y-1"><Label>Tgl Meninggal</Label><Input type="date" name="tanggalMeninggal" value={formData.tanggalMeninggal} onChange={handleChange} /></div>
                                            </div>
                                            <div className="space-y-1"><Label>Tempat Meninggal</Label><Input name="tempatMeninggal" value={formData.tempatMeninggal} onChange={handleChange} /></div>
                                            <div className="space-y-1"><Label>Alamat Terakhir</Label><Textarea name="alamatAlmarhum" value={formData.alamatAlmarhum} onChange={handleChange} rows={2} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section Administrasi (Selalu Ada) */}
                            <div className="space-y-4 border p-4 rounded-lg mt-4">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Administrasi Surat</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>Nomor Surat</Label><Input name="nomorSurat" value={formData.nomorSurat} onChange={handleChange} placeholder="Auto-generate" /></div>
                                    <div className="space-y-1"><Label>Tanggal Surat</Label><Input type="date" name="tanggalSurat" value={formData.tanggalSurat} onChange={handleChange} /></div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tabs Ahli Waris & Saksi & Arsip sama seperti sebelumnya */}
                        {isFullForm && (
                            <TabsContent value="ahliwaris" className="mt-0 space-y-4">
                                <div className="flex justify-between items-center"><h3 className="font-semibold">Daftar Ahli Waris</h3><Button type="button" onClick={addAhliWaris} size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Tambah Ahli Waris</Button></div>
                                <div className="space-y-4">
                                    {formData.ahliWaris?.map((waris, index) => (
                                        <div key={waris.id} className="border rounded-lg p-4 relative bg-card space-y-3">
                                            <Button className="absolute right-4 top-4" type="button" variant="ghost" size="icon" onClick={() => removeAhliWaris(waris.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                            <div className="font-medium text-sm text-muted-foreground mb-2">Ahli Waris #{index + 1}</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Input value={waris.nama} onChange={(e) => updateAhliWaris(waris.id, 'nama', e.target.value)} placeholder="Nama" />
                                                <Input value={waris.nik} onChange={(e) => updateAhliWaris(waris.id, 'nik', e.target.value)} placeholder="NIK" />
                                                <Input value={waris.hubungan} onChange={(e) => updateAhliWaris(waris.id, 'hubungan', e.target.value)} placeholder="Hubungan" />
                                                <Input value={waris.alamat} onChange={(e) => updateAhliWaris(waris.id, 'alamat', e.target.value)} placeholder="Alamat" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        )}

                        <TabsContent value="saksi" className="mt-0 space-y-4">
                            <div className="flex justify-between items-center"><h3 className="font-semibold">Saksi-Saksi</h3><Button type="button" onClick={addSaksi} size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Tambah Saksi</Button></div>
                            <div className="space-y-4">
                                {formData.saksi?.map((saksi, index) => (
                                    <div key={saksi.id} className="border rounded-lg p-4 relative bg-card space-y-3">
                                        <Button className="absolute right-4 top-4" type="button" variant="ghost" size="icon" onClick={() => removeSaksi(saksi.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        <div className="font-medium text-sm text-muted-foreground mb-2">Saksi #{index + 1}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Input value={saksi.nama} onChange={(e) => updateSaksi(saksi.id, 'nama', e.target.value)} placeholder="Nama Saksi" />
                                            <Input value={saksi.nik} onChange={(e) => updateSaksi(saksi.id, 'nik', e.target.value)} placeholder="NIK" />
                                            <Input value={saksi.umur} onChange={(e) => updateSaksi(saksi.id, 'umur', e.target.value)} placeholder="Umur" />
                                            <Input value={saksi.pekerjaan} onChange={(e) => updateSaksi(saksi.id, 'pekerjaan', e.target.value)} placeholder="Pekerjaan" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="arsip" className="mt-0 space-y-6">
                            <div className="border rounded-lg p-6 bg-slate-50 dark:bg-slate-900/50 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Upload size={24} /></div>
                                <h3 className="font-semibold text-lg">Upload Berkas Pendukung</h3>
                                <Input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} className="max-w-md mx-auto cursor-pointer" />
                                {isUploading && <div className="text-sm text-blue-600 flex items-center justify-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Mengunggah...</div>}
                                {formData.lampiranUrl && !isUploading && <div className="text-green-600 text-sm font-medium">File Terupload</div>}
                            </div>
                        </TabsContent>
                    </ScrollArea>

                    <DialogFooter className="px-6 py-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={isSubmitting || isUploading}>{isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Permohonan'}</Button>
                    </DialogFooter>
                </Tabs>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}