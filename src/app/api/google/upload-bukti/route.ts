import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { db } from '@/lib/firebase-admin';

// Helper: Mime Type
function getMimeType(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  const ext = parts[parts.length - 1];
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default: return 'application/octet-stream'; 
  }
}

export async function POST(request: NextRequest) {
    console.log("[Upload API] Request received");

    // 1. Cek Ketersediaan Config Server (Mencegah Crash 500)
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
         console.error("[Upload API] Google Credentials Missing");
         return NextResponse.json({ error: 'Konfigurasi server (Google) tidak lengkap.' }, { status: 500 });
    }

    if (!db) {
         console.error("[Upload API] Database connection missing");
         return NextResponse.json({ error: 'Konfigurasi server (Database) bermasalah.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const nip = formData.get('nip') as string | null;
        const fileName = formData.get('fileName') as string | null;
        const folderId = formData.get('folderId') as string | null;
        const subFolderName = formData.get('subFolderName') as string | null;

        if (!file || !nip || !fileName || !folderId) {
            return NextResponse.json({ error: 'Data upload tidak lengkap.' }, { status: 400 });
        }

        // 2. Ambil Refresh Token dari User
        const userDocRef = db.collection('users').doc(nip); 
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'Profil pengguna tidak ditemukan.' }, { status: 404 });
        }
        
        const googleRefreshToken = userDoc.data()?.googleRefreshToken;
        if (!googleRefreshToken) {
            return NextResponse.json({ error: 'Akun Google tidak terhubung. Harap hubungkan ulang.' }, { status: 401 });
        }

        // 3. Setup Google Auth Client
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        
        oAuth2Client.setCredentials({ refresh_token: googleRefreshToken });

        // Inisialisasi Drive
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });

        // 4. Cek atau Buat Sub-Folder (Optional)
        let targetFolderId = folderId;

        if (subFolderName) {
            try {
                // Sanitasi nama folder untuk query (menghindari error syntax query)
                const safeName = subFolderName.replace(/'/g, "\\'");
                const query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and '${folderId}' in parents and trashed=false`;
                
                const folderSearch = await drive.files.list({
                    q: query,
                    fields: 'files(id, name)',
                    spaces: 'drive',
                });

                if (folderSearch.data.files && folderSearch.data.files.length > 0) {
                    targetFolderId = folderSearch.data.files[0].id!;
                } else {
                    const fileMetadata = {
                        name: subFolderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [folderId],
                    };
                    const folder = await drive.files.create({
                        requestBody: fileMetadata,
                        fields: 'id',
                    });
                    targetFolderId = folder.data.id!;
                }
            } catch (folderErr) {
                console.error("[Upload API] Subfolder error, fallback to root:", folderErr);
                // Lanjut upload ke folder utama jika subfolder gagal
            }
        }

        // 5. Proses File Buffer (Metode Lebih Stabil)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        const mimeType = (file.type && file.type !== 'application/octet-stream') ? file.type : getMimeType(fileName);

        // 6. Eksekusi Upload ke Drive
        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [targetFolderId],
            },
            media: {
                mimeType: mimeType,
                body: stream,
            },
            fields: 'id, webViewLink',
        });

        const fileId = response.data.id;
        const webViewLink = response.data.webViewLink;

        if (!fileId || !webViewLink) {
             throw new Error('Drive API did not return file ID.');
        }

        // 7. Set Permission Public Reader (Agar bisa dilihat orang lain)
        await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        return NextResponse.json({ success: true, webViewLink: webViewLink });

    } catch (error: any) {
        console.error('[Upload API] Critical Error:', error);
        
        // Handling spesifik jika token kedaluwarsa/dicabut
        if (error.response?.data?.error === 'invalid_grant') {
             return NextResponse.json({ error: 'Izin Google kedaluwarsa. Mohon hubungkan ulang akun di Profil.' }, { status: 401 });
        }
        
        // Pastikan return JSON agar tidak crash di frontend
        return NextResponse.json({ 
            error: error.message || 'Terjadi kesalahan server saat upload.',
            details: error.response?.data || 'No details'
        }, { status: 500 });
    }
}