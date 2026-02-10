import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { Plus, Users, TrendingUp, Edit, Eye } from 'lucide-react-native';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";

interface Course {
    id: string;
    title: string;
    students: number;
    completion: number;
    status: "active" | "draft";
    lastUpdated: string;
}

interface CourseCardProps {
    course: Course;
}

const CourseCard = ({ course }: CourseCardProps) => {
    const isActive = course.status === "active";

    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                    <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                        {course.title}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                        Updated {course.lastUpdated}
                    </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${isActive ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-gray-100"}`}>
                    <Text className={`text-xs font-bold ${isActive ? "text-green-600" : "text-gray-500"}`}>
                        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between mb-4">
                <View className="flex-row items-center">
                    <Users size={14} color="#6B7280" />
                    <Text className="text-gray-600 text-xs ml-1">{course.students} students</Text>
                </View>
                <View className="flex-row items-center">
                    <TrendingUp size={14} color="#6B7280" />
                    <Text className="text-gray-600 text-xs ml-1">{course.completion}% completion</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <View
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${course.completion}%` }}
                />
            </View>

            <View className="flex-row justify-end mt-4 gap-4">
                <TouchableOpacity className="flex-row items-center">
                    <Edit size={16} color="#0d9488" />
                    <Text className="text-teal-600 text-xs ml-1 font-medium">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center">
                    <Eye size={16} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1 font-medium">View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function TeacherCourses() {
    const { teacherId } = useAuth();
    const [filter, setFilter] = useState<"all" | "active" | "draft">("all");
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teacherId) {
            fetchCourses();
        }
    }, [teacherId]);

    const fetchCourses = async () => {
        if (!teacherId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('teacher_id', teacherId);

            if (error) throw error;

            const mappedCourses: Course[] = data.map((c: any) => ({
                id: c.id,
                title: c.name,
                students: 0, // Need to count enrollments via class link, complicated query. Mock for now.
                completion: 0, // Mock for now
                status: "active", // Default, schema has no status column for now but we can assume active
                lastUpdated: new Date(c.updated_at).toLocaleDateString()
            }));

            setCourses(mappedCourses);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = filter === "all"
        ? courses
        : courses.filter(c => c.status === filter);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0d9488" />
            </View>
        );
    }

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4 md:p-8">
                        {/* Header */}
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-gray-900">My Courses</Text>
                            {/* Add button if needed */}
                        </View>

                        {/* Filter Tabs */}
                        <View className="flex-row bg-white rounded-xl p-1 mb-6 border border-gray-100">
                            {(["all", "active", "draft"] as const).map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    className={`flex-1 py-2 rounded-lg ${filter === tab ? "bg-teal-600" : ""}`}
                                    onPress={() => setFilter(tab)}
                                >
                                    <Text className={`text-center font-semibold text-sm ${filter === tab ? "text-white" : "text-gray-500"}`}>
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Course List */}
                        {courses.length === 0 ? (
                            <Text className="text-gray-500 text-center py-4">No courses found.</Text>
                        ) : (
                            filteredCourses.map((course) => (
                                <CourseCard key={course.id} course={course} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
