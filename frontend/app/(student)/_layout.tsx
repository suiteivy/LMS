import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import {
  Bell,
  BookOpen,
  Building,
  CreditCard,
  Glasses,
  MessageSquare,
  PenBox,
  Settings,
  Star,
} from "lucide-react-native";
import { Platform, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full nav used by sidebar on web
const NAV_ITEMS: NavItem[] = [
  { name: "index", title: "Home", icon: Building, route: "/(student)" },
  { name: "grades", title: "Performance", icon: Star, route: "/(student)/grades" },
  { name: "library", title: "Library", icon: Glasses, route: "/(student)/library" },
  { name: "assignments", title: "Assignments", icon: PenBox, route: "/(student)/assignments" },
  { name: "finance", title: "Finances", icon: CreditCard, route: "/(student)/finance" },
  { name: "diary", title: "Diary", icon: BookOpen, route: "/(student)/diary" },
  { name: "notifications", title: "Updates", icon: MessageSquare, route: "/(student)/notifications" },
  { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(student)/accessibility/settings" },
];

// Only these show in the mobile bottom tab bar
const MOBILE_TAB_NAMES = ["grades", "assignments", "index", "notifications", "accessibility/settings"];

// Everything else hidden (route still works, just no tab)
const ALL_OTHER = NAV_ITEMS
  .filter(i => !MOBILE_TAB_NAMES.includes(i.name))
  .map(i => i.name);
const HIDDEN_ROUTES = [...ALL_OTHER, "attendance", "timetable", "announcements", "grades-enhanced", "report-cards", "analytics"];

import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationBellDropdown } from "@/components/common/NotificationBellDropdown";
import { useRouter } from "expo-router";
import { useState } from "react";

function StudentTabs() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const router = useRouter();

  const tabBarHeight = 52 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      initialRouteName="index"
      screenListeners={({ route }: { route: any }) => ({
        tabPress: (e: any) => {
          if (route.name === "notifications") {
            e.preventDefault();
            setShowNotifDropdown((v) => !v);
          }
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF6B00",
        tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
        tabBarStyle: {
          backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1f2937' : "#f1f5f9",
          // Tighter on all screen sizes — no more sprawling gaps
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom || 4,
          paddingTop: 4,
          paddingHorizontal: 8,
          shadowOpacity: isDark ? 0.3 : 0.08,
          boxShadow: [{
            offsetX: 0,
            offsetY: -2,
            blurRadius: 8,
            color: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.06)',
          }],
        },
        sceneStyle: {
          backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
        },
      }}
    >
      <Tabs.Screen
        name="grades"
        options={{
          title: "Grades",
          tabBarIcon: ({ size, color }) => {
            const Icon = Star as any;
            return <Icon size={size - 2} color={color} strokeWidth={2} />;
          },
        }}
      />

      <Tabs.Screen
        name="assignments"
        options={{
          title: "Tasks",
          tabBarIcon: ({ size, color }) => {
            const Icon = PenBox as any;
            return <Icon size={size - 2} color={color} strokeWidth={2} />;
          },
        }}
      />

      {/* Home — lifted floating center button */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => {
            const Icon = Building as any;
            return (
              <View style={{
                width: focused ? 44 : 26,
                height: focused ? 44 : 26,
                borderRadius: focused ? 22 : 8,
                backgroundColor: focused ? "#FF6B00" : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: focused ? -16 : 0,
                shadowOpacity: focused ? 0.4 : 0,
                shadowRadius: focused ? 10 : 0,
                boxShadow: focused ? [{
                  offsetX: 0,
                  offsetY: 6,
                  blurRadius: 10,
                  color: 'rgba(255, 107, 0, 0.4)',
                }] : undefined,
                elevation: focused ? 8 : 0,
              }}>
                <Icon
                  size={focused ? 20 : 18}
                  color={focused ? "#ffffff" : color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            );
          },
          tabBarLabel: ({ focused, color }) =>
            focused ? null : (
              <Text style={{ fontSize: 10, fontWeight: "600", color, letterSpacing: 0.2 }}>Home</Text>
            ),
        }}
      />

      <Tabs.Screen
        name="diary"
        options={{
          title: "Diary",
          tabBarIcon: ({ size, color }) => {
            const Icon = BookOpen as any;
            return <Icon size={size - 2} color={color} strokeWidth={2} />;
          },
        }}
      />

      <Tabs.Screen
        name="accessibility/settings"
        options={{
          title: "Accessibility",
          tabBarIcon: ({ size, color }) => {
            const Icon = Settings as any;
            return <Icon size={size - 2} color={color} strokeWidth={2} />;
          },
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Updates",
          tabBarItemStyle: { width: 72 },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
          tabBarIcon: ({ size = 22, color, focused }) => {
            const iconColor = showNotifDropdown ? "#FF6B00" : focused ? "#FF6B00" : color;
            return (
              <View>
                <Bell size={size} color={iconColor} strokeWidth={2} />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#FF6B00",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: isDark ? "#0F0B2E" : "#ffffff",
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 8, fontWeight: "bold" }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />

      {HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
    <NotificationBellDropdown
      visible={showNotifDropdown}
      onClose={() => setShowNotifDropdown(false)}
      onViewAll={() => router.push("/(student)/notifications")}
      tabBarHeight={tabBarHeight}
    />
    </View>
  );
}

function StudentSidebar() {
  const { showFinancials } = useSubscriptionTier();
  const items = showFinancials ? NAV_ITEMS : NAV_ITEMS.filter(i => i.name !== 'finance');
  return (
    <WebSidebar items={items} basePath="(student)" role="Student">
      <Slot />
    </WebSidebar>
  );
}

export default function StudentLayout() {
  const { width } = useWindowDimensions();
  // FIX: drop Platform.OS check — native tablet (iPad) at >768px also gets sidebar
  const useWebLayout = width > 768;

  return (
    <AuthGuard allowedRoles={['student']}>
      {useWebLayout ? <StudentSidebar /> : <StudentTabs />}
    </AuthGuard>
  );
}
