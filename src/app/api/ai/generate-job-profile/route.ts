// [FIX] Update Model AI ke gemini-2.0-flash

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { jobTitle, jobLevel } = await request.json();

    if (!jobTitle || !jobLevel) {
      return NextResponse.json({ error: 'Nama Jabatan dan Level Jabatan wajib diisi.' }, { status: 400 });
    }

    // [PERBAIKAN KEAMANAN]: DIBERSIHKAN DARI FALLBACK NEXT_PUBLIC DAN FIREBASE
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key AI belum dikonfigurasi di server.' }, { status: 500 });
    }

    // Prompt Engineering yang Lebih Ketat
    const prompt = `
      Berperanlah sebagai Konsultan SDM Pemerintahan Ahli.
      Buat profil jabatan lengkap untuk:
      - Jabatan: "${jobTitle}"
      - Level: "${jobLevel}"
      
      Instruksi Output:
      1. HANYA kembalikan JSON object. JANGAN ada teks pengantar atau penutup.
      2. Gunakan Bahasa Indonesia formal birokrasi.
      3. Struktur JSON harus persis seperti ini:
      {
        "description": "Deskripsi singkat peran (max 2 kalimat).",
        "tupoksiUtama": ["Tugas 1", "Tugas 2", "Tugas 3"],
        "indicators": ["Indikator 1", "Indikator 2", "Indikator 3"],
        "requiredCompetencies": ["Kompetensi 1", "Kompetensi 2", "Kompetensi 3", "Kompetensi 4"],
        "minKinerja": 80, 
        "minPotensi": 80
      }
      
      Panduan Nilai (minKinerja/minPotensi):
      - JPT Pratama: 90-92
      - Administrator: 85-88
      - Pengawas: 80-85
      - Fungsional/Pelaksana: 75-80
    `;

    // [FIX] Ganti model ke gemini-2.0-flash yang stabil
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    
    // Cek jika ada error dari Google API
    if (data.error) {
        console.error("Gemini API Error:", data.error);
        throw new Error(data.error.message || "Gagal menghubungi layanan AI.");
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error("AI tidak memberikan respons teks.");
    }

    // --- LOGIKA PEMBERSIHAN JSON (ROBUST) ---
    // 1. Hapus markdown block ```json dan ```
    let cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. Ambil hanya bagian antara kurung kurawal pertama '{' dan terakhir '}'
    // Ini mengatasi jika AI masih memberi teks pembuka seperti "Tentu, ini JSON nya:"
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    let result;
    try {
        result = JSON.parse(cleanJson);
    } catch (e) {
        console.error("JSON Parse Error. Raw text:", textResponse);
        throw new Error("Format data dari AI tidak valid. Silakan coba lagi.");
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Server AI Error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal.' }, { status: 500 });
  }
}