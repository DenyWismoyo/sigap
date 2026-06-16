// Lokasi: src/context/ThemeContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type FontSize = 'small' | 'normal' | 'large';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');

  useEffect(() => {
    // Inisialisasi tema (terang/gelap)
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.add(initialTheme);

    // Inisialisasi ukuran font
    const storedFontSize = localStorage.getItem('fontSize') as FontSize | null;
    if (storedFontSize) {
      setFontSizeState(storedFontSize);
      document.documentElement.classList.add(`font-size-${storedFontSize}`);
    } else {
      document.documentElement.classList.add('font-size-normal');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove(theme);
    document.documentElement.classList.add(newTheme);
  };
  
  // Fungsi ini tetap sama, hanya menambahkan/menghapus kelas pada elemen <html>
  const setFontSize = (size: FontSize) => {
    document.documentElement.classList.remove(`font-size-${fontSize}`);
    document.documentElement.classList.add(`font-size-${size}`);
    setFontSizeState(size);
    localStorage.setItem('fontSize', size);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

