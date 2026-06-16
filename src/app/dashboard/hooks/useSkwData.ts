import { useState, useEffect } from 'react';
import { SkwRequest } from '@/types'; 
import { useToast } from '@/components/hooks/use-toast';

const DUMMY_SKW_DATA: SkwRequest[] = [
  {
    id: 'SKW-2023-001',
    jenis: 'Tanah',
    namaPemohon: 'Budi Santoso',
    nikPemohon: '3372010101010001',
    alamatPemohon: 'Jl. Merdeka No. 10, Surakarta',
    namaAlmarhum: 'Sutrisno',
    nikAlmarhum: '3372010101010002',
    tanggalMeninggal: '2023-10-15',
    tempatMeninggal: 'RSUD Moewardi',
    alamatAlmarhum: 'Jl. Merdeka No. 10, Surakarta',
    nomorSurat: '470/001/X/2023',
    tanggalSurat: '2023-10-20',
    status: 'Disetujui',
    ahliWaris: [
      {
        id: 'aw-1',
        nama: 'Budi Santoso',
        nik: '3372010101010001',
        tempatLahir: 'Surakarta',
        tanggalLahir: '1980-01-01',
        hubungan: 'Anak Kandung',
        alamat: 'Jl. Merdeka No. 10'
      }
    ],
    saksi: [
        {
            id: 's-1',
            nama: 'Pak RT',
            nik: '3372050505050001',
            umur: '50 Tahun',
            pekerjaan: 'Wiraswasta',
            alamat: 'Jl. Merdeka No. 1'
        }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'SKW-2023-002',
    jenis: 'Perwalian',
    namaPemohon: 'Dewi Lestari',
    nikPemohon: '3372010101010004',
    alamatPemohon: 'Jl. Bhayangkara No. 5',
    // Data Almarhum Kosong untuk Perwalian
    nomorSurat: '',
    tanggalSurat: '2023-11-05',
    status: 'Diajukan',
    ahliWaris: [],
    saksi: [],
    createdAt: new Date().toISOString()
  }
];

export function useSkwData() {
  const [data, setData] = useState<SkwRequest[]>(DUMMY_SKW_DATA);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const addSkw = async (newData: Partial<SkwRequest>) => {
    try {
      const newItem: SkwRequest = {
        ...newData,
        id: `SKW-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        status: newData.status || 'Diajukan',
        ahliWaris: newData.ahliWaris || [],
        saksi: newData.saksi || [],
        jenis: newData.jenis || 'Umum',
        createdAt: new Date().toISOString()
      } as SkwRequest;

      setData(prev => [newItem, ...prev]);
      
      toast({
        title: "Berhasil",
        description: `Permohonan SKW (${newItem.jenis}) berhasil dibuat`,
      });
      return true;
    } catch (error) {
      console.error(error);
      toast({
        title: "Gagal",
        description: "Gagal membuat permohonan",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateSkw = async (id: string, updatedData: Partial<SkwRequest>) => {
    try {
      setData(prev => prev.map(item => item.id === id ? { ...item, ...updatedData } : item));
      toast({
        title: "Berhasil",
        description: "Data SKW berhasil diperbarui",
      });
      return true;
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Gagal memperbarui data",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteSkw = async (id: string) => {
    try {
      setData(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Berhasil",
        description: "Data SKW berhasil dihapus",
      });
      return true;
    } catch (error) {
       toast({
        title: "Gagal",
        description: "Gagal menghapus data",
        variant: "destructive"
      });
      return false;
    }
  };

  return { data, loading, addSkw, updateSkw, deleteSkw };
}