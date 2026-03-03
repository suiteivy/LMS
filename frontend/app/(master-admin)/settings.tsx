import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';

export default function MasterSettings() {
    const { isDark, setTheme } = useTheme();
    const { profile, logout } = useAuth();

    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [profileModalVisible, setProfileModalVisible] = useState(false);

    // Auth State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Profile State
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');

    useEffect(() => {
        if (profile) {
            setEditName(profile.full_name || '');
            setEditPhone(profile.phone || '');
        }
    }, [profile]);

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00',
        danger: '#ef4444'
    };

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    }

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to log out?")) {
                logout();
            }
        } else {
            Alert.alert("Log Out", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: logout }
            ]);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editName) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name is required.' });
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ full_name: editName, phone: editPhone })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
                setProfileModalVisible(false);
                // Note: AuthContext doesn't typically auto-fetch after direct DB updates.
                // Normally a global app reload or pulling fresh session triggers the header update.
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || newPassword.length < 6) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please provide valid passwords. New password must be at least 6 chars.' });
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Password updated successfully' });
                setPasswordModalVisible(false);
                setCurrentPassword('');
                setNewPassword('');
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                    <View style={{ backgroundColor: `${themeColors.primary}20`, padding: 8, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="cog-outline" size={24} color={themeColors.primary} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>Global Settings</Text>
                        <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>Platform administrative controls</Text>
                    </View>
                </View>

                {/* Profile Info */}
                <View style={{ backgroundColor: themeColors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: themeColors.border, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${themeColors.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="shield-account" size={32} color={themeColors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.text }}>{profile?.full_name}</Text>
                            <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>{profile?.email}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                                <View style={{ backgroundColor: `${themeColors.primary}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ color: themeColors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>Master Admin</Text>
                                </View>
                                <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: themeColors.border }}>
                                    <Text style={{ color: themeColors.text, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Edit Profile</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Settings */}
                <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, marginBottom: 16, marginTop: 8 }}>Preferences</Text>

                <TouchableOpacity
                    onPress={() => setTheme(isDark ? 'light' : 'dark')}
                    style={{ backgroundColor: themeColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: themeColors.border, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <MaterialCommunityIcons name={isDark ? "weather-night" : "white-balance-sunny"} size={22} color={themeColors.text} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: themeColors.text }}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
                    </View>
                    <MaterialCommunityIcons name="theme-light-dark" size={20} color={themeColors.subtext} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setPasswordModalVisible(true)}
                    style={{ backgroundColor: themeColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: themeColors.border, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <MaterialCommunityIcons name="lock-reset" size={22} color={themeColors.text} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: themeColors.text }}>Change Password</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.subtext} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleLogout}
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    <MaterialCommunityIcons name="logout" size={20} color={themeColors.danger} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.danger }}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Profile Edit Modal */}
            <Modal visible={profileModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: themeColors.text }}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8 }}>Full Name</Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: themeColors.text, borderRadius: 12, padding: 14, marginBottom: 16 }}
                            placeholder="John Doe"
                            placeholderTextColor={themeColors.subtext}
                            value={editName}
                            onChangeText={setEditName}
                        />

                        <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8 }}>Phone Number (Optional)</Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: themeColors.text, borderRadius: 12, padding: 14, marginBottom: 24 }}
                            placeholder="+123456789"
                            placeholderTextColor={themeColors.subtext}
                            keyboardType="phone-pad"
                            value={editPhone}
                            onChangeText={setEditPhone}
                        />

                        <TouchableOpacity
                            onPress={handleUpdateProfile}
                            disabled={loading}
                            style={{ backgroundColor: themeColors.primary, padding: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal visible={passwordModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: themeColors.text }}>Change Password</Text>
                            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8 }}>Current Password</Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: themeColors.text, borderRadius: 12, padding: 14, marginBottom: 16 }}
                            secureTextEntry
                            placeholder="••••••••"
                            placeholderTextColor={themeColors.subtext}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />

                        <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8 }}>New Password</Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: themeColors.text, borderRadius: 12, padding: 14, marginBottom: 24 }}
                            secureTextEntry
                            placeholder="••••••••"
                            placeholderTextColor={themeColors.subtext}
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />

                        <TouchableOpacity
                            onPress={handleChangePassword}
                            disabled={loading}
                            style={{ backgroundColor: themeColors.primary, padding: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Password</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}
