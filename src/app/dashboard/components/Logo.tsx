// Lokasi: src/app/dashboard/components/Logo.tsx
import Image from 'next/image';
import logoSigap from '../../../logo-sigap.png';

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      <Image
        src={logoSigap}
        alt="Logo SIAP WFA"
        fill
        priority
        style={{ objectFit: 'contain' }}
        // [PERBAIKAN] Menambahkan prop sizes untuk menghilangkan peringatan Next.js
        sizes="100vw" 
      />
    </div>
  );
};

export default Logo;
