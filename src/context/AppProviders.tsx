// Lokasi: src/context/AppProviders.tsx
// [UPDATE] Menambahkan NotificationProvider

"use client";

import React, { ReactNode } from "react";
import { AuthContextProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import ReactQueryProvider from "@/lib/react-query-provider";
import { UIProvider } from "@/context/UIContext"; 
import { NotificationProvider } from "@/context/NotificationContext"; // Import baru

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <ReactQueryProvider>
      <ToastProvider>
        <AuthContextProvider>
            {/* Notification butuh data User dari Auth, jadi ditaruh di dalamnya */}
            <NotificationProvider>
                <ThemeProvider>
                    <UIProvider>
                        {children}
                    </UIProvider>
                </ThemeProvider>
            </NotificationProvider>
        </AuthContextProvider>
      </ToastProvider>
    </ReactQueryProvider>
  );
}