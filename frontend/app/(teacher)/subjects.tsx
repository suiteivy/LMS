import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { ArrowLeft, Plus, BookOpen, Clock, ChevronRight, Filter } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherAPI } from "@/services/TeacherService";
import { Edit, Eye, TrendingUp, Users } from 'lucide-react-native';
import { SubscriptionBanner } from "@/components/shared/SubscriptionComponents";

interface Subject {
    id: string;
    title: string;
    students: number;
    completion: number;
    status: "active" | "draft";
    lastUpdated: string;
}

const SubjectCard = ({ subject }: { subject: Subject }) => {
    const isActive = subject.status === "active";
    return (
        <TouchableOpacity
            className="bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-4"
            onPress={() => router.push({
                pathname: "/(teacher)/management/subjects/details" as any,
                params: { id: subject.id }
            })}
        >
            <View className="flex-row justify-between items-start mb-4">
                <View className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg">
                    <BookOpen size={24} color="#FF6900" />
                </View>
                <View className={`px-3 py-1 rounded-full ${subject.status === 'active' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-gray-50 dark:bg-[#161B22]'}`}>
                    <Text className={`text-[10px] font-bold uppercase ${subject.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {subject.status}
                    </Text>
                </View>
            </View>

            <Text className="text-gray-900 dark:text-white text-lg font-bold mb-1">{subject.title}</Text>
            <View className="flex-row items-center mb-4">
                <Clock size={12} color="#9CA3AF" />
                <Text className="text-gray-400 dark:text-gray-500 text-xs ml-1">Updated {subject.lastUpdated}</Text>
            </View>

            <View className="flex-row justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
                <View>
                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold mb-1">Students</Text>
                    <Text className="text-gray-900 dark:text-white font-bold">{subject.students}</Text>
                </View>
                <View className="items-end">
                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold mb-1">Completion</Text>
                    <Text className="text-teacherBlack dark:text-white font-bold">{subject.completion}%</Text>
                </View>
            </View>
            <View className="flex-row justify-end mt-5 gap-4">
                <TouchableOpacity className="flex-row items-center px-3 py-2 bg-orange-50 dark:bg-orange-950/20 rounded-xl">
                    <Edit size={16} color="#FF6900" />
                    <Text className="text-[#FF6900] text-xs ml-1.5 font-bold">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center px-3 py-2 bg-gray-50 dark:bg-[#161B22] rounded-xl"
                    onPress={() => router.push(`/(teacher)/management/subjects/details?id=${subject.id}` as any)}
                >
                    <Eye size={16} color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs ml-1.5 font-bold">View</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export default function SubjectsPage() {
    const { teacherId } = useAuth();
    const [filter, setFilter] = useState<"all" | "active" | "draft">("all");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teacherId) {
            fetchSubjects();
        }
    }, [teacherId]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const data = await TeacherAPI.getAnalytics();

            const mappedSubjects: Subject[] = (data || []).map((s: any) => ({
                id: s.id,
                title: s.name || "Untitled Subject",
                students: s.students || 0,
                completion: s.completionRate || 0,
                status: "active",
                lastUpdated: "Recently"
            }));

            setSubjects(mappedSubjects);
        } catch (error) {
            console.error("Error fetching Subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSubjects = subjects.filter(s => filter === "all" || s.status === filter);

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <StatusBar barStyle="dark-content" />
            <SubscriptionBanner />
            <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="flex-row items-center justify-between py-6">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D]">
                        <ArrowLeft size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <Text className="text-xl font-black text-gray-900 dark:text-white">Manage Subjects</Text>
                    <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-teacherBlack dark:bg-[#FF6900]">
                        <Plus size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View className="flex-row bg-[#F6F8FA] dark:bg-[#161B22] p-1.5 rounded-lg mb-6 border border-[#D0D7DE] dark:border-[#21262D]">
                    {["all", "active", "draft"].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setFilter(tab as any)}
                            className={`flex-1 py-2.5 rounded-xl items-center ${filter === tab ? 'bg-orange-50 dark:bg-[#FF6900]' : ''}`}
                        >
                            <Text className={`text-xs font-bold capitalize ${filter === tab ? 'text-teacherOrange dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-10" />
                ) : filteredSubjects.length === 0 ? (
                    <View className="items-center justify-center py-20">
                        <BookOpen size={48} color="#E5E7EB" />
                        <Text className="text-gray-400 font-medium mt-4">No subjects found</Text>
                    </View>
                ) : (
                    filteredSubjects.map(s => <SubjectCard key={s.id} subject={s} />)
                )}
            </ScrollView>
        </View>
    );
}
