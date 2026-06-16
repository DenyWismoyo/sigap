// Lokasi: src/app/dashboard/dokumen/components/RepositoryList.tsx
// [OPTIMASI FASE 2] Virtualisasi Daftar Dokumen.
// Menggunakan @tanstack/react-virtual untuk merender daftar panjang secara efisien.
// Hanya item yang terlihat di layar yang akan dirender di DOM.

"use client";

import React, { useRef } from 'react';
import { DokumenFolder, DokumenLink } from '@/types';
import { FolderSearch, Loader2 } from 'lucide-react';
import RepositoryItem from './RepositoryItem';
import { useVirtualizer } from '@tanstack/react-virtual';

type RepositoryItemCombined = (DokumenFolder & { type: 'folder' }) | (DokumenLink & { type: 'link' });

interface RepositoryListProps {
  items: RepositoryItemCombined[];
  users: Map<string, string>;
  loading: boolean;
  canManageItem: (item: RepositoryItemCombined) => boolean;
  onItemClick: (item: RepositoryItemCombined) => void;
  canShare: boolean;
  onRename: (item: RepositoryItemCombined) => void;
  onShare: (item: RepositoryItemCombined) => void;
  onDelete: (item: RepositoryItemCombined) => void;
  onCopyLink: (url: string) => void;
  onDragStart: (e: React.DragEvent<HTMLElement>, item: RepositoryItemCombined) => void;
  onDragEnd: (e: React.DragEvent<HTMLElement>) => void;
  onDropOnFolder: (e: React.DragEvent<HTMLElement>, targetFolderId: string | null) => void;
  searchTerm: string;
}

const RepositoryList: React.FC<RepositoryListProps> = ({
  items, users, loading, canManageItem, onItemClick,
  canShare, onRename, onShare, onDelete, onCopyLink,
  onDragStart, onDragEnd, onDropOnFolder, searchTerm
}) => {
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Inisialisasi Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimasi tinggi per baris (px)
    overscan: 5, // Render 5 item tambahan di luar viewport (buffer)
  });

  if (loading) {
    return (
      <div className="text-center p-8">
        <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Memuat item...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground py-16 bg-card rounded-lg border border-dashed border-border">
        <FolderSearch className="h-16 w-16" />
        <p className="mt-4 text-lg font-semibold">{searchTerm ? "Item tidak ditemukan" : "Folder ini kosong"}</p>
        <p className="text-sm">{searchTerm ? "Coba kata kunci lain." : "Tambahkan folder atau dokumen baru."}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border flex flex-col h-[calc(100vh-250px)]">
      {/* Header Tetap (Sticky) */}
      <div className="grid grid-cols-12 gap-4 p-3 bg-muted text-xs font-semibold text-muted-foreground uppercase border-b border-border shrink-0 pr-6">
          <div className="col-span-8 md:col-span-6">Nama</div>
          <div className="col-span-2 md:col-span-3">Pembuat</div>
          <div className="col-span-2 md:col-span-3">Tgl. Dibuat</div>
      </div>

      {/* Area Scroll Virtual */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-y-auto"
        // Handler drop di area kosong untuk pindah ke root folder saat ini
        onDragOver={(e) => e.preventDefault()} 
        onDrop={(e) => onDropOnFolder(e as any, null)}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="border-b border-border last:border-0"
              >
                <RepositoryItem
                  item={item}
                  user={users.get(item.createdBy)}
                  canManage={canManageItem(item)}
                  onClick={() => onItemClick(item)}
                  canShare={canShare}
                  onRename={() => onRename(item)}
                  onShare={() => onShare(item)}
                  onDelete={() => onDelete(item)}
                  onCopyLink={(url: string) => onCopyLink(url)}
                  onDragStart={(e) => onDragStart(e, item)}
                  onDragEnd={onDragEnd}
                  onDropOnFolder={(e) => onDropOnFolder(e, item.type === 'folder' ? item.id! : null)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RepositoryList;