import { Tabs } from "expo-router";
import { BookOpen, Building, Glasses, PenBox, Settings, Star } from "lucide-react-native";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGuard } from "@/components/AuthGuard";

export default function StudentLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AuthGuard>
      <View style={{ flex: 1, paddingTop: insets.top }} className="bg-white">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "orange",
            tabBarInactiveTintColor: "#6b7280",
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
            },
            tabBarStyle: {
              backgroundColor: "#ffffff",
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
              // Handle different device heights dynamically
              minHeight: Platform.OS === "ios" ? 64 + insets.bottom : 70,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
              paddingTop: 8,
              // Shadow/Elevation
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
            },
          }}
        >
          {/* 1. Home Dashboard */}
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ size, color }) => (
                <Building size={size} color={color} strokeWidth={2} />
              ),
            }}
          />

          {/* 2. Academic Resources */}
          <Tabs.Screen
            name="subjects"
            options={{
              title: "Subjects",
              tabBarIcon: ({ size, color }) => (
                <BookOpen size={size} color={color} strokeWidth={2} />
              ),
            }}
          />

          <Tabs.Screen
            name="library"
            options={{
              title: "Library",
              tabBarIcon: ({ size, color }) => (
                <Glasses size={size} color={color} strokeWidth={2} />
              ),
            }}
          />

          {/* 3. Tasks & Progress */}
          <Tabs.Screen
            name="assignments"
            options={{
              title: "Assignments",
              tabBarIcon: ({ size, color }) => (
                <PenBox size={size} color={color} strokeWidth={2} />
              ),
            }}
          />

          <Tabs.Screen
            name="grades"
            options={{
              title: "Grades",
              tabBarIcon: ({ size, color }) => (
                <Star size={size} color={color} strokeWidth={2} />
              ),
            }}
          />

          {/* 4. User Configuration */}
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarIcon: ({ size, color }) => (
                <Settings size={size} color={color} strokeWidth={2} />
              ),
            }}
          />

          {/* 5. Hidden utility route (Removed from bottom bar) */}
          <Tabs.Screen
            name="parents"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </View>
    </AuthGuard>
  );
}