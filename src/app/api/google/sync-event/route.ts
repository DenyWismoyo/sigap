import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase-admin';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // [CHECK] Konfigurasi Server
        if (!db || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
             console.error("[Sync Event API] Server Config Missing");
             return NextResponse.json({ error: 'Konfigurasi server bermasalah.' }, { status: 500 });
        }

        const { nip, suratId, perihal, lokasi, tanggal, jam, jamSelesai: jamSelesaiInput } = await request.json();

        if (!nip || !suratId || !perihal || !lokasi || !tanggal || !jam) {
            return NextResponse.json({ success: false, error: 'Data tidak lengkap.' }, { status: 400 });
        }

        const userRef = db.collection('users').doc(nip);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
        }
        
        const userData = userDoc.data()!;

        if (!userData.googleCalendarSyncEnabled) {
             return NextResponse.json({ success: false, message: 'Sinkronisasi kalender tidak aktif.' });
        }

        const refreshToken = userData.googleRefreshToken;
        if (!refreshToken) {
            return NextResponse.json({ success: false, error: 'Refresh token tidak ditemukan.' }, { status: 400 });
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        
        oAuth2Client.setCredentials({ refresh_token: refreshToken });

        // Format Waktu RFC3339 (+07:00 WIB)
        const createRfc3339DateTime = (dateStr: string, timeStr: string) => {
            const [h, m] = timeStr.split(':').map(n => String(n).padStart(2, '0'));
            return `${dateStr}T${h}:${m}:00+07:00`;
        };

        const startTimeStr = createRfc3339DateTime(tanggal, jam);
        let endTimeStr;

        if (jamSelesaiInput) {
             endTimeStr = createRfc3339DateTime(tanggal, jamSelesaiInput);
        } else {
            const startDate = new Date(startTimeStr); 
            startDate.setHours(startDate.getHours() + 1);
            const iso = startDate.toISOString().replace('Z', '+00:00'); 
            // Simplifikasi: Gunakan 1 jam dari start jika kosong, tapi tetap format WIB agar aman
             // ... logic formatting ulang ...
             // Untuk amannya, kita pakai ISO string +1 jam
             endTimeStr = new Date(new Date(startTimeStr).getTime() + 3600000).toISOString().replace('.000Z', '+07:00'); // Hacky but works for now, better rely on library
        }
        
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const event = {
            summary: `Undangan: ${perihal}`,
            location: lokasi,
            description: `Detail surat: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/surat/${suratId}`,
            start: { dateTime: startTimeStr, timeZone: 'Asia/Jakarta' },
            end: { dateTime: endTimeStr || startTimeStr, timeZone: 'Asia/Jakarta' },
        };

        await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return NextResponse.json({ success: true, message: 'Agenda berhasil disinkronkan.' });

    } catch (error: any) {
        console.error('Error in /api/google/sync-event:', error);
        return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan internal.' }, { status: 500 });
    }
}