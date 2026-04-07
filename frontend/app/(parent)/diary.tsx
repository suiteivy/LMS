import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { DiaryAPI, DiaryEntry } from "@/services/DiaryService";
import { ParentAPI } from "@/services/ParentService";
import { router } from "expo-router";
import { BookOpen, Calendar, ChevronDown, User } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

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

export default function ParentDiaryPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);

    useEffect(() => {
        fetchLinkedStudents();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            fetchEntries();
        }
    }, [selectedStudentId]);

    const fetchLinkedStudents = async () => {
        try {
            const data = await ParentAPI.getLinkedStudents();
            setStudents(data);
            if (data && data.length > 0) {
                // The data usually contains { student_id, relationship, students: { id, users: { full_name } } }
                setSelectedStudentId(data[0].student_id || data[0].students?.id);
            }
        } catch (error) {
            console.error("Error fetching linked students:", error);
        }
    };

    const fetchEntries = async () => {
        if (!selectedStudentId) return;
        setLoading(true);
        try {
            const data = await DiaryAPI.getEntries(undefined, selectedStudentId);
            setEntries(data);
        } catch (error) {
            console.error("Error fetching diary entries:", error);
        } finally {
            setLoading(false);
        }
    };

    const selectedStudentName = students.find(s => s.student_id === selectedStudentId || s.students?.id === selectedStudentId)?.students?.users?.full_name || "Select Student";

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Class Diary"
                subtitle="Daily Activities"
                role="Parent"
                onBack={() => router.push("/(parent)")}
            />

            <View className="p-4 md:p-8 flex-1">
                {/* Student Selection */}
                {students.length > 1 && (
                    <View className="mb-6 relative z-10">
                        <TouchableOpacity
                            className="bg-white dark:bg-[#1a1a1a] rounded-3xl px-6 py-4 border border-gray-100 dark:border-gray-800 flex-row items-center justify-between shadow-sm"
                            onPress={() => setShowStudentDropdown(!showStudentDropdown)}
                        >
                            <View className="flex-row items-center">
                                <User size={18} color="#FF6900" className="mr-3" />
                                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{selectedStudentName}</Text>
                            </View>
                            <ChevronDown size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {showStudentDropdown && (
                            <View className="absolute top-16 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-[32px] shadow-2xl z-20 overflow-hidden">
                                {students.map(s => (
                                    <TouchableOpacity
                                        key={s.student_id || s.students?.id}
                                        className="px-6 py-4 border-b border-gray-50 dark:border-gray-900 active:bg-gray-50 dark:active:bg-gray-900"
                                        onPress={() => {
                                            setSelectedStudentId(s.student_id || s.students?.id);
                                            setShowStudentDropdown(false);
                                        }}
                                    >
                                        <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{s.students?.users?.full_name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* List */}
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No diary entries for this student.</Text>
                        </View>
                    ) : (
                        entries.map((entry) => (
                            <DiaryCard key={entry.id} entry={entry} />
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
