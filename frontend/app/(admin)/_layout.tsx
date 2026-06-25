import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Slot, Tabs } from "expo-router";
import { House, LayoutGrid, Settings, Users, Wallet, MessageSquare, Bell } from "lucide-react-native";
import { Platform, useWindowDimensions, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full nav for paid plans
export const ALL_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: House, route: "/(admin)" },
    { name: "management/index", title: "Manage", icon: LayoutGrid, route: "/(admin)/management" },
    { name: "users/index", title: "Users", icon: Users, route: "/(admin)/users" },
    { name: "finance/index", title: "Finance", icon: Wallet, route: "/(admin)/finance" },
    { name: "communication/index", title: "Communication", icon: MessageSquare, route: "/(admin)/communication" },
    { name: "notifications", title: "Alerts", icon: Bell, route: "/(admin)/notifications" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(admin)/accessibility/settings" },
];

// Beta plan nav: Settings, Home, Users only (no Finance, no full Management)
export const BETA_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: House, route: "/(admin)" },
    { name: "management/index", title: "Manage", icon: LayoutGrid, route: "/(admin)/management" },
    { name: "users/index", title: "Users", icon: Users, route: "/(admin)/users" },
    { name: "communication/index", title: "Communication", icon: MessageSquare, route: "/(admin)/communication" },
    { name: "notifications", title: "Alerts", icon: Bell, route: "/(admin)/notifications" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(admin)/accessibility/settings" },
];

const MOBILE_TAB_NAMES = ["index", "notifications", "accessibility/settings"];

const ALL_ROUTES = [
    "index",
    "notifications",
    "request-feature",
    "communication/index",
    "attendance/index",
    "attendance/students/index",
    "attendance/teachers/index",
    "classes/create",
    "classes/index",
    "finance/index",
    "finance/bursaries/create",
    "finance/bursaries/reports",
    "finance/bursaries/[id]",
    "finance/funds/index",
    "management/analytics",
    "management/index",
    "management/materials",
    "management/resources",
    "management/library/index",
    "management/roles/index",
    "management/subjects/create",
    "management/subjects/details",
    "management/subjects/index",
    "settings/index",
    "settings/settings",
    "subjects/create",
    "subjects/index",
    "academic-setup/index",
    "results/index",
    "results/promotions",
    "timetable/index",
    "users/create",
    "users/index",
    "users/[id]",
];

const HIDDEN = ALL_ROUTES.filter(name => !MOBILE_TAB_NAMES.includes(name));

// Beta plan extra hidden items (routes hidden from tab bar for beta users)
// Note: management/index is already in MOBILE_TAB_NAMES so it is handled via href:null below.
const BETA_EXTRA_HIDDEN = ["finance/index"];

import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationBellDropdown } from "@/components/common/NotificationBellDropdown";
import { useState } from "react";
import { useRouter } from "expo-router";

function AdminTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { isBeta } = useSubscriptionTier();
    const { unreadCount } = useNotifications();
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const router = useRouter();

    const tabBarHeight = 70 + insets.bottom;

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenListeners={({ route }: { route: any }) => ({
                    tabPress: (e: any) => {
                        if (route.name === "notifications") {
                            e.preventDefault();
                            setShowNotifDropdown((v) => !v);
                        }
                    },
                })}
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: "#FF6B00",
                    tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
                    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
                    tabBarStyle: {
                        backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
                        borderTopWidth: 1,
                        borderTopColor: isDark ? '#1f2937' : "#e5e7eb",
                        height: tabBarHeight,
                        paddingBottom: insets.bottom || 6,
                        paddingTop: 6,
                        paddingHorizontal: 40,
                        justifyContent: "center",
                        gap: 32,
                        elevation: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
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
            {/* Notifications — tab registered, press intercepted by listeners */}
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Alerts",
                    tabBarItemStyle: { width: 72 },
                    tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
                    tabBarIcon: ({ size = 24, color, focused }) => {
                        const Icon = Bell as any;
                        const isOpen = showNotifDropdown;
                        const iconColor = isOpen ? "#FF6B00" : focused ? "#FF6B00" : color;
                        return (
                            <View>
                                <Icon size={size} color={iconColor} strokeWidth={2} />
                                {unreadCount > 0 && (
                                    <View style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -6,
                                        minWidth: 16,
                                        height: 16,
                                        borderRadius: 8,
                                        backgroundColor: '#FF6B00',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 2,
                                        borderColor: isDark ? '#0F0B2E' : '#ffffff',
                                    }}>
                                        <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    },
                }}
            />

            {/* Home - center, elevated style */}
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarShowLabel: false,
                    tabBarIcon: ({ color, focused }) => {
                        const Icon = House as any;
                        return (
                            <View style={{
                                width: focused ? 48 : 28,
                                height: focused ? 48 : 28,
                                borderRadius: focused ? 24 : 6,
                                backgroundColor: focused ? "#FF6B00" : "transparent",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: focused ? -14 : 0,
                                shadowColor: "#FF6B00",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: focused ? 0.35 : 0,
                                shadowRadius: 8,
                                boxShadow: focused ? [{
                                    offsetX: 0,
                                    offsetY: 4,
                                    blurRadius: 8,
                                    color: 'rgba(255, 107, 0, 0.35)',
                                }] : undefined,
                                elevation: focused ? 6 : 0,
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

            {/* Settings - right */}
            <Tabs.Screen
                name="accessibility/settings"
                options={{
                    title: "Accessibility",
                    tabBarIcon: ({ size = 24, color }) => {
                        const Icon = Settings as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
            />

            <Tabs.Screen
                name="settings/settings"
                options={{ href: null }}
            />

            {/* Hidden items (routes registered but not shown in tab bar) */}
            {HIDDEN.map((name) => (
                <Tabs.Screen key={name} name={name} options={{ href: null }} />
            ))}
            </Tabs>

            <NotificationBellDropdown
                visible={showNotifDropdown}
                onClose={() => setShowNotifDropdown(false)}
                onViewAll={() => router.push("/(admin)/notifications")}
                tabBarHeight={tabBarHeight}
            />
        </View>
    );
}

function AdminSidebar() {
    const { isBeta, showFinancials } = useSubscriptionTier();
    const items = showFinancials ? ALL_NAV_ITEMS : BETA_NAV_ITEMS;
    return (
        <WebSidebar items={items} basePath="(admin)" role="Admin">
            <Slot />
        </WebSidebar>
    );
}

export default function AdminLayout() {
    const { width } = useWindowDimensions();
    const useWebLayout = Platform.OS === 'web' && width > 768;

    return (
        <AuthGuard allowedRoles={['admin']}>
            <SchoolProvider>
                {useWebLayout ? <AdminSidebar /> : <AdminTabs />}
            </SchoolProvider>
        </AuthGuard>
    );
}
