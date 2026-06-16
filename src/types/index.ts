import { Timestamp } from "firebase/firestore";
import { ReactNode } from "react";

// [UPDATE] Tambahkan Role Baru
export type FunctionalRole = 
  | 'pengurus_barang' 
  | 'notulis_rapat' 
  | 'bendahara' 
  | 'petugas_pelayanan' 
  | 'pengelola_tapem' 
  | 'operator_surat'
  | 'petugas_kelurahan' // Operator SKW Kelurahan
  | 'petugas_kecamatan'; // Verifikator SKW Kecamatan

// [BARU] Interface untuk SKW
export type SkwJenisLayanan = 'Tanah' | 'Umum' | 'Perwalian' | 'Ralat';

export interface SkwAhliWaris {
  id: string;
  nama: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  hubungan: string;
  alamat: string;
}

export interface SkwSaksi {
  id: string;
  nama: string;
  nik: string;
  umur: string;
  pekerjaan: string;
  alamat: string;
}

export interface SkwRequest {
  id?: string;
  jenis: SkwJenisLayanan;
  
  // Data Pemohon (Wali jika Perwalian)
  namaPemohon: string;
  nikPemohon: string;
  alamatPemohon: string;
  
  // Data Almarhum (Hanya Tanah & Umum)
  namaAlmarhum?: string;
  nikAlmarhum?: string;
  tanggalMeninggal?: string;
  tempatMeninggal?: string;
  alamatAlmarhum?: string;

  // KHUSUS PERWALIAN
  namaAnak?: string; // Anak yang dimohonkan perwalian
  tempatTanggalLahirAnak?: string; // Optional: TTL Anak
  namaAyah?: string; // Orang Tua dari Anak
  namaIbu?: string; // Orang Tua dari Anak

  // KHUSUS RALAT
  ralatDari?: string;    // Contoh: Nama "Budi"
  ralatMenjadi?: string; // Contoh: Nama "Budi Santoso"
  keteranganRalat?: string; // Optional

  // Data Pendukung
  ahliWaris: SkwAhliWaris[];
  saksi: SkwSaksi[];
  lampiranUrl?: string;
  
  nomorSurat: string;
  tanggalSurat: string;
  status: 'Draft' | 'Diajukan' | 'Disetujui' | 'Ditolak';
  createdAt?: any;
  updatedAt?: any;
}


export interface UserProfile { 
  id?: string; 
  uid: string; 
  namaLengkap: string; 
  nip: string; 
  email: string; 
  opdId: string; 
  opdIndukId?: string | null; 
  jabatanId: string; 
  role: 'user' | 'admin_opd' | 'super_admin' | 'staf_tu'; 
  status: 'aktif' | 'nonaktif'; 
  nomorWa?: string; 
  fcmTokens?: string[]; 
  personalEmail?: string; 
  personalEmailVerified?: boolean; 
  googleDriveReportLink?: string; 
  googleRefreshToken?: string | null; 
  googleAccessToken?: string | null; 
  googleTokenExpiry?: number | null;
  googleEmail?: string | null; 
  googleCalendarSyncEnabled?: boolean; 
  namaJabatan?: string; 
  level?: number; 
  searchKeywords?: string[]; 
  additionalRoles?: FunctionalRole[]; 
}

export interface ServiceTemplate {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  fileUrl: string;
  fileName: string;
  fileType: string; 
  uploadedBy: string;
  createdAt: any; 
  updatedAt: any;
  isActive: boolean;
}

export interface Jabatan { id?: string; namaJabatan: string; level: number; opdId: string; idAtasan: string | null; pltUserId?: string | null; pltMulaiTanggal?: Timestamp | null; pltSelesaiTanggal?: Timestamp | null; status?: 'aktif' | 'nonaktif'; delegasiSementara?: { delegatedToJabatanId: string; berlakuHingga: Timestamp; alasan: string; } | null; }
export interface OpdConfig { id?: string; packageName: 'Dasar' | 'Profesional' | 'Enterprise' | 'Custom'; langgananAktifHingga: Timestamp; paymentStatus?: 'Lunas' | 'Menunggu Pembayaran' | 'Gagal' | 'Kedaluwarsa'; kuotaPengguna: number; penggunaAktifSaatIni: number; features: { aiSuratReader: boolean; aiNotulensi: boolean; analitika: boolean; manajemenAset: boolean; persetujuanDraf: boolean; formBuilder: boolean; }; }
export interface WelcomeSummary { disposisiBaru: number; tindakLanjutMenunggu: number; tugasAktif: number; tugasLewatBatasWaktu: number; suratMenungguDisposisi: number; suratBaruCount?: number; tugasBaruCount?: number; }

export interface Surat { 
    id: string; 
    nomorSurat: string; 
    perihal: string; 
    pengirim: string; 
    tanggalSurat: Timestamp; 
    tanggalDiterima: Timestamp; 
    fileUrl: string; 
    fileName: string; 
    klasifikasi: 'Biasa' | 'Penting' | 'Segera' | 'Rahasia'; 
    statusPenyelesaian: "Baru" | "Didisposisikan" | "Proses Tindak Lanjut" | "Selesai" | "Diarsipkan" | "Revisi Disposisi"; 
    createdBy: string; 
    opdId: string; 
    jenisSurat?: 'Undangan' | 'Pemberitahuan' | 'Permohonan' | 'Lainnya'; 
    detailAgenda?: AgendaDetail | null; 
    searchKeywords?: string[]; 
    reminderSent?: boolean; 
    tanggalSelesai?: Timestamp; 
    tujuanJabatanId?: string | null; 
    terlibatJabatanIds?: string[]; // Menyimpan riwayat jabatan yang pernah berinteraksi (Upload/Disposisi/Tindak Lanjut)
    // [FITUR BARU - FASE 1 DENORMALISASI] 
    // Menyimpan ringkasan tampilan agar tidak perlu fetch berulang kali ke tabel disposisi
    infoTampilan?: {
        senderName?: string;
        recipientNames?: string;
        isInformational?: boolean;
    };
}

export interface AgendaDetail { tanggal: Timestamp; jam: string; jamSelesai?: string | null; lokasi: string; }
export interface Disposisi { id?: string; suratId: string; dariJabatanId: string; kepadaJabatanId: string[]; tembusanJabatanId?: string[]; tanggalDisposisi: Timestamp; instruksi: string; catatan?: string; batasWaktu?: Timestamp; status?: 'Terkirim' | 'Dikembalikan'; isInformational?: boolean; penerimaDiterima?: string[]; penerimaSelesai?: string[]; alasanPengembalian?: string; dikembalikanPada?: Timestamp; isDelegated?: boolean; delegatedToJabatanId?: string; originalKepadaJabatanId?: string; opdId?: string; dariJabatanNama?: string; }
export interface Tugas { id?: string; opdId: string; judulTugas: string; deskripsi: string; dariJabatanId: string; kepadaJabatanId: string; tanggalDibuat: Timestamp; batasWaktu?: Timestamp | null; tanggalSelesai?: Timestamp | null; status: 'Baru' | 'Dikerjakan' | 'Selesai'; prioritas: 'Tinggi' | 'Sedang' | 'Rendah'; suratId?: string; suratPerihal?: string; lampiran?: TugasLampiran[]; subTugas?: SubTugas[]; kategoriTugas?: 'Penyusunan Laporan' | 'Analisis Data' | 'Persiapan Materi' | 'Koordinasi' | 'Lainnya'; delegatedToJabatanId?: string | null; isDelegated?: boolean; collaboratorIds?: string[]; dariJabatanNama?: string; kepadaJabatanNama?: string; }
export interface TugasLampiran { name: string; url: string; uploadedAt: Timestamp; type: 'file' | 'link'; }
export interface TugasKomentar { id?: string; tugasId: string; userId: string; userName: string; userJabatan: string; komentar: string; timestamp: Timestamp; }
export interface SubTugas { id: string; teks: string; selesai: boolean; }
export interface OPD {
    nama: string; id?: string; namaOpd: string; alamat: string; tipe: "Induk" | "Sub-OPD"; idOpdInduk: string | null; status?: 'aktif' | 'nonaktif'; 
}
export interface Notification { id?: string; userId: string; userNip: string; message: string; link: string; isRead: boolean; timestamp: Timestamp; }
export interface InstruksiTemplat { isiInstruksi: ReactNode; id?: string; opdId: string; teksInstruksi: string; createdBy: string; sharedWithOpdIds?: string[]; }
export interface ActivityLog { id?: string; suratId: string; timestamp: Timestamp; actorName: string; action: string; details?: string; }
export interface JadwalTempat { id?: string; opdId: string; namaTempat: string; kegiatan: string; penanggungJawab: string; tanggalMulai: Timestamp; jamMulai: string; jamSelesai: string; createdBy: string; createdAt: Timestamp; status: 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak'; ditinjauOleh?: string; tanggalDitinjau?: Timestamp; alasanDitolak?: string; jenis?: 'Fisik' | 'Virtual'; tautanRapat?: string; peserta?: string[]; jumlahPersonil?: number; }
export interface AsetInventaris { id?: string; opdId: string; namaAset: string; kodeAset: string; kategori: string; kondisi: 'Baik' | 'Perlu Perbaikan' | 'Rusak Berat'; status: 'Tersedia' | 'Dipinjam' | 'Digunakan' | 'Dalam Perbaikan'; pemegangAsetId?: string | null; lokasi: string; tanggalMasuk: Timestamp; tahunPengadaan?: number; nilaiPerolehan?: number; spesifikasi?: string; fotoUrl?: string; fotoFileName?: string; jadwalMaintenanceBerikutnya?: Timestamp | null; intervalMaintenance?: number; }
export interface AsetMaintenance { id?: string; asetId: string; namaAset: string; opdId: string; tanggal: Timestamp; jenis: 'Rutin' | 'Perbaikan' | 'Kerusakan'; deskripsi: string; biaya: number; pelaksana: string; buktiUrl?: string; dicatatOleh: string; createdAt: Timestamp; }
export interface PeminjamanAset { id?: string; asetId: string; namaAset: string; opdId: string; peminjamEksternal: boolean; peminjamInfo: string; tanggalPinjam: Timestamp; tanggalKembali: Timestamp | null; keperluan: string; kondisiSaatPinjam: string; kondisiSaatKembali?: string; dicatatOleh: string; createdAt: Timestamp; status: 'Dipinjam' | 'Dikembalikan'; }
export interface DokumenFolder { id?: string; opdId: string; namaFolder: string; parentId: string | null; createdBy: string; createdAt: Timestamp; sharedWithOpdIds?: string[]; }
export interface DokumenLink { id?: string; opdId: string; folderId: string | null; namaDokumen: string; deskripsi: string; url: string; createdBy: string; createdAt: Timestamp; sharedWithOpdIds?: string[]; tipeDokumen?: DocumentIconType; }
export type RepositoryItemType = "folder" | "link";
export type DocumentIconType = "sheet" | "doc" | "pdf" | "video" | "image" | "zip" | "lainnya";
export interface RepositoryItem { id: string; nama: string; tipe: RepositoryItemType; parentId: string | null; folderId?: string | null; opdId: string; ownerId: string; path: { id: string | null; nama: string }[]; url?: string; tipeDokumen?: DocumentIconType; createdAt: any; updatedAt: any; }
export interface LogbookKegiatan { id: string; deskripsi: string; selesai: boolean; tugasTerkaitId?: string; tugasTerkaitJudul?: string; }
export interface LogbookHarian { id?: string; userId: string; opdId: string; tanggal: Timestamp; kegiatan: LogbookKegiatan[]; }
export interface BuktiKinerja { id?: string; userId: string; opdId: string; judul: string; googleDriveLink: string; fileName: string; fileType: string; createdAt: Timestamp; }
export interface NotulensiRapat { id?: string; opdId: string; judulRapat: string; tanggalRapat: Timestamp; pemimpinRapat: string; notulis: string; peserta: string; createdBy: string; createdAt: Timestamp; isiNotulensi: string; }
export interface KnowledgeArticle { id?: string; opdId: string; judul: string; kategori: string; konten: string; attachmentUrl?: string; createdBy: string; createdAt: Timestamp; lastUpdatedAt: Timestamp; sharedWithOpdIds?: string[]; }
export interface PengumumanAttachment { url: string; fileName: string; type: string; }
export interface Pengumuman { id?: string; opdId: string; judul: string; isi: string; penulis: string; createdAt: Timestamp; target: 'Semua OPD' | string; penting: boolean; tanggalMulai: Timestamp; tanggalSelesai: Timestamp; attachmentUrl?: string | null; attachmentFileName?: string | null; attachmentType?: string | null; attachments?: PengumumanAttachment[]; sharedWithOpdIds?: string[]; }
export interface BankTemplate { id?: string; judul: string; deskripsi: string; googleDriveUrl: string; googleDriveId?: string; kategori: string; opdId: string; createdBy: string; createdAt: Timestamp; sharedWithOpdIds?: string[]; }
export interface ApprovalStep { jabatanId: string; namaJabatan: string; status: 'Menunggu' | 'Disetujui' | 'Revisi'; timestamp?: Timestamp; comments?: string; }
export interface RiwayatPersetujuan { timestamp: Timestamp; actorName: string; action: string; comments: string; }
export interface DrafPersetujuan { id?: string; judul: string; googleDocUrl: string; opdId: string; createdBy: string; pembuatNama?: string; createdAt: Timestamp; status: 'Draf' | 'Proses Review' | 'Revisi' | 'Selesai' | 'Ditolak'; currentStep: number; penerimaTugasJabatanId: string | null; approvalChain: ApprovalStep[]; approvalJabatanIds: string[]; riwayat: RiwayatPersetujuan[]; }
export type FormulirFieldType = 'Teks Singkat' | 'Teks Panjang' | 'Pilihan Ganda' | 'Checkbox' | 'Tanggal' | 'Upload File';
export interface FormulirField { id: string; label: string; tipe: FormulirFieldType; required: boolean; options?: string[]; }
export interface Formulir { id?: string; opdId: string; createdBy: string; createdAt: Timestamp; judul: string; deskripsi?: string; googleDriveFolderId?: string; fields: FormulirField[]; isPublished: boolean; assignmentType?: 'all_opd' | 'specific_jabatan'; assignedToJabatanIds?: string[]; }
export interface FormulirResponse { id?: string; formId: string; opdId: string; submittedBy: string; submittedByName: string; submittedAt: Timestamp; data: { [fieldId: string]: any }; }
export interface KinerjaAgregat { id?: string; tanggal: Timestamp; opdId: string; totalSuratMasuk: number; totalDisposisi: number; totalTugas: number; rataRataWaktuResponsDisposisi: number; persentasePenyelesaianTepatWaktu: number; tingkatRevisiDisposisi: number; bebanKerjaPerJabatan: { jabatanId: string; namaJabatan: string; namaPejabat: string; tugasAktif: number; disposisiAktif: number; totalBeban: number; }[]; kinerjaPerJabatan: { jabatanId: string; namaJabatan: string; namaPejabat: string; totalTugasSelesai: number; tugasSelesaiTepatWaktu: number; rataRataWaktuPenyelesaianTugas: number; totalDisposisiDiterima: number; }[]; }
export interface ChecklistItem { id: string; teks: string; status: 'Todo' | 'In Progress' | 'Done'; }
export interface ChecklistBoard { id?: string; userId: string; judul: string; items: ChecklistItem[]; createdAt: Timestamp; tugasTerkaitId?: string; }
export interface PaymentHistory { id?: string; opdId: string; tanggalBayar: Timestamp; jumlah: number; paket: 'Dasar' | 'Profesional' | 'Enterprise' | 'Custom'; periodeBulan: number; dicatatOleh: string; catatan?: string; }
export interface PricingPackage { id?: string; hargaPerPenggunaPerBulan: number; features: { aiSuratReader: boolean; aiNotulensi: boolean; analitika: boolean; manajemenAset: boolean; persetujuanDraf: boolean; formBuilder: boolean; }; }
export interface Tagihan { id?: string; opdId: string; namaOpd: string; bulanTagihan: number; tahunTagihan: number; packageName: string; jumlahPenggunaAktif: number; hargaPerPengguna: number; totalTagihan: number; status: 'Belum Dibayar' | 'Lunas' | 'Kedaluwarsa'; tanggalDibuat: Timestamp; tanggalDibayar: Timestamp | null; catatan?: string; }
export type KepuasanType = "Sangat Puas" | "Puas" | "Cukup" | "Kurang Puas" | "Sangat Tidak Puas";
export type KemudahanType = "Sangat Mudah" | "Mudah" | "Cukup" | "Sulit" | "Sangat Sulit";
export type TipeFeedbackType = "Laporan Bug" | "Saran Fitur" | "Komentar Umum";
export type FeedbackStatusType = "Baru" | "Ditinjau" | "Selesai";
export interface FeedbackLaporan { id?: string; userId: string; userNip: string; userNama: string; userJabatan: string; opdId: string; kepuasan: KepuasanType; kemudahan: KemudahanType; tipe: TipeFeedbackType; halamanTerkait?: string; deskripsi: string; status: FeedbackStatusType; createdAt: Timestamp; }
export type TipeTransaksi = 'Masuk' | 'Keluar';
export type KategoriBelanja = 'GU' | 'LS' | 'TUP' | 'Pajak' | 'Lainnya';
export interface KeuanganRekening { id?: string; opdId: string; kode: string; nama: string; anggaran?: number; }
export interface Vendor { id?: string; opdId: string; namaToko: string; alamat?: string; npwp?: string; namaPemilik?: string; bank?: string; noRekening?: string; kategori?: string; createdAt: Timestamp; }
export interface KeuanganTransaksi { id?: string; opdId: string; tanggal: Timestamp; tipe: TipeTransaksi; kategori: KategoriBelanja; uraian: string; jumlah: number; penerima: string; vendorId?: string; buktiUrl?: string; buktiFileName?: string; kodeRekening?: string; status: 'Draft' | 'Final'; dicatatOleh: string; createdAt: Timestamp; kelengkapan?: { item: string; checked: boolean }[]; pajak?: { ppn: number; pph: number; } | null; ntpn?: string; tanggalSetorPajak?: Timestamp | null; }
export interface OpnameKas { id?: string; opdId: string; tanggal: Timestamp; saldoBuku: number; saldoFisik: number; selisih: number; keterangan: string; rincianPecahan: { [pecahan: string]: number }; petugas: string; createdAt: Timestamp; }
export type KertasKerjaType = 'manual' | 'link';
export type KertasKerjaColumnType = 'text' | 'number' | 'date' | 'currency';
export interface KertasKerjaColumn { id: string; label: string; type: KertasKerjaColumnType; }
export interface KertasKerja { id?: string; opdId: string; judul: string; deskripsi?: string; kategori?: string; tipe: KertasKerjaType; urlEksternal?: string; kolom?: KertasKerjaColumn[]; createdBy: string; createdAt: Timestamp; }
export interface KertasKerjaRow { id?: string; kertasKerjaId: string; data: { [columnId: string]: any }; createdAt: Timestamp; }
export interface PelayananTransaksi { id?: string; opdId: string; tanggal: Timestamp; namaPemohon: string; noHp?: string; namaPengambil?: string; alamat?: string; customData?: Record<string, any>; kategori: 'Pengambilan' | 'Layanan Umum'; jenisDokumen?: string; judulLayanan?: string; catatan?: string; status: 'Selesai' | 'Diproses' | 'Menunggu'; fotoBuktiUrl?: string; petugasId: string; petugasNama: string; createdAt: Timestamp; }
export interface TindakLanjut { id?: string; disposisiId: string; suratId: string; userId: string; jabatanId: string; tanggalLaporan: Timestamp; isiLaporan: string; googleDriveLink?: string; googleDriveFileName?: string; tautanLaporanUrl?: string; tautanLaporanNama?: string; fileLaporanUrl?: string; fileLaporanName?: string; opdId?: string; terlibatJabatanIds?: string[]; }
export interface TargetTahunan { tahun: number; target: number | string; realisasi?: number | string; }
export interface IndikatorSasaran { id: string; nama: string; satuan: string; target: TargetTahunan[]; }
export interface SasaranStrategis { id?: string; opdId: string; renstraId: string; deskripsi: string; indikator: IndikatorSasaran[]; createdAt: Timestamp; }
export interface Renstra { id?: string; opdId: string; periodeAwal: number; periodeAkhir: number; visi: string; misi: string[]; createdAt: Timestamp; isActive: boolean; }
export interface Program { id?: string; opdId: string; kode: string; nama: string; tahun: number; createdAt: Timestamp; }
export interface Kegiatan { id?: string; programId: string; opdId: string; kode: string; nama: string; createdAt: Timestamp; }
export interface SubKegiatan { id?: string; kegiatanId: string; opdId: string; kode: string; nama: string; paguMurni?: number; paguPerubahan?: number; pptkUserId?: string; createdAt: Timestamp; }
export interface RincianBelanja { id: string; uraian: string; spesifikasi?: string; koefisien: number; satuan: string; hargaSatuan: number; ppn?: number; total: number; }
export interface AkunBelanja { id: string; kodeRekening: string; namaRekening: string; items: RincianBelanja[]; totalAnggaran: number; }
export interface SubKegiatanAnggaran { id?: string; opdId: string; tahun: number; kodeProgram: string; namaProgram: string; kodeKegiatan: string; namaKegiatan: string; kodeSubKegiatan: string; namaSubKegiatan: string; sumberDana: string; lokasi?: string; waktuPelaksanaan?: string; rekening: AkunBelanja[]; totalPagu: number; createdAt: Timestamp; }
export interface PersonalLink { id?: string; userId: string; judul: string; url: string; deskripsi?: string; kategori: string; urutan: number; createdAt: Timestamp; }
export interface SuratAgendaItem extends Surat { penerimaDisposisi: string; disposisiStatus: 'Sudah Didisposisi' | 'Belum Didisposikan'; }
export interface EnrichedSuratAgenda extends Surat {
  penerimaDisposisi: string;
  disposisiStatus: 'Sudah Didisposisi' | 'Belum Didisposikan';
  isSelfDispo?: boolean;
  isForMe?: boolean;
}
export type CombinedAgendaItem = { id: string; type: 'surat' | 'internal'; item: Surat | JadwalTempat; time: string; title: string; location: string; penerimaDisposisi?: string; disposisiStatus?: 'Sudah Didisposisi' | 'Belum Didisposikan'; };
export interface ActionableSuratItem { surat: Surat; disposisi: Disposisi; needsAcknowledge: boolean; needsTindakLanjut: boolean; isOverdue: boolean; }
export type RuangKerjaItem = | (ActionableSuratItem & { type: 'surat_disposisi'; fromJabatanName: string; }) | { type: 'tugas'; tugas: Tugas; fromJabatanName: string; } | { type: 'surat_baru'; surat: Surat; fromJabatanName: string; } | { type: 'draf'; draf: DrafPersetujuan; fromJabatanName: string; };
export interface AgendaTimelineItemData { id: string; type: 'internal' | 'eksternal'; title: string; time: string; date: Timestamp; location: string; source: Surat | JadwalTempat; }

export interface KompetensiItem {
  aspek: string;
  standar: number;
  aktual: number;
  gap: number;
}

export interface IndividualDevelopmentPlan {
  id: string;
  program: string;
  targetWaktu: string;
  status: 'Direncakan' | 'Berjalan' | 'Selesai';
  prioritas: 'Tinggi' | 'Sedang';
  keterangan?: string;
}

export interface TalentProfileExtended extends UserProfile {
  kompetensi: KompetensiItem[];
  riwayatDiklat: RiwayatDiklat[];
  idp: IndividualDevelopmentPlan[];
  poinKredit?: number;
  indeksProfesionalitas?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date; 
  assigneeId?: string; 
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId: string;
  creatorName: string;
  createdAt: Date;
  updatedAt: Date;
  
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'; 
  basePoints: number; 
  bonusPoints?: number; 
  marketStatus: 'draft' | 'published' | 'claimed' | 'closed'; 
  requiredSkills?: string[]; 
  isMarketplaceItem?: boolean; 
}

export type JenisKerjaSama = 'Daerah' | 'Pihak Ketiga' | 'Luar Negeri' | 'Sinoc' | 'Lainnya';
export type StatusKerjaSama = 'Aktif' | 'Akan Berakhir' | 'Berakhir' | 'Diperpanjang';

export interface KerjaSama {
  id?: string;
  opdId: string; 
  judul: string;
  nomorNaskah: string;
  mitra: string; 
  jenis: JenisKerjaSama;
  tanggalMulai: Timestamp;
  tanggalAkhir: Timestamp;
  status: StatusKerjaSama;
  fileUrl?: string;
  fileName?: string;
  deskripsi?: string;
  progressMonev?: string; 
  createdAt: Timestamp;
  createdBy: string;
}

export type JenisWilayah = 'Kecamatan' | 'Kelurahan';

export interface Wilayah {
  id?: string;
  kodeWilayah: string; 
  nama: string; 
  jenis: JenisWilayah;
  indukId?: string; 
  namaPejabat: string; 
  nipPejabat: string;
  alamatKantor?: string;
  luasWilayah?: number; 
  jumlahPenduduk?: number;
  petaUrl?: string;
  batasWilayahUrl?: string;
}

export interface TapemStats {
  totalKerjaSama: number;
  kerjaSamaAktif: number;
  kerjaSamaAkanBerakhir: number; 
  totalKecamatan: number;
  totalKelurahan: number;
}

export type KategoriDiklat = 'Manajerial' | 'Teknis' | 'Fungsional' | 'Sosiokultural';

export interface RiwayatDiklat {
  id?: string;
  userId: string;
  opdId: string;
  namaDiklat: string;
  penyelenggara: string;
  tahun: number;
  durasiJam: number; 
  nomorSertifikat?: string;
  tanggalSelesai: Timestamp;
  kategori: KategoriDiklat;
  fileBuktiUrl?: string; 
  fileBuktiName?: string;
  createdAt: Timestamp;
}

export interface RiwayatPenghargaan {
  id?: string;
  userId: string;
  opdId: string;
  namaPenghargaan: string;
  pemberi: string; 
  tahun: number;
  tingkat: 'Nasional' | 'Provinsi' | 'Kab/Kota' | 'Instansi';
  fileBuktiUrl?: string;
  fileBuktiName?: string;
  createdAt: Timestamp;
}

export type TipeMutasi = 'Mutasi Antar OPD' | 'Rotasi Internal' | 'Promosi' | 'Demosi';

export interface RiwayatMutasi {
  id?: string;
  userId: string;
  namaUser: string;
  nipUser: string;
  
  // Data Lama
  opdAsalId: string;
  namaOpdAsal: string;
  jabatanAsalId: string;
  namaJabatanAsal: string;

  // Data Baru
  opdTujuanId: string;
  namaOpdTujuan: string;
  jabatanTujuanId: string;
  namaJabatanTujuan: string;

  // Meta
  tanggalMutasi: Timestamp;
  nomorSk?: string;
  alasan?: string;
  tipe: TipeMutasi;
  
  // Actor
  mutatedByUserId: string; 
  createdAt: Timestamp;
}