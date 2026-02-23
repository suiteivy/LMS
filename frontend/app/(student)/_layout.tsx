import { AuthGuard } from "@/components/AuthGuard";
import { WebSidebar, NavItem } from "@/components/layouts/WebSideBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import {
  BookOpen,
  Building,
  CreditCard,
  Glasses,
  MessageSquare,
  PenBox,
  Settings,
  Star,
} from "lucide-react-native";
import { Platform, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full nav — used by sidebar on web
const NAV_ITEMS: NavItem[] = [
  { name: "index",       title: "Home",        icon: Building,      route: "/(student)" },
  { name: "subjects",    title: "Subjects",    icon: BookOpen,      route: "/(student)/subjects" },
  { name: "library",     title: "Library",     icon: Glasses,       route: "/(student)/library" },
  { name: "assignments", title: "Assignments", icon: PenBox,        route: "/(student)/assignments" },
  { name: "grades",      title: "Grades",      icon: Star,          route: "/(student)/grades" },
  { name: "finance",     title: "Finances",    icon: CreditCard,    route: "/(student)/finance" },
  { name: "messages",    title: "Messages",    icon: MessageSquare, route: "/(student)/messages" },
  { name: "settings",    title: "Settings",    icon: Settings,      route: "/(student)/settings" },
];

// Only these three show in the mobile bottom tab bar
const MOBILE_TAB_NAMES = ["index", "messages", "settings"];

// Everything else hidden (route still works, just no tab)
const ALL_OTHER = NAV_ITEMS
  .filter(i => !MOBILE_TAB_NAMES.includes(i.name))
  .map(i => i.name);
const HIDDEN_ROUTES = [...ALL_OTHER, "attendance", "timetable", "announcements"];

function StudentTabs() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

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
        sceneStyle: {
          backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
        },
      }}
    >
      {/* Settings — left */}
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

      {/* Home — center, lifts when focused, flat when not */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => {
            const Icon = Building as any;
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
          tabBarLabel: ({ focused, color }) =>
            focused ? null : (
              <Text style={{ fontSize: 11, fontWeight: "600", color }}>Home</Text>
            ),
        }}
      />

      {/* Messages — right */}
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ size, color }) => {
            const Icon = MessageSquare as any;
            return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
          },
        }}
      />

      {/* All other routes — hidden from tab bar but still navigable */}
      {HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

function StudentSidebar() {
  return (
    <WebSidebar items={NAV_ITEMS} basePath="(student)" role="Student">
      <Slot />
    </WebSidebar>
  );
}

export default function StudentLayout() {
  return (
    <AuthGuard allowedRoles={['student']}>
      {Platform.OS === 'web' ? <StudentSidebar /> : <StudentTabs />}
    </AuthGuard>
  );
}