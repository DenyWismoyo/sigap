// Lokasi: src/components/ui/network-status.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set status awal
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-red-500 text-white text-xs font-medium w-full z-[60] relative overflow-hidden"
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
            <WifiOff size={14} className="animate-pulse" />
            <span>Anda sedang offline. Perubahan akan disimpan secara lokal dan disinkronkan saat online.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}