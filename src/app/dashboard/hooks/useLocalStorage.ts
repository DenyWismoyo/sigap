// Lokasi: src/app/dashboard/hooks/useLocalStorage.ts
// [PERBAIKAN CRITICAL]
// - Menambahkan 'useCallback' pada 'setValue' dan 'removeValue'.
// - Ini MENCEGAH Infinite Loop (Maximum update depth exceeded) saat hook ini
//   digunakan di dalam useEffect komponen lain.

import { useState, useCallback } from 'react';

/**
 * Hook untuk menyimpan state ke localStorage.
 * Berguna untuk menyimpan draft form agar tidak hilang saat reload/tutup modal.
 * @param key Kunci unik untuk localStorage
 * @param initialValue Nilai awal
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // State lokal
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Fungsi setter yang juga update localStorage
  // [PERBAIKAN] Dibungkus useCallback agar referensi fungsi stabil
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prevValue) => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key]); // Dependensi hanya 'key'

  // Fungsi untuk menghapus dari localStorage
  // [PERBAIKAN] Dibungkus useCallback
  const removeValue = useCallback(() => {
    try {
        setStoredValue(initialValue);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
        }
    } catch (error) {
        console.error(error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}