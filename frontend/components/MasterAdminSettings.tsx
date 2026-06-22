import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Lock, ShieldAlert, Bell, Mail, Smartphone, AlertTriangle, AlertCircle, HelpCircle } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import { ActivityIndicator, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Alert, Switch } from "react-native";
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ChangePasswordModal } from "./shared/ChangePasswordModal";
import { SettingsService, UserPreferences } from "@/services/SettingsService";

interface SettingRowProps {
    icon: any;
    title: string;
    onPress?: () => void;
    isLast?: boolean;
    rightElement?: React.ReactNode;
}

export default function MasterAdminSettings() {
    const { isDark } = useTheme();
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);

    // Enrollment State
    const [enrollModalVisible, setEnrollModalVisible] = useState(false);
    const [enrollData, setEnrollData] = useState({ full_name: "", email: "", password: "" });
    const [enrollLoading, setEnrollLoading] = useState(false);

    // Notification Preferences
    const [prefs, setPrefs] = useState<UserPreferences>({
        push_notifications: true,
        submission_alerts: true,
        system_alerts: true,
        email_notifications: true,
        subscription_alerts: true,
        issues_requests_alerts: true,
        support_cases_alerts: true,
    });
    const [prefsLoading, setPrefsLoading] = useState(true);

    useEffect(() => {
        const loadPrefs = async () => {
            try {
                const data = await SettingsService.getPreferences();
                setPrefs(data);
            } catch (err) {
                console.error('Failed to load preferences:', err);
            } finally {
                setPrefsLoading(false);
            }
        };
        loadPrefs();
    }, []);

    const togglePref = async (key: keyof UserPreferences) => {
        const newValue = !prefs[key];
        setPrefs(prev => ({ ...prev, [key]: newValue }));
        try {
            await SettingsService.updatePreferences({ [key]: newValue });
            Toast.show({ type: 'success', text1: 'Preferences Updated', text2: 'Your notification settings have been saved.', position: 'bottom' });
        } catch (err) {
            console.error('Failed to update preference:', err);
            // Revert on failure
            setPrefs(prev => ({ ...prev, [key]: !newValue }));
            Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not save your preferences.' });
        }
    };

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


    const handleEnrollMasterAdmin = async () => {
        if (!enrollData.full_name || !enrollData.email || !enrollData.password) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in all fields.' });
            return;
        }

        if (enrollData.password.length < 6) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Password must be at least 6 characters.' });
            return;
        }

        setEnrollLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/enroll-master-admin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(enrollData)
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Master Admin enrolled successfully.' });
                setEnrollModalVisible(false);
                setEnrollData({ full_name: "", email: "", password: "" });
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error || 'Failed to enroll master admin' });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to enroll master admin' });
        } finally {
            setEnrollLoading(false);
        }
    };

    const SettingRow = ({ icon: Icon, title, onPress, isLast, rightElement }: SettingRowProps) => (
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
            {rightElement ? rightElement : (onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textSecondary} /> : null)}
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

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginBottom: 8 }}>Notifications Configuration</Text>
                {prefsLoading ? (
                    <ActivityIndicator size="small" color={tokens.primary} style={{ marginBottom: 24 }} />
                ) : (
                    <View style={{ backgroundColor: tokens.surface, borderRadius: 16, borderWidth: 1, borderColor: tokens.border, marginBottom: 24, overflow: 'hidden' }}>
                        <SettingRow 
                            icon={AlertTriangle} 
                            title="System Alerts & Errors" 
                            rightElement={<Switch value={prefs.system_alerts} onValueChange={() => togglePref('system_alerts')} trackColor={{ false: tokens.border, true: tokens.primary }} />} 
                        />
                        <SettingRow 
                            icon={AlertCircle} 
                            title="Subscription Alerts" 
                            rightElement={<Switch value={prefs.subscription_alerts} onValueChange={() => togglePref('subscription_alerts')} trackColor={{ false: tokens.border, true: tokens.primary }} />} 
                        />
                        <SettingRow 
                            icon={Bell} 
                            title="Issues & Requests" 
                            rightElement={<Switch value={prefs.issues_requests_alerts} onValueChange={() => togglePref('issues_requests_alerts')} trackColor={{ false: tokens.border, true: tokens.primary }} />} 
                        />
                        <SettingRow 
                            icon={HelpCircle} 
                            title="Support Cases" 
                            rightElement={<Switch value={prefs.support_cases_alerts} onValueChange={() => togglePref('support_cases_alerts')} trackColor={{ false: tokens.border, true: tokens.primary }} />} 
                        />
                        <SettingRow 
                            icon={Mail} 
                            title="Email Notifications" 
                            rightElement={<Switch value={prefs.email_notifications} onValueChange={() => togglePref('email_notifications')} trackColor={{ false: tokens.border, true: tokens.primary }} />} 
                        />
                        <SettingRow 
                            icon={Smartphone} 
                            title="Push Notifications" 
                            isLast
                            rightElement={<Switch value={prefs.push_notifications} onValueChange={() => togglePref('push_notifications')} trackColor={{ false: tokens.border, true: tokens.primary }} />} 
                        />
                    </View>
                )}

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginBottom: 8 }}>Administration</Text>
                <View style={{ backgroundColor: tokens.surface, borderRadius: 16, borderWidth: 1, borderColor: tokens.border, marginBottom: 24, overflow: 'hidden' }}>
                    <SettingRow icon={ShieldAlert} title="Enroll New Master Admin" onPress={() => setEnrollModalVisible(true)} isLast />
                </View>

            </View>

            <ChangePasswordModal 
                visible={passwordModalVisible} 
                onClose={() => setPasswordModalVisible(false)} 
            />

            {/* Enroll Master Admin Modal */}
            <Modal visible={enrollModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: tokens.textPrimary }}>Enroll Master Admin</Text>
                            <TouchableOpacity onPress={() => setEnrollModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={tokens.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: tokens.textPrimary, fontWeight: '600', marginBottom: 8 }}>Full Name</Text>
                        <TextInput
                            style={{ backgroundColor: tokens.inputBg, color: tokens.textPrimary, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: tokens.inputBorder }}
                            placeholder="e.g. John Doe"
                            placeholderTextColor={tokens.textSecondary}
                            value={enrollData.full_name}
                            onChangeText={(text) => setEnrollData({ ...enrollData, full_name: text })}
                        />

                        <Text style={{ color: tokens.textPrimary, fontWeight: '600', marginBottom: 8 }}>Email Address</Text>
                        <TextInput
                            style={{ backgroundColor: tokens.inputBg, color: tokens.textPrimary, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: tokens.inputBorder }}
                            placeholder="admin@cloudora.com"
                            placeholderTextColor={tokens.textSecondary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={enrollData.email}
                            onChangeText={(text) => setEnrollData({ ...enrollData, email: text })}
                        />

                        <Text style={{ color: tokens.textPrimary, fontWeight: '600', marginBottom: 8 }}>Initial Password</Text>
                        <TextInput
                            style={{ backgroundColor: tokens.inputBg, color: tokens.textPrimary, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: tokens.inputBorder }}
                            secureTextEntry
                            placeholder="********"
                            placeholderTextColor={tokens.textSecondary}
                            value={enrollData.password}
                            onChangeText={(text) => setEnrollData({ ...enrollData, password: text })}
                        />

                        <TouchableOpacity
                            onPress={handleEnrollMasterAdmin}
                            disabled={enrollLoading}
                            style={{ backgroundColor: tokens.primary, padding: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        >
                            {enrollLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Enroll Admin</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}
