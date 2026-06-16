// Lokasi: functions/src/index.ts
// [MODIFIKASI GOOGLE CALENDAR]: File ini telah dimodifikasi.
// - Menambahkan helper global `createCalendarEvent` untuk GCal.
// - Menambahkan trigger `onJadwalTempatCreate` untuk sinkronisasi jadwal internal.
// - Memodifikasi trigger `onDisposisiCreate` untuk sinkronisasi undangan eksternal & batas waktu.
// [MODIFIKASI BILLING]: File ini telah dimodifikasi.
// - Menambahkan fungsi terjadwal 'calculateActiveUsers' untuk menghitung pengguna aktif.
// - [MODIFIKASI BARU] Menambahkan 'generateMonthlyInvoices' untuk Fase 2.
// - [MODIFIKASI BARU] Menambahkan logika penegakan 'kuotaPengguna: 0' di 'calculateActiveUsers' untuk Fase 4.
// [MODIFIKASI EFISIENSI (Fase 1)]:
// - Menambahkan helper `generateSearchKeywords`.
// - Memodifikasi `onUserCreate` dan `onUserUpdate` untuk denormalisasi `namaJabatan`, `level`, dan `searchKeywords`.
// - Menambahkan trigger `onJabatanWriteForDenormalization` untuk sinkronisasi data Jabatan ke User.
// [PERBAIKAN 05/11/2025]: Memperbaiki error TS6133 dengan memanggil `generateSearchKeywords` di `onUserCreate` dan `onUserUpdate`.
// [PERBAIKAN SEARCH 05/11/2025]: Mengganti `generateSearchKeywords` dengan logika prefiks (n-gram).
// [PERBAIKAN SEARCH (Permintaan User)]: Fokus pada Nama Lengkap, 8 digit NIP, dan kata pertama Jabatan.
// [MODIFIKASI REKOMENDASI 2 (LOGIN CEPAT)]:
// - onDisposisiSummaryUpdate: Menambahkan decrement 'suratBaruCount' saat disposisi diterima/dihapus.
// - onSuratSummaryUpdate: Menambahkan decrement 'suratMenungguDisposisi' & 'suratBaruCount' untuk Pimpinan/TU saat surat selesai.
// - onTugasWritten: Menambahkan logika increment/decrement 'tugasAktif' dan 'tugasBaruCount' berdasarkan status.
// - onDisposisiCreate: Menambahkan decrement 'suratMenungguDisposisi' & 'suratBaruCount' untuk PENGIRIM.
// - onDisposisiCreate: Menambahkan increment 'disposisiBaru' & 'suratBaruCount' untuk PENERIMA.
// - onSuratCreate: Menambahkan increment 'suratMenungguDisposisi' & 'suratBaruCount' untuk Pimpinan/TU.
// - Menambahkan fungsi https.onCall 'resetUserSummaryCount'.
// [MODIFIKASI PENYEMPURNAAN LANJUTAN (Batch 3)]
// - Mengubah onNotificationCreated agar MENAMBAHKAN 'tag' (untuk grouping) ke 'data-only' payload.
// [PERBAIKAN SINKRONISASI GOOGLE CALENDAR (11/11/2025)]
// - Menambahkan helper `createRfc3339DateTimeWIB` untuk memaksa zona waktu WIB (+07:00).
// - Mengganti `.toISOString()` dengan `createRfc3339DateTimeWIB(date)` di `onDisposisiCreate` dan `onJadwalTempatCreate`.
// - Mengganti `.toISOString().split("T")[0]` dengan `.toLocaleDateString('en-CA')` untuk event 'all-day'.
// [PENAMBAHAN FITUR ANALITIKA SUPER ADMIN]
// - Menambahkan fungsi terjadwal `aggregateKinerjaPenggunaHarian` sesuai rencana.
// [MODIFIKASI PWA BADGE]
// - 'onNotificationCreated' sekarang mengambil 'totalCount' dari 'userSummaries' dan menambahkannya ke payload notifikasi.
// [MODIFIKASI LINTAS OPD V2 - 13/11/2025]
// - Memodifikasi `onSuratCreate` untuk mendukung 'tujuanJabatanId' (Triase TU Pusat).
// - Menambahkan `getGlobalUserCache` (onCall) untuk Pimpinan Pusat (level <= 2).

import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
  onDocumentDeleted,
} from "firebase-functions/v2/firestore";
// [MODIFIKASI] Impor 'onSchedule'
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { isEqual } from "lodash";
import { google } from "googleapis";


// Inisialisasi Firebase Admin SDK
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const storage = admin.storage();

// Menetapkan lokasi functions
const REGION = "asia-southeast2";

// --- [PERBAIKAN] Definisi Tipe Data (Interface) Lengkap ---
// Definisi ini disalin dari src/types/index.ts Anda untuk memastikan konsistensi

interface Timestamp { toMillis(): number; toDate(): Date; }
interface AgendaDetail { tanggal: Timestamp; jam: string; jamSelesai?: string | null; lokasi: string; }
interface Surat {
    id: string;
    opdId: string;
    perihal: string;
    nomorSurat: string;
    pengirim: string;
    tanggalDiterima: Timestamp;
    tanggalSurat: Timestamp;
    statusPenyelesaian: string;
    fileUrl: string;
    fileName: string;
    createdBy: string;
    searchKeywords?: string[];
    batasWaktu?: Timestamp;
    klasifikasi: 'Biasa' | 'Penting' | 'Segera' | 'Rahasia';
    jenisSurat?: "Undangan" | "Pemberitahuan" | "Permohonan" | "Lainnya";
    detailAgenda?: AgendaDetail | null;
    reminderSent?: boolean;
    tanggalSelesai?: Timestamp | null;
    tujuanJabatanId?: string | null; // [MODIFIKASI LINTAS OPD V2] Field baru
}
interface Disposisi {
  id?: string;
  suratId: string;
  kepadaJabatanId: string[];
  dariJabatanId: string;
  tanggalDisposisi: Timestamp;
  instruksi: string;
  batasWaktu?: Timestamp;
  status?: "Terkirim" | "Dikembalikan";
  isInformational?: boolean;
  penerimaDiterima?: string[];
  alasanPengembalian?: string;
  dikembalikanPada?: Timestamp;
  isDelegated?: boolean;
  delegatedToJabatanId?: string;
  originalKepadaJabatanId?: string;
  opdId?: string;
  dariJabatanNama?: string;
}
interface TugasLampiran { name: string; url: string; uploadedAt: Timestamp; type: 'file' | 'link'; }
interface SubTugas { id: string; teks: string; selesai: boolean; }
interface Tugas {
  id?: string;
  opdId: string;
  judulTugas: string;
  deskripsi: string;
  dariJabatanId: string;
  kepadaJabatanId: string;
  tanggalDibuat: Timestamp;
  batasWaktu?: Timestamp | null;
  tanggalSelesai?: Timestamp | null;
  status: "Baru" | "Dikerjakan" | "Selesai";
  prioritas: "Tinggi" | "Sedang" | "Rendah";
  suratId?: string;
  suratPerihal?: string;
  lampiran?: TugasLampiran[];
  subTugas?: SubTugas[];
  kategoriTugas?: 'Penyusunan Laporan' | 'Analisis Data' | 'Persiapan Materi' | 'Koordinasi' | 'Lainnya';
  delegatedToJabatanId?: string | null;
  isDelegated?: boolean;
  collaboratorIds?: string[];
  dariJabatanNama?: string;
  kepadaJabatanNama?: string;
}
interface UserProfile {
  id?: string; // NIP (ID Dokumen Firestore)
  uid: string; // Firebase Auth UID
  namaLengkap: string;
  nip: string;
  email: string; // Email awal (mungkin tidak aktif/placeholder)
  opdId: string;
  jabatanId: string;
  role: 'user' | 'admin_opd' | 'super_admin' | 'staf_tu';
  status: 'aktif' | 'nonaktif'; // Status kepegawaian
  nomorWa?: string;
  fcmTokens?: string[];
  // --- PENAMBAHAN BARU ---
  personalEmail?: string; // Email pribadi/kontak yang ditambahkan pengguna
  personalEmailVerified?: boolean; // Status verifikasi email pribadi (opsional)
  googleDriveReportLink?: string; // Link Google Drive kustom untuk laporan pribadi
  
  // --- [TAMBAHAN UNTUK INTEGRASI GOOGLE CALENDAR] ---
  googleRefreshToken?: string | null;
  googleAccessToken?: string | null;
  googleTokenExpiry?: number | null;
  googleCalendarSyncEnabled?: boolean;
  // --- [AKHIR TAMBAHAN] ---

  // --- [PENAMBAHAN TAHAP 1 EFISIENSI] ---
  namaJabatan?: string; // Denormalisasi dari 'jabatan'
  level?: number; // Denormalisasi dari 'jabatan'
  searchKeywords?: string[]; // Untuk pencarian cepat
  // --- [AKHIR PENAMBAHAN] ---
}
interface Jabatan { 
  id: string; 
  namaJabatan: string; 
  level: number; 
  opdId: string; 
  status: "aktif" | "nonaktif"; 
  idAtasan: string | null; 
  pltUserId?: string | null; 
  pltMulaiTanggal?: Timestamp | null; 
  pltSelesaiTanggal?: Timestamp | null; 
  delegasiSementara?: { 
    delegatedToJabatanId: string; 
    berlakuHingga: Timestamp; 
    alasan: string; 
  } | null; 
}
interface OPD { id?: string; namaOpd: string; idOpdInduk: string | null; tipe: "Induk" | "Sub-OPD"; } // [MODIFIKASI] Tambah 'tipe'
interface Pengumuman {
  attachmentFileName?: string | null;
}
interface ApprovalStep {
  jabatanId: string;
  namaJabatan: string;
  status: 'Menunggu' | 'Disetujui' | 'Revisi';
  timestamp?: Timestamp;
  comments?: string;
}
interface DrafPersetujuan {
  id?: string;
  judul: string;
  googleDocUrl: string;
  opdId: string;
  createdBy: string; // UID Pembuat
  status: 'Draf' | 'Proses Review' | 'Revisi' | 'Selesai' | 'Ditolak';
  currentStep: number;
  penerimaTugasJabatanId: string | null;
  pembuatNama?: string;
  approvalChain: ApprovalStep[]; // [MODIFIKASI] Tambahan
  approvalJabatanIds: string[]; // [MODIFIKASI] Tambahan
  createdAt: Timestamp; // [MODIFIKASI] Tambahan
  riwayat: RiwayatPersetujuan[]; // [MODIFIKASI] Tambahan
}
// [MODIFIKASI] Tambahan RiwayatPersetujuan
interface RiwayatPersetujuan {
  timestamp: Timestamp;
  actorName: string;
  action: string;
  comments: string;
}
interface JadwalTempat {
  id?: string;
  opdId: string;
  namaTempat: string;
  kegiatan: string;
  penanggungJawab: string;
  tanggalMulai: Timestamp;
  jamMulai: string;
  jamSelesai: string;
  createdBy: string; // UID
  createdAt: Timestamp;
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  jenis?: 'Fisik' | 'Virtual';
  tautanRapat?: string;
}

// --- [MODIFIKASI BILLING] Tipe Data Baru untuk Langganan (dari types/index.ts) ---
interface OpdConfig {
  id?: string;
  packageName: 'Dasar' | 'Profesional' | 'Enterprise' | 'Custom';
  langgananAktifHingga: Timestamp;
  // [MODIFIKASI BILLING] Tambahkan 'Kedaluwarsa'
  paymentStatus?: 'Lunas' | 'Menunggu Pembayaran' | 'Gagal' | 'Kedaluwarsa';
  kuotaPengguna: number;
  penggunaAktifSaatIni: number;
  features: {
    aiSuratReader: boolean;
    aiNotulensi: boolean;
    analitika: boolean;
    manajemenAset: boolean;
    persetujuanDraf: boolean;
    formBuilder: boolean;
  };
}

interface PricingPackage {
  id?: string; // Nama paket, e.g., 'Dasar', 'Profesional'
  hargaPerPenggunaPerBulan: number;
  features: OpdConfig['features']; // Gunakan struktur fitur yang sama
}

// [MODIFIKASI BILLING] Tipe Data Baru untuk Tagihan (Fase 2)
interface Tagihan {
  id?: string;
  opdId: string;
  namaOpd: string;
  bulanTagihan: number; // 1-12
  tahunTagihan: number;
  packageName: string;
  jumlahPenggunaAktif: number;
  hargaPerPengguna: number;
  totalTagihan: number;
  status: 'Belum Dibayar' | 'Lunas' | 'Kedaluwarsa';
  tanggalDibuat: Timestamp;
  tanggalDibayar: Timestamp | null;
  catatan?: string; // [MODIFIKASI] Tambahan
}

// [MODIFIKASI BARU] Tipe Notifikasi
interface Notification {
  id?: string;
  userId: string;
  userNip: string;
  message: string;
  link: string;
  isRead: boolean;
  timestamp: Timestamp;
}

// [MODIFIKASI BARU] Tipe Kinerja Harian
interface KinerjaPerPenggunaHarian {
  tanggal: Timestamp;
  userId: string;
  nip: string;
  jabatanId: string;
  opdId: string;
  tugasAktif: number;
  tugasSelesaiTepatWaktu: number;
  tugasSelesaiTerlambat: number;
  disposisiDiterima: number;
  disposisiDikembalikan: number;
}
// --- [AKHIR MODIFIKASI BILLING] ---


// --- [MODIFIKASI FASE 1] Helper Cache Baru untuk Nama Pengguna ---
const userNameCache = new Map<string, string>();
const userIdCache = new Map<string, string>(); // Cache lama tetap ada
const getUserNameFromJabatanId = async (jabatanId: string): Promise<string> => {
  if (userNameCache.has(jabatanId)) {
    return userNameCache.get(jabatanId) || "Nama Tidak Ditemukan";
  }
  const usersQuery = db.collection("users").where("jabatanId", "==", jabatanId).limit(1);
  const userSnapshot = await usersQuery.get();
  if (userSnapshot.empty) {
    logger.warn(`No user found for jabatanId in cache helper: ${jabatanId}`);
    userNameCache.set(jabatanId, "Jabatan Kosong"); // Cache negatif
    return "Jabatan Kosong";
  }
  const userName = (userSnapshot.docs[0].data() as UserProfile).namaLengkap || "Tanpa Nama";
  userNameCache.set(jabatanId, userName);
  return userName;
};
const getUserNameFromUid = async (uid: string): Promise<string> => {
     const usersQuery = db.collection("users").where("uid", "==", uid).limit(1);
     const userSnapshot = await usersQuery.get();
     if (userSnapshot.empty) {
         logger.warn(`No user found for UID in cache helper: ${uid}`);
         return "Pengguna Tidak Ditemukan";
     }
     return (userSnapshot.docs[0].data() as UserProfile).namaLengkap || "Tanpa Nama";
};
// --- [AKHIR MODIFIKASI FASE 1] ---

// --- [MODIFIKASI EFISIENSI (Fase 1)] Helper baru untuk search keywords ---
/**
 * Membuat array token pencarian dari data pengguna.
 * [MODIFIKASI 05/11/2025] Diubah untuk membuat n-gram (prefiks) agar pencarian 'array-contains' berfungsi.
 * [MODIFIKASI (Permintaan User)]: Fokus pada Nama Lengkap, 8 digit NIP, dan kata pertama Jabatan.
 */
const generateSearchKeywords = (namaLengkap: string, nip: string, namaJabatan: string): string[] => {
    const keywords = new Set<string>();
    
    // --- LOGIKA BARU (N-GRAM/PREFIKS) ---
    const createPrefixes = (text: string) => {
        if (!text) return;
        // Bersihkan teks dan pisah menjadi kata-kata
        const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
        
        for (const word of words) {
            // Jangan buat prefiks untuk kata yang terlalu pendek
            if (word.length < 2) continue;

            // Buat prefiks (n-gram)
            for (let i = 1; i <= word.length; i++) {
                keywords.add(word.substring(0, i));
            }
        }
    };

    // 1. Prefiks untuk SEMUA kata di Nama Lengkap (SESUAI PERMINTAAN)
    createPrefixes(namaLengkap);
    
    // 2. Prefiks untuk 8 digit pertama NIP (SESUAI PERMINTAAN)
    if (nip) {
        const cleanNip = nip.replace(/\s+/g, ""); // Hapus spasi
        // Hanya ambil 8 digit pertama
        const nipPrefixTarget = cleanNip.substring(0, 8); 
        if (nipPrefixTarget.length > 0) {
            for (let i = 1; i <= nipPrefixTarget.length; i++) { // Loop sampai panjang 8 itu
                 keywords.add(nipPrefixTarget.substring(0, i));
            }
        }
    }
    
    // 3. Prefiks HANYA untuk KATA PERTAMA dari Nama Jabatan (SESUAI PERMINTAAN)
    if (namaJabatan) {
        // Ambil hanya kata pertama
        const firstWordOfJabatan = namaJabatan.split(/\s+/)[0];
        // Kirim hanya kata pertama itu ke helper prefiks
        createPrefixes(firstWordOfJabatan);
    }
    
    // Batasi jumlah keywords untuk menghindari error ukuran dokumen
    return Array.from(keywords).slice(0, 100); 
};
// --- [AKHIR MODIFIKASI EFISIENSI] ---


// --- [MODIFIKASI GCAL] Helper global untuk Google Calendar ---
// [MODIFIKASI] Menambahkan helper baru untuk format waktu RFC3339
/**
 * Mengubah Date object menjadi string RFC3339 dengan offset WIB (+07:00).
 * @param date Objek Date
 * @returns String RFC3339 (e.g., "2025-11-10T09:00:00+07:00")
 */
const createRfc3339DateTimeWIB = (date: Date): string => {
  // Ambil tanggal dalam UTC
  const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  // Tambahkan 7 jam untuk mendapatkan waktu WIB
  const wibDate = new Date(utcDate.getTime() + (7 * 3600 * 1000));

  const y_wib = wibDate.getFullYear();
  const mo_wib = String(wibDate.getMonth() + 1).padStart(2, "0");
  const d_wib = String(wibDate.getDate()).padStart(2, "0");
  const h_wib = String(wibDate.getHours()).padStart(2, "0");
  const m_wib = String(wibDate.getMinutes()).padStart(2, "0");

  // Kembalikan format RFC3339 dengan offset WIB (+07:00)
  return `${y_wib}-${mo_wib}-${d_wib}T${h_wib}:${m_wib}:00+07:00`;
};

const createCalendarEvent = async (
  userProfile: UserProfile,
  userNip: string,
  eventDetails: {
    summary: string;
    description: string;
    location: string;
    start: { dateTime?: string; date?: string; timeZone: string; };
    end: { dateTime?: string; date?: string; timeZone: string; };
  }
) => {
  if (!userProfile.googleCalendarSyncEnabled) {
    logger.log(`User ${userProfile.uid} (NIP: ${userNip}) GCal sync is disabled. Skipping.`);
    return;
  }
  if (!userProfile.googleRefreshToken) {
    logger.warn(`User ${userProfile.uid} (NIP: ${userNip}) GCal sync enabled but no refresh token. Skipping.`);
    return;
  }
  const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
  );
  try {
    oAuth2Client.setCredentials({
      refresh_token: userProfile.googleRefreshToken,
    });
    await oAuth2Client.getAccessToken();
  } catch (tokenError: any) {
    logger.error(`Failed to refresh Google token for user ${userProfile.uid} (NIP: ${userNip}):`, tokenError.message);
    if (tokenError.message.includes("invalid_grant") || tokenError.message.includes("Token has been expired or revoked")) {
      const userRef = db.collection("users").doc(userNip);
      await userRef.update({
        googleCalendarSyncEnabled: false,
        googleRefreshToken: null,
        googleAccessToken: null,
        googleTokenExpiry: null,
      });
      logger.log(`Removed invalid Google refresh token for user ${userProfile.uid} (NIP: ${userNip})`);
    }
    return;
  }
  const calendar = google.calendar({version: "v3", auth: oAuth2Client});
  const event = {
    summary: eventDetails.summary,
    location: eventDetails.location,
    description: eventDetails.description,
    start: eventDetails.start,
    end: eventDetails.end,
  };
  try {
    await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });
    logger.log(`Successfully created calendar event for user ${userProfile.uid} (NIP: ${userNip})`);
  } catch (insertError) {
    logger.error(`Failed to insert calendar event for user ${userProfile.uid} (NIP: ${userNip}):`, insertError);
  }
};
// --- [AKHIR MODIFIKASI GCAL] ---


// =================================================================================================
// FUNGSI BARU: VALIDASI LOGIN (DIPANGGIL DARI AUTHCONTEXT)
// =================================================================================================
export const checkAdminEmail = functions.region(REGION).https.onCall(async (data, context) => {
    const email = data.email;
    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "Email wajib diisi.");
    }
    const usersRef = db.collection("users");
    const querySnapshot = await usersRef
        .where("email", "==", email)
        .where("status", "==", "aktif")
        .get();
    
    if (querySnapshot.empty) {
        throw new functions.https.HttpsError("not-found", "Email tidak terdaftar atau akun tidak aktif.");
    }
    
    const userData = querySnapshot.docs[0].data() as UserProfile;
    if (userData.role === 'user') {
        throw new functions.https.HttpsError("permission-denied", "Pengguna biasa harus login menggunakan NIP.");
    }
    return { nip: userData.nip };
});
export const getEmailFromNip = functions.region(REGION).https.onCall(async (data, context) => {
    const nip = data.nip;
    if (!nip) {
        throw new functions.https.HttpsError("invalid-argument", "NIP wajib diisi.");
    }
    const userDocRef = db.collection("users").doc(nip);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
        throw new functions.https.HttpsError("not-found", "NIP tidak terdaftar.");
    }
    
    const userData = userDocSnap.data() as UserProfile;
    if (userData.status !== "aktif") {
        throw new functions.https.HttpsError("permission-denied", "Akun ini tidak aktif.");
    }
    if (userData.role !== 'user') {
        throw new functions.https.HttpsError("permission-denied", "Login NIP hanya untuk pengguna biasa. Admin/Staf TU harap login menggunakan Email.");
    }
    if (!userData.email) {
        throw new functions.https.HttpsError("internal", "Data email untuk pengguna ini tidak ditemukan. Hubungi Admin.");
    }
    
    return { email: userData.email };
});
export const setNipClaim = functions.region(REGION).https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    const nip = data.nip;

    if (!uid) {
         throw new functions.https.HttpsError("unauthenticated", "Pengguna tidak terautentikasi.");
    }
    if (!nip) {
         throw new functions.https.HttpsError("invalid-argument", "NIP wajib diisi.");
    }

    try {
        const userRecord = await admin.auth().getUser(uid);
        const currentClaims = userRecord.customClaims || {};
        const userDocSnap = await db.collection("users").doc(nip).get();
        if (!userDocSnap.exists) {
            throw new functions.https.HttpsError("not-found", `Dokumen user untuk NIP ${nip} tidak ditemukan.`);
        }
        const userData = userDocSnap.data() as UserProfile;
        
        if (userData.uid !== uid) {
             throw new functions.https.HttpsError("permission-denied", `UID token tidak cocok dengan UID di dokumen user.`);
        }
        
        const jabatanDoc = await db.collection("jabatan").doc(userData.jabatanId).get();
        const level = jabatanDoc.exists ? jabatanDoc.data()?.level : 9;

        const newClaims = {
            ...currentClaims,
            role: userData.role,
            opdId: userData.opdId,
            jabatanId: userData.jabatanId,
            level: level,
            nip: nip,
        };

        if (!isEqual(currentClaims, newClaims)) {
            await admin.auth().setCustomUserClaims(uid, newClaims);
            logger.log(`Custom claims LENGKAP berhasil diatur untuk UID ${uid}.`);
            return { success: true, message: "Claims diatur." };
        }
        
        return { success: true, message: "Claims sudah sesuai." };

    } catch (error: any) {
        logger.error(`Gagal mengatur custom claims lengkap untuk UID ${uid}:`, error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});


// =================================================================================================
// --- FUNGSI BARU: PENGAMBILAN DATA GLOBAL (DIPANGGIL DARI AUTHCONTEXT) ---
// =================================================================================================
export const getGlobalOpdData = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Pengguna tidak terautentikasi.");
    }

    const userOpdId = context.auth.token.opdId as string;
    const userRole = context.auth.token.role as string;
    
    if (!userOpdId) {
         throw new functions.https.HttpsError("permission-denied", "Token pengguna tidak memiliki opdId.");
    }

    let allOpds: OPD[] = []; // Deklarasikan di scope atas

    try {
        let opdIdsToQuery: string[] = [];

        if (userRole === 'super_admin') {
            const opdSnapshot = await db.collection("opd").get();
            allOpds = opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD));
            
            // [PERBAIKAN ERROR BUILD] Mengatasi TS2322
            // doc.id berasal dari interface OPD { id?: string }, sehingga tipenya (string | undefined)[]
            // Kita filter untuk memastikan hanya string yang masuk ke opdIdsToQuery (string[])
            opdIdsToQuery = allOpds.map(doc => doc.id).filter(Boolean) as string[];
        } else {
            const opdSnapshot = await db.collection("opd").get();
            allOpds = opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD));
            
            const subOpdIds = allOpds
                .filter(opd => opd.idOpdInduk === userOpdId)
                .map(opd => opd.id!); // Asumsi id pasti ada jika difilter
            opdIdsToQuery = [userOpdId, ...subOpdIds];
        }

        if (opdIdsToQuery.length === 0) {
             opdIdsToQuery = [userOpdId];
        }

        const opdIdChunks: string[][] = [];
        for (let i = 0; i < opdIdsToQuery.length; i += 30) {
            opdIdChunks.push(opdIdsToQuery.slice(i, i + 30));
        }

        const jabatanPromises = opdIdChunks.map(chunk => 
            db.collection('jabatan').where('opdId', 'in', chunk).get()
        );

        const [jabatanSnapshots] = await Promise.all([
            Promise.all(jabatanPromises),
        ]);
        
        const allOpdJabatans = jabatanSnapshots.flatMap(snap => 
            snap.docs.map(d => ({ id: d.id, ...d.data() } as Jabatan)) 
        );
        
        logger.log(`Mengembalikan ${allOpdJabatans.length} jabatan dan ${allOpds.length} OPD untuk ${userOpdId}`);
        
        return { allOpdJabatans, allOpds };

    } catch (error: any) {
        logger.error(`Gagal mengambil data global OPD untuk ${userOpdId}:`, error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

// =================================================================================================
// --- [BARU] FUNGSI LINTAS OPD (Rencana V2 - 4.2) ---
// =================================================================================================
/**
 * [BARU] Mengambil cache global (semua user, jabatan, opd)
 * Hanya untuk Pimpinan Pusat (level <= 2).
 */
export const getGlobalUserCache = functions.region(REGION).https.onCall(async (data, context) => {
    // 1. Verifikasi otorisasi (Plan 4.2)
    if (!context.auth || !context.auth.token.level) {
         throw new functions.https.HttpsError("unauthenticated", "Request had no authentication.");
    }
    // Cek HANYA level
    if (context.auth.token.level > 2) {
        logger.warn(`User ${context.auth.uid} (level ${context.auth.token.level}) attempted to call getGlobalUserCache.`);
        throw new functions.https.HttpsError('permission-denied', 'Hanya Pimpinan Pusat (Level 1 atau 2) yang dapat memanggil fungsi ini.');
    }
    logger.log(`getGlobalUserCache called by Pimpinan Pusat (UID: ${context.auth.uid})`);

    try {
        // 2. Query semua data (Plan 4.2)
        const [jabatanSnapshot, userSnapshot, opdSnapshot] = await Promise.all([
            db.collection("jabatan").get(),
            db.collection("users").get(),
            db.collection("opd").get()
        ]);

        const allJabatans = jabatanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Jabatan));
        const allUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        const allOpds = opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD));
        
        logger.log(`Returning global cache: ${allJabatans.length} jabatans, ${allUsers.length} users, ${allOpds.length} OPDs.`);

        // 3. Return data (Plan 4.2)
        return { allJabatans, allUsers, allOpds };

    } catch (error: any) {
        logger.error(`Gagal mengambil data global cache:`, error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
// =================================================================================================


// =================================================================================================
// --- FUNGSI BARU: PENGELOLAAN USER SUMMARY UNTUK EFISIENSI ---
// =================================================================================================
const getUserIdFromJabatanId = async (jabatanId: string): Promise<string | null> => {
  if (userIdCache.has(jabatanId)) {
    return userIdCache.get(jabatanId) || null;
  }
  const usersQuery = db.collection("users").where("jabatanId", "==", jabatanId).where("status", "==", "aktif").limit(1);
  const userSnapshot = await usersQuery.get();
  if (userSnapshot.empty) {
    logger.warn(`No active user found for jabatanId: ${jabatanId}`);
    return null;
  }
  const userId = userSnapshot.docs[0].data().uid;
  userIdCache.set(jabatanId, userId);
  return userId;
};
const updateUserSummary = (userId: string, field: string, incrementValue: number) => {
  const summaryRef = db.collection("userSummaries").doc(userId);
  return summaryRef.set({
    [field]: admin.firestore.FieldValue.increment(incrementValue),
  }, {merge: true});
};
export const onDisposisiSummaryUpdate = onDocumentWritten(
    {document: "disposisi/{disposisiId}", region: REGION},
    async (event) => {
      const beforeData = event.data?.before.data() as Disposisi | undefined;
      const afterData = event.data?.after.data() as Disposisi | undefined;

      // Kasus 1: Disposisi BARU dibuat
      if (!beforeData && afterData) {
        for (const jabatanId of afterData.kepadaJabatanId) {
          const userId = await getUserIdFromJabatanId(jabatanId);
          if (userId) {
            logger.log(`Incrementing disposisiBaru for user ${userId} (Jabatan ${jabatanId})`);
            // (Logika increment notif dipindah ke onDisposisiCreate)
            // await updateUserSummary(userId, "disposisiBaru", 1);
          }
        }
        return;
      }

      // Kasus 2: Disposisi DIUPDATE (misal: diterima)
      if (beforeData && afterData) {
        const beforePenerima = beforeData.penerimaDiterima || [];
        const afterPenerima = afterData.penerimaDiterima || [];
        const newPenerimaIds = afterPenerima.filter((id: string) => !beforePenerima.includes(id));

        for (const jabatanId of newPenerimaIds) {
          const userId = await getUserIdFromJabatanId(jabatanId);
          if (userId) {
            logger.log(`Decrementing disposisiBaru for user ${userId} (Jabatan ${jabatanId})`);
            await updateUserSummary(userId, "disposisiBaru", -1);
            // [MODIFIKASI REKOMENDASI 2]
            // Dekremen notifikasi surat utama juga saat disposisi diterima
            await updateUserSummary(userId, "suratBaruCount", -1);

            if (jabatanId !== afterData.dariJabatanId) {
                const suratDoc = await db.collection("surat").doc(afterData.suratId).get();
                if (suratDoc.exists) {
                  const suratData = suratDoc.data() as Surat;
                  if (suratData.statusPenyelesaian !== "Selesai" && suratData.statusPenyelesaian !== "Diarsipkan") {
                    await updateUserSummary(userId, "tindakLanjutMenunggu", 1);
                  } else {
                     logger.log(`Surat ${afterData.suratId} is already finished. Not incrementing tindakLanjutMenunggu for user ${userId}.`);
                  }
                } else {
                    logger.warn(`Surat ${afterData.suratId} not found when checking status for tindakLanjutMenunggu.`);
                }
            } else {
                logger.log(`User ${userId} (Jabatan ${jabatanId}) received self-disposition. Not incrementing tindakLanjutMenunggu.`);
            }
          }
        }
      }

      // Kasus 3: Disposisi DIHAPUS
      if (beforeData && !afterData) {
        const penerimaDiterima = beforeData.penerimaDiterima || [];
        for (const jabatanId of beforeData.kepadaJabatanId) {
          const userId = await getUserIdFromJabatanId(jabatanId);
          if (userId) {
            if (!penerimaDiterima.includes(jabatanId)) {
              logger.log(`Decrementing disposisiBaru for user ${userId} (Jabatan ${jabatanId}) due to deletion`);
              await updateUserSummary(userId, "disposisiBaru", -1);
              // [MODIFIKASI REKOMENDASI 2]
              await updateUserSummary(userId, "suratBaruCount", -1);
            } else {
               const suratDoc = await db.collection("surat").doc(beforeData.suratId).get();
               if (suratDoc.exists) {
                 const suratData = suratDoc.data() as Surat;
                 if (jabatanId !== beforeData.dariJabatanId && suratData.statusPenyelesaian !== "Selesai" && suratData.statusPenyelesaian !== "Diarsipkan") {
                   logger.log(`Decrementing tindakLanjutMenunggu for user ${userId} (Jabatan ${jabatanId}) due to deletion`);
                   await updateUserSummary(userId, "tindakLanjutMenunggu", -1);
                 }
               }
            }
          }
        }
      }
    });
export const onSuratSummaryUpdate = onDocumentUpdated(
    {document: "surat/{suratId}", region: REGION},
    async (event) => {
      const beforeData = event.data?.before.data() as Surat;
      const afterData = event.data?.after.data() as Surat;
      const suratId = event.params.suratId;

      const isNowFinished = afterData.statusPenyelesaian === "Selesai" || afterData.statusPenyelesaian === "Diarsipkan";
      const wasPreviouslyActive = beforeData.statusPenyelesaian !== "Selesai" && beforeData.statusPenyelesaian !== "Diarsipkan";

      if (wasPreviouslyActive && isNowFinished) {
        logger.log(`Surat ${suratId} status changed to finished. Decrementing tindakLanjutMenunggu for involved users.`);
        const disposisiSnapshot = await db.collection("disposisi").where("suratId", "==", suratId).get();
        if (disposisiSnapshot.empty) {
          logger.log(`No disposisi found for finished surat ${suratId}. No counters to decrement.`);
          // [MODIFIKASI REKOMENDASI 2] Tetap jalankan cek pimpinan
        }

        const allRecipientJabatanIds = new Set<string>();
        const senderIds = new Set<string>();
        disposisiSnapshot.forEach((doc) => {
          const disposisi = doc.data() as Disposisi;
          senderIds.add(disposisi.dariJabatanId);
          (disposisi.penerimaDiterima || []).forEach((jabatanId: string) => allRecipientJabatanIds.add(jabatanId));
        });

        let decrementedCount = 0;
        if (allRecipientJabatanIds.size > 0) {
          for (const jabatanId of Array.from(allRecipientJabatanIds)) {
              const disposisiWhereRecipientIsSender = disposisiSnapshot.docs.find(doc => {
                  const d = doc.data() as Disposisi;
                  return d.dariJabatanId === jabatanId && d.kepadaJabatanId.includes(jabatanId);
              });

              if (disposisiWhereRecipientIsSender) {
                  logger.log(`Skipping tindakLanjutMenunggu decrement for self-disposition recipient ${jabatanId} on finished surat ${suratId}.`);
                  continue;
              }

              const userId = await getUserIdFromJabatanId(jabatanId);
              if (userId) {
                  await updateUserSummary(userId, "tindakLanjutMenunggu", -1);
                  decrementedCount++;
              }
          }
        } else {
           logger.log(`No acknowledged recipients found for finished surat ${suratId}.`);
        }
        
        // [MODIFIKASI REKOMENDASI 2]
        // Jika surat diarsipkan/selesai, kita juga harus mengurangi
        // 'suratMenungguDisposisi' dan 'suratBaruCount' dari Pimpinan/TU.
        const opdId = afterData.opdId;
        const jabatansQuery = await db.collection("jabatan")
            .where("opdId", "==", opdId)
            .where("status", "==", "aktif")
            .get();
        
        const jabatans = jabatansQuery.docs.map(doc => doc.data() as Jabatan);
        // [FIX] Cek jika jabatans kosong untuk menghindari error Math.min
        if (jabatans.length === 0) {
            logger.warn(`No active jabatans found for OPD ${opdId}. Cannot decrement leader summaries.`);
            return;
        }
        const minLevel = Math.min(...jabatans.map(j => j.level));
        const topLevelJabatanIds = jabatans.filter(j => j.level === minLevel).map(j => j.id);

        const usersQuery = await db.collection("users")
            .where("opdId", "==", opdId)
            .where("status", "==", "aktif")
            .where("role", "in", ["staf_tu", "admin_opd"])
            .get();
        
        const userIdsToDecrement = usersQuery.docs.map(d => d.data().uid);
        
        if (topLevelJabatanIds.length > 0) {
            const topLevelUsersQuery = await db.collection("users")
                .where("jabatanId", "in", topLevelJabatanIds)
                .where("status", "==", "aktif")
                .get();
                
            topLevelUsersQuery.forEach(d => {
                if (!userIdsToDecrement.includes(d.data().uid)) {
                    userIdsToDecrement.push(d.data().uid);
                }
            });
        }

        for (const userId of userIdsToDecrement) {
            await updateUserSummary(userId, "suratMenungguDisposisi", -1);
            await updateUserSummary(userId, "suratBaruCount", -1);
        }
        // [AKHIR MODIFIKASI]

        logger.log(`Decremented tindakLanjutMenunggu for ${decrementedCount} users related to finished surat ${suratId}.`);
      }
    });

/**
 * [MODIFIKASI FASE 1] Terpicu saat dokumen tugas berubah.
 * Menambahkan denormalisasi nama.
 */
export const onTugasWritten = onDocumentWritten(
    { document: "tugas/{tugasId}", region: REGION },
    async (event) => {
        const tugasId = event.params.tugasId;
        const beforeData = event.data?.before.data() as Tugas | undefined;
        const afterData = event.data?.after.data() as Tugas | undefined;

        // --- [MODIFIKASI FASE 1] DENORMALISASI NAMA ---
        if (afterData) { // Hanya jalankan untuk Create atau Update
            const [dariNama, kepadaNama] = await Promise.all([
                getUserNameFromJabatanId(afterData.dariJabatanId),
                getUserNameFromJabatanId(afterData.kepadaJabatanId),
            ]);

            const needsNameUpdate = (
                afterData.dariJabatanNama !== dariNama ||
                afterData.kepadaJabatanNama !== kepadaNama
            );

            if (needsNameUpdate) {
                logger.log(`Denormalizing names for tugas ${tugasId}.`);
                await event.data!.after.ref.update({
                    dariJabatanNama: dariNama,
                    kepadaJabatanNama: kepadaNama,
                });
                // Kita return di sini agar listener ini dipicu lagi,
                // dan baru menjalankan logika summary/fan-out di putaran kedua.
                // Ini memastikan data yang di-fan-out adalah data yang sudah denormalisasi.
                return;
            }
        }
        // --- [AKHIR MODIFIKASI FASE 1] ---

        // --- [MODIFIKASI REKOMENDASI 2] Logika Update Summary untuk Tugas ---
        const getAssigneeUids = async (tugasData: Tugas): Promise<string[]> => {
            const allJabatanIds = [tugasData.kepadaJabatanId, ...(tugasData.collaboratorIds || [])];
            const uids: string[] = [];
            for (const jabatanId of allJabatanIds) {
                const uid = await getUserIdFromJabatanId(jabatanId);
                if (uid) uids.push(uid);
            }
            return [...new Set(uids)]; // Kembalikan UID unik
        };

        try {
            if (!beforeData && afterData) {
                // TUGAS BARU DIBUAT
                const assigneeUids = await getAssigneeUids(afterData);
                for (const uid of assigneeUids) {
                    await updateUserSummary(uid, "tugasAktif", 1);
                    if (afterData.status === "Baru") {
                        await updateUserSummary(uid, "tugasBaruCount", 1);
                    }
                }
            } else if (beforeData && afterData) {
                // TUGAS DIUPDATE
                const assigneeUids = await getAssigneeUids(afterData);
                const statusChanged = beforeData.status !== afterData.status;

                if (statusChanged) {
                    for (const uid of assigneeUids) {
                        // Selesai
                        if (beforeData.status !== "Selesai" && afterData.status === "Selesai") {
                            await updateUserSummary(uid, "tugasAktif", -1);
                            if (beforeData.status === "Baru") {
                                await updateUserSummary(uid, "tugasBaruCount", -1);
                            }
                        }
                        // Dibuka kembali
                        else if (beforeData.status === "Selesai" && afterData.status !== "Selesai") {
                            await updateUserSummary(uid, "tugasAktif", 1);
                            if (afterData.status === "Baru") {
                                await updateUserSummary(uid, "tugasBaruCount", 1);
                            }
                        }
                        // Dari Baru -> Dikerjakan (Count notif hilang)
                        else if (beforeData.status === "Baru" && afterData.status === "Dikerjakan") {
                             await updateUserSummary(uid, "tugasBaruCount", -1);
                        }
                    }
                }
            } else if (beforeData && !afterData) {
                // TUGAS DIHAPUS
                const assigneeUids = await getAssigneeUids(beforeData);
                for (const uid of assigneeUids) {
                    if (beforeData.status !== "Selesai") {
                         await updateUserSummary(uid, "tugasAktif", -1);
                    }
                    if (beforeData.status === "Baru") {
                        await updateUserSummary(uid, "tugasBaruCount", -1);
                    }
                }
            }
        } catch (summaryError) {
            logger.error(`Error updating user summaries for tugas ${tugasId}:`, summaryError);
        }
        // --- [AKHIR MODIFIKASI REKOMENDASI 2] ---

        // Logika Fan-out (setelah denormalisasi nama dan update summary)
        if (beforeData && afterData) {
            const beforeCoreData = {
                status: beforeData.status,
                judulTugas: beforeData.judulTugas,
                kepadaJabatanId: beforeData.kepadaJabatanId,
                collaboratorIds: beforeData.collaboratorIds || [],
                dariJabatanId: beforeData.dariJabatanId,
                batasWaktu: beforeData.batasWaktu,
                dariJabatanNama: beforeData.dariJabatanNama,
                kepadaJabatanNama: beforeData.kepadaJabatanNama,
            };
            const afterCoreData = {
                status: afterData.status,
                judulTugas: afterData.judulTugas,
                kepadaJabatanId: afterData.kepadaJabatanId,
                collaboratorIds: afterData.collaboratorIds || [],
                dariJabatanId: afterData.dariJabatanId,
                batasWaktu: afterData.batasWaktu,
                dariJabatanNama: afterData.dariJabatanNama,
                kepadaJabatanNama: afterData.kepadaJabatanNama,
            };

            if (isEqual(beforeCoreData, afterCoreData)) {
                logger.log(`Tugas ${tugasId} write detected, but core data is unchanged (e.g., only comments/attachments updated). Skipping fan-out.`);
                return;
            }
        }

        const beforeJabatanIds = beforeData ? [beforeData.dariJabatanId, beforeData.kepadaJabatanId, ...(beforeData.collaboratorIds || [])] : [];
        const afterJabatanIds = afterData ? [afterData.dariJabatanId, afterData.kepadaJabatanId, ...(afterData.collaboratorIds || [])] : [];
        const allInvolvedJabatanIds = [...new Set([...beforeJabatanIds, ...afterJabatanIds])];

        if (allInvolvedJabatanIds.length === 0) {
            logger.log(`No relevant jabatan found for tugas ${tugasId}.`);
            return;
        }

        try {
            const usersQuery = await db.collection("users")
                                     .where("jabatanId", "in", allInvolvedJabatanIds)
                                     .where("status", "==", "aktif")
                                     .get();
            if (usersQuery.empty) {
                logger.warn(`No active users found for the jabatanIds involved in tugas ${tugasId}.`);
                return;
            }

            const batch = db.batch();

            usersQuery.docs.forEach(userDoc => {
                const user = userDoc.data() as UserProfile;
                const tugasPerPenggunaRef = db.collection("tugasPerPengguna").doc(user.uid).collection("tugas").doc(tugasId);

                if (!afterData || !afterJabatanIds.includes(user.jabatanId)) {
                    batch.delete(tugasPerPenggunaRef);
                } else {
                    batch.set(tugasPerPenggunaRef, afterData);
                }
            });

            await batch.commit();
            logger.log(`Tugas ${tugasId} has been successfully synchronized for ${usersQuery.size} relevant active users.`);
        } catch (error) {
            logger.error(`Error in onTugasWritten for tugas ${tugasId}:`, error);
        }
    }
);

// =================================================================================================
// --- [FUNGSI BARU] PENGELOLAAN ALUR PERSETUJUAN DRAF ---
// =================================================================================================
export const onDrafPersetujuanWrite = onDocumentWritten(
    { document: "drafPersetujuan/{drafId}", region: REGION },
    async (event) => {
        const drafId = event.params.drafId;
        const beforeData = event.data?.before.data() as DrafPersetujuan | undefined;
        const afterData = event.data?.after.data() as DrafPersetujuan | undefined;

        if (!afterData) {
            logger.log(`Draf persetujuan ${drafId} dihapus. Tidak ada aksi.`);
            return;
        }

        if (!beforeData && !afterData.pembuatNama) {
            const pembuatNama = await getUserNameFromUid(afterData.createdBy);
            if (pembuatNama) {
                await event.data!.after.ref.update({
                    pembuatNama: pembuatNama,
                });
                logger.log(`Added pembuatNama to draf ${drafId}.`);
                return;
            }
        }

        let currentPenerimaJabatanId: string | null = null;
        if (afterData.status === "Proses Review" && afterData.currentStep < afterData.approvalChain.length) {
            currentPenerimaJabatanId = afterData.approvalChain[afterData.currentStep].jabatanId;
        } else if (afterData.status === "Revisi") {
            currentPenerimaJabatanId = null;
        }

        // [MODIFIKASI] Pastikan approvalJabatanIds di-update jika berubah
        const newApprovalJabatanIds = afterData.approvalChain.map(step => step.jabatanId);
        const needsUpdate = (
            afterData.penerimaTugasJabatanId !== currentPenerimaJabatanId ||
            !isEqual(afterData.approvalJabatanIds, newApprovalJabatanIds)
        );

        if (needsUpdate) {
            await event.data?.after.ref.update({
                penerimaTugasJabatanId: currentPenerimaJabatanId,
                approvalJabatanIds: newApprovalJabatanIds,
            });
            logger.log(`Updated penerimaTugasJabatanId/approvalJabatanIds untuk draf ${drafId}.`);
        }
        // [AKHIR MODIFIKASI]

        const beforePenerima = beforeData?.penerimaTugasJabatanId;
        const afterPenerima = currentPenerimaJabatanId;
        
        let sendNotificationTo: string | null = null; // Ini adalah JABATAN ID
        let notificationMessage = "";

        if (afterData.status === "Proses Review" && afterPenerima && afterPenerima !== beforePenerima) {
            sendNotificationTo = afterPenerima;
            notificationMessage = `Anda memiliki draf dokumen baru ("${afterData.judul}") yang memerlukan persetujuan.`;
            logger.log(`Draf ${drafId} diteruskan ke ${afterPenerima}. Menyiapkan notifikasi.`);
        } else if (afterData.status === "Revisi" && beforeData?.status !== "Revisi") {
            const pembuatUid = afterData.createdBy;
            const userPembuatSnap = await db.collection("users").where("uid", "==", pembuatUid).limit(1).get();
            if (!userPembuatSnap.empty) {
                const userPembuat = userPembuatSnap.docs[0].data() as UserProfile;
                sendNotificationTo = userPembuat.jabatanId;
                notificationMessage = `Draf Anda ("${afterData.judul}") dikembalikan untuk revisi.`;
                logger.log(`Draf ${drafId} dikembalikan ke pembuat (UID: ${pembuatUid}). Menyiapkan notifikasi.`);
            }
        } else if (afterData.status === "Selesai" && beforeData?.status !== "Selesai") {
            const pembuatUid = afterData.createdBy;
            const userPembuatSnap = await db.collection("users").where("uid", "==", pembuatUid).limit(1).get();
            if (!userPembuatSnap.empty) {
                const userPembuat = userPembuatSnap.docs[0].data() as UserProfile;
                sendNotificationTo = userPembuat.jabatanId;
                notificationMessage = `Selamat! Draf Anda ("${afterData.judul}") telah disetujui sepenuhnya.`;
                logger.log(`Draf ${drafId} selesai. Memberi notifikasi ke pembuat (UID: ${pembuatUid}).`);
            }
        }

        if (sendNotificationTo && notificationMessage) {
            const userId = await getUserIdFromJabatanId(sendNotificationTo);
            if (userId) {
                const userDoc = await db.collection("users").where("uid", "==", userId).limit(1).get();
                if (!userDoc.empty) {
                    const userNip = userDoc.docs[0].id;
                    const notifRef = db.collection("notifications").doc();
                    await notifRef.set({
                        userId: userId,
                        userNip: userNip,
                        message: notificationMessage,
                        link: `/dashboard/persetujuan-draf/${drafId}`,
                        isRead: false,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    logger.log(`Notifikasi untuk draf ${drafId} berhasil dikirim ke user ${userId}.`);
                } else {
                    logger.warn(`Tidak ditemukan user (berdasarkan UID ${userId}) saat mengirim notifikasi draf.`);
                }
            } else {
                logger.warn(`Tidak ditemukan user untuk jabatanId ${sendNotificationTo} saat mengirim notifikasi draf.`);
            }
        }
    }
);


// =================================================================================================
// --- FUNGSI CLOUD FUNCTIONS LAINNYA ---
// =================================================================================================
const checkPermission = async (context: functions.https.CallableContext, requiredRoles: string[], checkLevel = false) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Request had no authentication.");
    }
    const role = context.auth.token.role as string;
    const level = context.auth.token.level as number;
    const allowedRoles = [...requiredRoles, "super_admin"];
    if (!allowedRoles.includes(role)) {
         throw new functions.https.HttpsError("permission-denied", `User must be one of: ${allowedRoles.join(", ")}.`);
    }
    if (checkLevel && (typeof level !== "number" || level > 5)) {
        throw new functions.https.HttpsError("permission-denied", "Hanya pimpinan (level 5 ke atas) yang diizinkan.");
    }
};
export const aturDelegasiSementara = functions.region(REGION).https.onCall(async (data, context) => {
    await checkPermission(context, [], true);
    const { delegatedToJabatanId, durasi, alasan } = data;
    const pimpinanJabatanId = context.auth?.token.jabatanId as string;
    const pimpinanNama = context.auth?.token.name;
    if (!delegatedToJabatanId || !durasi) {
        throw new functions.https.HttpsError("invalid-argument", "Data tidak lengkap.");
    }
    let berlakuHingga: Date;
    const now = new Date();
    switch (durasi) {
        case "2h": berlakuHingga = new Date(now.getTime() + 2 * 60 * 60 * 1000); break;
        case "4h": berlakuHingga = new Date(now.getTime() + 4 * 60 * 60 * 1000); break;
        case "eod":
            berlakuHingga = new Date();
            berlakuHingga.setHours(17, 0, 0, 0);
            if (now > berlakuHingga) berlakuHingga.setDate(berlakuHingga.getDate() + 1);
            break;
        case "manual": berlakuHingga = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); break;
        default: throw new functions.https.HttpsError("invalid-argument", "Durasi tidak valid.");
    }
    try {
        const jabatanRef = db.collection("jabatan").doc(pimpinanJabatanId);
        await jabatanRef.update({
            delegasiSementara: {
                delegatedToJabatanId,
                berlakuHingga: admin.firestore.Timestamp.fromDate(berlakuHingga),
                alasan: alasan || "Tugas mendesak",
            },
        });
        const userPenerimaQuery = await db.collection("users").where("jabatanId", "==", delegatedToJabatanId).limit(1).get();
        if (!userPenerimaQuery.empty) {
            const userPenerima = userPenerimaQuery.docs[0].data() as UserProfile;
            const notifRef = db.collection("notifications").doc();
            await notifRef.set({
                userId: userPenerima.uid,
                userNip: userPenerima.nip,
                message: `Pimpinan ${pimpinanNama} mendelegasikan wewenang disposisi kepada Anda.`,
                link: "/dashboard/ruang-kerja",
                isRead: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        logger.log(`Delegasi diatur oleh ${pimpinanJabatanId} kepada ${delegatedToJabatanId} hingga ${berlakuHingga.toISOString()}`);
        return { success: true, message: "Delegasi berhasil diaktifkan." };
    } catch (error: any) {
        logger.error("Error aturDelegasiSementara:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
export const batalkanDelegasiSementara = functions.region(REGION).https.onCall(async (data, context) => {
    await checkPermission(context, [], true);
    const pimpinanJabatanId = context.auth?.token.jabatanId as string;
    try {
        const jabatanRef = db.collection("jabatan").doc(pimpinanJabatanId);
        await jabatanRef.update({ delegasiSementara: null });
        logger.log(`Delegasi dibatalkan oleh ${pimpinanJabatanId}`);
        return { success: true, message: "Delegasi berhasil dinonaktifkan." };
    } catch (error: any) {
        logger.error("Error batalkanDelegasiSementara:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
export const resetPassword = functions.region(REGION).https.onCall(async (data, context) => {
    await checkPermission(context, ["admin_opd", "super_admin"]);
    const { uid, method, newPassword } = data;
    const adminEmail = context.auth?.token.email;
    try {
        const userToReset = await admin.auth().getUser(uid);
        const currentClaims = userToReset.customClaims || {};
        if (method === "email") {
            if (!userToReset.email) {
                throw new functions.https.HttpsError("not-found", "User does not have an email address.");
            }
            const link = await admin.auth().generatePasswordResetLink(userToReset.email);
            logger.info(`Generated password reset link for ${userToReset.email}: ${link}`);
            logger.log(`Password reset link generated for ${userToReset.email} by ${adminEmail}`);
            return {
                success: true,
                message: `Link reset password TELAH DIKIRIM (simulasi) ke ${userToReset.email}.`,
            };
        } else if (method === "temporary") {
            if (!newPassword || newPassword.length < 6) {
                throw new functions.https.HttpsError("invalid-argument", "Temporary password must be at least 6 characters.");
            }
            await admin.auth().updateUser(uid, { password: newPassword });
            await admin.auth().setCustomUserClaims(uid, { ...currentClaims, mustResetPassword: true });
            logger.log(`Temporary password set for user ${uid} by ${adminEmail}`);
            return { success: true, message: "Password sementara berhasil diatur. Pengguna akan diminta mengubahnya saat login." };
        } else {
            throw new functions.https.HttpsError("invalid-argument", "Invalid reset method specified.");
        }
    } catch (error: any) {
        logger.error("Error in resetPassword function:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
export const bulkUpdateUserStatus = functions.region(REGION).https.onCall(async (data, context) => {
    await checkPermission(context, ["admin_opd", "super_admin"]);
    const { userIds, status } = data;
    if (!Array.isArray(userIds) || !["aktif", "nonaktif"].includes(status)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid arguments provided.");
    }
    try {
        const batch = db.batch();
        userIds.forEach(nip => {
            const userRef = db.collection("users").doc(nip);
            batch.update(userRef, { status });
        });
        await batch.commit();
        logger.log(`${userIds.length} users status updated to ${status} by ${context.auth?.token.email}`);
        return { success: true, message: `${userIds.length} pengguna berhasil diperbarui.` };
    } catch (error: any) {
        logger.error("Error in bulkUpdateUserStatus:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
export const importUsers = functions.region(REGION).runWith({ timeoutSeconds: 540 }).https.onCall(async (data, context) => {
    await checkPermission(context, ["admin_opd", "super_admin"]);
    const usersToImport: Array<{ email: string, password?: string, namaLengkap: string, nip: string, role: string, opdId: string, jabatanId: string }> = data.users;
    if (!Array.isArray(usersToImport)) {
        throw new functions.https.HttpsError("invalid-argument", "Expected an array of users.");
    }
    let successCount = 0;
    const errors: string[] = [];
    for (const user of usersToImport) {
        try {
            const passwordToUse = user.password || `SIGAP${user.nip}`;
            const userRecord = await admin.auth().createUser({
                email: user.email,
                password: passwordToUse,
                displayName: user.namaLengkap,
                emailVerified: true,
            });
            const jabatanDoc = await db.collection("jabatan").doc(user.jabatanId).get();
            const level = jabatanDoc.exists ? jabatanDoc.data()?.level : 9;

            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: user.role, opdId: user.opdId, jabatanId: user.jabatanId,
                mustResetPassword: !user.password, level: level,
                nip: user.nip
            });
            await db.collection("users").doc(user.nip).set({
                uid: userRecord.uid, namaLengkap: user.namaLengkap, nip: user.nip,
                email: user.email, opdId: user.opdId, jabatanId: user.jabatanId,
                role: user.role, status: "aktif",
            });
            successCount++;
        } catch (error: any) {
            logger.error(`Failed to import user ${user.email}:`, error);
            errors.push(`Gagal mengimpor ${user.email}: ${error.message}`);
        }
    }
    return { success: successCount > 0, message: `Berhasil mengimpor ${successCount} dari ${usersToImport.length} pengguna.`, errors };
});
export const getImpersonationToken = functions.region(REGION).https.onCall(async (data, context) => {
    await checkPermission(context, ["admin_opd", "super_admin"]);
    const { targetUid, reason } = data;
    const adminUid = context.auth?.token.uid;
    const adminEmail = context.auth?.token.email;
    if (!targetUid || !reason) {
        throw new functions.https.HttpsError("invalid-argument", "Target UID and reason are required.");
    }
    try {
        await db.collection("impersonationLogs").add({
            adminUid, adminEmail, targetUid, reason,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        const userToImpersonate = await admin.auth().getUser(targetUid);
        const additionalClaims = { ...userToImpersonate.customClaims, impersonated: true, originalUid: adminUid };
        const customToken = await admin.auth().createCustomToken(targetUid, additionalClaims);
        logger.log(`Impersonation token created for ${targetUid} by ${adminEmail}. Reason: ${reason}`);
        return { success: true, token: customToken };
    } catch (error: any) {
        logger.error("Error in getImpersonationToken:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

// [MODIFIKASI PENYEMPURNAAN LANJUTAN (Batch 3)]
// Menambahkan logika 'tag' (grouping) berdasarkan isi pesan.
// [MODIFIKASI PWA BADGE] Menambahkan totalCount ke payload notifikasi.
export const onNotificationCreated = onDocumentCreated(
    { document: "notifications/{notificationId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) {
            logger.error("No data for onNotificationCreated event:", event);
            return;
        }
        const notificationData = snap.data() as Notification; // [MODIFIKASI] Tipe
        const { userId, userNip, message, link } = notificationData;
        logger.log(`New notification for user ${userId} (NIP: ${userNip}). Sending push...`);
        if (!userNip) {
            logger.error(`Notification ${event.params.notificationId} is missing 'userNip'. Aborting.`);
            return;
        }
        try {
            const userDocSnap = await db.collection("users").doc(userNip).get();
            if (!userDocSnap.exists) {
                 logger.warn(`User document not found for NIP ${userNip} (UID ${userId}). Cannot get FCM tokens.`);
                 return;
            }
            const userDoc = userDocSnap.data() as UserProfile;
            if (userDoc.uid !== userId) {
                 logger.error(`UID mismatch for NIP ${userNip}. Expected ${userId} but got ${userDoc.uid}. Aborting push.`);
                 return;
            }
            const tokens = userDoc.fcmTokens;
            if (!tokens || tokens.length === 0) {
                logger.log(`User ${userId} has no FCM tokens. Skipping push notification.`);
                return;
            }
            
            // --- [MODIFIKASI PWA BADGE] Ambil hitungan notifikasi dari userSummaries ---
            let totalCount = 0;
            try {
                // Ambil dokumen summary berdasarkan UID pengguna
                const summaryRef = db.collection("userSummaries").doc(userId);
                const summarySnap = await summaryRef.get();
                if (summarySnap.exists) {
                    const summaryData = summarySnap.data() as { suratBaruCount?: number, tugasBaruCount?: number };
                    // Jumlahkan count surat baru dan tugas baru
                    totalCount = (summaryData.suratBaruCount || 0) + (summaryData.tugasBaruCount || 0);
                }
            } catch (summaryError) {
                logger.error(`Gagal membaca userSummaries for badge count for user ${userId}:`, summaryError);
            }
            logger.log(`Total badge count for user ${userId} is ${totalCount}.`);
            // --- [AKHIR MODIFIKASI] ---

            // --- [MODIFIKASI BATCH 3] Logika Menentukan Tag Grouping ---
            let tag = 'sigap-default'; // Tag default
            const messageLower = message.toLowerCase();
            
            if (messageLower.includes('disposisi') || messageLower.includes('pemberitahuan') || messageLower.includes('dikembalikan')) {
                tag = 'disposisi';
            } else if (messageLower.includes('tugas baru')) {
                tag = 'tugas';
            } else if (messageLower.includes('surat baru')) {
                tag = 'surat-baru';
            } else if (messageLower.includes('draf dokumen')) {
                tag = 'draf';
            } else if (messageLower.includes('pengingat: undangan')) {
                tag = 'agenda';
            }
            logger.log(`Notification tag determined as: ${tag}`);
            // --- [AKHIR MODIFIKASI BATCH 3] ---

            const messagePayload: admin.messaging.MulticastMessage = {
                data: {
                    title: "SIGAP: Notifikasi Baru",
                    body: message,
                    icon: "/icon-192x192.png",
                    link: link || "/dashboard",
                    tag: tag, // [MODIFIKASI BATCH 3] Tambahkan tag ke payload
                    
                    // --- [MODIFIKASI PWA BADGE] Tambahkan totalCount ke payload ---
                    // Kirim sebagai string, ini praktik yang aman
                    totalCount: String(totalCount),
                },
                tokens: tokens,
            };

            const response = await admin.messaging().sendEachForMulticast(messagePayload);
            logger.log(`Push notification (data-only) attempt results for user ${userId}: ${response.successCount} success, ${response.failureCount} failure.`);
            
            if (response.failureCount > 0) {
                const tokensToRemove: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (error) {
                            logger.error(`Failure sending notification to token ${tokens[idx]}:`, error.code, error.message);
                             if (
                                error.code === "messaging/invalid-registration-token" ||
                                error.code === "messaging/registration-token-not-registered"
                            ) {
                                tokensToRemove.push(tokens[idx]);
                            }
                        }
                    }
                });
                if (tokensToRemove.length > 0) {
                    logger.log(`Cleaning up ${tokensToRemove.length} invalid tokens for user ${userId}.`);
                    const userRef = userDocSnap.ref;
                    try {
                        await userRef.update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
                        });
                        logger.log(`Successfully removed invalid tokens for user ${userId}.`);
                    } catch (updateError) {
                        logger.error(`Error removing invalid tokens for user ${userId}:`, updateError);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error sending push notification for user ${userId}:`, error);
        }
    }
);

// =================================================================================================
// --- [MODIFIKASI LINTAS OPD V2] onSuratCreate (Rencana 4.1) ---
// =================================================================================================
export const onSuratCreate = onDocumentCreated(
    { document: "surat/{suratId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) return;
        const surat = snap.data() as Surat;
        const suratId = event.params.suratId;
        // [MODIFIKASI] Ambil field baru
        const { opdId, tujuanJabatanId } = surat; 

        try {
            const targetUids = new Set<string>();
            // [MODIFIKASI LINTAS OPD V2] Tambahkan set baru
            const targetJabatanIds = new Set<string>();

            // --- SKENARIO BARU: TU PUSAT MELAKUKAN TRIAGE (Rencana 4.1) ---
            if (tujuanJabatanId) {
                // Surat ini sudah dirutekan secara spesifik oleh TU
                logger.log(`[Triase] Surat ${suratId} dirutekan spesifik ke Jabatan: ${tujuanJabatanId}`);
                // Gunakan helper getUserIdFromJabatanId yang sudah ada
                const uid = await getUserIdFromJabatanId(tujuanJabatanId); 
                if (uid) {
                    targetUids.add(uid);
                    targetJabatanIds.add(tujuanJabatanId); // [MODIFIKASI LINTAS OPD V2] Simpan jabatanId
                } else {
                    logger.warn(`[Triase] Gagal menemukan UID untuk jabatan ${tujuanJabatanId}`);
                }
            } 
            // --- SKENARIO LAMA (PRODUKSI): KIRIM KE SEMUA PIMPINAN/TU (Rencana 4.1) ---
            else {
                // (Logika Anda saat ini untuk mengirim ke pimpinan/TU)
                logger.log(`[Default] Surat ${suratId} dikirim ke semua Pimpinan/TU di OPD: ${opdId}`);

                const jabatansQuery = await db.collection("jabatan")
                    .where("opdId", "==", opdId)
                    .where("status", "==", "aktif")
                    .get();
                
                if (jabatansQuery.empty) {
                   logger.warn(`[Default] No active jabatan found for OPD ${opdId}. Cannot determine top level.`);
                   return; 
                }
                
                const jabatans = jabatansQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Jabatan));
                // Tentukan level terendah (pimpinan)
                const minLevel = Math.min(...jabatans.map(j => j.level));
                const topLevelJabatans = jabatans.filter(j => j.level === minLevel);
                
                const now = admin.firestore.Timestamp.now();
                // [MODIFIKASI LINTAS OPD V2] Ganti nama var
                const pimpinanTargetJabatanIds = new Set<string>(); // Jabatan pimpinan target

                for (const jabatan of topLevelJabatans) {
                   // Logika delegasi/plt yang sudah ada
                   if (jabatan.delegasiSementara && jabatan.delegasiSementara.berlakuHingga.toMillis() > now.toMillis()) {
                       pimpinanTargetJabatanIds.add(jabatan.delegasiSementara.delegatedToJabatanId);
                       logger.log(`[Default] Surat ${suratId} redirected to delegate ${jabatan.delegasiSementara.delegatedToJabatanId} from ${jabatan.id}`);
                   } else if (jabatan.pltUserId && jabatan.pltMulaiTanggal && jabatan.pltSelesaiTanggal &&
                              jabatan.pltMulaiTanggal.toMillis() <= now.toMillis() &&
                              jabatan.pltSelesaiTanggal.toMillis() >= now.toMillis()) {
                       pimpinanTargetJabatanIds.add(jabatan.id); 
                       logger.log(`[Default] Surat ${suratId} sent to jabatan ${jabatan.id} (handled by Plt ${jabatan.pltUserId})`);
                   } else {
                       pimpinanTargetJabatanIds.add(jabatan.id);
                       logger.log(`[Default] Surat ${suratId} sent to definitive jabatan ${jabatan.id}`);
                   }
                }

                // Cari UID untuk jabatan pimpinan DAN semua TU/Admin di OPD tersebut
                const usersQuery = await db.collection("users")
                    .where("opdId", "==", opdId)
                    .where("status", "==", "aktif")
                    .get();

                usersQuery.docs.forEach(doc => {
                    const user = doc.data() as UserProfile;
                    if (pimpinanTargetJabatanIds.has(user.jabatanId) || user.role === 'staf_tu' || user.role === 'admin_opd') {
                        targetUids.add(user.uid);
                        targetJabatanIds.add(user.jabatanId); // [MODIFIKASI LINTAS OPD V2] Simpan jabatanId
                    }
                });
            }

            // --- PROSES PENGIRIMAN (Umum untuk kedua skenario) ---
            if (targetUids.size === 0) {
                logger.warn(`Tidak ada target UID ditemukan untuk surat ${suratId}`);
                return;
            }
            
            const batch = db.batch();
            targetUids.forEach(uid => {
                const inboxRef = db.collection("suratPerPengguna").doc(uid).collection("inbox").doc(suratId);
                batch.set(inboxRef, surat);
                
                // Update summary untuk notifikasi badge (menggunakan helper yang ada)
                updateUserSummary(uid, "suratMenungguDisposisi", 1);
                updateUserSummary(uid, "suratBaruCount", 1);
            });

            await batch.commit();
            logger.log(`Surat ${suratId} berhasil dikirim ke ${targetUids.size} pengguna.`);
            
        } catch (error) {
            logger.error(`Error on onSuratCreate for surat ${suratId}:`, error);
        }
    }
);
// =================================================================================================
// --- [AKHIR MODIFIKASI LINTAS OPD V2] ---
// =================================================================================================


/**
 * [MODIFIKASI GCAL] Menambahkan sinkronisasi GCal saat disposisi dibuat.
 */
export const onDisposisiCreate = onDocumentCreated(
    { document: "disposisi/{disposisiId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) {
            logger.error("No data for disposisi event:", event);
            return;
        }

        const disposisi = snap.data() as Disposisi;
        const { suratId, kepadaJabatanId, dariJabatanId } = disposisi;
        const disposisiId = event.params.disposisiId;

        logger.log(`Processing new disposisi ${disposisiId} for surat ${suratId} from ${dariJabatanId} to ${kepadaJabatanId.join(", ")}.`);

        try {
            const suratRef = db.collection("surat").doc(suratId);
            const suratDoc = await suratRef.get();
            if (!suratDoc.exists) {
                logger.error(`Surat ${suratId} not found for disposisi ${disposisiId}. Aborting.`);
                return;
            }
            const suratData = { id: suratDoc.id, ...suratDoc.data() } as Surat;

            const senderName = await getUserNameFromJabatanId(dariJabatanId);

            const batch = db.batch();
            
            // [MODIFIKASI LINTAS OPD V2] Dapatkan OPD ID dari disposisi,
            // fallback ke OPD ID surat jika disposisi lintas OPD (level 1-2)
            const disposisiOpdId = (await db.collection('jabatan').doc(dariJabatanId).get()).data()?.opdId || suratData.opdId;
            
            const disposisiRef = snap.ref;
            const disposisiData: Partial<Disposisi> = {
                ...disposisi,
                // [MODIFIKASI LINTAS OPD V2] Gunakan OPD ID disposisi
                opdId: disposisiOpdId, 
                dariJabatanNama: senderName,
            };
            batch.set(disposisiRef, disposisiData, { merge: true });
            logger.log(`Denormalized opdId (${disposisiOpdId}) and dariJabatanNama (${senderName}) to disposisi ${disposisiId}.`);


            const senderUid = await getUserIdFromJabatanId(dariJabatanId);
            if (senderUid) {
                const senderInboxRef = db.collection("suratPerPengguna").doc(senderUid).collection("inbox").doc(suratId);
                const senderDelegatedRef = db.collection("suratPerPengguna").doc(senderUid).collection("delegated").doc(suratId);
                batch.delete(senderInboxRef);
                batch.set(senderDelegatedRef, suratData);
                logger.log(`Moved surat ${suratId} from inbox to delegated for sender user ${senderUid}.`);

                // [MODIFIKASI REKOMENDASI 2]
                // Kurangi counter 'suratMenungguDisposisi' & 'suratBaruCount' dari pengirim
                await updateUserSummary(senderUid, "suratMenungguDisposisi", -1);
                // Kita juga kurangi notif surat baru, karena sudah ditindaklanjuti
                await updateUserSummary(senderUid, "suratBaruCount", -1);
                // [AKHIR MODIFIKASI]
            } else {
                logger.warn(`Sender UID not found for jabatanId ${dariJabatanId}. Cannot move surat from inbox.`);
            }

            const recipientUids: string[] = [];
            const recipientNips: string[] = [];
            
            for (const jabatanId of kepadaJabatanId) {
                const recipientUid = await getUserIdFromJabatanId(jabatanId);
                if (recipientUid) {
                    const recipientInboxRef = db.collection("suratPerPengguna").doc(recipientUid).collection("inbox").doc(suratId);
                    batch.set(recipientInboxRef, suratData);
                    recipientUids.push(recipientUid);
                    
                    const userSnap = await db.collection("users").where("uid", "==", recipientUid).limit(1).get();
                    if(!userSnap.empty) recipientNips.push(userSnap.docs[0].id);
                    
                    logger.log(`Added surat ${suratId} to inbox for recipient user ${recipientUid}.`);

                    // [MODIFIKASI REKOMENDASI 2]
                    // Tambah counter 'disposisiBaru' & 'suratBaruCount' untuk penerima
                    // (Fungsi onDisposisiSummaryUpdate akan menangani decrement saat diterima)
                    await updateUserSummary(recipientUid, "disposisiBaru", 1);
                    await updateUserSummary(recipientUid, "suratBaruCount", 1);
                    // [AKHIR MODIFIKASI]
                } else {
                    logger.warn(`Recipient UID not found for jabatanId ${jabatanId}. Cannot add to inbox.`);
                }
            }

            let nextStatus = "Didisposisikan";
            if (nextStatus !== suratData.statusPenyelesaian) {
                batch.update(suratRef, { statusPenyelesaian: nextStatus });
                logger.log(`Updated status for surat ${suratId} to ${nextStatus}.`);
            } else {
                logger.log(`Status for surat ${suratId} is already ${suratData.statusPenyelesaian}. No status update needed.`);
            }

            await batch.commit();
            logger.log(`Firestore batch commit successful for disposisi ${disposisiId}.`);

            for (let i = 0; i < recipientUids.length; i++) {
                const recipientUid = recipientUids[i];
                const recipientNip = recipientNips[i];
                
                if (!recipientNip) {
                    logger.warn(`Skipping notification/GCal for UID ${recipientUid} because NIP was not found.`);
                    continue;
                }

                const recipientUserDoc = await db.collection("users").doc(recipientNip).get();
                
                 if (recipientUserDoc.exists) {
                     const recipientProfile = recipientUserDoc.data() as UserProfile;
                     const notifRef = db.collection("notifications").doc();
                     await notifRef.set({
                          userId: recipientUid,
                          userNip: recipientNip,
                          message: `${disposisi.isInformational ? "Pemberitahuan" : "Disposisi"} baru dari ${senderName}: "${suratData.perihal}"`,
                          link: `/dashboard/surat/${suratId}`,
                          isRead: false,
                          timestamp: admin.firestore.FieldValue.serverTimestamp(),
                     });

                     // --- [MODIFIKASI GCAL] Panggil helper GCal ---
                     if (!disposisi.isInformational && recipientProfile.googleCalendarSyncEnabled) {
                        // Format event
                        let eventDetails;
                        const timeZone = "Asia/Jakarta";
                        const appUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sigap.web.app"; // Fallback URL

                        if (suratData.jenisSurat === "Undangan" && suratData.detailAgenda) {
                            let hours = 9, minutes = 0;
                            try { [hours, minutes] = suratData.detailAgenda.jam.split(":").map(Number); }
                            catch (e) { logger.warn(`Could not parse time "${suratData.detailAgenda.jam}". Defaulting to 9:00.`); }

                            const startDate = suratData.detailAgenda.tanggal.toDate();
                            startDate.setHours(hours, minutes);
                            // [MODIFIKASI GCAL] Gunakan helper baru, bukan .toISOString()
                            const startTime = createRfc3339DateTimeWIB(startDate);
                            
                            // [MODIFIKASI] Gunakan jamSelesai jika ada
                            let endTime: string;
                            if (suratData.detailAgenda.jamSelesai) {
                                try {
                                    const [endHours, endMinutes] = suratData.detailAgenda.jamSelesai.split(":").map(Number);
                                    const endDate = suratData.detailAgenda.tanggal.toDate();
                                    endDate.setHours(endHours, endMinutes);
                                    endTime = createRfc3339DateTimeWIB(endDate);
                                } catch (e) {
                                    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 jam
                                    endTime = createRfc3339DateTimeWIB(endDate);
                                }
                            } else {
                                const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 jam
                                endTime = createRfc3339DateTimeWIB(endDate);
                            }

                            eventDetails = {
                                summary: `Undangan: ${suratData.perihal}`,
                                location: suratData.detailAgenda.lokasi || "",
                                description: `<b>Instruksi Disposisi:</b><i>"${disposisi.instruksi}"</i>\n\n<b>Detail Surat:</b>\nNomor: ${suratData.nomorSurat}\nDari: ${suratData.pengirim}\n\nLihat detail: ${appUrl}/dashboard/surat/${suratId}`,
                                start: { dateTime: startTime, timeZone },
                                end: { dateTime: endTime, timeZone },
                            };
                        } else if (disposisi.batasWaktu) {
                            const date = disposisi.batasWaktu.toDate();
                            // [MODIFIKASI GCAL] Cukup kirim YYYY-MM-DD untuk 'all-day event'
                            // Gunakan 'en-CA' untuk format YYYY-MM-DD yang aman
                            const startTime = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
                            
                            const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
                            // [MODIFIKASI GCAL] Gunakan 'en-CA'
                            const endTime = nextDay.toLocaleDateString('en-CA'); // YYYY-MM-DD

                            eventDetails = {
                                summary: `Batas Waktu Disposisi: ${suratData.perihal}`,
                                location: "",
                                description: `<b>Instruksi Disposisi:</b><i>"${disposisi.instruksi}"</i>\n\n<b>Detail Surat:</b>\nNomor: ${suratData.nomorSurat}\nDari: ${suratData.pengirim}\n\nLihat detail: ${appUrl}/dashboard/surat/${suratId}`,
                                start: { date: startTime, timeZone },
                                end: { date: endTime, timeZone },
                            };
                        } else {
                            logger.log(`No specific time found for surat ${suratId}, skipping calendar event creation.`);
                            continue; // Lanjut ke user berikutnya
                        }
                        
                        // Panggil helper global
                        try {
                            await createCalendarEvent(recipientProfile, recipientNip, eventDetails);
                        } catch (calendarError) {
                            logger.error(`Failed to create calendar event (from disposisi) for user ${recipientUid}:`, calendarError);
                        }
                     }
                     // --- [AKHIR MODIFIKASI GCAL] ---
                }
            }
            logger.log(`Notifications and calendar sync (if applicable) processed for disposisi ${disposisiId}.`);

        } catch (error) {
            logger.error(`Error processing disposisi ${disposisiId}:`, error);
        }
    }
);

// --- [MODIFIKASI GCAL] Fungsi BARU untuk sinkronisasi Jadwal Internal ---
export const onJadwalTempatCreate = onDocumentCreated(
    { document: "jadwalTempat/{jadwalId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) {
            logger.error("No data for onJadwalTempatCreate event:", event);
            return;
        }

        const jadwal = snap.data() as JadwalTempat;
        const { createdBy, kegiatan, tanggalMulai, jamMulai, jamSelesai, namaTempat, jenis, tautanRapat, penanggungJawab } = jadwal;

        if (!createdBy) {
            logger.warn(`Jadwal ${event.params.jadwalId} missing 'createdBy' field. Aborting.`);
            return;
        }

        try {
            // 1. Dapatkan profil pengguna (pembuat jadwal)
            const userSnap = await db.collection("users").where("uid", "==", createdBy).limit(1).get();
            if (userSnap.empty) {
                logger.warn(`Cannot find user profile for UID ${createdBy} (jadwal ${event.params.jadwalId}).`);
                return;
            }
            const userProfile = userSnap.docs[0].data() as UserProfile;
            const userNip = userSnap.docs[0].id; // NIP (ID Dokumen)

            // 2. Cek izin sinkronisasi
            if (!userProfile.googleCalendarSyncEnabled || !userProfile.googleRefreshToken) {
                logger.log(`User ${createdBy} (NIP: ${userNip}) has GCal sync disabled. Skipping.`);
                return;
            }

            // 3. Format event
            const timeZone = "Asia/Jakarta";
            let hoursStart = 9, minutesStart = 0;
            let hoursEnd = 10, minutesEnd = 0;

            try {
                [hoursStart, minutesStart] = jamMulai.split(":").map(Number);
                [hoursEnd, minutesEnd] = jamSelesai.split(":").map(Number);
            } catch (e) {
                logger.warn(`Could not parse time for jadwal ${event.params.jadwalId}. Using defaults.`);
            }

            const startDate = tanggalMulai.toDate();
            startDate.setHours(hoursStart, minutesStart, 0, 0); // Set detik ke 0
            // [MODIFIKASI GCAL] Gunakan helper baru, bukan .toISOString()
            const startTime = createRfc3339DateTimeWIB(startDate);

            const endDate = tanggalMulai.toDate(); // Gunakan tanggal yang sama
            endDate.setHours(hoursEnd, minutesEnd, 0, 0); // Set detik ke 0
            // [MODIFIKASI GCAL] Gunakan helper baru, bukan .toISOString()
            const endTime = createRfc3339DateTimeWIB(endDate);
            
            const location = jenis === 'Virtual' ? (tautanRapat || "Virtual Meeting") : namaTempat;
            const description = `Rapat Internal: ${kegiatan}\nPenanggung Jawab: ${penanggungJawab}\n${jenis === 'Virtual' && tautanRapat ? `Link: ${tautanRapat}` : ''}`;
            
            const eventDetails = {
                summary: kegiatan,
                location: location,
                description: description,
                start: { dateTime: startTime, timeZone },
                end: { dateTime: endTime, timeZone },
            };

            // 4. Panggil helper global
            await createCalendarEvent(userProfile, userNip, eventDetails);
            
            logger.log(`GCal sync processed for jadwal ${event.params.jadwalId}.`);

        } catch (error) {
            logger.error(`Error processing onJadwalTempatCreate ${event.params.jadwalId}:`, error);
        }
    }
);
// --- [AKHIR MODIFIKASI GCAL] ---


export const onUserCreate = onDocumentCreated(
    { document: "users/{userId}", region: REGION }, // userId disini adalah NIP
    async (event) => {
        const snap = event.data;
        if (!snap) {
        logger.error("No data associated with the event:", event);
        return;
        }
        const newUserProfile = snap.data() as UserProfile;
        const { uid, jabatanId, role, opdId, nip } = newUserProfile;
        if (!uid) {
        logger.error("UID not found in new user profile:", event.params.userId);
        return;
        }
        try {
            const jabatanDoc = await db.collection("jabatan").doc(jabatanId).get();
            const jabatanData = jabatanDoc.exists ? jabatanDoc.data() : null;
            const level = jabatanData ? jabatanData.level : 9;

            // --- [MODIFIKASI EFISIENSI (Fase 1)] ---
            // 1. Buat search keywords
            const namaJabatan = jabatanData ? (jabatanData as Jabatan).namaJabatan : "Tidak Ada";
            // [FIX] Panggil fungsi 'generateSearchKeywords' yang sudah dideklarasikan
            const keywords = generateSearchKeywords(
                newUserProfile.namaLengkap,
                newUserProfile.nip,
                namaJabatan
            );
            
            // 2. Set data denormalisasi ke dokumen user
            await snap.ref.set({
                namaJabatan: namaJabatan,
                level: level,
                searchKeywords: keywords // [FIX] Tambahkan keywords ke data set
            }, { merge: true });
            logger.log(`Denormalization fields set for new user ${uid}.`);
            // --- [AKHIR MODIFIKASI EFISIENSI] ---

            const customClaims = {
                role: role,
                opdId: opdId,
                jabatanId: jabatanId,
                level: level,
                nip: nip,
            };
            await admin.auth().setCustomUserClaims(uid, customClaims);
            logger.log(`Custom claims set for user ${uid}:`, customClaims);
        } catch (error) {
            logger.error(`Error setting custom claims for user ${uid} (NIP: ${event.params.userId}):`, error);
        }
    }
);
export const onUserUpdate = onDocumentUpdated(
    { document: "users/{userId}", region: REGION }, // userId disini adalah NIP
    async (event) => {
        const snap = event.data;
        if (!snap) {
            logger.error("No data associated with the event:", event);
            return;
        }
        const updatedUserProfile = snap.after.data() as UserProfile;
        const previousUserProfile = snap.before.data() as UserProfile;

        // Cek jika field kunci untuk custom claim berubah
        const claimsChanged = (
            updatedUserProfile.uid !== previousUserProfile.uid ||
            updatedUserProfile.jabatanId !== previousUserProfile.jabatanId ||
            updatedUserProfile.role !== previousUserProfile.role ||
            updatedUserProfile.opdId !== previousUserProfile.opdId ||
            updatedUserProfile.nip !== previousUserProfile.nip
        );
        
        // --- [MODIFIKASI EFISIENSI (Fase 1)] ---
        // Cek jika field kunci untuk denormalisasi berubah
        const denormalizationChanged = (
            updatedUserProfile.namaLengkap !== previousUserProfile.namaLengkap ||
            updatedUserProfile.nip !== previousUserProfile.nip ||
            updatedUserProfile.jabatanId !== previousUserProfile.jabatanId || // Jabatan berubah
            !updatedUserProfile.searchKeywords || // Jika keywords belum ada
            // [PERBAIKAN] Cek jika data keyword sudah usang (tidak sesuai logika baru)
            !isEqual(updatedUserProfile.searchKeywords, generateSearchKeywords(updatedUserProfile.namaLengkap, updatedUserProfile.nip, updatedUserProfile.namaJabatan || "Tidak Ada"))
        );
        // --- [AKHIR MODIFIKASI EFISIENSI] ---

        if (claimsChanged || denormalizationChanged) {
            const { uid, jabatanId, role, opdId, nip, namaLengkap } = updatedUserProfile;
            if (!uid) {
                logger.error("UID not found in updated user profile:", event.params.userId);
                return;
            }
            try {
                const jabatanDoc = await db.collection("jabatan").doc(jabatanId).get();
                const jabatanData = jabatanDoc.exists ? jabatanDoc.data() : null;
                const level = jabatanData ? (jabatanData as Jabatan).level : 9;
                const namaJabatan = jabatanData ? (jabatanData as Jabatan).namaJabatan : "Tidak Ada";

                // Update custom claims jika perlu
                if (claimsChanged) {
                    const customClaims = {
                        role: role,
                        opdId: opdId,
                        jabatanId: jabatanId,
                        level: level,
                        nip: nip,
                    };
                    await admin.auth().setCustomUserClaims(uid, customClaims);
                    logger.log(`Custom claims updated for user ${uid}:`, customClaims);
                }
                
                // --- [MODIFIKASI EFISIENSI (Fase 1)] ---
                // Update denormalisasi jika perlu
                if (denormalizationChanged) {
                    // [FIX] Panggil fungsi 'generateSearchKeywords'
                     const keywords = generateSearchKeywords(
                        namaLengkap,
                        nip,
                        namaJabatan
                    );
                    await snap.after.ref.update({
                        namaJabatan: namaJabatan,
                        level: level,
                        searchKeywords: keywords // [FIX] Tambahkan keywords ke data update
                    });
                    logger.log(`Denormalization fields updated for user ${uid}.`);
                }
                // --- [AKHIR MODIFIKASI EFISIENSI] ---

            } catch (error) {
                logger.error(`Error updating custom claims/denormalization for user ${uid} (NIP: ${event.params.userId}):`, error);
            }
        } else {
             logger.log(`No relevant fields changed for user ${updatedUserProfile.uid}. Skipping custom claims/denormalization update.`);
        }
    }
);

// --- [MODIFIKASI EFISIENSI (Fase 1)] Fungsi BARU untuk sinkronisasi Jabatan -> User ---
/**
 * Terpicu saat dokumen Jabatan berubah.
 * Menyinkronkan `namaJabatan` dan `level` ke semua dokumen User terkait.
 */
export const onJabatanWriteForDenormalization = onDocumentWritten(
    { document: "jabatan/{jabatanId}", region: REGION },
    async (event) => {
        const jabatanId = event.params.jabatanId;
        const beforeData = event.data?.before.data() as Jabatan | undefined;
        const afterData = event.data?.after.data() as Jabatan | undefined;

        if (!afterData) {
            logger.log(`Jabatan ${jabatanId} dihapus. Tidak ada sinkronisasi pengguna.`);
            return;
        }

        const needsUpdate = (
            !beforeData || // Dokumen baru
            beforeData.namaJabatan !== afterData.namaJabatan ||
            beforeData.level !== afterData.level
        );

        if (!needsUpdate) {
            logger.log(`Jabatan ${jabatanId} ditulis, tapi field denormalisasi tidak berubah. Skipping user sync.`);
            return;
        }

        logger.log(`Perubahan terdeteksi pada Jabatan ${jabatanId}. Sinkronisasi 'namaJabatan' dan 'level' ke pengguna...`);

        // 1. Cari semua user yang memiliki jabatanId ini
        const usersQuery = db.collection("users").where("jabatanId", "==", jabatanId);
        const usersSnapshot = await usersQuery.get();

        if (usersSnapshot.empty) {
            logger.log(`Tidak ada pengguna ditemukan dengan jabatanId ${jabatanId}.`);
            return;
        }

        // 2. Buat batch update
        const batch = db.batch();
        usersSnapshot.forEach(userDoc => {
            const userRef = userDoc.ref;
            const userData = userDoc.data() as UserProfile;
            
            // Buat ulang keywords dengan nama jabatan baru
            const newKeywords = generateSearchKeywords(
                userData.namaLengkap,
                userData.nip,
                afterData.namaJabatan // <-- Nama jabatan BARU
            );

            batch.update(userRef, {
                namaJabatan: afterData.namaJabatan, // <-- Data baru
                level: afterData.level,         // <-- Data baru
                searchKeywords: newKeywords     // <-- Keywords baru
            });
        });

        // 3. Commit batch
        await batch.commit();
        logger.log(`Berhasil sinkronisasi data jabatan ke ${usersSnapshot.size} pengguna.`);
    }
);
// --- [AKHIR MODIFIKASI EFISIENSI] ---


export const onSuratUpdate = onDocumentUpdated(
    { document: "surat/{suratId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) {
            logger.error("No data for surat update event:", event);
            return;
        }
        const beforeData = snap.before.data() as Surat;
        const afterData = snap.after.data() as Surat;
        const suratId = event.params.suratId;
        if (beforeData && afterData) {
            const beforeComparable = { ...beforeData, searchKeywords: undefined };
            const afterComparable = { ...afterData, searchKeywords: undefined };
            if (isEqual(beforeComparable, afterComparable)) {
                logger.log(`Surat ${suratId} write detected, but only searchKeywords changed. Skipping fan-out.`);
                return;
            }
        }
        if (beforeData.statusPenyelesaian !== "Diarsipkan" && afterData.statusPenyelesaian === "Diarsipkan") {
            logger.log(`Archiving logic triggered for surat ${suratId}.`);
            try {
                const disposisiQuery = await db.collection("disposisi").where("suratId", "==", suratId).get();
                const allInvolvedJabatanIds = new Set<string>();
                if (!disposisiQuery.empty) {
                    disposisiQuery.forEach(doc => {
                        const disposisi = doc.data() as Disposisi;
                        allInvolvedJabatanIds.add(disposisi.dariJabatanId);
                        disposisi.kepadaJabatanId.forEach((id: string) => allInvolvedJabatanIds.add(id));
                    });
                }
                if (afterData.createdBy) {
                    const creatorUserSnap = await db.collection("users").where("uid", "==", afterData.createdBy).limit(1).get();
                    if (!creatorUserSnap.empty) {
                        allInvolvedJabatanIds.add(creatorUserSnap.docs[0].data().jabatanId);
                    }
                }
                if (allInvolvedJabatanIds.size === 0) {
                    logger.warn(`No involved users found for archiving surat ${suratId}. Skipping subcollection update.`);
                    return;
                }
                const usersQuery = await db.collection("users").where("jabatanId", "in", Array.from(allInvolvedJabatanIds)).get();
                const userIds = usersQuery.docs.map((doc) => (doc.data() as UserProfile).uid);
                const batch = db.batch();
                userIds.forEach((userId) => {
                    if (userId) {
                        const arsipRef = db.collection("suratPerPengguna").doc(userId).collection("arsip").doc(suratId);
                        const inboxRef = db.collection("suratPerPengguna").doc(userId).collection("inbox").doc(suratId);
                        const delegatedRef = db.collection("suratPerPengguna").doc(userId).collection("delegated").doc(suratId);
                        batch.set(arsipRef, { ...afterData, statusPenyelesaian: "Diarsipkan" });
                        batch.delete(inboxRef);
                        batch.delete(delegatedRef);
                    }
                });
                await batch.commit();
                logger.log(`Surat ${suratId} moved to 'arsip' and removed from 'inbox'/'delegated' for ${userIds.length} users.`);
            } catch (error) {
                logger.error(`Error during archiving process for surat ${suratId}:`, error);
            }
        } else if (afterData.statusPenyelesaian !== "Diarsipkan") {
            try {
                const disposisiQuery = await db.collection("disposisi").where("suratId", "==", suratId).get();
                const allInvolvedJabatanIds = new Set<string>();
                 if (!disposisiQuery.empty) {
                     disposisiQuery.forEach(doc => {
                        const disposisi = doc.data() as Disposisi;
                        allInvolvedJabatanIds.add(disposisi.dariJabatanId);
                        disposisi.kepadaJabatanId.forEach((id: string) => allInvolvedJabatanIds.add(id));
                     });
                 }
                 if (afterData.createdBy) {
                     const creatorUserSnap = await db.collection("users").where("uid", "==", afterData.createdBy).limit(1).get();
                     if (!creatorUserSnap.empty) { allInvolvedJabatanIds.add(creatorUserSnap.docs[0].data().jabatanId); }
                 }
                 if (allInvolvedJabatanIds.size === 0) return;
                 const usersQuery = await db.collection("users").where("jabatanId", "in", Array.from(allInvolvedJabatanIds)).get();
                 const userIds = usersQuery.docs.map((doc) => (doc.data() as UserProfile).uid);
                 const batch = db.batch();
                 userIds.forEach((userId) => {
                    if (userId) {
                        const inboxRef = db.collection("suratPerPengguna").doc(userId).collection("inbox").doc(suratId);
                        const delegatedRef = db.collection("suratPerPengguna").doc(userId).collection("delegated").doc(suratId);
                        const arsipRef = db.collection("suratPerPengguna").doc(userId).collection("arsip").doc(suratId);
                        batch.set(inboxRef, afterData, { merge: true });
                        batch.set(delegatedRef, afterData, { merge: true });
                        batch.set(arsipRef, afterData, { merge: true });
                    }
                 });
                 await batch.commit();
                 logger.log(`Synced surat ${suratId} update across ${userIds.length} users' subcollections.`);
            } catch (error) {
                logger.error(`Error syncing surat update for ${suratId}:`, error);
            }
        }
    }
);
export const onSuratDelete = onDocumentDeleted(
    { document: "surat/{suratId}", region: REGION },
    async (event) => {
        const deletedSnapshot = event.data;
        if (!deletedSnapshot) {
            logger.error(`No data found for deleted surat event: ${event.params.suratId}`);
            return;
        }
        const surat = deletedSnapshot.data() as Surat;
        const suratId = event.params.suratId;
        logger.log(`Cleanup initiated for deleted surat ${suratId}.`);
        try {
            const batch = db.batch();
            if (surat.fileUrl) {
                try {
                    const filePath = decodeURIComponent(surat.fileUrl.split("/o/")[1].split("?")[0]);
                    const fileRef = storage.bucket().file(filePath);
                    await fileRef.delete();
                    logger.log(`File deleted from Storage: ${filePath} for surat ${suratId}.`);
                } catch (storageError: any) {
                    if (storageError.code === 404) {
                         logger.warn(`File not found in Storage for ${suratId}, skipping deletion: ${storageError.message}`);
                    } else {
                         logger.error(`Failed to delete file from Storage for ${suratId}:`, storageError);
                    }
                }
            }
            const collectionsToDelete = ["disposisi", "tugas", "activityLogs", "tindakLanjut", "komentarTugas"];
            for (const collectionName of collectionsToDelete) {
                const querySnapshot = await db.collection(collectionName).where("suratId", "==", suratId).get();
                querySnapshot.forEach(doc => batch.delete(doc.ref));
                if (querySnapshot.size > 0) {
                    logger.log(`Marked ${querySnapshot.size} docs from ${collectionName} related to ${suratId} for deletion.`);
                }
            }
            const usersSnapshot = await db.collection("users").get();
            usersSnapshot.forEach(userDoc => {
                const user = userDoc.data() as UserProfile;
                const inboxRef = db.collection("suratPerPengguna").doc(user.uid).collection("inbox").doc(suratId);
                const arsipRef = db.collection("suratPerPengguna").doc(user.uid).collection("arsip").doc(suratId);
                const delegatedRef = db.collection("suratPerPengguna").doc(user.uid).collection("delegated").doc(suratId);
                batch.delete(inboxRef);
                batch.delete(arsipRef);
                batch.delete(delegatedRef);
            });
            if (usersSnapshot.size > 0) {
                 logger.log(`Marked inbox/arsip/delegated entries for deletion across ${usersSnapshot.size} users for surat ${suratId}.`);
            }
            await batch.commit();
            logger.log(`Cleanup successfully completed for deleted surat ${suratId}.`);
        } catch (error) {
            logger.error(`Error during cleanup for deleted surat ${suratId}:`, error);
        }
    }
);
export const onPengumumanDelete = onDocumentDeleted(
    { document: "pengumuman/{pengumumanId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) return;
        const pengumuman = snap.data() as Pengumuman;
        if (pengumuman.attachmentFileName) {
            const filePath = `pengumuman/${pengumuman.attachmentFileName}`;
            const fileRef = storage.bucket().file(filePath);
            try {
                await fileRef.delete();
                logger.log(`Successfully deleted attachment ${filePath} from Storage for pengumuman ${event.params.pengumumanId}.`);
            } catch (error: any) {
                 if (error.code === 404) {
                    logger.warn(`Attachment file not found in Storage for pengumuman ${event.params.pengumumanId}, skipping deletion: ${error.message}`);
                 } else {
                    logger.error(`Failed to delete attachment ${filePath} from Storage:`, error);
                 }
            }
        } else {
             logger.log(`No attachment found for pengumuman ${event.params.pengumumanId}, skipping storage deletion.`);
        }
    }
);
export const onSuratWriteForSearch = onDocumentWritten(
    { document: "surat/{suratId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) {
            logger.log(`No data found for surat write event: ${event.params.suratId}`);
            return;
        }
        if (!snap.after.exists) {
            logger.log(`Surat ${event.params.suratId} deleted. Skipping keyword update.`);
            return;
        }
        const suratData = snap.after.data() as Surat;
        const { perihal, nomorSurat, pengirim } = suratData;
        const textToIndex = `${perihal || ''} ${nomorSurat || ''} ${pengirim || ''}`.toLowerCase();
        const newKeywords = [...new Set(textToIndex.split(/\s+/).filter(Boolean))];
        const existingKeywords = suratData.searchKeywords || [];
        if (isEqual(newKeywords.sort(), existingKeywords.sort())) {
            return;
        }
        try {
            await snap.after.ref.update({ searchKeywords: newKeywords });
            logger.log(`Search keywords updated successfully for surat ${event.params.suratId}.`);
        } catch (error) {
            logger.error(`Failed to update search keywords for surat ${event.params.suratId}:`, error);
        }
    }
);
// =================================================================================================
// --- FUNGSI TERJADWAL (SCHEDULED FUNCTIONS) ---
// =================================================================================================
export const sendAgendaReminders = onSchedule(
    { schedule: "every 15 minutes", region: REGION, timeZone: "Asia/Jakarta" },
    async (event) => {
        logger.log("Running scheduled function to send agenda reminders...");
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        const seventyFiveMinutesFromNow = new Date(now.getTime() + 75 * 60 * 60 * 1000);
        try {
            const agendaQuery = db.collection("surat")
                .where("jenisSurat", "==", "Undangan")
                .where("detailAgenda.tanggal", ">=", admin.firestore.Timestamp.fromDate(now))
                .where("reminderSent", "==", false);
            const snapshot = await agendaQuery.get();
            if (snapshot.empty) {
                logger.log("No upcoming agendas needing reminders at this moment.");
                return;
            }
            logger.log(`Found ${snapshot.size} potential agendas to check for reminders.`);
            for (const doc of snapshot.docs) {
                const surat = { id: doc.id, ...doc.data() } as Surat;
                if (!surat.detailAgenda || !surat.detailAgenda.tanggal || !surat.detailAgenda.jam) {
                    logger.warn(`Agenda details missing or invalid for surat ${surat.id}. Skipping reminder.`);
                    continue;
                }
                let agendaDateTime: Date;
                try {
                    const [hours, minutes] = surat.detailAgenda.jam.split(":").map(Number);
                    agendaDateTime = surat.detailAgenda.tanggal.toDate();
                    agendaDateTime.setHours(hours, minutes, 0, 0);
                } catch (e) {
                     logger.error(`Error parsing agenda time for surat ${surat.id}: ${surat.detailAgenda.jam}`, e);
                     continue;
                }
                if (agendaDateTime > oneHourFromNow && agendaDateTime <= seventyFiveMinutesFromNow) {
                     logger.log(`Agenda for surat ${surat.id} is within reminder window. Processing...`);
                     await db.runTransaction(async (transaction) => {
                        const suratRef = db.collection("surat").doc(surat.id);
                        const freshDoc = await transaction.get(suratRef);
                        if (!freshDoc.exists || freshDoc.data()?.reminderSent === true) {
                            logger.log(`Reminder for surat ${surat.id} was already sent or document deleted. Skipping.`);
                            return;
                        }
                        const disposisiQuery = db.collection("disposisi")
                            .where("suratId", "==", surat.id).orderBy("tanggalDisposisi", "desc").limit(1);
                        const disposisiSnapshot = await transaction.get(disposisiQuery);
                        if (!disposisiSnapshot.empty) {
                            const latestDisposisi = disposisiSnapshot.docs[0].data() as Disposisi;
                            const recipientJabatanIds = latestDisposisi.kepadaJabatanId;
                            const usersQuery = await db.collection("users").where("jabatanId", "in", recipientJabatanIds).get();
                            logger.log(`Found ${usersQuery.size} users to notify for reminder ${surat.id}.`);
                            usersQuery.forEach(userDoc => {
                                const user = userDoc.data() as UserProfile;
                                const notifRef = db.collection("notifications").doc();
                                transaction.set(notifRef, {
                                    userId: user.uid,
                                    userNip: user.nip,
                                    message: `PENGINGAT: Undangan "${surat.perihal}" akan dimulai sekitar 1 jam lagi pukul ${surat.detailAgenda?.jam}.`,
                                    link: `/dashboard/surat/${surat.id}`, isRead: false,
                                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                });
                            });
                        } else {
                             logger.log(`No disposisi found for surat ${surat.id}. Reminder not sent to recipients.`);
                        }
                        transaction.update(suratRef, { reminderSent: true });
                        logger.log(`Transaction to send reminder for ${surat.id} committed.`);
                    });
                }
            }
            logger.log("Finished checking agendas for reminders.");
        } catch (error) {
            logger.error("Error running sendAgendaReminders:", error);
        }
    }
);
export const archiveOldInvitations = onSchedule(
     { schedule: "0 1 * * *", region: REGION, timeZone: "Asia/Jakarta" },
    async (event) => {
        logger.log("Starting scheduled function to archive old invitations...");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
        try {
            const invitationsToArchiveQuery = db.collection("surat")
                .where("jenisSurat", "==", "Undangan")
                .where("statusPenyelesaian", "!=", "Diarsipkan")
                .where("detailAgenda.tanggal", "<", todayTimestamp);
            const snapshot = await invitationsToArchiveQuery.get();
            if (snapshot.empty) {
                logger.log("No past invitations found to archive.");
                return;
            }
            logger.log(`Found ${snapshot.size} old invitations to archive.`);
            const batch = db.batch();
            snapshot.forEach(doc => {
                logger.log(`Marking invitation ${doc.id} for archiving.`);
                batch.update(doc.ref, { statusPenyelesaian: "Diarsipkan" });
            });
            await batch.commit();
            logger.log(`Successfully archived ${snapshot.size} old invitations.`);
        } catch (error) {
            logger.error("Error archiving old invitations:", error);
        }
    }
);
export const generateDailyPerformanceStats = onSchedule(
    {
        schedule: "0 2 * * *", // Jam 02:00 WIB
        region: REGION,
        timeZone: "Asia/Jakarta",
        memory: "1GiB",
        timeoutSeconds: 540,
    },
    async (event) => {
        logger.log("Starting daily performance aggregation...");
        
        // 1. Tentukan Rentang Waktu (HARI KEMARIN 00:00 - 23:59)
        // Karena fungsi jalan jam 02:00 pagi, kita hitung data untuk kemarin.
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        
        const startOfDay = new Date(yesterday);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);

        const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
        const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);
        
        const yesterdayStr = startOfDay.toISOString().split("T")[0]; // Format YYYY-MM-DD

        try {
            const [opdSnapshot, jabatanSnapshot, userSnapshot] = await Promise.all([
                db.collection("opd").get(),
                db.collection("jabatan").where("status", "==", "aktif").get(),
                db.collection("users").where("status", "==", "aktif").get(),
            ]);
            const allOpds = opdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OPD));
            const allJabatans = jabatanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Jabatan));
            const allUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            const userMap = new Map(allUsers.map(u => [u.jabatanId, u.namaLengkap]));
            
            // [MODIFIKASI] Query data HANYA untuk hari kemarin
            // Menggunakan filter tanggal di level query untuk efisiensi
            const [suratSnapshot, disposisiSnapshot, tugasSnapshot] = await Promise.all([
                 db.collection("surat")
                    .where("tanggalDiterima", ">=", startTimestamp)
                    .where("tanggalDiterima", "<=", endTimestamp)
                    .get(),
                 db.collection("disposisi")
                    .where("tanggalDisposisi", ">=", startTimestamp)
                    .where("tanggalDisposisi", "<=", endTimestamp)
                    .get(),
                 db.collection("tugas")
                    .where("tanggalDibuat", ">=", startTimestamp)
                    .where("tanggalDibuat", "<=", endTimestamp)
                    .get(),
                 // Kita juga butuh 'Tugas Selesai' hari ini (berdasarkan tanggalSelesai)
                 db.collection("tugas")
                    .where("status", "==", "Selesai")
                    .where("tanggalSelesai", ">=", startTimestamp)
                    .where("tanggalSelesai", "<=", endTimestamp)
                    .get()
            ]);
            
            const dailySurat = suratSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Surat));
            const dailyDisposisi = disposisiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Disposisi));
            const dailyTugasDibuat = tugasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tugas));
            const dailyTugasSelesai = tugasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tugas));

            // Kita juga perlu mengambil ALL Disposisi (bukan cuma harian) untuk menghitung waktu respon surat harian
            // TAPI ini berat. Solusi efisien: Ambil disposisi yang terkait dengan surat harian saja.
            // Untuk simplifikasi di sini, kita asumsikan waktu respons dihitung jika disposisinya dibuat hari ini juga.
            // Atau query tambahan by suratId list jika perlu presisi tinggi.

            const batch = db.batch();
            
            for (const opd of allOpds) {
                logger.log(`Processing performance data for OPD: ${opd.namaOpd} (${opd.id})`);
                const jabatansInOpd = allJabatans.filter(j => j.opdId === opd.id);
                
                // Filter data harian per OPD
                const suratInOpd = dailySurat.filter(s => s.opdId === opd.id);
                const disposisiInOpd = dailyDisposisi.filter(d => d.opdId === opd.id);
                const tugasDibuatInOpd = dailyTugasDibuat.filter(t => t.opdId === opd.id);
                const tugasSelesaiInOpd = dailyTugasSelesai.filter(t => t.opdId === opd.id);

                // 1. Rata-rata Waktu Respons (Hanya untuk surat yang masuk hari ini dan sudah didisposisi hari ini)
                // Catatan: Ini pendekatan aproksimasi agar tidak query berat.
                let totalResponseTimeMillis = 0;
                let responseCount = 0;
                
                // Kita perlu cek disposisi untuk surat-surat ini.
                // Karena dailyDisposisi hanya memuat disposisi hari ini, ini cukup valid untuk "Quick Response".
                suratInOpd.forEach(s => {
                    const relatedDisposisi = dailyDisposisi
                        .filter(d => d.suratId === s.id)
                        .sort((a,b) => a.tanggalDisposisi.toMillis() - b.tanggalDisposisi.toMillis())[0];
                    
                    if (relatedDisposisi) {
                        const timeDiff = relatedDisposisi.tanggalDisposisi.toMillis() - s.tanggalDiterima.toMillis();
                        if (timeDiff > 0) {
                            totalResponseTimeMillis += timeDiff;
                            responseCount++;
                        }
                    }
                });
                const rataRataWaktuResponsJam = responseCount > 0 ? (totalResponseTimeMillis / responseCount / 3600000) : 0;

                // 2. Ketepatan Waktu (Dari tugas yang SELESAI hari ini)
                const tugasTepatWaktu = tugasSelesaiInOpd.filter(t => t.batasWaktu && t.tanggalSelesai && t.tanggalSelesai.toMillis() <= t.batasWaktu.toMillis()).length;
                const persentasePenyelesaianTepatWaktu = tugasSelesaiInOpd.length > 0 ? (tugasTepatWaktu / tugasSelesaiInOpd.length * 100) : 0;

                // 3. Tingkat Revisi (Dari disposisi hari ini)
                const revisiCount = disposisiInOpd.filter(d => d.status === "Dikembalikan").length;
                const tingkatRevisiDisposisi = disposisiInOpd.length > 0 ? (revisiCount / disposisiInOpd.length * 100) : 0;

                // 4. Beban Kerja & Kinerja Per Jabatan (Harian)
                // Perlu query tambahan untuk 'Tugas Aktif' (snapshot) karena itu bukan event harian tapi status
                // Untuk efisiensi, kita skip 'bebanKerjaPerJabatan' yang snapshot berat di fungsi harian ini, 
                // atau kita buat fungsi terpisah. 
                // NAMUN, agar dashboard tidak error, kita kirim array kosong atau data dummy snapshot jika sangat diperlukan.
                // Disini kita fokus ke KINERJA (Flow), bukan STOCK (Beban).
                
                const kinerjaPerJabatan = jabatansInOpd.map(j => {
                    const tugasJabatanSelesai = tugasSelesaiInOpd.filter(t => t.kepadaJabatanId === j.id);
                    const totalTugasSelesai = tugasJabatanSelesai.length;
                    const tugasSelesaiTepatWaktu = tugasJabatanSelesai.filter(t => t.batasWaktu && t.tanggalSelesai && t.tanggalSelesai.toMillis() <= t.batasWaktu.toMillis()).length;
                    
                    let totalWaktuPenyelesaianMillis = 0;
                    tugasJabatanSelesai.forEach(t => {
                        if (t.tanggalSelesai) {
                            totalWaktuPenyelesaianMillis += t.tanggalSelesai.toMillis() - t.tanggalDibuat.toMillis();
                        }
                    });
                    const rataRataWaktuPenyelesaianJam = totalTugasSelesai > 0 ? (totalWaktuPenyelesaianMillis / totalTugasSelesai / 3600000) : 0;

                    return {
                        jabatanId: j.id, 
                        namaJabatan: j.namaJabatan, 
                        namaPejabat: userMap.get(j.id) || "-",
                        totalTugasSelesai, 
                        tugasSelesaiTepatWaktu,
                        rataRataWaktuPenyelesaianTugas: rataRataWaktuPenyelesaianJam,
                        totalDisposisiDiterima: dailyDisposisi.filter(d => d.kepadaJabatanId.includes(j.id)).length,
                    };
                });

                const docId = `${yesterdayStr}_${opd.id}`;
                const reportRef = db.collection("kinerjaAgregat").doc(docId);

                batch.set(reportRef, {
                    tanggal: admin.firestore.Timestamp.fromDate(startOfDay), // Timestamp hari kemarin 00:00
                    opdId: opd.id,
                    totalSuratMasuk: suratInOpd.length,      // HANYA surat hari ini
                    totalDisposisi: disposisiInOpd.length,   // HANYA disposisi hari ini
                    totalTugas: tugasDibuatInOpd.length,     // HANYA tugas dibuat hari ini
                    rataRataWaktuResponsDisposisi: rataRataWaktuResponsJam,
                    persentasePenyelesaianTepatWaktu: persentasePenyelesaianTepatWaktu,
                    tingkatRevisiDisposisi: tingkatRevisiDisposisi,
                    // Beban kerja snapshot sebaiknya dihitung terpisah atau diambil dari `calculateActiveUsers` jika ingin ringan.
                    // Disini kita kirim array kosong agar tidak error di frontend, atau hitung jika resource server kuat.
                    // Kita gunakan [] untuk sementara agar fokus ke perbaikan angka 'Volume'.
                    bebanKerjaPerJabatan: [], 
                    kinerjaPerJabatan,
                });
            }

            await batch.commit();
            logger.log(`Successfully generated DAILY stats for ${allOpds.length} OPDs on ${yesterdayStr}.`);
        } catch (error) {
            logger.error("Error generating daily performance stats:", error);
        }
    }
);


// --- [MODIFIKASI BILLING (TAHAP 1 & FASE 4)] ---
// FUNGSI: Menghitung pengguna aktif per OPD setiap hari DAN MENEGAKKAN ATURAN.
// =================================================================================================
export const calculateActiveUsers = onSchedule(
    {
        // Berjalan setiap 24 jam (pukul 03:00)
        schedule: "0 3 * * *",
        region: REGION,
        timeZone: "Asia/Jakarta",
    },
    async (event) => {
        logger.log("Running scheduled function to calculate active users and check subscriptions...");
        try {
            // 1. Ambil semua dokumen opdConfigs
            const opdConfigsSnapshot = await db.collection("opdConfigs").get();
            if (opdConfigsSnapshot.empty) {
                logger.log("No opdConfigs found. Skipping user count.");
                return;
            }

            const opdIds = opdConfigsSnapshot.docs.map(doc => doc.id);
            const batch = db.batch();
            let totalProcessed = 0;
            const now = admin.firestore.Timestamp.now();

            // 2. Loop setiap OPD
            for (const opdId of opdIds) {
                // 3. Hitung jumlah pengguna berstatus 'aktif' untuk OPD tersebut
                const usersQuery = db.collection("users")
                    .where("opdId", "==", opdId)
                    .where("status", "==", "aktif");
                
                const usersSnapshot = await usersQuery.get();
                const activeUserCount = usersSnapshot.size;

                // 4. Update field 'penggunaAktifSaatIni' di opdConfigs
                const configRef = db.collection("opdConfigs").doc(opdId);
                
                // Ambil data config dari snapshot yang sudah diambil
                const configDoc = opdConfigsSnapshot.docs.find(d => d.id === opdId);
                if (!configDoc) {
                    logger.warn(`Config doc not found for opdId ${opdId} during active user count. Skipping.`);
                    continue;
                }
                
                const configData = configDoc.data() as OpdConfig;
                
                let updatePayload: { [key: string]: any } = {
                    penggunaAktifSaatIni: activeUserCount
                };

                // --- [LOGIKA FASE 4] Penegakan Aturan Langganan ---
                if (configData.langgananAktifHingga.toMillis() < now.toMillis()) {
                    // Langganan kedaluwarsa!
                    if (configData.paymentStatus !== "Kedaluwarsa") {
                        updatePayload = {
                            ...updatePayload,
                            paymentStatus: "Kedaluwarsa",
                            kuotaPengguna: 0, // Set kuota ke 0
                        };
                        logger.log(`Subscription for OPD ${opdId} has EXPIRED. Setting kuota to 0 and status to 'Kedaluwarsa'.`);
                    } else {
                        // Jika sudah kedaluwarsa, pastikan kuota tetap 0
                         updatePayload = {
                            ...updatePayload,
                            kuotaPengguna: 0,
                        };
                         logger.log(`Subscription for OPD ${opdId} remains EXPIRED. Ensuring kuota is 0.`);
                    }
                }
                // --- [AKHIR LOGIKA FASE 4] ---

                batch.update(configRef, updatePayload);
                
                logger.log(`OPD ${opdId} has ${activeUserCount} active users. Status: ${updatePayload.paymentStatus || configData.paymentStatus || 'N/A'}`);
                totalProcessed++;
            }

            // 5. Commit batch update
            await batch.commit();
            logger.log(`Successfully updated active user count and subscription status for ${totalProcessed} OPDs.`);

        } catch (error) {
            logger.error("Error calculating active users:", error);
        }
    }
);
// --- [AKHIR MODIFIKASI BILLING] ---


// --- [MODIFIKASI BILLING (FASE 2)] ---
// FUNGSI BARU: Membuat tagihan bulanan otomatis.
// =================================================================================================
export const generateMonthlyInvoices = onSchedule(
    {
        // Berjalan jam 00:00 Waktu Server (UTC) pada tanggal 1 setiap bulan.
        // Sesuaikan jika server Anda tidak di UTC atau jika Anda ingin waktu Asia/Jakarta.
        // "0 0 1 * *" = Jam 00:00 UTC, Tanggal 1.
        // "0 17 1 * *" = Jam 17:00 UTC (00:00 WIB), Tanggal 1. -> Kita pakai ini.
        schedule: "0 17 1 * *",
        region: REGION,
        timeZone: "UTC", // Atur ke UTC agar jadwalnya pasti
    },
    async (event) => {
        // Fungsi ini akan berjalan sekitar jam 00:00 WIB tanggal 1.
        // Kita akan membuat tagihan untuk bulan SEBELUMNYA.
        const now = new Date();
        // Set ke hari terakhir bulan lalu
        const reportDate = new Date(now.getFullYear(), now.getMonth(), 0); 
        const billingMonth = reportDate.getMonth() + 1; // 1-12
        const billingYear = reportDate.getFullYear();

        logger.log(`Running monthly invoice generation for period: ${billingMonth}-${billingYear}...`);
        
        try {
            // 1. Ambil semua Konfigurasi OPD dan Paket Harga
            const [opdConfigsSnapshot, pricingSnapshot] = await Promise.all([
                db.collection("opdConfigs").get(),
                db.collection("pricingPackages").get(),
            ]);

            if (opdConfigsSnapshot.empty) {
                logger.log("No OpdConfig found. Skipping invoice generation.");
                return;
            }
            
            // 2. Buat Peta Harga
            const pricingMap = new Map<string, PricingPackage>();
            pricingSnapshot.forEach(doc => {
                pricingMap.set(doc.id, doc.data() as PricingPackage);
            });

            const batch = db.batch();
            let invoicesCreated = 0;
            const allOpds = await db.collection("opd").get();
            const opdNameMap = new Map<string, string>();
            allOpds.forEach(doc => {
                opdNameMap.set(doc.id, (doc.data() as OPD).namaOpd || doc.id);
            });

            // 3. Loop setiap OPD Config
            for (const configDoc of opdConfigsSnapshot.docs) {
                const opdId = configDoc.id;
                const configData = configDoc.data() as OpdConfig;

                // Jangan tagih jika tidak ada pengguna aktif
                if (configData.penggunaAktifSaatIni <= 0) {
                    logger.log(`OPD ${opdId} has 0 active users. Skipping invoice.`);
                    continue;
                }

                // Jangan tagih jika paket 'Custom' (mungkin gratis atau negosiasi manual)
                if (configData.packageName === 'Custom') {
                     logger.log(`OPD ${opdId} is on a 'Custom' plan. Skipping automatic invoice.`);
                     continue;
                }

                const packageName = configData.packageName || "Dasar";
                const pricingPackage = pricingMap.get(packageName);

                if (!pricingPackage) {
                    logger.warn(`Pricing package "${packageName}" for OPD ${opdId} not found. Skipping.`);
                    continue;
                }

                // 4. Kalkulasi Tagihan
                const hargaPerPengguna = pricingPackage.hargaPerPenggunaPerBulan || 0;
                // Kita gunakan penggunaAktifSaatIni yang dihitung oleh fungsi 'calculateActiveUsers'
                const jumlahPengguna = configData.penggunaAktifSaatIni; 
                const totalTagihan = jumlahPengguna * hargaPerPengguna;

                if (totalTagihan <= 0) {
                     logger.log(`OPD ${opdId} has 0 total bill. Skipping invoice.`);
                     continue;
                }

                const namaOpd = opdNameMap.get(opdId) || opdId;

                // 5. Buat dokumen tagihan baru
                const invoiceRef = db.collection("tagihan").doc(); // ID otomatis
                const newTagihan: Tagihan = {
                    opdId: opdId,
                    namaOpd: namaOpd,
                    bulanTagihan: billingMonth,
                    tahunTagihan: billingYear,
                    packageName: packageName,
                    jumlahPenggunaAktif: jumlahPengguna,
                    hargaPerPengguna: hargaPerPengguna,
                    totalTagihan: totalTagihan,
                    status: "Belum Dibayar",
                    tanggalDibuat: admin.firestore.Timestamp.now(),
                    tanggalDibayar: null,
                };
                
                batch.set(invoiceRef, newTagihan);
                invoicesCreated++;
                logger.log(`Invoice created for OPD ${opdId}: ${jumlahPengguna} users * Rp${hargaPerPengguna} = Rp${totalTagihan}`);
            }

            // 6. Commit batch
            await batch.commit();
            logger.log(`Successfully created ${invoicesCreated} new invoices for ${billingMonth}-${billingYear}.`);

        } catch (error) {
            logger.error("Error generating monthly invoices:", error);
        }
    }
);
// --- [AKHIR MODIFIKASI BILLING] ---


// --- [PENAMBAHAN FITUR] FUNGSI ANALITIKA KINERJA PENGGUNA (SUPER ADMIN) ---
// =================================================================================================
/**
 * Fungsi terjadwal untuk mengagregasi data kinerja per pengguna harian.
 * Sesuai dengan `analitika_superadmin_plan.md` Poin 5.
 * Berjalan setiap hari pukul 4 pagi.
 */
export const aggregateKinerjaPenggunaHarian = onSchedule(
    {
        schedule: "0 4 * * *", // Jam 4 pagi
        region: REGION,
        timeZone: "Asia/Jakarta",
        memory: "1GiB", // Alokasikan memori lebih
        timeoutSeconds: 540,
    },
    async (event) => {
        logger.log("Starting daily user performance aggregation (Super Admin)...");

        // Tentukan rentang waktu: HARI KEMARIN (00:00:00 - 23:59:59)
        const now = new Date();
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endOfYesterday.setMilliseconds(-1); // 23:59:59.999 kemarin

        const startOfYesterday = new Date(endOfYesterday.getFullYear(), endOfYesterday.getMonth(), endOfYesterday.getDate());
        startOfYesterday.setHours(0, 0, 0, 0); // 00:00:00 kemarin

        const startTimestamp = admin.firestore.Timestamp.fromDate(startOfYesterday);
        const endTimestamp = admin.firestore.Timestamp.fromDate(endOfYesterday);
        const yesterdayStr = startOfYesterday.toISOString().split("T")[0];

        logger.log(`Aggregating data for period: ${yesterdayStr}`);

        try {
            // 1. Ambil semua data (minimalkan query N+1)
            const [
                usersSnap,
                tugasAktifSnap,
                tugasSelesaiSnap,
                disposisiDiterimaSnap,
                disposisiDikembalikanSnap,
            ] = await Promise.all([
                db.collection("users").where("status", "==", "aktif").get(),
                db.collection("tugas").where("status", "!=", "Selesai").get(),
                db.collection("tugas")
                    .where("tanggalSelesai", ">=", startTimestamp)
                    .where("tanggalSelesai", "<=", endTimestamp).get(),
                db.collection("disposisi")
                    .where("tanggalDisposisi", ">=", startTimestamp)
                    .where("tanggalDisposisi", "<=", endTimestamp).get(),
                db.collection("disposisi")
                    .where("status", "==", "Dikembalikan")
                    .where("dikembalikanPada", ">=", startTimestamp)
                    .where("dikembalikanPada", "<=", endTimestamp).get(),
            ]);

            logger.log(`Fetched: ${usersSnap.size} users, ${tugasAktifSnap.size} active tasks, ${tugasSelesaiSnap.size} finished tasks, ${disposisiDiterimaSnap.size} disposisi, ${disposisiDikembalikanSnap.size} returned disposisi.`);

            // 2. Inisialisasi Peta Metrik
            const userMetrics = new Map<string, any>();
            usersSnap.forEach(doc => {
                const user = { nip: doc.id, ...doc.data() } as UserProfile;
                if (user.jabatanId) {
                    userMetrics.set(user.jabatanId, {
                        // Data dari user doc
                        userId: user.uid,
                        nip: user.nip,
                        jabatanId: user.jabatanId,
                        opdId: user.opdId,
                        // Data agregat (diinisialisasi 0)
                        tugasAktif: 0,
                        tugasSelesaiTepatWaktu: 0,
                        tugasSelesaiTerlambat: 0,
                        disposisiDiterima: 0,
                        disposisiDikembalikan: 0,
                    });
                }
            });

            // 3. Loop 1: Agregasi Tugas Aktif (Snapshot)
            tugasAktifSnap.forEach(doc => {
                const tugas = doc.data() as Tugas;
                const metric = userMetrics.get(tugas.kepadaJabatanId);
                if (metric) {
                    metric.tugasAktif++;
                }
            });

            // 4. Loop 2: Agregasi Tugas Selesai (Event Kemarin)
            tugasSelesaiSnap.forEach(doc => {
                const tugas = doc.data() as Tugas;
                const metric = userMetrics.get(tugas.kepadaJabatanId);
                if (metric) {
                    if (tugas.batasWaktu && tugas.tanggalSelesai && tugas.tanggalSelesai.toMillis() > tugas.batasWaktu.toMillis()) {
                        metric.tugasSelesaiTerlambat++;
                    } else {
                        metric.tugasSelesaiTepatWaktu++;
                    }
                }
            });

            // 5. Loop 3: Agregasi Disposisi Diterima (Event Kemarin)
            disposisiDiterimaSnap.forEach(doc => {
                const disposisi = doc.data() as Disposisi;
                for (const jabatanId of disposisi.kepadaJabatanId) {
                    const metric = userMetrics.get(jabatanId);
                    if (metric) {
                        metric.disposisiDiterima++;
                    }
                }
            });

            // 6. Loop 4: Agregasi Disposisi Dikembalikan (Event Kemarin)
            // (Diasumsikan `disposisiDikembalikan` adalah disposisi yang *dia* kembalikan)
            disposisiDikembalikanSnap.forEach(doc => {
                const disposisi = doc.data() as Disposisi;
                const metric = userMetrics.get(disposisi.dariJabatanId); // dariJabatanId = yang mengembalikan
                if (metric) {
                    metric.disposisiDikembalikan++;
                }
            });

            // 7. Simpan ke Batch
            const batch = db.batch();
            let processedCount = 0;
            for (const data of userMetrics.values()) {
                // Hanya simpan jika ada data (menghemat kuota tulis)
                const hasData = data.tugasAktif > 0 ||
                                data.tugasSelesaiTepatWaktu > 0 ||
                                data.tugasSelesaiTerlambat > 0 ||
                                data.disposisiDiterima > 0 ||
                                data.disposisiDikembalikan > 0;
                
                if (hasData) {
                    const docId = `${data.nip}_${yesterdayStr}`;
                    const docRef = db.collection("kinerjaPerPenggunaHarian").doc(docId);
                    
                    const payload: KinerjaPerPenggunaHarian = { // [MODIFIKASI] Tipe
                        tanggal: admin.firestore.Timestamp.fromDate(startOfYesterday),
                        userId: data.uid,
                        nip: data.nip,
                        jabatanId: data.jabatanId,
                        opdId: data.opdId,
                        tugasAktif: data.tugasAktif,
                        tugasSelesaiTepatWaktu: data.tugasSelesaiTepatWaktu,
                        tugasSelesaiTerlambat: data.tugasSelesaiTerlambat,
                        disposisiDiterima: data.disposisiDiterima,
                        disposisiDikembalikan: data.disposisiDikembalikan,
                    };
                    batch.set(docRef, payload);
                    processedCount++;
                }
            }

            await batch.commit();
            logger.log(`Successfully aggregated and saved daily performance for ${processedCount} users.`);

        } catch (error) {
            logger.error("Error running aggregateKinerjaPenggunaHarian:", error);
        }
    }
);
// --- [AKHIR PENAMBAHAN FITUR] ---


// [MODIFIKASI REKOMENDASI 2] Tambahkan fungsi baru di akhir file
export const resetUserSummaryCount = functions.region(REGION).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Request had no authentication.");
    }
    const uid = context.auth.uid;
    const { fieldToReset } = data; // e.g., "suratBaruCount" or "tugasBaruCount"

    if (!fieldToReset || (fieldToReset !== "suratBaruCount" && fieldToReset !== "tugasBaruCount")) {
        throw new functions.https.HttpsError("invalid-argument", "Field yang akan di-reset tidak valid.");
    }

    try {
        const summaryRef = db.collection("userSummaries").doc(uid);
        
        // Cek apakah dokumen ada sebelum mencoba meng-update
        const docSnap = await summaryRef.get();
        
        if (docSnap.exists) {
            await summaryRef.update({
                [fieldToReset]: 0 // Reset hitungan ke 0
            });
        } else {
            // Jika dokumen belum ada, buat dengan nilai 0
            await summaryRef.set({
                [fieldToReset]: 0
            }, { merge: true });
        }
        
        logger.log(`User ${uid} successfully reset count for ${fieldToReset}.`);
        return { success: true, message: "Hitungan berhasil di-reset." };
    } catch (error: any) {
        logger.error(`Error resetting count for user ${uid} (Field: ${fieldToReset}):`, error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});


// =================================================================================================
// --- [BARU] FUNGSI HELPER UNTUK NOTIFIKASI TERJADWAL ---
// =================================================================================================

/**
 * Helper baru untuk mengirim notifikasi berdasarkan UID.
 * Mengambil NIP, fcmTokens, dan totalNotifCount sebelum mengirim.
 */
const sendFcmMessageByUid = async (uid: string, title: string, body: string, link: string, tag: string) => {
  try {
    // 1. Cari NIP dan tokens berdasarkan UID
    const userQuery = await db.collection("users").where("uid", "==", uid).limit(1).get();
    if (userQuery.empty) {
      logger.warn(`[ScheduledFn] User profile not found for UID: ${uid}. Skipping message.`);
      return;
    }
    const userDoc = userQuery.docs[0];
    const userProfile = userDoc.data() as UserProfile;
    // const userNip = userDoc.id; // NIP adalah ID dokumen
    const tokens = userProfile.fcmTokens;

    if (!tokens || tokens.length === 0) {
      logger.log(`[ScheduledFn] User ${uid} has no FCM tokens. Skipping.`);
      return;
    }

    // 2. Ambil total notification count (sama seperti di onNotificationCreated)
    let totalCount = 0;
    const summarySnap = await db.collection("userSummaries").doc(uid).get();
    if (summarySnap.exists) {
      const summaryData = summarySnap.data() as { suratBaruCount?: number, tugasBaruCount?: number };
      totalCount = (summaryData.suratBaruCount || 0) + (summaryData.tugasBaruCount || 0);
    }

    // 3. Buat payload
    const messagePayload: admin.messaging.MulticastMessage = {
      data: {
        title: title,
        body: body,
        icon: "/icon-192x192.png",
        link: link,
        tag: tag,
        totalCount: String(totalCount),
      },
      tokens: tokens,
    };

    // 4. Kirim pesan
    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    logger.log(`[ScheduledFn] Sent '${tag}' to ${uid}: ${response.successCount} success, ${response.failureCount} failure.`);

    // 5. Cleanup token (sama seperti di onNotificationCreated)
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error && (error.code === "messaging/invalid-registration-token" || error.code === "messaging/registration-token-not-registered")) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });
      if (tokensToRemove.length > 0) {
        await userDoc.ref.update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
        });
        logger.log(`[ScheduledFn] Cleaned up ${tokensToRemove.length} invalid tokens for ${uid}.`);
      }
    }
  } catch (error) {
    logger.error(`[ScheduledFn] Error sending message to UID ${uid}:`, error);
  }
};


// =================================================================================================
// --- [BARU] FUNGSI TERJADWAL (SCHEDULED FUNCTIONS) ---
// =================================================================================================

/**
 * [BARU] PENGINGAT BERKALA (Implementasi Rencana Notifikasi 3.C)
 * Berjalan setiap 2 jam untuk mengingatkan pengguna tentang item yang belum dibaca.
 */
export const periodicPendingCheck = onSchedule(
    {
        schedule: "every 2 hours from 8:00 to 16:00", // [WIB] 8:00, 10:00, 12:00, 14:00, 16:00
        region: REGION,
        timeZone: "Asia/Jakarta",
    },
    async (event) => {
        logger.log("Running periodic check for pending items (Disposisi & Tugas)...");

        try {
            // 1. Cek Disposisi Baru (disposisiBaru > 0)
            const disposisiQuery = await db.collection("userSummaries")
                .where("disposisiBaru", ">", 0)
                .get();

            if (!disposisiQuery.empty) {
                logger.log(`Found ${disposisiQuery.size} users with new disposisi.`);
                for (const doc of disposisiQuery.docs) {
                    const uid = doc.id;
                    const count = doc.data().disposisiBaru;
                    await sendFcmMessageByUid(
                        uid,
                        "⏰ Disposisi Menunggu",
                        `Anda memiliki ${count} disposisi baru yang belum diterima. Segera periksa di Ruang Kerja Anda.`,
                        "/dashboard/ruang-kerja",
                        "pending-disposisi"
                    );
                }
            }

            // 2. Cek Tugas Baru (tugasBaruCount > 0)
            const tugasQuery = await db.collection("userSummaries")
                .where("tugasBaruCount", ">", 0)
                .get();
            
            if (!tugasQuery.empty) {
                 logger.log(`Found ${tugasQuery.size} users with new tasks.`);
                for (const doc of tugasQuery.docs) {
                    const uid = doc.id;
                    const count = doc.data().tugasBaruCount;
                    await sendFcmMessageByUid(
                        uid,
                        "📋 Tugas Baru Menunggu",
                        `Anda memiliki ${count} tugas baru yang belum dikerjakan. Segera periksa di menu Tugas Saya.`,
                        "/dashboard/tugas",
                        "pending-tugas"
                    );
                }
            }

            logger.log("Periodic pending check finished.");

        } catch (error) {
            logger.error("Error running periodicPendingCheck:", error);
        }
    }
);

// --- EXPORT FUNGSI AGREGASI (FASE 6) ---
export * from "./agregasiSummaries";
export * from "./taskWorkers";
export * from "./masterDataAggregator";
export * from "./aiFunctions" 
export { scheduledFirestoreExport } from "./backupFunction";