import { useTheme } from "@/contexts/ThemeContext";
import { Bell, ChevronRight, ClipboardCheck, Globe, LucideIcon, User } from "lucide-react-native";
import React, { ReactNode, useState } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { ProfileEdit } from "./ProfileEdit";
import { SettingsService } from "@/services/SettingsService";

interface SettingRowProps {
    icon: LucideIcon;
    title: string;
    onPress?: () => void;
    isLast?: boolean;
    children?: ReactNode;
    isDark?: boolean;
}

export default function TeacherSettings() {
    const [notifications, setNotifications] = useState(true)
    const [submissionAlerts, setSubmissionAlerts] = useState(true)
    const [showEditForm, setShowEditForm] = useState(false)
    const { isDark } = useTheme();

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

    return (
        <ScrollView className="flex-1 bg-gray-50 dark:bg-black">
            <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2">Account</Text>
                <View className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
                    <TouchableOpacity
                        onPress={() => setShowEditForm(true)}
                    >
                        <SettingRow icon={User} title="Edit Profile" isDark={isDark} />
                    </TouchableOpacity>
                    <SettingRow icon={Globe} title="Language" isLast isDark={isDark}>
                        <Text className="text-gray-400 dark:text-gray-500 mr-2">English</Text>
                    </SettingRow>
                </View>

                <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2">Teaching Preferences</Text>
                <View className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
                    <SettingRow icon={Bell} title="General Notifications" isDark={isDark}>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#f97316" }}
                            thumbColor="#ffffff"
                            disabled={loadingPrefs}
                        />
                    </SettingRow>
                    <SettingRow icon={ClipboardCheck} title="Submission Alerts" isLast isDark={isDark}>
                        <Switch
                            value={submissionAlerts}
                            onValueChange={setSubmissionAlerts}
                            trackColor={{ false: isDark ? "#374151" : "#e5e7eb", true: "#f97316" }}
                            thumbColor="#ffffff"
                            disabled={loadingPrefs}
                        />
                    </SettingRow>
                </View>

                <ProfileEdit
                    visible={showEditForm}
                    onClose={() => setShowEditForm(false)}
                />
            </View>
        </ScrollView>
    )
}
