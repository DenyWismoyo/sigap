// [PERBAIKAN] Ini adalah konten yang BENAR untuk Service Worker
// File ini berjalan di background browser untuk menerima notifikasi.

// Impor skrip Firebase (menggunakan sintaks service worker)
// Gunakan versi compat agar sesuai dengan contoh v8/v9 hybrid
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Impor konfigurasi Firebase Anda dari file terpisah di /public
// File ini (firebase-config.js) sudah ada di folder public Anda.
importScripts("/firebase-config.js");

// Pastikan firebaseConfig sudah ada (dari firebase-config.js)
if (typeof firebaseConfig !== 'undefined') {
  // Inisialisasi Firebase
  firebase.initializeApp(firebaseConfig);

  // Dapatkan instance messaging
  const messaging = firebase.messaging();

  // Handler untuk notifikasi yang diterima saat aplikasi di background
  // Ini akan menangkap "data-only message" yang dikirim oleh Cloud Function Anda (index.ts)
  messaging.onBackgroundMessage((payload) => {
    console.log(
      "[firebase-messaging-sw.js] Menerima pesan di background ",
      payload
    );

    // Ambil data dari payload (yang Anda kirim dari Cloud Function)
    const notificationTitle = payload.data.title || "Notifikasi Baru";
    const notificationOptions = {
      body: payload.data.body || "Anda memiliki pesan baru.",
      icon: payload.data.icon || "/icon-192x192.png",
      tag: payload.data.tag || "sigap-notification", // Tag untuk grouping
      data: {
        click_action: payload.data.link || "/", // URL untuk dibuka
      },
      badge: "/icon-192x192.png", // Ikon untuk notifikasi di Android
      vibrate: [100, 50, 100], // Pola getar
    };

    // Tampilkan notifikasi visual
    self.registration.showNotification(notificationTitle, notificationOptions);

    // --- [MODIFIKASI PWA BADGE] ---
    // Cek jika totalCount ada di payload dan browser mendukung setAppBadge
    // 'setAppBadge' adalah bagian dari navigator, yang tersedia di 'self' dalam Service Worker
    if (payload.data.totalCount && 'setAppBadge' in navigator) {
        const totalCount = Number(payload.data.totalCount);
        if (!isNaN(totalCount)) {
            console.log('[SW] Setting app badge count to:', totalCount);
            // 'navigator' juga bisa diakses sebagai 'self.navigator'
            navigator.setAppBadge(totalCount).catch((err) => {
                console.error('[SW] Gagal set app badge:', err);
            });
        }
    }
    // --- [AKHIR MODIFIKASI] ---
  });

  // Handler untuk saat notifikasi di-klik
  self.addEventListener("notificationclick", (event) => {
    console.log("[firebase-messaging-sw.js] Notifikasi di-klik.");
    event.notification.close();

    const urlToOpen = event.notification.data.click_action || "/";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Cek apakah tab aplikasi sudah terbuka
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            // Coba fokus ke tab yang sudah ada
            if (client.url.includes(urlToOpen) && "focus" in client) {
              return client.focus();
            }
          }
          // Jika tidak ada tab yang terbuka, buka tab baru
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  });

} else {
  console.error("[firebase-messaging-sw.js] Gagal memuat firebaseConfig. Notifikasi tidak akan berfungsi.");
}