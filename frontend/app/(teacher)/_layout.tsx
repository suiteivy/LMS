import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Slot, Tabs } from "expo-router";
import { BookOpen, Building, LayoutGrid, School, Settings, Users } from "lucide-react-native";
import { Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full nav items for paid plans
const ALL_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: Building, route: "/(teacher)" },
    { name: "subjects", title: "Subjects", icon: BookOpen, route: "/(teacher)/subjects" },
    { name: "classes", title: "Classes", icon: School, route: "/(teacher)/classes" },
    { name: "students", title: "Students", icon: Users, route: "/(teacher)/students" },
    { name: "management", title: "Manage", icon: LayoutGrid, route: "/(teacher)/management" },
    { name: "settings", title: "Settings", icon: Settings, route: "/(teacher)/settings" },
];

// Simplified nav for free plan — Home + Classes + Settings only
const FREE_NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: Building, route: "/(teacher)" },
    { name: "classes", title: "Classes", icon: School, route: "/(teacher)/classes" },
    { name: "settings", title: "Settings", icon: Settings, route: "/(teacher)/settings" },
];

// Names hidden from tabs on free plan (registered as routes but not shown)
const FREE_HIDDEN = ["subjects", "students", "management"];

function TeacherTabs() {
    const insets = useSafeAreaInsets();
    const { isDemo } = useAuth();
    const { isDark } = useTheme();
    const { isFree } = useSubscriptionTier();

    const NAV_ITEMS = isFree ? FREE_NAV_ITEMS : ALL_NAV_ITEMS;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#1f2937' : "#e5e7eb",
                    minHeight: Platform.OS === "ios" ? 64 + insets.bottom : 70,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                    paddingTop: 8,
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                },
                tabBarActiveTintColor: "#FF6B00",
                tabBarInactiveTintColor: isDark ? "#9ca3af" : "#6b7280",
                tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 0 },
                sceneStyle: { backgroundColor: isDark ? '#0F0B2E' : "#ffffff" },
            }}
        >
            {NAV_ITEMS.map((item) => (
                <Tabs.Screen
                    key={item.name}
                    name={item.name}
                    options={{
                        title: item.title,
                        href: item.name === "settings" && isDemo ? null : undefined,
                        tabBarIcon: ({ size = 24, color }) => {
                            const Icon = item.icon as any;
                            return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
                        },
                    }}
                />
            ))}
            {/* On free plan, hide paid-only tabs from nav but register them as routes */}
            {isFree && FREE_HIDDEN.map(name => (
                <Tabs.Screen key={name} name={name} options={{ href: null, headerShown: false }} />
            ))}
        </Tabs>
    );
}

function TeacherSidebar() {
    const { isDemo } = useAuth();
    const { isFree } = useSubscriptionTier();
    const baseItems = isFree ? FREE_NAV_ITEMS : ALL_NAV_ITEMS;
    const items = baseItems.filter(i => !(i.name === "settings" && isDemo));
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