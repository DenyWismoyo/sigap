/**
 * Directory: src/app/dashboard/hooks/useSuccessionData.ts
 * History Update:
 * - 2024-11-28: Created hook to manage succession positions (Real Data).
 * - Connects to 'succession_positions' collection in Firestore.
 */

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TargetPosition } from '../talenta/data/succession-constants';
import { useUserAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export const useSuccessionData = () => {
    const { userProfile } = useUserAuth();
    const { addToast } = useToast();
    
    const [positions, setPositions] = useState<TargetPosition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);

    useEffect(() => {
        if (!userProfile?.opdId) {
            setPositions([]);
            setIsLoading(false);
            return;
        }

        // Subscribe ke data suksesi per OPD
        const q = query(collection(db, 'succession_positions'), where('opdId', '==', userProfile.opdId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TargetPosition));
            setPositions(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching succession positions:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile?.opdId]);

    const addPosition = async (data: Omit<TargetPosition, 'id' | 'opdId'>) => {
        if (!userProfile?.opdId) return;
        setIsMutating(true);
        try {
            await addDoc(collection(db, 'succession_positions'), {
                ...data,
                opdId: userProfile.opdId,
                createdAt: new Date()
            });
            addToast("Proyeksi jabatan berhasil ditambahkan.", "success");
            return true;
        } catch (error) {
            console.error("Error adding position:", error);
            addToast("Gagal menambahkan proyeksi.", "error");
            return false;
        } finally {
            setIsMutating(false);
        }
    };

    const updatePosition = async (id: string, data: Partial<TargetPosition>) => {
        setIsMutating(true);
        try {
            await updateDoc(doc(db, 'succession_positions', id), data);
            addToast("Proyeksi jabatan diperbarui.", "success");
            return true;
        } catch (error) {
            console.error("Error updating position:", error);
            addToast("Gagal memperbarui proyeksi.", "error");
            return false;
        } finally {
            setIsMutating(false);
        }
    };

    const deletePosition = async (id: string) => {
        setIsMutating(true);
        try {
            await deleteDoc(doc(db, 'succession_positions', id));
            addToast("Proyeksi jabatan dihapus.", "success");
            return true;
        } catch (error) {
            console.error("Error deleting position:", error);
            addToast("Gagal menghapus proyeksi.", "error");
            return false;
        } finally {
            setIsMutating(false);
        }
    };

    return { 
        positions, 
        isLoading, 
        isMutating,
        addPosition, 
        updatePosition, 
        deletePosition 
    };
};