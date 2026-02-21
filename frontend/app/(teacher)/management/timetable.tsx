import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { TimetableAPI, TimetableEntry } from "@/services/TimetableService";
import { router } from "expo-router";
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetableCard = ({ entry }: { entry: TimetableEntry }) => {
    return (
        <View className="bg-white p-5 rounded-3xl border border-gray-100 mb-4 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg leading-tight">{entry.subjects?.title || "Unknown Subject"}</Text>
                    <View className="flex-row items-center mt-2">
                        <View className="bg-gray-50 p-1 rounded-lg mr-2">
                            <Users size={14} color="#6B7280" />
                        </View>
                        <Text className="text-gray-500 text-xs font-bold">{entry.classes?.name || "No Class"}</Text>
                    </View>
                </View>
                <View className="bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                    <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-wider">Active</Text>
                </View>
            </View>

            <View className="h-[1px] bg-gray-50 my-2" />

            <View className="flex-row justify-between items-center mt-2">
                <View className="flex-row items-center bg-gray-50 px-3 py-2 rounded-2xl">
                    <Clock size={14} color="#FF6900" />
                    <Text className="text-gray-700 font-bold text-xs ml-2">
                        {entry.start_time} - {entry.end_time}
                    </Text>
                </View>
                {entry.room_number && (
                    <View className="flex-row items-center px-2">
                        <MapPin size={14} color="#9CA3AF" />
                        <Text className="text-gray-400 text-xs font-medium ml-1.5">{entry.room_number}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default function TimetablePage() {
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [activeDay, setActiveDay] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const data = await TimetableAPI.getTeacherTimetable();
            setTimetable(data || []);
        } catch (error) {
            console.error("Fetch timetable error:", error);
            Alert.alert("Error", "Could not fetch your timetable.");
        } finally {
            setLoading(false);
        }
    };

    const filteredEntries = timetable.filter(entry => entry.day_of_week === activeDay)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
        <View className="flex-1 bg-gray-50">
            <UnifiedHeader
                title="Management"
                subtitle="My Timetable"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />

            <View className="px-4 md:p-8 pt-4">
                {/* Day Selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row mb-6 -mx-1"
                >
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => setActiveDay(day)}
                            className={`mr-3 px-6 py-3 rounded-2xl border ${activeDay === day
                                ? "bg-[#FF6900] border-[#FF6900] shadow-sm"
                                : "bg-white border-gray-100 shadow-sm"
                                }`}
                        >
                            <Text className={`font-bold text-xs uppercase tracking-wider ${activeDay === day ? "text-white" : "text-gray-400"
                                }`}>
                                {day.substring(0, 3)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-4 md:px-8">
                {loading ? (
                    <View className="flex-1 items-center justify-center pt-20">
                        <ActivityIndicator size="large" color="#FF6900" />
                        <Text className="text-gray-400 font-bold mt-4 tracking-tight">Loading schedule...</Text>
                    </View>
                ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                        <TimetableCard key={entry.id} entry={entry} />
                    ))
                ) : (
                    <View className="flex-1 items-center justify-center pt-20 bg-white rounded-[40px] p-12 mt-4 border border-gray-100 border-dashed">
                        <Calendar size={48} color="#D1D5DB" />
                        <Text className="text-gray-900 font-bold text-xl mt-6">No lessons today</Text>
                        <Text className="text-gray-500 text-center mt-3 leading-relaxed">
                            You don't have any lessons scheduled for {activeDay}.
                        </Text>
                    </View>
                )}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
