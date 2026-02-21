import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherAPI } from "@/services/TeacherService";
import { Edit, Eye, TrendingUp, Users } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Subject {
    id: string;
    title: string;
    students: number;
    completion: number;
    status: "active" | "draft";
    lastUpdated: string;
}

interface SubjectCardProps {
    Subject: Subject;
}

const SubjectCard = ({ Subject }: SubjectCardProps) => {
    const isActive = Subject.status === "active";

    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-2">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg" numberOfLines={1}>
                        {Subject.title}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1 font-medium">
                        Updated {Subject.lastUpdated}
                    </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${isActive ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-gray-100"}`}>
                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-green-600" : "text-gray-500"}`}>
                        {Subject.status}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between mb-5">
                <View className="flex-row items-center">
                    <View className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg mr-2">
                        <Users size={14} color="#6B7280" />
                    </View>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs font-bold">{Subject.students} students</Text>
                </View>
                <View className="flex-row items-center">
                    <View className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg mr-2">
                        <TrendingUp size={14} color="#6B7280" />
                    </View>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs font-bold">{Subject.completion}% completion</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <View
                    className="h-full bg-[#FF6900] rounded-full"
                    style={{ width: `${Subject.completion}%` }}
                />
            </View>

            <View className="flex-row justify-end mt-5 gap-4">
                <TouchableOpacity className="flex-row items-center px-3 py-2 bg-orange-50 dark:bg-orange-950/20 rounded-xl">
                    <Edit size={16} color="#FF6B00" />
                    <Text className="text-[#FF6B00] text-xs ml-1.5 font-bold">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Eye size={16} color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs ml-1.5 font-bold">View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function TeacherSubjects() {
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

    const filteredSubjects = filter === "all"
        ? subjects
        : subjects.filter(c => c.status === filter);

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="My Subjects"
                role="Teacher"
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Filter Tabs */}
                    <View className="flex-row bg-white dark:bg-[#1a1a1a] rounded-2xl p-1.5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        {(["all", "active", "draft"] as const).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`flex-1 py-3 rounded-xl ${filter === tab ? "bg-[#FF6900] shadow-sm" : ""}`}
                                onPress={() => setFilter(tab)}
                            >
                                <Text className={`text-center font-bold text-xs uppercase tracking-wider ${filter === tab ? "text-white" : "text-gray-400"}`}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Subject List */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="py-8" />
                    ) : subjects.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-10 rounded-3xl items-center border border-gray-100 dark:border-gray-700 border-dashed">
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-center">No subjects found.</Text>
                        </View>
                    ) : (
                        filteredSubjects.map((Subject) => (
                            <SubjectCard key={Subject.id} Subject={Subject} />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
