import { AuthGuard } from "@/components/AuthGuard";
import { NavItem, WebSidebar } from "@/components/layouts/WebSideBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Slot, Tabs } from "expo-router";
import {
  Bell,
  BookOpen,
  Building,
  Calendar,
  Clock,
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
  { name: "calendar", title: "Calendar", icon: Calendar, route: "/(student)/calendar" },
  { name: "timetable", title: "Timetable", icon: Clock, route: "/(student)/timetable" },
  { name: "grades", title: "Performance", icon: Star, route: "/(student)/grades" },
  { name: "library", title: "Library", icon: Glasses, route: "/(student)/library" },
  { name: "assignments", title: "Assignments", icon: PenBox, route: "/(student)/assignments" },
  { name: "diary", title: "Diary", icon: BookOpen, route: "/(student)/diary" },
  { name: "vault", title: "Academic Vault", icon: BookOpen, route: "/(student)/vault" },
  { name: "notifications", title: "Updates", icon: MessageSquare, route: "/(student)/notifications" },
  { name: "accessibility/settings", title: "Accessibility", icon: Settings, route: "/(student)/accessibility/settings" },
];

/**
 * 5 Primary Mobile Destinations for Students:
 * 1. Home (index) - Today's schedule, quick metrics, updates
 * 2. Grades (grades) - Course grades, marks & GPA
 * 3. Tasks (assignments) - Homework, exams & submissions
 * 4. Schedule (timetable) - Daily class schedule & rooms
 * 5. Settings (accessibility/settings) - Profile & display settings
 *
 * NOTE: Notifications bell is located at TOP-RIGHT of the screen header.
 */
const PRIMARY_STUDENT_TABS = [
  "index",
  "grades",
  "assignments",
  "timetable",
  "accessibility/settings",
];

// Exhaustive list of all routes under app/(student)
const ALL_STUDENT_ROUTES = [
  "accessibility/settings",
  "analytics",
  "announcements",
  "assignments",
  "attendance",
  "calendar",
  "clearance",
  "diary",
  "finance",
  "grades-enhanced",
  "grades",
  "index",
  "library",
  "notifications",
  "profile",
  "report-cards",
  "settings",
  "timetable",
  "transcripts",
  "vault",
];

const HIDDEN_STUDENT_ROUTES = ALL_STUDENT_ROUTES.filter(
  (name) => !PRIMARY_STUDENT_TABS.includes(name)
);

function StudentTabs() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

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

        {/* 2. Grades */}
        <Tabs.Screen
          name="grades"
          options={{
            title: "Grades",
            tabBarIcon: ({ color, focused }) => {
              const Icon = Star as any;
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

        {/* 3. Tasks / Assignments */}
        <Tabs.Screen
          name="assignments"
          options={{
            title: "Tasks",
            tabBarIcon: ({ color, focused }) => {
              const Icon = PenBox as any;
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

        {/* 4. Timetable */}
        <Tabs.Screen
          name="timetable"
          options={{
            title: "Schedule",
            tabBarIcon: ({ color, focused }) => {
              const Icon = Clock as any;
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

        {/* 5. Settings */}
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
        {HIDDEN_STUDENT_ROUTES.map((name) => (
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

function StudentSidebar() {
  return (
    <WebSidebar items={NAV_ITEMS} basePath="(student)" role="Student">
      <Slot />
    </WebSidebar>
  );
}

export default function StudentLayout() {
  const { width } = useWindowDimensions();
  const useWebLayout = width >= 768;

  return (
    <AuthGuard allowedRoles={['student']}>
      {useWebLayout ? <StudentSidebar /> : <StudentTabs />}
    </AuthGuard>
  );
}
