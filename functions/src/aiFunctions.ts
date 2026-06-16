// Lokasi: functions/src/aiFunctions.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Pastikan admin diinisialisasi (biasanya sudah ada di index.ts functions Anda)
if (!admin.apps.length) {
    admin.initializeApp();
}

const REGION = "asia-southeast2";
const COOLDOWN_SECONDS = 30; // JEDA MINIMAL (30 Detik)

/**
 * FUNGSI: Ekstrak Data Surat via Gemini AI
 * Menggunakan Firebase Functions v2 (Cloud Run)
 */
export const extractSuratDataAIV2 = onCall({
    region: REGION,
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true 
}, async (request) => { 
    
    // 1. Validasi Autentikasi (Keamanan)
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "Harus login untuk menggunakan AI.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const rateLimitRef = db.collection('rate_limits').doc(`ai_ocr_${uid}`);

    // 2. RATE LIMITING & ANTI-SPAM (Backend Validation)
    // Menggunakan Transaction untuk mencegah Race Conditions jika ditembak bersamaan
    try {
        await db.runTransaction(async (transaction) => {
            const rateLimitDoc = await transaction.get(rateLimitRef);
            const now = Date.now();

            if (rateLimitDoc.exists) {
                const lastCallTime = rateLimitDoc.data()?.lastCallTime || 0;
                const timeDiff = now - lastCallTime;
                
                // Jika panggilan terlalu cepat dari batas waktu (Cooldown)
                if (timeDiff < COOLDOWN_SECONDS * 1000) {
                    const remainingTime = Math.ceil((COOLDOWN_SECONDS * 1000 - timeDiff) / 1000);
                    throw new HttpsError(
                        "resource-exhausted", 
                        `Harap tunggu ${remainingTime} detik sebelum menggunakan AI lagi.`
                    );
                }
            }

            // Catat waktu panggilan saat ini (Update state SEBELUM panggil API eksternal)
            transaction.set(rateLimitRef, { 
                lastCallTime: now,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
    } catch (error: any) {
        if (error instanceof HttpsError) throw error;
        logger.error("Error pada Rate Limiter:", error);
        throw new HttpsError("internal", "Gagal memverifikasi limit keamanan.");
    }

    // 3. Ambil data dari payload frontend
    const { base64Image } = request.data;
    if (!base64Image) {
         throw new HttpsError("invalid-argument", "Gambar surat tidak disertakan.");
    }

    // 4. Ambil API KEY
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
        logger.error("API Key untuk Gemini tidak ditemukan di environment backend.");
        throw new HttpsError("internal", "Sistem AI tidak terkonfigurasi di server.");
    }

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const promptText = `
              Anda adalah sekretaris ahli birokrasi. Analisis gambar surat ini untuk mengekstrak metadata.

              INSTRUKSI KHUSUS:
              1. **PERIHAL**: 
                 - BACA header 'Hal' atau 'Perihal'.
                 - BACA JUGA paragraf pertama/isi surat.
                 - JIKA header terlalu pendek atau umum (contoh hanya tertulis: "Undangan", "Pemberitahuan", "Permohonan"), ABAIKAN header tersebut dan BUAT RINGKASAN PADAT dari isi surat.
                 - Contoh: Ubah "Undangan" menjadi "Undangan Rapat Koordinasi Anggaran 2025".
                 - Jika header sudah deskriptif, gunakan apa adanya.
              
              2. **PENGIRIM**:
                 - Ambil nama INSTANSI / DINAS / LEMBAGA pengirim (biasanya di KOP SURAT paling atas).
                 - JANGAN ambil nama pejabat yang menandatangani (misal: 'Kepala Dinas'), kecuali surat pribadi.
                 - Prioritaskan nama instansi.

              3. **AGENDA**:
                 - Jika surat ini adalah Undangan atau Panggilan Rapat, isi detail agenda selengkap mungkin.

              Ekstrak data dalam format JSON berikut:
              {
                "nomorSurat": "string",
                "perihal": "string (Ringkasan isi surat)",
                "pengirim": "string (Nama Instansi)",
                "tanggalSurat": "YYYY-MM-DD",
                "jenisSurat": "Pilih satu: Undangan, Pemberitahuan, Permohonan, Lainnya",
                "detailAgenda": {
                   "tanggal": "YYYY-MM-DD",
                   "jamMulai": "HH:mm",
                   "jamSelesai": "HH:mm" (atau null),
                   "lokasi": "string"
                } (isi null jika bukan undangan)
              }
        `;

        const schemaConfig = {
            type: "OBJECT",
            properties: {
                nomorSurat: { type: "STRING" },
                perihal: { type: "STRING" },
                pengirim: { type: "STRING" },
                tanggalSurat: { type: "STRING" },
                jenisSurat: { 
                    type: "STRING", 
                    enum: ["Undangan", "Pemberitahuan", "Permohonan", "Lainnya"] 
                },
                detailAgenda: {
                    type: "OBJECT", 
                    nullable: true,
                    properties: {
                        tanggal: { type: "STRING" },
                        jamMulai: { type: "STRING" },
                        jamSelesai: { type: "STRING" },
                        lokasi: { type: "STRING" }
                    },
                    required: ["tanggal", "jamMulai", "lokasi"]
                }
            },
            required: ["nomorSurat", "perihal", "pengirim", "tanggalSurat", "jenisSurat"]
        };

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: "image/jpeg", data: base64Image } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schemaConfig
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = "Gagal menghubungi AI Server.";
            try {
                const errorBody = await response.json();
                logger.error("Gemini API Error Details:", errorBody);
                
                // [PERBAIKAN] Prioritaskan pesan error asli dari server Google (jika ada)
                if (errorBody.error && errorBody.error.message) {
                    errorMessage = `Error AI: ${errorBody.error.message}`;
                } else if (response.status === 429) {
                    // Fallback jika tidak ada pesan spesifik dari Google API
                    errorMessage = "Sistem AI sedang sibuk atau mencapai limit kuota (429). Harap tunggu beberapa saat.";
                }
            } catch (e) {
                logger.error("Gemini API Raw Error:", await response.text());
            }
            throw new HttpsError("internal", errorMessage);
        }

        const result = await response.json();
        const textPart = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textPart) {
             throw new HttpsError("data-loss", "AI tidak memberikan data yang dapat dibaca.");
        }

        return JSON.parse(textPart);

    } catch (error: any) {
        logger.error("Error di fungsi extractSuratDataAI:", error);
        throw new HttpsError("internal", error.message || "Terjadi kesalahan internal AI.");
    }
});