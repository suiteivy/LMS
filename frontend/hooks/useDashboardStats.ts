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

                // Fetch Total Students
                const { count: studentCount, error: studentError } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'student');

                if (studentError) throw studentError;

                // Fetch Total Teachers
                const { count: teacherCount, error: teacherError } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'teacher');

                if (teacherError) throw teacherError;

                // Fetch Active Courses
                const { count: courseCount, error: courseError } = await supabase
                    .from('courses')
                    .select('*', { count: 'exact', head: true });

                if (courseError) throw courseError;

                // Fetch Revenue (Sum of payments)
                // Note: For large datasets, this should be an RPC or Edge Function.
                // Doing client-side sum for now as per current scope.
                const { data: payments, error: paymentError } = await supabase
                    .from('payments')
                    .select('amount')
                    .returns<{ amount: number }[]>();

                if (paymentError) throw paymentError;

                const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                const formattedRevenue = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                }).format(totalRevenue);

                const newStats: StatsData[] = [
                    {
                        title: "Total Students",
                        value: studentCount?.toString() || "0",
                        icon: "people",
                        color: "blue",
                        trend: { value: "+0%", isPositive: true } // Placeholder trend
                    },
                    {
                        title: "Active Courses",
                        value: courseCount?.toString() || "0",
                        icon: "book",
                        color: "green",
                        trend: { value: "+0%", isPositive: true }
                    },
                    {
                        title: "Teachers",
                        value: teacherCount?.toString() || "0",
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
