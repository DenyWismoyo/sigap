// Lokasi: V.3/src/lib/whatsapp.ts

// Ini adalah fungsi SIMULASI untuk mencatat notifikasi ke konsol.
// Fungsi ini sengaja dirancang dengan 3 parameter agar sesuai dengan
// kebutuhan pengiriman notifikasi berbasis template di masa depan.

export async function sendWhatsAppNotification(to: string, templateName: string, templateParams: string[]) {
    
    // Pastikan nomor tujuan menggunakan format internasional tanpa '+' atau '0' di depan.
    // Contoh: 6281234567890
    const formattedTo = to.startsWith('0') ? '62' + to.substring(1) : to;

    const consoleMessage = `
    --- SIMULASI PENGIRIMAN NOTIFIKASI WHATSAPP ---
    Tujuan: ${formattedTo}
    Template: ${templateName}
    Parameter: ${JSON.stringify(templateParams)}
    -------------------------------------------
    `;
    console.log(consoleMessage);
    
    // Ketika nanti Anda siap mengintegrasikan dengan layanan WhatsApp sungguhan,
    // kode untuk memanggil API eksternal akan ditempatkan di sini.
    // Untuk sekarang, fungsi ini hanya mencatat ke konsol.
    return Promise.resolve();
}

