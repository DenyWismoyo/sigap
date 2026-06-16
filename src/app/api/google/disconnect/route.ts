import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// [MODIFIKASI] Impor 'db' terpusat
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId'); // Ini adalah NIP

  // Validasi parameter
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.warn('Disconnect attempt failed: userId missing or invalid.');
    return NextResponse.redirect('https://disposisi-opd.web.app/dashboard/profil?error=invalid_user_session');
  }

  try {
    // [PERBAIKAN ERROR BUILD] Cek apakah db sudah terinisialisasi
    if (!db) {
        console.error("Server Error: Database connection is missing.");
        return NextResponse.redirect('https://disposisi-opd.web.app/dashboard/profil?error=server_config_missing');
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
        // Hapus googleEmail juga saat disconnect
        await userRef.update({
          googleRefreshToken: null,
          googleAccessToken: null,
          googleTokenExpiry: null,
          googleCalendarSyncEnabled: false,
          googleEmail: null 
        });
    } else {
        console.warn(`Dokumen user tidak ditemukan untuk NIP: ${userId}`);
    }
    
    return NextResponse.redirect('https://disposisi-opd.web.app/dashboard/profil?success=calendar_disconnected');
  
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.redirect(`https://disposisi-opd.web.app/dashboard/profil?error=${encodeURIComponent(error.message)}`);
  }
}