import { Tabs } from "expo-router";
import { LayoutDashboard, CreditCard, MessageSquare, FileText, Settings } from "lucide-react-native";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGuard } from "@/components/AuthGuard";

export default function ParentLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AuthGuard>
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-white">
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
            },
            tabBarActiveTintColor: "#2563eb", // Blue for Parents
            tabBarInactiveTintColor: "#6b7280",
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ size, color }) => <LayoutDashboard size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="billing"
            options={{
              title: "Fees",
              tabBarIcon: ({ size, color }) => <CreditCard size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: "Chat",
              tabBarIcon: ({ size, color }) => <MessageSquare size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
            }}
          />
        </Tabs>
      </View>
    </AuthGuard>
  );
}