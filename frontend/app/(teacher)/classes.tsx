import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { Users, BookOpen, ChevronRight, School } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ClassItem {
    id: string;
    name: string;
    student_count?: number; // Optional, derived
    teacher_id?: string | null;
    institution_id?: string | null;
    created_at?: string;
}

export default function TeacherClasses() {
    const { user, teacherId } = useAuth();
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teacherId) {
            fetchClasses();
        }
    }, [teacherId]);

    const fetchClasses = async () => {
        if (!teacherId) return;

        try {
            // Fetch classes where the current user is the teacher
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', teacherId);

            if (error) throw error;

            const typedData = data as ClassItem[];

            // For each class, get student count (optional optimization: use a view or rpc)
            const classesWithCounts = await Promise.all(typedData.map(async (cls) => {
                const { count } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', cls.id);

                return {
                    ...cls,
                    student_count: count || 0
                };
            }));

            setClasses(classesWithCounts);
        } catch (error) {
            console.error("Error fetching classes:", error);
        } finally {
            setLoading(false);
        }
    };

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
                            <View>
                                <Text className="text-2xl font-bold text-gray-900">My Classes</Text>
                                <Text className="text-gray-500 text-sm">
                                    {classes.length} {classes.length === 1 ? 'class' : 'classes'} assigned
                                </Text>
                            </View>
                        </View>

                        {/* Loading State */}
                        {loading ? (
                            <View className="items-center justify-center p-8">
                                <ActivityIndicator size="large" color="#0d9488" />
                            </View>
                        ) : (
                            <View>
                                {/* Class List */}
                                {classes.length === 0 ? (
                                    <View className="bg-white p-8 rounded-2xl items-center border border-gray-100 border-dashed">
                                        <School size={48} color="#9CA3AF" />
                                        <Text className="text-gray-500 font-medium mt-4 text-center">
                                            No classes assigned yet.
                                        </Text>
                                    </View>
                                ) : (
                                    classes.map((cls) => (
                                        <TouchableOpacity
                                            key={cls.id}
                                            className="bg-white p-5 rounded-2xl border border-gray-100 mb-3 shadow-sm flex-row items-center"
                                        // onPress={() => router.push(`/(teacher)/classes/${cls.id}`)} // Todo: Detail page
                                        >
                                            <View className="bg-teal-50 p-3 rounded-xl mr-4">
                                                <Users size={24} color="#0d9488" />
                                            </View>

                                            <View className="flex-1">
                                                <Text className="text-gray-900 font-bold text-lg">{cls.name}</Text>
                                                <Text className="text-gray-500 text-sm">
                                                    {cls.student_count} Students
                                                </Text>
                                            </View>

                                            <ChevronRight size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
