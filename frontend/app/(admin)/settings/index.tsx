import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { User, Phone, Mail, Shield, LogOut, ChevronRight, Save, Zap, Star } from "lucide-react-native";
import { showSuccess, showError } from "@/utils/toast";
import { AddonRequestModal } from "@/components/shared/SubscriptionComponents";
import { getPlanLabel } from "@/services/SubscriptionService";

export default function SettingsScreen() {
    const {
        profile,
        signOut,
        refreshProfile,
        subscriptionPlan,
        subscriptionStatus,
        addonMessaging,
        addonLibrary,
        addonFinance,
        addonAnalytics,
        addonBursary
    } = useAuth();

    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [requestModalVisible, setRequestModalVisible] = useState(false);

    const activeAddons = {
        library: addonLibrary,
        messaging: addonMessaging,
        finance: addonFinance,
        analytics: addonAnalytics,
        bursary: addonBursary,
    };

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
        signOut();
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
                            <User size={32} color="#FF6900" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">{profile?.full_name}</Text>
                            <Text className="text-gray-500 font-medium">{profile?.role?.toUpperCase()} Admin</Text>
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

                {/* Subscription & Features Section */}
                <Text className="text-lg font-bold text-gray-900 mb-3 px-1">Institution Plan</Text>
                <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center mr-3">
                                <Star size={24} color="#8B5CF6" />
                            </View>
                            <View>
                                <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Current Tier</Text>
                                <Text className="text-lg font-bold text-gray-900">{getPlanLabel(subscriptionPlan || 'trial')}</Text>
                            </View>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <Text className={`text-[10px] font-bold uppercase ${subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? 'text-green-600' : 'text-red-600'}`}>
                                {subscriptionStatus || 'Active'}
                            </Text>
                        </View>
                    </View>

                    <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                        <Text className="text-gray-900 font-bold text-sm mb-2">Active Add-on Features:</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {Object.values(activeAddons).some(v => v) ? (
                                Object.entries(activeAddons).map(([k, v]) => v && (
                                    <View key={k} className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm flex-row items-center">
                                        <Zap size={12} color="#FF6900" />
                                        <Text className="text-gray-700 text-xs font-bold ml-1 capitalize">{k}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text className="text-gray-400 text-xs italic">No additional features active yet.</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        className="bg-orange-500 py-4 rounded-2xl flex-row justify-center items-center shadow-md active:opacity-90"
                        onPress={() => setRequestModalVisible(true)}
                    >
                        <Zap size={20} color="white" fill="white" />
                        <Text className="text-white font-bold text-lg ml-2">Request Features</Text>
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
                    <Text className="text-gray-400 text-xs">LMS Admin v1.2.5</Text>
                </View>
            </View>

            <AddonRequestModal
                visible={requestModalVisible}
                onClose={() => setRequestModalVisible(false)}
                currentAddons={activeAddons}
            />
        </ScrollView>
    );
}
