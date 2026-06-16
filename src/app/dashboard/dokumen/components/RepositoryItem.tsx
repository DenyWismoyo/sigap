// Lokasi: src/app/dashboard/dokumen/components/RepositoryItem.tsx
// [PERBAIKAN] 
// - Mengupdate tipe onDragEnd agar menerima parameter event (e).
// - Mengubah tipe generic DragEvent menjadi <HTMLElement> agar kompatibel dengan tr dan div.

"use client";

import React, { useState } from 'react';
import { DokumenFolder, DokumenLink, DocumentIconType } from "@/types";
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileVideo,
  FileImage,
  FileArchive,
  Link as LinkIcon,
  Users,
  ExternalLink,
  Copy,
  Pencil,
  Share2,
  Move,
  Trash2,
} from "lucide-react";

// --- Impor Komponen Shadcn ---
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
// --- Akhir Impor Shadcn ---

// Tipe gabungan dari page.tsx
type RepositoryItemCombined = (DokumenFolder & { type: 'folder' }) | (DokumenLink & { type: 'link' });

interface RepositoryItemProps {
  item: RepositoryItemCombined;
  user?: string; // NamaLengkap pembuat
  canManage: boolean;
  canShare: boolean;
  onClick: () => void;
  
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
  onCopyLink: (url: string) => void;
  
  // [PERBAIKAN] Ubah tipe generic ke HTMLElement dan tambahkan parameter 'e' di onDragEnd
  onDragStart: (e: React.DragEvent<HTMLElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLElement>) => void; 
  onDropOnFolder: (e: React.DragEvent<HTMLElement>) => void;
}

// Helper untuk mendapatkan ikon berdasarkan tipe
const getItemIcon = (
  tipe: 'folder' | 'link',
  tipeDokumen?: DocumentIconType
) => {
  if (tipe === "folder") {
    return <Folder className="h-5 w-5 text-yellow-500" />;
  }
  // Jika tipe 'link'
  switch (tipeDokumen) {
    case "sheet": return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    case "doc": return <FileText className="h-5 w-5 text-blue-500" />;
    case "pdf": return <FileText className="h-5 w-5 text-red-500" />;
    case "video": return <FileVideo className="h-5 w-5 text-purple-500" />;
    case "image": return <FileImage className="h-5 w-5 text-indigo-500" />;
    case "zip": return <FileArchive className="h-5 w-5 text-yellow-600" />;
    default: return <LinkIcon className="h-5 w-5 text-gray-500" />;
  }
};

const RepositoryItem: React.FC<RepositoryItemProps> = ({
  item,
  user,
  canManage,
  canShare,
  onClick,
  onRename,
  onShare,
  onDelete,
  onCopyLink,
  onDragStart,
  onDragEnd,
  onDropOnFolder
}) => {
  const [isDragged, setIsDragged] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const icon = getItemIcon(item.type, (item as DokumenLink).tipeDokumen);
  const nama = item.type === 'folder' ? item.namaFolder : item.namaDokumen;

  // [PERBAIKAN] Gunakan HTMLElement
  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    setIsDragged(true);
    onDragStart(e);
  };

  // [PERBAIKAN] Gunakan HTMLElement dan teruskan 'e' ke onDragEnd
  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    setIsDragged(false);
    onDragEnd(e); 
  };

  // [PERBAIKAN] Gunakan HTMLElement
  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'folder') {
      setIsDropTarget(true);
    }
  };
  
  // [PERBAIKAN] Gunakan HTMLElement
  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
  };
  
  // [PERBAIKAN] Gunakan HTMLElement
  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    setIsDropTarget(false);
    onDropOnFolder(e);
  };

  // Menentukan apakah item ini dibagikan oleh Super Admin
  const isShared = item.sharedWithOpdIds && item.sharedWithOpdIds.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <tr
          onClick={onClick}
          onContextMenu={(e) => e.preventDefault()} // Cegah context menu asli
          draggable={canManage}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-b dark:border-slate-700 
            ${canManage ? 'cursor-grab' : 'cursor-pointer'}
            ${isDragged ? 'opacity-40' : 'opacity-100'}
            ${isDropTarget ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}
            data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-slate-700
          `}
        >
          {/* Kolom Nama */}
          <td className="p-3 font-medium text-gray-800 dark:text-dark-text-primary">
            <div className="flex items-center gap-3">
              {icon}
              <span className="truncate">{nama}</span>
              {isShared && (
                <span title="Dibagikan oleh Admin Pusat">
                  <Users size={14} className="text-blue-500 flex-shrink-0" />
                </span>
              )}
            </div>
          </td>
          {/* Kolom Pembuat */}
          <td className="p-3 text-sm text-gray-600 dark:text-dark-text-secondary truncate">
            {user || (item.createdBy ? 'Pengguna Tdk Ditemukan' : '-')}
          </td>
          {/* Kolom Tgl. Dibuat */}
          <td className="p-3 text-sm text-gray-600 dark:text-dark-text-secondary whitespace-nowrap">
            {item.createdAt.toDate().toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </td>
        </tr>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent>
          {item.type === "link" && (
            <>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open((item as DokumenLink).url, '_blank'); }}>
                <ExternalLink className="mr-2 h-4 w-4" /> Buka di Tab Baru
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink((item as DokumenLink).url); }}>
                <Copy className="mr-2 h-4 w-4" /> Salin Tautan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {canManage && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Ganti Nama
              </DropdownMenuItem>
          )}
          {canShare && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
                  <Share2 className="mr-2 h-4 w-4" /> Bagikan...
              </DropdownMenuItem>
          )}
          {canManage && (
              <DropdownMenuItem disabled>
                  <Move className="mr-2 h-4 w-4" /> Pindahkan (Gunakan Drag & Drop)
              </DropdownMenuItem>
          )}
          {canManage && (
              <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600 focus:text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Hapus
                  </DropdownMenuItem>
              </>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RepositoryItem;