import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, subDays, format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string; // Asumsi ada field ini atau kita ambil dari user profile
  timestamp: any;
  module?: string;
}

export interface UserStat {
  userId: string;
  userName: string;
  actionCount: number;
  lastActive: Date;
}

export const useMonitoringData = () => {
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [dailyStats, setDailyStats] = useState<{ date: string; count: number }[]>([]);
  const [topUsers, setTopUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Ambil 100 log aktivitas terakhir untuk tabel & analisa cepat
      const logsRef = collection(db, 'activity_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      
      const logs: ActivityLog[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];

      setRecentLogs(logs);

      // 2. Hitung Statistik Harian (7 Hari Terakhir dari data yang diambil)
      // Catatan: Untuk produksi skala besar, sebaiknya gunakan agregasi server-side
      const statsMap = new Map<string, number>();
      const userMap = new Map<string, UserStat>();

      // Inisialisasi 7 hari terakhir dengan 0
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dateKey = format(d, 'dd MMM', { locale: id });
        statsMap.set(dateKey, 0);
      }

      logs.forEach(log => {
        // Proses Harian
        if (log.timestamp) {
          const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
          const dateKey = format(date, 'dd MMM', { locale: id });
          if (statsMap.has(dateKey)) {
            statsMap.set(dateKey, (statsMap.get(dateKey) || 0) + 1);
          }

          // Proses Top User
          const currentStat = userMap.get(log.userId) || {
            userId: log.userId,
            userName: log.userName || 'User', // Fallback jika nama tidak tersimpan di log
            actionCount: 0,
            lastActive: date
          };
          
          currentStat.actionCount += 1;
          // Update last active jika tanggal log lebih baru
          if (date > currentStat.lastActive) {
            currentStat.lastActive = date;
          }
          userMap.set(log.userId, currentStat);
        }
      });

      // Format Data untuk Grafik
      const chartData = Array.from(statsMap.entries()).map(([date, count]) => ({
        date,
        count
      }));
      setDailyStats(chartData);

      // Format Data untuk Leaderboard (Sort by action count)
      const leaderboard = Array.from(userMap.values())
        .sort((a, b) => b.actionCount - a.actionCount)
        .slice(0, 5); // Ambil top 5
      
      setTopUsers(leaderboard);

    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { recentLogs, dailyStats, topUsers, loading, refresh: fetchData };
};