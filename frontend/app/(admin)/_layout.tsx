import { Tabs } from "expo-router";
import { SchoolProvider } from '@/contexts/SchoolContext';
import { AuthGuard } from '@/components/AuthGuard';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, Users, Wallet, Settings, LayoutGrid } from "lucide-react-native";

export default function AdminLayout() {
    const insets = useSafeAreaInsets();

    return (
        <AuthGuard allowedRoles={['admin']}>
            <SchoolProvider>
                <View className="flex-1 bg-gray-50">
                    <View className="flex-1 max-w-7xl mx-auto w-full">
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
                                        elevation: 8,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: -4 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 3,
                                    },
                                    tabBarActiveTintColor: "#FF6B00", // Teacher Orange
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
                                        tabBarIcon: ({ size, color }) => (
                                            <House size={size} color={color} strokeWidth={2} />
                                        ),
                                    }}
                                />
                                <Tabs.Screen
                                    name="users/index"
                                    options={{
                                        title: "Users",
                                        tabBarIcon: ({ size, color }) => (
                                            <Users size={size} color={color} strokeWidth={2} />
                                        ),
                                    }}
                                />
                                <Tabs.Screen
                                    name="finance/index"
                                    options={{
                                        title: "Finance",
                                        tabBarIcon: ({ size, color }) => (
                                            <Wallet size={size} color={color} strokeWidth={2} />
                                        ),
                                    }}
                                />
                                <Tabs.Screen
                                    name="management/index"
                                    options={{
                                        title: "Manage",
                                        tabBarIcon: ({ size, color }) => (
                                            <LayoutGrid size={size} color={color} strokeWidth={2} />
                                        ),
                                    }}
                                />
                                <Tabs.Screen
                                    name="settings/index"
                                    options={{
                                        title: "Settings",
                                        tabBarIcon: ({ size, color }) => (
                                            <Settings size={size} color={color} strokeWidth={2} />
                                        ),
                                    }}
                                />
                                {/* Hide internal routes from tabs */}
                                <Tabs.Screen name="users/[id]" options={{ href: null }} />
                                <Tabs.Screen name="users/create" options={{ href: null }} />
                                <Tabs.Screen name="finance/bursaries/[id]" options={{ href: null }} />
                                <Tabs.Screen name="finance/bursaries/create" options={{ href: null }} />
                                <Tabs.Screen name="management/analytics" options={{ href: null }} />
                                <Tabs.Screen name="management/library/index" options={{ href: null }} />
                                <Tabs.Screen name="management/subjects/index" options={{ href: null }} />
                                <Tabs.Screen name="management/subjects/create" options={{ href: null }} />
                                <Tabs.Screen name="subjects/index" options={{ href: null }} />
                                <Tabs.Screen name="subjects/create" options={{ href: null }} />
                                <Tabs.Screen name="timetable/index" options={{ href: null }} />
                                <Tabs.Screen name="finance/funds/index" options={{ href: null }} />

                            </Tabs>
                        </View>
                    </View>
                </View>
            </SchoolProvider>
        </AuthGuard>
    );
}