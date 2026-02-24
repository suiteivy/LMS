import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Activity, AlertCircle, CheckCircle, Clock, Server, ShieldCheck, Users } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

export default function AdminOverview() {
    const { profile } = useAuth();
    const { isDark } = useTheme();

    const tokens = {
        bg: isDark ? "#000000" : "#ffffff",
        surface: isDark ? "#1a1a1a" : "#ffffff",
        border: isDark ? "#2a2a2a" : "#f3f4f6",
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
                    marginBottom: 16,
                    marginHorizontal: 4,
                    shadowColor: "#000",
                    shadowOpacity: isDark ? 0 : 0.05,
                    shadowRadius: 4,
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
                <Text style={{ color: tokens.textPrimary, fontSize: 18, fontWeight: "700" }}>{value}</Text>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: tokens.bg }}>
            <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }}>
                <View style={{ padding: 24 }}>
                    {/* System Health */}
                    <Text style={{ fontSize: 18, fontWeight: "700", color: tokens.textPrimary, marginBottom: 16, paddingHorizontal: 4 }}>
                        System Health
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 32 }}>
                        <StatCard icon={Activity} label="System Status" value="Operational" colorKey="green" status="good" />
                        <StatCard icon={Server}   label="Server Load"   value="Optimal"      colorKey="blue"   status="good" />
                        <StatCard icon={Clock}    label="Uptime"        value="99.9%"         colorKey="purple" />
                        <StatCard icon={Users}    label="Active Sessions" value="1"           colorKey="orange" />
                    </View>

                    {/* System Alerts */}
                    <Text style={{ fontSize: 18, fontWeight: "700", color: tokens.textPrimary, marginBottom: 16, paddingHorizontal: 4 }}>
                        System Alerts
                    </Text>
                    <View
                        style={{
                            backgroundColor: tokens.surface,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: tokens.border,
                            padding: 16,
                            shadowColor: "#000",
                            shadowOpacity: isDark ? 0 : 0.05,
                            shadowRadius: 4,
                            elevation: isDark ? 0 : 2,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 12,
                                paddingBottom: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: tokens.divider,
                            }}
                        >
                            <CheckCircle size={18} color="#16a34a" />
                            <Text style={{ color: tokens.textSecondary, fontWeight: "500", marginLeft: 12, flex: 1 }}>
                                System update completed successfully
                            </Text>
                            <Text style={{ color: tokens.textMuted, fontSize: 12 }}>2h ago</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <AlertCircle size={18} color="#f59e0b" />
                            <Text style={{ color: tokens.textSecondary, fontWeight: "500", marginLeft: 12, flex: 1 }}>
                                New login detected from current device
                            </Text>
                            <Text style={{ color: tokens.textMuted, fontSize: 12 }}>Just now</Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={{ marginTop: 32, alignItems: "center" }}>
                        <Text style={{ color: tokens.textMuted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                            LMS Admin Control Panel v1.2.0{"\n"}Designed for efficiency
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}