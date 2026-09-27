import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { api } from "@/services/api";
import { formatDistanceToNow } from 'date-fns';
import {
    Activity,
    AlertCircle,
    Bell,
    BookOpen,
    Calendar,
    CheckCircle,
    GraduationCap,
    Info,
    Laptop,
    Users
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

export default function AdminOverview() {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const { notifications, unreadCount } = useNotifications();

    // Live operational metrics
    const [enrolledStudents, setEnrolledStudents] = useState<string>("Loading...");
    const [teachingStaff, setTeachingStaff] = useState<string>("Loading...");
    const [activeClasses, setActiveClasses] = useState<string>("Loading...");
    const [activeTerm, setActiveTerm] = useState<string>("Loading...");

    // Live system & connectivity metrics
    const [healthStatus, setHealthStatus] = useState<string>("Checking...");
    const [isHealthy, setIsHealthy] = useState<boolean>(true);
    const [activeSessions, setActiveSessions] = useState<string>("Loading...");
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const isMountedRef = useRef(true);

    const fetchMetrics = useCallback(async () => {
        const startTime = Date.now();

        // 1. Live API connectivity & round-trip latency
        try {
            const healthRes = await api.get('/health', { timeout: 8000, skipErrorToast: true });
            const roundTrip = Date.now() - startTime;
            if (isMountedRef.current) {
                if (healthRes.data?.status === 'ok') {
                    setHealthStatus(`Online (${roundTrip}ms)`);
                    setIsHealthy(true);
                } else {
                    setHealthStatus("Degraded");
                    setIsHealthy(false);
                }
            }
        } catch {
            if (isMountedRef.current) {
                setHealthStatus("Offline");
                setIsHealthy(false);
            }
        }

        // 2. Active Academic Term (date-driven resolution)
        try {
            const termRes = await api.get('/academic-years/active-term', { timeout: 8000, skipErrorToast: true });
            if (isMountedRef.current) {
                const termData = termRes.data?.data?.active_term;
                if (termData?.name) {
                    const yearName = termData.academic_years?.name;
                    setActiveTerm(yearName ? `${termData.name} (${yearName})` : termData.name);
                } else {
                    setActiveTerm("No Active Term");
                }
            }
        } catch {
            if (isMountedRef.current) {
                setActiveTerm("Not Configured");
            }
        }

        // 3. Operational Counts: Students, Teachers, Classes, Sessions
        try {
            const instId = profile?.institution_id;
            const isMaster = profile?.role === 'master_admin';

            let studentQ = supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
            let teacherQ = supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
            let classQ = supabase.from('classes').select('*', { count: 'exact', head: true });
            let sessionQ = supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true);

            if (!isMaster && instId) {
                studentQ = studentQ.eq('institution_id', instId);
                teacherQ = teacherQ.eq('institution_id', instId);
                classQ = classQ.eq('institution_id', instId);
            }
            if (profile?.id && !isMaster) {
                sessionQ = sessionQ.eq('user_id', profile.id);
            }

            const [studentsRes, teachersRes, classesRes, sessionsRes] = await Promise.allSettled([
                studentQ,
                teacherQ,
                classQ,
                sessionQ,
            ]);

            if (isMountedRef.current) {
                if (studentsRes.status === 'fulfilled' && !studentsRes.value.error && studentsRes.value.count !== null) {
                    setEnrolledStudents(`${studentsRes.value.count}`);
                } else {
                    setEnrolledStudents("0");
                }

                if (teachersRes.status === 'fulfilled' && !teachersRes.value.error && teachersRes.value.count !== null) {
                    setTeachingStaff(`${teachersRes.value.count}`);
                } else {
                    setTeachingStaff("0");
                }

                if (classesRes.status === 'fulfilled' && !classesRes.value.error && classesRes.value.count !== null) {
                    setActiveClasses(`${classesRes.value.count}`);
                } else {
                    setActiveClasses("0");
                }

                if (sessionsRes.status === 'fulfilled' && !sessionsRes.value.error && sessionsRes.value.count !== null) {
                    setActiveSessions(`${sessionsRes.value.count}`);
                } else {
                    setActiveSessions("1");
                }
            }
        } catch {
            if (isMountedRef.current) {
                setEnrolledStudents("—");
                setTeachingStaff("—");
                setActiveClasses("—");
                setActiveSessions("—");
            }
        }
    }, [profile?.id, profile?.institution_id, profile?.role]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchMetrics();
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchMetrics]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMetrics();
        if (isMountedRef.current) {
            setRefreshing(false);
        }
    };

    // Show the 5 most recent notifications as system alerts
    const recentAlerts = notifications.slice(0, 5);

    const tokens = {
        bg: isDark ? "#161B22" : "#FFFFFF",
        surface: isDark ? "#161B22" : "#F6F8FA",
        border: isDark ? "#21262D" : "#D0D7DE",
        textPrimary: isDark ? "#ffffff" : "#111827",
        textSecondary: isDark ? "#d1d5db" : "#4b5563",
        textMuted: isDark ? "#6b7280" : "#9ca3af",
        divider: isDark ? "#2a2a2a" : "#f3f4f6",
    };

    const statCardColors = {
        green:  { bg: isDark ? "#052e16" : "#f0fdf4", text: "#16a34a" },
        blue:   { bg: isDark ? "#0c1a3a" : "#eff6ff", text: "#2563eb" },
        purple: { bg: isDark ? "#1a0a2e" : "#faf5ff", text: "#9333ea" },
        orange: { bg: isDark ? "#2a1200" : "#fff7ed", text: "#ea580c" },
        teal:   { bg: isDark ? "#042f2e" : "#f0fdfa", text: "#0d9488" },
    };

    const StatCard = ({
        icon: Icon,
        label,
        value,
        colorKey,
        status,
    }: {
        icon: any;
        label: string;
        value: string;
        colorKey: keyof typeof statCardColors;
        status?: "good" | "warn";
    }) => {
        const color = statCardColors[colorKey];
        return (
            <View
                style={{
                    backgroundColor: tokens.surface,
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    flex: 1,
                    minWidth: "45%",
                    marginBottom: 12,
                    marginHorizontal: 4,
                    shadowOpacity: isDark ? 0 : 0.05,
                    elevation: isDark ? 0 : 2,
                }}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <View style={{ padding: 8, borderRadius: 12, backgroundColor: color.bg }}>
                        <Icon size={20} color={color.text} />
                    </View>
                    {status && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: status === "good" ? "#16a34a" : "#f59e0b",
                                    marginRight: 4,
                                }}
                            />
                        </View>
                    )}
                </View>
                <Text style={{ color: tokens.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 }}>
                    {label}
                </Text>
                <Text style={{ color: tokens.textPrimary, fontSize: 18, fontWeight: "700" }} numberOfLines={1}>
                    {value}
                </Text>
            </View>
        );
    };

    const getAlertIcon = (type: string) => {
        if (type === 'success') return <CheckCircle size={18} color="#16a34a" />;
        if (type === 'error')   return <AlertCircle size={18} color="#ef4444" />;
        if (type === 'warning') return <AlertCircle size={18} color="#f59e0b" />;
        if (type === 'info')    return <Info size={18} color="#3b82f6" />;
        return <Bell size={18} color={tokens.textMuted} />;
    };

    return (
        <View style={{ flex: 1, backgroundColor: tokens.bg }}>
            <ScrollView
                style={{ flex: 1, backgroundColor: tokens.bg }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.textPrimary} />
                }
            >
                <View style={{ padding: 24 }}>
                    {/* Header */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 20, fontWeight: "800", color: tokens.textPrimary, letterSpacing: -0.5 }}>
                            Institution Overview
                        </Text>
                        <Text style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>
                            Live academic &amp; operational metrics
                        </Text>
                    </View>

                    {/* Section 1: Academic & Operations */}
                    <Text style={{ fontSize: 14, fontWeight: "700", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 }}>
                        Academic &amp; Operations
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 24 }}>
                        <StatCard
                            icon={GraduationCap}
                            label="Enrolled Students"
                            value={enrolledStudents}
                            colorKey="blue"
                        />
                        <StatCard
                            icon={Users}
                            label="Teaching Staff"
                            value={teachingStaff}
                            colorKey="purple"
                        />
                        <StatCard
                            icon={BookOpen}
                            label="Active Classes"
                            value={activeClasses}
                            colorKey="teal"
                        />
                        <StatCard
                            icon={Calendar}
                            label="Current Term"
                            value={activeTerm}
                            colorKey="orange"
                            status={activeTerm !== "No Active Term" && activeTerm !== "Not Configured" ? "good" : "warn"}
                        />
                    </View>

                    {/* Section 2: System Health & Security */}
                    <Text style={{ fontSize: 14, fontWeight: "700", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 }}>
                        System &amp; Connectivity
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 28 }}>
                        <StatCard
                            icon={Activity}
                            label="API Status"
                            value={healthStatus}
                            colorKey={isHealthy ? "green" : "orange"}
                            status={isHealthy ? "good" : "warn"}
                        />
                        <StatCard
                            icon={Laptop}
                            label="Active Sessions"
                            value={activeSessions}
                            colorKey="blue"
                            status="good"
                        />
                        <StatCard
                            icon={Bell}
                            label="Pending Alerts"
                            value={unreadCount > 0 ? `${unreadCount} Unread` : "0 Unread"}
                            colorKey={unreadCount > 0 ? "orange" : "green"}
                            status={unreadCount === 0 ? "good" : "warn"}
                        />
                    </View>

                    {/* Section 3: Recent Activity & System Alerts */}
                    <Text style={{ fontSize: 14, fontWeight: "700", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 }}>
                        Recent Alerts &amp; Activity
                    </Text>
                    <View
                        style={{
                            backgroundColor: tokens.surface,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: tokens.border,
                            padding: 16,
                            shadowOpacity: isDark ? 0 : 0.05,
                            elevation: isDark ? 0 : 2,
                        }}
                    >
                        {recentAlerts.length === 0 ? (
                            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                                <CheckCircle size={18} color="#16a34a" />
                                <Text style={{ color: tokens.textSecondary, fontWeight: "500", marginLeft: 12, flex: 1 }}>
                                    All systems running smoothly — no recent alerts
                                </Text>
                            </View>
                        ) : (
                            recentAlerts.map((alert, index) => (
                                <View
                                    key={alert.id}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        ...(index < recentAlerts.length - 1 ? {
                                            marginBottom: 12,
                                            paddingBottom: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: tokens.divider,
                                        } : {}),
                                    }}
                                >
                                    {getAlertIcon(alert.type)}
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={{ color: tokens.textPrimary, fontWeight: "600", fontSize: 13 }}>
                                            {alert.title}
                                        </Text>
                                        <Text style={{ color: tokens.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                                            {alert.message}
                                        </Text>
                                    </View>
                                    <Text style={{ color: tokens.textMuted, fontSize: 11, marginLeft: 8 }}>
                                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Dynamic Footer */}
                    <View style={{ marginTop: 32, alignItems: "center" }}>
                        <Text style={{ color: tokens.textMuted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                            {profile?.institution_id ? "Institution Administrative Control Panel" : "Platform Management Console"}
                            {"\n"}Real-time metrics updated live
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
