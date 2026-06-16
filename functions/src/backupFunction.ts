// Lokasi: functions/src/backupFunction.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { v1 } from "@google-cloud/firestore";

// Inisialisasi klien admin Firestore untuk mengakses fungsi manajemen/ekspor
const firestoreAdminClient = new v1.FirestoreAdminClient();

/**
 * FUNGSI: scheduledFirestoreExport
 * Deskripsi: Mengekspor seluruh isi database Firestore (Backup) ke Google Cloud Storage.
 * Jadwal: Setiap hari pada pukul 02:00 WIB.
 */
export const scheduledFirestoreExport = onSchedule({
    schedule: "0 2 * * *", // Format Cron: Menit(0) Jam(2) Hari(*) Bulan(*) HariDalamMinggu(*)
    timeZone: "Asia/Jakarta", // Menggunakan Waktu Indonesia Barat (WIB)
    memory: "256MiB",
    timeoutSeconds: 300, // Memberikan waktu maksimal 5 menit untuk fungsi mengeksekusi perintah
}, async (event) => {
    // 1. Ambil Project ID secara otomatis dari environment Firebase
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    if (!projectId) {
        logger.error("Project ID tidak ditemukan di environment.");
        return;
    }

    // 2. Tentukan target database ke database-siyap
    const databaseName = firestoreAdminClient.databasePath(projectId, "database-siyap"); // <-- Perbaikan di sini
    
    // 3. Tentukan nama bucket tempat backup akan disimpan (Sesuai Blueprint)
    // Pastikan bucket ini dibuat di Cloud Storage saat akun sudah dipulihkan
    const bucketName = "gs://disposisi-opd-backups";

    // 4. Buat penamaan folder unik berdasarkan tanggal (Format: YYYY-MM-DD)
    const date = new Date();
    // Menggunakan offset Jakarta (+7 jam) untuk penamaan folder yang akurat
    const jakartaTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    const timestamp = jakartaTime.toISOString().split('T')[0]; 
    
    // Target akhir: gs://disposisi-opd-backups/2026-05-23/
    const outputUriPrefix = `${bucketName}/${timestamp}`;

    try {
        logger.info(`Mempersiapkan ekspor database ${databaseName} ke ${outputUriPrefix}...`);
        
        // 5. Eksekusi perintah ekspor
        // Catatan: Ini adalah operasi Long-Running (LRO). Promise ini mengembalikan objek operasi
        // yang berjalan di latar belakang infrastruktur Google, sehingga aman untuk database besar.
        const [operation] = await firestoreAdminClient.exportDocuments({
            name: databaseName,
            outputUriPrefix: outputUriPrefix,
            // collectionIds: [] // Biarkan kosong (atau hapus properti ini) untuk mengekspor SEMUA collection
        });

        logger.info(`Perintah ekspor berhasil dikirim. ID Operasi: ${operation.name}`);
        
    } catch (error) {
        logger.error("Terjadi kesalahan fatal saat mengekspor Firestore:", error);
        throw new Error("Gagal memulai proses backup Firestore.");
    }
});