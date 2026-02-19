import { AuthGuard } from "@/components/AuthGuard";
import { Tabs } from "expo-router";
import { Bell, CalendarCheck, CreditCard, GraduationCap, LayoutDashboard, MessageSquare, Settings } from "lucide-react-native";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ParentLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AuthGuard allowedRoles={['parent']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            minHeight: Platform.OS === "ios" ? 64 + insets.bottom : 70,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            paddingTop: 8,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarActiveTintColor: "#ff6900",
          tabBarInactiveTintColor: "#6b7280",
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
          },
          sceneStyle: {
            backgroundColor: "#ffffff",
            paddingTop: insets.top,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ size, color }) => {
              const Icon = LayoutDashboard as any;
              return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
            },
          }}
        />
        <Tabs.Screen
          name="grades"
          options={{
            title: "Grades",
            tabBarIcon: ({ size, color }) => {
              const Icon = GraduationCap as any;
              return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
            },
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: "Attendance",
            tabBarIcon: ({ size, color }) => {
              const Icon = CalendarCheck as any;
              return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
            },
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: "Fees",
            tabBarIcon: ({ size, color }) => {
              const Icon = CreditCard as any;
              return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
            },
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Chat",
            tabBarIcon: ({ size, color }) => {
              const Icon = MessageSquare as any;
              return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
            },
          }}
        />
        <Tabs.Screen
          name="announcements"
          options={{
            title: "Updates",
            tabBarIcon: ({ size, color }) => {
              const Icon = Bell as any;
              return <View><Icon size={size} color={color} strokeWidth={2} /></View>;
            },
          }}
        />
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
      </Tabs>
    </AuthGuard>
  );
}