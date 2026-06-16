import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Kebijakan Privasi Aplikasi SIGAP</CardTitle>
            <p className="text-center text-gray-500 text-sm">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}</p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-4 text-sm">
            <section>
              <h3 className="text-lg font-semibold">1. Pendahuluan</h3>
              <p>
                SIGAP ("kami") menghargai privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda saat Anda menggunakan aplikasi web Sistem Integrasi & Administrasi Persuratan (SIGAP).
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">2. Informasi yang Kami Kumpulkan</h3>
              <p>Kami mengumpulkan informasi berikut untuk menyediakan layanan:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Informasi Akun:</strong> Nama, alamat email, dan foto profil (melalui Login Google).</li>
                <li><strong>Data Google Calendar:</strong> Kami mengakses kalender Anda untuk menambahkan jadwal rapat dan sinkronisasi agenda dinas.</li>
                <li><strong>Data Google Drive:</strong> Kami mengakses folder Google Drive tertentu untuk menyimpan dan membaca dokumen surat atau bukti kinerja yang Anda unggah.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">3. Cara Kami Menggunakan Informasi</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Untuk otentikasi pengguna dan manajemen sesi.</li>
                <li>Untuk menyinkronkan jadwal rapat internal ke Google Calendar pribadi Anda (jika diaktifkan).</li>
                <li>Untuk menyimpan arsip surat dan dokumen kinerja secara aman di Google Drive Anda.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">4. Berbagi Data</h3>
              <p>
                Data Anda <strong>tidak</strong> dijual atau dibagikan kepada pihak ketiga untuk tujuan pemasaran. Data hanya digunakan secara internal dalam lingkup instansi untuk keperluan administrasi.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">5. Keamanan Data</h3>
              <p>
                Kami menggunakan standar keamanan industri (enkripsi SSL) dan autentikasi OAuth 2.0 dari Google untuk melindungi akses ke akun Anda. Kami tidak menyimpan password Google Anda.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">6. Hubungi Kami</h3>
              <p>
                Jika ada pertanyaan mengenai kebijakan privasi ini, silakan hubungi administrator sistem di instansi Anda.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}