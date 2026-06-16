// Lokasi: src/app/dashboard/components/Toast.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastType } from '@/context/ToastContext'; // Impor tipe dari konteks

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: <CheckCircle className="text-green-500" />,
    style: "bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700",
    text: "text-green-800 dark:text-green-200"
  },
  error: {
    icon: <AlertTriangle className="text-red-500" />,
    style: "bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700",
    text: "text-red-800 dark:text-red-200"
  },
  info: {
    icon: <Info className="text-blue-500" />,
    style: "bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700",
    text: "text-blue-800 dark:text-blue-200"
  }
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Memicu animasi fade-in saat komponen mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Fungsi untuk menutup toast dengan animasi fade-out
  const handleClose = () => {
    setIsVisible(false);
    // Tunggu animasi selesai sebelum memanggil onClose
    setTimeout(() => {
      onClose();
    }, 300); // Durasi harus sama dengan transition
  };

  const config = toastConfig[type] || toastConfig.info;

  return (
    <div
      className={`relative w-full max-w-sm p-4 pr-10 rounded-lg shadow-lg border ${config.style} transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          {config.icon}
        </div>
        <div className="ml-3">
          <p className={`text-sm font-semibold ${config.text}`}>
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;