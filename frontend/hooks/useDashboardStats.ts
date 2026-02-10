import { useEffect, useState } from 'react';
import { supabase } from '@/libs/supabase';
import { StatsData } from '@/types/types';

export const useDashboardStats = () => {
    const [stats, setStats] = useState<StatsData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                let studentCount = 0;
                let teacherCount = 0;
                let SubjectCount = 0;
                let totalRevenue = 0;

                // Fetch Total Students
                try {
                    const { count, error } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('role', 'student');
                    if (error) {
                        console.error('Error fetching student count:', JSON.stringify(error, null, 2));
                    } else {
                        studentCount = count || 0;
                    }
                } catch (e) {
                    console.error('Exception fetching student count:', e);
                }

                // Fetch Total Teachers
                try {
                    const { data, count, error } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('role', 'teacher');
                    if (error) {
                        console.error('Error fetching teacher count:', JSON.stringify(error, null, 2));
                    } else {

                        teacherCount = count || 0;
                    }
                } catch (e) {
                    console.error('Exception fetching teacher count:', e);
                }

                // Fetch Active Subjects
                try {
                    // Using .select('id', { count: 'exact' }).limit(0) as a highly compatible way to get counts
                    const { count, error } = await supabase
                        .from('subjects')
                        .select('id', { count: 'exact' })
                        .limit(0);

                    if (error) {
                        console.error('Error fetching Subject count:', JSON.stringify(error, null, 2));

                        // Diagnostic: Try to fetch one row to see if it gives a better error
                        const diag = await supabase.from('subjects').select('*').limit(1);
                        console.error('Diagnostic fetch for subjects:', JSON.stringify(diag.error, null, 2));
                    } else {
                        console.log('Fetched subject count:', count);
                        SubjectCount = count || 0;
                    }
                } catch (e) {
                    console.error('Exception fetching subject count:', e);
                }


                // Fetch Revenue (Sum of payments)
                try {
                    const { data: payments, error } = await supabase
                        .from('payments')
                        .select('amount')
                        .returns<{ amount: number }[]>();
                    if (error) {
                        console.error('Error fetching payments:', JSON.stringify(error, null, 2));
                    } else {
                        totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                    }
                } catch (e) {
                    console.error('Exception fetching payments:', e);
                }

                const formattedRevenue = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                }).format(totalRevenue);

                const newStats: StatsData[] = [
                    {
                        title: "Total Students",
                        value: studentCount.toString(),
                        icon: "people",
                        color: "blue",
                        trend: { value: "+0%", isPositive: true }
                    },
                    {
                        title: "Active Subjects",
                        value: SubjectCount.toString(),
                        icon: "book",
                        color: "green",
                        trend: { value: "+0%", isPositive: true }
                    },
                    {
                        title: "Teachers",
                        value: teacherCount.toString(),
                        icon: "person",
                        color: "purple",
                        trend: { value: "+0%", isPositive: true }
                    },
                    {
                        title: "Revenue",
                        value: formattedRevenue,
                        icon: "cash",
                        color: "yellow",
                        trend: { value: "+0%", isPositive: true }
                    },
                ];

                setStats(newStats);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return { stats, loading };
};
