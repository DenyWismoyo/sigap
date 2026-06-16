/**
 * Directory: src/app/dashboard/talenta/data/succession-constants.ts
 * History Update:
 * - 2024-11-28: Added 'SuccessionWeights' interface for dynamic scoring.
 * - Updated 'TargetPosition' to include custom weights.
 */

export interface JobProfileStandard {
    level: string;
    minKinerja: number;
    minPotensi: number;
    description: string;
    tupoksiUtama: string[];
    requiredCompetencies: string[];
    indicators: string[]; 
}

// [BARU] Interface untuk Bobot Penilaian Dinamis
export interface SuccessionWeights {
    kinerja: number;   // Default 30%
    potensi: number;   // Default 30%
    kompetensi: number;// Default 25% (Gap Kompetensi)
    portofolio: number;// Default 15% (Diklat & Penghargaan)
}

export interface TargetPosition {
    id: string;
    opdId?: string;
    title: string;
    levelKey: string;
    risk: 'High' | 'Medium' | 'Low';
    isCustom?: boolean; 
    customProfile?: Partial<JobProfileStandard>;
    // [BARU] Field Bobot Kustom
    weights?: SuccessionWeights; 
}

// AI Knowledge Base untuk Profiling Otomatis
export const JOB_STANDARDS: Record<string, JobProfileStandard> = {
    'JPT Pratama': {
        level: 'JPT Pratama (Strategis)',
        minKinerja: 92,
        minPotensi: 90,
        description: "Memimpin penetapan visi strategis, kebijakan daerah, dan negosiasi lintas sektor.",
        tupoksiUtama: [
            "Merumuskan kebijakan strategis dinas/badan.",
            "Mengkoordinasikan pelaksanaan program prioritas daerah.",
            "Membangun jejaring kerjasama strategis."
        ],
        requiredCompetencies: ['Strategic Leadership', 'Political Savvy', 'Innovation', 'Visionary Thinking'],
        indicators: ["Persentase capaian target Renstra", "Indeks Reformasi Birokrasi", "Kepuasan Masyarakat"]
    },
    'Administrator': {
        level: 'Administrator (Manajerial)',
        minKinerja: 88,
        minPotensi: 85,
        description: "Menerjemahkan strategi menjadi rencana operasional dan memimpin eksekusi program.",
        tupoksiUtama: [
            "Menyusun rencana kerja operasional bidang.",
            "Memimpin manajemen sumber daya dan anggaran.",
            "Monitoring dan evaluasi kinerja tim teknis."
        ],
        requiredCompetencies: ['Operational Leadership', 'Planning & Organizing', 'Problem Solving', 'Team Building'],
        indicators: ["Realisasi Anggaran Bidang", "Kualitas Laporan Kinerja", "Efisiensi Proses Bisnis"]
    },
    'Pengawas': {
        level: 'Pengawas (Teknis Supervisi)',
        minKinerja: 85,
        minPotensi: 75,
        description: "Mengawasi pelaksanaan teknis kegiatan dan pelayanan langsung kepada masyarakat.",
        tupoksiUtama: [
            "Supervisi pelaksanaan kegiatan teknis harian.",
            "Penyusunan laporan teknis berkala.",
            "Pembinaan staf pelaksana."
        ],
        requiredCompetencies: ['Technical Expertise', 'Service Orientation', 'Discipline', 'Directing Others'],
        indicators: ["Ketepatan Waktu Pelayanan", "Akurasi Data Teknis", "Disiplin Tim"]
    },
    'Fungsional': {
        level: 'Fungsional Ahli',
        minKinerja: 80,
        minPotensi: 75,
        description: "Melakukan analisis dan kajian profesional sesuai keahlian spesifik.",
        tupoksiUtama: [
            "Melakukan kajian dan analisis teknis.",
            "Pengembangan metode dan inovasi pelayanan.",
            "Transfer knowledge ke rekan kerja."
        ],
        requiredCompetencies: ['Analytical Thinking', 'Continuous Learning', 'Quality Focus', 'Expertise'],
        indicators: ["Jumlah Angka Kredit", "Kualitas Kajian/Analisis", "Inovasi Metode"]
    }
};

export const INITIAL_POSITIONS: TargetPosition[] = [];