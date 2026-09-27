import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Slot, Tabs } from "expo-router";
import { House, LayoutGrid, Settings, Users, Wallet, MessageSquare, Bell, Calendar } from "lucide-react-native";
import { Platform, useWindowDimensions, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full nav for paid plans (Sidebar & Global Nav)
export const ALL_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: House, route: "/(admin)" },
    { name: "management/index", title: "Manage", icon: LayoutGrid, route: "/(admin)/management" },
    { name: "calendar/index", title: "Calendar", icon: Calendar, route: "/(admin)/calendar" },
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
    { name: "calendar/index", title: "Calendar", icon: Calendar, route: "/(admin)/calendar" },
    { name: "users/index", title: "Users", icon: Users, route: "/(admin)/users" },
    { name: "communication/index", title: "Communication", icon: MessageSquare, route: "/(admin)/communication" },
    { name: "notifications", title: "Alerts", icon: Bell, route: "/(admin)/notifications" },
    { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(admin)/accessibility/settings" },
];

/**
 * 5 Standard Primary Mobile Destinations (Apple HIG / Material 3 compliant):
 * 1. Home (index) - Overview & Quick Actions
 * 2. Manage (management/index) - School operations, classes & subjects
 * 3. Users (users/index) - Student & staff directory
 * 4. Finance (finance/index) - Tuition, bursaries, fee collections
 * 5. Settings (accessibility/settings) - Profile, appearance, accessibility
 *
 * NOTE: Notifications bell has been moved to the TOP-RIGHT header app-bar
 * as per mobile app conventions.
 */
const PRIMARY_MOBILE_TABS = [
    "index",
    "management/index",
    "users/index",
    "finance/index",
    "accessibility/settings",
];

// Exhaustive catalog of every route under app/(admin) to guarantee no unhandled tabs
const ALL_ADMIN_ROUTES = [
    "academic-setup/index",
    "accessibility/settings",
    "attendance/index",
    "attendance/students/index",
    "attendance/teachers/index",
    "calendar/index",
    "classes/create",
    "classes/index",
    "classes/transfers",
    "communication/index",
    "finance/bursaries/create",
    "finance/bursaries/reports",
    "finance/bursaries/[id]",
    "finance/funds/index",
    "finance/index",
    "finance/individual-records",
    "finance/revenue",
    "index",
    "loading",
    "management/analytics",
    "management/clearance/index",
    "management/coverage",
    "management/exams",
    "management/index",
    "management/library/index",
    "management/materials",
    "management/resources",
    "management/roles/index",
    "management/subjects/create",
    "management/subjects/details",
    "management/subjects/index",
    "notifications",
    "request-feature",
    "results/index",
    "results/promotions",
    "results/rankings",
    "settings/index",
    "settings/settings",
    "subjects/create",
    "subjects/index",
    "timetable/index",
    "users/create",
    "users/index",
    "users/[id]/index",
    "users/[id]/master-record",
];

const HIDDEN_ADMIN_ROUTES = ALL_ADMIN_ROUTES.filter(
    (name) => !PRIMARY_MOBILE_TABS.includes(name)
);

function AdminTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { showFinancials, hasMessaging } = useSubscriptionTier();

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
                    sceneStyle: { backgroundColor: isDark ? '#161B22' : "#f9fafb" },
                }}
            >
                {/* 1. Home Dashboard */}
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Home",
                        tabBarIcon: ({ color, focused }) => {
                            const Icon = House as any;
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

                {/* 2. Management Hub */}
                <Tabs.Screen
                    name="management/index"
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

                {/* 3. Users Directory */}
                <Tabs.Screen
                    name="users/index"
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

                {/* 4. Finance (Visible if paid tier or replaced with hidden when restricted) */}
                <Tabs.Screen
                    name="finance/index"
                    options={{
                        title: "Finance",
                        href: showFinancials ? "/(admin)/finance" : null,
                        tabBarIcon: ({ color, focused }) => {
                            const Icon = Wallet as any;
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

                {/* 5. Settings & Accessibility */}
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

                {/* Comprehensive Hidden Screens (No auto-discovered rogue tabs or tofu glyphs) */}
                {HIDDEN_ADMIN_ROUTES.map((name) => (
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

function AdminSidebar() {
    const { showFinancials, hasMessaging } = useSubscriptionTier();
    const { activeRole, profile, isFinanceAdmin } = useAuth();

    const currentRole = String(activeRole || profile?.role || '').toLowerCase();
    const isPureFinanceAdmin =
        currentRole === 'finance_administrator' ||
        currentRole === 'finance_admin' ||
        (isFinanceAdmin && profile?.role !== 'admin');

    const baseItems = (showFinancials ? ALL_NAV_ITEMS : BETA_NAV_ITEMS)
        .filter((item) => (item.name === 'communication/index' ? hasMessaging : true));

    // If user's active role is strictly finance admin, limit sidebar navigation
    const items = isPureFinanceAdmin
        ? baseItems.filter((item) => ['finance/index', 'accessibility/settings', 'notifications'].includes(item.name))
        : baseItems;

    return (
        <WebSidebar items={items} basePath="(admin)" role={isPureFinanceAdmin ? "Finance" : "Admin"}>
            <Slot />
        </WebSidebar>
    );
}

export default function AdminLayout() {
    const { width } = useWindowDimensions();
    // Tablet (iPad/Android) at >= 768px and Web both get sidebar layout
    const useWebLayout = width >= 768;

    return (
        <AuthGuard allowedRoles={['admin', 'finance_administrator', 'finance_admin']}>
            <SchoolProvider>
                {useWebLayout ? <AdminSidebar /> : <AdminTabs />}
            </SchoolProvider>
        </AuthGuard>
    );
}
