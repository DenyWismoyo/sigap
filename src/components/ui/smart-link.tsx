// Directory: src/components/ui/smart-link.tsx
// History Update:
// - [BARU] Komponen wrapper untuk Next/Link.
// - Menambahkan trigger NProgress saat diklik.
// - Memastikan prefetch aktif.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import NProgress from "nprogress";

interface SmartLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}

export default function SmartLink({ 
  href, 
  children, 
  className, 
  activeClassName = "bg-accent text-accent-foreground",
  onClick 
}: SmartLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  // Hentikan progress bar saat pathname berubah (navigasi selesai)
  useEffect(() => {
    NProgress.done();
  }, [pathname]);

  const handleClick = () => {
    if (pathname !== href) {
       NProgress.start();
    }
    if (onClick) onClick();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "transition-colors duration-200", // Smooth color transition
        className,
        isActive && activeClassName
      )}
      prefetch={true} // Memaksa prefetch resource halaman tujuan
    >
      {children}
    </Link>
  );
}