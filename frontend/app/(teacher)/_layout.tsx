import { Tabs } from "expo-router";
import { BookOpen, Building, Users, Settings, LayoutGrid, School } from "lucide-react-native";
import { Platform, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGuard } from "@/components/AuthGuard";

export default function TeacherLayout() {
    const insets = useSafeAreaInsets();

    return (
        <AuthGuard allowedRoles={['teacher']}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: "#ffffff",
                        borderTopWidth: 1,
                        borderTopColor: "#e5e7eb",

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
                    tabBarActiveTintColor: "#FF6B00",
                    tabBarInactiveTintColor: "#6b7280",
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: "600",
                        marginTop: 0,
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
                        tabBarIcon: ({ size = 24, color }) => {
                            const Icon = Building as any
                            return (
                                <View>
                                    <Icon size={size} color={color} strokeWidth={2} />
                                </View>
                            )
                        },
                    }}
                />
                <Tabs.Screen
                    name="subjects"
                    options={{
                        title: "Subjects",
                        tabBarIcon: ({ size = 24, color }) => {
                            const Icon = BookOpen as any
                            return (
                                <View>
                                    <Icon size={size} color={color} strokeWidth={2} />
                                </View>
                            )
                        },
                    }}
                />
                <Tabs.Screen
                    name="classes"
                    options={{
                        title: "Classes",
                        tabBarIcon: ({ size = 24, color }) => {
                            const Icon = School as any
                            return (
                                <View>
                                    <Icon size={size} color={color} strokeWidth={2} />
                                </View>
                            )
                        },
                    }}
                />
                <Tabs.Screen
                    name="students"
                    options={{
                        title: "Students",
                        tabBarIcon: ({ size = 24, color }) => {
                            const Icon = Users as any
                            return (
                                <View>
                                    <Icon size={size} color={color} strokeWidth={2} />
                                </View>
                            )
                        },
                    }}
                />
                <Tabs.Screen
                    name="management"
                    options={{
                        title: "Manage",
                        tabBarIcon: ({ size = 24, color }) => {
                            const Icon = LayoutGrid as any
                            return (
                                <View>
                                    <Icon size={size} color={color} strokeWidth={2} />
                                </View>
                            )
                        },
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: "Settings",
                        tabBarIcon: ({ size = 24, color }) => {
                            const Icon = Settings as any
                            return (
                                <View>
                                    <Icon size={size} color={color} strokeWidth={2} />
                                </View>
                            )
                        },
                    }}
                />
            </Tabs>
        </AuthGuard>
    );
}
