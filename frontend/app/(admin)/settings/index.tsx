import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/libs/supabase";
import { User, Phone, Mail, Shield, LogOut, ChevronRight, Save, Zap, Star, Search } from "lucide-react-native";
import { showSuccess, showError } from "@/utils/toast";
import { AddonRequestModal } from "@/components/shared/SubscriptionComponents";
import { getPlanLabel } from "@/services/SubscriptionService";
import { api } from "@/services/api";

export default function SettingsScreen() {
    const {
        profile,
        signOut,
        refreshProfile,
        isMain,
        subscriptionPlan,
        subscriptionStatus,
        addonMessaging,
        addonLibrary,
        addonBursary
    } = useAuth();
    const { formatAmount } = useCurrency();

    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [subscriptionSnapshot, setSubscriptionSnapshot] = useState<any>(null);
    const [adminRows, setAdminRows] = useState<any[]>([]);
    const [adminsLoading, setAdminsLoading] = useState(false);
    const [delegatingUserId, setDelegatingUserId] = useState<string | null>(null);
    const [adminSearch, setAdminSearch] = useState('');
    const [delegationFilter, setDelegationFilter] = useState<'all' | 'granted' | 'not_granted'>('all');

    const activeAddons = {
        library: addonLibrary,
        messaging: addonMessaging,
        bursary: addonBursary,
    };

    const activeFeatures = [
        addonLibrary && 'Library',
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

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === "android") {
            url = url.replace("localhost", "10.0.2.2");
        }
        return url;
    };

    const fetchSubscriptionSnapshot = async () => {
        try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) return;

            const res = await fetch(`${getBackendUrl()}/api/settings/subscription-snapshot`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            const payload = await res.json();
            if (res.ok) {
                setSubscriptionSnapshot(payload);
            }
        } catch (e) {
            console.error('fetchSubscriptionSnapshot error:', e);
        }
    };

    const fetchAdminDelegationRows = async () => {
        try {
            setAdminsLoading(true);
            const response = await api.get('/auth/institution-admins');
            const admins = Array.isArray(response?.data?.admins) ? response.data.admins : [];
            const mapped = admins
                .map((row: any) => ({
                    user_id: row?.user_id,
                    full_name: row?.user?.full_name || `${row?.user?.first_name || ''} ${row?.user?.last_name || ''}`.trim() || 'Administrator',
                    email: row?.user?.email || '',
                    is_main: !!row?.is_main,
                    can_manage_users: !!row?.can_manage_users,
                }))
                .filter((row: any) => !!row.user_id);
            setAdminRows(mapped);
        } catch (err: any) {
            console.error('fetchAdminDelegationRows error:', err);
            showError('Failed', err?.message || 'Could not load admin delegation list');
        } finally {
            setAdminsLoading(false);
        }
    };

    const handleToggleDelegation = async (admin: any) => {
        if (!isMain || !admin?.user_id || admin?.is_main) {
            return;
        }

        const nextValue = !admin.can_manage_users;
        const actionText = nextValue ? 'grant' : 'revoke';

        Alert.alert(
            `${nextValue ? 'Grant' : 'Revoke'} Delegation`,
            `Are you sure you want to ${actionText} user-edit delegation for ${admin.full_name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: nextValue ? 'Grant' : 'Revoke',
                    style: nextValue ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            setDelegatingUserId(admin.user_id);
                            await api.put('/auth/admin-delegation', {
                                targetAdminUserId: admin.user_id,
                                canManageUsers: nextValue,
                            });
                            showSuccess('Updated', `Delegated edit rights ${nextValue ? 'granted' : 'revoked'} successfully`);
                            await fetchAdminDelegationRows();
                        } catch (err: any) {
                            console.error('handleToggleDelegation error:', err);
                            showError('Update failed', err?.response?.data?.error || err?.message || 'Could not update delegation rights');
                        } finally {
                            setDelegatingUserId(null);
                        }
                    },
                },
            ]
        );
    };

    const filteredAdmins = useMemo(() => {
        const needle = adminSearch.trim().toLowerCase();
        return adminRows.filter((row: any) => {
            const matchesSearch = !needle
                || String(row.full_name || '').toLowerCase().includes(needle)
                || String(row.email || '').toLowerCase().includes(needle);

            const matchesFilter = delegationFilter === 'all'
                ? true
                : delegationFilter === 'granted'
                    ? !!row.can_manage_users
                    : !row.can_manage_users;

            return matchesSearch && matchesFilter;
        });
    }, [adminRows, adminSearch, delegationFilter]);

    useEffect(() => {
        fetchSubscriptionSnapshot();
        if (isMain) {
            fetchAdminDelegationRows();
        }
    }, []);

    return (
        <ScrollView
            className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]"
            contentContainerStyle={{ paddingBottom: 40 }}
        >
            <View className="p-4 md:p-8">
                <Text className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">Settings</Text>

                {/* Profile Section */}
                <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-3xl p-6 mb-6">
                    <View className="flex-row items-center mb-6">
                        <View className="w-16 h-16 bg-orange-100 rounded-xl items-center justify-center mr-4">
                            <User size={32} color="#FF6900" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">{profile?.full_name}</Text>
                            <Text className="text-gray-500 font-medium">{profile?.role?.toUpperCase()} Admin</Text>
                        </View>
                    </View>

                    <Text className="text-gray-900 dark:text-white font-bold mb-4">Personal Information</Text>

                    <View className="space-y-4">
                        <View>
                            <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Full Name</Text>
                            <View className="flex-row items-center bg-[#FFFFFF] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl px-4 py-3">
                                <User size={18} color="#94a3b8" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900 dark:text-white font-medium"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        <View className="mt-4">
                            <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Phone Number</Text>
                            <View className="flex-row items-center bg-[#FFFFFF] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl px-4 py-3">
                                <Phone size={18} color="#94a3b8" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900 dark:text-white font-medium"
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Enter phone number"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View className="mt-4 opacity-70">
                            <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Email Address (Read-only)</Text>
                            <View className="flex-row items-center bg-[#E5E7EB] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#30363D] rounded-xl px-4 py-3">
                                <Mail size={18} color="#94a3b8" />
                                <Text className="flex-1 ml-3 text-gray-500 dark:text-white font-medium">{profile?.email}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        className={`mt-8 py-4 rounded-xl flex-row justify-center items-center shadow-sm ${loading ? 'bg-orange-300' : 'bg-orange-500'}`}
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
                <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3 px-1">Enhance Your Plan</Text>
                <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-3xl p-6 mb-6">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-orange-50 rounded-xl items-center justify-center mr-3">
                                <Zap size={20} color="#FF6B00" fill="#FF6B00" />
                            </View>
                            <View>
                                <Text className="text-gray-900 dark:text-white font-extrabold text-base">Enhance Your Plan</Text>
                                <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Get specialized modules</Text>
                            </View>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <Text className={`text-[10px] font-bold uppercase ${subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? 'text-green-600' : 'text-red-600'}`}>
                                {subscriptionStatus || 'Active'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between bg-[#FFFFFF] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] p-4 rounded-2xl mb-4">
                        <View>
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Current Base Plan</Text>
                            <Text className="text-gray-900 dark:text-white font-bold">
                                {subscriptionPlan === 'premium' ? 'PREMIUM' : subscriptionPlan === 'pro' ? 'PRO' : subscriptionPlan === 'basic' ? 'BASIC' : String(subscriptionPlan || 'TRIAL').toUpperCase()}
                            </Text>
                        </View>
                        <View className="h-8 w-[1px] bg-gray-200 dark:bg-[#161B22] mx-4" />
                        <View className="flex-1">
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Active Modules</Text>
                            <Text className="text-gray-900 dark:text-white text-[11px] font-bold" numberOfLines={1}>
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

                    {subscriptionSnapshot && (
                        <View className="mt-4 bg-[#FFFFFF] dark:bg-[#0D1117] border border-[#D0D7DE] dark:border-[#30363D] rounded-2xl p-4">
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Billing Reconciliation</Text>
                            <Text className="text-gray-900 dark:text-white text-xs font-semibold">
                                Expected: {formatAmount(Number(subscriptionSnapshot.expected_amount || 0))}  |  Paid: {formatAmount(Number(subscriptionSnapshot.paid_amount || 0))}
                            </Text>
                            {Number(subscriptionSnapshot.balance_due || 0) > 0 && (
                                <Text className="text-amber-700 dark:text-amber-300 text-xs font-bold mt-1">
                                    Balance Due: {formatAmount(Number(subscriptionSnapshot.balance_due || 0))}
                                </Text>
                            )}
                            {Number(subscriptionSnapshot.excess_amount || 0) > 0 && (
                                <Text className="text-green-700 dark:text-green-300 text-xs font-bold mt-1">
                                    Excess Payment: {formatAmount(Number(subscriptionSnapshot.excess_amount || 0))}
                                </Text>
                            )}
                            {Number(subscriptionSnapshot.balance_due || 0) === 0 && Number(subscriptionSnapshot.excess_amount || 0) === 0 && (
                                <Text className="text-green-700 dark:text-green-300 text-xs font-bold mt-1">Payment status is balanced.</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Account Actions */}
                <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3 px-1">Account</Text>
                <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-3xl overflow-hidden mb-6">
                    <TouchableOpacity className="flex-row items-center p-4 border-b border-[#D0D7DE] dark:border-[#21262D] active:bg-[#FFFFFF] dark:active:bg-[#0D1117]">
                        <View className="p-2 bg-blue-50 rounded-lg mr-3">
                            <Shield size={20} color="#3b82f6" />
                        </View>
                        <Text className="flex-1 text-gray-900 dark:text-white font-semibold">Security & Password</Text>
                        <ChevronRight size={20} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center p-4 active:bg-red-50 dark:active:bg-red-900/20"
                        onPress={handleLogout}
                    >
                        <View className="p-2 bg-red-50 rounded-lg mr-3">
                            <LogOut size={20} color="#ef4444" />
                        </View>
                        <Text className="flex-1 text-red-600 font-bold">Log Out</Text>
                        <ChevronRight size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                {isMain && (
                    <>
                        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3 px-1">Delegated Admin Rights</Text>
                        <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-3xl p-6 mb-6">
                            <Text className="text-gray-500 dark:text-gray-300 text-xs mb-4">
                                Manage which non-main admins can enroll or edit users.
                            </Text>

                            <View className="flex-row items-center bg-[#FFFFFF] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl px-4 py-3 mb-3">
                                <Search size={16} color="#94a3b8" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900 dark:text-white"
                                    placeholder="Search admin name or email"
                                    placeholderTextColor="#9ca3af"
                                    value={adminSearch}
                                    onChangeText={setAdminSearch}
                                />
                            </View>

                            <View className="flex-row mb-4">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'granted', label: 'Delegated' },
                                    { key: 'not_granted', label: 'Not Delegated' },
                                ].map((item) => (
                                    <TouchableOpacity
                                        key={item.key}
                                        onPress={() => setDelegationFilter(item.key as any)}
                                        className="mr-2 px-3 py-2 rounded-full"
                                        style={{ backgroundColor: delegationFilter === item.key ? '#FF6900' : '#E5E7EB' }}
                                    >
                                        <Text style={{ color: delegationFilter === item.key ? '#fff' : '#374151', fontSize: 12, fontWeight: '700' }}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {adminsLoading ? (
                                <View className="py-8 items-center">
                                    <ActivityIndicator color="#FF6900" />
                                </View>
                            ) : filteredAdmins.length === 0 ? (
                                <View className="py-8 items-center">
                                    <Text className="text-gray-500">No administrators match this filter.</Text>
                                </View>
                            ) : (
                                <View>
                                    {filteredAdmins.map((admin: any) => {
                                        const busy = delegatingUserId === admin.user_id;
                                        const actionDisabled = busy || admin.is_main;
                                        const actionLabel = admin.is_main
                                            ? 'Main Admin'
                                            : admin.can_manage_users
                                                ? 'Revoke'
                                                : 'Grant';

                                        return (
                                            <View key={admin.user_id} className="flex-row items-center justify-between py-3 border-b border-[#D0D7DE] dark:border-[#21262D]">
                                                <View className="flex-1 pr-3">
                                                    <Text className="text-gray-900 dark:text-white font-semibold" numberOfLines={1}>{admin.full_name}</Text>
                                                    <Text className="text-gray-500 text-xs" numberOfLines={1}>{admin.email}</Text>
                                                    <Text className={`text-xs mt-1 ${admin.can_manage_users ? 'text-green-600' : 'text-gray-500'}`}>
                                                        {admin.can_manage_users ? 'Delegated edit rights enabled' : 'Delegated edit rights disabled'}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    disabled={actionDisabled}
                                                    onPress={() => handleToggleDelegation(admin)}
                                                    className="px-3 py-2 rounded-xl"
                                                    style={{
                                                        backgroundColor: admin.is_main
                                                            ? '#E5E7EB'
                                                            : admin.can_manage_users
                                                                ? '#FEE2E2'
                                                                : '#DCFCE7',
                                                        opacity: actionDisabled ? 0.7 : 1,
                                                    }}
                                                >
                                                    <Text style={{
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                        color: admin.is_main
                                                            ? '#4B5563'
                                                            : admin.can_manage_users
                                                                ? '#991B1B'
                                                                : '#166534',
                                                    }}>
                                                        {busy ? 'Saving...' : actionLabel}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </>
                )}

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
