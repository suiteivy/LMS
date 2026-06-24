import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { SettingsService, UserPreferences } from "@/services/SettingsService";
import { Bell, ChevronRight, ClipboardCheck, Globe, Lock, LucideIcon, User } from "lucide-react-native";
import React, { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-toast-message';
import { useLocalSearchParams } from "expo-router";
import { ProfileEdit } from "./ProfileEdit";
import { ChangePasswordModal } from "./shared/ChangePasswordModal";
import { HelpTooltip } from "./settings/HelpTooltip";
import { SettingsWithManual } from "./settings/SettingsWithManual";

interface SettingRowProps {
    icon: LucideIcon;
    title: string;
    onPress?: () => void;
    isLast?: boolean;
    children?: ReactNode;
    isDark?: boolean;
}

export default function TeacherSettings() {
    const [showEditForm, setShowEditForm] = useState(false)
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const { isDark } = useTheme();
    const tier = useSubscriptionTier();
    const params = useLocalSearchParams<{ manual?: string; anchor?: string }>();
    const [activeTab, setActiveTab] = useState<'preferences' | 'manual'>(params.manual === '1' ? 'manual' : 'preferences');
    const [manualAnchor, setManualAnchor] = useState<string | undefined>(params.anchor);

    useEffect(() => {
        if (params.manual === '1') setActiveTab('manual');
        if (typeof params.anchor === 'string' && params.anchor.length > 0) setManualAnchor(params.anchor);
    }, [params.manual, params.anchor]);

    const openManual = (anchor?: string) => {
        if (anchor) setManualAnchor(anchor);
        setActiveTab('manual');
    };

    const handleTabChange = (tab: 'preferences' | 'manual') => {
        setActiveTab(tab);
    };

    // Notification preferences — loaded from and persisted to backend
    const [prefs, setPrefs] = useState<UserPreferences>({
        push_notifications: true,
        submission_alerts: true,
        system_alerts: true,
        email_notifications: true,
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
            setPrefs(prev => ({ ...prev, [key]: !newValue }));
            Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not save your preferences.' });
        }
    };

    const SettingRow = ({ icon: Icon, title, onPress, isLast, children, isDark }: SettingRowProps) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
        >
            <View className="flex-row items-center flex-1">
                <View className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg mr-3">
                    <Icon size={20} color="#FF6B00" />
                </View>
                <Text className="text-gray-700 dark:text-gray-200 font-medium text-base">{title}</Text>
            </View>
            {children ? children : <ChevronRight size={18} color={isDark ? "#4B5563" : "#9ca3af"} />}
        </TouchableOpacity>
    )

    const settingsContent = (
        <ScrollView className="flex-1 bg-gray-50 dark:bg-navy">
            <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2">Account</Text>
                <View className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
                    <TouchableOpacity
                        onPress={() => setShowEditForm(true)}
                    >
                        <SettingRow icon={User} title="Edit Profile" isDark={isDark}>
                            <HelpTooltip id="settings.profile.full_name" role="teacher" tier={tier} onLearnMore={openManual} />
                        </SettingRow>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowPasswordForm(true)}
                    >
                        <SettingRow icon={Lock} title="Change Password" isDark={isDark}>
                            <HelpTooltip id="settings.password" role="teacher" tier={tier} onLearnMore={openManual} />
                        </SettingRow>
                    </TouchableOpacity>
                    <SettingRow icon={Globe} title="Language" isLast isDark={isDark}>
                        <HelpTooltip id="settings.language" role="teacher" tier={tier} onLearnMore={openManual} />
                        <Text className="text-gray-400 dark:text-gray-500 mr-2">English</Text>
                    </SettingRow>
                </View>

                <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2">Teaching Preferences</Text>
                {prefsLoading ? (
                    <ActivityIndicator size="small" color="#FF6B00" style={{ marginBottom: 24 }} />
                ) : (
                    <View className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
                        <SettingRow icon={Bell} title="General Notifications" isDark={isDark}>
                            <HelpTooltip id="settings.notifications.general" role="teacher" tier={tier} onLearnMore={openManual} />
                            <Switch
                                value={prefs.push_notifications}
                                onValueChange={() => togglePref('push_notifications')}
                                trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#f97316" }}
                                thumbColor="#ffffff"
                            />
                        </SettingRow>
                        <SettingRow icon={ClipboardCheck} title="Submission Alerts" isLast isDark={isDark}>
                            <HelpTooltip id="settings.notifications.submission" role="teacher" tier={tier} onLearnMore={openManual} />
                            <Switch
                                value={prefs.submission_alerts}
                                onValueChange={() => togglePref('submission_alerts')}
                                trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#f97316" }}
                                thumbColor="#ffffff"
                            />
                        </SettingRow>
                    </View>
                )}

                <ProfileEdit
                    visible={showEditForm}
                    onClose={() => setShowEditForm(false)}
                />

                <ChangePasswordModal
                    visible={showPasswordForm}
                    onClose={() => setShowPasswordForm(false)}
                />
            </View>
        </ScrollView>
    );

    return (
        <SettingsWithManual
            role="teacher"
            tier={tier}
            initialTab={activeTab}
            initialManualAnchor={manualAnchor}
            settingsContent={settingsContent}
            onTabChange={handleTabChange}
        />
    )
}
