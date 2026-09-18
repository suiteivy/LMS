import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { SettingsService, UserPreferences } from "@/services/SettingsService";
import { Award, Bell, ChevronRight, Globe, Lock, LucideIcon, Mail, Sparkles, User } from "lucide-react-native";
import React, { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-toast-message';
import { useLocalSearchParams } from "expo-router";
import { ProfileEdit } from "./ProfileEdit";
import { ChangePasswordModal } from "./shared/ChangePasswordModal";
import { HelpTooltip } from "./settings/HelpTooltip";
import { SettingsWithManual } from "./settings/SettingsWithManual";
import { ThemeSegmentedControl } from "./settings/ThemeSegmentedControl";

interface SettingRowProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    onPress?: () => void;
    isLast?: boolean;
    children?: ReactNode;
    isDark?: boolean;
}

interface StudentSettingsProps {
    role?: 'student' | 'parent';
}

export default function StudentSettings({ role = 'student' }: StudentSettingsProps) {
    const [showEditForm, setShowEditForm] = useState(false)
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const { isDark } = useTheme();
    const tier = useSubscriptionTier();
    const params = useLocalSearchParams<{ manual?: string; anchor?: string }>();
    const [activeTab, setActiveTab] = useState<'preferences' | 'manual'>(params.manual === '1' ? 'manual' : 'preferences');
    const defaultAnchor = role === 'parent' ? 'parent-workflow' : 'student-workflow';
    const [manualAnchor, setManualAnchor] = useState<string | undefined>(params.anchor || defaultAnchor);

    useEffect(() => {
        if (params.manual === '1') setActiveTab('manual');
        if (typeof params.anchor === 'string' && params.anchor.length > 0) setManualAnchor(params.anchor);
    }, [params.manual, params.anchor, defaultAnchor]);

    useEffect(() => {
        if (activeTab === 'manual' && !manualAnchor) {
            setManualAnchor(defaultAnchor);
        }
    }, [activeTab, manualAnchor, defaultAnchor]);

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
        grade_release_alerts: true,
        reduced_motion: false,
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
            Toast.show({ type: 'success', text1: 'Preferences Updated', text2: 'Your notification settings have been saved.', position: 'top' });
        } catch (err) {
            console.error('Failed to update preference:', err);
            setPrefs(prev => ({ ...prev, [key]: !newValue }));
            Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not save your preferences.' });
        }
    };

    const SettingRow = ({ icon: Icon, title, description, onPress, isLast, children, isDark }: SettingRowProps) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
        >
            <View className="flex-row items-center flex-1 mr-3">
                <View className="p-2 bg-gray-50 dark:bg-900 rounded-lg mr-3">
                    <Icon size={20} color="orange" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-700 dark:text-white font-medium text-base">{title}</Text>
                    {description ? (
                        <Text className="text-gray-400 dark:text-gray-400 text-xs mt-0.5">{description}</Text>
                    ) : null}
                </View>
            </View>
            {children ? children : <ChevronRight size={18} color={isDark ? "#4B5563" : "#9ca3af"} />}
        </TouchableOpacity>
    )


    const settingsContent = (
        <ScrollView className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                <Text className="text-xs font-bold text-gray-500 dark:text-white uppercase tracking-widest ml-1 mb-2">Account</Text>
                <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-lg border border-[#D0D7DE] dark:border-[#21262D] mb-6 overflow-hidden">
                    <TouchableOpacity
                        onPress={() => setShowEditForm(true)}
                    >
                        <SettingRow icon={User} title="Edit Profile" isDark={isDark}>
                            <HelpTooltip id="settings.profile.full_name" role={role} tier={tier} onLearnMore={openManual} />
                        </SettingRow>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowPasswordForm(true)}
                    >
                        <SettingRow icon={Lock} title="Change Password" isDark={isDark}>
                            <HelpTooltip id={role === 'parent' ? 'settings.password.parent' : 'settings.password.student'} role={role} tier={tier} onLearnMore={openManual} />
                        </SettingRow>
                    </TouchableOpacity>
                    <SettingRow icon={Globe} title="Language" isLast isDark={isDark}>
                        <HelpTooltip id={role === 'parent' ? 'settings.language.parent' : 'settings.language.student'} role={role} tier={tier} onLearnMore={openManual} />
                        <Text className="text-gray-500 dark:text-white mr-2">English</Text>
                    </SettingRow>
                </View>

                <Text className="text-xs font-bold text-gray-400 dark:text-white uppercase tracking-widest ml-1 mb-2">Preferences</Text>
                {prefsLoading ? (
                    <ActivityIndicator size="small" color="#FF6B00" style={{ marginBottom: 24 }} />
                ) : (
                    <View className="bg-white dark:bg-[#161B22] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
                        <SettingRow icon={Bell} title="Push Notifications" description="Device alerts for announcements and messages" isDark={isDark}>
                            <HelpTooltip id={role === 'parent' ? 'settings.notifications.general.parent' : 'settings.notifications.general.student'} role={role} tier={tier} onLearnMore={openManual} />
                            <Switch
                                value={prefs.push_notifications}
                                onValueChange={() => togglePref('push_notifications')}
                                trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#fed7aa" }}
                            />
                        </SettingRow>
                        <SettingRow icon={Award} title="Grade & Report Card Alerts" description="Immediate alerts when official report cards or grades are released" isDark={isDark}>
                            <Switch
                                value={prefs.grade_release_alerts !== false}
                                onValueChange={() => togglePref('grade_release_alerts')}
                                trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#fed7aa" }}
                            />
                        </SettingRow>
                        <SettingRow icon={Mail} title="Email Notifications" description="Receive announcements and academic summaries via email" isLast isDark={isDark}>
                            <Switch
                                value={prefs.email_notifications !== false}
                                onValueChange={() => togglePref('email_notifications')}
                                trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#fed7aa" }}
                            />
                        </SettingRow>
                    </View>
                )}

                <Text className="text-xs font-bold text-gray-400 dark:text-white uppercase tracking-widest ml-1 mb-2">Appearance & Accessibility</Text>
                <View className="bg-white dark:bg-[#161B22] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-4 overflow-hidden p-3">
                    <ThemeSegmentedControl />
                </View>
                <View className="bg-white dark:bg-[#161B22] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
                    <SettingRow icon={Sparkles} title="Reduced Motion" description="Minimize interface animations and transitions" isLast isDark={isDark}>
                        <Switch
                            value={!!prefs.reduced_motion}
                            onValueChange={() => togglePref('reduced_motion')}
                            trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#fed7aa" }}
                        />
                    </SettingRow>
                </View>

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
            role={role}
            tier={tier}
            initialTab={activeTab}
            initialManualAnchor={manualAnchor}
            settingsContent={settingsContent}
            onTabChange={handleTabChange}
        />
    );
}
