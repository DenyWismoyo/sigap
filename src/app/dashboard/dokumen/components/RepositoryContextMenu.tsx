// Lokasi: src/app/dashboard/dokumen/components/RepositoryContextMenu.tsx
// [MODIFIKASI REFACTOR (Tahap 3)]
// - Menambahkan opsi "Salin Tautan" (hanya untuk link).
// - Menambahkan opsi "Bagikan" (hanya untuk Super Admin).
// - Menambahkan pemisah visual.
// - Mengganti tipe 'item' ke tipe gabungan agar lebih spesifik.
// - Menyesuaikan `onAction` untuk mengirim event baru.

"use client";

import React, { useEffect, useRef } from "react";
// [MODIFIKASI] Hapus import RepositoryItem, gunakan tipe gabungan
import { DokumenFolder, DokumenLink } from "@/types";
// [MODIFIKASI] Impor ikon baru
import { Pencil, Trash2, Move, ExternalLink, Copy, Share2 } from "lucide-react";

// Tipe gabungan dari page.tsx
type RepositoryItemCombined = (DokumenFolder & { type: 'folder' }) | (DokumenLink & { type: 'link' });

interface ContextMenuProps {
  x: number;
  y: number;
  item: RepositoryItemCombined; // [MODIFIKASI] Tipe lebih spesifik
  onClose: () => void;
  // [MODIFIKASI] Tambahkan 'copyLink' dan 'share'
  onAction: (action: "rename" | "delete" | "move" | "copyLink" | "share") => void;
  canDelete: boolean;
  canUpdate: boolean;
  canShare: boolean; // [MODIFIKASI] Prop baru untuk izin berbagi
}

const RepositoryContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  onClose,
  onAction,
  canDelete,
  canUpdate,
  canShare, // [MODIFIKASI] Terima prop
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Menutup menu jika klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Menyesuaikan posisi agar tidak keluar layar
  const style: React.CSSProperties = {
    top: y,
    left: x,
    // Logika penyesuaian viewport bisa ditambahkan di sini jika perlu
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-50 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
    >
      <div className="py-1">
        {/* Opsi khusus Link */}
        {item.type === "link" && (
          <>
            <a
              href={(item as DokumenLink).url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={onClose}
            >
              <ExternalLink className="h-4 w-4 mr-3" />
              Buka di Tab Baru
            </a>
            {/* [MODIFIKASI] Tombol Salin Tautan */}
            <button
              onClick={() => onAction("copyLink")}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="h-4 w-4 mr-3" />
              Salin Tautan
            </button>
          </>
        )}

        {/* [MODIFIKASI] Pemisah */}
        {item.type === "link" && <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>}

        {/* Opsi Manajemen (jika diizinkan) */}
        {canUpdate && (
          <button
            onClick={() => onAction("rename")}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Pencil className="h-4 w-4 mr-3" />
            Ganti Nama
          </button>
        )}
        
        {/* [MODIFIKASI] Tombol Bagikan (Share) */}
        {canShare && (
          <button
            onClick={() => onAction("share")}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Share2 className="h-4 w-4 mr-3" />
            Bagikan...
          </button>
        )}

        {canUpdate && (
          <button
            onClick={() => onAction("move")} 
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Move className="h-4 w-4 mr-3" />
            Pindahkan (Drag & Drop)
          </button>
        )}

        {/* [MODIFIKASI] Pemisah */}
        {(canUpdate || canShare) && <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>}

        {canDelete && (
          <button
            onClick={() => onAction("delete")}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-3" />
            Hapus
          </button>
        )}
      </div>
    </div>
  );
};

export default RepositoryContextMenu;