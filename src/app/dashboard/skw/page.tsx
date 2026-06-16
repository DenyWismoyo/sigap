'use client';

import React, { useState } from 'react';
import { useSkwData } from '@/app/dashboard/hooks/useSkwData';
import SkwStats from './components/SkwStats';
import SkwFormModal from './components/SkwFormModal';
import SkwDetailModal from './components/SkwDetailModal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SkwRequest } from '@/types'; // Import dari file types lokal

export default function SkwPage() {
  const { data, loading, addSkw, updateSkw, deleteSkw } = useSkwData();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<SkwRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleCreate = () => {
    setSelectedData(null);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEdit = (item: SkwRequest) => {
    setSelectedData(item);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleDetail = (item: SkwRequest) => {
    setSelectedData(item);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (formData: Partial<SkwRequest>) => {
    let success = false;
    if (isEditing && selectedData?.id) {
        success = await updateSkw(selectedData.id, formData);
    } else {
        success = await addSkw(formData);
    }
    if (success) setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
      if(confirm('Hapus data ini?')) await deleteSkw(id);
  }

  const filteredData = data.filter(item => 
    item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.namaAlmarhum && item.namaAlmarhum.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.nomorSurat?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disetujui': return <Badge className="bg-green-500 hover:bg-green-600">Disetujui</Badge>;
      case 'Ditolak': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Layanan SKW</h1>
          <p className="text-muted-foreground">Manajemen Surat Keterangan Waris & Kependudukan</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Buat Permohonan
        </Button>
      </div>

      <SkwStats data={data} />

      <div className="flex items-center gap-2 bg-card p-4 rounded-lg border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Cari pemohon, almarhum, atau no surat..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Surat</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Pemohon</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
            ) : (
                filteredData.map((item) => (
                <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs font-mono">{item.nomorSurat || "Draft"}</TableCell>
                    <TableCell>
                        <Badge variant="outline">{item.jenis}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{item.namaPemohon}</span>
                            <span className="text-xs text-muted-foreground">{item.nikPemohon}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        {['Tanah', 'Umum'].includes(item.jenis) ? (
                            <div className="text-xs text-muted-foreground">
                                Alm: {item.namaAlmarhum}<br/>
                                {item.ahliWaris?.length || 0} Ahli Waris
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">Single Actor</span>
                        )}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleDetail(item)}><Eye className="mr-2 h-4 w-4" /> Detail</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(item)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id!)}><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <SkwFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmit} initialData={selectedData} />
      <SkwDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} data={selectedData} />
    </div>
  );
}