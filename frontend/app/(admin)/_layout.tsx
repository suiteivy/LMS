import { AuthGuard } from '@/components/AuthGuard';
import { SchoolProvider } from '@/contexts/SchoolContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs } from "expo-router";
import { House, LayoutGrid, Settings, Users, Wallet } from "lucide-react-native";
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminLayout() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    return (
        <AuthGuard allowedRoles={['admin']}>
            <SchoolProvider>
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        headerStyle: {
                            backgroundColor: isDark ? '#121212' : '#ffffff',
                            elevation: 0,
                            shadowOpacity: 0,
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? '#1f2937' : '#f3f4f6',
                        },
                        headerTitleStyle: {
                            fontWeight: 'bold',
                            color: isDark ? '#f9fafb' : '#111827',
                        },
                        tabBarStyle: {
                            backgroundColor: isDark ? '#0F0B2E' : "#ffffff",
                            borderTopWidth: 1,
                            borderTopColor: isDark ? '#1f2937' : '#f3f4f6',
                            height: 64,
                            paddingBottom: 10,
                        },
                        tabBarActiveTintColor: "#FF6B00",
                        tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
                        tabBarLabelStyle: {
                            fontSize: 11,
                            fontWeight: "600",
                            marginTop: 0,
                        },
                        sceneStyle: {
                            backgroundColor: isDark ? '#0F0B2E' : "#f9fafb",
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
                    <Tabs.Screen name="management/subjects/details" options={{ href: null }} />
                    <Tabs.Screen name="subjects/index" options={{ href: null }} />
                    <Tabs.Screen name="subjects/create" options={{ href: null }} />
                    <Tabs.Screen name="timetable/index" options={{ href: null }} />
                    <Tabs.Screen name="finance/funds/index" options={{ href: null }} />
                    <Tabs.Screen name="management/roles/index" options={{ href: null }} />

                    {/* Additional unwanted routes from user feedback */}
                    <Tabs.Screen name="settings/index" options={{ href: null }} />
                    <Tabs.Screen name="attendance/teachers/index" options={{ href: null }} />
                    <Tabs.Screen name="finance/bursaries/reports" options={{ href: null }} />
                    <Tabs.Screen name="classes/index" options={{ href: null }} />

                </Tabs>
            </SchoolProvider>
        </AuthGuard>
    );
}