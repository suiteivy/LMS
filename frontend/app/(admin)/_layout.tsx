import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import { House, LayoutGrid, Settings, Users, Wallet } from "lucide-react-native";
import { Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_ITEMS: NavItem[] = [
    { name: "settings/settings", title: "Settings", icon: Settings, route: "/(admin)/settings/settings" },
    { name: "index", title: "Home", icon: House, route: "/(admin)" },
    { name: "management/index", title: "Manage", icon: LayoutGrid, route: "/(admin)/management" },
    { name: "users/index", title: "Users", icon: Users, route: "/(admin)/users" },
    { name: "finance/index", title: "Finance", icon: Wallet, route: "/(admin)/finance" },
];

const MOBILE_TAB_NAMES = ["settings/settings", "index", "management/index"];

const ALL_OTHER = NAV_ITEMS
    .filter(i => !MOBILE_TAB_NAMES.includes(i.name))
    .map(i => i.name);

const HIDDEN = [
    ...ALL_OTHER,
    "users/[id]", "users/create",
    "finance/bursaries/[id]", "finance/bursaries/create",
    "management/analytics", "management/library/index",
    "management/subjects/index", "management/subjects/create",
    "subjects/index", "subjects/create",
    "timetable/index", "finance/funds/index",
    "management/roles/index", "settings/index",
    "attendance/teachers/index", "finance/bursaries/reports",
    "classes/index", "classes/create",
    "management/subjects/details",
];

function AdminTabs() {
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
            {/* Settings — left */}
            <Tabs.Screen
                name="settings/settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ size, color }) => {
                        const Icon = Settings as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
            />

            {/* Home — center, elevated style */}
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
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

            {/* Manage — right */}
            <Tabs.Screen
                name="management/index"
                options={{
                    title: "Manage",
                    tabBarIcon: ({ size, color }) => {
                        const Icon = LayoutGrid as any;
                        return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                    },
                }}
            />

            {/* Hidden items */}
            {HIDDEN.map((name) => (
                <Tabs.Screen key={name} name={name} options={{ href: null }} />
            ))}
        </Tabs>
    );
}

function AdminSidebar() {
    return (
        <WebSidebar items={NAV_ITEMS} basePath="(admin)" role="Admin">
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