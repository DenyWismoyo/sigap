// Lokasi: functions/src/aiFunctions.ts
import * as functions from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";

const REGION = "asia-southeast2";

/**
 * FUNGSI: Ekstrak Data Surat via Gemini AI
 * Menerima image base64 dari client dan memanggil Gemini API dengan aman di server.
 */
export const extractSuratDataAI = functions.region(REGION).runWith({
    timeoutSeconds: 60, // AI membutuhkan waktu proses lebih lama
    memory: "512MB"
}).https.onCall(async (data, context) => {
    // 1. Validasi Autentikasi (Keamanan)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Harus login untuk menggunakan AI.");
    }

    // 2. Ambil data dari payload frontend
    const { base64Image } = data;
    if (!base64Image) {
         throw new functions.https.HttpsError("invalid-argument", "Gambar surat tidak disertakan.");
    }

    // 3. Ambil API KEY dari Environment Variables backend
    // [PERBAIKAN KEAMANAN]: DIBERSIHKAN DARI FALLBACK NEXT_PUBLIC DAN FIREBASE
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
        logger.error("API Key untuk Gemini tidak ditemukan di environment backend.");
        throw new functions.https.HttpsError("internal", "Sistem AI tidak terkonfigurasi di server.");
    }

    try {
        // [DOWNGRADE MODEL] Menggunakan gemini-2.0-flash untuk efisiensi biaya
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
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

        // 4. Lakukan pemanggilan API dari Server
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
                if (response.status === 429) {
                    errorMessage = "Sistem AI sedang sibuk atau mencapai limit kuota (429). Harap tunggu beberapa saat.";
                } else if (errorBody.error && errorBody.error.message) {
                    errorMessage = errorBody.error.message;
                }
            } catch (e) {
                logger.error("Gemini API Raw Error:", await response.text());
            }
            throw new functions.https.HttpsError("internal", errorMessage);
        }

        const result = await response.json();
        const textPart = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textPart) {
             throw new functions.https.HttpsError("data-loss", "AI tidak memberikan data yang dapat dibaca.");
        }

        // 5. Kembalikan data JSON bersih ke Frontend
        return JSON.parse(textPart);

    } catch (error: any) {
        logger.error("Error di fungsi extractSuratDataAI:", error);
        throw new functions.https.HttpsError("internal", error.message || "Terjadi kesalahan internal AI.");
    }
});