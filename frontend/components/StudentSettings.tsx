import React, { useState, ReactNode } from "react";
import { View, Text, TouchableOpacity, Switch, ScrollView } from "react-native";
import { Bell, Lock, Eye, Globe, ChevronRight, User, LucideIcon } from "lucide-react-native";
import { ProfileEdit } from "./ProfileEdit";

interface SettingRowProps{
    icon: LucideIcon;
    title: string;
    onPress?: () => void;
    isLast?: boolean;
    children?: ReactNode;
}

export default function StudentSettings() {
    const [notifications, setNotifications] = useState(true)
    const [darkMode, setDarkMode] = useState(false)
    const [showEditForm, setShowEditForm] = useState(false)

    const SettingRow = ({icon: Icon, title, onPress, isLast, children}: SettingRowProps) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
        >
            <View className="flex-row items-center flex-1">
                <View className="p-2 bg-gray-50 rounded-lg mr-3">
                    <Icon size={20} color="#4b5563" />
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
                    <TouchableOpacity
                        onPress={()=> setShowEditForm(true)}
                    >
                        <SettingRow icon={User} title="Edit Profile" />
                    </TouchableOpacity>
                    <SettingRow icon={Globe} title="Language" isLast >
                        <Text className="text-gray-400 mr-2">English</Text>
                    </SettingRow>
                </View>

                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2">Preferences</Text>
                <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                    <SettingRow icon={Bell} title="Push Notifications" isLast >
                        <Switch 
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{false: "#e5e7eb", true: "#0d9488"}}
                            thumbColor="#ffffff"
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