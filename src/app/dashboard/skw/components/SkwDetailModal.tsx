import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkwRequest, SkwJenisLayanan } from "@/types"; 
import { 
    User, FileText, Download, Eye, CheckCircle2, XCircle, Clock, Baby, Replace, ArrowRight
} from "lucide-react";

interface SkwDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SkwRequest | null;
}

export default function SkwDetailModal({ isOpen, onClose, data }: SkwDetailModalProps) {
  const [activeTab, setActiveTab] = useState("utama");

  if (!data) return null;
  const isFullData = ['Tanah', 'Umum'].includes(data.jenis);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disetujui': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Disetujui</Badge>;
      case 'Ditolak': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Ditolak</Badge>;
      default: return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
    }
  };

  const getJenisBadge = (jenis: SkwJenisLayanan) => {
      const colors = {
          'Tanah': 'bg-emerald-100 text-emerald-800',
          'Umum': 'bg-blue-100 text-blue-800',
          'Perwalian': 'bg-purple-100 text-purple-800',
          'Ralat': 'bg-amber-100 text-amber-800'
      };
      return <Badge className={colors[jenis]}>{jenis}</Badge>;
  };

  const DetailRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-2 text-sm py-2 border-b last:border-0">
      <div className="text-muted-foreground font-medium">{label}</div>
      <div className="col-span-2 text-foreground">{value || "-"}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/10">
          <div className="flex justify-between items-start">
            <div>
                <DialogTitle className="text-xl flex items-center gap-2">Detail Permohonan {getJenisBadge(data.jenis)}</DialogTitle>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2"><span>ID: {data.id}</span><span>•</span><span>{data.tanggalSurat}</span></div>
            </div>
            <div>{getStatusBadge(data.status)}</div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                <div className="px-6 pt-2 border-b bg-muted/20">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="utama">Data Utama</TabsTrigger>
                        <TabsTrigger value="ahliwaris" disabled={!isFullData} className={!isFullData ? "opacity-50" : ""}>Ahli Waris {data.ahliWaris?.length ? `(${data.ahliWaris.length})` : ''}</TabsTrigger>
                        <TabsTrigger value="saksi">Saksi ({data.saksi?.length || 0})</TabsTrigger>
                        <TabsTrigger value="arsip">Arsip</TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6">
                        <TabsContent value="utama" className="mt-0 space-y-6">
                            <div className="bg-card border rounded-lg overflow-hidden">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b font-semibold flex items-center gap-2 text-sm">
                                    <User size={16} className="text-blue-500"/> Data Pemohon
                                </div>
                                <div className="p-4 space-y-1">
                                    <DetailRow label="Nama Lengkap" value={data.namaPemohon} />
                                    <DetailRow label="NIK" value={data.nikPemohon} />
                                    <DetailRow label="Alamat" value={data.alamatPemohon} />
                                </div>
                            </div>

                            {/* KHUSUS PERWALIAN */}
                            {data.jenis === 'Perwalian' && (
                                <div className="bg-card border rounded-lg overflow-hidden border-purple-200">
                                    <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 border-b border-purple-200 font-semibold flex items-center gap-2 text-sm text-purple-700">
                                        <Baby size={16}/> Data Perwalian Anak
                                    </div>
                                    <div className="p-4 space-y-1">
                                        <DetailRow label="Nama Anak" value={data.namaAnak} />
                                        <DetailRow label="TTL Anak" value={data.tempatTanggalLahirAnak} />
                                        <DetailRow label="Nama Ayah" value={data.namaAyah} />
                                        <DetailRow label="Nama Ibu" value={data.namaIbu} />
                                    </div>
                                </div>
                            )}

                            {/* KHUSUS RALAT */}
                            {data.jenis === 'Ralat' && (
                                <div className="bg-card border rounded-lg overflow-hidden border-amber-200">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 border-b border-amber-200 font-semibold flex items-center gap-2 text-sm text-amber-700">
                                        <Replace size={16}/> Detail Ralat Identitas
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                            <span className="text-xs font-bold text-red-500 uppercase block mb-1">Tertulis / Semula</span>
                                            <div className="font-medium text-lg">{data.ralatDari}</div>
                                        </div>
                                        <div className="hidden md:flex justify-center text-muted-foreground"><ArrowRight /></div>
                                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                            <span className="text-xs font-bold text-emerald-500 uppercase block mb-1">Seharusnya / Menjadi</span>
                                            <div className="font-medium text-lg">{data.ralatMenjadi}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Data Almarhum hanya jika Full Data */}
                            {isFullData && (
                                <div className="bg-card border rounded-lg overflow-hidden">
                                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b font-semibold flex items-center gap-2 text-sm">
                                        <User size={16} className="text-red-500"/> Data Almarhum
                                    </div>
                                    <div className="p-4 space-y-1">
                                        <DetailRow label="Nama Almarhum" value={data.namaAlmarhum} />
                                        <DetailRow label="NIK" value={data.nikAlmarhum} />
                                        <DetailRow label="Tgl Meninggal" value={data.tanggalMeninggal} />
                                        <DetailRow label="Tempat Meninggal" value={data.tempatMeninggal} />
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Tabs content lainnya sama ... */}
                        {isFullData && (
                            <TabsContent value="ahliwaris" className="mt-0">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Daftar Ahli Waris</h3>
                                    {(!data.ahliWaris || data.ahliWaris.length === 0) ? (
                                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">Tidak ada data ahli waris tercatat.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            {data.ahliWaris.map((waris, i) => (
                                                <div key={i} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-card">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">{i + 1}</div>
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                        <div><span className="text-muted-foreground text-xs block">Nama</span><span className="font-medium">{waris.nama}</span></div>
                                                        <div><span className="text-muted-foreground text-xs block">Hubungan</span><Badge variant="secondary">{waris.hubungan}</Badge></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        )}

                        <TabsContent value="saksi" className="mt-0">
                             <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Daftar Saksi</h3>
                                {(!data.saksi || data.saksi.length === 0) ? (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">Tidak ada data saksi tercatat.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {data.saksi.map((saksi, i) => (
                                            <div key={i} className="p-4 border rounded-lg bg-card space-y-3">
                                                <div className="flex items-center gap-3 border-b pb-2"><Badge variant="outline">Saksi {i + 1}</Badge><span className="font-semibold">{saksi.nama}</span></div>
                                                <div className="space-y-2 text-sm"><div><span className="text-muted-foreground">Pekerjaan:</span> {saksi.pekerjaan}</div></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="arsip" className="mt-0">
                            <div className="flex flex-col items-center justify-center py-10 space-y-6 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm"><FileText size={48} className="text-blue-600" /></div>
                                {data.lampiranUrl ? (
                                    <Button asChild variant="default"><a href={data.lampiranUrl} target="_blank" rel="noreferrer"><Eye className="w-4 h-4 mr-2" /> Lihat Dokumen</a></Button>
                                ) : (
                                    <span className="text-sm font-medium text-amber-600">Belum ada file</span>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </ScrollArea>
                
                <DialogFooter className="px-6 py-4 border-t bg-muted/10 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Tutup</Button>
                </DialogFooter>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}