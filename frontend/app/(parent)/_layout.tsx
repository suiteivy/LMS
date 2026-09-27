import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import { Bell, BookOpenCheck, Calendar, Clock, CreditCard, LayoutDashboard, MessageSquare, Settings } from "lucide-react-native";
import { Platform, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

// All nav items for web desktop persistent sidebar (includes Timetable and Assignments)
const PARENT_SIDEBAR_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: LayoutDashboard, route: "/(parent)" },
    { name: "calendar", title: "Calendar", icon: Calendar, route: "/(parent)/calendar" },
    { name: "timetable", title: "Timetable", icon: Clock, route: "/(parent)/timetable" },
    { name: "assignments", title: "Assignments", icon: BookOpenCheck, route: "/(parent)/assignments" },
    { name: "messages", title: "Chat", icon: MessageSquare, route: "/(parent)/messages" },
    { name: "announcements", title: "Updates", icon: Bell, route: "/(parent)/announcements" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(parent)/accessibility/settings" },
];

/**
 * 4 Primary Mobile Destinations for Parents:
 * 1. Home (index) - Student overview, presence & fee summary
 * 2. Calendar (calendar) - School events & term dates
 * 3. Chat (messages) - Teacher & staff messaging
 * 4. Settings (accessibility/settings) - Account & family preferences
 *
 * NOTE: Notifications bell is located at TOP-RIGHT of the screen header.
 */
const PRIMARY_PARENT_TABS = [
    "index",
    "calendar",
    "messages",
    "accessibility/settings",
];

// Exhaustive list of all routes in app/(parent) to prevent rogue tabs or tofu boxes
const ALL_PARENT_ROUTES = [
    "accessibility/settings",
    "analytics",
    "announcements",
    "assignments",
    "attendance",
    "calendar",
    "clearance",
    "diary",
    "exams",
    "finance",
    "grades",
    "index",
    "library",
    "messages",
    "notifications",
    "report-cards",
    "reports",
    "settings",
    "support",
    "timetable",
];

const HIDDEN_PARENT_ROUTES = ALL_PARENT_ROUTES.filter(
    (name) => !PRIMARY_PARENT_TABS.includes(name)
);

function ParentTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { hasMessaging } = useSubscriptionTier();

    const tabBarHeight = 60 + Math.max(insets.bottom, 8);

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                initialRouteName="index"
                screenOptions={{
                    headerShown: false,
                    animation: 'shift',
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
                    sceneStyle: {
                        backgroundColor: isDark ? '#161B22' : "#ffffff",
                    },
                }}
            >
                {/* 1. Home */}
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

                {/* 2. Calendar */}
                <Tabs.Screen
                    name="calendar"
                    options={{
                        title: "Calendar",
                        tabBarIcon: ({ color, focused }) => {
                            const Icon = Calendar as any;
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

                {/* 3. Messages / Chat */}
                <Tabs.Screen
                    name="messages"
                    options={{
                        title: "Chat",
                        href: hasMessaging ? "/(parent)/messages" : null,
                        tabBarIcon: ({ color, focused }) => {
                            const Icon = MessageSquare as any;
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
                {HIDDEN_PARENT_ROUTES.map((name) => (
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
    );
}

function ParentSidebar() {
    return (
        <WebSidebar items={PARENT_SIDEBAR_ITEMS} basePath="(parent)" role="Parent">
            <Slot />
        </WebSidebar>
    );
}

export default function ParentLayout() {
    const { width } = useWindowDimensions();
    const useWebLayout = width >= 768;

    return (
        <AuthGuard allowedRoles={['parent']}>
            {useWebLayout ? <ParentSidebar /> : <ParentTabs />}
        </AuthGuard>
    );
}
