import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { StudentService } from "@/services/StudentService";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { router } from "expo-router";
import { Calendar, MapPin, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function StudentTimetablePage() {
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [selectedDay, setSelectedDay] = useState(new Date());

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const data = await StudentService.getTimetable();
            setTimetable(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load timetable");
        } finally {
            setLoading(false);
        }
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 });
        return addDays(start, i);
    });

    const getDayName = (date: Date) => format(date, 'EEEE');

    const filteredEntries = timetable.filter(entry =>
        entry.day_of_week === getDayName(selectedDay)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Intelligence"
                subtitle="Portal"
                role="Student"
                onBack={() => router.back()}
            />

            <View className="px-4 md:px-8 pt-4">
                <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tighter mb-4 px-2">Academic Schedule</Text>

                {/* Horizontal Date Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8" contentContainerStyle={{ paddingHorizontal: 8 }}>
                    {weekDays.map((date, index) => {
                        const isSelected = isSameDay(date, selectedDay);
                        const isToday = isSameDay(date, new Date());
                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.7}
                                onPress={() => setSelectedDay(date)}
                                className={`mr-4 p-5 rounded-[28px] items-center min-w-[75px] shadow-sm border ${isSelected ? 'bg-gray-900 border-gray-900' : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800'}`}
                            >
                                <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isSelected ? 'text-white/40' : 'text-gray-400'}`}>
                                    {format(date, 'EEE')}
                                </Text>
                                <Text className={`text-xl font-black ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                    {format(date, 'd')}
                                </Text>
                                {isToday && (
                                    <View className={`w-1.5 h-1.5 rounded-full mt-2 ${isSelected ? 'bg-[#FF6900]' : 'bg-[#FF6900]'}`} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-4 md:px-8" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="px-2 mb-6 flex-row justify-between items-center">
                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px]">
                        {format(selectedDay, 'MMMM d, yyyy')}
                    </Text>
                    <View className="bg-orange-50 px-3 py-1 rounded-full">
                        <Text className="text-[#FF6900] text-[8px] font-black uppercase tracking-widest">{filteredEntries.length} Sessions</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                        <View key={entry.id} className="flex-row mb-6">
                            {/* Time Column */}
                            <View className="w-16 pt-2 items-center mr-4">
                                <Text className="font-bold text-gray-900 dark:text-white text-sm">{entry.start_time.slice(0, 5)}</Text>
                                <View className="w-[1.5px] h-full bg-gray-100 dark:bg-gray-700 my-3 rounded-full" />
                            </View>

                            {/* Class Card */}
                            <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-50 dark:border-gray-800 shadow-sm">
                                <View className="flex-row justify-between items-start mb-4">
                                    <View className="bg-blue-50 px-3 py-1 rounded-xl">
                                        <Text className="text-blue-600 text-[8px] font-bold uppercase tracking-widest">
                                            {entry.subjects?.title || 'Academic Unit'}
                                        </Text>
                                    </View>
                                    {entry.room_number && (
                                        <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-xl">
                                            <MapPin size={12} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-[10px] font-bold ml-1.5 uppercase tracking-widest">{entry.room_number}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight leading-tight mb-4">
                                    {entry.subjects?.title}
                                </Text>

                                <View className="flex-row items-center border-t border-gray-50 dark:border-gray-800 pt-4">
                                    <View className="w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center mr-3">
                                        <User size={18} color="#FF6900" />
                                    </View>
                                    <View>
                                        <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">
                                            {entry.subjects?.teachers?.users?.full_name || 'Assigned Faculty'}
                                        </Text>
                                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-0.5">Primary Instructor</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View className="bg-white dark:bg-[#1a1a1a] p-20 rounded-[48px] items-center border border-gray-100 dark:border-gray-700 border-dashed mt-4">
                        <Calendar size={48} color="#E5E7EB" />
                        <Text className="text-gray-400 font-bold text-center mt-6">No Academic Sessions</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
