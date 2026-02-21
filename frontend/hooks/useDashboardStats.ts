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

    const fetchStats = async () => {
        setLoading(true);
        try {
            let studentCount = 0;
            let teacherCount = 0;
            let subjectCount = 0;
            let totalRevenue = 0;

            // Fetch Counts
            const [
                { count: students },
                { count: teachers },
                { count: subjects }
            ] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
                supabase.from('subjects').select('*', { count: 'exact', head: true })
            ]);

            studentCount = students || 0;
            teacherCount = teachers || 0;
            subjectCount = subjects || 0;

            // Fetch Revenue & Breakdown (Last 30 days for trend, 7 days for chart)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: transactions, error: transError } = await supabase
                .from('financial_transactions')
                .select('amount, date')
                .eq('type', 'fee_payment')
                .eq('direction', 'inflow')
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            if (transError) {
                console.error('Error fetching transactions:', transError);
            } else {
                totalRevenue = transactions?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

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

            const exchangeRate = rates.KES; 
            const totalRevenueKES = totalRevenue * exchangeRate;

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
                    label: "Subjects",
                    value: subjectCount.toString(),
                    icon: "book",
                    color: "purple",
                },
                {
                    label: "Revenue",
                    value: formatKES(totalRevenueKES),
                    subValue: formatUSD(totalRevenue),
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

    const { isInitializing, session } = useAuth(); // Import useAuth to check session status

    useEffect(() => {
        if (isInitializing || !session) return;

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

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(userChannel);
            supabase.removeChannel(subjectChannel);
            supabase.removeChannel(transactionChannel);
        };
    }, [isInitializing, session]);

    return { stats, loading, revenueData, refresh: fetchStats };
};
