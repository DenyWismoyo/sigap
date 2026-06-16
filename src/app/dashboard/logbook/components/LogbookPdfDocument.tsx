import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { UserProfile, LogbookHarian } from '@/types';

// Register font (Opsional, kita pakai Helvetica standar dulu agar ringan dan kompatibel)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40, // Margin kertas
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  headerTop: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginVertical: 4,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 2,
  },
  // Info Pegawai Section
  infoContainer: {
    marginBottom: 20,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 100,
    fontWeight: 'bold',
  },
  infoSeparator: {
    width: 10,
    textAlign: 'center',
  },
  infoValue: {
    flex: 1,
  },
  // Table Styles
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
    padding: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#000',
    padding: 5,
  },
  // Kolom widths
  colNo: { width: '8%' },
  colDate: { width: '20%' },
  colDesc: { width: '60%' },
  colStatus: { width: '12%' },
  
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
  },
  
  // Footer / Tanda Tangan
  footer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBlock: {
    width: 250,
    textAlign: 'center',
  },
  signatureSpace: {
    height: 60,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginTop: 2,
    marginHorizontal: 20,
  },
});

interface LogbookPdfProps {
  userProfile: UserProfile;
  jabatanNama: string;
  opdNama: string;
  periode: string; // "Oktober 2025"
  data: LogbookHarian[];
}

export const LogbookPdfDocument = ({ userProfile, jabatanNama, opdNama, periode, data }: LogbookPdfProps) => {
    // Flatten data: Ubah array of hari menjadi array of semua kegiatan tunggal
    const allActivities: any[] = [];
    
    data.forEach(daily => {
        const date = daily.tanggal.toDate();
        const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
        
        if (daily.kegiatan.length === 0) {
             // Opsional: Masukkan baris kosong jika hari kerja tapi tidak ada kegiatan?
             // Untuk sekarang kita skip hari kosong agar hemat kertas
        } else {
            daily.kegiatan.forEach(k => {
                allActivities.push({
                    fullDate: `${dayName}, ${dateStr}`,
                    deskripsi: k.deskripsi,
                    status: k.selesai ? 'Selesai' : 'Proses',
                    tugas: k.tugasTerkaitJudul
                });
            });
        }
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header / Kop */}
                <View style={styles.header}>
                    <Text style={styles.headerTop}>PEMERINTAH KOTA SURAKARTA</Text>
                    <Text style={styles.title}>{opdNama.toUpperCase()}</Text>
                    <Text style={styles.subtitle}>LAPORAN KINERJA HARIAN PEGAWAI</Text>
                </View>

                {/* Info Pegawai */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Nama</Text>
                        <Text style={styles.infoSeparator}>:</Text>
                        <Text style={styles.infoValue}>{userProfile.namaLengkap}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>NIP</Text>
                        <Text style={styles.infoSeparator}>:</Text>
                        <Text style={styles.infoValue}>{userProfile.nip}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Jabatan</Text>
                        <Text style={styles.infoSeparator}>:</Text>
                        <Text style={styles.infoValue}>{jabatanNama}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Periode</Text>
                        <Text style={styles.infoSeparator}>:</Text>
                        <Text style={styles.infoValue}>{periode}</Text>
                    </View>
                </View>

                {/* Tabel */}
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableRow}>
                        <View style={{ ...styles.tableColHeader, ...styles.colNo }}>
                            <Text style={styles.tableCellHeader}>No</Text>
                        </View>
                        <View style={{ ...styles.tableColHeader, ...styles.colDate }}>
                            <Text style={styles.tableCellHeader}>Hari/Tanggal</Text>
                        </View>
                        <View style={{ ...styles.tableColHeader, ...styles.colDesc }}>
                            <Text style={styles.tableCellHeader}>Uraian Kegiatan</Text>
                        </View>
                        <View style={{ ...styles.tableColHeader, ...styles.colStatus }}>
                            <Text style={styles.tableCellHeader}>Status</Text>
                        </View>
                    </View>

                    {/* Table Rows */}
                    {allActivities.length > 0 ? (
                        allActivities.map((item, index) => (
                            <View style={styles.tableRow} key={index}>
                                <View style={{ ...styles.tableCol, ...styles.colNo }}>
                                    <Text style={{ ...styles.tableCell, textAlign: 'center' }}>{index + 1}</Text>
                                </View>
                                <View style={{ ...styles.tableCol, ...styles.colDate }}>
                                    <Text style={styles.tableCell}>{item.fullDate}</Text>
                                </View>
                                <View style={{ ...styles.tableCol, ...styles.colDesc }}>
                                    <Text style={styles.tableCell}>{item.deskripsi}</Text>
                                    {item.tugas && (
                                        <Text style={{ fontSize: 8, color: '#444', fontStyle: 'italic', marginTop: 2 }}>
                                            [Terkait Tugas: {item.tugas}]
                                        </Text>
                                    )}
                                </View>
                                <View style={{ ...styles.tableCol, ...styles.colStatus }}>
                                    <Text style={{ ...styles.tableCell, textAlign: 'center' }}>{item.status}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                             <View style={{ ...styles.tableCol, width: '100%' }}>
                                <Text style={{ ...styles.tableCell, textAlign: 'center', padding: 20 }}>
                                    Tidak ada data kegiatan untuk periode ini.
                                </Text>
                             </View>
                        </View>
                    )}
                </View>

                {/* Footer / Tanda Tangan */}
                <View style={styles.footer}>
                    <View style={styles.signatureBlock}>
                        <Text>Surakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                        <Text>Yang Melaporkan,</Text>
                        <View style={styles.signatureSpace} />
                        <Text style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{userProfile.namaLengkap}</Text>
                        <Text>NIP. {userProfile.nip}</Text>
                    </View>
                </View>
                
                {/* Nomor Halaman (Bottom Center) */}
                <Text style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#888' }} render={({ pageNumber, totalPages }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};