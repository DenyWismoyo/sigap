// Directory: src/app/dashboard/aset/components/RoomInventoryPdf.tsx
// [UPDATE] Menampilkan Jabatan Pimpinan secara dinamis di Tanda Tangan.

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { AsetInventaris, UserProfile } from '@/types';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginVertical: 10,
    textDecoration: 'underline',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoColumn: {
    width: '48%',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 80,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 24,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCell: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#000',
    padding: 4,
    fontSize: 9,
  },
  colNo: { width: '5%', textAlign: 'center' },
  colKode: { width: '20%' },
  colNama: { width: '35%' },
  colMerk: { width: '15%' },
  colTahun: { width: '10%', textAlign: 'center' },
  colKondisi: { width: '15%', textAlign: 'center' },
  footer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: 220, // Agak lebar untuk jabatan panjang
    textAlign: 'center',
  },
  signatureSpace: {
    height: 50,
  },
});

interface RoomInventoryPdfProps {
  opdNama: string;
  ruangan: string;
  asetList: AsetInventaris[];
  penanggungJawab: UserProfile;
  kepalaOpd?: { nama: string; nip: string; jabatan: string };
}

export const RoomInventoryPdf = ({ opdNama, ruangan, asetList, penanggungJawab, kepalaOpd }: RoomInventoryPdfProps) => {
  const assetsInRoom = asetList.filter(a => a.lokasi.trim().toLowerCase() === ruangan.trim().toLowerCase());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
            <Text style={styles.headerText}>PEMERINTAH KOTA SURAKARTA</Text>
            <Text style={styles.headerText}>{opdNama.toUpperCase()}</Text>
        </View>

        <Text style={styles.title}>KARTU INVENTARIS RUANGAN (KIR)</Text>

        <View style={styles.infoSection}>
            <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Provinsi</Text>
                    <Text style={styles.value}>: JAWA TENGAH</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Kota</Text>
                    <Text style={styles.value}>: SURAKARTA</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Unit Kerja</Text>
                    <Text style={styles.value}>: {opdNama}</Text>
                </View>
            </View>
            <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Ruangan</Text>
                    <Text style={styles.value}>: {ruangan.toUpperCase()}</Text>
                </View>
            </View>
        </View>

        <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={[styles.tableCell, styles.colNo]}><Text>No</Text></View>
                <View style={[styles.tableCell, styles.colKode]}><Text>Kode Barang</Text></View>
                <View style={[styles.tableCell, styles.colNama]}><Text>Nama Barang</Text></View>
                <View style={[styles.tableCell, styles.colMerk]}><Text>Merk/Tipe</Text></View>
                <View style={[styles.tableCell, styles.colTahun]}><Text>Tahun</Text></View>
                <View style={[styles.tableCell, styles.colKondisi]}><Text>Kondisi</Text></View>
            </View>
            
            {assetsInRoom.length > 0 ? (
                assetsInRoom.map((item, index) => (
                    <View style={styles.tableRow} key={item.id}>
                        <View style={[styles.tableCell, styles.colNo]}><Text>{index + 1}</Text></View>
                        <View style={[styles.tableCell, styles.colKode]}><Text>{item.kodeAset}</Text></View>
                        <View style={[styles.tableCell, styles.colNama]}><Text>{item.namaAset}</Text></View>
                        <View style={[styles.tableCell, styles.colMerk]}><Text>{item.spesifikasi || '-'}</Text></View>
                        <View style={[styles.tableCell, styles.colTahun]}><Text>{item.tanggalMasuk.toDate().getFullYear()}</Text></View>
                        <View style={[styles.tableCell, styles.colKondisi]}><Text>{item.kondisi}</Text></View>
                    </View>
                ))
            ) : (
                <View style={styles.tableRow}>
                     <View style={[styles.tableCell, { width: '100%', textAlign: 'center', padding: 20 }]}>
                        <Text>Tidak ada aset tercatat di ruangan ini.</Text>
                     </View>
                </View>
            )}
        </View>

        <View style={styles.footer}>
            {/* Bagian Kiri: Kepala SKPD / Pilihan User */}
            <View style={styles.signatureBlock}>
                <Text>Mengetahui,</Text>
                {/* Tampilkan Nama Jabatan Dinamis */}
                <Text>{kepalaOpd?.jabatan || 'Kepala SKPD'}</Text>
                
                <View style={styles.signatureSpace} />
                
                <Text style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                    {kepalaOpd?.nama || '(...................................)'}
                </Text>
                <Text>NIP. {kepalaOpd?.nip || '...................................'}</Text>
            </View>

            {/* Bagian Kanan: Pengurus Barang */}
            <View style={styles.signatureBlock}>
                <Text>Surakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                <Text>Pengurus Barang</Text>
                
                <View style={styles.signatureSpace} />
                
                <Text style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{penanggungJawab.namaLengkap}</Text>
                <Text>NIP. {penanggungJawab.nip}</Text>
            </View>
        </View>
      </Page>
    </Document>
  );
};