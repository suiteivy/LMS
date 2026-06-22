import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DiaryService, DiaryEntry } from "@/services/DiaryService";
import { format } from "date-fns";
import { router } from "expo-router";
import { BookOpen, Calendar, FileText, ExternalLink, ChevronRight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View, Platform } from "react-native";
import * as WebBrowser from 'expo-web-browser';

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

    // Harmonized status colors
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Graded':
                return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }; // Sky blue
            case 'Submitted':
                return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }; // Green
            case 'Overdue':
                return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' }; // Red
            default: // Pending
                return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }; // Amber
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-[#0c0c0c]">
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
                                const assignment = item.assignment;
                                const statusStyle = assignment ? getStatusColor(assignment.status) : null;

                                return (
                                    <View
                                        key={item.id}
                                        className="p-5 mb-4 rounded-[32px] bg-white dark:bg-[#1a1a1a] border border-gray-50 dark:border-gray-800 shadow-sm"
                                    >
                                        <View className="flex-row items-start mb-4">
                                            <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${assignment ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
                                                {assignment ? (
                                                    <FileText size={24} color="#6366F1" />
                                                ) : (
                                                    <BookOpen size={24} color="#FF6900" />
                                                )}
                                            </View>
                                            <View className="flex-1">
                                                <View className="flex-row items-center flex-wrap gap-2 mb-1.5">
                                                    {assignment && (
                                                        <View className="bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                                            <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                                                                {assignment.subject_name}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {assignment && statusStyle && (
                                                        <View 
                                                            style={{ 
                                                                backgroundColor: statusStyle.bg, 
                                                                borderColor: statusStyle.border,
                                                                borderWidth: 1,
                                                                paddingHorizontal: 8, 
                                                                paddingVertical: 2, 
                                                                borderRadius: 8 
                                                            }}
                                                        >
                                                            <Text style={{ color: statusStyle.text, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                {assignment.status}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">
                                                    {assignment ? assignment.title : item.title}
                                                </Text>
                                                <View className="flex-row items-center justify-between mt-1">
                                                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium">By {teacherName}</Text>
                                                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">
                                                        {assignment 
                                                            ? `Due: ${assignment.due_date_formatted}` 
                                                            : format(new Date(item.entry_date), 'MMM dd, yyyy')}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <Text className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                                            {assignment ? assignment.description : item.content}
                                        </Text>

                                        {/* Assignment fields: Grade & Reference Materials */}
                                        {assignment && (
                                            <View className="bg-gray-50 dark:bg-[#151515] p-4 rounded-2xl mb-4 border border-gray-100/50 dark:border-gray-800/50">
                                                <View className="flex-row justify-between items-center mb-2.5">
                                                    <Text className="text-gray-400 dark:text-gray-500 text-[11px] font-bold uppercase tracking-wider">Score / Grade</Text>
                                                    {assignment.status === 'Graded' && assignment.grade !== null ? (
                                                        <Text className="text-green-600 dark:text-green-400 font-extrabold text-sm">
                                                            {assignment.grade} / {assignment.total_points || 100}
                                                        </Text>
                                                    ) : (
                                                        <Text className="text-gray-400 dark:text-gray-500 font-semibold text-xs">
                                                            {assignment.status === 'Submitted' ? 'Pending Grading' : 'Not Graded'}
                                                        </Text>
                                                    )}
                                                </View>

                                                {assignment.feedback && (
                                                    <View className="mt-1.5 pt-2 border-t border-gray-200/50 dark:border-gray-800/50">
                                                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Teacher Feedback</Text>
                                                        <Text className="text-gray-600 dark:text-gray-400 text-xs italic">
                                                            &ldquo;{assignment.feedback}&rdquo;
                                                        </Text>
                                                    </View>
                                                )}

                                                {assignment.attachment_url && (
                                                    <View className="mt-2.5 pt-2 border-t border-gray-200/50 dark:border-gray-800/50 flex-row items-center justify-between">
                                                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">Reference Materials</Text>
                                                        <TouchableOpacity 
                                                            onPress={() => WebBrowser.openBrowserAsync(assignment.attachment_url!)}
                                                            className="flex-row items-center bg-white dark:bg-[#202020] px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800"
                                                        >
                                                            <ExternalLink size={11} color="#6366F1" />
                                                            <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] ml-1.5 uppercase tracking-wider">
                                                                View File
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        <View className="mt-2 pt-4 border-t border-gray-50 dark:border-gray-900 flex-row justify-between items-center">
                                            <Text className={`text-[10px] font-bold uppercase tracking-widest ${item.is_signed ? 'text-green-500' : 'text-orange-500'}`}>
                                                {item.is_signed ? 'Signed by Parent' : 'Pending Signature'}
                                            </Text>

                                            {assignment && (
                                                <TouchableOpacity
                                                    onPress={() => router.push({
                                                        pathname: "/(student)/assignments",
                                                        params: { highlightId: assignment.id }
                                                    })}
                                                    className="flex-row items-center bg-[#FF6900] px-4 py-2 rounded-2xl"
                                                >
                                                    <Text className="text-white font-bold text-xs">Open Assignment</Text>
                                                    <ChevronRight size={14} color="white" className="ml-1" />
                                                </TouchableOpacity>
                                            )}
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
