import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/libs/supabase';
import { StatsData } from '@/types/types';
import { useEffect, useState } from 'react';

export const useDashboardStats = () => {
    const [stats, setStats] = useState<StatsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<{ day: string, amount: number }[]>([]);
    
    const { formatKES, formatUSD, rates } = useCurrency();

    const { isInitializing, session, isDemo, profile } = useAuth(); // Import useAuth to check session status

    const fetchStats = async () => {
        if (!profile?.institution_id) {
            setStats([]);
            setRevenueData([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let studentCount = 0;
            let teacherCount = 0;
            let subjectCount = 0;
            // Stored transaction amounts are in KES in this codebase.
            // Keep a canonical KES total and only derive USD as a display conversion.
            let totalRevenueKES = 0;
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

            // Fetch Revenue & Breakdown (Last 30 days for trend, 7 days for chart)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            let transQuery = supabase
                .from('financial_transactions')
                .select('amount, date')
                .eq('type', 'fee_payment')
                .eq('direction', 'inflow')
                .eq('status', 'completed')
                .eq('institution_id', profile.institution_id)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            const { data: transactionsData, error: transError } = await transQuery;
            const transactions = transactionsData as { amount: number; date: string | null }[] | null;


            if (transError) {
                console.error('Error fetching transactions:', transError);
            } else {
                totalRevenueKES = transactions?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

                // Group by day for last 7 days chart
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });

                const breakdown = last7Days.map(day => ({
                    day: day.split('-').slice(1).reverse().join('/'), // DD/MM format
                    amount: transactions
                        ?.filter(t => t.date === day)
                        ?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0
                }));

                setRevenueData(breakdown);
            }

            const exchangeRate = rates.KES || 130;
            const totalRevenueUSD = totalRevenueKES / exchangeRate;

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
                    value: formatKES(totalRevenueKES),
                    subValue: formatUSD(totalRevenueUSD),
                    icon: "wallet",
                    color: "yellow",
                },
            ];
            setStats(statsData);
        } catch (e) {
            console.error('Exception in useDashboardStats:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isInitializing) return;

        if (!session) {
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
    }, [isInitializing, session]);

    return { stats, loading, revenueData, refresh: fetchStats };
};
