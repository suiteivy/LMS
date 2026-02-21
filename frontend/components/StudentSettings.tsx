import React, { useState, useEffect, ReactNode } from "react";
import { View, Text, TouchableOpacity, Switch, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { Bell, Lock, Globe, ChevronRight, User, LucideIcon } from "lucide-react-native";
import { ProfileEdit } from "./ProfileEdit";
import { SettingsService } from "@/services/SettingsService";

interface SettingRowProps {
    icon: LucideIcon;
    title: string;
    onPress?: () => void;
    isLast?: boolean;
    children?: ReactNode;
}

export default function StudentSettings() {
    const [notifications, setNotifications] = useState(true)
    const [showEditForm, setShowEditForm] = useState(false)
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loadingPrefs, setLoadingPrefs] = useState(true)
    const [savingPassword, setSavingPassword] = useState(false)

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const prefs = await SettingsService.getPreferences();
            setNotifications(prefs.push_notifications);
        } catch (e) {
            console.error('Error loading preferences:', e);
        } finally {
            setLoadingPrefs(false);
        }
    };

    const handleNotificationToggle = async (value: boolean) => {
        setNotifications(value);
        try {
            await SettingsService.updatePreferences({ push_notifications: value });
        } catch (e) {
            console.error('Error saving preference:', e);
            setNotifications(!value); // Revert on error
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            return Alert.alert('Error', 'Please fill in all fields');
        }
        if (newPassword.length < 6) {
            return Alert.alert('Error', 'New password must be at least 6 characters');
        }
        if (newPassword !== confirmPassword) {
            return Alert.alert('Error', 'Passwords do not match');
        }
        setSavingPassword(true);
        try {
            await SettingsService.changePassword(currentPassword, newPassword);
            Alert.alert('Success', 'Password changed successfully');
            setShowPasswordForm(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to change password');
        } finally {
            setSavingPassword(false);
        }
    };

    const SettingRow = ({ icon: Icon, title, onPress, isLast, children }: SettingRowProps) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
        >
            <View className="flex-row items-center flex-1">
                <View className="p-2 bg-gray-50 rounded-lg mr-3">
                    <Icon size={20} color="orange" />
                </View>
                <Text className="text-gray-700 font-medium text-base">{title}</Text>
            </View>
            {children ? children : <ChevronRight size={18} color="#9ca3af" />}
        </TouchableOpacity>
    )

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">
                <Text className="text-2xl font-bold text-gray-900 mb-6">Settings</Text>

                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2">Account</Text>
                <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                    <TouchableOpacity onPress={() => setShowEditForm(true)}>
                        <SettingRow icon={User} title="Edit Profile" />
                    </TouchableOpacity>
                    <SettingRow icon={Lock} title="Change Password" onPress={() => setShowPasswordForm(!showPasswordForm)} />
                    <SettingRow icon={Globe} title="Language" isLast >
                        <Text className="text-gray-400 mr-2">English</Text>
                    </SettingRow>
                </View>

                {showPasswordForm && (
                    <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-4">
                        <Text className="text-sm font-semibold text-gray-700 mb-3">Change Password</Text>
                        <TextInput
                            className="border border-gray-200 rounded-lg p-3 mb-3 text-gray-700"
                            placeholder="Current Password"
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />
                        <TextInput
                            className="border border-gray-200 rounded-lg p-3 mb-3 text-gray-700"
                            placeholder="New Password"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <TextInput
                            className="border border-gray-200 rounded-lg p-3 mb-3 text-gray-700"
                            placeholder="Confirm New Password"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <TouchableOpacity
                            onPress={handleChangePassword}
                            disabled={savingPassword}
                            className="bg-orange-500 rounded-lg p-3 items-center"
                        >
                            {savingPassword ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-semibold">Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2">Preferences</Text>
                <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                    <SettingRow icon={Bell} title="Push Notifications" isLast >
                        <Switch
                            value={notifications}
                            onValueChange={handleNotificationToggle}
                            trackColor={{ false: "#e5e7eb", true: "#fed7aa" }}
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
