import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/libs/supabase';
import { Stack, useRouter } from 'expo-router';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

const AttendancePage = () => {
    const { studentId } = useAuth();
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
    const router = useRouter();

    useEffect(() => {
        if (studentId) {
            fetchAttendance();
        }
    }, [studentId]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    *,
                    classes ( name )
                `)
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

        // Calculate percentage (Present + Late count as "attended" generally, or maybe just Present)
        // Usually: (Present + Late) / Total
        const effectivePresent = present + late;
        const percentage = total > 0 ? Math.round((effectivePresent / total) * 100) : 100;

        setStats({ present, absent, late, excused, total, percentage });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return 'text-green-600';
            case 'absent': return 'text-red-600';
            case 'late': return 'text-orange-600';
            case 'excused': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'present': return <CheckCircle size={20} color="#16a34a" />;
            case 'absent': return <XCircle size={20} color="#dc2626" />;
            case 'late': return <Clock size={20} color="#ea580c" />;
            case 'excused': return <AlertCircle size={20} color="#2563eb" />;
            default: return <AlertCircle size={20} color="#4b5563" />;
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'My Attendance', headerBackTitle: 'Back' }} />

            <ScrollView className="flex-1 p-4">
                {/* Stats Cards */}
                <View className="flex-row justify-between mb-6">
                    <View className="bg-white p-4 rounded-xl shadow-sm flex-1 mr-2 items-center">
                        <Text className="text-3xl font-bold text-gray-900">{stats.percentage}%</Text>
                        <Text className="text-xs text-gray-500 uppercase font-bold mt-1">Attendance Rate</Text>
                    </View>
                    <View className="bg-white p-4 rounded-xl shadow-sm flex-1 ml-2 items-center">
                        <Text className="text-3xl font-bold text-gray-900">{stats.total}</Text>
                        <Text className="text-xs text-gray-500 uppercase font-bold mt-1">Total Classes</Text>
                    </View>
                </View>

                <View className="flex-row justify-between mb-6">
                    <View className="items-center">
                        <Text className="text-green-600 font-bold text-lg">{stats.present}</Text>
                        <Text className="text-xs text-gray-500">Present</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-red-600 font-bold text-lg">{stats.absent}</Text>
                        <Text className="text-xs text-gray-500">Absent</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-orange-600 font-bold text-lg">{stats.late}</Text>
                        <Text className="text-xs text-gray-500">Late</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">{stats.excused}</Text>
                        <Text className="text-xs text-gray-500">Excused</Text>
                    </View>
                </View>

                {/* History List */}
                <Text className="text-lg font-bold text-gray-900 mb-3">Attendance History</Text>

                {attendance.length === 0 ? (
                    <View className="bg-white p-8 rounded-xl items-center justify-center">
                        <Text className="text-gray-400">No attendance records found.</Text>
                    </View>
                ) : (
                    attendance.map((record) => (
                        <View key={record.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3 flex-row justify-between items-center">
                            <View className="flex-1">
                                <Text className="font-bold text-gray-900 text-base">{record.classes?.name || 'Class'}</Text>
                                <View className="flex-row items-center mt-1">
                                    <Calendar size={14} color="#9ca3af" />
                                    <Text className="text-gray-500 text-xs ml-1">{new Date(record.date).toLocaleDateString()}</Text>
                                </View>
                            </View>
                            <View className="flex-row items-center">
                                <View className={`mr-2 px-2 py-1 rounded-full bg-gray-100`}>
                                    <Text className={`text-xs font-bold capitalize ${getStatusColor(record.status)}`}>
                                        {record.status}
                                    </Text>
                                </View>
                                {getStatusIcon(record.status)}
                            </View>
                        </View>
                    ))
                )}

                <View className="h-10" />
            </ScrollView>
        </View>
    );
};

export default AttendancePage;
