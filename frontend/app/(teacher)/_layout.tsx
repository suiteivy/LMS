import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Slot, Tabs } from "expo-router";
import { BookOpen, Building, Clock, LayoutGrid, School, Settings, Users, Bell, Calendar } from "lucide-react-native";
import { Platform, useWindowDimensions, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full nav items for web desktop persistent sidebar (includes Timetable)
const ALL_SIDEBAR_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: Building, route: "/(teacher)" },
    { name: "calendar", title: "Calendar", icon: Calendar, route: "/(teacher)/calendar" },
    { name: "timetable", title: "Timetable", icon: Clock, route: "/(teacher)/management/timetable" },
    { name: "notifications", title: "Alerts", icon: Bell, route: "/(teacher)/notifications" },
    { name: "management", title: "Manage", icon: LayoutGrid, route: "/(teacher)/management" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(teacher)/accessibility/settings" },
];

/**
 * 4 Primary Mobile Destinations for Teachers:
 * 1. Home (index) - Teaching schedule & presence
 * 2. Calendar (calendar) - Classes & academic calendar
 * 3. Manage (management) - Attendance, grades, assignments, subjects
 * 4. Settings (accessibility/settings) - Profile & preferences
 *
 * NOTE: Notifications bell is located at TOP-RIGHT of the screen header.
 */
const PRIMARY_TEACHER_TABS = [
    "index",
    "calendar",
    "management",
    "accessibility/settings",
];

// Exhaustive list of all routes in app/(teacher) to prevent rogue tabs or tofu boxes
const ALL_TEACHER_ROUTES = [
    "accessibility/settings",
    "calendar",
    "classes",
    "clearance",
    "faculty-presence",
    "index",
    "library",
    "management",
    "management/analytics",
    "management/announcements",
    "management/assignments",
    "management/attendance",
    "management/coverage",
    "management/diary",
    "management/exam-results",
    "management/exams",
    "management/grade-entry",
    "management/grades",
    "management/index",
    "management/library",
    "management/messages",
    "management/notifications",
    "management/rankings",
    "management/record-of-work",
    "management/report-cards",
    "management/resources",
    "management/subjects/details",
    "management/submissions",
    "management/timetable",
    "notifications",
    "settings",
    "students",
    "subjects",
    "timetable",
];

const HIDDEN_TEACHER_ROUTES = ALL_TEACHER_ROUTES.filter(
    (name) => !PRIMARY_TEACHER_TABS.includes(name)
);

function TeacherTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

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
                    sceneStyle: { backgroundColor: isDark ? '#161B22' : "#ffffff" },
                }}
            >
                {/* 1. Home */}
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Home",
                        tabBarIcon: ({ color, focused }) => {
                            const Icon = Building as any;
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

                {/* 3. Manage */}
                <Tabs.Screen
                    name="management"
                    options={{
                        title: "Manage",
                        tabBarIcon: ({ color, focused }) => {
                            const Icon = LayoutGrid as any;
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
                {HIDDEN_TEACHER_ROUTES.map((name) => (
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

function TeacherSidebar() {
    const items = ALL_SIDEBAR_ITEMS;
    return (
        <WebSidebar items={items} basePath="(teacher)" role="Teacher">
            <Slot />
        </WebSidebar>
    );
}

export default function TeacherLayout() {
    const { width } = useWindowDimensions();
    // Tablet (iPad/Android) at >= 768px and Web both get sidebar layout
    const useWebLayout = width >= 768;

    return (
        <AuthGuard allowedRoles={['teacher']}>
            {useWebLayout ? <TeacherSidebar /> : <TeacherTabs />}
        </AuthGuard>
    );
}
