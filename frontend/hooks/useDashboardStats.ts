import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/libs/supabase';
import { RevenueService } from '@/services/RevenueService';
import { CacheService } from '@/services/CacheService';
import { StatsData } from '@/types/types';
import { useEffect, useState } from 'react';

export const useDashboardStats = () => {
    const [stats, setStats] = useState<StatsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<{ day: string, amount: number }[]>([]);
    
    const { formatAmount } = useCurrency();

    const { isInitializing, session, isDemo, profile } = useAuth(); // Import useAuth to check session status
    const requiresCredentialSetup = !!profile?.must_change_password || !!profile?.requires_security_questions_setup;
    const cacheKey = profile?.institution_id ? `admin_dashboard_stats_${profile.institution_id}` : null;

    const fetchStats = async () => {
        if (requiresCredentialSetup || !profile?.institution_id) {
            setStats([]);
            setRevenueData([]);
            setLoading(false);
            return;
        }

        // Try to hydrate from cache first to avoid blank UI
        if (cacheKey && stats.length === 0) {
            const cached = await CacheService.get<{ stats: StatsData[]; revenueData: { day: string; amount: number }[] }>(cacheKey, { allowStale: true });
            if (cached.data) {
                setStats(cached.data.stats || []);
                setRevenueData(cached.data.revenueData || []);
                setLoading(false);
            }
        }

        setLoading(true);
        try {
            let studentCount = 0;
            let teacherCount = 0;
            let subjectCount = 0;
            let totalRevenue = 0;
            let presentToday = 0;

            const getLocalDateString = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            const todayStr = getLocalDateString(new Date());

            let studentQuery = supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
            let teacherQuery = supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
            let subjectQuery = supabase.from('subjects').select('*', { count: 'exact', head: true });

            studentQuery = studentQuery.eq('institution_id', profile.institution_id);
            teacherQuery = teacherQuery.eq('institution_id', profile.institution_id);
            subjectQuery = subjectQuery.eq('institution_id', profile.institution_id);

            // Fetch Counts
            const [
                { count: students },
                { count: teachers },
                { count: subjects },
                { count: totalAttendanceEntries },
                { count: presentCount },
                { count: lateCount }
            ] = await Promise.all([
                studentQuery,
                teacherQuery,
                subjectQuery,
                supabase.from('attendance').select('*', { count: 'exact', head: true })
                    .eq('date', todayStr)
                    .eq('institution_id', profile?.institution_id || ''),
                supabase.from('attendance').select('*', { count: 'exact', head: true })
                    .eq('date', todayStr)
                    .eq('status', 'present')
                    .eq('institution_id', profile?.institution_id || ''),
                supabase.from('attendance').select('*', { count: 'exact', head: true })
                    .eq('date', todayStr)
                    .eq('status', 'late')
                    .eq('institution_id', profile?.institution_id || '')
            ]);

            studentCount = students || 0;
            teacherCount = teachers || 0;
            subjectCount = subjects || 0;
            presentToday = (presentCount || 0) + (lateCount || 0);
            
            const attendanceRate = studentCount > 0 ? Math.round((presentToday / studentCount) * 100) : 0;
            const absentCount = Math.max(0, studentCount - presentToday);
            const subValue = (totalAttendanceEntries && totalAttendanceEntries > 0)
                ? `${presentToday} present today (${absentCount} absent)`
                : "No data recorded today";

            try {
                const overview = await RevenueService.getOverview();
                totalRevenue = Number(overview?.net_revenue || 0);
                setRevenueData((overview?.last_7_days || []).map((row) => ({ day: row.day, amount: Number(row.net || 0) })));

                const paymentsCount = Number(overview?.payment_count || 0);

                const statsData: StatsData[] = [
                    {
                        label: "Total Students",
                        value: studentCount.toString(),
                        icon: "users",
                        color: "blue",
                    },
                    {
                        label: "Teachers",
                        value: teacherCount.toString(),
                        icon: "school",
                        color: "green",
                    },
                    {
                        label: "Attendance",
                        value: `${attendanceRate}%`,
                        subValue: subValue,
                        icon: "calendar",
                        color: "orange",
                    },
                    {
                        label: "Revenue",
                        value: formatAmount(totalRevenue),
                        subValue: `${paymentsCount} completed payments (net after deductions)`,
                        icon: "wallet",
                        color: "yellow",
                    },
                ];
                setStats(statsData);
                if (cacheKey) {
                    CacheService.set(cacheKey, { stats: statsData, revenueData }, 5 * 60 * 1000);
                }
            } catch (revenueError) {
                if ((revenueError as any)?.response?.status !== 401 && (revenueError as any)?.response?.status !== 428) {
                    console.error('Error fetching revenue overview:', revenueError);
                }
                setRevenueData([]);

                const statsData: StatsData[] = [
                    {
                        label: "Total Students",
                        value: studentCount.toString(),
                        icon: "users",
                        color: "blue",
                    },
                    {
                        label: "Teachers",
                        value: teacherCount.toString(),
                        icon: "school",
                        color: "green",
                    },
                    {
                        label: "Attendance",
                        value: `${attendanceRate}%`,
                        subValue: subValue,
                        icon: "calendar",
                        color: "orange",
                    },
                    {
                        label: "Revenue",
                        value: formatAmount(0),
                        subValue: "Revenue unavailable",
                        icon: "wallet",
                        color: "yellow",
                    },
                ];
                setStats(statsData);
                if (cacheKey) {
                    CacheService.set(cacheKey, { stats: statsData, revenueData: [] }, 5 * 60 * 1000);
                }
            }
        } catch (e) {
            console.error('Exception in useDashboardStats:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isInitializing) return;

        if (!session || requiresCredentialSetup) {
            setLoading(false);
            return;
        }

        fetchStats();

        // Use a ref-based timer for debouncing realtime updates
        let debounceTimer: any = null;
        const debouncedFetch = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchStats();
            }, 1000); // 1s debounce
        };

        // Real-time subscriptions
        const userChannel = supabase
            .channel('users-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                () => debouncedFetch()
            )
            .subscribe();

        const subjectChannel = supabase
            .channel('subjects-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'subjects' },
                () => debouncedFetch()
            )
            .subscribe();

        const transactionChannel = supabase
            .channel('transactions-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'financial_transactions' },
                () => debouncedFetch()
            )
            .subscribe();

        const attendanceChannel = supabase
            .channel('attendance-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance' },
                () => debouncedFetch()
            )
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(userChannel);
            supabase.removeChannel(subjectChannel);
            supabase.removeChannel(transactionChannel);
            supabase.removeChannel(attendanceChannel);
        };
    }, [isInitializing, session, requiresCredentialSetup]);

    return { stats, loading, revenueData, refresh: fetchStats };
};
