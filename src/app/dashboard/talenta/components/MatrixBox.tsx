/**
 * Directory: src/app/dashboard/talenta/components/MatrixBox.tsx
 * History Update:
 * - 2024-11-27: Extracted from main page for modularity.
 * - 2024-11-27: Added support for custom click handlers.
 * - 2024-11-28: Added header info.
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TalentAssessment } from '@/app/dashboard/hooks/useTalentData';
import { UserProfile } from '@/types';

interface MatrixBoxProps {
    number: number;
    data: { user: UserProfile; assessment?: TalentAssessment }[];
    onSelect: (user: UserProfile, assessment?: TalentAssessment) => void;
    label: string;
    color: string;
    isStar?: boolean;
}

export const MatrixBox = ({ number, data, onSelect, label, color, isStar }: MatrixBoxProps) => {
    return (
        <div className={`h-64 border rounded-lg p-3 flex flex-col relative ${color} ${isStar ? 'ring-2 ring-purple-500 ring-offset-2 shadow-lg' : ''}`}>
            <div className="flex justify-between items-start mb-2 border-b border-black/10 pb-2">
                <div className="flex items-center gap-2">
                    <div className="bg-white/80 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{number}</div>
                    <span className="font-bold text-xs uppercase opacity-80 tracking-wide">{label}</span>
                </div>
                <Badge variant="secondary" className="text-xs bg-white/50 hover:bg-white/80 text-black shadow-sm">{data.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1 pr-2">
                <div className="space-y-1.5">
                    {data.map(({ user, assessment }) => (
                        <div 
                            key={user.id} 
                            onClick={() => onSelect(user, assessment)}
                            className="flex items-center gap-2 p-1.5 bg-white/60 hover:bg-white rounded-md cursor-pointer transition-all text-xs shadow-sm border border-transparent hover:border-primary/30 group"
                        >
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 border border-primary/20">
                                {user.namaLengkap.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium truncate text-gray-900">{user.namaLengkap}</p>
                                <div className="flex justify-between text-[10px] text-gray-500">
                                    <span>K:{assessment?.nilaiKinerja || 0}</span>
                                    <span>P:{assessment?.nilaiPotensi || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <div className="h-full flex items-center justify-center opacity-30 text-xs italic pt-10">
                            Kosong
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="text-[9px] text-right text-muted-foreground mt-1 font-mono opacity-50 absolute bottom-2 right-2">Box {number}</div>
        </div>
    );
};