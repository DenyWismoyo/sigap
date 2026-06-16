// Lokasi: src/context/ToastContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Tipe untuk notifikasi
export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// Tipe untuk konteks
interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
}

// Konteks itu sendiri
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook untuk memicu toast (digunakan oleh halaman seperti profil/page.tsx)
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  // Hanya mengekspos fungsi addToast
  return { addToast: context.addToast };
};

// Provider untuk membungkus aplikasi
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Fungsi untuk menghapus toast
  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Fungsi untuk menambah toast baru
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    const newToast: Toast = { id, message, type };

    setToasts(prevToasts => [newToast, ...prevToasts]);

    // Hapus toast secara otomatis setelah 5 detik
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

// Hook untuk container (digunakan oleh layout.tsx)
// Mengekspos seluruh state (toasts dan fungsi remove)
export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext harus digunakan di dalam ToastProvider');
  }
  return context;
};