// Lokasi: src/components/ui/route-progress.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteProgress() {
  const [isAnimating, setIsAnimating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Setiap kali pathname atau searchParams berubah, itu berarti navigasi selesai.
    // Kita hentikan animasi.
    setIsAnimating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Tangkap semua klik pada elemen <a>
    const handleAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (
        anchor &&
        anchor.href &&
        anchor.target !== "_blank" &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.href.includes("#") && // Abaikan anchor links
        anchor.href !== window.location.href // Abaikan link ke halaman yang sama
      ) {
        setIsAnimating(true);
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  if (!isAnimating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent pointer-events-none">
      <div className="h-full bg-blue-600 animate-progress-indeterminate origin-left" />
      <style jsx global>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 0; }
          100% { width: 100%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}