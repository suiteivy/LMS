import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react-native";
import { ParentService } from "@/services/ParentService";
import { format } from "date-fns";

export default function StudentAttendancePage() {
    const { studentId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);

    useEffect(() => {
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await ParentService.getStudentAttendance(studentId as string);
            setAttendanceData(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'present': return { icon: <CheckCircle2 size={18} color="#10B981" />, bg: 'bg-emerald-50', text: 'text-emerald-700' };
            case 'absent': return { icon: <XCircle size={18} color="#F43F5E" />, bg: 'bg-rose-50', text: 'text-rose-700' };
            case 'late': return { icon: <Clock size={18} color="#F59E0B" />, bg: 'bg-amber-50', text: 'text-amber-700' };
            default: return { icon: <AlertCircle size={18} color="#6B7280" />, bg: 'bg-gray-50', text: 'text-gray-700' };
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
            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full w-10 mb-4">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Attendance History</Text>
                <Text className="text-gray-500 text-sm mt-1">Daily records and status updates</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Stats */}
                <View className="flex-row gap-4 mb-8">
                    <View className="flex-1 bg-white p-6 rounded-[2.5rem] border border-gray-100 items-center shadow-sm">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Present</Text>
                        <Text className="text-emerald-500 text-3xl font-black">22</Text>
                    </View>
                    <View className="flex-1 bg-white p-6 rounded-[2.5rem] border border-gray-100 items-center shadow-sm">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Absent</Text>
                        <Text className="text-rose-500 text-3xl font-black">2</Text>
                    </View>
                    <View className="flex-1 bg-white p-6 rounded-[2.5rem] border border-gray-100 items-center shadow-sm">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Late</Text>
                        <Text className="text-amber-500 text-3xl font-black">1</Text>
                    </View>
                </View>

                {/* History */}
                <Text className="text-lg font-bold text-gray-900 mb-4 ml-2">Recent Attendance</Text>
                {attendanceData.length > 0 ? (
                    attendanceData.map((item) => {
                        const config = getStatusConfig(item.status);
                        return (
                            <View key={item.id} className="bg-white p-4 rounded-3xl mb-3 flex-row items-center border border-gray-100 shadow-xs">
                                <View className={`p-3 rounded-2xl mr-4 ${config.bg}`}>
                                    {config.icon}
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-gray-900 font-bold">{format(new Date(item.date), 'EEEE, MMM dd')}</Text>
                                        <Text className={`font-black uppercase text-[10px] ${config.text}`}>{item.status}</Text>
                                    </View>
                                    <Text className="text-gray-400 text-sm">Subject: {item.subject?.title || "General"}</Text>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View className="bg-gray-100 p-10 rounded-[40px] items-center">
                        <CalendarIcon size={48} color="#9CA3AF" />
                        <Text className="text-gray-400 mt-4 text-center">No attendance records found.</Text>
                    </View>
                )}

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
