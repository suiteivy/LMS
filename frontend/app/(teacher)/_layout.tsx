import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Slot, Tabs } from "expo-router";
import { BookOpen, Building, LayoutGrid, School, Settings, Users, Bell } from "lucide-react-native";
import { Platform, useWindowDimensions, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full nav items for paid plans
const ALL_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: Building, route: "/(teacher)" },
    { name: "notifications", title: "Alerts", icon: Bell, route: "/(teacher)/notifications" },
    { name: "management", title: "Manage", icon: LayoutGrid, route: "/(teacher)/management" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(teacher)/accessibility/settings" },
];

// Simplified nav for beta plan
const BETA_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: Building, route: "/(teacher)" },
    { name: "notifications", title: "Alerts", icon: Bell, route: "/(teacher)/notifications" },
    { name: "management", title: "Manage", icon: LayoutGrid, route: "/(teacher)/management" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(teacher)/accessibility/settings" },
];

// Routes accessible via Manage — registered but hidden from tab bar
const MANAGE_SUB_ROUTES = ["subjects", "classes", "students", "library"];
// Beta plan additionally hides subjects/students
const BETA_HIDDEN = ["subjects", "students"];

import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationBellDropdown } from "@/components/common/NotificationBellDropdown";
import { useState } from "react";
import { useRouter } from "expo-router";

function TeacherTabs() {
    const insets = useSafeAreaInsets();
    const { isDemo } = useAuth();
    const { isDark } = useTheme();
    const { isBeta } = useSubscriptionTier();
    const { unreadCount } = useNotifications();
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const router = useRouter();

    const NAV_ITEMS = isBeta ? BETA_NAV_ITEMS : ALL_NAV_ITEMS;
    const tabBarHeight = Platform.OS === "ios" ? 64 + insets.bottom : 70;

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
                    tabBarStyle: {
                        backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
                        borderTopWidth: 1,
                        borderTopColor: isDark ? '#1f2937' : "#e5e7eb",
                        minHeight: tabBarHeight,
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                        paddingTop: 8,
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
                    tabBarActiveTintColor: "#FF6B00",
                    tabBarInactiveTintColor: isDark ? "#9ca3af" : "#6b7280",
                    tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 0 },
                    sceneStyle: { backgroundColor: isDark ? '#0F0B2E' : "#ffffff" },
                }}
            >
            {NAV_ITEMS.map((item) => {
                if (item.name === "notifications") {
                    return (
                        <Tabs.Screen
                            key={item.name}
                            name={item.name}
                            options={{
                                title: item.title,
                                tabBarItemStyle: { width: 72 },
                                tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
                                tabBarIcon: ({ size = 24, color, focused }) => {
                                    const Icon = item.icon as any;
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
                    );
                }
                return (
                    <Tabs.Screen
                        key={item.name}
                        name={item.name}
                        options={{
                            title: item.title,
                            href: undefined,
                            tabBarIcon: ({ size = 24, color }) => {
                                const Icon = item.icon as any;
                                return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                            },
                        }}
                    />
                );
            })}
            <Tabs.Screen name="settings" options={{ href: null, headerShown: false }} />
            {/* On free plan, hide paid-only tabs from nav but register them as routes */}
            {/* Register Manage sub-routes as hidden screens (accessible but not in tab bar) */}
            {MANAGE_SUB_ROUTES.map(name => (
                <Tabs.Screen key={name} name={name} options={{ href: null, headerShown: false }} />
            ))}
            </Tabs>

            <NotificationBellDropdown
                visible={showNotifDropdown}
                onClose={() => setShowNotifDropdown(false)}
                onViewAll={() => router.push("/(teacher)/notifications")}
                tabBarHeight={tabBarHeight}
            />
        </View>
    );
}

function TeacherSidebar() {
    const { isDemo } = useAuth();
    const { isBeta } = useSubscriptionTier();
    const items = isBeta ? BETA_NAV_ITEMS : ALL_NAV_ITEMS;
    return (
        <WebSidebar items={items} basePath="(teacher)" role="Teacher">
            <Slot />
        </WebSidebar>
    );
}

export default function TeacherLayout() {
    const { width } = useWindowDimensions();
    const useWebLayout = Platform.OS === 'web' && width > 768;

    return (
        <AuthGuard allowedRoles={['teacher']}>
            {useWebLayout ? <TeacherSidebar /> : <TeacherTabs />}
        </AuthGuard>
    );
}
