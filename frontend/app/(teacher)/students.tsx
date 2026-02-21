import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { ChevronRight, Filter, Search, TrendingUp, Users } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
        <TouchableOpacity className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-3 shadow-sm flex-row items-center">
            {/* Avatar */}
            <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Text className="text-[#FF6900] font-bold text-lg">
                    {student.name.charAt(0)}
                </Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold text-base">{student.name}</Text>
                <Text className="text-[#FF6900] text-xs font-semibold mb-1">{student.id}</Text>
                <Text className="text-gray-400 text-xs">{student.Subject}</Text>
                <View className="flex-row items-center mt-1">
                    <TrendingUp size={12} color="#6B7280" />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs ml-1">{student.progress}% complete</Text>
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
    const { profile, teacherId } = useAuth();
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

            const { data: enrollData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    subject_id,
                    grade,
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
                    grade: enroll.grade || "N/A",
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

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.Subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = selectedSubject === "all" || s.Subject === selectedSubject;
        return matchesSearch && matchesSubject;
    });

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="Students"
                role="Teacher"
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Filter and stats row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-500 font-semibold text-xs uppercase tracking-widest">
                                {students.length} total enrolled
                            </Text>
                        </View>
                        <TouchableOpacity className="p-2.5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm active:bg-gray-50">
                            <Filter size={18} color="#FF6900" />
                        </TouchableOpacity>
                    </View>

                    {/* Summary Cards */}
                    <View className="flex-row gap-3 mb-6">
                        <View className="flex-1 bg-[#FF6900] p-4 rounded-3xl shadow-sm">
                            <Users size={18} color="white" />
                            <Text className="text-white text-2xl font-bold mt-2">{students.length}</Text>
                            <Text className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Total Enrolled</Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <TrendingUp size={18} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-white text-2xl font-bold mt-2">78%</Text>
                            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Avg Progress</Text>
                        </View>
                    </View>

                    {/* Search & Filter */}
                    <View className="flex-row items-center bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-3 mb-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-gray-900 dark:text-white font-medium"
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
                            className={`px-5 py-2.5 rounded-2xl mx-1 border ${selectedSubject === "all" ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800 shadow-sm'}`}
                        >
                            <Text className={`font-bold text-xs ${selectedSubject === "all" ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>All Subjects</Text>
                        </TouchableOpacity>
                        {subjects.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                onPress={() => setSelectedSubject(s.title)}
                                className={`px-5 py-2.5 rounded-2xl mx-1 border ${selectedSubject === s.title ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800 shadow-sm'}`}
                            >
                                <Text className={`font-bold text-xs ${selectedSubject === s.title ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{s.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Student List */}
                    <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-1 tracking-tight">All Students</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="py-8" />
                    ) : filteredStudents.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl items-center border border-gray-100 dark:border-gray-700 border-dashed">
                            <Text className="text-gray-500 dark:text-gray-400 font-medium text-center">No students found.</Text>
                        </View>
                    ) : (
                        filteredStudents.map((student, index) => (
                            <StudentCard key={`${student.id}-${index}`} student={student} />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
