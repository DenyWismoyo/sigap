// Directory: src/app/dashboard/pelayanan/components/TandaTerimaLayananPdf.tsx
// [UPDATE] Desain ulang Tanda Terima agar mirip dengan referensi (Format A4, Header Resmi, Box Status).

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { PelayananTransaksi } from '@/types';

// Style yang disesuaikan dengan referensi gambar
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 60,
    fontFamily: 'Helvetica',
    fontSize: 12,
    lineHeight: 1.5,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },
  headerLine: {
    marginTop: 10,
    borderBottomWidth: 3, // Garis tebal
    borderBottomColor: '#000',
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 30,
    textDecoration: 'underline',
    textTransform: 'uppercase',
  },
  contentContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 140,
    fontWeight: 'bold',
  },
  separator: {
    width: 15,
    textAlign: 'center',
  },
  value: {
    flex: 1,
    textTransform: 'uppercase', // Nama dan layanan biasanya kapital
  },
  statusBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 15,
    marginTop: 30,
    marginBottom: 30,
  },
  statusBoxLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusBoxValue: {
    fontSize: 28, // Ukuran besar sesuai gambar
    fontWeight: 'heavy', // Lebih tebal
    textTransform: 'uppercase',
  },
  statusBoxNote: {
    fontSize: 10,
    marginTop: 5,
    color: '#333',
  },
  footer: {
    marginTop: 50,
    flexDirection: 'column', // Stack vertikal untuk tanda tangan tengah
    alignItems: 'center', // Center alignment sesuai gambar
  },
  signatureTitle: {
    marginBottom: 60, // Ruang tanda tangan
    textAlign: 'center',
  },
  signatureName: {
    fontWeight: 'bold',
    textDecoration: 'underline',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Helper untuk ID di pojok bawah
  bottomId: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    fontSize: 9,
    color: '#888',
  }
});

interface Props {
  data: PelayananTransaksi;
  opdName: string;
}

export const TandaTerimaLayananPdf = ({ data, opdName }: Props) => (
  <Document>
    {/* Menggunakan ukuran A4 agar maksimal 1 halaman penuh dan resmi */}
    <Page size="A4" style={styles.page}>
      
      {/* HEADER / KOP */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>PEMERINTAH KOTA SURAKARTA</Text>
        <Text style={styles.headerSub}>{opdName.toUpperCase()}</Text>
        <View style={styles.headerLine} />
      </View>

      {/* JUDUL DOKUMEN */}
      <Text style={styles.title}>TANDA TERIMA PELAYANAN</Text>

      {/* DETAIL TRANSAKSI */}
      <View style={styles.contentContainer}>
        <View style={styles.row}>
          <Text style={styles.label}>Tanggal</Text>
          <Text style={styles.separator}>:</Text>
          {/* Format Tanggal & Jam Lengkap: 24/11/2025, 15.20.32 */}
          <Text style={styles.value}>
            {data.tanggal.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            {', '}
            {data.tanggal.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.')}
          </Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Nama Pemohon</Text>
          <Text style={styles.separator}>:</Text>
          <Text style={styles.value}>{data.namaPemohon}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Jenis Layanan</Text>
          <Text style={styles.separator}>:</Text>
          <Text style={styles.value}>{data.jenisDokumen || data.judulLayanan}</Text>
        </View>

        {data.namaPengambil && (
            <View style={styles.row}>
            <Text style={styles.label}>Dikuasakan Ke</Text>
            <Text style={styles.separator}>:</Text>
            <Text style={styles.value}>{data.namaPengambil}</Text>
            </View>
        )}
      </View>

      {/* KOTAK STATUS */}
      <View style={styles.statusBox}>
        <Text style={styles.statusBoxLabel}>Status Saat Ini:</Text>
        <Text style={styles.statusBoxValue}>{data.status}</Text>
        <Text style={styles.statusBoxNote}>Catatan: {data.catatan || '-'}</Text>
      </View>

      {/* TANDA TANGAN PETUGAS */}
      <View style={styles.footer}>
        <Text style={styles.signatureTitle}>Petugas,</Text>
        {/* Nama Petugas */}
        <Text style={styles.signatureName}>{data.petugasNama}</Text>
      </View>

      {/* ID Transaksi untuk Tracking (Pojok Bawah) */}
      <Text style={styles.bottomId}>
        ID Dokumen: {data.id} | Dicetak: {new Date().toLocaleString('id-ID')}
      </Text>

    </Page>
  </Document>
);