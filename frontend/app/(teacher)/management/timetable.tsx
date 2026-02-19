import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { ArrowLeft, Calendar, Clock, BookOpen, Users, MapPin, ChevronRight } from 'lucide-react-native';
import { router } from "expo-router";
import { TimetableAPI, TimetableEntry } from "@/services/TimetableService";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetableCard = ({ entry }: { entry: TimetableEntry }) => {
    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">{entry.subjects?.title || "Unknown Subject"}</Text>
                    <View className="flex-row items-center mt-1">
                        <Users size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-sm ml-1">{entry.classes?.name || "No Class"}</Text>
                    </View>
                </View>
                <View className="bg-orange-50 px-3 py-1 rounded-full">
                    <Text className="text-teacherOrange font-medium text-xs">Active</Text>
                </View>
            </View>

            <View className="h-[1px] bg-gray-50 my-3" />

            <View className="flex-row justify-between">
                <View className="flex-row items-center">
                    <Clock size={16} color="#F97316" />
                    <Text className="text-gray-700 font-medium ml-2">
                        {entry.start_time} - {entry.end_time}
                    </Text>
                </View>
                {entry.room_number && (
                    <View className="flex-row items-center">
                        <MapPin size={16} color="#6B7280" />
                        <Text className="text-gray-500 ml-1">{entry.room_number}</Text>
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
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-6 rounded-b-[32px] shadow-sm">
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
                    >
                        <ArrowLeft size={20} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-gray-900 font-bold text-xl">My Timetable</Text>
                    <View className="w-10" />
                </View>

                {/* Day Selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                >
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => setActiveDay(day)}
                            className={`mr-3 px-5 py-2.5 rounded-2xl border ${activeDay === day
                                    ? "bg-teacherOrange border-teacherOrange"
                                    : "bg-white border-gray-100"
                                }`}
                        >
                            <Text className={`font-semibold ${activeDay === day ? "text-white" : "text-gray-500"
                                }`}>
                                {day.substring(0, 3)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {loading ? (
                    <View className="flex-1 items-center justify-center pt-20">
                        <ActivityIndicator size="large" color="#F97316" />
                        <Text className="text-gray-500 mt-4">Loading schedule...</Text>
                    </View>
                ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                        <TimetableCard key={entry.id} entry={entry} />
                    ))
                ) : (
                    <View className="flex-1 items-center justify-center pt-20 bg-white rounded-3xl p-10 mt-4 border border-gray-100 border-dashed">
                        <Calendar size={48} color="#D1D5DB" />
                        <Text className="text-gray-900 font-bold text-lg mt-4">No lessons today</Text>
                        <Text className="text-gray-500 text-center mt-2">
                            You don't have any lessons scheduled for {activeDay}.
                        </Text>
                    </View>
                )}
                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
