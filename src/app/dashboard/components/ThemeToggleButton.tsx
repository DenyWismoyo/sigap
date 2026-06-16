// Lokasi: src/app/dashboard/components/ThemeToggleButton.tsx
// [PERBAIKAN DARK MODE]
// - Mengganti kelas manual dengan kelas semantik shadcn/ui.
// - 'text-gray-500 dark:text-gray-400' -> 'text-muted-foreground'
// - 'hover:bg-gray-100 dark:hover:bg-slate-800' -> 'hover:bg-accent'

"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      // [PERBAIKAN DARK MODE]
      className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}