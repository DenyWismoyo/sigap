import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Ketentuan Layanan SIGAP</CardTitle>
            <p className="text-center text-gray-500 text-sm">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-4 text-sm text-justify">
            <section>
              <h3 className="text-lg font-semibold">1. Penerimaan Ketentuan</h3>
              <p>
                Dengan mengakses atau menggunakan aplikasi SIGAP, Anda setuju untuk terikat dengan 
                Ketentuan Layanan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan layanan ini.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">2. Penggunaan Layanan</h3>
              <p>
                Aplikasi ini disediakan khusus untuk keperluan administrasi internal instansi. 
                Anda setuju untuk menggunakan aplikasi ini hanya untuk tujuan yang sah dan 
                sesuai dengan peraturan kepegawaian yang berlaku.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">3. Akun Pengguna</h3>
              <p>
                Anda bertanggung jawab untuk menjaga kerahasiaan kredensial akun Anda. 
                Segala aktivitas yang terjadi di bawah akun Anda adalah tanggung jawab Anda sepenuhnya.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">4. Akses API Google</h3>
              <p>
                Aplikasi ini menggunakan layanan API Google (Calendar & Drive). 
                Penggunaan Anda atas fitur tersebut tunduk pada Kebijakan Privasi Google 
                dan Kebijakan Data Pengguna Layanan Google API.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">5. Batasan Tanggung Jawab</h3>
              <p>
                Layanan disediakan "sebagaimana adanya". Pengembang tidak bertanggung jawab atas 
                kehilangan data atau gangguan layanan yang disebabkan oleh faktor di luar kendali wajar, 
                termasuk gangguan pada layanan pihak ketiga (Google/Firebase).
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">6. Perubahan Ketentuan</h3>
              <p>
                Kami berhak mengubah ketentuan ini sewaktu-waktu. Perubahan akan efektif 
                segera setelah diposting di halaman ini.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}