import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { User, Phone, Mail, Shield, LogOut, ChevronRight, Save } from "lucide-react-native";
import { showSuccess, showError } from "@/utils/toast";

export default function SettingsScreen() {
    const { profile, signOut, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");

    const handleUpdateProfile = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("users")
                .update({
                    full_name: fullName,
                    phone: phone,
                })
                .eq("id", profile.id);

            if (error) throw error;

            await refreshProfile();
            showSuccess("Success", "Profile updated successfully");
        } catch (error: any) {
            console.error("Error updating profile:", error);
            showError("Update Failed", error.message || "Could not update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: () => signOut() }
            ]
        );
    };

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            contentContainerStyle={{ paddingBottom: 40 }}
        >
            <View className="p-6">
                <Text className="text-3xl font-extrabold text-gray-900 mb-6">Settings</Text>

                {/* Profile Section */}
                <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
                    <View className="flex-row items-center mb-6">
                        <View className="w-16 h-16 bg-orange-100 rounded-2xl items-center justify-center mr-4">
                            <User size={32} color="#FF6B00" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">{profile?.full_name}</Text>
                            <Text className="text-gray-500 font-medium">{profile?.role?.toUpperCase()} | {profile?.id.slice(0, 8)}...</Text>
                        </View>
                    </View>

                    <Text className="text-gray-900 font-bold mb-4">Personal Information</Text>

                    <View className="space-y-4">
                        <View>
                            <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Full Name</Text>
                            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                <User size={18} color="#94a3b8" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900 font-medium"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Enter full name"
                                />
                            </View>
                        </View>

                        <View className="mt-4">
                            <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Phone Number</Text>
                            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                <Phone size={18} color="#94a3b8" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900 font-medium"
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View className="mt-4 opacity-70">
                            <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Email Address (Read-only)</Text>
                            <View className="flex-row items-center bg-gray-100 border border-gray-200 rounded-xl px-4 py-3">
                                <Mail size={18} color="#94a3b8" />
                                <Text className="flex-1 ml-3 text-gray-500 font-medium">{profile?.email}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        className={`mt-8 py-4 rounded-2xl flex-row justify-center items-center shadow-sm ${loading ? 'bg-orange-300' : 'bg-orange-500'}`}
                        onPress={handleUpdateProfile}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Save size={20} color="white" />
                                <Text className="text-white font-bold text-lg ml-2">Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Account Actions */}
                <Text className="text-lg font-bold text-gray-900 mb-3 px-1">Account</Text>

                <View className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                    <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50">
                        <View className="p-2 bg-blue-50 rounded-lg mr-3">
                            <Shield size={20} color="#3b82f6" />
                        </View>
                        <Text className="flex-1 text-gray-700 font-semibold">Security & Password</Text>
                        <ChevronRight size={20} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center p-4 active:bg-red-50"
                        onPress={handleLogout}
                    >
                        <View className="p-2 bg-red-50 rounded-lg mr-3">
                            <LogOut size={20} color="#ef4444" />
                        </View>
                        <Text className="flex-1 text-red-600 font-bold">Log Out</Text>
                        <ChevronRight size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                {/* Version Info */}
                <View className="mt-8 items-center">
                    <Text className="text-gray-400 text-xs">LMS Admin v1.2.0</Text>
                </View>
            </View>
        </ScrollView>
    );
}
