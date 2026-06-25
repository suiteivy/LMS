import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from '@/contexts/ThemeContext';
import { formatClassLabel } from '@/utils/classLabel';
import { ParentService } from '@/services/ParentService';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, Download, Printer, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, RefreshControl, Linking, Alert } from 'react-native';
import { useParentStudentContext } from '@/hooks/useParentStudentContext';

export default function ReportsScreen() {
    const params = useLocalSearchParams<{ studentId: string; studentName?: string; classId?: string }>();
    const { studentId: resolvedStudentId, studentName: resolvedName, ready } = useParentStudentContext(params as any);
    const { isDark } = useTheme();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [classLabel, setClassLabel] = useState<string>('');

    const fetchReports = async () => {
        try {
            if (!resolvedStudentId) return;
            const [data, students] = await Promise.all([
                ParentService.getStudentReports(resolvedStudentId),
                ParentService.getLinkedStudents().catch(() => []),
            ]);
            setReports(data.data || []);

            const matchedStudent = (students || []).find((s: any) => s.id === resolvedStudentId);
            const resolvedClass = matchedStudent?.class_name || formatClassLabel({
                grade_level: matchedStudent?.grade_level,
                form_level: matchedStudent?.form_level,
            });
            setClassLabel(resolvedClass || 'Unassigned');
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!ready) return;
        fetchReports();
    }, [ready, resolvedStudentId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReports();
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-[#FFFFFF] dark:bg-[#0D1117]">
                <ActivityIndicator size="large" color="#FF6900" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <UnifiedHeader
                title="Academic Reports"
                subtitle={resolvedName || "Student Progress"}
                role="Parent/Guardian"
                onBack={() => router.back()}
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />
                }
            >
                <View className="mb-3">
                    <View className="self-start bg-white dark:bg-navy-surface border border-gray-100 dark:border-gray-800 rounded-full px-3 py-1.5">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            Viewing: <Text className="text-gray-900 dark:text-white">{resolvedName || 'Student'}</Text> · {classLabel || 'Unassigned'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() =>
                        router.push({
                            pathname: '/(parent)/report-cards' as any,
                            params: { studentId: resolvedStudentId, studentName: resolvedName, classId: params.classId },
                        })
                    }
                    style={{
                        backgroundColor: '#FF6900',
                        borderRadius: 18,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        marginBottom: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    <FileText size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Open Report Cards Module</Text>
                </TouchableOpacity>

                {reports.length === 0 ? (
                    <View className="py-20 items-center">
                        <FileText size={48} color={isDark ? '#374151' : '#d1d5db'} />
                        <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                            No published reports found for this student.
                        </Text>
                    </View>
                ) : (
                    reports.map((report) => (
                        <ReportCard key={report.id} report={report} isDark={isDark} />
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function ReportCard({ report, isDark }: { report: any; isDark: boolean }) {
    const data = report.data || {};
    const [expanded, setExpanded] = useState(false);
    
    return (
        <View 
            style={{
                boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 10, color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)' }],
                }}
            className="bg-[#FFFFFF] dark:bg-[#0D1117]-surface rounded-xl p-6 mb-6 border border-[#D0D7DE] dark:border-[#21262D]"
        >
            {/* Header */}
            <View className="flex-row justify-between items-start mb-4">
                <View>
                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest mb-1">
                        {report.report_type.replace(/-/g, ' ')}
                    </Text>
                    <Text className="text-gray-900 dark:text-white text-xl font-bold">
                        {report.term} {report.academic_year}
                    </Text>
                </View>
                <View className="flex-row gap-2">
                    <TouchableOpacity className="p-2 bg-gray-50 dark:bg-navy rounded-full">
                        <Download size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                    </TouchableOpacity>
                    <TouchableOpacity className="p-2 bg-gray-50 dark:bg-navy rounded-full">
                        <Printer size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats row */}
            <View className="flex-row justify-between border-t border-b border-[#D0D7DE] dark:border-[#21262D] py-4 mb-4">
                <View className="items-center flex-1">
                    <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase mb-1">GPA</Text>
                    <Text className="text-gray-900 dark:text-white font-black text-lg">{data.gpa || 'N/A'}</Text>
                </View>
                <View className="items-center flex-1 border-l border-r border-[#D0D7DE] dark:border-[#21262D]">
                    <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase mb-1">Position</Text>
                    <Text className="text-gray-900 dark:text-white font-black text-lg">{data.position || 'N/A'}/{data.total_students || '-'}</Text>
                </View>
                <View className="items-center flex-1">
                    <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase mb-1">Attendance</Text>
                    <Text className="text-gray-900 dark:text-white font-black text-lg">{data.attendance || 'N/A'}</Text>
                </View>
            </View>

            {/* Teacher remarks */}
            {data.comments && (
                <View className="bg-orange-50/30 dark:bg-navy p-4 rounded-xl mb-4">
                    <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-widest mb-2">Teacher's Remarks</Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs italic">"{data.comments}"</Text>
                </View>
            )}

            {/* Subject breakdown — shown when expanded */}
            {expanded && data.subjects && data.subjects.length > 0 && (
                <View className="mb-4">
                    <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-widest mb-3">
                        Subject Breakdown
                    </Text>
                    {data.subjects.map((subject: any, index: number) => (
                        <View 
                            key={index}
                            className="flex-row justify-between items-center py-3 border-b border-[#D0D7DE] dark:border-[#21262D]"
                        >
                            <View className="flex-1">
                                <Text className="text-gray-900 dark:text-white text-sm font-semibold">
                                    {subject.title}
                                </Text>
                                {subject.remarks && (
                                    <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                                        {subject.remarks}
                                    </Text>
                                )}
                            </View>
                            <View className="items-center ml-4">
                                <Text 
                                    className="font-black text-lg"
                                    style={{ color: subject.grade >= 80 ? '#22c55e' : subject.grade >= 60 ? '#FF6900' : '#ef4444' }}
                                >
                                    {subject.grade}%
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Toggle button */}
            <TouchableOpacity 
                className="flex-row justify-between items-center bg-gray-900 dark:bg-white p-4 rounded-xl"
                onPress={() => setExpanded(!expanded)}
            >
                <Text className="text-white dark:text-navy font-bold text-xs">
                    {expanded ? 'Hide Details' : 'View Full Details'}
                </Text>
                <ChevronRight 
                    size={16} 
                    color={isDark ? '#1e293b' : 'white'}
                    style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
                />
            </TouchableOpacity>
        </View>
    );
}
