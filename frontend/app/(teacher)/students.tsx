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

export default function TeacherStudents() {
    const { teacherId } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teacherId) {
            fetchStudents();
        }
    }, [teacherId]);

    const fetchStudents = async () => {
        if (!teacherId) return;
        try {
            setLoading(true);
            // 1. Get classes for this teacher
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('id, name')
                .eq('teacher_id', teacherId);

            if (classesError) throw classesError;

            const classIds = classesData.map(c => c.id);

            if (classIds.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            // 2. Get enrollments for these classes
            // We need to join with students -> users to get name/email
            const { data: enrollData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    class_id,
                    student:students(
                        id,
                        user:users(full_name, email)
                    )
                `)
                .in('class_id', classIds);

            if (enrollError) throw enrollError;

            // Map to Student interface
            const mappedStudents: Student[] = enrollData.map((enroll: any) => {
                const cls = classesData.find(c => c.id === enroll.class_id);
                return {
                    id: enroll.student?.id,
                    name: enroll.student?.user?.full_name || "Unknown",
                    email: enroll.student?.user?.email || "",
                    Subject: cls?.name || "Unknown Class",
                    grade: "N/A",
                    progress: 0
                };
            });

            // Remove duplicates via Map if a student is in multiple classes?
            // Or show them as separate entries (one per class enrollment)?
            // The UI shows "All Students", typically unique students.
            // But the 'Subject' field implies enrollment context.
            // Let's keep them as enrollments for now.

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
                                <Text className="text-gray-900 text-xl font-bold mt-2">0%</Text>
                                <Text className="text-gray-400 text-xs uppercase">Avg Progress</Text>
                            </View>
                        </View>

                        {/* Search */}
                        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-6 border border-gray-100">
                            <Search size={20} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-3 text-gray-900"
                                placeholder="Search students or Subjects..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

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
