import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Calendar, Clock, MapPin, BookOpen } from "lucide-react-native";
import { StudentService } from "@/services/StudentService";
import { format, parse, startOfWeek, addDays, isSameDay } from "date-fns";

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

    // Helper to get days of current week
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
        return addDays(start, i);
    });

    const getDayName = (date: Date) => format(date, 'EEEE'); // "Monday"

    const filteredEntries = timetable.filter(entry =>
        entry.day_of_week === getDayName(selectedDay)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));

    const renderDaySelector = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-4 pl-4 mb-2">
            {weekDays.map((date, index) => {
                const isSelected = isSameDay(date, selectedDay);
                const isToday = isSameDay(date, new Date());

                return (
                    <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedDay(date)}
                        className={`mr-3 p-3 rounded-2xl items-center min-w-[60px] ${isSelected ? 'bg-orange-500' : 'bg-white border border-gray-100'
                            }`}
                    >
                        <Text className={`text-xs font-medium mb-1 ${isSelected ? 'text-orange-100' : 'text-gray-400'
                            }`}>
                            {format(date, 'EEE')}
                        </Text>
                        <Text className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'
                            }`}>
                            {format(date, 'd')}
                        </Text>
                        {isToday && (
                            <View className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-orange-500'
                                }`} />
                        )}
                    </TouchableOpacity>
                );
            })}
            <View className="w-4" />
        </ScrollView>
    );

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
            <View className="bg-white pt-12 pb-4 px-6 border-b border-gray-100">
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full mr-4">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Timetable</Text>
                        <Text className="text-gray-500 text-sm">Your weekly schedule</Text>
                    </View>
                </View>

                {renderDaySelector()}
            </View>

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-lg font-bold text-gray-900">
                        {format(selectedDay, 'EEEE, MMMM d')}
                    </Text>
                    <View className="bg-orange-100 px-3 py-1 rounded-full">
                        <Text className="text-orange-600 text-xs font-bold">
                            {filteredEntries.length} Classes
                        </Text>
                    </View>
                </View>

                {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                        <View key={entry.id} className="flex-row mb-4">
                            {/* Time Column */}
                            <View className="w-16 pt-2 items-center mr-3">
                                <Text className="font-bold text-gray-900 text-base">
                                    {entry.start_time.slice(0, 5)}
                                </Text>
                                <Text className="text-gray-400 text-xs mb-2">
                                    {entry.end_time.slice(0, 5)}
                                </Text>
                                <View className="w-[1px] flex-1 bg-gray-200" />
                            </View>

                            {/* Class Card */}
                            <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="bg-blue-50 px-3 py-1 rounded-xl">
                                        <Text className="text-blue-600 text-xs font-bold uppercase truncate max-w-[150px]">
                                            {entry.subjects?.title || 'Subject'}
                                        </Text>
                                    </View>
                                    {entry.room_number && (
                                        <View className="flex-row items-center">
                                            <MapPin size={14} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-xs ml-1 font-medium">{entry.room_number}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="text-gray-900 font-bold text-lg mb-1">
                                    {entry.subjects?.title}
                                </Text>

                                <View className="flex-row items-center mt-2">
                                    <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center mr-2">
                                        <Text className="text-xs text-gray-500 font-bold">
                                            {entry.subjects?.teachers?.users?.full_name?.charAt(0) || 'T'}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-500 text-sm">
                                        {entry.subjects?.teachers?.users?.full_name || 'Teacher'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View className="items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                        <View className="bg-gray-50 p-4 rounded-full mb-4">
                            <Calendar size={32} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-900 font-bold text-lg mb-1">No Classes Scheduled</Text>
                        <Text className="text-gray-400 text-center px-10">
                            There are no classes scheduled for this day. Enjoy your free time!
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
