import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherAPI } from "@/services/TeacherService";
import { router } from "expo-router";
import { Award, BookOpen, ChevronRight, Download, TrendingUp, Users } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface ISubjectAnalytics {
    id: string;
    name: string;
    students: number;
    avgProgress: number;
    avgGrade: number;
    completionRate: number;
}

const StatBox = ({ icon: Icon, label, value, color, bgColor }: { icon: any; label: string; value: string; color: string; bgColor: string }) => (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <View style={{ backgroundColor: bgColor }} className="w-12 h-12 rounded-2xl items-center justify-center mb-4 dark:opacity-90">
            <Icon size={20} color={color} />
        </View>
        <Text className="text-gray-900 dark:text-white text-2xl font-bold">{value}</Text>
        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">{label}</Text>
    </View>
);

const SubjectAnalyticsCard = ({ Subject }: { Subject: ISubjectAnalytics }) => {
    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg">{Subject.name}</Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1 font-medium">{Subject.students} students</Text>
                </View>
                <View className="bg-orange-50 dark:bg-orange-950/20 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-900">
                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">{Subject.completionRate}% complete</Text>
                </View>
            </View>

            <View className="flex-row gap-4">
                <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Completion</Text>
                        <Text className="text-[#FF6900] text-xs font-bold">{Subject.completionRate}%</Text>
                    </View>
                    <View className="h-2 bg-gray-100 dark:bg-[#242424] rounded-full overflow-hidden">
                        <View className="h-full bg-[#FF6900] rounded-full" style={{ width: `${Subject.completionRate}%` }} />
                    </View>
                </View>
                <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Avg Grade</Text>
                        <Text className="text-gray-900 dark:text-gray-100 text-xs font-bold">{Subject.avgGrade}%</Text>
                    </View>
                    <View className="h-2 bg-gray-100 dark:bg-[#242424] rounded-full overflow-hidden">
                        <View className="h-full bg-gray-900 dark:bg-gray-100 rounded-full" style={{ width: `${Subject.avgGrade}%` }} />
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function AnalyticsPage() {
    const { profile, teacherId } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState("All Time");
    const [SubjectAnalytics, setSubjectAnalytics] = useState<ISubjectAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const data = await TeacherAPI.getAnalytics();
            setSubjectAnalytics(data);

            setTopPerformers([
                { name: "Sarah J.", initials: "SJ", score: 98 },
                { name: "Michael C.", initials: "MC", score: 95 },
                { name: "Grace W.", initials: "GW", score: 94 },
            ]);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalStudents = SubjectAnalytics.reduce((acc, c) => acc + c.students, 0);
    const avgCompletion = SubjectAnalytics.length > 0
        ? Math.round(SubjectAnalytics.reduce((acc, c) => acc + c.completionRate, 0) / SubjectAnalytics.length)
        : 0;
    const avgGradeOverall = SubjectAnalytics.length > 0
        ? Math.round(SubjectAnalytics.reduce((acc, c) => acc + c.avgGrade, 0) / SubjectAnalytics.length)
        : 0;

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="Analytics"
                role="Teacher"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Period Selector & Download */}
                    <View className="flex-row gap-3 mb-6">
                        <TouchableOpacity className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-3xl px-6 py-4 border border-gray-100 dark:border-gray-800 flex-row items-center justify-between shadow-sm active:bg-gray-50 dark:active:bg-gray-900">
                            <Text className="text-gray-700 dark:text-gray-200 font-bold text-sm">{selectedPeriod}</Text>
                            <TrendingUp size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity className="w-14 bg-white dark:bg-[#1a1a1a] rounded-3xl items-center justify-center border border-gray-100 dark:border-gray-800 shadow-sm active:bg-gray-50 dark:active:bg-gray-900">
                            <Download size={20} color="#FF6900" />
                        </TouchableOpacity>
                    </View>

                    {/* Overview Stats */}
                    <View className="flex-row gap-4 mb-4">
                        <StatBox icon={Users} label="Students" value={totalStudents.toString()} color="#FF6900" bgColor="#fff7ed" />
                        <StatBox icon={TrendingUp} label="Completion" value={`${avgCompletion}%`} color="#111827" bgColor="#f3f4f6" />
                    </View>
                    <View className="flex-row gap-4 mb-8">
                        <StatBox icon={BookOpen} label="Subjects" value={SubjectAnalytics.length.toString()} color="#FF6900" bgColor="#fff7ed" />
                        <StatBox icon={Award} label="Avg Grade" value={`${avgGradeOverall}%`} color="#111827" bgColor="#f3f4f6" />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : (
                        <>
                            {/* Performance Chart Placeholder */}
                            <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 mb-8 shadow-sm">
                                <Text className="text-gray-900 dark:text-white font-bold text-lg mb-6 tracking-tight">Performance Trend</Text>
                                <View className="h-48 bg-gray-50 dark:bg-[#242424] rounded-3xl items-center justify-center border border-gray-100 dark:border-gray-800 border-dashed">
                                    <TrendingUp size={48} color="#e5e7eb" style={{ opacity: 0.3 }} />
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 tracking-tight">Analytics Coming Soon</Text>
                                </View>
                            </View>

                            {/* Subject Breakdown */}
                            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4 px-2 tracking-tight">Subject Breakdown</Text>
                            {SubjectAnalytics.map((Subject) => (
                                <SubjectAnalyticsCard key={Subject.id} Subject={Subject} />
                            ))}

                            {/* Top Performers */}
                            <View className="bg-gray-900 p-8 rounded-[40px] mt-6 shadow-xl">
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text className="text-white font-bold text-lg tracking-tight">🏆 Top Performers</Text>
                                    <TouchableOpacity>
                                        <ChevronRight size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                                <View className="flex-row justify-between">
                                    {topPerformers.map((student, index) => (
                                        <View key={index} className="items-center">
                                            <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center mb-3 border border-white/10">
                                                <Text className="text-white font-bold text-lg">{student.initials}</Text>
                                            </View>
                                            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">{student.name}</Text>
                                            <Text className="text-white font-bold text-base">{student.score}%</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
