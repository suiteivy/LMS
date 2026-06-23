import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Bell, CheckCircle, Info, Trash2, X } from "lucide-react-native";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

interface NotificationBellDropdownProps {
    visible: boolean;
    onClose: () => void;
    onViewAll: () => void;
    accentColor?: string;
    tabBarHeight?: number;
}

export function NotificationBellDropdown({
    visible,
    onClose,
    onViewAll,
    accentColor = "#FF6B00",
    tabBarHeight = 70,
}: NotificationBellDropdownProps) {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { notifications, markAsRead, markAllAsRead, loading, refreshNotifications } = useNotifications();
    const menuWidth = Math.min(340, width - 24);

    const recentNotifications = notifications.slice(0, 6);

    const iconBg = (type: string) => {
        if (type === "error") return isDark ? "rgba(127,29,29,0.3)" : "#fef2f2";
        if (type === "success") return isDark ? "rgba(6,78,59,0.3)" : "#f0fdf4";
        if (type === "warning") return isDark ? "rgba(120,53,15,0.3)" : "#fffbeb";
        return isDark ? "rgba(30,58,138,0.3)" : "#eff6ff";
    };

    const tokens = {
        surface: isDark ? "#1A1650" : "#ffffff",
        surfaceAlt: isDark ? "#0F0B2E" : "#f9fafb",
        border: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb",
        textPrimary: isDark ? "#ffffff" : "#111827",
        textSecondary: isDark ? "#9ca3af" : "#6b7280",
        textMuted: isDark ? "#6b7280" : "#9ca3af",
        unreadBg: isDark ? "rgba(255,105,0,0.12)" : "rgba(255,247,237,0.8)",
        unreadBorder: isDark ? "rgba(255,105,0,0.25)" : "#fed7aa",
    };

    if (!visible) return null;

    return (
        <View
            pointerEvents="box-none"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
            }}
        >
            <Pressable
                onPress={onClose}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "transparent",
                }}
            />

            <View
                style={{
                    position: "absolute",
                    bottom: tabBarHeight + insets.bottom + 6,
                    right: 10,
                    width: menuWidth,
                    maxHeight: 360,
                    backgroundColor: tokens.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    elevation: 16,
                    overflow: "hidden",
                }}
            >
                            {/* Header */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    borderBottomWidth: 1,
                                    borderBottomColor: tokens.border,
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Bell size={16} color={accentColor} />
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: "700",
                                            color: tokens.textPrimary,
                                            textTransform: "uppercase",
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        Alerts
                                    </Text>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    {notifications.some((n) => !n.is_read) && (
                                        <TouchableOpacity
                                            onPress={markAllAsRead}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: "600",
                                                    color: accentColor,
                                                }}
                                            >
                                                Read all
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        onPress={onClose}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <X size={16} color={tokens.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Content */}
                            {loading && recentNotifications.length === 0 ? (
                                <View style={{ padding: 32, alignItems: "center" }}>
                                    <ActivityIndicator color={accentColor} size="small" />
                                    <Text
                                        style={{
                                            color: tokens.textMuted,
                                            marginTop: 12,
                                            fontSize: 12,
                                            fontWeight: "600",
                                        }}
                                    >
                                        Loading...
                                    </Text>
                                </View>
                            ) : recentNotifications.length === 0 ? (
                                <View style={{ padding: 32, alignItems: "center" }}>
                                    <View
                                        style={{
                                            backgroundColor: tokens.surfaceAlt,
                                            padding: 20,
                                            borderRadius: 50,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <Bell size={32} color={tokens.textMuted} strokeWidth={1.5} />
                                    </View>
                                    <Text
                                        style={{
                                            color: tokens.textPrimary,
                                            fontWeight: "700",
                                            fontSize: 15,
                                        }}
                                    >
                                        All caught up!
                                    </Text>
                                    <Text
                                        style={{
                                            color: tokens.textMuted,
                                            marginTop: 6,
                                            fontSize: 13,
                                            textAlign: "center",
                                        }}
                                    >
                                        No new notifications.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={{ maxHeight: 250 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {recentNotifications.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => {
                                                if (!item.is_read) markAsRead(item.id);
                                            }}
                                            activeOpacity={0.7}
                                            style={{
                                                flexDirection: "row",
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                borderBottomWidth: 1,
                                                borderBottomColor: tokens.border,
                                                backgroundColor: item.is_read ? "transparent" : tokens.unreadBg,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    marginRight: 12,
                                                    marginTop: 2,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 10,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        backgroundColor: iconBg(item.type),
                                                    }}
                                                >
                                                    {item.type === "info" && <Info size={16} color="#3b82f6" />}
                                                    {item.type === "success" && (
                                                        <CheckCircle size={16} color="#10b981" />
                                                    )}
                                                    {item.type === "warning" && (
                                                        <AlertCircle size={16} color="#f59e0b" />
                                                    )}
                                                    {item.type === "error" && (
                                                        <AlertCircle size={16} color="#ef4444" />
                                                    )}
                                                </View>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View
                                                    style={{
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        marginBottom: 2,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontWeight: "700",
                                                            fontSize: 13,
                                                            color: tokens.textPrimary,
                                                            flex: 1,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {item.title}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            color: tokens.textMuted,
                                                            fontWeight: "600",
                                                            marginLeft: 8,
                                                        }}
                                                    >
                                                        {formatDistanceToNow(new Date(item.created_at), {
                                                            addSuffix: true,
                                                        })}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={{
                                                        color: tokens.textSecondary,
                                                        fontSize: 12,
                                                        lineHeight: 17,
                                                    }}
                                                    numberOfLines={2}
                                                >
                                                    {item.message}
                                                </Text>
                                            </View>
                                            {!item.is_read && (
                                                <View
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: 3,
                                                        backgroundColor: accentColor,
                                                        marginLeft: 8,
                                                        marginTop: 6,
                                                    }}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {/* Footer */}
                            {recentNotifications.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        onClose();
                                        onViewAll();
                                    }}
                                    activeOpacity={0.7}
                                    style={{
                                        paddingVertical: 12,
                                        borderTopWidth: 1,
                                        borderTopColor: tokens.border,
                                        alignItems: "center",
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "700",
                                            color: accentColor,
                                            textTransform: "uppercase",
                                            letterSpacing: 1,
                                        }}
                                    >
                                        View all →
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
        </View>
    );
}
