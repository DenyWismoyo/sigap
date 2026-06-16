// Lokasi: src/context/UIContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

interface UIContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGlobalLoading, setGlobalLoading] = useState(false);

  // Gunakan useCallback agar referensi fungsi stabil
  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // Gunakan useMemo agar objek value tidak dibuat ulang setiap render
  // kecuali state berubah
  const value = useMemo(() => ({
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    isGlobalLoading,
    setGlobalLoading,
  }), [isSidebarOpen, isGlobalLoading, toggleSidebar, closeSidebar]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};