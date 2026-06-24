import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, TextInput, Modal } from "react-native";
import { ArrowLeft, Users, Search, Download, Calendar, GraduationCap, X, Phone, User, MapPin, AlertCircle, ShieldAlert, BookOpen, Award } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { StudentService } from "@/services/StudentService";
import { TeacherAPI } from "@/services/TeacherService";
import { useTheme } from "@/contexts/ThemeContext";

interface StudentListItem {
    id: string;
    grade_level: string;
    form_level: string;
    users: {
        first_name: string;
        last_name: string;
        full_name: string;
        avatar_url: string | null;
        email: string;
    };
}

const StudentCard = ({ student, onPress }: { student: StudentListItem; onPress: () => void }) => {
    return (
        <TouchableOpacity 
            onPress={onPress} 
            className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-3 flex-row items-center border-l-4 border-l-[#FF6900] active:bg-gray-50 dark:active:bg-gray-900"
        >
            <View className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/30 items-center justify-center mr-3">
                <Text className="text-[#FF6900] font-black text-sm">
                    {student.users?.first_name?.charAt(0).toUpperCase() || '?'}
                </Text>
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold">{student.users?.full_name}</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-xs">
                    {student.grade_level} {student.form_level ? `\u00B7 ${student.form_level}` : ''}
                </Text>
            </View>
            <View className="items-end bg-orange-50 dark:bg-orange-950/20 px-3 py-1.5 rounded-xl">
                <Text className="text-[#FF6900] font-bold text-xs uppercase tracking-wide">View Profile</Text>
            </View>
        </TouchableOpacity>
    );
};

export default function StudentsPage() {
    const { teacherId } = useAuth();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
    const [studentDetails, setStudentDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailsTab, setDetailsTab] = useState<'info' | 'attendance' | 'performance'>('info');

 useEffect(() => {
 if (teacherId) {
 fetchStudents();
 }
 }, [teacherId]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const data = await StudentService.getStudents();
            setStudents(data || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = async (student: StudentListItem) => {
        setSelectedStudent(student);
        setModalVisible(true);
        setDetailsTab('info');
        try {
            setDetailsLoading(true);
            setStudentDetails(null);
            const details = await TeacherAPI.getStudentDetails(student.id);
            setStudentDetails(details);
        } catch (error) {
            console.error("Error fetching student details:", error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.grade_level?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'present': return 'text-green-500';
            case 'absent': return 'text-red-500';
            case 'late': return 'text-amber-500';
            case 'excused': return 'text-purple-500';
            default: return 'text-gray-400';
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View className="flex-1 px-4">
                {/* Header */}
                <View className="flex-row items-center justify-between py-6">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800">
                        <ArrowLeft size={20} color={isDark ? "#FFFFFF" : "#1F2937"} />
                    </TouchableOpacity>
                    <Text className="text-xl font-black text-gray-900 dark:text-white">Your Students</Text>
                    <View className="w-10 h-10 items-center justify-center rounded-full bg-transparent" />
                </View>

                {/* Summary Card */}
                <View className="flex-row gap-3 mb-6">
                    <View className="flex-1 bg-[#FF6900] p-6 rounded-3xl">
                        <Users size={20} color="white" />
                        <Text className="text-white text-3xl font-bold mt-2">{students.length}</Text>
                        <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">Total Taught Students</Text>
                    </View>
                </View>

                {/* Search */}
                <View className="flex-row bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800 items-center mb-6">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        placeholder="Search for students..."
                        placeholderTextColor="#9CA3AF"
                        className="ml-3 flex-1 text-gray-900 dark:text-white"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-10" />
                ) : (
                    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                        {filteredStudents.length === 0 ? (
                            <View className="items-center justify-center py-20 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-8">
                                <Users size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 dark:text-gray-500 font-medium mt-4">No students found</Text>
                            </View>
                        ) : (
                            filteredStudents.map((s) => (
                                <StudentCard 
                                    key={s.id} 
                                    student={s} 
                                    onPress={() => handleSelectStudent(s)} 
                                />
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Student Profile Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#0f0b2e] rounded-t-[36px] h-[85%] border-t border-gray-100 dark:border-gray-800">
                        {/* Drag indicator / bar */}
                        <View className="items-center pt-3 pb-1">
                            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </View>

                        {/* Modal Header */}
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <View className="flex-row items-center gap-3">
                                <View className="bg-orange-50 dark:bg-orange-950/30 p-2.5 rounded-2xl">
                                    <User size={20} color="#FF6900" />
                                </View>
                                <View>
                                    <Text className="text-gray-900 dark:text-white font-black text-lg">Student Profile</Text>
                                    <Text className="text-gray-400 dark:text-gray-500 text-xs">Scoped Access View</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="w-9 h-9 bg-gray-100 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                            >
                                <X size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Navigation Tabs */}
                        <View className="flex-row px-6 my-4 gap-2">
                            {(['info', 'attendance', 'performance'] as const).map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setDetailsTab(tab)}
                                    className={`flex-1 py-3 rounded-2xl items-center ${
                                        detailsTab === tab 
                                            ? "bg-[#FF6900]" 
                                            : "bg-gray-100 dark:bg-[#1a1a1a]"
                                    }`}
                                >
                                    <Text className={`font-bold text-xs uppercase tracking-wider ${
                                        detailsTab === tab 
                                            ? "text-white" 
                                            : "text-gray-500 dark:text-gray-400"
                                    }`}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {detailsLoading ? (
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator size="large" color="#FF6900" />
                                <Text className="text-gray-400 dark:text-gray-500 mt-4 font-semibold text-sm">Loading details...</Text>
                            </View>
                        ) : !studentDetails ? (
                            <View className="flex-1 items-center justify-center p-6">
                                <AlertCircle size={40} color="#EF4444" />
                                <Text className="text-red-500 font-bold mt-3">Error loading student data</Text>
                            </View>
                        ) : (
                            <ScrollView className="flex-1 px-6 pb-10" showsVerticalScrollIndicator={false}>
                                {/* Header Card */}
                                <View className="bg-orange-50/50 dark:bg-[#1a1a1a]/40 p-5 rounded-3xl border border-orange-100/40 dark:border-gray-800 mb-6 flex-row items-center">
                                    <View className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center mr-4">
                                        <Text className="text-[#FF6900] font-black text-xl">
                                            {studentDetails.profile?.first_name?.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-900 dark:text-white font-black text-lg">{studentDetails.profile?.full_name}</Text>
                                        <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{studentDetails.profile?.email}</Text>
                                        <View className="flex-row items-center gap-1.5 mt-2">
                                            <View className="bg-orange-500/10 px-2.5 py-1 rounded-lg">
                                                <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">
                                                    {studentDetails.profile?.grade_level}
                                                </Text>
                                            </View>
                                            {studentDetails.isClassTeacher && (
                                                <View className="bg-green-500/10 px-2.5 py-1 rounded-lg flex-row items-center gap-1">
                                                    <ShieldAlert size={10} color="#22C55E" />
                                                    <Text className="text-green-600 text-[10px] font-bold uppercase tracking-wider">
                                                        Class Teacher
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {detailsTab === 'info' && (
                                    <View>
                                        {/* General Information Section */}
                                        <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">General Information</Text>
                                        <View className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-4 mb-6">
                                            <View className="flex-row py-3 border-b border-gray-50 dark:border-gray-800">
                                                <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Gender</Text>
                                                <Text className="text-gray-900 dark:text-white text-xs font-bold capitalize">{studentDetails.profile?.gender || 'N/A'}</Text>
                                            </View>
                                            <View className="flex-row py-3 border-b border-gray-50 dark:border-gray-800">
                                                <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Date of Birth</Text>
                                                <Text className="text-gray-900 dark:text-white text-xs font-bold">{studentDetails.profile?.date_of_birth ? new Date(studentDetails.profile.date_of_birth).toLocaleDateString() : 'N/A'}</Text>
                                            </View>
                                            <View className="flex-row py-3 border-b border-gray-50 dark:border-gray-800">
                                                <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Academic Year</Text>
                                                <Text className="text-gray-900 dark:text-white text-xs font-bold">{studentDetails.profile?.academic_year || 'N/A'}</Text>
                                            </View>
                                            <View className="flex-row py-3">
                                                <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Address</Text>
                                                <Text className="text-gray-900 dark:text-white text-xs font-bold flex-1">{studentDetails.profile?.address || 'N/A'}</Text>
                                            </View>
                                        </View>

                                        {/* Class Teacher Scoped Section */}
                                        {studentDetails.isClassTeacher ? (
                                            <View>
                                                <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Guardian & Contacts</Text>
                                                <View className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-4 mb-6">
                                                    <View className="flex-row py-3 border-b border-gray-50 dark:border-gray-800">
                                                        <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Parent Contact</Text>
                                                        <Text className="text-gray-900 dark:text-white text-xs font-bold">{studentDetails.profile?.parent_contact || 'N/A'}</Text>
                                                    </View>
                                                    <View className="flex-row py-3 border-b border-gray-50 dark:border-gray-800">
                                                        <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Emergency Contact</Text>
                                                        <Text className="text-gray-900 dark:text-white text-xs font-bold">{studentDetails.profile?.emergency_contact_name || 'N/A'}</Text>
                                                    </View>
                                                    <View className="flex-row py-3 border-b border-gray-50 dark:border-gray-800">
                                                        <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Emergency Phone</Text>
                                                        <Text className="text-gray-900 dark:text-white text-xs font-bold">{studentDetails.profile?.emergency_contact_phone || 'N/A'}</Text>
                                                    </View>
                                                    <View className="flex-row py-3">
                                                        <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold w-32">Fee Balance</Text>
                                                        <Text className={`text-xs font-black ${Number(studentDetails.profile?.fee_balance) > 0 ? "text-red-500" : "text-green-500"}`}>
                                                            ${studentDetails.profile?.fee_balance || '0.00'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Guardians List */}
                                                <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Associated Guardians</Text>
                                                {(!studentDetails.profile?.guardians || studentDetails.profile?.guardians.length === 0) ? (
                                                    <View className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 mb-6 items-center">
                                                        <User size={24} color="#9CA3AF" />
                                                        <Text className="text-gray-400 dark:text-gray-500 text-xs mt-2">No registered guardians found</Text>
                                                    </View>
                                                ) : (
                                                    studentDetails.profile.guardians.map((g: any, index: number) => (
                                                        <View key={index} className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-4 mb-3 flex-row items-center justify-between">
                                                            <View>
                                                                <Text className="text-gray-900 dark:text-white font-bold text-sm">{g.parent?.user?.full_name}</Text>
                                                                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 capitalize">{g.relationship || 'Guardian'}</Text>
                                                                {g.parent?.user?.email && (
                                                                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">{g.parent?.user?.email}</Text>
                                                                )}
                                                            </View>
                                                            {g.parent?.user?.phone && (
                                                                <TouchableOpacity className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/20 items-center justify-center">
                                                                    <Phone size={16} color="#FF6900" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    ))
                                                )}
                                            </View>
                                        ) : (
                                            /* Locked Section Message */
                                            <View className="bg-gray-100 dark:bg-navy/80 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 items-center flex-row gap-3 mb-6">
                                                <ShieldAlert size={20} color="#FF6900" />
                                                <View className="flex-1">
                                                    <Text className="text-gray-800 dark:text-gray-200 font-bold text-xs uppercase">Access Restrained</Text>
                                                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5 leading-4">
                                                        Guardian details, fee balance, and emergency contacts are only visible to Class Teachers.
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {detailsTab === 'attendance' && (
                                    <View>
                                        <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Attendance History</Text>
                                        {(!studentDetails.attendance || studentDetails.attendance.length === 0) ? (
                                            <View className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-8 items-center">
                                                <Calendar size={36} color="#D1D5DB" />
                                                <Text className="text-gray-450 dark:text-gray-500 text-xs font-semibold mt-3">No attendance records found</Text>
                                            </View>
                                        ) : (
                                            studentDetails.attendance.map((att: any, index: number) => (
                                                <View key={index} className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-4 mb-3.5 flex-row items-center justify-between">
                                                    <View>
                                                        <Text className="text-gray-900 dark:text-white font-bold text-sm">
                                                            {att.subject?.title || 'General Lesson'}
                                                        </Text>
                                                        <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                                                            {new Date(att.date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </Text>
                                                        {att.notes && (
                                                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] italic mt-1">&quot;{att.notes}&quot;</Text>
                                                        )}
                                                    </View>
                                                    <View className="px-3 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/20">
                                                        <Text className={`text-xs font-black uppercase tracking-wider ${getStatusColor(att.status)}`}>
                                                            {att.status}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                )}

                                {detailsTab === 'performance' && (
                                    <View>
                                        {/* Submissions Section */}
                                        <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Submissions & Homework</Text>
                                        {(!studentDetails.performance?.submissions || studentDetails.performance.submissions.length === 0) ? (
                                            <View className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 mb-6 items-center">
                                                <BookOpen size={28} color="#D1D5DB" />
                                                <Text className="text-gray-405 dark:text-gray-500 text-xs font-semibold mt-2">No submission records</Text>
                                            </View>
                                        ) : (
                                            <View className="mb-6">
                                                {studentDetails.performance.submissions.map((sub: any, index: number) => (
                                                    <View key={index} className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-4 mb-3">
                                                        <View className="flex-row justify-between items-start">
                                                            <View className="flex-1 pr-4">
                                                                <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>{sub.assignment?.title}</Text>
                                                                <Text className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">{sub.assignment?.subject?.title}</Text>
                                                            </View>
                                                            <View className="items-end bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded-lg">
                                                                <Text className="text-[#FF6900] font-black text-xs">
                                                                    {sub.grade !== null ? `${sub.grade} / ${sub.assignment?.total_points}` : 'Not Graded'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        {sub.feedback && (
                                                            <View className="mt-3 p-3 bg-gray-50 dark:bg-navy/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                                <Text className="text-gray-400 dark:text-gray-500 text-[9px] uppercase font-black tracking-wider mb-0.5">Feedback</Text>
                                                                <Text className="text-gray-600 dark:text-gray-300 text-xs italic">&quot;{sub.feedback}&quot;</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {/* Exam Results Section */}
                                        <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Exam Results</Text>
                                        {(!studentDetails.performance?.examResults || studentDetails.performance.examResults.length === 0) ? (
                                            <View className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 items-center">
                                                <Award size={28} color="#D1D5DB" />
                                                <Text className="text-gray-405 dark:text-gray-500 text-xs font-semibold mt-2">No exam results recorded</Text>
                                            </View>
                                        ) : (
                                            studentDetails.performance.examResults.map((ex: any, index: number) => (
                                                <View key={index} className="bg-white dark:bg-[#161245]/50 border border-gray-100 dark:border-gray-850 rounded-3xl p-4 mb-3">
                                                    <View className="flex-row justify-between items-start">
                                                        <View className="flex-1 pr-4">
                                                            <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>{ex.exam?.title}</Text>
                                                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">{ex.exam?.subject?.title}</Text>
                                                        </View>
                                                        <View className="items-end bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded-lg">
                                                            <Text className="text-[#FF6900] font-black text-xs">
                                                                {ex.score !== null ? `${ex.score}%` : 'N/A'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {ex.feedback && (
                                                        <View className="mt-3 p-3 bg-gray-50 dark:bg-navy/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                            <Text className="text-gray-400 dark:text-gray-500 text-[9px] uppercase font-black tracking-wider mb-0.5">Feedback</Text>
                                                            <Text className="text-gray-600 dark:text-gray-300 text-xs italic">&quot;{ex.feedback}&quot;</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            ))
                                        )}
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
