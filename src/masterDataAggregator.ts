// Lokasi: functions/src/masterDataAggregator.ts
// FUNGSI BARU: Mengurangi reads 'useMasterData' dari ratusan menjadi HANYA 1 READ.

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Trigger ini berjalan HANYA ketika ada penambahan/perubahan/penghapusan User
export const syncOpdMasterData = functions.region('asia-southeast2').firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const dataAfter = change.after.exists ? change.after.data() : null;
        const dataBefore = change.before.exists ? change.before.data() : null;

        const opdId = dataAfter?.opdId || dataBefore?.opdId;
        if (!opdId) return;

        // Beri jeda sedikit agar tidak spam write jika ada bulk update
        console.log(`Membangun ulang Master Data untuk OPD: ${opdId}`);

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

            // 3. Simpan dalam 1 DOKUMEN TUNGGAL
            await db.collection('opdMasterData').doc(opdId).set({
                opdId: opdId,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                users: usersList,
                jabatans: jabatansList
            });

            console.log(`Berhasil merangkum ${usersList.length} user dan ${jabatansList.length} jabatan ke opdMasterData/${opdId}`);

        } catch (error) {
            console.error("Gagal menyinkronkan Master Data OPD:", error);
        }
    });