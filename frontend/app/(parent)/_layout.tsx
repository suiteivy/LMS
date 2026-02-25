import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import { Bell, CreditCard, LayoutDashboard, MessageSquare, Settings } from "lucide-react-native";
import { Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_ITEMS: NavItem[] = [
    { name: "index", title: "Home", icon: LayoutDashboard, route: "/(parent)" },
    { name: "finance", title: "Fees", icon: CreditCard, route: "/(parent)/finance" },
    { name: "messages", title: "Chat", icon: MessageSquare, route: "/(parent)/messages" },
    { name: "announcements", title: "Updates", icon: Bell, route: "/(parent)/announcements" },
    { name: "settings", title: "Settings", icon: Settings, route: "/(parent)/settings" },
];

function ParentTabs() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#1f2937' : "#e5e7eb",
                    height: 60,
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
                    backgroundColor: isDark ? '#000000' : "#ffffff",
                },
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
            <Tabs.Screen name="grades" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="attendance" options={{ href: null, headerShown: false }} />
        </Tabs>
    );
}

function ParentSidebar() {
    return (
        <WebSidebar items={NAV_ITEMS} basePath="(parent)" role="Parent">
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