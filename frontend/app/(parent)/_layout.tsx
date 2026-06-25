import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import { Bell, LayoutDashboard, MessageSquare, Settings } from "lucide-react-native";
import { Platform, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// All nav items   finance tab conditionally removed for free plan at runtime
const ALL_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: LayoutDashboard, route: "/(parent)" },
<<<<<<< HEAD
    { name: "finance", title: "Fees", icon: CreditCard, route: "/(parent)/finance" },
    { name: "messages", title: "Diary", icon: MessageSquare, route: "/(parent)/messages" },
=======
    { name: "messages", title: "Chat", icon: MessageSquare, route: "/(parent)/messages" },
>>>>>>> df05e40555bb1ec7b19b668a6cfb4d742c627c50
    { name: "announcements", title: "Updates", icon: Bell, route: "/(parent)/announcements" },
    { name: "settings", title: "Settings", icon: Settings, route: "/(parent)/settings" },
];

import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationBellDropdown } from "@/components/common/NotificationBellDropdown";
import { useState } from "react";
import { useRouter } from "expo-router";

function ParentTabs() {
    const HIDDEN_ROUTES = ["diary", "library", "reports"];
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { unreadCount } = useNotifications();
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const router = useRouter();

    const NAV_ITEMS = ALL_NAV_ITEMS;

    const tabBarHeight = 60;

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenListeners={({ route }: { route: any }) => ({
                    tabPress: (e: any) => {
                        if (route.name === "announcements") {
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
                        height: tabBarHeight,
                        paddingBottom: 8,
                        elevation: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
                    },
                    tabBarActiveTintColor: "#FF6B00",
                    tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
                    tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
                    sceneStyle: {
                        backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
                    },
                }}
            >
            {NAV_ITEMS.map((item) => {
                if (item.name === "announcements") {
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
                            tabBarIcon: ({ size, color }) => {
                                const Icon = item.icon as any;
                                return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                            },
                        }}
                    />
                );
            })}
            <Tabs.Screen name="finance" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="grades" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="attendance" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="reports" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="diary" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="timetable" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="report-cards" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="analytics" options={{ href: null, headerShown: false }} />
            </Tabs>

            <NotificationBellDropdown
                visible={showNotifDropdown}
                onClose={() => setShowNotifDropdown(false)}
                onViewAll={() => router.push("/(parent)/announcements")}
                tabBarHeight={tabBarHeight}
            />
        </View>
    );
}

function ParentSidebar() {
    const items = ALL_NAV_ITEMS;
    return (
        <WebSidebar items={items} basePath="(parent)" role="Parent/Guardian">
            <Slot />
        </WebSidebar>
    );
}

export default function ParentLayout() {
    const { width } = useWindowDimensions();
    const useWebLayout = Platform.OS === 'web' && width > 768;

    return (
        <AuthGuard allowedRoles={['parent']}>
            {useWebLayout ? <ParentSidebar /> : <ParentTabs />}
        </AuthGuard>
    );
}
