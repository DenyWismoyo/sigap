// Lokasi: functions/src/masterDataAggregator.ts
// [UPDATE OPTIMISTIC UI]: Memisahkan logika agregasi ke fungsi helper.
// [UPDATE OPTIMISTIC UI]: Menambahkan trigger khusus untuk mendengarkan perubahan koleksi 'jabatan'.
// [UPDATE MUTASI LINTAS OPD]: Mendukung agregasi ganda jika ada user/jabatan yang berpindah OPD.
// [MIGRASI DATABASE]: Tetap menggunakan getFirestore dan trigger .database('database-siyap')

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore"; 

const db = getFirestore("database-siyap"); 

/**
 * FUNGSI HELPER: Membangun ulang (rebuild) dokumen Master Data untuk satu OPD tertentu.
 * Fungsi ini akan mengambil data terbaru (Live) dari koleksi users dan jabatan,
 * lalu merangkumnya menjadi satu dokumen di koleksi 'opdMasterData'.
 */
async function rebuildOpdMasterData(opdId: string) {
    if (!opdId) return;

    console.log(`[Master Data Aggregator] Membangun ulang Master Data untuk OPD: ${opdId}`);

    try {
        // 1. Ambil semua User aktif di OPD ini
        const usersSnap = await db.collection('users')
            .where('opdId', '==', opdId)
            .where('status', '==', 'aktif')
            .get();
        
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Ambil semua Jabatan aktif di OPD ini
        const jabatansSnap = await db.collection('jabatan')
            .where('opdId', '==', opdId)
            .where('status', '==', 'aktif')
            .get();
        
        const jabatansList = jabatansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Simpan dalam 1 DOKUMEN TUNGGAL (Master Document Pattern)
        await db.collection('opdMasterData').doc(opdId).set({
            opdId: opdId,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            users: usersList,
            jabatans: jabatansList
        });

        console.log(`[Master Data Aggregator] Berhasil merangkum ${usersList.length} user dan ${jabatansList.length} jabatan ke opdMasterData/${opdId}`);

    } catch (error) {
        console.error(`[Master Data Aggregator] Gagal menyinkronkan Master Data untuk OPD ${opdId}:`, error);
    }
}

/**
 * TRIGGER 1: Mendengarkan perubahan pada koleksi USERS
 * Berjalan saat ada penambahan, perubahan (termasuk mutasi OPD), atau penghapusan User.
 */
export const syncOpdMasterDataFromUsers = functions.region('asia-southeast2').firestore
    .database('database-siyap') 
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const dataBefore = change.before.exists ? change.before.data() : null;
        const dataAfter = change.after.exists ? change.after.data() : null;

        // Gunakan Set untuk mencegah proses ganda jika opdId sebelum dan sesudah sama
        const opdIdsToUpdate = new Set<string>();

        if (dataBefore?.opdId) opdIdsToUpdate.add(dataBefore.opdId);
        if (dataAfter?.opdId) opdIdsToUpdate.add(dataAfter.opdId);

        if (opdIdsToUpdate.size === 0) return;

        // Eksekusi fungsi rebuild untuk setiap OPD yang terpengaruh
        // (Jika mutasi lintas OPD, ini akan mengupdate OPD Lama dan OPD Baru sekaligus)
        const promises = Array.from(opdIdsToUpdate).map(opdId => rebuildOpdMasterData(opdId));
        await Promise.all(promises);
    });

/**
 * TRIGGER 2: Mendengarkan perubahan pada koleksi JABATAN
 * Berjalan saat ada penambahan, perubahan struktur atasan/Plt, atau pengarsipan Jabatan.
 */
export const syncOpdMasterDataFromJabatan = functions.region('asia-southeast2').firestore
    .database('database-siyap') 
    .document('jabatan/{jabatanId}')
    .onWrite(async (change, context) => {
        const dataBefore = change.before.exists ? change.before.data() : null;
        const dataAfter = change.after.exists ? change.after.data() : null;

        // Gunakan Set untuk mencegah proses ganda
        const opdIdsToUpdate = new Set<string>();

        if (dataBefore?.opdId) opdIdsToUpdate.add(dataBefore.opdId);
        if (dataAfter?.opdId) opdIdsToUpdate.add(dataAfter.opdId);

        if (opdIdsToUpdate.size === 0) return;

        // Eksekusi fungsi rebuild untuk setiap OPD yang terpengaruh
        const promises = Array.from(opdIdsToUpdate).map(opdId => rebuildOpdMasterData(opdId));
        await Promise.all(promises);
    });