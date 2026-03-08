import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Lock, ShieldAlert } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface SettingRowProps {
    icon: any;
    title: string;
    onPress?: () => void;
    isLast?: boolean;
}

export default function MasterAdminSettings() {
    const { isDark } = useTheme();
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const tokens = {
        bg: isDark ? "#0F0B2E" : "#f8fafc",
        surface: isDark ? "#13103A" : "#ffffff",
        border: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0",
        textPrimary: isDark ? "#ffffff" : "#0f172a",
        textSecondary: isDark ? "#94a3b8" : "#64748b",
        inputBg: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
        inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
        primary: "#FF6B00",
    };

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    }

    const handleChangePassword = async () => {
        if (!currentPassword || newPassword.length < 6) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'New password must be at least 6 chars.' });
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

    const SettingRow = ({ icon: Icon, title, onPress, isLast }: SettingRowProps) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: tokens.border
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ padding: 8, backgroundColor: isDark ? 'rgba(255,107,0,0.1)' : '#fff7ed', borderRadius: 8, marginRight: 12 }}>
                    <Icon size={20} color="#FF6B00" />
                </View>
                <Text style={{ color: tokens.textPrimary, fontWeight: '500', fontSize: 16 }}>{title}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }}>
            <View style={{ padding: 16, maxWidth: 768, marginHorizontal: "auto", width: "100%" }}>

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginBottom: 8 }}>Security</Text>
                <View style={{ backgroundColor: tokens.surface, borderRadius: 16, borderWidth: 1, borderColor: tokens.border, marginBottom: 24, overflow: 'hidden' }}>
                    <SettingRow icon={Lock} title="Change Password" onPress={() => setPasswordModalVisible(true)} />
                    <SettingRow icon={ShieldAlert} title="Two-Factor Authentication (Coming Soon)" isLast />
                </View>

            </View>

            <Modal visible={passwordModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: tokens.textPrimary }}>Change Password</Text>
                            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={tokens.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: tokens.textPrimary, fontWeight: '600', marginBottom: 8 }}>Current Password</Text>
                        <TextInput
                            style={{ backgroundColor: tokens.inputBg, color: tokens.textPrimary, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: tokens.inputBorder }}
                            secureTextEntry
                            placeholder="••••••••"
                            placeholderTextColor={tokens.textSecondary}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />

                        <Text style={{ color: tokens.textPrimary, fontWeight: '600', marginBottom: 8 }}>New Password</Text>
                        <TextInput
                            style={{ backgroundColor: tokens.inputBg, color: tokens.textPrimary, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: tokens.inputBorder }}
                            secureTextEntry
                            placeholder="••••••••"
                            placeholderTextColor={tokens.textSecondary}
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />

                        <TouchableOpacity
                            onPress={handleChangePassword}
                            disabled={loading}
                            style={{ backgroundColor: tokens.primary, padding: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Password</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}
