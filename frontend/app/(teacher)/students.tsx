import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { Search, Users, TrendingUp, ChevronRight, Filter } from 'lucide-react-native';

interface Student {
    id: string;
    name: string;
    email: string;
    course: string;
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
            <View className="w-12 h-12 rounded-full bg-teal-100 items-center justify-center mr-3">
                <Text className="text-teal-600 font-bold text-lg">
                    {student.name.charAt(0)}
                </Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold text-base">{student.name}</Text>
                <Text className="text-gray-400 text-xs">{student.course}</Text>
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
    const [searchQuery, setSearchQuery] = useState("");

    const students: Student[] = [
        { id: "1", name: "Sarah Johnson", email: "sarah@email.com", course: "Mathematics", grade: "A", progress: 92 },
        { id: "2", name: "Michael Chen", email: "michael@email.com", course: "Writing Workshop", grade: "A-", progress: 88 },
        { id: "3", name: "Alice Kamau", email: "alice@email.com", course: "Computer Science", grade: "B+", progress: 75 },
        { id: "4", name: "James Omondi", email: "james@email.com", course: "Mathematics", grade: "B", progress: 68 },
        { id: "5", name: "Grace Wanjiku", email: "grace@email.com", course: "Digital Literacy", grade: "A", progress: 95 },
        { id: "6", name: "Peter Njoroge", email: "peter@email.com", course: "Computer Science", grade: "C+", progress: 55 },
    ];

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.course.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            <View className="flex-1 bg-teal-600 p-4 rounded-2xl">
                                <Users size={18} color="white" />
                                <Text className="text-white text-xl font-bold mt-2">{students.length}</Text>
                                <Text className="text-teal-100 text-xs uppercase">Total</Text>
                            </View>
                            <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                                <TrendingUp size={18} color="#0d9488" />
                                <Text className="text-gray-900 text-xl font-bold mt-2">78%</Text>
                                <Text className="text-gray-400 text-xs uppercase">Avg Progress</Text>
                            </View>
                        </View>

                        {/* Search */}
                        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-6 border border-gray-100">
                            <Search size={20} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-3 text-gray-900"
                                placeholder="Search students or courses..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {/* Student List */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">All Students</Text>
                        {filteredStudents.map((student) => (
                            <StudentCard key={student.id} student={student} />
                        ))}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
