import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { StudentService } from "@/services/StudentService";
import { useAuth } from "@/contexts/AuthContext";
import { downloadTimetablePdf } from "@/utils/timetablePdfGenerator";
import { CalendarAPI, CancelledDateInfo } from "@/services/CalendarService";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { router } from "expo-router";
import { AlertTriangle, Calendar, Download, MapPin, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { showFetchError, showError, showSuccess } from "@/utils/toast";

export default function StudentTimetablePage() {
    const [loading, setLoading] = useState(true);
    const { institutionName, institutionLogo, profile } = useAuth();
    const [timetable, setTimetable] = useState<any[]>([]);
    const [selectedDay, setSelectedDay] = useState(new Date());
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [cancelledDates, setCancelledDates] = useState<CancelledDateInfo[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [data, cancelled] = await Promise.all([
                StudentService.getTimetable(),
                CalendarAPI.getCancelledDates(),
            ]);
            setTimetable(data || []);
            setCancelledDates(cancelled || []);
        } catch (error) {
            console.error(error);
            showFetchError("timetable", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloadingPdf(true);
            await downloadTimetablePdf({
                title: "Student Class Timetable",
                subtitle: profile?.full_name ? `Schedule for ${profile.full_name}` : "Academic Schedule",
                institutionName,
                institutionLogo,
                entries: timetable,
                cancelledDates,
                referenceDate: selectedDay,
                fileName: `${profile?.full_name || 'student'}-timetable-${format(selectedDay, 'yyyy-MM-dd')}`,
            });
            showSuccess("PDF Ready", "Timetable PDF generated successfully.");
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

    const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
    const cancelledForSelectedDay = cancelledDates.find(c => c.event_date === selectedDateStr);

    const filteredEntries = timetable.filter(entry =>
        entry.day_of_week === getDayName(selectedDay)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Timetable"
                subtitle="Portal"
                role="Student"
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

            <View className="px-4 md:px-8 pt-4">
                <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tighter mb-4 px-2">Academic Schedule</Text>

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
                                className={`mr-4 p-5 rounded-[28px] items-center min-w-[75px] shadow-sm border ${isSelected ? 'bg-gray-900 border-gray-900' : 'bg-[#FFFFFF] dark:bg-[#161B22] border-[#D0D7DE] dark:border-[#21262D]'}`}
                            >
                                <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isSelected ? 'text-white/40' : 'text-gray-400'}`}>
                                    {format(date, 'EEE')}
                                </Text>
                                <Text className={`text-xl font-black ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                    {format(date, 'd')}
                                </Text>
                                {isToday && (
                                    <View className={`w-1.5 h-1.5 rounded-full mt-2 ${isSelected ? 'bg-[#FF6900]' : 'bg-[#FF6900]'}`} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-4 md:px-8" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="px-2 mb-6 flex-row justify-between items-center">
                    <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-[3px]">
                        {format(selectedDay, 'MMMM d, yyyy')}
                    </Text>
                    <View className="bg-orange-50 px-3 py-1 rounded-full">
                        <Text className="text-[#FF6900] text-[8px] font-black uppercase tracking-widest">{filteredEntries.length} Sessions</Text>
                    </View>
                </View>

                {cancelledForSelectedDay && (
                    <View className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex-row items-center">
                        <View className="w-10 h-10 rounded-xl bg-red-500/20 items-center justify-center mr-3">
                            <AlertTriangle size={20} color="#EF4444" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-red-600 dark:text-red-400 font-bold text-sm">
                                Classes Cancelled: {cancelledForSelectedDay.title}
                            </Text>
                            <Text className="text-red-600/80 dark:text-red-400/80 text-xs mt-0.5">
                                Academic sessions are suspended on this date due to a scheduled school calendar event.
                            </Text>
                        </View>
                    </View>
                )}

                {loading ? (
                    <ListItemSkeleton loading={loading} count={4} label="Loading timetable..." />
                ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                        <View key={entry.id} className="flex-row mb-6">
                            {/* Time Column */}
                            <View className="w-16 pt-2 items-center mr-4">
                                <Text className="font-bold text-gray-900 dark:text-white text-sm">{entry.start_time.slice(0, 5)}</Text>
                                <View className="w-[1.5px] h-full bg-gray-100 dark:bg-[#161B22] my-3 rounded-full" />
                            </View>

                            {/* Class Card */}
                            <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22] p-6 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] shadow-sm">
                                <View className="flex-row justify-between items-start mb-4">
                                    <View className="bg-gray-100 dark:bg-[#161B22] px-3 py-1 rounded-xl">
                                        <Text className="text-gray-900 dark:text-white text-[8px] font-bold uppercase tracking-widest">
                                            {entry.subjects?.title || 'Academic Unit'}
                                        </Text>
                                    </View>
                                    {entry.room_number && (
                                        <View className="flex-row items-center bg-gray-50 dark:bg-[#161B22] px-3 py-1 rounded-xl">
                                            <MapPin size={12} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-[10px] font-bold ml-1.5 uppercase tracking-widest">{entry.room_number}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight leading-tight mb-4">
                                    {entry.subjects?.title}
                                </Text>

                                <View className="flex-row items-center border-t border-[#D0D7DE] dark:border-[#21262D] pt-4">
                                    <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3">
                                        <User size={18} color="#FF6900" />
                                    </View>
                                    <View>
                                        <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">
                                            {entry.subjects?.teachers?.users?.full_name || 'Assigned Faculty'}
                                        </Text>
                                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-0.5">Primary Instructor</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View className="bg-[#FFFFFF] dark:bg-[#161B22] p-20 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed mt-4">
                        <Calendar size={48} color="#E5E7EB" />
                        <Text className="text-gray-400 font-bold text-center mt-6">No Academic Sessions</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
