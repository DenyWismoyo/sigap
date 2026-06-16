// Lokasi: src/app/dashboard/components/CameraCaptureModal.tsx
// [MODIFIKASI]
// - Mengganti 'div.modal-backdrop' kustom dengan <Dialog> shadcn/ui.
// - Mengganti <button> standar dengan <Button> shadcn/ui.
// - Mengganti kelas hardcoded dengan kelas semantik (bg-card, border-border).

"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCcw, Check, X } from 'lucide-react';

// --- Impor Komponen Shadcn ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// --- Akhir Impor Shadcn ---

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

export default function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    if (stream) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prioritaskan kamera belakang
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Tidak bisa mengakses kamera. Pastikan Anda telah memberikan izin pada browser.");
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError('');
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleUsePhoto = () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
        }
        onClose();
      }, 'image/jpeg', 0.9);
    }
  };

  // [MODIFIKASI] Gunakan <Dialog>
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg bg-card rounded-xl shadow-xl border-border p-4 flex flex-col">
        <DialogHeader>
          <DialogTitle>Ambil Foto Bukti</DialogTitle>
        </DialogHeader>
        
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mt-4">
          {error && <div className="flex items-center justify-center h-full text-white text-center p-4">{error}</div>}
          <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`}></video>
          {capturedImage && <img src={capturedImage} alt="Captured preview" className="w-full h-full object-cover" />}
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
        
        <DialogFooter className="flex justify-center items-center mt-4">
          {capturedImage ? (
            <div className="flex space-x-4">
              <Button onClick={handleRetake} variant="outline">
                <RefreshCcw size={18} className="mr-2" /> Ambil Ulang
              </Button>
              <Button onClick={handleUsePhoto} className="bg-green-600 hover:bg-green-700">
                <Check size={18} className="mr-2" /> Gunakan Foto
              </Button>
            </div>
          ) : (
            <Button onClick={handleCapture} disabled={!!error} size="icon" className="w-14 h-14 rounded-full">
              <Camera size={28} />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}