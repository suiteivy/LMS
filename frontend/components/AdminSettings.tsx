import {ProfileEdit} from "@/components/ProfileEdit";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { SettingsService, UserPreferences } from "@/services/SettingsService";
import { Bell, ChevronRight, Globe, Lock, LucideIcon, Shield, User } from "lucide-react-native";
import React, { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-toast-message';
import { useLocalSearchParams } from "expo-router";
import { ChangePasswordModal } from "./shared/ChangePasswordModal";
import { HelpTooltip } from "./settings/HelpTooltip";
import { SettingsWithManual } from "./settings/SettingsWithManual";

interface SettingRowProps {
    icon: LucideIcon;
    title: string;
    onPress?: () => void;
    isLast?: boolean;
    children?: ReactNode;
}

export default function AdminSettings() {
    const [showEditForm, setShowEditForm] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
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
        setPrefs((prev) => ({ ...prev, [key]: newValue }));
        try {
            await SettingsService.updatePreferences({ [key]: newValue });
            Toast.show({ type: 'success', text1: 'Preferences Updated', text2: 'Your notification settings have been saved.', position: 'bottom' });
        } catch (err) {
            console.error('Failed to update preference:', err);
            setPrefs((prev) => ({ ...prev, [key]: !newValue }));
            Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not save your preferences.' });
        }
    };

    const SettingRow = ({ icon: Icon, title, onPress, isLast, children }: SettingRowProps) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-[#D0D7DE] dark:border-[#21262D]' : ''}`}
        >
            <View className="flex-row items-center flex-1">
                <View className="p-2 bg-[#E5E7EB] dark:bg-[#21262D] rounded-xl mr-3">
                    <Icon size={20} color="#FF6B00" />
                </View>
                <Text className="text-gray-700 dark:text-gray-300 font-medium text-base">{title}</Text>
            </View>
            {children ? children : <ChevronRight size={18} color={isDark ? "#9ca3af" : "#9ca3af"} />}
        </TouchableOpacity>
    );


    const settingsContent = (
        <ScrollView className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1 mb-2">Account</Text>
                <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] mb-6 overflow-hidden">
                    <TouchableOpacity
                        onPress={() => setShowEditForm(true)}
                    >
                        <SettingRow icon={User} title="Edit Admin Profile" />
                    </TouchableOpacity>
                    <SettingRow icon={Lock} title="Change Password" onPress={() => setShowPasswordForm(true)} />
                    <SettingRow icon={Globe} title="Language" isLast >
                        <Text className="text-gray-500 dark:text-gray-400 mr-2">English</Text>
                    </SettingRow>
                </View>

                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1 mb-2">Configurations</Text>
                <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] mb-6 overflow-hidden">
                    <SettingRow icon={Bell} title="System Notifications">
                        <Switch
                            value={prefs.push_notifications}
                            onValueChange={() => togglePref('push_notifications')}
                            trackColor={{ false: isDark ? "#21262D" : "#D0D7DE", true: "#FF6900" }}
                            thumbColor="#fd6900"
                            disabled={prefsLoading}
                        />
                    </SettingRow>
                    <SettingRow icon={Shield} title="Admin Priority Alerts" isLast>
                        <Switch
                            value={prefs.system_alerts}
                            onValueChange={() => togglePref('system_alerts')}
                            trackColor={{ false: isDark ? "#21262D" : "#D0D7DE", true: "#FF6900" }}
                            thumbColor="#fd6900"
                            disabled={prefsLoading}
                        />
                    </SettingRow>
                </View>

                <ProfileEdit visible={showEditForm} onClose={() => setShowEditForm(false)} />
                <ChangePasswordModal visible={showPasswordForm} onClose={() => setShowPasswordForm(false)} />
            </View>
        </ScrollView>
    );

    return (
        <SettingsWithManual
            role="admin"
            tier={tier}
            initialTab={activeTab}
            initialManualAnchor={manualAnchor}
            settingsContent={settingsContent}
            onTabChange={handleTabChange}
        />
    );
}
