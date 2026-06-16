// Directory: src/app/dashboard/aset/components/BeritaAcaraPdf.tsx
// [BARU] Komponen PDF untuk mencetak Berita Acara Serah Terima (BAST) Aset.
// - Menampilkan Data Pihak Pertama/Kedua, Tabel Aset, dan Tanda Tangan.
// - [UPDATE] Header/Kop Surat dikosongkan (~5cm) untuk penggunaan kertas pre-printed.
// - Menggunakan @react-pdf/renderer untuk layout dokumen yang presisi.

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { AsetInventaris, UserProfile } from '@/types';

// Konversi cm ke points (1 cm = 28.35 pt)
// 5 cm = 141.75 pt. Kita bulatkan ke 150 pt untuk aman agar tidak menabrak kop.
const TOP_MARGIN = 150; 

const styles = StyleSheet.create({
  page: {
    paddingTop: TOP_MARGIN, 
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  // Header dihapus/dikosongkan, style ini tidak lagi digunakan untuk teks
  
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 20, // Jarak setelah judul
    textDecoration: 'underline',
  },
  section: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    width: 120,
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 20,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableColHeader: {
    width: '25%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 5,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    fontSize: 10,
  },
  tableCol: {
    width: '25%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 5,
    fontSize: 10,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '40%',
    textAlign: 'center',
  },
  signatureLine: {
    marginTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
});

interface BeritaAcaraPdfProps {
  opdName: string; // Masih diterima tapi tidak ditampilkan di header
  pihakPertama: UserProfile; // Pengurus Barang / Admin
  pihakKedua: UserProfile;   // Penerima Aset
  assets: AsetInventaris[];
  tanggal: Date;
}

export const BeritaAcaraPdf = ({ opdName, pihakPertama, pihakKedua, assets, tanggal }: BeritaAcaraPdfProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header / Kop Surat DIHAPUS (Area kosong 5cm sudah dihandle via paddingTop) */}
        
        <Text style={styles.title}>BERITA ACARA SERAH TERIMA ASET</Text>

        <Text style={{ marginBottom: 15, textAlign: 'justify' }}>
          Pada hari ini, {tanggal.toLocaleDateString('id-ID', { weekday: 'long' })}, tanggal {tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, kami yang bertanda tangan di bawah ini:
        </Text>

        {/* Pihak Pertama */}
        <View style={styles.section}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>1. PIHAK PERTAMA (Yang Menyerahkan):</Text>
            <View style={styles.row}><Text style={styles.label}>Nama</Text><Text style={styles.value}>: {pihakPertama.namaLengkap}</Text></View>
            <View style={styles.row}><Text style={styles.label}>NIP</Text><Text style={styles.value}>: {pihakPertama.nip}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Jabatan</Text><Text style={styles.value}>: Pengurus Barang / Admin</Text></View>
        </View>

        {/* Pihak Kedua */}
        <View style={styles.section}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>2. PIHAK KEDUA (Yang Menerima):</Text>
            <View style={styles.row}><Text style={styles.label}>Nama</Text><Text style={styles.value}>: {pihakKedua.namaLengkap}</Text></View>
            <View style={styles.row}><Text style={styles.label}>NIP</Text><Text style={styles.value}>: {pihakKedua.nip}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Jabatan</Text><Text style={styles.value}>: {pihakKedua.namaJabatan || 'Staf'}</Text></View>
        </View>

        <Text style={{ marginTop: 10, marginBottom: 5 }}>
            Pihak Pertama menyerahkan kepada Pihak Kedua, dan Pihak Kedua menerima barang inventaris milik daerah dengan rincian sebagai berikut:
        </Text>

        {/* Tabel Aset */}
        <View style={styles.table}>
            <View style={styles.tableRow}>
                <Text style={styles.tableColHeader}>Kode Barang</Text>
                <Text style={[styles.tableColHeader, { width: '35%' }]}>Nama Barang / Spesifikasi</Text>
                <Text style={[styles.tableColHeader, { width: '15%' }]}>Tahun</Text>
                <Text style={styles.tableColHeader}>Kondisi</Text>
            </View>
            {assets.map((aset, idx) => (
                <View style={styles.tableRow} key={idx}>
                    <Text style={styles.tableCol}>{aset.kodeAset}</Text>
                    <Text style={[styles.tableCol, { width: '35%' }]}>{aset.namaAset} {aset.spesifikasi ? `(${aset.spesifikasi})` : ''}</Text>
                    <Text style={[styles.tableCol, { width: '15%', textAlign: 'center' }]}>{aset.tahunPengadaan}</Text>
                    <Text style={styles.tableCol}>{aset.kondisi}</Text>
                </View>
            ))}
        </View>

        <Text style={{ textAlign: 'justify', fontSize: 10 }}>
            Pihak Kedua bertanggung jawab penuh atas pemeliharaan, keamanan, dan penggunaan barang tersebut untuk kepentingan dinas. Apabila terjadi kerusakan atau kehilangan akibat kelalaian, Pihak Kedua bersedia mengganti sesuai ketentuan yang berlaku.
        </Text>

        {/* Tanda Tangan */}
        <View style={styles.signatureSection}>
            <View style={styles.signatureBlock}>
                <Text>PIHAK KEDUA</Text>
                <Text>Yang Menerima,</Text>
                <View style={styles.signatureLine} />
                <Text style={{ fontWeight: 'bold', marginTop: 4 }}>{pihakKedua.namaLengkap}</Text>
                <Text>NIP. {pihakKedua.nip}</Text>
            </View>

            <View style={styles.signatureBlock}>
                <Text>PIHAK PERTAMA</Text>
                <Text>Yang Menyerahkan,</Text>
                <View style={styles.signatureLine} />
                <Text style={{ fontWeight: 'bold', marginTop: 4 }}>{pihakPertama.namaLengkap}</Text>
                <Text>NIP. {pihakPertama.nip}</Text>
            </View>
        </View>

      </Page>
    </Document>
  );
};