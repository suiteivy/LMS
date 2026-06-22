import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { DiaryAPI, DiaryEntry } from "@/services/DiaryService";
import { ParentAPI } from "@/services/ParentService";
import { SubjectAPI, SubjectData } from "@/services/SubjectService";
import { router, useLocalSearchParams } from "expo-router";
import { BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronUp, Circle, User, SlidersHorizontal, FileText, ExternalLink, Printer } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as WebBrowser from 'expo-web-browser';

const DiaryCard = ({ entry, onSign }: { entry: DiaryEntry; onSign: (id: string) => void }) => {
    const [signing, setSigning] = useState(false);

    const handleSign = async () => {
        setSigning(true);
        try {
            await onSign(entry.id);
        } finally {
            setSigning(false);
        }
    };

    const isSigned = entry.is_signed;
    const assignment = entry.assignment;

    // Harmonized status colors
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Graded':
                return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }; // Sky blue
            case 'Submitted':
                return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }; // Green
            case 'Overdue':
                return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' }; // Red
            default: // Pending
                return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }; // Amber
        }
    };

    const statusStyle = assignment ? getStatusColor(assignment.status) : null;

    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row items-start mb-4">
                <View className={`p-2.5 rounded-2xl mr-4 ${assignment ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'bg-orange-100 dark:bg-orange-950/20'}`}>
                    {assignment ? (
                        <FileText size={20} color="#6366F1" />
                    ) : (
                        <BookOpen size={20} color="#FF6900" />
                    )}
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center flex-wrap gap-2 mb-1.5">
                        {assignment && (
                            <View className="bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                                    {assignment.subject_name}
                                </Text>
                            </View>
                        )}
                        {assignment && statusStyle && (
                            <View 
                                style={{ 
                                    backgroundColor: statusStyle.bg, 
                                    borderColor: statusStyle.border,
                                    borderWidth: 1,
                                    paddingHorizontal: 8, 
                                    paddingVertical: 2, 
                                    borderRadius: 8 
                                }}
                            >
                                <Text style={{ color: statusStyle.text, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {assignment.status}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">
                        {assignment ? assignment.title : entry.title}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <Calendar size={12} color="#9CA3AF" />
                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest ml-1">
                            {assignment 
                                ? `Due: ${assignment.due_date_formatted}` 
                                : new Date(entry.entry_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {/* Signed badge */}
                {isSigned && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                        <CheckCircle2 size={12} color="#16a34a" />
                        <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>Signed</Text>
                    </View>
                )}
            </View>

            <Text className="text-gray-600 dark:text-gray-400 text-sm leading-5 mb-4">
                {assignment ? assignment.description : entry.content}
            </Text>

            {/* Assignment fields: Grade & Attachments */}
            {assignment && (
                <View className="bg-gray-50 dark:bg-[#151515] p-4 rounded-2xl mb-4 border border-gray-100/50 dark:border-gray-800/50">
                    <View className="flex-row justify-between items-center mb-2.5">
                        <Text className="text-gray-400 dark:text-gray-500 text-[11px] font-bold uppercase tracking-wider">Score / Grade</Text>
                        {assignment.status === 'Graded' && assignment.grade !== null ? (
                            <Text className="text-green-600 dark:text-green-400 font-extrabold text-sm">
                                {assignment.grade} / {assignment.total_points || 100}
                            </Text>
                        ) : (
                            <Text className="text-gray-400 dark:text-gray-500 font-semibold text-xs">
                                {assignment.status === 'Submitted' ? 'Pending Grading' : 'Not Graded'}
                            </Text>
                        )}
                    </View>

                    {assignment.feedback && (
                        <View className="mt-1.5 pt-2 border-t border-gray-200/50 dark:border-gray-800/50">
                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Teacher Feedback</Text>
                            <Text className="text-gray-600 dark:text-gray-400 text-xs italic">
                                &ldquo;{assignment.feedback}&rdquo;
                            </Text>
                        </View>
                    )}

                    {assignment.attachment_url && (
                        <View className="mt-2.5 pt-2 border-t border-gray-200/50 dark:border-gray-800/50 flex-row items-center justify-between">
                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">Reference Materials</Text>
                            <TouchableOpacity 
                                onPress={() => WebBrowser.openBrowserAsync(assignment.attachment_url!)}
                                className="flex-row items-center bg-white dark:bg-[#202020] px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800"
                            >
                                <ExternalLink size={11} color="#6366F1" />
                                <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] ml-1.5 uppercase tracking-wider">
                                    View File
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            <View className="flex-row justify-between items-center pt-4 mt-4 border-t border-gray-50 dark:border-gray-800">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">
                    Teacher: {entry.teacher?.users?.full_name || "School Office"}
                </Text>

                {/* Sign button — only shown if not yet signed */}
                {!isSigned && (
                    <TouchableOpacity
                        onPress={handleSign}
                        disabled={signing}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: signing ? '#f3f4f6' : '#FF6900',
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 999,
                            opacity: signing ? 0.7 : 1,
                        }}
                    >
                        {signing
                            ? <ActivityIndicator size="small" color="#FF6900" />
                            : <>
                                <Circle size={12} color="white" />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>Sign</Text>
                            </>
                        }
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function ParentDiaryPage() {
    const { user } = useAuth();
    const { studentId: paramStudentId } = useLocalSearchParams<{ studentId?: string }>();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);

    // Filter states
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchLinkedStudents();
    }, []);

    useEffect(() => {
        if (paramStudentId && students.some(s => s.id === paramStudentId)) {
            setSelectedStudentId(paramStudentId);
        }
    }, [paramStudentId, students]);

    useEffect(() => {
        if (selectedStudentId) {
            fetchEntries();
        }
    }, [selectedStudentId]);

    useEffect(() => {
        const student = students.find(s => s.id === selectedStudentId);
        if (student && student.class_id) {
            fetchSubjects(student.class_id);
        } else {
            setSubjects([]);
        }
    }, [selectedStudentId, students]);

    const fetchLinkedStudents = async () => {
        try {
            const data = await ParentAPI.getLinkedStudents();
            setStudents(data);
            if (data && data.length > 0) {
                const initialId = paramStudentId && data.some((s: any) => s.id === paramStudentId)
                    ? paramStudentId
                    : data[0].id;
                setSelectedStudentId(initialId);
            }
        } catch (error) {
            console.error("Error fetching linked students:", error);
        }
    };

    const fetchSubjects = async (classId: string) => {
        try {
            const data = await SubjectAPI.getSubjectsByClass(classId);
            setSubjects(data || []);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchEntries = async () => {
        if (!selectedStudentId) return;
        setLoading(true);
        try {
            const data = await DiaryAPI.getEntries(undefined, selectedStudentId);
            setEntries(data);
        } catch (error) {
            console.error("Error fetching diary entries:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async (entryId: string) => {
        try {
            await DiaryAPI.signEntry(entryId);
            setEntries(prev => prev.map(e => e.id === entryId ? { ...e, is_signed: true } : e));
        } catch (error) {
            Alert.alert("Error", "Could not sign this diary entry. Please try again.");
        }
    };

    const selectedStudentName = students.find(s => s.id === selectedStudentId)?.users?.full_name || "Select Student";

    // Client-side filtering logic
    const filteredEntries = entries.filter(entry => {
        if (selectedSubjectId !== "all") {
            if (!entry.assignment_id || !entry.assignment || entry.assignment.subject?.id !== selectedSubjectId) {
                return false;
            }
        }

        if (selectedStatus !== "all") {
            const status = entry.assignment?.status || 'Pending';
            if (status.toLowerCase() !== selectedStatus.toLowerCase()) {
                return false;
            }
        }

        if (startDate) {
            const entryDate = new Date(entry.entry_date);
            const start = new Date(startDate);
            entryDate.setHours(0,0,0,0);
            start.setHours(0,0,0,0);
            if (entryDate < start) return false;
        }

        if (endDate) {
            const entryDate = new Date(entry.entry_date);
            const end = new Date(endDate);
            entryDate.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            if (entryDate > end) return false;
        }

        return true;
    });

    const handlePrint = async () => {
        if (!selectedStudentId || filteredEntries.length === 0) {
            Alert.alert("No Data", "There are no matching entries to print.");
            return;
        }

        try {
            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #334155; line-height: 1.5; }
                            .brand { color: #FF6900; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; }
                            .header { margin-bottom: 50px; }
                            .header h1 { font-size: 36px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -1px; }
                            .header p { font-size: 18px; color: #64748b; margin: 5px 0 0; }
                            .report-info { display: flex; gap: 40px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 20px; border: 1px solid #f1f5f9; }
                            .info-item { display: flex; flex-direction: column; }
                            .info-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                            .info-value { font-size: 14px; font-weight: 600; color: #1e293b; }
                            .entry-list { display: flex; flex-direction: column; gap: 30px; }
                            .entry { border-bottom: 1px solid #f1f5f9; padding-bottom: 30px; page-break-inside: avoid; }
                            .entry-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
                            .entry-title { font-size: 18px; font-weight: 700; color: #0f172a; }
                            .entry-date { font-size: 12px; font-weight: 600; color: #FF6900; }
                            .entry-content { font-size: 14px; color: #475569; background: #fff; padding: 0; }
                            .entry-footer { margin-top: 15px; font-size: 11px; color: #94a3b8; font-weight: 600; }
                            .footer { margin-top: 80px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 30px; }
                            @media print {
                                body { padding: 20px; }
                                .report-info { background: #fafafa; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="brand">LMS Platform</div>
                        <div class="header">
                            <h1>Student Diary Report</h1>
                            <p>Academic Journey & Daily Progress</p>
                        </div>
                        
                        <div class="report-info">
                            <div class="info-item">
                                <span class="info-label">Student Name</span>
                                <span class="info-value">${selectedStudentName}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Report Date</span>
                                <span class="info-value">${new Date().toLocaleDateString()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Matching Logs</span>
                                <span class="info-value">${filteredEntries.length}</span>
                            </div>
                        </div>
 
                        <div class="entry-list">
                            ${filteredEntries.map(e => {
                                const isAssignment = !!e.assignment_id && !!e.assignment;
                                return `
                                <div class="entry">
                                    <div class="entry-header">
                                        <div class="entry-title">${isAssignment ? e.assignment!.title : e.title}</div>
                                        <div class="entry-date">${new Date(e.entry_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                    ${isAssignment ? `<div style="font-size: 11px; font-weight: 700; color: #6366F1; text-transform: uppercase; margin-bottom: 8px;">Subject: ${e.assignment!.subject_name} &bull; Status: ${e.assignment!.status} ${e.assignment!.grade !== null ? `&bull; Grade: ${e.assignment!.grade}` : ''}</div>` : ''}
                                    <div class="entry-content">${isAssignment ? e.assignment!.description : e.content}</div>
                                    <div class="entry-footer">
                                        Reported by Teacher: ${e.teacher?.users?.full_name || "School Authority"} \u2022 ${e.is_signed ? 'Acknowledged by Parent/Guardian' : 'Pending Acknowledgement'}
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
 
                        <div class="footer">
                            <p>This is a generated student progress report. For inquiries, please contact the school administration.</p>
                            <p>© ${new Date().getFullYear()} LMS Educational Systems</p>
                        </div>
                    </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                const printWindow = window.open('', '_blank');
                printWindow?.document.write(html);
                printWindow?.document.close();
                printWindow?.print();
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert("Print Error", "Failed to generate diary report.");
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-[#0c0c0c]">
            <UnifiedHeader
                title="Class Diary"
                subtitle="Daily Activities"
                role="Parent/Guardian"
                onBack={() => router.push("/(parent)")}
            />

            <View className="p-4 md:p-8 flex-1">
                {/* Student Selection */}
                {students.length > 1 && (
                    <View className="mb-6 relative z-10">
                        <TouchableOpacity
                            className="bg-white dark:bg-[#1a1a1a] rounded-3xl px-6 py-4 border border-gray-100 dark:border-gray-800 flex-row items-center justify-between shadow-sm"
                            onPress={() => setShowStudentDropdown(!showStudentDropdown)}
                        >
                            <View className="flex-row items-center">
                                <User size={18} color="#FF6900" className="mr-3" />
                                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{selectedStudentName}</Text>
                            </View>
                            <ChevronDown size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {showStudentDropdown && (
                            <View className="absolute top-16 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-[32px] shadow-2xl z-20 overflow-hidden">
                                {students.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        className="px-6 py-4 border-b border-gray-50 dark:border-gray-900 active:bg-gray-50 dark:active:bg-gray-900"
                                        onPress={() => {
                                            setSelectedStudentId(s.id);
                                            setShowStudentDropdown(false);
                                        }}
                                    >
                                        <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{s.users?.full_name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Collapsible Filter Panel */}
                <View className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 mb-6 shadow-sm">
                    <TouchableOpacity 
                        onPress={() => setShowFilters(!showFilters)}
                        className="flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center">
                            <SlidersHorizontal size={18} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm ml-3">Filter Diary Entries</Text>
                        </View>
                        {showFilters ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
                    </TouchableOpacity>

                    {showFilters && (
                        <View className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-900">
                            {/* Subject filter selector */}
                            <View className="mb-4">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2 ml-1">Subject</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    <TouchableOpacity
                                        onPress={() => setSelectedSubjectId("all")}
                                        className={`px-4 py-2.5 rounded-2xl mr-2 border ${selectedSubjectId === "all" ? 'bg-orange-100 dark:bg-orange-950/20 border-orange-200' : 'bg-gray-50 dark:bg-[#202020] border-gray-100 dark:border-gray-800'}`}
                                    >
                                        <Text className={`font-bold text-xs ${selectedSubjectId === "all" ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`}>All Subjects</Text>
                                    </TouchableOpacity>
                                    {subjects.map((sub) => (
                                        <TouchableOpacity
                                            key={sub.id}
                                            onPress={() => setSelectedSubjectId(sub.id)}
                                            className={`px-4 py-2.5 rounded-2xl mr-2 border ${selectedSubjectId === sub.id ? 'bg-orange-100 dark:bg-orange-950/20 border-orange-200' : 'bg-gray-50 dark:bg-[#202020] border-gray-100 dark:border-gray-800'}`}
                                        >
                                            <Text className={`font-bold text-xs ${selectedSubjectId === sub.id ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`}>{sub.title}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Status filter selector */}
                            <View className="mb-4">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2 ml-1">Assignment Status</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    {['all', 'Pending', 'Submitted', 'Graded', 'Overdue'].map((status) => (
                                        <TouchableOpacity
                                            key={status}
                                            onPress={() => setSelectedStatus(status)}
                                            className={`px-4 py-2.5 rounded-2xl mr-2 border ${selectedStatus === status ? 'bg-orange-100 dark:bg-orange-950/20 border-orange-200' : 'bg-gray-50 dark:bg-[#202020] border-gray-100 dark:border-gray-800'}`}
                                        >
                                            <Text className={`font-bold text-xs ${selectedStatus === status ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {status === 'all' ? 'All (inc. Notes)' : status}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Date range pickers */}
                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2 ml-1">Start Date</Text>
                                    {Platform.OS === 'web' ? (
                                        <input
                                            type="date"
                                            aria-label="Start Date"
                                            title="Start Date"
                                            placeholder="yyyy-mm-dd"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            style={{
                                                backgroundColor: '#f9fafb',
                                                padding: '10px 16px',
                                                borderRadius: '16px',
                                                border: '1px solid #f3f4f6',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: '#111827',
                                                width: '100%',
                                                outline: 'none'
                                            }}
                                        />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => setShowStartPicker(true)}
                                            className="bg-gray-50 dark:bg-[#202020] rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800 flex-row justify-between items-center"
                                        >
                                            <Text className="text-gray-950 dark:text-white font-bold text-xs">
                                                {startDate || "Select date"}
                                            </Text>
                                            <Calendar size={14} color="#FF6900" />
                                        </TouchableOpacity>
                                    )}
                                    {showStartPicker && (
                                        <DateTimePicker
                                            value={startDate ? new Date(startDate) : new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                                setShowStartPicker(false);
                                                if (date) setStartDate(date.toISOString().split('T')[0]);
                                            }}
                                        />
                                    )}
                                </View>

                                <View className="flex-1">
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2 ml-1">End Date</Text>
                                    {Platform.OS === 'web' ? (
                                        <input
                                            type="date"
                                            aria-label="End Date"
                                            title="End Date"
                                            placeholder="yyyy-mm-dd"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            style={{
                                                backgroundColor: '#f9fafb',
                                                padding: '10px 16px',
                                                borderRadius: '16px',
                                                border: '1px solid #f3f4f6',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: '#111827',
                                                width: '100%',
                                                outline: 'none'
                                            }}
                                        />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => setShowEndPicker(true)}
                                            className="bg-gray-50 dark:bg-[#202020] rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800 flex-row justify-between items-center"
                                        >
                                            <Text className="text-gray-900 dark:text-white font-bold text-xs">
                                                {endDate || "Select date"}
                                            </Text>
                                            <Calendar size={14} color="#FF6900" />
                                        </TouchableOpacity>
                                    )}
                                    {showEndPicker && (
                                        <DateTimePicker
                                            value={endDate ? new Date(endDate) : new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                                setShowEndPicker(false);
                                                if (date) setEndDate(date.toISOString().split('T')[0]);
                                            }}
                                        />
                                    )}
                                </View>
                            </View>

                            {/* Reset filters button */}
                            {(selectedSubjectId !== "all" || selectedStatus !== "all" || startDate || endDate) && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedSubjectId("all");
                                        setSelectedStatus("all");
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="mt-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl py-2.5 items-center active:bg-gray-100"
                                >
                                    <Text className="text-gray-600 dark:text-gray-400 font-bold text-xs">Reset Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* List */}
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                            {filteredEntries.length} Entries found
                        </Text>
                        <TouchableOpacity
                            className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 active:bg-gray-50 shadow-sm"
                            onPress={handlePrint}
                        >
                            <Printer size={16} color={Platform.OS === 'web' ? '#6B7280' : '#FF6900'} />
                            <Text className="text-gray-600 dark:text-gray-400 font-bold text-[10px] ml-2 uppercase tracking-widest">Print Report</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : filteredEntries.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <BookOpen size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No diary entries matching current filters.</Text>
                        </View>
                    ) : (
                        filteredEntries.map((entry) => (
                            <DiaryCard key={entry.id} entry={entry} onSign={handleSign} />
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
