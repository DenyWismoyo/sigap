// Lokasi File: src/app/dashboard/hooks/useGoogleDriveUploader.ts
// [UPDATE] Menambahkan parameter opsional 'subFolderName' pada fungsi uploadFile.

"use client";

import { useState, useCallback } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext'; 

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export const useGoogleDriveUploader = () => {
  const { userProfile } = useUserAuth();
  const { addToast } = useToast();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const isReady = !!userProfile?.nip && !!userProfile.googleDriveReportLink;

  const uploadFile = useCallback(async (
    file: File | Blob, 
    fileName: string, 
    customFolderId?: string | null, // folderId opsional (override)
    subFolderName?: string // [BARU] Nama subfolder otomatis (misal: "Portofolio Kompetensi")
  ): Promise<string | null> => { 
    
    if (!userProfile?.nip) {
      const msg = 'NIP pengguna tidak ditemukan.';
      setErrorMessage(msg);
      setUploadStatus('error');
      addToast(msg, 'error');
      return null;
    }
    
    const targetFolderId = customFolderId || userProfile.googleDriveReportLink;

    if (!targetFolderId) {
      const msg = 'ID Folder Google Drive tujuan tidak ditemukan. Harap atur di Profil Anda.';
      setErrorMessage(msg);
      setUploadStatus('error');
      addToast(msg, 'error');
      return null;
    }

    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file, fileName);
      formData.append('nip', userProfile.nip);
      formData.append('fileName', fileName);
      formData.append('folderId', targetFolderId);
      
      // [BARU] Kirim nama subfolder jika ada
      if (subFolderName) {
          formData.append('subFolderName', subFolderName);
      }
      
      const response = await fetch('/api/google/upload-bukti', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("Sesi Anda telah berakhir. Silakan muat ulang halaman dan login kembali.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Upload gagal dengan status ${response.status}`);
      }

      setUploadStatus('success');
      addToast(`File ${fileName} berhasil diunggah.`, 'success');
      return result.webViewLink; 

    } catch (err: any) {
      console.error("Error uploading file via internal API:", err);
      const errorMsg = err.message || 'Terjadi kesalahan saat mengunggah file.';
      setErrorMessage(errorMsg);
      setUploadStatus('error');
      addToast(errorMsg, 'error');
      return null;
    }
  }, [userProfile, addToast]);
    
  return { uploadFile, uploadStatus, errorMessage, isReady };
};