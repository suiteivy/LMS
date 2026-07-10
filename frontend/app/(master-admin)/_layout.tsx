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

const MOBILE_TAB_NAMES = ["accessibility/settings", "index", "institutions", "payments"];

const ALL_OTHER = NAV_ITEMS
    .filter(i => !MOBILE_TAB_NAMES.includes(i.name))
    .map(i => i.name);

const HIDDEN = [...ALL_OTHER];

function MasterAdminPinnedHeader() {
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const { unreadCount, setShowNotifications } = useNotifications();
    const accountLabel = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Master Admin';

    return (
        <View
            style={{
                backgroundColor: isDark ? '#161B22' : '#F6F8FA',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#21262D' : '#D0D7DE',
                paddingHorizontal: 24,
                paddingTop: 10,
                paddingBottom: 14,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ marginRight: 10 }}>
                        <MaterialCommunityIcons name="shield-crown" size={22} color="#FF6900" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: isDark ? '#f1f1f1' : '#111827' }}>
                            Platform Admin
                        </Text>
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: isDark ? '#9ca3af' : '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: 1.1,
                                marginTop: 2,
                            }}
                        >
                            {accountLabel}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => setShowNotifications(true)}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
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
                                backgroundColor: '#ef4444',
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

    return (
        <View style={{ flex: 1 }}>
            {!hideGlobalHeader && (
                <MasterAdminPinnedHeader />
            )}

            <View style={{ flex: 1 }}>
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: "#FF6B00",
                        tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
                        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
                        tabBarStyle: {
                            backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
                            borderTopWidth: 1,
                            borderTopColor: isDark ? '#1f2937' : "#e5e7eb",
                            height: 56 + insets.bottom,
                            paddingBottom: insets.bottom || 6,
                            paddingTop: 6,
                            paddingHorizontal: 40,
                            justifyContent: "center",
                            gap: 32,
                            boxShadow: [{
                                offsetX: 0,
                                offsetY: -4,
                                blurRadius: 3,
                                color: 'rgba(0, 0, 0, 0.1)',
                            }],
                        },
                        sceneStyle: { backgroundColor: isDark ? '#0F0B2E' : "#f9fafb" },
                    }}
                >
            <Tabs.Screen
                name="accessibility/settings"
                options={{
                    title: "Accessibility",
                    tabBarIcon: ({ size, color }) => {
                        const Icon = Settings as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{ href: null }}
            />

            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, focused }) => {
                        const Icon = LayoutDashboard as any;
                        return (
                            <View style={{
                                width: focused ? 48 : 28,
                                height: focused ? 48 : 28,
                                borderRadius: focused ? 24 : 6,
                                backgroundColor: focused ? "#FF6B00" : "transparent",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: focused ? -14 : 0,
                                shadowOpacity: focused ? 0.35 : 0,
                                elevation: focused ? 6 : 0,
                                boxShadow: focused ? [{
                                    offsetX: 0,
                                    offsetY: 4,
                                    blurRadius: 8,
                                    color: 'rgba(255, 107, 0, 0.35)',
                                }] : undefined,
                            }}>
                                <Icon
                                    size={focused ? 22 : 20}
                                    color={focused ? "#ffffff" : color}
                                    strokeWidth={2}
                                />
                            </View>
                        );
                    },
                }}
            />

            <Tabs.Screen
                name="institutions"
                options={{
                    title: "Institutions",
                    tabBarIcon: ({ size, color }) => {
                        const Icon = Building2 as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
            />
            
            <Tabs.Screen
                name="payments"
                options={{
                    title: "Payments",
                    tabBarIcon: ({ size, color }) => {
                        const Icon = CreditCard as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
            />

            <Tabs.Screen
                name="users"
                options={{
                    title: "Users",
                    tabBarIcon: ({ size, color }) => {
                        const Icon = Users as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
            />

            <Tabs.Screen
                name="password-audit"
                options={{ href: null }}
            />

            {HIDDEN.map((name) => (
                <Tabs.Screen key={name} name={name} options={{ href: null }} />
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
        <WebSidebar items={NAV_ITEMS} basePath="(master-admin)" role="Master Admin">
            <View style={{ flex: 1 }}>
                {!hideGlobalHeader && (
                    <MasterAdminPinnedHeader />
                )}
                <View style={{ flex: 1 }}>
                    <Slot />
                </View>
            </View>
        </WebSidebar>
    );
}

export default function MasterAdminLayout() {
    const { session, isInitializing, loading, isPlatformAdmin } = useAuth();
    const { width } = useWindowDimensions();
    const useWebLayout = Platform.OS === 'web' && width > 768;

    // If loading or initializing, don't flash content
    if (isInitializing || loading) {
        return null;
    }

    // Protection: must be logged in and either a master admin or a platform admin
    const isAllowed = session && isPlatformAdmin;

    if (!isAllowed) {
        return <Redirect href="/(auth)/signIn" />;
    }

    return (
        <AuthGuard allowedRoles={['admin', 'master_admin']}>
            {useWebLayout ? <MasterAdminSidebar /> : <MasterAdminTabs />}
        </AuthGuard>
    );
}
