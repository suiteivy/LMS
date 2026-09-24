import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ParentChildSelector } from "@/components/parent/ParentChildSelector";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { TimetableAPI } from "@/services/TimetableService";
import { useAuth } from "@/contexts/AuthContext";
import { downloadTimetablePdf } from "@/utils/timetablePdfGenerator";
import { CalendarAPI, CancelledDateInfo } from "@/services/CalendarService";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, Download, MapPin, User } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useParentStudentContext } from "@/hooks/useParentStudentContext";
import { ParentService } from "@/services/ParentService";
import { formatClassLabel } from "@/utils/classLabel";
import { showError, showSuccess } from "@/utils/toast";

export default function ParentStudentTimetablePage() {
    const params = useLocalSearchParams<{ studentId?: string; studentName?: string; classId?: string }>();
    const {
        studentId: resolvedStudentId,
        studentName: resolvedName,
        classId: resolvedClassId,
        ready,
    } = useParentStudentContext(params as any);

    const { institutionName, institutionLogo } = useAuth();
    const [loading, setLoading] = useState(true);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [selectedDay, setSelectedDay] = useState(new Date());
    const [classLabel, setClassLabel] = useState<string>('');
    const [cancelledDates, setCancelledDates] = useState<CancelledDateInfo[]>([]);

    const fetchTimetable = useCallback(async () => {
        try {
            setLoading(true);
            const [data, students, cancelled] = await Promise.all([
                TimetableAPI.getClassTimetable(resolvedClassId),
                ParentService.getLinkedStudents().catch(() => []),
                CalendarAPI.getCancelledDates().catch(() => []),
            ]);
            setTimetable(data || []);
            setCancelledDates(cancelled || []);

            const matchedStudent = (students || []).find((s: any) => s.id === resolvedStudentId);
            const resolvedClass = matchedStudent?.class_name || formatClassLabel({
                grade_level: matchedStudent?.grade_level,
                form_level: matchedStudent?.form_level,
            });
            setClassLabel(resolvedClass || 'Unassigned');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load child's timetable");
        } finally {
            setLoading(false);
        }
    }, [resolvedClassId, resolvedStudentId]);

    useEffect(() => {
        if (!ready) return;
        if (resolvedClassId) {
            fetchTimetable();
        } else {
            setLoading(false);
        }
    }, [ready, resolvedClassId, fetchTimetable]);

    const handleDownloadPdf = async () => {
        try {
            setDownloadingPdf(true);
            await downloadTimetablePdf({
                title: `${resolvedName ? `${resolvedName}'s` : 'Student'} Timetable`,
                subtitle: `Class: ${classLabel || 'Class Timetable'} • ${institutionName || 'Academic Schedule'}`,
                institutionName,
                institutionLogo,
                entries: timetable,
                cancelledDates,
                referenceDate: selectedDay,
                fileName: `${resolvedName || 'student'}-timetable-${format(selectedDay, 'yyyy-MM-dd')}`,
            });
            showSuccess("PDF Ready", "Student timetable PDF generated successfully.");
        } catch {
            showError("Export failed", "Failed to generate timetable PDF.");
        } finally {
            setDownloadingPdf(false);
        }
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 });
        return addDays(start, i);
    });

    const getDayName = (date: Date) => format(date, 'EEEE');

    const filteredEntries = timetable.filter(entry =>
        entry.day_of_week === getDayName(selectedDay)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Timetable"
                subtitle="Portal"
                role="Parent/Guardian"
                onBack={() => router.back()}
                rightActions={
                    (
                        <TouchableOpacity
                            onPress={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="flex-row items-center px-3 py-1.5 rounded-full border bg-white dark:bg-[#21262D] border-gray-200 dark:border-gray-700 shadow-sm"
                            accessibilityRole="button"
                            accessibilityLabel="Download Timetable PDF"
                        >
                            <Download size={14} color="#FF6900" style={{ marginRight: 6 }} />
                            <Text className="text-[#FF6900] font-bold text-xs">
                                {downloadingPdf ? 'Exporting...' : 'PDF'}
                            </Text>
                        </TouchableOpacity>
                    )
                }
            />

            <ParentChildSelector
                selectedStudentId={resolvedStudentId}
                onSelectChild={(child) => {
                    router.setParams({ studentId: child.id, studentName: child.full_name, classId: child.class_id });
                }}
            />

            <View className="px-4 md:px-8 pt-4">
                <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tighter mb-1 px-2">Academic Schedule</Text>
                <View className="mb-4 px-2">
                    <View className="self-start bg-white dark:bg-[#161B22] border border-gray-100 dark:border-gray-800 rounded-full px-3 py-1.5">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            Viewing: <Text className="text-gray-900 dark:text-white">{resolvedName || 'Student'}</Text> · {classLabel || 'Unassigned'}
                        </Text>
                    </View>
                </View>

                {/* Horizontal Date Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8" contentContainerStyle={{ paddingHorizontal: 8 }}>
                    {weekDays.map((date, index) => {
                        const isSelected = isSameDay(date, selectedDay);
                        const isToday = isSameDay(date, new Date());
                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.7}
                                onPress={() => setSelectedDay(date)}
                                className={`mr-3 p-3.5 rounded-2xl items-center min-w-[62px] shadow-sm border ${isSelected ? 'bg-gray-900 border-gray-900' : 'bg-white dark:bg-[#161B22] border-gray-100 dark:border-gray-800'}`}
                            >
                                <Text className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white/40' : 'text-gray-400'}`}>
                                    {format(date, 'EEE')}
                                </Text>
                                <Text className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                    {format(date, 'd')}
                                </Text>
                                {isToday && (
                                    <View className="w-1.5 h-1.5 rounded-full mt-1.5 bg-[#FF6900]" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-4 md:px-8" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                {!resolvedClassId ? (
                    <View className="bg-white dark:bg-[#161B22] p-12 rounded-3xl items-center border border-gray-100 dark:border-gray-700 border-dashed mt-4">
                        <Calendar size={40} color="#E5E7EB" style={{ opacity: 0.5 }} />
                        <Text className="text-gray-500 font-bold text-center mt-4">No Active Class Assignment</Text>
                        <Text className="text-gray-400 text-xs text-center mt-1">This student is not currently enrolled in any class stream.</Text>
                    </View>
                ) : loading ? (
                    <ListItemSkeleton loading={loading} count={4} label="Loading timetable..." />
                ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                        <View key={entry.id} className="flex-row mb-4">
                            {/* Time Column */}
                            <View className="w-14 pt-1.5 items-center mr-3">
                                <Text className="font-bold text-gray-900 dark:text-white text-xs">{entry.start_time.slice(0, 5)}</Text>
                                <View className="w-[1.5px] h-full bg-gray-200 dark:bg-[#21262D] my-2 rounded-full" />
                            </View>

                            {/* Class Card */}
                            <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
                                        <Text className="text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider" numberOfLines={1}>
                                            {entry.subjects?.title || 'Academic Unit'}
                                        </Text>
                                    </View>
                                    {entry.room_number && (
                                        <View className="flex-row items-center bg-gray-50 dark:bg-[#21262D] px-2 py-0.5 rounded-lg">
                                            <MapPin size={11} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-[9px] font-bold ml-1 uppercase tracking-wider">{entry.room_number}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight leading-snug mb-3" numberOfLines={2}>
                                    {entry.subjects?.title}
                                </Text>

                                <View className="flex-row items-center border-t border-gray-100 dark:border-[#21262D] pt-3">
                                    <View className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/30 items-center justify-center mr-2.5">
                                        <User size={15} color="#FF6900" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-900 dark:text-white font-bold text-xs tracking-tight" numberOfLines={1}>
                                            {entry.subjects?.teachers?.users?.full_name || 'Assigned Faculty'}
                                        </Text>
                                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-wider mt-0.5">Primary Instructor</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View className="bg-white dark:bg-[#161B22] p-20 rounded-[48px] items-center border border-gray-100 dark:border-gray-700 border-dashed mt-4">
                        <Calendar size={48} color="#E5E7EB" style={{ opacity: 0.5 }} />
                        <Text className="text-gray-400 font-bold text-center mt-6">No Academic Sessions</Text>
                        <Text className="text-gray-400 text-xs text-center mt-2">No timetable entries scheduled for {getDayName(selectedDay)}.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
