import { Tabs } from "expo-router";
import { BookOpen, Building, Settings, Star } from "lucide-react-native";
import { Platform, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StudentLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{flex:1, paddingTop: insets.top}} className="bg-white">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb", // Fixed the yellow-ish hex to a neutral gray

          // DYNAMIC HEIGHT: Base height (usually 50-60) + the device's bottom inset
          minHeight: Platform.OS === "ios" ? 64 + insets.bottom : 70,

          // DYNAMIC PADDING: Use the inset for the bottom
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          paddingTop: 8,

          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarActiveTintColor: "#1ABC9C",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ size = 24, color }) => (
            <Building size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ size = 24, color }) => (
            <BookOpen size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="grades"
        options={{
          title: "Grades",
          tabBarIcon: ({ size = 24, color }) => (
            <Star size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ size = 24, color }) => (
            <Settings size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
