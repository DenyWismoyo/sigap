// Lokasi: functions/src/taskWorkers.ts
// [UPDATE FASE 6]: Pekerja Cloud Tasks untuk mengeksekusi pengingat Event-Driven.
// Menggunakan sintaksis API Firebase Functions v1.

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// (Opsional) Pastikan Anda memodifikasi import ini sesuai lokasi fungsi FCM Anda
// import { sendFcmMessageByUid } from "./utils/fcm"; 

// Mencegah error "app already initialized" saat di-deploy bersama fungsi lain
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// PENTING: Nama variabel 'sendReminderTask' otomatis akan menjadi nama Queue di Cloud Tasks
export const sendReminderTask = functions.region('asia-southeast2').tasks.taskQueue().onDispatch(async (data: any) => {
    const { uid, type, docId } = data;
    
    // Lakukan 1 READ untuk mengecek status terbaru
    const summaryRef = db.collection('userSummaries').doc(uid);
    const summaryDoc = await summaryRef.get();

    if (!summaryDoc.exists) return; // Kalu user/summary dihapus, batalkan
    const summaryData = summaryDoc.data()!;

    if (type === 'disposisi') {
        const pending = summaryData.pendingDisposisi || {};
        // Cek apakah disposisi ini MASIH ADA di pending dan BELUM DITERIMA
        if (pending[docId] && pending[docId].needsAcknowledge) {
            console.log(`Mengirim FCM Pengingat Disposisi untuk user: ${uid}`);
            
            // Hapus komentar pada baris di bawah ini jika fungsi FCM Anda sudah di-import
            /*
            await sendFcmMessageByUid(
                uid, 
                "⏰ Pengingat: Disposisi Menunggu", 
                "Ada disposisi penting yang belum Anda terima.", 
                "/dashboard/ruang-kerja", 
                "pending-disposisi"
            );
            */
        }
    } else if (type === 'tugas') {
        const pending = summaryData.pendingTugas || {};
        // Cek apakah tugas masih berstatus Baru/Dikerjakan (belum selesai)
        if (pending[docId]) {
            console.log(`Mengirim FCM Pengingat Tugas untuk user: ${uid}`);
            
            // Hapus komentar pada baris di bawah ini jika fungsi FCM Anda sudah di-import
            /*
            await sendFcmMessageByUid(
                uid, 
                "📋 Pengingat: Tugas Menunggu", 
                "Ada tugas baru yang perlu dikerjakan.", 
                "/dashboard/tugas", 
                "pending-tugas"
            );
            */
        }
    }
});