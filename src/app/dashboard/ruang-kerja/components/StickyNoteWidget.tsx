// Lokasi: src/app/dashboard/ruang-kerja/components/StickyNoteWidget.tsx
// [UPDATE TAMPILAN] 
// - Mengubah layout menjadi Masonry (columns-2) agar tinggi kartu dinamis sesuai konten.
// - Menghapus 'aspect-square' agar kartu tidak dipaksa persegi.
// - Menambahkan 'break-inside-avoid' agar kartu tidak terpotong antar kolom.

"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

// Tipe data Note
interface Note {
  id: string;
  content: string;
  color: "yellow" | "blue" | "green" | "pink" | "purple" | "orange";
  updatedAt: number;
}

const COLORS = {
  yellow: "bg-yellow-200 dark:bg-yellow-900/40 text-yellow-950 dark:text-yellow-100 border-yellow-300 dark:border-yellow-800",
  blue: "bg-blue-200 dark:bg-blue-900/40 text-blue-950 dark:text-blue-100 border-blue-300 dark:border-blue-800",
  green: "bg-green-200 dark:bg-green-900/40 text-green-950 dark:text-green-100 border-green-300 dark:border-green-800",
  pink: "bg-pink-200 dark:bg-pink-900/40 text-pink-950 dark:text-pink-100 border-pink-300 dark:border-pink-800",
  purple: "bg-purple-200 dark:bg-purple-900/40 text-purple-950 dark:text-purple-100 border-purple-300 dark:border-purple-800",
  orange: "bg-orange-200 dark:bg-orange-900/40 text-orange-950 dark:text-orange-100 border-orange-300 dark:border-orange-800",
};

const COLOR_OPTS = Object.keys(COLORS) as Array<keyof typeof COLORS>;

export default function StickyNoteWidget() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [tempContent, setTempContent] = useState("");
  const [tempColor, setTempColor] = useState<Note['color']>("yellow");

  useEffect(() => {
    const savedNotes = localStorage.getItem("sigap_sticky_notes");
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Gagal memuat catatan", e);
      }
    } else {
      setNotes([{
        id: "welcome",
        content: "Halo! 👋\nKlik tombol + untuk membuat note baru.",
        color: "yellow",
        updatedAt: Date.now()
      }]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("sigap_sticky_notes", JSON.stringify(notes));
    }
  }, [notes, isLoaded]);

  const openNewNoteModal = () => {
    const randomColor = COLOR_OPTS[Math.floor(Math.random() * COLOR_OPTS.length)];
    setEditingNote(null); 
    setTempContent("");
    setTempColor(randomColor);
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setTempContent(note.content);
    setTempColor(note.color);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!tempContent.trim()) {
        setIsModalOpen(false);
        return;
    }

    if (editingNote) {
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, content: tempContent, color: tempColor, updatedAt: Date.now() } : n));
    } else {
        const newNote: Note = {
            id: crypto.randomUUID(),
            content: tempContent,
            color: tempColor,
            updatedAt: Date.now()
        };
        setNotes(prev => [newNote, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (editingNote?.id === id) setIsModalOpen(false);
  };

  if (!isLoaded) return null;

  return (
    <div className="h-full flex flex-col w-full">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-2 px-1 flex-shrink-0">
         <div className="text-xs text-muted-foreground italic">
            {notes.length} catatan
         </div>
         <Button onClick={openNewNoteModal} size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-accent rounded-full">
            <Plus className="h-4 w-4" />
         </Button>
      </div>

      {/* Grid Notes (Masonry Layout) */}
      <ScrollArea className="flex-1 h-full w-full pr-3">
        {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 min-h-[200px]">
                <PenLine size={24} className="mb-2 opacity-50"/>
                <p className="text-xs font-medium">Belum ada catatan</p>
                <Button variant="link" onClick={openNewNoteModal} className="mt-1 h-auto p-0 text-xs">Buat sekarang</Button>
            </div>
        ) : (
            // Menggunakan columns-2 untuk efek masonry (air terjun), bukan grid-cols-2
            <div className="columns-2 gap-2 pb-2 space-y-2">
                <AnimatePresence mode="popLayout">
                    {notes.map((note) => (
                        <motion.div
                            key={note.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.02, zIndex: 10 }}
                            onClick={() => openEditModal(note)}
                            className={cn(
                                // Hapus 'aspect-square', tambah 'break-inside-avoid', 'mb-2', 'inline-block'
                                "relative w-full p-3 rounded-lg shadow-sm cursor-pointer border transition-shadow hover:shadow-md break-inside-avoid mb-2 inline-block overflow-hidden group",
                                COLORS[note.color]
                            )}
                        >
                            <div className="text-xs font-medium whitespace-pre-wrap leading-relaxed pointer-events-none">
                                {note.content}
                            </div>
                            {/* Tombol Hapus Cepat */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/5 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                title="Hapus"
                            >
                                <Trash2 size={10} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
      </ScrollArea>

      {/* Modal Edit/Tambah */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={cn("sm:max-w-md border-2", COLORS[tempColor].split(' ')[2])}>
            <DialogHeader>
                <DialogTitle>{editingNote ? 'Edit Catatan' : 'Tulis Catatan Baru'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
                <div className="flex gap-2 justify-center">
                    {COLOR_OPTS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setTempColor(c)}
                            className={cn(
                                "w-6 h-6 rounded-full border-2 transition-transform",
                                COLORS[c].split(' ')[0], 
                                tempColor === c ? "border-black dark:border-white scale-110 shadow-sm" : "border-transparent hover:scale-110"
                            )}
                            title={c}
                        />
                    ))}
                </div>
                
                <Textarea 
                    value={tempContent}
                    onChange={(e) => setTempContent(e.target.value)}
                    placeholder="Tulis sesuatu..."
                    className={cn("min-h-[200px] text-base border-none focus-visible:ring-0 resize-none p-4 rounded-xl shadow-inner", COLORS[tempColor])}
                    style={{ boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' }}
                    autoFocus
                />
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center gap-2">
                {editingNote ? (
                    <Button type="button" variant="destructive" size="icon" onClick={() => handleDelete(editingNote.id)}>
                        <Trash2 size={18} />
                    </Button>
                ) : <div />}
                
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
                    <Button type="button" onClick={handleSave}>Simpan</Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}