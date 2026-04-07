import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { DiaryAPI, DiaryEntry } from "@/services/DiaryService";
import { router } from "expo-router";
import { BookOpen, Calendar } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { Zap } from "lucide-react-native";

const DiaryCard = ({ entry }: { entry: DiaryEntry }) => {
    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row items-start mb-4">
                <View className="bg-orange-100 dark:bg-orange-950/20 p-2.5 rounded-2xl mr-4">
                    <BookOpen size={20} color="#FF6900" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{entry.title}</Text>
                    <View className="flex-row items-center mt-1">
                        <Calendar size={12} color="#9CA3AF" />
                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest ml-1">
                            {new Date(entry.entry_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>
            </View>

            <Text className="text-gray-600 dark:text-gray-400 text-sm leading-5">
                {entry.content}
            </Text>

            <View className="flex-row justify-between items-center pt-4 mt-4 border-t border-gray-50 dark:border-gray-800">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">
                    Teacher: {entry.teacher?.users?.full_name || "School Office"}
                </Text>
            </View>
        </View>
    );
};

export default function StudentDiaryPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            // DiaryAPI.getEntries without params will use the student's assigned class on the backend
            const data = await DiaryAPI.getEntries();
            setEntries(data);
        } catch (error) {
            console.error("Error fetching diary entries:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="My Diary"
                subtitle="Class Activities"
                role="Student"
                onBack={() => router.push("/(student)")}
            />

            <SubscriptionGate 
                feature="diary"
                fallback={
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="bg-orange-50 p-8 rounded-[40px] items-center border border-orange-100 border-dashed max-w-sm">
                            <Zap size={48} color="#FF6900" style={{ marginBottom: 20 }} />
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Diary Locked</Text>
                            <Text className="text-gray-500 text-center mb-8 leading-5">
                                The Virtual Diary is not included in your current subscription plan.
                            </Text>
                        </View>
                    </View>
                }
            >

            <View className="p-4 md:p-8 flex-1">
                <View className="flex-row justify-between items-center mb-6 px-2">
                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                        {entries.length} Entries found
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : entries.length === 0 ? (
                    <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                        <BookOpen size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No diary entries for your class.</Text>
                    </View>
                ) : (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {entries.map((entry) => (
                            <DiaryCard key={entry.id} entry={entry} />
                        ))}
                    </ScrollView>
                )}
            </View>
            </SubscriptionGate>
        </View>
    );
}
