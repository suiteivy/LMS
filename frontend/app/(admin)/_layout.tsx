import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from "@/contexts/AuthContext";
import { SchoolProvider } from '@/contexts/SchoolContext';
import { Tabs } from "expo-router";
import { House, LayoutGrid, LogOut, Settings, Users, Wallet } from "lucide-react-native";
import { Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminLayout() {
    const insets = useSafeAreaInsets();
    const { signOut } = useAuth();

    return (
        <AuthGuard allowedRoles={['admin']}>
            <SchoolProvider>
                <Tabs
                    screenOptions={{
                        headerShown: true,
                        headerRight: () => (
                            <TouchableOpacity
                                onPress={() => signOut()}
                                style={{ marginRight: 15, padding: 8, opacity: 1 }}
                            >
                                <LogOut size={20} color="#FF6B00" />
                            </TouchableOpacity>
                        ),
                        headerStyle: {
                            backgroundColor: '#ffffff',
                            elevation: 0,
                            shadowOpacity: 0,
                            borderBottomWidth: 1,
                            borderBottomColor: '#f3f4f6',
                        },
                        headerTitleStyle: {
                            fontWeight: 'bold',
                            color: '#111827',
                        },
                        tabBarStyle: {
                            backgroundColor: "#ffffff",
                            borderTopWidth: 1,
                            borderTopColor: "#e5e7eb",
                            minHeight: Platform.OS === "ios" ? 64 + (insets.bottom || 0) : 70,
                            paddingBottom: (insets.bottom || 0) > 0 ? insets.bottom : 12,
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
                        sceneStyle: {
                            backgroundColor: "#f9fafb",
                        },
                    }}
                >
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: "Home",
                            tabBarIcon: ({ color, size }) => {
                                const Icon = House as any;
                                return (
                                    <View>
                                        <Icon size={size} color={color} />
                                    </View>
                                );
                            },
                        }}
                    />
                    <Tabs.Screen
                        name="users/index"
                        options={{
                            title: "Users",
                            tabBarIcon: ({ size, color }) => {
                                const Icon = Users as any;
                                return (
                                    <View>
                                        <Icon size={size} color={color} strokeWidth={2} />
                                    </View>
                                );
                            },
                        }}
                    />
                    <Tabs.Screen
                        name="finance/index"
                        options={{
                            title: "Finance",
                            tabBarIcon: ({ size, color }) => {
                                const Icon = Wallet as any;
                                return (
                                    <View>
                                        <Icon size={size} color={color} strokeWidth={2} />
                                    </View>
                                );
                            },
                        }}
                    />
                    <Tabs.Screen
                        name="management/index"
                        options={{
                            title: "Manage",
                            tabBarIcon: ({ size, color }) => {
                                const Icon = LayoutGrid as any;
                                return (
                                    <View>
                                        <Icon size={size} color={color} strokeWidth={2} />
                                    </View>
                                );
                            },
                        }}
                    />
                    <Tabs.Screen
                        name="settings/settings"
                        options={{
                            title: "Settings",
                            tabBarIcon: ({ size, color }) => {
                                const Icon = Settings as any;
                                return (
                                    <View>
                                        <Icon size={size} color={color} strokeWidth={2} />
                                    </View>
                                );
                            },
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
                    <Tabs.Screen name="management/roles/index" options={{ href: null }} />

                    {/* Additional unwanted routes from user feedback */}
                    <Tabs.Screen name="settings/index" options={{ href: null }} />
                    <Tabs.Screen name="attendance/teachers/index" options={{ href: null }} />
                    <Tabs.Screen name="finance/bursaries/reports" options={{ href: null }} />

                </Tabs>
            </SchoolProvider>
        </AuthGuard>
    );
}