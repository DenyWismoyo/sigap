// Lokasi: src/app/dashboard/components/Avatar.tsx
// Komponen baru untuk menampilkan inisial pengguna dengan latar belakang berwarna.

import React from 'react';

interface AvatarProps {
  name: string;
  className?: string;
}

// Fungsi sederhana untuk menghasilkan warna konsisten berdasarkan nama
const generateColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 80%)`;
  const textColor = `hsl(${hash % 360}, 60%, 30%)`;
  return { backgroundColor: color, color: textColor };
};


const Avatar = ({ name, className = 'w-8 h-8' }: AvatarProps) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const { backgroundColor, color } = generateColor(name || '');

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${className}`}
      style={{ backgroundColor, color }}
    >
      {initial}
    </div>
  );
};

export default Avatar;
