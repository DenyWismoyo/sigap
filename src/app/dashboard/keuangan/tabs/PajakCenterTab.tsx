// Directory: src/app/dashboard/keuangan/tabs/PajakCenterTab.tsx
// [VISIONER] Tax Control Center.
// - Memantau PPN/PPh yang belum disetor.
// - Input NTPN untuk validasi setor.

"use client";

import React, { useState, useMemo } from 'react';
import { useKeuanganData } from '@/app/dashboard/hooks/useKeuanganData';
import { UserProfile, KeuanganTransaksi } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Landmark, CheckCircle, Clock, Save, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/context/ToastContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PajakCenterTab({ userProfile }: { userProfile: UserProfile }) {
    const { transaksiList, isLoading } = useKeuanganData(userProfile);
    const { addToast } = useToast();

    const [selectedTx, setSelectedTx] = useState<KeuanganTransaksi | null>(null);
    const [ntpnInput, setNtpnInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filter transaksi yang memiliki pajak > 0
    const taxableTransactions = useMemo(() => {
        return transaksiList.filter(t => {
            const p = (t as any).pajak;
            return p && (p.ppn > 0 || p.pph > 0);
        }).sort((a, b) => b.tanggal.toMillis() - a.tanggal.toMillis());
    }, [transaksiList]);

    const belumSetor = taxableTransactions.filter(t => !t.ntpn);
    const sudahSetor = taxableTransactions.filter(t => t.ntpn);

    const totalHutangPajak = belumSetor.reduce((sum, t) => sum + ((t.pajak?.ppn || 0) + (t.pajak?.pph || 0)), 0);

    const handleSetor = async () => {
        if (!selectedTx || !ntpnInput) return;
        setIsSaving(true);
        try {
            const txRef = doc(db, 'keuangan_transaksi', selectedTx.id!);
            await updateDoc(txRef, {
                ntpn: ntpnInput,
                tanggalSetorPajak: Timestamp.now()
            });
            addToast("Pajak berhasil ditandai setor!", "success");
            setSelectedTx(null);
            setNtpnInput('');
        } catch (error) {
            addToast("Gagal menyimpan data.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const PajakTable = ({ data, isHistory = false }: { data: KeuanganTransaksi[], isHistory?: boolean }) => (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Uraian Belanja</TableHead>
                        <TableHead className="text-right">PPN</TableHead>
                        <TableHead className="text-right">PPh</TableHead>
                        <TableHead className="text-right">Total Pajak</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                    ) : (
                        data.map(t => {
                            const ppn = t.pajak?.ppn || 0;
                            const pph = t.pajak?.pph || 0;
                            return (
                                <TableRow key={t.id}>
                                    <TableCell className="whitespace-nowrap text-xs">{t.tanggal.toDate().toLocaleDateString('id-ID')}</TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate" title={t.uraian}>{t.uraian}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{ppn.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{pph.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right font-bold font-mono text-xs">{(ppn + pph).toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-center">
                                        {isHistory ? (
                                            <div className="flex flex-col items-center">
                                                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800">LUNAS</Badge>
                                                <span className="text-[10px] text-muted-foreground mt-1 font-mono">{t.ntpn}</span>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => setSelectedTx(t)} className="h-7 text-xs">
                                                Setor
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );

    if (isLoading) return <div className="p-8 text-center">Memuat data pajak...</div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-full text-orange-600 dark:text-orange-200">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-semibold">Pajak Belum Disetor</p>
                            <h3 className="text-2xl font-bold text-orange-700 dark:text-orange-400">Rp {totalHutangPajak.toLocaleString('id-ID')}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-200">
                            <Landmark size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-semibold">Sudah Disetor (Tahun Ini)</p>
                            <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">{sudahSetor.length} Transaksi</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle>Daftar Pungutan Pajak</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="belum">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="belum">Belum Disetor ({belumSetor.length})</TabsTrigger>
                            <TabsTrigger value="sudah">Riwayat Setor ({sudahSetor.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="belum">
                            <PajakTable data={belumSetor} />
                        </TabsContent>
                        <TabsContent value="sudah">
                            <PajakTable data={sudahSetor} isHistory />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Input Bukti Setor Pajak</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                            <p><strong>Uraian:</strong> {selectedTx?.uraian}</p>
                            <p><strong>Total Pajak:</strong> Rp {((selectedTx?.pajak?.ppn||0) + (selectedTx?.pajak?.pph||0)).toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                            <Label>NTPN (Nomor Transaksi Penerimaan Negara)</Label>
                            <Input 
                                value={ntpnInput} 
                                onChange={e => setNtpnInput(e.target.value)} 
                                placeholder="Masukkan kode NTPN..."
                                className="font-mono uppercase mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedTx(null)}>Batal</Button>
                        <Button onClick={handleSetor} disabled={isSaving || !ntpnInput} className="bg-green-600 hover:bg-green-700">
                            {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}