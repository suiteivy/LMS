import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { ArrowLeft, TrendingUp, Users, BookOpen, Clock, Award, ChevronDown, Download } from 'lucide-react-native';
import { router } from "expo-router";

interface CourseAnalytics {
    id: string;
    name: string;
    students: number;
    avgProgress: number;
    avgGrade: number;
    completionRate: number;
}

const StatBox = ({ icon: Icon, label, value, color, bgColor }: { icon: any; label: string; value: string; color: string; bgColor: string }) => (
    <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
        <View style={{ backgroundColor: bgColor }} className="w-10 h-10 rounded-xl items-center justify-center mb-2">
            <Icon size={20} color={color} />
        </View>
        <Text className="text-gray-900 text-2xl font-bold">{value}</Text>
        <Text className="text-gray-400 text-xs uppercase">{label}</Text>
    </View>
);

const CourseAnalyticsCard = ({ course }: { course: CourseAnalytics }) => {
    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold">{course.name}</Text>
                    <Text className="text-gray-400 text-xs">{course.students} students</Text>
                </View>
                <View className="bg-teal-50 px-2 py-1 rounded-full">
                    <Text className="text-teal-600 text-xs font-bold">{course.completionRate}% complete</Text>
                </View>
            </View>

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-gray-400 text-xs mb-1">Avg Progress</Text>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View className="h-full bg-blue-500 rounded-full" style={{ width: `${course.avgProgress}%` }} />
                    </View>
                    <Text className="text-blue-600 text-xs font-bold mt-1">{course.avgProgress}%</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-gray-400 text-xs mb-1">Avg Grade</Text>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View className="h-full bg-green-500 rounded-full" style={{ width: `${course.avgGrade}%` }} />
                    </View>
                    <Text className="text-green-600 text-xs font-bold mt-1">{course.avgGrade}%</Text>
                </View>
            </View>
        </View>
    );
};

export default function AnalyticsPage() {
    const [selectedPeriod, setSelectedPeriod] = useState("This Month");

    const courseAnalytics: CourseAnalytics[] = [
        { id: "1", name: "Mathematics", students: 25, avgProgress: 78, avgGrade: 85, completionRate: 72 },
        { id: "2", name: "Computer Science", students: 30, avgProgress: 65, avgGrade: 78, completionRate: 55 },
        { id: "3", name: "Writing Workshop", students: 20, avgProgress: 82, avgGrade: 88, completionRate: 80 },
        { id: "4", name: "Digital Literacy", students: 15, avgProgress: 45, avgGrade: 72, completionRate: 35 },
    ];

    const totalStudents = courseAnalytics.reduce((acc, c) => acc + c.students, 0);
    const avgCompletion = Math.round(courseAnalytics.reduce((acc, c) => acc + c.completionRate, 0) / courseAnalytics.length);

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4">
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center">
                                <TouchableOpacity className="p-2 mr-2" onPress={() => router.back()}>
                                    <ArrowLeft size={24} color="#374151" />
                                </TouchableOpacity>
                                <Text className="text-2xl font-bold text-gray-900">Analytics</Text>
                            </View>
                            <TouchableOpacity className="p-2 bg-white rounded-xl border border-gray-100">
                                <Download size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Period Selector */}
                        <TouchableOpacity className="bg-white rounded-xl px-4 py-3 mb-6 border border-gray-100 flex-row items-center justify-between">
                            <Text className="text-gray-700 font-medium">{selectedPeriod}</Text>
                            <ChevronDown size={16} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Overview Stats */}
                        <View className="flex-row gap-3 mb-6">
                            <StatBox icon={Users} label="Students" value={totalStudents.toString()} color="#0d9488" bgColor="#ccfbf1" />
                            <StatBox icon={TrendingUp} label="Completion" value={`${avgCompletion}%`} color="#3b82f6" bgColor="#dbeafe" />
                        </View>
                        <View className="flex-row gap-3 mb-6">
                            <StatBox icon={BookOpen} label="Courses" value={courseAnalytics.length.toString()} color="#8b5cf6" bgColor="#ede9fe" />
                            <StatBox icon={Award} label="Avg Grade" value="81%" color="#22c55e" bgColor="#dcfce7" />
                        </View>

                        {/* Performance Chart Placeholder */}
                        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-6">
                            <Text className="text-gray-900 font-bold mb-4">Performance Trend</Text>
                            <View className="h-40 bg-gray-50 rounded-xl items-center justify-center">
                                <TrendingUp size={48} color="#e5e7eb" />
                                <Text className="text-gray-400 text-sm mt-2">Chart coming soon</Text>
                            </View>
                        </View>

                        {/* Course Breakdown */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">Course Breakdown</Text>
                        {courseAnalytics.map((course) => (
                            <CourseAnalyticsCard key={course.id} course={course} />
                        ))}

                        {/* Top Performers */}
                        <View className="bg-gradient-to-r bg-teal-600 p-4 rounded-2xl mt-4">
                            <Text className="text-white font-bold mb-3">🏆 Top Performers</Text>
                            <View className="flex-row justify-between">
                                <View className="items-center">
                                    <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mb-1">
                                        <Text className="text-white font-bold">SJ</Text>
                                    </View>
                                    <Text className="text-teal-100 text-xs">Sarah J.</Text>
                                    <Text className="text-white font-bold text-xs">98%</Text>
                                </View>
                                <View className="items-center">
                                    <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mb-1">
                                        <Text className="text-white font-bold">MC</Text>
                                    </View>
                                    <Text className="text-teal-100 text-xs">Michael C.</Text>
                                    <Text className="text-white font-bold text-xs">95%</Text>
                                </View>
                                <View className="items-center">
                                    <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mb-1">
                                        <Text className="text-white font-bold">GW</Text>
                                    </View>
                                    <Text className="text-teal-100 text-xs">Grace W.</Text>
                                    <Text className="text-white font-bold text-xs">94%</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
