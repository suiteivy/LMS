import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserCircle, Settings, ShieldCheck, LogOut, HelpCircle } from "lucide-react-native";
import StudentProfile from './StudentProfile';
import StudentSettings from './StudentSettings';
import StudentHelp from './StudentHelp';
import TeacherProfile from './TeacherProfile';
import TeacherSettings from './TeacherSettings';
import TeacherHelp from './TeacherHelp';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Alert } from 'react-native';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
    const { signOut } = useAuth();

    const handleLogout = async () => {
        try {
            const { error } = await signOut();
            if (error) {
                Alert.alert("Logout Error", error.message || "Failed to sign out");
            } else {
                router.replace('/(auth)/signIn');
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "An unexpected error occurred");
        }
    };

    return (
        <DrawerContentScrollView {...props}>
            <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 18 }}>App Settings</Text>
            </View>

            <DrawerItemList {...props} />

            <DrawerItem
                label="Logout"
                labelStyle={{ color: '#e74c3c' }}
                onPress={handleLogout}
                icon={({ size }) => <LogOut size={size} color="#e74c3c" />}
            />
        </DrawerContentScrollView>
    );
}

export default function GlobalSettingsDrawer({ userRole = 'student' }) {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer.Navigator
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={{
                    headerShown: true,
                    drawerActiveTintColor: "#128C7E",
                    drawerStyle: { width: 280 },
                }}
            >
                {/* Everyone sees Profile */}
                <Drawer.Screen
                    name="Profile"
                    component={userRole === 'teacher' ? TeacherProfile : StudentProfile}
                    options={{ drawerIcon: ({ color, size }) => <UserCircle size={size} color={color} /> }}
                />

                {/* Only Admin sees Admin Panel */}
                {userRole === 'admin' && (
                    <Drawer.Screen
                        name="AdminPanel"
                        options={{ drawerIcon: ({ color, size }) => <ShieldCheck size={size} color={color} /> }}
                        component={() => (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text>Admin Panel</Text>
                            </View>
                        )}
                    />
                )}

                {/* Common Settings */}
                <Drawer.Screen
                    name="Settings"
                    options={{ drawerIcon: ({ color, size }) => <Settings size={size} color={color} /> }}
                    component={userRole === 'teacher' ? TeacherSettings : StudentSettings}
                />

                <Drawer.Screen
                    name="Help"
                    component={userRole === 'teacher' ? TeacherHelp : StudentHelp}
                    options={{ drawerIcon: ({ color, size }) => <HelpCircle size={size} color={color} /> }}
                />

            </Drawer.Navigator>
        </GestureHandlerRootView>
    );
}