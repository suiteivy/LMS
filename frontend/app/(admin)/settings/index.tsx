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

    const activeFeatures = [
        addonFinance && 'Finance',
        addonLibrary && 'Library',
        addonAnalytics && 'Analytics',
        addonMessaging && 'Messaging',
        addonBursary && 'Bursary',
    ].filter(Boolean).join(', ');

    const handleUpdateProfile = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            const { error } = await (supabase.from("users") as any)
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

                {/* Enhance Your Plan Card */}
                <Text className="text-lg font-bold text-gray-900 mb-3 px-1">Enhance Your Plan</Text>
                <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-orange-50 rounded-xl items-center justify-center mr-3">
                                <Zap size={20} color="#FF6B00" fill="#FF6B00" />
                            </View>
                            <View>
                                <Text className="text-gray-900 font-extrabold text-base">Enhance Your Plan</Text>
                                <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Get specialized modules</Text>
                            </View>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <Text className={`text-[10px] font-bold uppercase ${subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? 'text-green-600' : 'text-red-600'}`}>
                                {subscriptionStatus || 'Active'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-2xl mb-4">
                        <View>
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Current Base Plan</Text>
                            <Text className="text-gray-900 font-bold">
                                {subscriptionPlan === 'premium' ? 'PREMIUM' : subscriptionPlan === 'pro' ? 'PRO' : subscriptionPlan === 'basic' ? 'BASIC' : String(subscriptionPlan || 'TRIAL').toUpperCase()}
                            </Text>
                        </View>
                        <View className="h-8 w-[1px] bg-gray-200 mx-4" />
                        <View className="flex-1">
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Active Modules</Text>
                            <Text className="text-gray-900 text-[11px] font-bold" numberOfLines={1}>
                                {activeFeatures || "Core Modules Only"}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => setRequestModalVisible(true)}
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'row',
                            backgroundColor: '#FF6900',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 12,
                            gap: 8,
                            boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 8, color: 'rgba(255, 105, 0, 0.2)' }],
                            shadowColor: '#FF6900',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 4,
                        }}
                    >
                        <Zap size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Request Feature</Text>
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
