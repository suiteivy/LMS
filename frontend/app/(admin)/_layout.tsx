import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import { House, LayoutGrid, Settings, Users, Wallet } from "lucide-react-native";
import { Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: House, route: "/(admin)" },
    { name: "users/index", title: "Users", icon: Users, route: "/(admin)/users" },
    { name: "finance/index", title: "Finance", icon: Wallet, route: "/(admin)/finance" },
    { name: "management/index", title: "Manage", icon: LayoutGrid, route: "/(admin)/management" },
    { name: "settings/settings", title: "Settings", icon: Settings, route: "/(admin)/settings/settings" },
];

const HIDDEN = [
    "users/[id]", "users/create",
    "finance/bursaries/[id]", "finance/bursaries/create",
    "management/analytics", "management/library/index",
    "management/subjects/index", "management/subjects/create",
    "subjects/index", "subjects/create",
    "timetable/index", "finance/funds/index",
    "management/roles/index", "settings/index",
    "attendance/teachers/index", "finance/bursaries/reports",
    "classes/index",
    "classes/create",
];

function AdminTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    backgroundColor: isDark ? '#121212' : '#ffffff',
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#2c2c2c' : '#f3f4f6',
                },
                headerTitleStyle: {
                    fontWeight: 'bold',
                    color: isDark ? '#f9fafb' : '#111827',
                },
                tabBarStyle: {
                    backgroundColor: isDark ? '#121212' : "#ffffff",
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#2c2c2c' : '#f3f4f6',
                    height: 64,
                    paddingBottom: 10,
                },
                tabBarActiveTintColor: "#FF6B00",
                tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
                tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 0 },
                sceneStyle: { backgroundColor: isDark ? '#121212' : "#f9fafb" },
            }}
        >
            {NAV_ITEMS.map((item) => (
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
            ))}
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