import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      nip, 
      templateId, 
      folderId,   
      data        
    } = body;

    if (!nip || !templateId || !data) {
      return NextResponse.json({ error: 'Data tidak lengkap (nip, templateId, data wajib ada)' }, { status: 400 });
    }

    // [CHECK] Konfigurasi Server
    if (!db || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error("[Generate API] Server Config Missing");
        return NextResponse.json({ error: 'Konfigurasi server bermasalah.' }, { status: 500 });
    }

    // 1. Ambil Token User
    const userDocRef = db.collection('users').doc(nip);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const userData = userDoc.data();
    const refreshToken = userData?.googleRefreshToken;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Akun Google belum terhubung.' }, { status: 401 });
    }

    // 2. Setup Auth Client
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    // 3. Service Clients
    const docs = google.docs({ version: 'v1', auth: oAuth2Client });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // 4. Copy Template
    const copyResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: `Surat Keluar - ${data['{{perihal}}'] || 'Tanpa Judul'} - ${new Date().toISOString().split('T')[0]}`,
        parents: folderId ? [folderId] : [],
      },
    });

    const newFileId = copyResponse.data.id;
    if (!newFileId) throw new Error("Gagal menyalin template surat.");

    // 5. Replace Text
    const requests = Object.keys(data).map(key => ({
      replaceAllText: {
        containsText: {
          text: key,
          matchCase: true,
        },
        replaceText: data[key] || '',
      },
    }));

    if (requests.length > 0) {
        await docs.documents.batchUpdate({
          documentId: newFileId,
          requestBody: { requests: requests },
        });
    }

    return NextResponse.json({ 
      success: true, 
      fileId: newFileId,
      documentUrl: `https://docs.google.com/document/d/${newFileId}/edit` 
    });

  } catch (error: any) {
    console.error('Error generating doc:', error);
    
    if (error.response?.data?.error === 'invalid_grant') {
        return NextResponse.json({ error: 'Izin akses Google kadaluwarsa.' }, { status: 401 });
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}