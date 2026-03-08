import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Redirect, Slot, Tabs } from "expo-router";
import { Bell, Building2, Headphones, LayoutDashboard, Settings } from 'lucide-react-native';
import React from 'react';
import { Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_ITEMS: NavItem[] = [
    { name: "settings", title: "Settings", icon: Settings, route: "/(master-admin)/settings" },
    { name: "index", title: "Dashboard", icon: LayoutDashboard, route: "/(master-admin)" },
    { name: "institutions", title: "Institutions", icon: Building2, route: "/(master-admin)/institutions" },
    { name: "notifications", title: "Notices", icon: Bell, route: "/(master-admin)/notifications" },
    { name: "support", title: "Support", icon: Headphones, route: "/(master-admin)/support" },
];

const MOBILE_TAB_NAMES = ["settings", "index", "institutions"];

const ALL_OTHER = NAV_ITEMS
    .filter(i => !MOBILE_TAB_NAMES.includes(i.name))
    .map(i => i.name);

const HIDDEN = [...ALL_OTHER];

function MasterAdminTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    return (
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
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                },
                sceneStyle: { backgroundColor: isDark ? '#0F0B2E' : "#f9fafb" },
            }}
        >
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ size, color }) => {
                        const Icon = Settings as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
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
                                shadowColor: "#FF6B00",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: focused ? 0.35 : 0,
                                shadowRadius: 8,
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

            {HIDDEN.map((name) => (
                <Tabs.Screen key={name} name={name} options={{ href: null }} />
            ))}
        </Tabs>
    );
}

function MasterAdminSidebar() {
    return (
        <WebSidebar items={NAV_ITEMS} basePath="(master-admin)" role="Master Admin">
            <Slot />
        </WebSidebar>
    );
}

export default function MasterAdminLayout() {
    const { session, profile, isInitializing, loading, isPlatformAdmin } = useAuth();
    const { width } = useWindowDimensions();
    const useWebLayout = Platform.OS === 'web' && width > 768;

    // If loading or initializing, don't flash content
    if (isInitializing || loading) {
        return null;
    }

    // Protection: must be logged in and either a master admin or a platform admin
    const isAllowed = session && (profile?.role === 'admin' || isPlatformAdmin);

    if (!isAllowed) {
        return <Redirect href="/(auth)/signIn" />;
    }

    return (
        <AuthGuard allowedRoles={['admin', 'master_admin']}>
            {useWebLayout ? <MasterAdminSidebar /> : <MasterAdminTabs />}
        </AuthGuard>
    );
}
