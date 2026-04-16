import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from '@/contexts/ThemeContext';
import { ParentService } from '@/services/ParentService';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, Download, Printer, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, RefreshControl } from 'react-native';

export default function ReportsScreen() {
    const { studentId, studentName } = useLocalSearchParams<{ studentId: string; studentName: string }>();
    const { isDark } = useTheme();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReports = async () => {
        try {
            if (!studentId) return;
            const data = await ParentService.getStudentReports(studentId);
            setReports(data.data || []);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [studentId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReports();
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-white dark:bg-navy">
                <ActivityIndicator size="large" color="#FF6900" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white dark:bg-navy">
            <UnifiedHeader
                title="Academic Reports"
                subtitle={studentName || "Student Progress"}
                role="Parent"
                onBack={() => router.back()}
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />
                }
            >
                {reports.length === 0 ? (
                    <View className="py-20 items-center">
                        <FileText size={48} color={isDark ? '#374151' : '#d1d5db'} />
                        <Text className="text-gray-400 dark:text-gray-500 mt-4 text-center">
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
    
    return (
        <View 
            style={{
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 2,
                    blurRadius: 10,
                    color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 3,
            }}
            className="bg-white dark:bg-navy-surface rounded-[32px] p-6 mb-6 border border-gray-100 dark:border-gray-800"
        >
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

            <View className="flex-row justify-between border-t border-b border-gray-50 dark:border-gray-800 py-4 mb-4">
                <View className="items-center flex-1">
                    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase mb-1">GPA</Text>
                    <Text className="text-gray-900 dark:text-white font-black text-lg">{data.gpa || 'N/A'}</Text>
                </View>
                <View className="items-center flex-1 border-l border-r border-gray-50 dark:border-gray-800">
                    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase mb-1">Position</Text>
                    <Text className="text-gray-900 dark:text-white font-black text-lg">{data.position || 'N/A'}/{data.total_students || '-'}</Text>
                </View>
                <View className="items-center flex-1">
                    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase mb-1">Attendance</Text>
                    <Text className="text-gray-900 dark:text-white font-black text-lg">{data.attendance || 'N/A'}</Text>
                </View>
            </View>

            {data.comments && (
                <View className="bg-orange-50/30 dark:bg-navy p-4 rounded-2xl mb-4">
                    <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-widest mb-2">Teacher's Remarks</Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs italic">"{data.comments}"</Text>
                </View>
            )}

            <TouchableOpacity className="flex-row justify-between items-center bg-gray-900 dark:bg-white p-4 rounded-2xl">
                <Text className="text-white dark:text-navy font-bold text-xs">View Full Details</Text>
                <ChevronRight size={16} color={isDark ? '#1e293b' : 'white'} />
            </TouchableOpacity>
        </View>
    );
}
