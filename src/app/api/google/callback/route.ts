import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  // [FIX] Hardcode URL Produksi (HARUS SAMA PERSIS dengan file Auth)
  const redirectURI = 'https://disposisi-opd.web.app/api/google/callback';

  console.log(`[Google Callback] Processing callback on: ${redirectURI}`);

  // [DEBUG] Cek apakah Environment Variables terbaca di Server
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("[CRITICAL] Google Credentials Missing in Production Environment!");
      return NextResponse.json({ 
          error: 'Server Misconfiguration', 
          details: 'Environment variables are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your hosting dashboard.' 
      }, { status: 500 });
  }

  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectURI
  );

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); 
  const error = searchParams.get('error');

  // 1. Handle Error dari Google (misal user klik Cancel)
  if (error) {
      console.error("[Google Callback] Google Error:", error);
      return NextResponse.redirect(`https://disposisi-opd.web.app/dashboard/profil?error=google_auth_denied`);
  }

  // 2. Validasi Parameter Dasar
  if (!code || !state) {
    console.error("[Google Callback] Missing code or state");
    return NextResponse.json({ error: 'Code and state are required' }, { status: 400 });
  }

  // 3. Validasi Koneksi Database Server
  if (!db) {
    console.error("[Google Callback] Server Error: Database connection missing.");
    return NextResponse.redirect(`https://disposisi-opd.web.app/dashboard/profil?success=false&error=server_config_missing`);
  }
  
  let userId;
  try {
      // Parse state untuk mendapatkan User ID (NIP)
      // Format state dari frontend: base64url
      const base64 = state.replace(/-/g, '+').replace(/_/g, '/');
      const statePayload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      userId = statePayload.userId;

      if (!userId) {
          throw new Error('User ID not found in state');
      }
  } catch (e) {
      console.error("[Google Callback] Gagal mem-parsing state:", e);
      return NextResponse.json({ error: 'Invalid state format', details: String(e) }, { status: 400 });
  }

  try {
    // 4. Tukar Code dengan Token
    const { tokens } = await oAuth2Client.getToken(code);
    
    oAuth2Client.setCredentials(tokens);

    // 5. Ambil info user dari Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email;

    // 6. Simpan ke Firestore
    const userRef = db.collection('users').doc(userId);
    
    const updateData: any = {
        googleEmail: googleEmail,
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: tokens.expiry_date,
        googleCalendarSyncEnabled: true,
        updatedAt: new Date()
    };
    
    if (tokens.refresh_token) {
        updateData.googleRefreshToken = tokens.refresh_token;
    }
    
    await userRef.set(updateData, { merge: true });
    console.log(`[Google Callback] Success for user ${userId}`);

  } catch (error: any) {
    console.error('[Google Callback] Critical Error during token exchange/save:', error.response?.data || error);
    const errorMessage = error.message || 'token_failed';
    // Redirect dengan pesan error yang aman
    return NextResponse.redirect(`https://disposisi-opd.web.app/dashboard/profil?success=false&error=${encodeURIComponent(errorMessage)}`);
  }

  // Redirect sukses kembali ke halaman profil
  return NextResponse.redirect('https://disposisi-opd.web.app/dashboard/profil?success=true');
}