import { useState } from 'react';
// [PERBAIKAN] Mengimpor langsung dari lib/firebase yang sudah Anda update
import { 
  storage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from '@/lib/firebase';
import { compressImage } from '@/lib/imageCompression';

export const useFirebaseStorage = () => {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload file ke Firebase Storage
   * @param file File asli dari input form
   * @param path Folder tujuan di storage (contoh: "skw/ktp")
   */
  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Lakukan kompresi jika file adalah gambar
      const fileToUpload = await compressImage(file);

      // 2. Buat referensi storage
      // Nama file dibuat unik dengan timestamp agar tidak tertimpa
      const uniqueFileName = `${Date.now()}_${fileToUpload.name.replace(/\s+/g, '_')}`;
      
      // Menggunakan fungsi ref yang diimpor dari @/lib/firebase
      const fileRef = ref(storage, `${path}/${uniqueFileName}`);

      // 3. Mulai Upload dengan Task (agar bisa pantau progress)
      // Menggunakan uploadBytesResumable yang diimpor dari @/lib/firebase
      const uploadTask = uploadBytesResumable(fileRef, fileToUpload);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Hitung persentase upload
            const percent = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setProgress(percent);
          },
          (err) => {
            // Handle Error
            console.error("Upload Error:", err);
            setError(err.message);
            setIsUploading(false);
            reject(err);
          },
          async () => {
            // Upload Selesai
            try {
              // Menggunakan getDownloadURL yang diimpor dari @/lib/firebase
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setIsUploading(false);
              resolve(downloadURL);
            } catch (urlErr) {
              console.error("Error getting URL:", urlErr);
              setIsUploading(false);
              reject(urlErr);
            }
          }
        );
      });

    } catch (err: any) {
      console.error("System Error:", err);
      setError(err.message || "Terjadi kesalahan sistem");
      setIsUploading(false);
      return null;
    }
  };

  return {
    uploadFile,
    progress,
    isUploading,
    error
  };
};