import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/libs/supabase';
import { router } from 'expo-router';
import { AlertCircle, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

export default function AttendancePage() {
    const { studentId, isDemo } = useAuth();
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        percentage: 100
    });

    useEffect(() => {
        if (studentId || isDemo) {
            fetchAttendance();
        }
    }, [studentId, isDemo]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);

            if (isDemo) {
                // High-quality mock data for Demo Mode
                const mockData = [
                    { id: '1', date: new Date().toISOString(), status: 'present', classes: { name: 'Advanced Mathematics' } },
                    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), status: 'late', classes: { name: 'Theoretical Physics' } },
                    { id: '3', date: new Date(Date.now() - 172800000).toISOString(), status: 'present', classes: { name: 'Software Engineering' } },
                    { id: '4', date: new Date(Date.now() - 259200000).toISOString(), status: 'excused', classes: { name: 'Database Systems' } },
                    { id: '5', date: new Date(Date.now() - 345600000).toISOString(), status: 'present', classes: { name: 'Advanced Mathematics' } },
                ];
                setAttendance(mockData);
                setStats({ present: 22, absent: 1, late: 3, excused: 2, total: 28, percentage: 94 });
                setLoading(false);
                return;
            }

            if (!studentId) return;
            const { data, error } = await supabase
                .from('attendance')
                .select(`*, classes ( name )`)
                .eq('student_id', studentId!)
                .order('date', { ascending: false });

            if (error) throw error;
            setAttendance(data || []);
            calculateStats(data || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: any[]) => {
        const total = data.length;
        const present = data.filter(r => r.status === 'present').length;
        const absent = data.filter(r => r.status === 'absent').length;
        const late = data.filter(r => r.status === 'late').length;
        const excused = data.filter(r => r.status === 'excused').length;
        const effectivePresent = present + late;
        const percentage = total > 0 ? Math.round((effectivePresent / total) * 100) : 100;
        setStats({ present, absent, late, excused, total, percentage });
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'present': return { text: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle size={18} color="#16a34a" /> };
            case 'absent': return { text: 'text-red-600', bg: 'bg-red-50', icon: <XCircle size={18} color="#dc2626" /> };
            case 'late': return { text: 'text-orange-600', bg: 'bg-orange-50', icon: <Clock size={18} color="#ea580c" /> };
            case 'excused': return { text: 'text-blue-600', bg: 'bg-blue-50', icon: <AlertCircle size={18} color="#2563eb" /> };
            default: return { text: 'text-gray-600', bg: 'bg-gray-50', icon: <AlertCircle size={18} color="#4b5563" /> };
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Intelligence"
                subtitle="Attendance"
                role="Student"
                onBack={() => router.back()}
            />

            <View className="p-4 md:p-8">
                {/* Score Hero */}
                <View className="bg-gray-900 p-8 rounded-[40px] shadow-xl mb-8 flex-row items-center">
                    <View className="flex-1">
                        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Performance Rate</Text>
                        <Text className="text-white text-5xl font-black tracking-tighter">{stats.percentage}%</Text>
                        <Text className="text-gray-400 text-sm font-medium mt-2">from {stats.total} sessions recorded</Text>
                    </View>
                    <View className="w-16 h-16 rounded-full bg-[#FF6900] items-center justify-center shadow-lg">
                        <Calendar size={32} color="white" />
                    </View>
                </View>

                {/* Mini Stats Grid */}
                <View className="flex-row flex-wrap gap-3 mb-10 px-2">
                    <View className="w-[47%] bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm items-center">
                        <Text className="text-green-600 text-2xl font-bold">{stats.present}</Text>
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-1">Present</Text>
                    </View>
                    <View className="w-[47%] bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm items-center">
                        <Text className="text-red-600 text-2xl font-bold">{stats.absent}</Text>
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-1">Absent</Text>
                    </View>
                    <View className="w-[47%] bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm items-center">
                        <Text className="text-orange-600 text-2xl font-bold">{stats.late}</Text>
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-1">Late</Text>
                    </View>
                    <View className="w-[47%] bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm items-center">
                        <Text className="text-blue-600 text-2xl font-bold">{stats.excused}</Text>
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-1">Excused</Text>
                    </View>
                </View>

                {/* Detailed Logs */}
                <View className="px-2 mb-4">
                    <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-[3px]">Session Logs</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 200 }}>
                        {attendance.length === 0 ? (
                            <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-700 border-dashed mt-4">
                                <Calendar size={48} color="#E5E7EB" />
                                <Text className="text-gray-400 font-bold text-center mt-6">No records found</Text>
                            </View>
                        ) : (
                            attendance.map((record) => {
                                const styles = getStatusStyles(record.status);
                                return (
                                    <View key={record.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 flex-row justify-between items-center shadow-sm">
                                        <View className="flex-1">
                                            <Text className="font-bold text-gray-900 dark:text-white text-base tracking-tight mb-1">{record.classes?.name || 'Academic Session'}</Text>
                                            <View className="flex-row items-center">
                                                <Calendar size={12} color="#9CA3AF" />
                                                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1.5">{new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                            </View>
                                        </View>
                                        <View className="flex-row items-center">
                                            <View className={`${styles.bg} px-3 py-1.5 rounded-full mr-3 border border-black/5`}>
                                                <Text className={`${styles.text} text-[8px] font-black uppercase tracking-widest`}>{record.status}</Text>
                                            </View>
                                            <View className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 items-center justify-center border border-gray-100 dark:border-gray-700">
                                                {styles.icon}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
