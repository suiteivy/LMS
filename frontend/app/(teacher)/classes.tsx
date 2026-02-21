import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { ChevronRight, School, Users } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface ClassItem {
    id: string;
    name: string;
    student_count?: number;
    teacher_id?: string | null;
    institution_id?: string | null;
    created_at?: string;
}

export default function TeacherClasses() {
    const { teacherId } = useAuth();
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
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', teacherId);

            if (error) throw error;

            const typedData = data as ClassItem[];

            const classesWithCounts = await Promise.all(typedData.map(async (cls) => {
                const { count } = await supabase
                    .from('enrollments')
                    .select('id, subjects!inner(class_id)', { count: 'exact', head: true })
                    .eq('subjects.class_id', cls.id);

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
        <View className="flex-1 bg-white dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="My Classes"
                role="Teacher"
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    <View className="mb-6 px-2">
                        <Text className="text-gray-400 dark:text-gray-500 font-semibold text-xs uppercase tracking-widest">
                            {classes.length} {classes.length === 1 ? 'class' : 'classes'} assigned
                        </Text>
                    </View>

                    {loading ? (
                        <View className="items-center justify-center p-8">
                            <ActivityIndicator size="large" color="#FF6900" />
                        </View>
                    ) : (
                        <View>
                            {classes.length === 0 ? (
                                <View className="bg-white dark:bg-[#1a1a1a] p-10 rounded-3xl items-center border border-gray-100 dark:border-gray-800 border-dashed">
                                    <School size={48} color="#9CA3AF" />
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 text-center">
                                        No classes assigned yet.
                                    </Text>
                                </View>
                            ) : (
                                classes.map((cls) => (
                                    <TouchableOpacity
                                        key={cls.id}
                                        className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 shadow-sm flex-row items-center active:bg-gray-50 dark:active:bg-gray-900"
                                    >
                                        <View className="bg-orange-50 p-3 rounded-2xl mr-4">
                                            <Users size={24} color="#FF6900" />
                                        </View>

                                        <View className="flex-1">
                                            <Text className="text-gray-900 dark:text-white font-bold text-lg">{cls.name}</Text>
                                            <Text className="text-gray-600 dark:text-gray-300 text-sm font-medium">
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
    );
}
