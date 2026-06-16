// Directory: src/app/dashboard/aset/components/RoomInventoryModal.tsx
// [UPDATE] Menambahkan fitur pemilihan Penandatangan (Kepala SKPD).

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AsetInventaris, UserProfile, Jabatan } from '@/types';
import { Printer, MapPin, Loader2, UserCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Dynamic Import untuk tombol cetak
import dynamic from 'next/dynamic';
const DownloadKirButton = dynamic(() => import('./DownloadKirButton'), { 
  ssr: false,
  loading: () => (
    <Button disabled className="w-full sm:w-auto">
        <Loader2 size={16} className="animate-spin mr-2"/> Memuat Modul Cetak...
    </Button>
  )
});

interface RoomInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    asetList: AsetInventaris[];
    userProfile: UserProfile;
    opdNama: string;
}

export default function RoomInventoryModal({ isOpen, onClose, asetList, userProfile, opdNama }: RoomInventoryModalProps) {
    const [selectedRoom, setSelectedRoom] = useState<string>('');
    const [selectedKepalaId, setSelectedKepalaId] = useState<string>(''); // ID User Kepala
    const [usersList, setUsersList] = useState<UserProfile[]>([]);
    const [jabatanMap, setJabatanMap] = useState<Map<string, string>>(new Map()); // ID -> Nama Jabatan
    const [loadingUsers, setLoadingUsers] = useState(false);

    // 1. Ambil daftar User & Jabatan di OPD ini saat modal dibuka
    useEffect(() => {
        if (isOpen && userProfile.opdId) {
            const fetchData = async () => {
                setLoadingUsers(true);
                try {
                    // Fetch Users
                    const qUsers = query(collection(db, 'users'), where('opdId', '==', userProfile.opdId), where('status', '==', 'aktif'));
                    const snapUsers = await getDocs(qUsers);
                    const users = snapUsers.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
                    
                    // Fetch Jabatan (untuk nama jabatan di TTD)
                    const qJabatan = query(collection(db, 'jabatan'), where('opdId', '==', userProfile.opdId));
                    const snapJabatan = await getDocs(qJabatan);
                    const jMap = new Map<string, string>();
                    snapJabatan.docs.forEach(d => {
                        const j = d.data() as Jabatan;
                        if(j.id) jMap.set(j.id, j.namaJabatan);
                    });

                    setUsersList(users);
                    setJabatanMap(jMap);
                } catch (e) {
                    console.error("Gagal ambil data user:", e);
                } finally {
                    setLoadingUsers(false);
                }
            };
            fetchData();
        }
    }, [isOpen, userProfile.opdId]);

    // 2. Filter Ruangan Unik
    const rooms = useMemo(() => {
        const roomSet = new Set<string>();
        asetList.forEach(a => {
            if (a.lokasi) roomSet.add(a.lokasi.trim());
        });
        return Array.from(roomSet).sort();
    }, [asetList]);

    // 3. Filter Aset per Ruangan
    const assetsInSelectedRoom = useMemo(() => {
        return asetList.filter(a => a.lokasi.trim() === selectedRoom);
    }, [asetList, selectedRoom]);

    // 4. Data Kepala yang dipilih
    const selectedKepalaData = useMemo(() => {
        const user = usersList.find(u => u.uid === selectedKepalaId);
        if (!user) return null;
        return {
            nama: user.namaLengkap,
            nip: user.nip,
            jabatan: jabatanMap.get(user.jabatanId) || 'Kepala SKPD'
        };
    }, [selectedKepalaId, usersList, jabatanMap]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Printer size={20} className="mr-2 text-blue-600"/>
                        Cetak Kartu Inventaris Ruangan (KIR)
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Pilih Ruangan</Label>
                        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                            <SelectTrigger>
                                <SelectValue placeholder="-- Pilih Lokasi --" />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map(room => (
                                    <SelectItem key={room} value={room}>{room}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Mengetahui (Pimpinan / Kepala SKPD)</Label>
                        <Select value={selectedKepalaId} onValueChange={setSelectedKepalaId} disabled={loadingUsers}>
                            <SelectTrigger>
                                <SelectValue placeholder={loadingUsers ? "Memuat..." : "-- Pilih Pejabat --"} />
                            </SelectTrigger>
                            <SelectContent>
                                {usersList.map(u => (
                                    <SelectItem key={u.uid} value={u.uid}>
                                        {u.namaLengkap}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedKepalaData && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <UserCheck size={12}/> Jabatan: {selectedKepalaData.jabatan}
                            </p>
                        )}
                    </div>

                    {selectedRoom && (
                        <div className="p-4 bg-muted rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin size={16} className="text-primary"/>
                                <span className="font-bold text-sm">{selectedRoom}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Terdapat <strong>{assetsInSelectedRoom.length}</strong> item aset di ruangan ini.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    
                    {selectedRoom && selectedKepalaData && (
                        <DownloadKirButton 
                            opdNama={opdNama}
                            ruangan={selectedRoom}
                            asetList={asetList}
                            penanggungJawab={userProfile}
                            assetsInSelectedRoom={assetsInSelectedRoom}
                            // Pass data kepala yang dipilih
                            kepalaOpd={selectedKepalaData}
                        />
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}