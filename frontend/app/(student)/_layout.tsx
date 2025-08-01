import { Tabs } from "expo-router";
import { BookOpen, Building, Settings, Star } from "lucide-react-native";

export default function StudentLayout() {
  return (
    <Tabs
        screenOptions={
            {
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: "#A1EBE5",
                    borderTopWidth: 0,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderBottomWidth: 0,
                    paddingTop: 8,
                    paddingBottom: 8,
                    height:64
                },
                tabBarActiveTintColor: "#1ABC9C",
                tabBarInactiveTintColor: "#2C3E50",
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "bold",
                },
            }
        }
    >
      <Tabs.Screen 
            name="index" 
            options={
                {
                    title: "Home",
                    tabBarIcon: ({ size, color }) => (
                        <Building size={size} color={color} />
                    ),
                }
            }
        />
        <Tabs.Screen 
            name="courses" 
            options={
                {
                    title: "Courses",
                    tabBarIcon: ({ size, color }) => (
                        <BookOpen size={size} color={color} />
                    ),
                }
            }
        />
        <Tabs.Screen 
            name="grades" 
            options={
                {
                    title: "Grades",
                    tabBarIcon: ({ size, color }) => (
                        <Star size={size} color={color} />
                    ),
                }
            }
        />
        <Tabs.Screen 
            name="settings" 
            options={
                {
                    title: "Settings",
                    tabBarIcon: ({ size, color }) => (
                        <Settings size={size} color={color} />
                    ),
                }
            }
        />
    </Tabs>
  );
}