import { AuthGuard } from "@/components/AuthGuard";
import { WebSidebar, NavItem } from "@/components/layouts/WebSideBar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import { BookOpen, Building, LayoutGrid, School, Settings, Users } from "lucide-react-native";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_ITEMS: NavItem[] = [
    { name: "index",      title: "Home",     icon: Building,    route: "/(teacher)" },
    { name: "subjects",   title: "Subjects", icon: BookOpen,    route: "/(teacher)/subjects" },
    { name: "classes",    title: "Classes",  icon: School,      route: "/(teacher)/classes" },
    { name: "students",   title: "Students", icon: Users,       route: "/(teacher)/students" },
    { name: "management", title: "Manage",   icon: LayoutGrid,  route: "/(teacher)/management" },
    { name: "settings",   title: "Settings", icon: Settings,    route: "/(teacher)/settings" },
];

function TeacherTabs() {
    const insets = useSafeAreaInsets();
    const { isDemo } = useAuth();
    const { isDark } = useTheme();

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
        </Tabs>
    );
}

function TeacherSidebar() {
    const { isDemo } = useAuth();
    const items = NAV_ITEMS.filter(i => !(i.name === "settings" && isDemo));
    return (
        <WebSidebar items={items} basePath="(teacher)" role="Teacher">
            <Slot />
        </WebSidebar>
    );
}

export default function TeacherLayout() {
    return (
        <AuthGuard allowedRoles={['teacher']}>
            {Platform.OS === 'web' ? <TeacherSidebar /> : <TeacherTabs />}
        </AuthGuard>
    );
}