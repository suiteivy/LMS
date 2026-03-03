import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

const MasterAdminLayout = () => {
    const { session, profile, isInitializing, loading, adminId, user } = useAuth();
    const { isDark } = useTheme();

    // If loading or initializing, don't flash content (handled by root AppShell)
    if (isInitializing || loading) {
        return null;
    }

    // Double check protection: must be logged in, be an admin, and have no institution
    if (!session || profile?.role !== 'admin' || profile?.institution_id) {
        return <Redirect href="/(auth)/signIn" />;
    }

    const primaryColor = '#FF6B00'; // Requested Orange Theme
    const bgColor = isDark ? '#0F0B2E' : '#ffffff';
    const tabBgColor = isDark ? '#13103A' : '#f8fafc';
    const inactiveColor = isDark ? '#64748b' : '#94a3b8';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: tabBgColor,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                    paddingTop: 12,
                },
                tabBarActiveTintColor: primaryColor,
                tabBarInactiveTintColor: inactiveColor,
                sceneStyle: { backgroundColor: bgColor },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="institutions"
                options={{
                    title: 'Institutions',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="office-building-cog" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Notices',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="bell-ring" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="support"
                options={{
                    title: 'Support',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="headphones" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
};

export default MasterAdminLayout;
