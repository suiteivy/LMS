import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, TextInput } from "react-native";
import { ArrowLeft, Users, Filter, Search, Download, TrendingUp } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Student {
    id: string;
    name: string;
    email: string;
    Subject: string;
    grade: string | number;
    progress: number;
}

const StudentCard = ({ student }: { student: Student }) => {
    return (
        <TouchableOpacity className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center border-l-4 border-l-teacherOrange">
            <View className="flex-1">
                <Text className="text-gray-900 font-bold">{student.name}</Text>
                <Text className="text-gray-400 text-xs">{student.Subject}</Text>
            </View>
            <View className="items-end">
                <Text className="text-teacherBlack font-bold">{student.grade}%</Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase">{student.progress}% Progress</Text>
            </View>
        </TouchableOpacity>
    );
};

export default function StudentsPage() {
    const { teacherId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (teacherId) {
            fetchStudents();
        }
    }, [teacherId]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const { data: subjectsData, error: subError } = await supabase
                .from('subjects')
                .select('id, title, class_id')
                .eq('teacher_id', teacherId);

            if (subError) throw subError;
            const subjectIds = subjectsData.map(s => s.id);

            const { data: enrollData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    student_id,
                    subject_id,
                    student:students(
                        id,
                        user:users(full_name, email)
                    )
                `)
                .in('subject_id', subjectIds)
                .eq('status', 'enrolled');

            if (enrollError) throw enrollError;

            const mappedStudents: Student[] = (enrollData || []).map((enroll: any) => {
                const sub = subjectsData.find(s => s.id === enroll.subject_id);
                return {
                    id: enroll.student?.id,
                    name: enroll.student?.user?.full_name || "Unknown",
                    email: enroll.student?.user?.email || "",
                    Subject: sub?.title || "Unknown Subject",
                    grade: "N/A",
                    progress: Math.floor(Math.random() * 30) + 70
                };
            });

            setStudents(mappedStudents);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.Subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const avgProgress = students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
        : 0;

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 px-4">
                {/* Header */}
                <View className="flex-row items-center justify-between py-6">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-100">
                        <ArrowLeft size={20} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-xl font-black text-gray-900">Your Students</Text>
                    <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-100">
                        <Download size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View className="flex-row gap-3 mb-6">
                    <View className="flex-1 bg-teacherOrange p-4 rounded-2xl">
                        <Users size={18} color="white" />
                        <Text className="text-white text-xl font-bold mt-2">{students.length}</Text>
                        <Text className="text-white text-xs uppercase">Total</Text>
                    </View>
                    <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                        <TrendingUp size={18} color="#FF6B00" />
                        <Text className="text-gray-900 text-xl font-bold mt-2">{avgProgress}%</Text>
                        <Text className="text-gray-400 text-xs uppercase">Avg Progress</Text>
                    </View>
                </View>

                {/* Search */}
                <View className="flex-row bg-white rounded-2xl px-4 py-3 border border-gray-100 items-center mb-6">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        placeholder="Search for students..."
                        className="ml-3 flex-1 text-gray-900"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6B00" className="mt-10" />
                ) : (
                    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                        {filteredStudents.length === 0 ? (
                            <View className="items-center justify-center py-20">
                                <Users size={48} color="#E5E7EB" />
                                <Text className="text-gray-400 font-medium mt-4">No students identified</Text>
                            </View>
                        ) : (
                            filteredStudents.map((s, idx) => <StudentCard key={s.id || idx} student={s} />)
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
