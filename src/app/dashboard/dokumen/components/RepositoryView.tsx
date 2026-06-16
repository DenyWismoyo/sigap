// Lokasi: src/app/dashboard/dokumen/components/RepositoryView.tsx
"use client";

import React from "react";
// [PERBAIKAN] Impor tipe DokumenFolder dan DokumenLink
import { DocumentIconType, DokumenFolder, DokumenLink } from "@/types"; 
import RepositoryItem from "./RepositoryItem";
import { FolderSearch } from "lucide-react";

// [PERBAIKAN] Hapus 'interface Item' lokal yang lama dan salah.
// ... interface Item lama dihapus ...

// [PERBAIKAN] Buat tipe gabungan yang benar
type RepositoryItemCombined = (DokumenFolder & { type: 'folder' }) | (DokumenLink & { type: 'link' });

interface RepositoryViewProps {
  items: RepositoryItemCombined[]; // [PERBAIKAN] Gunakan tipe yang benar
  loading: boolean;
  viewMode: "grid" | "list";
  onItemClick: (item: RepositoryItemCombined) => void; // [PERBAIKAN] Gunakan tipe yang benar
  // [PERBAIKAN] Hapus onRightClick dari props
  // onItemRightClick: (e: React.MouseEvent, item: RepositoryItemCombined) => void; 
  searchActive: boolean;
}

const RepositoryView: React.FC<RepositoryViewProps> = ({
  items,
  loading,
  viewMode,
  onItemClick,
  // [PERBAIKAN] Hapus onRightClick
  // onItemRightClick,
  searchActive,
}) => {
  if (loading) {
    // Skeleton loading bisa ditambahkan di sini
    return null;
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <FolderSearch className="h-16 w-16" />
        <p className="mt-4 text-lg">
          {searchActive ? "Item tidak ditemukan" : "Folder ini kosong"}
        </p>
        <p className="text-sm">
          {searchActive
            ? "Coba kata kunci lain."
            : "Silakan gunakan Mode Kustomisasi (tombol Pengaturan) untuk menambahkan folder atau link."}
        </p>
      </div>
    );
  }
  
  // Menggunakan div/button sebagai container drag & drop di page.tsx
  // Di sini hanya fokus pada tampilan list/grid item.

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            // [PERBAIKAN] Hapus onContextMenu (sudah ditangani di RepositoryItem)
            // onContextMenu={(e) => onItemRightClick(e, item)}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md dark:hover:bg-gray-700 transition-all cursor-pointer text-center"
          >
            <RepositoryItem
              item={item}
              // [PERBAIKAN] Hapus viewMode dari sini
              // viewMode={viewMode}
              onClick={() => onItemClick(item)}
              // [PERBAIKAN] Hapus onRightClick
              // onRightClick={(e) => onItemRightClick(e, item)}
              
              // [PERBAIKAN] Tambahkan prop dummy karena RepositoryItem mengharapkannya
              // Seharusnya RepositoryView tidak lagi digunakan, tapi kita perbaiki agar bisa build
              user={undefined}
              canManage={false}
              canShare={false}
              onRename={() => {}}
              onShare={() => {}}
              onDelete={() => {}}
              onCopyLink={() => {}}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              onDropOnFolder={() => {}}
            />
          </button>
        ))}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            // [PERBAIKAN] Hapus onContextMenu
            // onContextMenu={(e) => onItemRightClick(e, item)}
            className="flex items-center w-full p-3 rounded-md bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer text-left"
          >
            <RepositoryItem
              item={item}
              // [PERBAIKAN] Hapus viewMode dari sini
              // viewMode={viewMode}
              onClick={() => onItemClick(item)}
              // [PERBAIKAN] Hapus onRightClick
              // onRightClick={(e) => onItemRightClick(e, item)}
              
              // [PERBAIKAN] Tambahkan prop dummy
              user={undefined}
              canManage={false}
              canShare={false}
              onRename={() => {}}
              onShare={() => {}}
              onDelete={() => {}}
              onCopyLink={() => {}}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              onDropOnFolder={() => {}}
            />
          </button>
        ))}
      </div>
    );
  }

  return null;
};

export default RepositoryView;