// Lokasi: functions/src/agregasiSummaries.ts
// [Fungsi Backend]: Otomatis merangkum (aggregate) Disposisi dan Tugas aktif
// ke dalam 1 dokumen kecil per User/Jabatan agar klien tidak perlu melakukan query berat.
// [UPDATE FASE 6]: Terintegrasi dengan Cloud Tasks API untuk penjadwalan notifikasi Event-Driven.
// [FIX CRITICAL BUG]: Menggunakan FieldValue.delete() untuk mencegah Ghosting Feed akibat masalah 'merge: true'.

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFunctions } from "firebase-admin/functions";

const db = admin.firestore();

// 1. Trigger saat ada Disposisi Dibuat/Diubah/Dihapus
export const syncDisposisiToSummary = functions.region('asia-southeast2').firestore
  .document('disposisi/{docId}')
  .onWrite(async (change, context) => {
    const dispId = context.params.docId;
    const dataAfter = change.after.exists ? change.after.data() : null;
    const dataBefore = change.before.exists ? change.before.data() : null;

    // Kumpulkan semua jabatan yang terlibat dalam dokumen sebelum atau sesudahnya
    const jabatansToUpdate = new Set<string>();
    if (dataBefore?.kepadaJabatanId) dataBefore.kepadaJabatanId.forEach((id: string) => jabatansToUpdate.add(id));
    if (dataAfter?.kepadaJabatanId) dataAfter.kepadaJabatanId.forEach((id: string) => jabatansToUpdate.add(id));

    // Lakukan Transaksi ke dokumen userSummaries masing-masing jabatan
    for (const jabId of jabatansToUpdate) {
        await db.runTransaction(async (transaction) => {
            const summaryRef = db.collection('userSummaries').doc(jabId);
            const summaryDoc = await transaction.get(summaryRef);
            
            let summaryData = summaryDoc.exists ? summaryDoc.data()! : { pendingDisposisi: {} };
            if (!summaryData.pendingDisposisi) summaryData.pendingDisposisi = {};

            // BUAT OBJEK UPDATE KHUSUS FIRESTORE
            const updateData: any = {
                pendingDisposisi: { ...summaryData.pendingDisposisi }
            };

            // Evaluasi penghapusan
            if (!dataAfter || dataAfter.status === 'Dikembalikan' || (dataAfter.penerimaSelesai || []).includes(jabId)) {
                // [FIX CRITICAL]: Wajib gunakan FieldValue.delete() untuk update Firestore Map dengan merge:true
                updateData.pendingDisposisi[dispId] = admin.firestore.FieldValue.delete();
                // Hapus juga dari memori lokal agar hitungan Counter di bawah tetap akurat
                delete summaryData.pendingDisposisi[dispId];
            } else {
                // Jika masih butuh tindakan, masukkan ke keranjang (Map)
                const needsAcknowledge = !(dataAfter.penerimaDiterima || []).includes(jabId);

                // --- INTEGRASI CLOUD TASKS (PENJADWALAN NOTIFIKASI) ---
                if (needsAcknowledge) {
                    const queue = getFunctions().taskQueue('sendReminderTask');
                    await queue.enqueue({
                        uid: jabId,
                        type: 'disposisi',
                        docId: dispId
                    }, {
                        scheduleDelaySeconds: 2 * 60 * 60 // Delay 2 Jam (7200 detik)
                    });
                }
                
                const clonedData = {
                    ...dataAfter, 
                    id: dispId,
                    needsAcknowledge: needsAcknowledge
                };

                updateData.pendingDisposisi[dispId] = clonedData;
                summaryData.pendingDisposisi[dispId] = clonedData;
            }

            // Hitung ulang angka notifikasi menggunakan data memori lokal yang sudah bersih
            let disposisiBaruCount = 0;
            let tindakLanjutCount = 0;
            Object.values(summaryData.pendingDisposisi).forEach((item: any) => {
                // Validasi agar FieldValue.delete() (jika ada yg bocor) tidak ikut terhitung
                if (item && item.id) {
                    if (item.needsAcknowledge) disposisiBaruCount++;
                    else tindakLanjutCount++;
                }
            });

            updateData.disposisiBaruCount = disposisiBaruCount;
            updateData.tindakLanjutCount = tindakLanjutCount;

            // Eksekusi update
            transaction.set(summaryRef, updateData, { merge: true });
        });
    }
});

// 2. Trigger saat ada Tugas Dibuat/Diubah/Dihapus
export const syncTugasToSummary = functions.region('asia-southeast2').firestore
  .document('tugas/{docId}')
  .onWrite(async (change, context) => {
      const tugasId = context.params.docId;
      const dataAfter = change.after.exists ? change.after.data() : null;
      const dataBefore = change.before.exists ? change.before.data() : null;

      const jabId = dataAfter?.kepadaJabatanId || dataBefore?.kepadaJabatanId;
      if (!jabId) return;

      await db.runTransaction(async (transaction) => {
          const summaryRef = db.collection('userSummaries').doc(jabId);
          const summaryDoc = await transaction.get(summaryRef);
          
          let summaryData = summaryDoc.exists ? summaryDoc.data()! : { pendingTugas: {} };
          if (!summaryData.pendingTugas) summaryData.pendingTugas = {};

          // BUAT OBJEK UPDATE KHUSUS FIRESTORE
          const updateData: any = {
              pendingTugas: { ...summaryData.pendingTugas }
          };

          if (!dataAfter || dataAfter.status === 'Selesai' || dataAfter.status === 'Dibatalkan') {
              // [FIX CRITICAL]: Wajib gunakan FieldValue.delete()
              updateData.pendingTugas[tugasId] = admin.firestore.FieldValue.delete();
              delete summaryData.pendingTugas[tugasId];
          } else {
              // --- INTEGRASI CLOUD TASKS UNTUK TUGAS ---
              const queue = getFunctions().taskQueue('sendReminderTask');
              await queue.enqueue({
                  uid: jabId,
                  type: 'tugas',
                  docId: tugasId
              }, {
                  scheduleDelaySeconds: 2 * 60 * 60 // Delay 2 Jam (7200 detik)
              });

              const clonedData = { ...dataAfter, id: tugasId };
              updateData.pendingTugas[tugasId] = clonedData;
              summaryData.pendingTugas[tugasId] = clonedData;
          }

          // Hitung ulang angka notifikasi
          let tugasBaruCount = 0;
          Object.values(summaryData.pendingTugas).forEach((item: any) => {
              if (item && item.id) tugasBaruCount++;
          });

          updateData.tugasBaruCount = tugasBaruCount;

          // Eksekusi update
          transaction.set(summaryRef, updateData, { merge: true });
      });
  });