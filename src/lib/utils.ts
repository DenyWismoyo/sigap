// Lokasi: src/lib/utils.ts
// [MODIFIKASI] Menambahkan fungsi 'compressImage' untuk optimasi upload.

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";

// Fungsi WAJIB untuk shadcn/ui
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fungsi helper Anda yang sudah ada
export function formatDateRelative(timestamp: Timestamp): string {
  if (!timestamp) return 'Tanggal tidak valid';

  const date = timestamp.toDate();
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const dateToCompare = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

  if (seconds < 60) {
    return "Baru saja";
  } else if (minutes < 60) {
    return `${minutes} menit yang lalu`;
  } else if (hours < 24 && dateToCompare.getTime() === today.getTime()) {
    return `${hours} jam yang lalu`;
  } else if (dateToCompare.getTime() === yesterday.getTime()) {
    return `Kemarin, ${date.toLocaleTimeString('id-ID', timeOptions)}`;
  } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    // Dalam 7 hari terakhir
    return date.toLocaleDateString('id-ID', { weekday: 'long', ...timeOptions });
  } else {
    // Lebih dari 7 hari
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}

/**
 * Mengambil inisial dari nama lengkap.
 * @param name Nama lengkap pengguna.
 * @returns String inisial (misal: "JD" untuk "John Doe").
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.split(' ');
  const first = parts[0] ? parts[0][0] : '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  
  return `${first}${last}`.toUpperCase();
}

/**
 * Mengompres gambar menggunakan HTML Canvas.
 * @param file File gambar asli.
 * @param quality Kualitas output (0.1 - 1.0). Default 0.7.
 * @param maxWidth Lebar maksimal (px). Default 1280px.
 * @returns Promise<File> File gambar yang sudah dikompres (JPEG).
 */
export async function compressImage(file: File, quality: number = 0.7, maxWidth: number = 1280): Promise<File> {
    return new Promise((resolve, reject) => {
      // Hanya proses jika tipe file adalah gambar
      if (!file.type.startsWith('image/')) {
          resolve(file); // Kembalikan as-is jika bukan gambar
          return;
      }

      const image = new Image();
      image.src = URL.createObjectURL(file);
      
      image.onload = () => {
        const canvas = document.createElement('canvas');
        let width = image.width;
        let height = image.height;
  
        // Hitung rasio aspek untuk resize
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
  
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Gagal membuat context canvas"));
            return;
        }

        // Gambar ulang di canvas dengan ukuran baru
        ctx.drawImage(image, 0, 0, width, height);
  
        // Konversi canvas kembali ke Blob/File (JPEG untuk kompresi maksimal)
        canvas.toBlob((blob) => {
          if (!blob) {
              reject(new Error("Gagal kompresi gambar"));
              return;
          }
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          console.log(`Kompresi: ${file.size} -> ${newFile.size} bytes`); // Debug
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      
      image.onerror = (err) => reject(err);
    });
}