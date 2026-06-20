import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DiaryService, DiaryEntry } from "@/services/DiaryService";
import { format } from "date-fns";
import { router } from "expo-router";
import { BookOpen } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

export default function StudentDiaryPage() {
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Listen to realtime changes on the diary_entries table
    useRealtimeQuery('diary_entries', () => {
        if (!loading) {
            fetchEntries();
        }
    });

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const data = await DiaryService.getEntries();
            setEntries(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch diary entries");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Academic"
                subtitle="Diary"
                role="Student"
                onBack={() => router.back()}
            />

            <View className="p-4 md:p-8 flex-1">
                <View className="flex-row justify-between items-center mb-6 px-2">
                    <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tighter">Class Diary</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 200 }}
                    >
                        {entries.length > 0 ? (
                            entries.map((item) => {
                                const teacherName = item.teacher?.users?.full_name || 'Teacher';
                                return (
                                    <View
                                        key={item.id}
                                        className="p-5 mb-4 rounded-[32px] bg-white dark:bg-[#1a1a1a] border border-gray-50 dark:border-gray-800 shadow-sm"
                                    >
                                        <View className="flex-row items-center mb-4">
                                            <View className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/30 items-center justify-center mr-4">
                                                <BookOpen size={24} color="#FF6900" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight mb-0.5">{item.title}</Text>
                                                <View className="flex-row items-center justify-between">
                                                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium">By {teacherName}</Text>
                                                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">
                                                        {format(new Date(item.entry_date), 'MMM dd, yyyy')}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                                            <Text className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{item.content}</Text>
                                        </View>
                                        
                                        <View className="mt-4 flex-row justify-end items-center">
                                            <Text className={`text-[10px] font-bold uppercase tracking-widest ${item.is_signed ? 'text-green-500' : 'text-orange-500'}`}>
                                                {item.is_signed ? 'Signed by Parent/Guardian' : 'Pending Parent/Guardian Signature'}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <View className="bg-white dark:bg-[#1a1a1a] p-20 rounded-[48px] items-center border border-gray-100 dark:border-gray-700 border-dashed mt-8">
                                <BookOpen size={64} color="#E5E7EB" style={{ opacity: 0.3 }} />
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">No Diary Entries Yet</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
