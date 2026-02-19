import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { Search, Users, TrendingUp, ChevronRight, Filter } from 'lucide-react-native';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";

interface Student {
    id: string;
    name: string;
    email: string;
    Subject: string;
    grade: string;
    progress: number;
}

interface StudentCardProps {
    student: Student;
}

const StudentCard = ({ student }: StudentCardProps) => {
    const getGradeColor = (grade: string) => {
        if (grade.startsWith('A')) return 'text-green-600 bg-green-50';
        if (grade.startsWith('B')) return 'text-blue-600 bg-blue-50';
        if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <TouchableOpacity className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm flex-row items-center">
            {/* Avatar */}
            <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Text className="text-teacherOrange font-bold text-lg">
                    {student.name.charAt(0)}
                </Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold text-base">{student.name}</Text>
                <Text className="text-teacherOrange text-xs font-medium mb-1">{student.id}</Text>
                <Text className="text-gray-400 text-xs">{student.Subject}</Text>
                <View className="flex-row items-center mt-1">
                    <TrendingUp size={12} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1">{student.progress}% complete</Text>
                </View>
            </View>

            {/* Grade */}
            <View className={`px-3 py-1 rounded-full mr-2 ${getGradeColor(student.grade)}`}>
                <Text className={`font-bold text-sm ${getGradeColor(student.grade).split(' ')[0]}`}>
                    {student.grade}
                </Text>
            </View>

            <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
};

// ... (imports remain similar)

export default function TeacherStudents() {
    const { teacherId } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string>("all");
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        if (teacherId) {
            fetchInitialData(teacherId);
        }
    }, [teacherId]);

    const fetchInitialData = async (tid: string) => {
        try {
            setLoading(true);
            // 1. Get subjects for this teacher
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, title')
                .eq('teacher_id', tid);

            if (subjectsError) throw subjectsError;
            setSubjects(subjectsData || []);

            const subjectIds = (subjectsData || []).map(s => s.id);

            if (subjectIds.length === 0) {
                setStudents([]);
                return;
            }

            // 2. Get enrollments for these subjects
            const { data: enrollData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    subject_id,
                    student:students(
                        id,
                        user:users(full_name, email)
                    )
                `)
                .in('subject_id', subjectIds)
                .eq('status', 'enrolled');

            if (enrollError) throw enrollError;

            // Map to Student interface
            const mappedStudents: Student[] = (enrollData || []).map((enroll: any) => {
                const sub = subjectsData.find(s => s.id === enroll.subject_id);
                return {
                    id: enroll.student?.id,
                    name: enroll.student?.user?.full_name || "Unknown",
                    email: enroll.student?.user?.email || "",
                    Subject: sub?.title || "Unknown Subject",
                    grade: "A", // Placeholder
                    progress: Math.floor(Math.random() * 40) + 60 // Simulated progress
                };
            });

            setStudents(mappedStudents);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.Subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = selectedSubject === "all" || s.Subject === selectedSubject;
        return matchesSearch && matchesSubject;
    });

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
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
                            <View>
                                <Text className="text-2xl font-bold text-gray-900">Students</Text>
                                <Text className="text-gray-500 text-sm">{students.length} total enrolled</Text>
                            </View>
                            <TouchableOpacity className="p-2 bg-white rounded-xl border border-gray-100">
                                <Filter size={20} color="#6B7280" />
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
                                <Text className="text-gray-900 text-xl font-bold mt-2">78%</Text>
                                <Text className="text-gray-400 text-xs uppercase">Avg Progress</Text>
                            </View>
                        </View>

                        {/* Search & Filter */}
                        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100 shadow-sm">
                            <Search size={20} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-3 text-gray-900"
                                placeholder="Search students..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {/* Subject Filter Tags */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 -mx-1">
                            <TouchableOpacity
                                onPress={() => setSelectedSubject("all")}
                                className={`px-4 py-2 rounded-full mx-1 border ${selectedSubject === "all" ? 'bg-teacherOrange border-teacherOrange' : 'bg-white border-gray-100'}`}
                            >
                                <Text className={`font-bold text-xs ${selectedSubject === "all" ? 'text-white' : 'text-gray-500'}`}>All Subjects</Text>
                            </TouchableOpacity>
                            {subjects.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    onPress={() => setSelectedSubject(s.title)}
                                    className={`px-4 py-2 rounded-full mx-1 border ${selectedSubject === s.title ? 'bg-teacherOrange border-teacherOrange' : 'bg-white border-gray-100'}`}
                                >
                                    <Text className={`font-bold text-xs ${selectedSubject === s.title ? 'text-white' : 'text-gray-500'}`}>{s.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Student List */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">All Students</Text>
                        {filteredStudents.length === 0 ? (
                            <Text className="text-gray-500 text-center py-4">No students found.</Text>
                        ) : (
                            filteredStudents.map((student, index) => (
                                <StudentCard key={`${student.id}-${index}`} student={student} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
