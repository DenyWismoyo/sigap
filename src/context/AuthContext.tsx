// Lokasi: src/context/AuthContext.tsx
// [OPTIMASI PERFORMA]
// - Menghapus fetching `opdTemplatList` (Dipindahkan ke hook terpisah).
// - AuthContext sekarang hanya fokus pada Identitas User & Konfigurasi Dasar.
// - Load time aplikasi akan jauh lebih cepat.

"use client";

import { useContext, createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User, UserCredential, signInWithCustomToken } from 'firebase/auth';
import { db, auth, functions } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, Timestamp
} from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { useQueryClient } from '@tanstack/react-query';

import { 
  UserProfile, Jabatan, OpdConfig
} from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  jabatanProfile: Jabatan | null;
  pltJabatanList: Jabatan[];
  actingJabatanProfile: Jabatan | null;
  opdConfig: OpdConfig | null;
  // [DIHAPUS] opdTemplatList tidak lagi di sini
  loading: boolean;
  isImpersonating: boolean;
  originalUserUid: string | null;
  
  logIn: (email: string, pass: string) => Promise<UserCredential>;
  logInWithNip: (nip: string, pass: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
  setActingJabatan: (jabatanId: string | null) => void;
  // Ekspor fungsi signInWithCustomToken agar bisa dipakai di komponen Login
  signInWithToken: (token: string) => Promise<UserCredential>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthContextProviderProps {
    children: ReactNode;
}

export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [jabatanProfile, setJabatanProfile] = useState<Jabatan | null>(null);
  const [pltJabatanList, setPltJabatanList] = useState<Jabatan[]>([]);
  const [actingJabatanProfile, setActingJabatanProfile] = useState<Jabatan | null>(null);
  const [opdConfig, setOpdConfig] = useState<OpdConfig | null>(null);
  const [loading, setLoading] = useState(true); 
  
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUserUid, setOriginalUserUid] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const defaultFeatures: OpdConfig['features'] = {
    aiSuratReader: false, aiNotulensi: false, analitika: false,
    manajemenAset: false, persetujuanDraf: false, formBuilder: false
  };

  const logIn = async (email: string, pass: string): Promise<UserCredential> => {
    // Logika login email tetap sama...
    let nip: string;
    try {
      const checkAdminEmail = httpsCallable(functions, 'checkAdminEmail');
      const adminResult: any = await checkAdminEmail({ email });
      nip = adminResult.data.nip;
      if (!nip) throw new Error("Gagal mendapatkan NIP dari email admin.");
    } catch (error: any) {
      throw new Error(error.message || "Gagal memvalidasi email admin.");
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const setNipClaim = httpsCallable(functions, 'setNipClaim');
    await setNipClaim({ nip });
    await userCredential.user.getIdToken(true); 
    return userCredential;
  };

  const logInWithNip = async (nip: string, pass: string): Promise<UserCredential> => {
    // Logika login NIP tetap sama...
    if (!nip || !pass) throw new Error("NIP dan password tidak boleh kosong.");
    let email = '';
    try {
      const getEmailFromNip = httpsCallable(functions, 'getEmailFromNip');
      const result: any = await getEmailFromNip({ nip });
      email = result.data.email;
    } catch (error: any) {
      throw new Error(error.message || "Gagal mengambil data email dari NIP.");
    }
    if (!email) throw new Error("Data email tidak ditemukan untuk NIP tersebut.");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const setNipClaim = httpsCallable(functions, 'setNipClaim');
    await setNipClaim({ nip });
    await userCredential.user.getIdToken(true);
    return userCredential;
  };

  // [BARU] Wrapper untuk sign in dengan token (impersonate)
  const signInWithToken = async (token: string): Promise<UserCredential> => {
      return await signInWithCustomToken(auth, token);
  }

  const logOut = useCallback(async () => {
    // Bersihkan Cache & LocalStorage
    queryClient.removeQueries(); 
    queryClient.clear();
    
    if (typeof window !== 'undefined') {
        localStorage.removeItem('notulensi_draft_isi');
        // Bersihkan draft disposisi
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('disposisi_draft_')) localStorage.removeItem(key);
        });
    }

    // Reset State
    setUser(null);
    setUserProfile(null);
    setJabatanProfile(null);
    setPltJabatanList([]);
    setActingJabatanProfile(null);
    setOpdConfig(null);
    // opdTemplatList dihapus
    setIsImpersonating(false);
    setOriginalUserUid(null);
    
    await signOut(auth);
  }, [queryClient]);

  const setActingJabatan = useCallback((jabatanId: string | null) => {
    if (!jabatanId || jabatanId === jabatanProfile?.id) {
        setActingJabatanProfile(jabatanProfile);
    } else {
        const actingRole = pltJabatanList.find(j => j.id === jabatanId);
        if (actingRole) setActingJabatanProfile(actingRole);
    }
    // Invalidate queries agar data (surat/tugas) menyesuaikan jabatan baru
    queryClient.invalidateQueries();
  }, [jabatanProfile, pltJabatanList, queryClient]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const idTokenResult = await currentUser.getIdTokenResult();
        if (idTokenResult.claims.impersonated && idTokenResult.claims.originalUid) {
          setIsImpersonating(true);
          setOriginalUserUid(idTokenResult.claims.originalUid as string);
        } else {
          setIsImpersonating(false);
          setOriginalUserUid(null);
        }
      } else {
        // Jika tidak ada user, stop loading
        setIsImpersonating(false);
        setOriginalUserUid(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [logOut]);

  useEffect(() => {
    if (!user) return;

    const fetchUserAndOpdData = async () => {
        setLoading(true);
        let profile: UserProfile | null = null;
        let nip: string | undefined;

        const idTokenResult = await user.getIdTokenResult();
        nip = idTokenResult.claims.nip as string | undefined;
        
        if (!nip) {
            // Fallback cari manual jika custom claim belum siap
            const q = query(collection(db, "users"), where("uid", "==", user.uid));
            const userQuerySnapshot = await getDocs(q);
            if (!userQuerySnapshot.empty) {
                nip = userQuerySnapshot.docs[0].id;
            }
        }

        if (!nip) {
            await logOut();
            setLoading(false);
            return;
        }

        try {
            // 1. Ambil Profil User
            const userDocRef = doc(db, "users", nip);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().uid === user.uid) {
                profile = { id: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
            } else { throw new Error("Profil tidak ditemukan."); }
        
            if (profile.status === 'nonaktif') { await logOut(); setLoading(false); return; }
            setUserProfile(profile);
            
            // 2. Ambil Config OPD (Untuk Feature Flag & Kuota)
            const configRef = doc(db, 'opdConfigs', profile.opdId);
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                const dbData = configSnap.data() as OpdConfig;
                setOpdConfig({ id: configSnap.id, ...dbData, features: { ...defaultFeatures, ...dbData.features } } as OpdConfig);
            } else {
                setOpdConfig({ packageName: 'Dasar', langgananAktifHingga: Timestamp.fromMillis(0), paymentStatus: 'Kedaluwarsa', kuotaPengguna: 0, penggunaAktifSaatIni: 0, features: defaultFeatures });
            }
            
            // 3. Ambil Jabatan & PLT (Penting untuk hak akses)
            const pltQuery = query(collection(db, 'jabatan'), where("opdId", "==", profile.opdId), where("pltUserId", "==", user.uid), where("pltMulaiTanggal", "<=", Timestamp.now()));
            
            // [OPTIMASI] Hapus request `instruksiTemplat` dari sini!
            const [jabatanSnap, pltSnapshot] = await Promise.all([
                profile.jabatanId ? getDoc(doc(db, 'jabatan', profile.jabatanId)) : null,
                getDocs(pltQuery)
            ]);

            let definitif: Jabatan | null = null;
            if (jabatanSnap && jabatanSnap.exists()) {
                definitif = { id: jabatanSnap.id, ...jabatanSnap.data() } as Jabatan;
                setJabatanProfile(definitif);
                setActingJabatanProfile(definitif); 
            }

            const now = Timestamp.now();
            const activePltRoles = pltSnapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Jabatan))
                .filter(j => j.pltSelesaiTanggal && j.pltSelesaiTanggal.toMillis() >= now.toMillis());
                
            setPltJabatanList(activePltRoles);
            
            // [DIHAPUS] setOpdTemplatList(...) tidak lagi dilakukan disini.

        } catch (error: any) {
             console.error("Error fetching user data:", error);
             if (!isImpersonating) await logOut();
        } finally { setLoading(false); }
    };
    
    fetchUserAndOpdData();
  }, [user, logOut, isImpersonating]);

  return (
    <AuthContext.Provider value={{
        user, userProfile, jabatanProfile, pltJabatanList, actingJabatanProfile,
        opdConfig, 
        // opdTemplatList dihapus dari value
        loading, logIn, logInWithNip, logOut, setActingJabatan,
        isImpersonating, originalUserUid, signInWithToken
    }}>
      {children} 
    </AuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useUserAuth must be used within an AuthContextProvider");
  return context;
};