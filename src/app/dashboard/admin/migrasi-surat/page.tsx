"use client";

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, query, where } from 'firebase/firestore';

export default function MigrasiSuratPage() {
  const [log, setLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleRunMigration = async () => {
      setIsProcessing(true);
      setLog(["Memulai sinkronisasi data surat lama..."]);

      try {
          // 1. Ambil data User untuk mapping nama
          addLog("1. Mengambil master data pengguna...");
          const userSnap = await getDocs(collection(db, 'users'));
          const userMap = new Map<string, string>();
          userSnap.forEach(doc => {
              const data = doc.data();
              if (data.jabatanId) userMap.set(data.jabatanId, data.namaLengkap);
          });

          // 2. Ambil semua surat
          addLog("2. Membaca seluruh database surat...");
          const suratSnap = await getDocs(collection(db, 'surat'));
          addLog(`   Ditemukan total ${suratSnap.size} surat.`);

          let batch = writeBatch(db);
          let count = 0;
          let totalUpdated = 0;

          for (const suratDoc of suratSnap.docs) {
              const suratData = suratDoc.data();
              
              // Skip jika sudah ada data infoTampilan (sudah ter-update)
              if (suratData.infoTampilan?.recipientNames) {
                  continue;
              }

              // Cari disposisi dari surat ini
              const dispSnap = await getDocs(query(collection(db, 'disposisi'), where('suratId', '==', suratDoc.id)));
              
              let recipientNames = "Belum Didisposikan";
              let statusPenyelesaian = suratData.statusPenyelesaian;

              if (!dispSnap.empty) {
                  const disposisiList = dispSnap.docs.map(d => d.data());
                  
                  // Urutkan mencari disposisi paling baru
                  disposisiList.sort((a, b) => {
                      const timeA = a.tanggalDisposisi ? a.tanggalDisposisi.toMillis() : 0;
                      const timeB = b.tanggalDisposisi ? b.tanggalDisposisi.toMillis() : 0;
                      return timeB - timeA;
                  });

                  const latestDisp = disposisiList[0];
                  
                  if (latestDisp && latestDisp.kepadaJabatanId && latestDisp.kepadaJabatanId.length > 0) {
                      const names = latestDisp.kepadaJabatanId.map((id: string) => userMap.get(id) || "Pegawai");
                      const uniqueNames = Array.from(new Set(names)).filter(Boolean);
                      
                      if (uniqueNames.length > 5 && latestDisp.isInformational) {
                          recipientNames = "Seluruh Pegawai OPD";
                      } else {
                          recipientNames = uniqueNames.join(", ");
                      }
                  }

                  // Jika status di database masih "Baru" tapi surat sudah pernah didisposisi
                  if (statusPenyelesaian === "Baru") {
                      statusPenyelesaian = "Didisposisikan";
                  }
              }

              // Masukkan ke dalam Batch menggunakan Notasi Titik (Dot Notation)
              const suratRef = doc(db, 'surat', suratDoc.id);
              batch.update(suratRef, {
                  'infoTampilan.recipientNames': recipientNames,
                  statusPenyelesaian: statusPenyelesaian
              });

              count++;
              totalUpdated++;
              addLog(`- Menambahkan penerima "${recipientNames}" ke surat: ${suratData.perihal?.substring(0, 20)}...`);

              // Eksekusi jika batch sudah mencapai batas Firestore (maksimal 500)
              if (count >= 400) {
                  await batch.commit();
                  addLog("✅ 400 data berhasil disimpan ke Firebase...");
                  batch = writeBatch(db); // Reset batch
                  count = 0;
              }
          }

          // Commit sisa data yang kurang dari 400
          if (count > 0) {
              await batch.commit();
          }

          addLog(`🎉 SELESAI! Berhasil menambal data pada ${totalUpdated} surat lama.`);

      } catch (error: any) {
          addLog(`❌ ERROR: ${error.message}`);
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
            <h1 className="text-2xl font-bold mb-2">Alat Migrasi Data Surat (Satu Kali Jalan)</h1>
            <p className="text-gray-600">
                Alat ini akan membaca semua surat lama yang belum memiliki field <strong>infoTampilan.recipientNames</strong>, 
                mencari data disposisinya, dan menempelkan nama penerima langsung ke dokumen surat agar sistem baru (Fase 2) dapat membacanya dengan cepat tanpa memboroskan kuota database.
            </p>
        </div>

        <button 
            onClick={handleRunMigration}
            disabled={isProcessing}
            className={`px-6 py-3 font-semibold text-white rounded-lg shadow ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
            {isProcessing ? 'Sedang Memproses, Jangan Tutup Halaman...' : 'Mulai Migrasi Data Sekarang'}
        </button>

        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            {log.length === 0 ? (
                <p className="text-gray-500 italic">Log proses akan muncul di sini...</p>
            ) : (
                log.map((msg, idx) => (
                    <div key={idx} className="mb-1 border-b border-gray-800 pb-1">{msg}</div>
                ))
            )}
        </div>
    </div>
  );
}