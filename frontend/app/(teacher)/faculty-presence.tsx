import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    TextInput,
    RefreshControl,
} from "react-native";
import {
    ArrowLeft,
    Search,
    Check,
    Clock,
    UserCheck,
    UserX,
    Calendar,
    AlertCircle,
    Building2,
    Sparkles,
} from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAttendanceAPI, StaffPresenceItem } from "@/services/TeacherAttendanceService";
import { showError, showSuccess } from "@/utils/toast";

type FilterType = "all" | "present" | "not_checked_in";

export default function FacultyPresencePage() {
    const { teacherId } = useAuth();
    const { isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [presenceList, setPresenceList] = useState<StaffPresenceItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");
    const [checkingIn, setCheckingIn] = useState(false);

    const todayStr = useMemo(() => {
        const d = new Date();
        return d.toISOString().split("T")[0];
    }, []);

    const formattedDate = useMemo(() => {
        return new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }, []);

    const fetchPresence = useCallback(async () => {
        try {
            const data = await TeacherAttendanceAPI.getStaffPresence(todayStr);
            setPresenceList(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Error fetching faculty presence:", err);
            showError("Failed to load faculty presence");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [todayStr]);

    useEffect(() => {
        fetchPresence();
    }, [fetchPresence]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPresence();
    }, [fetchPresence]);

    const isSelfPresent = useMemo(() => {
        if (!teacherId || presenceList.length === 0) return false;
        return presenceList.some(
            (s) => s.teacher_id === teacherId && s.status === "present"
        );
    }, [teacherId, presenceList]);

    const handleSelfCheckIn = async () => {
        if (checkingIn) return;
        setCheckingIn(true);
        try {
            await TeacherAttendanceAPI.selfCheckIn({ notes: "Present via Faculty Portal" });
            showSuccess("You have checked in successfully!");
            await fetchPresence();
        } catch (err: any) {
            console.error("Self check-in failed:", err);
            showError(err?.message || "Failed to mark presence");
        } finally {
            setCheckingIn(false);
        }
    };

    const stats = useMemo(() => {
        const total = presenceList.length;
        const present = presenceList.filter((s) => s.status === "present").length;
        const notCheckedIn = presenceList.filter((s) => s.status !== "present").length;
        return { total, present, notCheckedIn };
    }, [presenceList]);

    const filteredList = useMemo(() => {
        return presenceList.filter((item) => {
            // Filter pill match
            if (activeFilter === "present" && item.status !== "present") {
                return false;
            }
            if (activeFilter === "not_checked_in" && item.status === "present") {
                return false;
            }

            // Search query match
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = (item.name || "").toLowerCase().includes(q);
                const deptMatch = (item.department || "").toLowerCase().includes(q);
                const posMatch = (item.position || "").toLowerCase().includes(q);
                return nameMatch || deptMatch || posMatch;
            }

            return true;
        });
    }, [presenceList, activeFilter, searchQuery]);

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return null;
        try {
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) return null;
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch {
            return null;
        }
    };

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className="bg-white dark:bg-[#1C2128] pt-12 pb-4 px-5 border-b border-gray-100 dark:border-gray-800 shadow-sm">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3"
                    >
                        <ArrowLeft size={20} color={isDark ? "#ffffff" : "#111827"} />
                    </TouchableOpacity>

                    <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">
                            Faculty Presence
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                            <Calendar size={12} color="#9ca3af" />
                            <Text className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                                {formattedDate}
                            </Text>
                        </View>
                    </View>

                    {/* Self Check In Header Action */}
                    {isSelfPresent ? (
                        <View className="flex-row items-center bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <Check size={14} color="#10b981" />
                            <Text className="ml-1 text-emerald-600 font-bold text-xs">Checked In</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={handleSelfCheckIn}
                            disabled={checkingIn}
                            className="bg-[#FF6900] px-3.5 py-1.5 rounded-xl active:bg-orange-600"
                        >
                            <Text className="text-white font-bold text-xs">
                                {checkingIn ? "Checking In..." : "Check In"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Quick Stats Cards */}
                <View className="flex-row gap-2.5 mt-4">
                    <View className="flex-1 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <Text className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            Total Staff
                        </Text>
                        <Text className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                            {stats.total}
                        </Text>
                    </View>
                    <View className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                        <Text className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Present
                        </Text>
                        <Text className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {stats.present}
                        </Text>
                    </View>
                    <View className="flex-1 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <Text className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            Not Checked In
                        </Text>
                        <Text className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                            {stats.notCheckedIn}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Check-In Reminder Banner (if not checked in) */}
            {!isSelfPresent && (
                <View className="mx-5 mt-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded-2xl p-3.5 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 mr-3">
                        <View className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 items-center justify-center mr-2.5">
                            <Sparkles size={16} color="#FF6900" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs font-bold text-orange-900 dark:text-orange-200">
                                You haven&apos;t checked in today
                            </Text>
                            <Text className="text-[11px] text-orange-700 dark:text-orange-300/80">
                                Record your presence to update faculty logs
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleSelfCheckIn}
                        disabled={checkingIn}
                        className="bg-[#FF6900] px-3 py-1.5 rounded-xl active:bg-orange-600"
                    >
                        <Text className="text-white font-bold text-xs">
                            {checkingIn ? "..." : "Check In Now"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Controls: Search and Filter Pills */}
            <View className="px-5 mt-4">
                {/* Search Bar */}
                <View className="flex-row items-center bg-white dark:bg-[#1C2128] px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 mb-3">
                    <Search size={16} color="#9ca3af" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search by name, department..."
                        placeholderTextColor="#9ca3af"
                        className="flex-1 ml-2 text-sm text-gray-900 dark:text-white"
                    />
                </View>

                {/* Filter Pills - Explicitly 'All', 'Present', 'Not Checked In' only */}
                <View className="flex-row gap-2">
                    {[
                        { id: "all" as FilterType, label: "All" },
                        { id: "present" as FilterType, label: "Present" },
                        { id: "not_checked_in" as FilterType, label: "Not Checked In" },
                    ].map((filter) => {
                        const isSelected = activeFilter === filter.id;
                        return (
                            <TouchableOpacity
                                key={filter.id}
                                onPress={() => setActiveFilter(filter.id)}
                                className={`px-4 py-2 rounded-xl border ${
                                    isSelected
                                        ? "bg-[#FF6900] border-[#FF6900]"
                                        : "bg-white dark:bg-[#1C2128] border-gray-200 dark:border-gray-800"
                                }`}
                            >
                                <Text
                                    className={`text-xs font-bold ${
                                        isSelected
                                            ? "text-white"
                                            : "text-gray-600 dark:text-gray-400"
                                    }`}
                                >
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Faculty List */}
            <ScrollView
                className="flex-1 px-5 mt-4"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FF6900"
                    />
                }
            >
                {loading ? (
                    <View className="py-20 items-center justify-center">
                        <ActivityIndicator size="large" color="#FF6900" />
                        <Text className="text-xs text-gray-400 mt-2">Loading presence records...</Text>
                    </View>
                ) : filteredList.length === 0 ? (
                    <View className="py-16 items-center justify-center bg-white dark:bg-[#1C2128] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-8">
                        <View className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-3">
                            <UserCheck size={24} color="#9ca3af" />
                        </View>
                        <Text className="text-sm font-bold text-gray-800 dark:text-gray-200 text-center">
                            No faculty records found
                        </Text>
                        <Text className="text-xs text-gray-400 text-center mt-1">
                            {searchQuery ? "Try refining your search query." : "No records match the selected filter."}
                        </Text>
                    </View>
                ) : (
                    filteredList.map((item, index) => {
                        const initials = (item.name || "T")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join("")
                            .toUpperCase();

                        const time = formatTime(item.check_in_time);

                        return (
                            <View
                                key={item.teacher_id || index}
                                className="bg-white dark:bg-[#1C2128] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-3 shadow-sm"
                            >
                                <View className="flex-row items-center justify-between">
                                    {/* Avatar and Basic Info */}
                                    <View className="flex-row items-center flex-1 mr-3">
                                        <View className="relative mr-3">
                                            <View className="w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-950/40 items-center justify-center border border-orange-200 dark:border-orange-800">
                                                <Text className="font-bold text-sm text-[#FF6900]">
                                                    {initials || "T"}
                                                </Text>
                                            </View>
                                            <View
                                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#1C2128] ${
                                                    item.status === "present"
                                                        ? "bg-emerald-500"
                                                        : item.status === "pending"
                                                        ? "bg-amber-500"
                                                        : "bg-gray-400"
                                                }`}
                                            />
                                        </View>

                                        <View className="flex-1">
                                            <View className="flex-row items-center">
                                                <Text
                                                    numberOfLines={1}
                                                    className="text-sm font-bold text-gray-900 dark:text-white mr-1.5"
                                                >
                                                    {item.name}
                                                </Text>
                                                {item.teacher_id === teacherId && (
                                                    <View className="bg-orange-100 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
                                                        <Text className="text-[10px] font-bold text-[#FF6900]">You</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View className="flex-row items-center mt-0.5">
                                                {item.department ? (
                                                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                                                        {item.department} &middot; {item.position || "Teacher"}
                                                    </Text>
                                                ) : (
                                                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                                                        {item.position || "Teacher"}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Status Badges */}
                                    <View className="items-end">
                                        {item.status === "present" ? (
                                            <View className="items-end">
                                                <View className="bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                        Present
                                                    </Text>
                                                </View>
                                                <Text
                                                    className={`text-[10px] font-bold mt-1 ${
                                                        item.confirmation_status === "confirmed"
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : "text-amber-500"
                                                    }`}
                                                >
                                                    {item.confirmation_status === "confirmed"
                                                        ? "Confirmed"
                                                        : "Self-Reported"}
                                                </Text>
                                            </View>
                                        ) : item.status === "pending" ? (
                                            <View className="items-end">
                                                <View className="bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                                                    <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                        Pending
                                                    </Text>
                                                </View>
                                                <Text className="text-[10px] font-semibold text-amber-500 mt-1">
                                                    Scheduled Today
                                                </Text>
                                            </View>
                                        ) : (
                                            <View className="items-end">
                                                <View className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                        Not Present
                                                    </Text>
                                                </View>
                                                <Text className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                                    Not Scheduled
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Bottom Info Row: Check-in Time & Notes */}
                                {(time || item.notes) && (
                                    <View className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex-row items-center justify-between">
                                        {time ? (
                                            <View className="flex-row items-center">
                                                <Clock size={11} color="#9ca3af" />
                                                <Text className="text-[11px] text-gray-400 ml-1">
                                                    Checked in at {time}
                                                </Text>
                                            </View>
                                        ) : <View />}

                                        {item.notes ? (
                                            <Text
                                                numberOfLines={1}
                                                className="text-[11px] text-gray-400 italic max-w-[60%]"
                                            >
                                                &ldquo;{item.notes}&rdquo;
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}
