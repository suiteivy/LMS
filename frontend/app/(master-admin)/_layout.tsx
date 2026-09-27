import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Redirect, Slot, Tabs, useSegments } from "expo-router";
import { Bell, Building2, CreditCard, Headphones, LayoutDashboard, Settings, ShieldAlert, Users, FileText } from 'lucide-react-native';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Dashboard", icon: LayoutDashboard, route: "/(master-admin)" },
    { name: "institutions", title: "Institutions", icon: Building2, route: "/(master-admin)/institutions" },
    { name: "users", title: "All Users", icon: Users, route: "/(master-admin)/users" },
    { name: "payments", title: "Payments", icon: CreditCard, route: "/(master-admin)/payments" },
    { name: "notifications", title: "Notices", icon: Bell, route: "/(master-admin)/notifications" },
    { name: "system-logs", title: "System Logs", icon: FileText, route: "/(master-admin)/system-logs" },
    { name: "password-audit", title: "Password Audit", icon: ShieldAlert, route: "/(master-admin)/password-audit" },
    { name: "support", title: "Support", icon: Headphones, route: "/(master-admin)/support" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(master-admin)/accessibility/settings" },
];

/**
 * 4 Primary Mobile Destinations for Master Admin:
 * 1. Home (index) - Platform KPI overview
 * 2. Institutions (institutions) - School tenants
 * 3. Users (users) - Global users directory
 * 4. Settings (accessibility/settings) - Platform configurations
 *
 * NOTE: Notifications bell is located at TOP-RIGHT of the screen header.
 */
const PRIMARY_MASTER_ADMIN_TABS = [
    "index",
    "institutions",
    "users",
    "accessibility/settings",
];

const ALL_MASTER_ADMIN_ROUTES = [
    "accessibility/settings",
    "index",
    "institutions",
    "loading",
    "notifications",
    "password-audit",
    "payments",
    "settings",
    "support",
    "system-logs",
    "users",
];

const HIDDEN_MASTER_ADMIN_ROUTES = ALL_MASTER_ADMIN_ROUTES.filter(
    (name) => !PRIMARY_MASTER_ADMIN_TABS.includes(name)
);

function MasterAdminPinnedHeader() {
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const { unreadCount, setShowNotifications } = useNotifications();
    const insets = useSafeAreaInsets();
    const accountLabel = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Master Admin';

    return (
        <View
            style={{
                backgroundColor: isDark ? '#161B22' : '#F6F8FA',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#21262D' : '#D0D7DE',
                paddingHorizontal: 16,
                paddingTop: insets.top + 6,
                paddingBottom: 10,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ marginRight: 10 }}>
                        <MaterialCommunityIcons name="shield-crown" size={22} color="#FF6B00" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#f1f1f1' : '#111827' }}>
                            Platform Admin
                        </Text>
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isDark ? '#9ca3af' : '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: 1.1,
                                marginTop: 1,
                            }}
                        >
                            {accountLabel}
                        </Text>
                    </View>
                </View>

                {/* Top-Right Notification Bell */}
                <TouchableOpacity
                    onPress={() => setShowNotifications(true)}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: isDark ? '#21262D' : '#D0D7DE',
                        backgroundColor: isDark ? '#111827' : '#EAEEF2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        marginLeft: 10,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Open notifications"
                >
                    <MaterialCommunityIcons name="bell-outline" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                    {unreadCount > 0 && (
                        <View
                            style={{
                                position: 'absolute',
                                top: -3,
                                right: -3,
                                minWidth: 16,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: '#FF6B00',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingHorizontal: 3,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

function MasterAdminTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const segments = useSegments();
    const hideGlobalHeader = segments[1] === 'accessibility' && segments[2] === 'settings';

    const tabBarHeight = 60 + Math.max(insets.bottom, 8);

    return (
        <View style={{ flex: 1 }}>
            {!hideGlobalHeader && (
                <MasterAdminPinnedHeader />
            )}

            <View style={{ flex: 1 }}>
                <Tabs
                    initialRouteName="index"
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: "#FF6B00",
                        tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
                        tabBarLabelStyle: {
                            fontSize: 10,
                            fontWeight: "700",
                            letterSpacing: 0.1,
                            marginTop: -2,
                            marginBottom: 4,
                        },
                        tabBarStyle: {
                            backgroundColor: isDark ? '#161B22' : "#ffffff",
                            borderTopWidth: 1,
                            borderTopColor: isDark ? '#1f2937' : "#e5e7eb",
                            height: tabBarHeight,
                            paddingBottom: Math.max(insets.bottom, 8),
                            paddingTop: 8,
                            paddingHorizontal: 8,
                            elevation: 10,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 6,
                        },
                        sceneStyle: { backgroundColor: isDark ? '#0F0B2E' : "#f9fafb" },
                    }}
                >
                    {/* 1. Home Dashboard */}
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: "Home",
                            tabBarIcon: ({ color, focused }) => {
                                const Icon = LayoutDashboard as any;
                                return (
                                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                                        <Icon
                                            size={22}
                                            color={focused ? "#FF6B00" : color}
                                            strokeWidth={focused ? 2.5 : 2}
                                        />
                                    </View>
                                );
                            },
                        }}
                    />

                    {/* 2. Institutions */}
                    <Tabs.Screen
                        name="institutions"
                        options={{
                            title: "Institutions",
                            tabBarIcon: ({ color, focused }) => {
                                const Icon = Building2 as any;
                                return (
                                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                                        <Icon
                                            size={22}
                                            color={focused ? "#FF6B00" : color}
                                            strokeWidth={focused ? 2.5 : 2}
                                        />
                                    </View>
                                );
                            },
                        }}
                    />

                    {/* 3. Users */}
                    <Tabs.Screen
                        name="users"
                        options={{
                            title: "Users",
                            tabBarIcon: ({ color, focused }) => {
                                const Icon = Users as any;
                                return (
                                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                                        <Icon
                                            size={22}
                                            color={focused ? "#FF6B00" : color}
                                            strokeWidth={focused ? 2.5 : 2}
                                        />
                                    </View>
                                );
                            },
                        }}
                    />

                    {/* 4. Settings */}
                    <Tabs.Screen
                        name="accessibility/settings"
                        options={{
                            title: "Settings",
                            tabBarIcon: ({ color, focused }) => {
                                const Icon = Settings as any;
                                return (
                                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                                        <Icon
                                            size={22}
                                            color={focused ? "#FF6B00" : color}
                                            strokeWidth={focused ? 2.5 : 2}
                                        />
                                    </View>
                                );
                            },
                        }}
                    />

                    {/* Exhaustive Hidden Sub-Routes */}
                    {HIDDEN_MASTER_ADMIN_ROUTES.map((name) => (
                        <Tabs.Screen
                            key={name}
                            name={name}
                            options={{
                                href: null,
                                headerShown: false,
                            }}
                        />
                    ))}
                </Tabs>
            </View>
        </View>
    );
}

function MasterAdminSidebar() {
    const segments = useSegments();
    const hideGlobalHeader = segments[1] === 'accessibility' && segments[2] === 'settings';

    return (
        <View style={{ flex: 1 }}>
            {!hideGlobalHeader && (
                <MasterAdminPinnedHeader />
            )}
            <WebSidebar items={NAV_ITEMS} basePath="(master-admin)" role="Master Admin">
                <Slot />
            </WebSidebar>
        </View>
    );
}

export default function MasterAdminLayout() {
    const { width } = useWindowDimensions();
    const useWebLayout = width >= 768;

    return (
        <AuthGuard allowedRoles={['master_admin']}>
            {useWebLayout ? <MasterAdminSidebar /> : <MasterAdminTabs />}
        </AuthGuard>
    );
}
