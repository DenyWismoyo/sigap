// Lokasi: src/app/dashboard/laporan-langganan/page.tsx
// [REFACTOR SHADCN (Fase 4)]
// - Mengganti SEMUA modal kustom (.modal-backdrop) dengan <Dialog> shadcn/ui.
// - Mengganti SEMUA form HTML standar dengan <Input>, <Label>, <Select>, <Textarea>, <Button>, <Checkbox> shadcn/ui.
// - Mengganti <StatCard> kustom dengan <Card> shadcn/ui (dibuat komponen lokal).
// - Mengganti <TabButton> kustom dengan <Tabs> shadcn/ui.
// - Mengganti tabel HTML dengan <Table> shadcn/ui.
// - Menggunakan <Alert> untuk pesan error.
// - [PERBAIKAN] Memperbaiki path alias '@/' (sebelumnya '../')
// - [PERBAIKAN BUG] Memperbaiki React.cloneElement di StatCard lokal

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase'; // [PERBAIKAN] Path
import { collection, doc, getDocs, onSnapshot, setDoc, Timestamp, addDoc, query, where, orderBy, deleteDoc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext'; // [PERBAIKAN] Path
import { OPD, OpdConfig, PaymentHistory, PricingPackage, Tagihan } from '@/types'; // [PERBAIKAN] Path
import { DollarSign, Save, X, Loader2, Clock, CheckCircle, FileText, Search, Edit, Trash2, Plus, Users, Eye, BarChart, FileWarning, Receipt, Settings, AlertTriangle } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal'; // [PERBAIKAN] Path

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"; // [PERBAIKAN] Path
import { Button } from "@/components/ui/button"; // [PERBAIKAN] Path
import { Input } from "@/components/ui/input"; // [PERBAIKAN] Path
import { Label } from "@/components/ui/label"; // [PERBAIKAN] Path
import { Textarea } from "@/components/ui/textarea"; // [PERBAIKAN] Path
import { Checkbox } from "@/components/ui/checkbox"; // [PERBAIKAN] Path
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // [PERBAIKAN] Path
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // [PERBAIKAN] Path
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // [PERBAIKAN] Path
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"; // [PERBAIKAN] Path
import { ScrollArea } from "@/components/ui/scroll-area"; // [PERBAIKAN] Path
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // [PERBAIKAN] Path
// --- Akhir Impor Shadcn ---


// [REFACTOR] Komponen StatCard (Menggunakan Shadcn)
const StatCard = ({ title, value, icon, colorClass }: { title: string, value: string | number, icon: React.ReactNode, colorClass: string }) => {
    
    // [PERBAIKAN BUG] Tambahkan validasi dan @ts-ignore, sama seperti di StatCard.tsx
    const iconElement = React.isValidElement(icon) 
    ? React.cloneElement(icon, { 
        // @ts-ignore 
        className: `w-5 h-5 ${colorClass}` 
      }) 
    : null;

    return (
        <Card className="shadow-sm border-gray-200 dark:border-dark-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">
              {title}
            </CardTitle>
            <div className={`p-2 rounded-full ${colorClass.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20`}>
              {/* [PERBAIKAN BUG] Gunakan iconElement yang sudah divalidasi */}
              {iconElement}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              {value}
            </div>
          </CardContent>
        </Card>
    );
};
// --- Akhir StatCard ---

// --- [REFACTOR] Modal Konfigurasi OPD (Menggunakan Shadcn) ---
const KonfigurasiOpdModal = ({ isOpen, onClose, opd, currentConfig, pricingPackages, onSave, onCancelSubscription, isSaving, defaultFeatures }: {
    isOpen: boolean,
    onClose: () => void,
    opd: OPD,
    currentConfig: OpdConfig | null,
    pricingPackages: PricingPackage[],
    onSave: (opdId: string, newConfig: OpdConfig, buatTagihanLunas: boolean) => Promise<void>,
    onCancelSubscription: (opd: OPD) => void,
    isSaving: boolean,
    defaultFeatures: OpdConfig['features']
}) => {
    
    const [formData, setFormData] = useState<OpdConfig | null>(null);
    const [tanggalAktifHingga, setTanggalAktifHingga] = useState('');
    const [buatDanLunasi, setBuatDanLunasi] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const config = currentConfig || {
                packageName: 'Dasar',
                langgananAktifHingga: Timestamp.now(),
                paymentStatus: 'Menunggu Pembayaran',
                kuotaPengguna: 5,
                penggunaAktifSaatIni: 0,
                features: defaultFeatures
            };
            const fullConfig = { ...config, features: { ...defaultFeatures, ...config.features }};
            setFormData(fullConfig);
            setTanggalAktifHingga(fullConfig.langgananAktifHingga.toDate().toISOString().split('T')[0]);
            setBuatDanLunasi(fullConfig.paymentStatus === 'Kedaluwarsa'); 
        }
    }, [isOpen, currentConfig, defaultFeatures]);

    const handlePackageChange = (packageName: OpdConfig['packageName']) => {
        if (!formData) return;
        if (packageName === 'Custom') {
            setFormData(prev => prev ? ({ ...prev, packageName }) : null);
            return;
        }
        const selectedPkg = pricingPackages.find(p => p.id === packageName);
        if (selectedPkg) {
            setFormData(prev => prev ? ({ 
                ...prev, 
                packageName, 
                features: { ...defaultFeatures, ...selectedPkg.features }
            }) : null);
        }
    };
    
    const handleFeatureToggle = (feature: keyof OpdConfig['features']) => {
        if (!formData) return;
        setFormData(prev => prev ? ({
            ...prev,
            packageName: 'Custom',
            features: { ...prev.features, [feature]: !prev.features[feature] }
        }) : null);
    };

    const handleSaveClick = () => {
        if (!formData) return;
        const updatedConfig = {
            ...formData,
            langgananAktifHingga: Timestamp.fromDate(new Date(tanggalAktifHingga))
        };
        onSave(opd.id!, updatedConfig, buatDanLunasi);
    };
    
    if (!isOpen || !formData) {
        return null; // Dialog shadcn akan menangani isOpen
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border p-0 gap-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Konfigurasi: {opd.namaOpd}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                    <div className="px-6 space-y-4">
                        <div>
                            <Label htmlFor="pkg-select">Paket Langganan</Label>
                            <Select value={formData.packageName} onValueChange={(v) => handlePackageChange(v as any)}>
                                <SelectTrigger id="pkg-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {pricingPackages.map(p => <SelectItem key={p.id} value={p.id!}>{p.id}</SelectItem>)}
                                    <SelectItem value="Custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="kuota">Kuota Pengguna</Label>
                                <Input 
                                    id="kuota"
                                    type="number" 
                                    value={formData.kuotaPengguna} 
                                    onChange={e => setFormData(prev => prev ? ({ ...prev, kuotaPengguna: Number(e.target.value) }) : null)} 
                                />
                            </div>
                            <div>
                                <Label htmlFor="tgl-aktif">Langganan Aktif Hingga</Label>
                                <Input 
                                    id="tgl-aktif"
                                    type="date" 
                                    value={tanggalAktifHingga}
                                    onChange={e => setTanggalAktifHingga(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Checkbox 
                                    id="buat-lunas"
                                    checked={buatDanLunasi} 
                                    onCheckedChange={(c) => setBuatDanLunasi(c as boolean)} 
                                />
                                <Label htmlFor="buat-lunas" className="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                                    Sekaligus Buat Tagihan & Tandai sebagai LUNAS
                                </Label>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 pl-8">
                                Jika dicentang, sistem akan otomatis membuat tagihan dan riwayat pembayaran untuk aktivasi ini, lalu mengubah status OPD menjadi "Lunas".
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <h4 className="font-bold">Fitur (Otomatis berdasarkan paket, atau set manual ke 'Custom')</h4>
                            <ScrollArea className="h-40 border rounded-md p-2 dark:border-dark-border">
                                {Object.keys(formData.features || defaultFeatures).map(key => (
                                    <div key={key} className="flex items-center gap-3 p-2">
                                        <Checkbox 
                                            id={`feat-${key}`}
                                            checked={(formData.features || defaultFeatures)[key as keyof typeof defaultFeatures] || false} 
                                            onCheckedChange={() => handleFeatureToggle(key as any)} 
                                        /> 
                                        <Label htmlFor={`feat-${key}`} className="cursor-pointer">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-6 p-4 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 border-t">
                    <Button 
                        type="button" 
                        variant="destructive"
                        onClick={() => onCancelSubscription(opd)} 
                        disabled={isSaving} 
                    >
                        Batalkan Langganan
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleSaveClick} 
                        disabled={isSaving} 
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Simpan Konfigurasi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
// --- [AKHIR MODAL KONFIGURASI] ---


// --- [REFACTOR] Komponen Modal Buat Tagihan Manual (Menggunakan Shadcn) ---
const TagihanManualModal = ({ isOpen, onClose, opdList, formData, setFormData, onSave, isSaving }: {
    isOpen: boolean,
    onClose: () => void,
    opdList: (OPD & { indent?: boolean })[],
    formData: { opdId: string, totalTagihan: number, catatan: string, periodeBulan: number },
    setFormData: (data: { opdId: string, totalTagihan: number, catatan: string, periodeBulan: number }) => void,
    onSave: () => void,
    isSaving: boolean
}) => {
    
    if (!isOpen) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border">
                <DialogHeader>
                    <DialogTitle>Buat Tagihan Manual</DialogTitle>
                </DialogHeader>
                <div className="p-0 pt-2 space-y-4">
                    <div>
                        <Label htmlFor="opd-tagihan">Pilih OPD</Label>
                        <Select
                            value={formData.opdId}
                            onValueChange={v => setFormData({ ...formData, opdId: v })}
                        >
                            <SelectTrigger id="opd-tagihan"><SelectValue placeholder="-- Pilih OPD --" /></SelectTrigger>
                            <SelectContent>
                                {opdList.map(opd => (
                                    <SelectItem key={opd.id} value={opd.id!}>
                                        {(opd as any).indent ? '\u00A0\u00A0↳ ' : ''}{opd.namaOpd}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="total-tagihan">Total Tagihan (Rp)</Label>
                            <Input
                                id="total-tagihan"
                                type="number"
                                value={formData.totalTagihan}
                                onChange={e => setFormData({ ...formData, totalTagihan: Number(e.target.value) })}
                                min="0"
                            />
                        </div>
                        <div>
                            <Label htmlFor="periode">Periode (Bulan)</Label>
                            <Input
                                id="periode"
                                type="number"
                                value={formData.periodeBulan}
                                onChange={e => setFormData({ ...formData, periodeBulan: Number(e.target.value) })}
                                min="1"
                            />
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="catatan-tagihan">Catatan (Opsional)</Label>
                        <Input
                            id="catatan-tagihan"
                            type="text"
                            value={formData.catatan}
                            onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                            placeholder="Contoh: Pembayaran 6 bulan di muka"
                        />
                    </div>
                </div>
                <DialogFooter className="mt-6 p-4 border-t border-gray-200 dark:border-dark-border -mx-6 -mb-6">
                    <Button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving || !formData.opdId || formData.totalTagihan <= 0 || formData.periodeBulan <= 0}
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Buat Tagihan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
// --- [AKHIR MODAL TAGIHAN MANUAL] ---

// --- [REFACTOR] Komponen Modal Pembayaran (Menggunakan Shadcn) ---
const PaymentModal = ({ isOpen, onClose, tagihan, formData, setFormData, onSave, isSaving }: {
    isOpen: boolean,
    onClose: () => void,
    tagihan: Tagihan | null,
    formData: { jumlah: number, periodeBulan: number, catatan: string },
    setFormData: (data: { jumlah: number, periodeBulan: number, catatan: string }) => void,
    onSave: () => void,
    isSaving: boolean
}) => {
    if (!isOpen || !tagihan) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border">
                <DialogHeader>
                    <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
                </DialogHeader>
                <div className="p-0 pt-2 space-y-4">
                    <p>Anda akan mengonfirmasi pembayaran untuk:</p>
                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-dark-border">
                        <p className="font-bold text-lg">{tagihan.namaOpd}</p>
                        <p className="text-sm">Periode: {tagihan.bulanTagihan}/{tagihan.tahunTagihan}</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">Rp {tagihan.totalTagihan.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                        <Label htmlFor="jml-diterima">Jumlah Diterima</Label>
                        <Input 
                            id="jml-diterima"
                            type="number" 
                            value={formData.jumlah} 
                            onChange={e => setFormData({...formData, jumlah: Number(e.target.value)})} 
                        />
                    </div>
                    <div>
                        <Label htmlFor="periode-perpanjang">Perpanjang Langganan Selama</Label>
                        <Select value={String(formData.periodeBulan)} onValueChange={v => setFormData({...formData, periodeBulan: Number(v)})}>
                            <SelectTrigger id="periode-perpanjang"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Bulan (Sesuai tagihan)</SelectItem>
                                <SelectItem value="3">3 Bulan</SelectItem>
                                <SelectItem value="6">6 Bulan</SelectItem>
                                <SelectItem value="12">12 Bulan (1 Tahun)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="catatan-bayar">Catatan</Label>
                        <Input 
                            id="catatan-bayar"
                            type="text" 
                            value={formData.catatan} 
                            onChange={e => setFormData({...formData, catatan: e.target.value})} 
                        />
                    </div>
                </div>
                <DialogFooter className="mt-6 p-4 border-t border-gray-200 dark:border-dark-border -mx-6 -mb-6">
                    <Button onClick={onSave} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Konfirmasi & Perpanjang Langganan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
// --- [AKHIR MODAL PEMBAYARAN] ---

// --- [REFACTOR] Komponen Modal Proyeksi (Menggunakan Shadcn) ---
const ProyeksiModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: any }) => {
    if (!isOpen || !data) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border">
                <DialogHeader>
                    <DialogTitle>Proyeksi Tagihan</DialogTitle>
                </DialogHeader>
                <div className="p-0 pt-2 space-y-3">
                    <h3 className="font-semibold text-lg">{data.namaOpd}</h3>
                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-dark-border space-y-2">
                        <div className="flex justify-between text-sm"><span>Paket Aktif:</span><span className="font-semibold">{data.packageName}</span></div>
                        <div className="flex justify-between text-sm"><span>Harga/Pengguna/Bulan:</span><span className="font-semibold">Rp {data.hargaPerPengguna.toLocaleString('id-ID')}</span></div>
                        <div className="flex justify-between text-sm"><span>Pengguna Aktif Saat Ini:</span><span className="font-semibold">{data.penggunaAktif.toLocaleString('id-ID')}</span></div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Proyeksi Tagihan Bulanan</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-200">Rp {data.totalBulanan.toLocaleString('id-ID')}</p>
                    </div>
                     <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg border dark:border-dark-border">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-300">Proyeksi Tagihan Tahunan</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">Rp {data.totalTahunan.toLocaleString('id-ID')}</p>
                    </div>
                    <p className="text-xs text-gray-500 text-center italic">*Proyeksi berdasarkan jumlah pengguna aktif saat ini. Tagihan final akan dihitung pada akhir periode.</p>
                </div>
                <DialogFooter className="mt-6 p-4 border-t border-gray-200 dark:border-dark-border -mx-6 -mb-6">
                    <Button variant="outline" onClick={onClose}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
// --- [AKHIR MODAL PROYEKSI] ---

// --- [REFACTOR] Modal Pengaturan Paket (Menggunakan Shadcn) ---
const PaketModal = ({ isOpen, onClose, onSave, onDelete, packageData, setPackageData, isSaving, isEditing, defaultFeatures }: {
    isOpen: boolean,
    onClose: () => void,
    onSave: (e: React.FormEvent<HTMLFormElement>) => void,
    onDelete: (id: string) => void,
    packageData: Partial<PricingPackage> | null,
    setPackageData: (data: Partial<PricingPackage> | null) => void,
    isSaving: boolean,
    isEditing: boolean,
    defaultFeatures: OpdConfig['features']
}) => {
    if (!isOpen || !packageData) return null;

    const handleFeatureToggle = (feature: keyof OpdConfig['features']) => {
        setPackageData({
            ...packageData,
            features: {
                ...(packageData.features || defaultFeatures),
                [feature]: !(packageData.features || defaultFeatures)[feature]
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border p-0 gap-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{isEditing ? 'Edit Paket' : 'Tambah Paket Baru'}: {packageData.id}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSave}>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="px-6 space-y-4">
                            <div>
                                <Label htmlFor="pkg-id">Nama Paket (ID)</Label>
                                <Input 
                                    id="pkg-id"
                                    type="text" 
                                    value={packageData.id || ''} 
                                    onChange={e => setPackageData({ ...packageData, id: e.target.value })} 
                                    disabled={isEditing} 
                                    placeholder="Contoh: Profesional" 
                                />
                            </div>
                            <div>
                                <Label htmlFor="pkg-harga">Harga per Pengguna per Bulan (Rp)</Label>
                                <Input 
                                    id="pkg-harga"
                                    type="number" 
                                    value={packageData.hargaPerPenggunaPerBulan || 0} 
                                    onChange={e => setPackageData({ ...packageData, hargaPerPenggunaPerBulan: Number(e.target.value) })} 
                                />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold">Fitur yang Termasuk</h4>
                                {Object.keys(packageData.features || defaultFeatures).map(key => (
                                    <div key={key} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-700 rounded-md">
                                        <Checkbox 
                                            id={`pkg-feat-${key}`}
                                            checked={packageData.features?.[key as keyof typeof defaultFeatures] || false} 
                                            onCheckedChange={() => handleFeatureToggle(key as any)}
                                        /> 
                                        <Label htmlFor={`pkg-feat-${key}`} className="cursor-pointer">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="mt-6 p-4 flex justify-between bg-gray-50 dark:bg-slate-800/50 border-t">
                        {isEditing && (
                            <Button type="button" variant="destructive" onClick={() => onDelete(packageData.id!)} disabled={isSaving}>
                                <Trash2 size={16} className="mr-2"/> Hapus Paket
                            </Button>
                        )}
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Simpan Paket
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
// --- [AKHIR MODAL PAKET] ---


// --- Komponen Utama Halaman ---
const LaporanLanggananPage = () => {
    const { userProfile } = useUserAuth();
    const [opdConfigs, setOpdConfigs] = useState<Map<string, OpdConfig>>(new Map());
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [pricingPackages, setPricingPackages] = useState<PricingPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'proyeksi' | 'tagihan' | 'paket'>('proyeksi');
    const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
    const [opdList, setOpdList] = useState<OPD[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOpd, setFilteredOpd] = useState<(OPD & { indent?: boolean })[]>([]);
    const [isProyeksiModalOpen, setIsProyeksiModalOpen] = useState(false);
    const [selectedOpdForProyeksi, setSelectedOpdForProyeksi] = useState<OPD | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null);
    const [paymentForm, setPaymentForm] = useState({ jumlah: 0, periodeBulan: 1, catatan: '' });
    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
    const [packageFormState, setPackageFormState] = useState<Partial<PricingPackage> | null>(null);
    const [isEditingPackage, setIsEditingPackage] = useState(false); 
    const [isSaving, setIsSaving] = useState(false);
    const [isKonfigModalOpen, setIsKonfigModalOpen] = useState(false);
    const [selectedOpdForKonfig, setSelectedOpdForKonfig] = useState<OPD | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isProcessing: false
    });
    const [tagihanFilter, setTagihanFilter] = useState<Tagihan['status'] | 'Semua'>('Belum Dibayar');
    const [isTagihanManualModalOpen, setIsTagihanManualModalOpen] = useState(false);
    const [manualTagihanData, setManualTagihanData] = useState({ opdId: '', totalTagihan: 0, catatan: '', periodeBulan: 1 });

    const defaultFeatures: OpdConfig['features'] = {
        aiSuratReader: false,
        aiNotulensi: false,
        analitika: false,
        manajemenAset: false,
        persetujuanDraf: false,
        formBuilder: false
    };

    useEffect(() => {
        const unsubOpd = onSnapshot(collection(db, 'opd'), snap => {
            setOpdList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD)));
        });
        const unsubConfigs = onSnapshot(collection(db, 'opdConfigs'), snap => {
            const configs = new Map<string, OpdConfig>();
            snap.forEach(doc => {
                const data = doc.data() as OpdConfig;
                configs.set(doc.id, { ...doc.data(), id: doc.id, features: { ...defaultFeatures, ...data.features } } as OpdConfig);
            });
            setOpdConfigs(configs);
        });
        const unsubHistory = onSnapshot(collection(db, 'paymentHistory'), snap => setPaymentHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentHistory))));
        const unsubPricing = onSnapshot(query(collection(db, 'pricingPackages'), orderBy('hargaPerPenggunaPerBulan', 'asc')), snap => {
             const packages = snap.docs.map(doc => {
                 const data = doc.data() as PricingPackage;
                 return { id: doc.id, ...data, features: { ...defaultFeatures, ...data.features } } as PricingPackage;
            });
            setPricingPackages(packages);
            setLoading(false);
        });
        
        const qTagihan = tagihanFilter === 'Semua'
            ? query(collection(db, 'tagihan'), orderBy('tanggalDibuat', 'desc'))
            : query(collection(db, 'tagihan'), where('status', '==', tagihanFilter), orderBy('tanggalDibuat', 'desc'));
        
        const unsubTagihan = onSnapshot(qTagihan, snap => {
            setTagihanList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tagihan)));
        });

        return () => { unsubOpd(); unsubConfigs(); unsubHistory(); unsubPricing(); unsubTagihan(); };
    }, [tagihanFilter]);
    
    const sortedOpdList = useMemo(() => {
        const indukOpds = opdList.filter(opd => opd.tipe === 'Induk' || !opd.idOpdInduk).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
        const sortedList: (OPD & { indent?: boolean })[] = [];
        indukOpds.forEach(induk => {
            sortedList.push(induk);
            const subOpds = opdList.filter(opd => opd.idOpdInduk === induk.id).sort((a, b) => a.namaOpd.localeCompare(b.namaOpd));
            subOpds.forEach(sub => sortedList.push({ ...sub, indent: true }));
        });
        return sortedList;
    }, [opdList]);
    
    useEffect(() => {
        if (searchTerm.length > 0) {
            const lowerSearch = searchTerm.toLowerCase();
            setFilteredOpd(sortedOpdList.filter(opd => opd.namaOpd.toLowerCase().includes(lowerSearch)));
        } else {
            setFilteredOpd(sortedOpdList);
        }
    }, [searchTerm, sortedOpdList]);
    
    const summaryStats = useMemo(() => {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        let totalPendapatan = paymentHistory.reduce((sum, p) => sum + p.jumlah, 0);
        let langgananAktif = 0;
        let segeraKedaluwarsa = 0;
        let sudahKedaluwarsa = 0;
        opdList.forEach(opd => {
            const config = opdConfigs.get(opd.id!);
            if (config) {
                const expiryDate = config.langgananAktifHingga.toDate();
                if (expiryDate >= now) {
                    langgananAktif++;
                    if (expiryDate < thirtyDaysFromNow) {
                        segeraKedaluwarsa++;
                    }
                } else {
                    sudahKedaluwarsa++;
                }
            } else {
                sudahKedaluwarsa++;
            }
        });
        return { totalPendapatan, langgananAktif, segeraKedaluwarsa, sudahKedaluwarsa };
    }, [paymentHistory, opdConfigs, opdList]);

    const openProyeksiModal = (opd: OPD) => {
        setSelectedOpdForProyeksi(opd);
        setIsProyeksiModalOpen(true);
    };
    
    const openKonfigModal = (opd: OPD) => {
        setSelectedOpdForKonfig(opd);
        setIsKonfigModalOpen(true);
    };

    const handleSaveConfig = async (opdId: string, newConfig: OpdConfig, buatTagihanLunas: boolean) => {
        if (!userProfile) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const configRef = doc(db, 'opdConfigs', opdId);
            const newExpiryTimestamp = newConfig.langgananAktifHingga;
            const now = Timestamp.now();
            let finalConfig = { ...newConfig }; 
            if (buatTagihanLunas && newExpiryTimestamp.toMillis() > now.toMillis()) {
                finalConfig.paymentStatus = 'Lunas'; 
                const opd = opdList.find(o => o.id === opdId);
                const pkg = pricingPackages.find(p => p.id === newConfig.packageName);
                const hargaPerPengguna = pkg?.hargaPerPenggunaPerBulan || 0;
                const penggunaAktif = newConfig.penggunaAktifSaatIni || 0; 
                const totalTagihan = hargaPerPengguna * penggunaAktif;
                const paymentRef = doc(collection(db, 'paymentHistory'));
                batch.set(paymentRef, {
                    opdId: opdId, jumlah: totalTagihan > 0 ? totalTagihan : 0, 
                    periodeBulan: 1, paket: newConfig.packageName, tanggalBayar: now,
                    dicatatOleh: userProfile.uid, catatan: "Aktivasi/perpanjangan manual oleh Super Admin"
                });
                const tagihanRef = doc(collection(db, 'tagihan'));
                batch.set(tagihanRef, {
                    opdId: opdId, namaOpd: opd?.namaOpd || opdId,
                    bulanTagihan: new Date().getMonth() + 1, tahunTagihan: new Date().getFullYear(),
                    packageName: newConfig.packageName, jumlahPenggunaAktif: penggunaAktif,
                    hargaPerPengguna: hargaPerPengguna, totalTagihan: totalTagihan > 0 ? totalTagihan : 0,
                    status: "Lunas", tanggalDibuat: now, tanggalDibayar: now,
                    catatan: "Tagihan otomatis dari aktivasi Super Admin"
                });
            } else if (newExpiryTimestamp.toMillis() > now.toMillis() && (finalConfig.paymentStatus === 'Kedaluwarsa' || finalConfig.paymentStatus === 'Menunggu Pembayaran')) {
                finalConfig.paymentStatus = 'Menunggu Pembayaran';
            } else if (newExpiryTimestamp.toMillis() <= now.toMillis()) {
                finalConfig.paymentStatus = 'Kedaluwarsa';
                finalConfig.kuotaPengguna = 0; 
            }
            batch.set(configRef, finalConfig, { merge: true });
            await batch.commit();
            setIsKonfigModalOpen(false);
            setSelectedOpdForKonfig(null);
        } catch (error) { console.error("Gagal menyimpan konfigurasi:", error); alert("Gagal menyimpan konfigurasi."); } 
        finally { setIsSaving(false); }
    };
    
    const handleCancelSubscription = (opd: OPD) => {
        setConfirmModal({
            isOpen: true, title: 'Konfirmasi Pembatalan Langganan',
            message: `Anda yakin ingin membatalkan langganan untuk "${opd.namaOpd}"? Ini akan mengatur ulang kuota pengguna menjadi 0 dan mengubah status menjadi 'Kedaluwarsa'.`,
            isProcessing: isSaving,
            onConfirm: async () => {
                setIsSaving(true);
                const cancelledConfig: OpdConfig = {
                    packageName: 'Dasar', langgananAktifHingga: Timestamp.now(), 
                    paymentStatus: 'Kedaluwarsa', kuotaPengguna: 0, 
                    penggunaAktifSaatIni: opdConfigs.get(opd.id!)?.penggunaAktifSaatIni || 0,
                    features: defaultFeatures
                };
                await handleSaveConfig(opd.id!, cancelledConfig, false); 
                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, isProcessing: false });
                setIsKonfigModalOpen(false); 
                setIsSaving(false);
            }
        });
    };

    const openPaymentModal = (tagihan: Tagihan) => {
        setSelectedTagihan(tagihan);
        setPaymentForm({ jumlah: tagihan.totalTagihan, periodeBulan: 1, catatan: `Pembayaran tagihan ${tagihan.bulanTagihan}/${tagihan.tahunTagihan}` });
        setIsPaymentModalOpen(true);
    };

    const handleSavePayment = async () => {
        if (!selectedTagihan || !userProfile) return;
        setIsSaving(true);
        try {
            const opdId = selectedTagihan.opdId;
            const configRef = doc(db, 'opdConfigs', opdId);
            const tagihanRef = doc(db, 'tagihan', selectedTagihan.id!);
            const paymentRef = doc(collection(db, 'paymentHistory'));
            const configSnap = await getDoc(configRef);
            let currentConfig: OpdConfig;
            if (configSnap.exists()) { currentConfig = configSnap.data() as OpdConfig; } 
            else {
                 currentConfig = {
                    packageName: selectedTagihan.packageName as OpdConfig['packageName'], langgananAktifHingga: Timestamp.now(),
                    paymentStatus: 'Menunggu Pembayaran', kuotaPengguna: 5, penggunaAktifSaatIni: 0, features: defaultFeatures
                };
            }
            const currentExpiry = currentConfig.langgananAktifHingga.toDate();
            const startDate = currentExpiry < new Date() ? new Date() : currentExpiry;
            const newExpiryDate = new Date(startDate);
            newExpiryDate.setMonth(newExpiryDate.getMonth() + Number(paymentForm.periodeBulan)); 
            const batch = writeBatch(db);
            batch.set(paymentRef, {
                opdId: opdId, jumlah: Number(paymentForm.jumlah), periodeBulan: Number(paymentForm.periodeBulan), 
                paket: selectedTagihan.packageName, tanggalBayar: Timestamp.now(),
                dicatatOleh: userProfile.uid, catatan: paymentForm.catatan,
            });
            batch.update(tagihanRef, { status: 'Lunas', tanggalDibayar: Timestamp.now() });
            batch.set(configRef, { langgananAktifHingga: Timestamp.fromDate(newExpiryDate), paymentStatus: 'Lunas', }, { merge: true });
            await batch.commit();
            setIsPaymentModalOpen(false);
            setSelectedTagihan(null);
        } catch (error) { console.error(error); alert("Gagal mencatat pembayaran."); } 
        finally { setIsSaving(false); }
    };

    const handleBuatTagihanManual = async () => {
        if (!manualTagihanData.opdId || manualTagihanData.totalTagihan <= 0 || manualTagihanData.periodeBulan <= 0) {
            alert("Harap pilih OPD, isi total tagihan (> 0), dan periode bulan (min 1).");
            return;
        }
        setIsSaving(true);
        try {
            const opd = opdList.find(o => o.id === manualTagihanData.opdId);
            const config = opdConfigs.get(manualTagihanData.opdId);
            const pkg = pricingPackages.find(p => p.id === config?.packageName);
            if (!opd) throw new Error("Data OPD tidak ditemukan.");
            const now = new Date();
            const billingMonth = now.getMonth() + 1;
            const billingYear = now.getFullYear();
            const newTagihan: Omit<Tagihan, 'id'> = {
                opdId: manualTagihanData.opdId, namaOpd: opd.namaOpd,
                bulanTagihan: billingMonth, tahunTagihan: billingYear,
                packageName: config?.packageName || 'Custom',
                jumlahPenggunaAktif: config?.penggunaAktifSaatIni || 0,
                hargaPerPengguna: pkg?.hargaPerPenggunaPerBulan || 0,
                totalTagihan: Number(manualTagihanData.totalTagihan),
                status: "Belum Dibayar", tanggalDibuat: Timestamp.now(), tanggalDibayar: null,
                catatan: `Tagihan manual: ${manualTagihanData.catatan || `Tagihan untuk ${manualTagihanData.periodeBulan} bulan`}`
            };
            await addDoc(collection(db, 'tagihan'), newTagihan as any);
            setIsTagihanManualModalOpen(false);
            setManualTagihanData({ opdId: '', totalTagihan: 0, catatan: '', periodeBulan: 1 });
            setTagihanFilter('Belum Dibayar'); 
        } catch (error: any) { console.error("Gagal membuat tagihan manual:", error); alert("Gagal membuat tagihan manual: " + error.message); } 
        finally { setIsSaving(false); }
    };
    
    const openPackageModal = (pkg: PricingPackage | null) => {
        if (pkg) {
            setPackageFormState({ ...pkg, features: { ...defaultFeatures, ...pkg.features } });
            setIsEditingPackage(true);
        } else {
            setPackageFormState({ id: '', hargaPerPenggunaPerBulan: 0, features: defaultFeatures });
            setIsEditingPackage(false);
        }
        setIsPackageModalOpen(true);
    };

    const handleSavePackage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!packageFormState || !packageFormState.id) {
            alert("Nama paket (ID) tidak boleh kosong.");
            return;
        }
        setIsSaving(true);
        try {
            const packageRef = doc(db, 'pricingPackages', packageFormState.id);
            await setDoc(packageRef, { 
                hargaPerPenggunaPerBulan: packageFormState.hargaPerPenggunaPerBulan || 0, 
                features: packageFormState.features 
            });
            setIsPackageModalOpen(false);
            setIsEditingPackage(false);
        } catch (error) { console.error(error); alert("Gagal menyimpan paket."); }
        finally { setIsSaving(false); }
    };
    
    const handleDeletePackage = async (packageId: string) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus paket "${packageId}"?`)) {
            try {
                await deleteDoc(doc(db, 'pricingPackages', packageId));
            } catch (error) { console.error(error); alert("Gagal menghapus paket."); }
        }
    };
    
    if (userProfile?.role !== 'super_admin') return <div className="p-6 text-center text-red-700 bg-red-100 rounded-lg">Akses ditolak.</div>;

    const proyeksiData = useMemo(() => {
        if (!selectedOpdForProyeksi || pricingPackages.length === 0) { return null; }
        const config = opdConfigs.get(selectedOpdForProyeksi.id!) || { packageName: 'Dasar', penggunaAktifSaatIni: 0 };
        const pkg = pricingPackages.find(p => p.id === config.packageName);
        const hargaPerPengguna = pkg?.hargaPerPenggunaPerBulan || 0;
        const penggunaAktif = config.penggunaAktifSaatIni || 0;
        const totalBulanan = hargaPerPengguna * penggunaAktif;
        return {
            namaOpd: selectedOpdForProyeksi.namaOpd, packageName: config.packageName,
            penggunaAktif: penggunaAktif, hargaPerPengguna: hargaPerPengguna,
            totalBulanan: totalBulanan, totalTahunan: totalBulanan * 12,
        };
    }, [selectedOpdForProyeksi, opdConfigs, pricingPackages]);


    return (
        <div className="animate-fadeInUp">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                <FileText size={28} className="mr-3 text-green-600" />
                Laporan & Pengaturan Langganan
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                 <StatCard title="Total Pendapatan" value={`Rp ${summaryStats.totalPendapatan.toLocaleString('id-ID')}`} icon={<DollarSign/>} colorClass="text-green-600" />
                <StatCard title="Langganan Aktif" value={summaryStats.langgananAktif} icon={<CheckCircle/>} colorClass="text-blue-600" />
                <StatCard title="Segera Kedaluwarsa" value={summaryStats.segeraKedaluwarsa} icon={<Clock/>} colorClass="text-yellow-600" />
                <StatCard title="Sudah Kedaluwarsa" value={summaryStats.sudahKedaluwarsa} icon={<FileWarning/>} colorClass="text-red-600" />
            </div>

            {/* [REFACTOR] Ganti <button> tab dengan <Tabs> */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-8">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="proyeksi"><BarChart size={16} /> Proyeksi & Status OPD</TabsTrigger>
                    <TabsTrigger value="tagihan"><Receipt size={16} /> Tagihan ({tagihanFilter === 'Belum Dibayar' ? tagihanList.length : '...'})</TabsTrigger>
                    <TabsTrigger value="paket"><Edit size={16} /> Pengaturan Paket Harga</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: PROYEKSI & STATUS OPD --- */}
                <TabsContent value="proyeksi" className="mt-6">
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                        <div className="p-4 border-b dark:border-dark-border"><h2 className="text-xl font-semibold">Proyeksi & Status Langganan OPD</h2></div>
                        <div className="p-4">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <Input type="text" placeholder="Ketik nama OPD untuk mencari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                            </div>
                        </div>
                        {filteredOpd.length === 0 && <p className="p-4 text-center text-gray-500">Tidak ada OPD yang cocok dengan "{searchTerm}".</p>}
                        {filteredOpd.length > 0 && (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Nama OPD</TableHead><TableHead>Paket</TableHead><TableHead>Aktif Hingga</TableHead><TableHead>Jml Pengguna</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredOpd.map(opd => {
                                            const config = opdConfigs.get(opd.id!);
                                            const isExpired = !config || config.langgananAktifHingga.toDate() < new Date();
                                            const status = config?.paymentStatus || (isExpired ? 'Kedaluwarsa' : 'N/A');
                                            return (
                                                <TableRow key={opd.id}>
                                                    <TableCell className={`font-semibold ${(opd as any).indent ? 'pl-6' : ''}`}>
                                                        {(opd as any).indent ? '↳ ' : ''}{opd.namaOpd}
                                                    </TableCell>
                                                    <TableCell>{config?.packageName || 'N/A'}</TableCell>
                                                    <TableCell className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>{config ? config.langgananAktifHingga.toDate().toLocaleDateString('id-ID') : '-'}</TableCell>
                                                    <TableCell className="font-medium text-center">{config?.penggunaAktifSaatIni || 0}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                            status === 'Lunas' ? 'bg-green-100 text-green-800' : 
                                                            status === 'Menunggu Pembayaran' ? 'bg-yellow-100 text-yellow-800' :
                                                            status === 'Kedaluwarsa' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                            }`}>{status}</span>
                                                    </TableCell>
                                                    <TableCell className="flex gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => openProyeksiModal(opd)} title="Lihat Proyeksi"><Eye size={16} /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => openKonfigModal(opd)} title="Kelola Paket OPD"><Settings size={16} /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* --- TAB 2: TAGIHAN --- */}
                <TabsContent value="tagihan" className="mt-6">
                     <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                        <div className="p-4 border-b dark:border-dark-border flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <h2 className="text-xl font-semibold">Daftar Tagihan</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button variant={tagihanFilter === 'Belum Dibayar' ? 'default' : 'outline'} size="sm" onClick={() => setTagihanFilter('Belum Dibayar')}>Belum Dibayar</Button>
                                <Button variant={tagihanFilter === 'Lunas' ? 'default' : 'outline'} size="sm" onClick={() => setTagihanFilter('Lunas')}>Lunas</Button>
                                <Button variant={tagihanFilter === 'Kedaluwarsa' ? 'default' : 'outline'} size="sm" onClick={() => setTagihanFilter('Kedaluwarsa')}>Kedaluwarsa</Button>
                                <Button variant={tagihanFilter === 'Semua' ? 'default' : 'outline'} size="sm" onClick={() => setTagihanFilter('Semua')}>Semua</Button>
                                <Button size="sm" onClick={() => setIsTagihanManualModalOpen(true)}><Plus size={14} className="mr-1"/> Buat Manual</Button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>OPD</TableHead><TableHead>Periode</TableHead><TableHead>Paket</TableHead><TableHead>Jml Pengguna</TableHead><TableHead>Total Tagihan</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={7} className="p-4 text-center">Memuat tagihan...</TableCell></TableRow> : 
                                    tagihanList.length === 0 ? <TableRow><TableCell colSpan={7} className="p-4 text-center text-gray-500">Tidak ada tagihan untuk filter "{tagihanFilter}".</TableCell></TableRow> : 
                                    tagihanList.map(tagihan => (
                                        <TableRow key={tagihan.id}>
                                            <TableCell className="font-semibold">{tagihan.namaOpd}</TableCell>
                                            <TableCell>{tagihan.bulanTagihan}/{tagihan.tahunTagihan}</TableCell>
                                            <TableCell>{tagihan.packageName}</TableCell>
                                            <TableCell className="text-center">{tagihan.jumlahPenggunaAktif}</TableCell>
                                            <TableCell className="font-bold">Rp {tagihan.totalTagihan.toLocaleString('id-ID')}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    tagihan.status === 'Lunas' ? 'bg-green-100 text-green-800' : 
                                                    tagihan.status === 'Belum Dibayar' ? 'bg-yellow-100 text-yellow-800' :
                                                    tagihan.status === 'Kedaluwarsa' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>{tagihan.status}</span>
                                            </TableCell>
                                            <TableCell>
                                                {tagihan.status === 'Belum Dibayar' && (
                                                    <Button onClick={() => openPaymentModal(tagihan)} size="sm" className="bg-green-600 hover:bg-green-700">
                                                        Konfirmasi Bayar
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                {/* --- TAB 3: PENGATURAN PAKET HARGA --- */}
                <TabsContent value="paket" className="mt-6">
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                        <div className="p-4 border-b dark:border-dark-border flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Pengaturan Paket Harga</h2>
                            <Button onClick={() => openPackageModal(null)} size="sm" className="bg-green-600 hover:bg-green-700">
                                <Plus size={16} className="mr-1.5"/> Tambah Paket Baru
                            </Button>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Paket</TableHead><TableHead>Harga/Pengguna/Bulan</TableHead><TableHead>Fitur</TableHead><TableHead>Aksi</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={4} className="p-4 text-center">Memuat...</TableCell></TableRow> : pricingPackages.map(pkg => (
                                        <TableRow key={pkg.id}>
                                            <TableCell className="font-bold">{pkg.id}</TableCell>
                                            <TableCell>Rp {pkg.hargaPerPenggunaPerBulan.toLocaleString('id-ID')}</TableCell>
                                            <TableCell className="text-xs space-x-2">
                                                {Object.entries(pkg.features).map(([key, value]) => value && (
                                                    <span key={key} className="bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                    </span>
                                                ))}
                                            </TableCell>
                                            <TableCell className="space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => openPackageModal(pkg)} title={`Edit Paket ${pkg.id}`}><Edit size={16}/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeletePackage(pkg.id!)} title={`Hapus Paket ${pkg.id}`} className="text-red-500 hover:text-red-500"><Trash2 size={16}/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

            </Tabs>
            
            {/* --- MODALS --- */}

            <PaketModal
                isOpen={isPackageModalOpen}
                onClose={() => setIsPackageModalOpen(false)}
                onSave={handleSavePackage}
                onDelete={handleDeletePackage}
                packageData={packageFormState}
                setPackageData={setPackageFormState}
                isSaving={isSaving}
                isEditing={isEditingPackage}
                defaultFeatures={defaultFeatures}
            />
            
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                tagihan={selectedTagihan}
                formData={paymentForm}
                setFormData={setPaymentForm}
                onSave={handleSavePayment}
                isSaving={isSaving}
            />

            <ProyeksiModal
                isOpen={isProyeksiModalOpen}
                onClose={() => setIsProyeksiModalOpen(false)}
                data={proyeksiData}
            />

            {selectedOpdForKonfig && (
                <KonfigurasiOpdModal
                    isOpen={isKonfigModalOpen}
                    onClose={() => setIsKonfigModalOpen(false)}
                    opd={selectedOpdForKonfig}
                    currentConfig={opdConfigs.get(selectedOpdForKonfig.id!) || null}
                    pricingPackages={pricingPackages}
                    onSave={handleSaveConfig}
                    onCancelSubscription={handleCancelSubscription}
                    isSaving={isSaving}
                    defaultFeatures={defaultFeatures}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, isProcessing: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isProcessing={confirmModal.isProcessing}
                confirmText="Ya, Batalkan"
            />
            
            <TagihanManualModal
                isOpen={isTagihanManualModalOpen}
                onClose={() => setIsTagihanManualModalOpen(false)}
                opdList={sortedOpdList}
                formData={manualTagihanData}
                setFormData={setManualTagihanData}
                onSave={handleBuatTagihanManual}
                isSaving={isSaving}
            />

        </div>
    );
};

export default LaporanLanggananPage;