/**
 * Utility untuk mengkompres gambar di sisi klien (Browser)
 * sebelum dikirim ke server/firebase.
 */

export const compressImage = async (file: File, quality = 0.7, maxWidth = 1920): Promise<File> => {
  // 1. Jika bukan gambar, kembalikan file asli (misal PDF)
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // 2. Buat elemen Image baru
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      // 3. Hitung aspek rasio untuk resize
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // 4. Gambar ulang di Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(file); // Fallback jika gagal context
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // 5. Ubah Canvas kembali menjadi Blob/File dengan kualitas yang diturunkan
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Buat file baru dari blob hasil kompresi
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg', // Convert ke JPEG agar kompresi maksimal
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            resolve(file); // Fallback jika gagal blob
          }
        },
        'image/jpeg',
        quality // 0.7 = 70% kualitas (cukup bagus tapi size kecil)
      );
    };

    img.onerror = (error) => reject(error);
  });
};