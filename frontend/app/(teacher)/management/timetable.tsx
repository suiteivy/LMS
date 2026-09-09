import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { TimetableAPI, TimetableEntry } from "@/services/TimetableService";
import { downloadTimetablePdf } from "@/utils/timetablePdfGenerator";
import { CalendarAPI, CancelledDateInfo } from "@/services/CalendarService";
import { router } from "expo-router";
import { AlertTriangle, Calendar, Clock, Download, MapPin, Users } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { showFetchError, showError, showSuccess } from "@/utils/toast";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetableCard = ({ entry, isDark }: { entry: TimetableEntry; isDark: boolean }) => {
    return (
        <View className={`${isDark ? 'bg-navy border-white/10' : 'bg-white border-gray-100'} p-5 rounded-3xl border mb-4 shadow-sm`}>
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1">
                    <Text className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-lg leading-tight`}>{entry.subjects?.title || "Unknown Subject"}</Text>
                    <View className="flex-row items-center mt-2">
                        <View className={`${isDark ? 'bg-white/10' : 'bg-gray-50'} p-1 rounded-lg mr-2`}>
                            <Users size={14} color="#6B7280" />
                        </View>
                        <Text className={`${isDark ? 'text-gray-300' : 'text-gray-500'} text-xs font-bold`}>{entry.classes?.display_name || entry.classes?.name || "No Class"}</Text>
                    </View>
                </View>
                <View className={`${isDark ? 'bg-orange-950/40 border-orange-900' : 'bg-orange-50 border-orange-100'} px-3 py-1 rounded-full border`}>
                    <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-wider">Active</Text>
                </View>
            </View>

            <View className={`h-[1px] ${isDark ? 'bg-white/10' : 'bg-gray-50'} my-2`} />

            <View className="flex-row justify-between items-center mt-2">
                <View className={`flex-row items-center ${isDark ? 'bg-white/10' : 'bg-gray-50'} px-3 py-2 rounded-2xl`}>
                    <Clock size={14} color="#FF6900" />
                    <Text className={`${isDark ? 'text-gray-100' : 'text-gray-700'} font-bold text-xs ml-2`}>
                        {entry.start_time} - {entry.end_time}
                    </Text>
                </View>
                {entry.room_number && (
                    <View className="flex-row items-center">
                        <MapPin size={14} color="#9CA3AF" />
                        <Text className={`${isDark ? 'text-gray-300' : 'text-gray-400'} text-xs font-medium ml-1.5`}>{entry.room_number}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default function TimetablePage() {
    const { isDark } = useTheme();
    const { institutionName, institutionLogo, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [activeDay, setActiveDay] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
    const [cancelledDates, setCancelledDates] = useState<CancelledDateInfo[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [data, cancelled] = await Promise.all([
                TimetableAPI.getTeacherTimetable(),
                CalendarAPI.getCancelledDates(),
            ]);
            setTimetable(data || []);
            setCancelledDates(cancelled || []);
        } catch (error) {
            console.error("Fetch timetable error:", error);
            showFetchError("timetable", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!timetable.length) {
            showError("No schedule", "No timetable entries to export.");
            return;
        }
        try {
            setDownloadingPdf(true);
            await downloadTimetablePdf({
                title: "Teacher Teaching Schedule",
                subtitle: profile?.full_name ? `Schedule for ${profile.full_name}` : "Academic Schedule",
                institutionName,
                institutionLogo,
                entries: timetable,
            });
            showSuccess("PDF Ready", "Teaching schedule PDF generated successfully.");
        } catch (error) {
            showError("Export failed", "Failed to generate timetable PDF.");
        } finally {
            setDownloadingPdf(false);
        }
    };

    // Cancelled-date check: find entry matching today's ISO date if the activeDay corresponds
    const todayIso = new Date().toISOString().slice(0, 10);
    // Map activeDay name to the nearest matching calendar date for the current week
    const activeDayIndex = DAYS.indexOf(activeDay); // 0=Mon
    const weekStart = new Date();
    const dow = weekStart.getDay(); // 0=Sun
    const diffToMon = (dow === 0 ? -6 : 1 - dow);
    weekStart.setDate(weekStart.getDate() + diffToMon + activeDayIndex);
    const activeDateStr = weekStart.toISOString().slice(0, 10);
    const cancelledForActiveDay = cancelledDates.find(c => c.event_date === activeDateStr);

    const filteredEntries = timetable.filter(entry => entry.day_of_week === activeDay)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
        <View className={`flex-1 ${isDark ? 'bg-navy' : 'bg-gray-50'}`}>
            <UnifiedHeader
                title="Management"
                subtitle="My Timetable"
                role="Teacher"
                fallbackPath="/(teacher)/management"
                rightActions={
                    timetable.length > 0 ? (
                        <TouchableOpacity
                            onPress={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className={`flex-row items-center px-3 py-1.5 rounded-full border ${isDark ? 'bg-white/10 border-white/20' : 'bg-white border-gray-200'} shadow-sm`}
                            accessibilityRole="button"
                            accessibilityLabel="Download Timetable PDF"
                        >
                            <Download size={14} color="#FF6900" style={{ marginRight: 6 }} />
                            <Text className="text-[#FF6900] font-bold text-xs">
                                {downloadingPdf ? 'Exporting...' : 'PDF'}
                            </Text>
                        </TouchableOpacity>
                    ) : null
                }
            />

            <View className="px-4 md:p-8 pt-4">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row mb-4 -mx-5 px-5"
                >
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => setActiveDay(day)}
                            className={`mr-3 px-6 py-3 rounded-2xl border ${activeDay === day
                                ? "bg-[#FF6900] border-[#FF6900] shadow-sm"
                                : (isDark ? "bg-navy border-white/10" : "bg-white border-gray-100 shadow-sm")
                                }`}
                        >
                            <Text className={`font-bold text-xs uppercase tracking-wider ${activeDay === day ? "text-white" : (isDark ? "text-gray-300" : "text-gray-400")
                                }`}>
                                {day.substring(0, 3)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {cancelledForActiveDay && (
                <View className="mx-5 mb-2 p-4 rounded-2xl flex-row items-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                    <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: 'rgba(239,68,68,0.2)' }}>
                        <AlertTriangle size={20} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-red-600 dark:text-red-400 font-bold text-sm">Classes Cancelled: {cancelledForActiveDay.title}</Text>
                        <Text className="text-red-600/70 dark:text-red-400/70 text-xs mt-0.5">All academic sessions on this date are suspended.</Text>
                    </View>
                </View>
            )}

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View className="pt-4">
                        <ListItemSkeleton loading={loading} count={4} label="Loading schedule..." />
                    </View>
                ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                        <TimetableCard key={entry.id} entry={entry} isDark={isDark} />
                    ))
                ) : (
                    <View className={`flex-1 items-center justify-center pt-20 ${isDark ? 'bg-navy border-white/20' : 'bg-white border-gray-100'} rounded-[40px] p-12 mt-4 border border-dashed`}>
                        <Calendar size={48} color="#D1D5DB" />
                        <Text className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-xl mt-6`}>No lessons today</Text>
                        <Text className={`${isDark ? 'text-gray-300' : 'text-gray-500'} text-center mt-3 leading-relaxed`}>
                            You don&apos;t have any lessons scheduled for {activeDay}.
                        </Text>
                    </View>
                )}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
