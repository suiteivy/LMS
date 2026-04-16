import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { SettingsService } from '@/services/SettingsService';

export default function MasterInstitutions() {
    const { isDark } = useTheme();
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'institutions' | 'requests'>('institutions');
    const [addonRequests, setAddonRequests] = useState<any[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);

    // Modals state
    const [freeModalVisible, setFreeModalVisible] = useState(false);
    const [selectedInstId, setSelectedInstId] = useState<string | null>(null);

    // Addons State
    const [addonsModalVisible, setAddonsModalVisible] = useState(false);
    const [addonsForm, setAddonsForm] = useState({
        addon_library: false,
        addon_messaging: false,
        addon_diary: false,
        addon_bursary: false,     // Bursary is its own add-on (separate from finance)
        addon_finance: false,
        addon_analytics: false,
        custom_student_limit: null as number | null
    });
    const [addonsLoading, setAddonsLoading] = useState(false);

    // Analytics state
    const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Admin management state
    const [adminModalVisible, setAdminModalVisible] = useState(false);
    const [selectedInstAdmins, setSelectedInstAdmins] = useState<any[]>([]);
    const [adminLoading, setAdminLoading] = useState(false);

    // Saving state (used in handleResetAdminPassword & handleRemoveAdmin)
    const [saving, setSaving] = useState(false);

    // Enrollment State
    const [enrollModalVisible, setEnrollModalVisible] = useState(false);
    const [enrollForm, setEnrollForm] = useState({
        institution_name: '',
        location: '',
        admin_full_name: '',
        admin_email: '',
        admin_password: '',
        subscription_plan: '',
        subscription_status: '',
        trial_end_date: '',
        custom_student_limit: '',
        email_domain: ''
    });
    const [enrollLoading, setEnrollLoading] = useState(false);

    // Free Form State
    const [freeDays, setFreeDays] = useState('30');
    const [isSubmitting, setIsSubmitting] = useState(false); // This is for the free modal submission

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00'
    };

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    };

    const fetchInstitutions = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/institutions`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            if (res.ok) {
                setInstitutions(data.institutions || []);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: "Failed to fetch institutions" });
        } finally {
            setLoading(false);
        }
    };

    const fetchAddonRequests = async () => {
        try {
            setRequestsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/addon-requests`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            if (res.ok) {
                setAddonRequests(data.requests || []);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: "Failed to fetch requests" });
        } finally {
            setRequestsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'institutions') {
            fetchInstitutions();
        } else {
            fetchAddonRequests();
        }
    }, [activeTab]);

    const toggleSubscription = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const msg = nextStatus === 'active'
            ? "Are you sure you want to enable this institution?"
            : "Are you sure you want to disable this institution? They will instantly lose access.";

        if (Platform.OS === 'web') {
            if (window.confirm(msg)) performToggle(id, nextStatus);
        } else {
            Alert.alert("Confirm Action", msg, [
                { text: "Cancel", style: "cancel" },
                { text: nextStatus === 'active' ? "Enable" : "Disable", style: nextStatus === 'active' ? "default" : "destructive", onPress: () => performToggle(id, nextStatus) }
            ]);
        }
    };

    const performToggle = async (id: string, nextStatus: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/institutions/${id}/subscription`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subscription_status: nextStatus })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Subscription status updated' });
                setInstitutions(institutions.map(i => i.id === id ? { ...i, subscription_status: nextStatus } : i));
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEnroll = async () => {
        if (!enrollForm.institution_name || !enrollForm.admin_email || !enrollForm.admin_password || !enrollForm.admin_full_name) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all required fields.' });
            return;
        }

        try {
            setEnrollLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const payload = { ...enrollForm };
            if (payload.subscription_plan === 'beta_free' && !payload.trial_end_date) {
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + 30); // Default to 30 days if empty
                payload.trial_end_date = expirationDate.toISOString();
            }

            const res = await fetch(`${getBackendUrl()}/api/master-admin/institutions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Institution enrolled successfully' });
                setEnrollModalVisible(false);
                setEnrollForm({
                    institution_name: '', 
                    location: '', 
                    admin_full_name: '', 
                    admin_email: '', 
                    admin_password: '', 
                    subscription_plan: 'trial', 
                    subscription_status: 'trial', 
                    trial_end_date: '', 
                    custom_student_limit: '',
                    email_domain: '',
                });
                fetchInstitutions(); // Refresh the list
            } else {
                Toast.show({ type: 'error', text1: 'Failed', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Network error during enrollment' });
        } finally {
            setEnrollLoading(false);
        }
    };

    const handleGrantFreeAccess = async () => {
        if (!selectedInstId || !freeDays) return;

        try {
            setIsSubmitting(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Calculate expiration date
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + parseInt(freeDays, 10));

            const res = await fetch(`${getBackendUrl()}/api/master-admin/institutions/${selectedInstId}/subscription`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription_status: 'active',
                    subscription_plan: 'free',
                    trial_end_date: expDate.toISOString()
                })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Free Access Granted', text2: `Free access granted for ${freeDays} days.` });
                setFreeModalVisible(false);
                fetchInstitutions(); // refresh list to show updated plan
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to grant free access' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveAddons = async () => {
        if (!selectedInstId) return;

        try {
            setAddonsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/institutions/${selectedInstId}/subscription`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...addonsForm,
                    // Ensure custom_student_limit is handled as a number or null
                    custom_student_limit: addonsForm.custom_student_limit ? parseInt(addonsForm.custom_student_limit.toString(), 10) : null
                })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Addons updated successfully.' });
                setAddonsModalVisible(false);
                fetchInstitutions();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update addons' });
        } finally {
            setAddonsLoading(false);
        }
    };

    const handleUpdateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/addon-requests/${requestId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({
                    type: 'success',
                    text1: status === 'approved' ? 'Request Approved' : 'Request Rejected',
                    text2: data.message
                });
                fetchAddonRequests();
                if (status === 'approved') fetchInstitutions();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update request' });
        }
    };

    const handleViewAnalytics = async (id: string) => {
        try {
            setSelectedInstId(id);
            setAnalyticsModalVisible(true);
            setAnalyticsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/analytics/${id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            if (res.ok) {
                setAnalyticsData(data);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch analytics' });
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleManageAdmins = async (id: string) => {
        try {
            setSelectedInstId(id);
            setAdminModalVisible(true);
            setAdminLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/institutions/${id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            if (res.ok) {
                setSelectedInstAdmins(data.admins || []);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch admins' });
        } finally {
            setAdminLoading(false);
        }
    };

    const handleResetAdminPassword = (userId: string, userName: string) => {
        const handler = async (pass: string) => {
            if (!pass || pass.length < 6) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Password must be at least 6 characters' });
                return;
            }
            try {
                setSaving(true);
                await SettingsService.adminResetPassword(userId, pass);
                Toast.show({ type: 'success', text1: 'Success', text2: `Password for ${userName} reset successfully` });
            } catch (err: any) {
                Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Failed to reset password' });
            } finally {
                setSaving(false);
            }
        };

        if (Platform.OS === 'web') {
            const pass = window.prompt(`Enter new password for ${userName}:`);
            if (pass) handler(pass);
        } else {
            Alert.prompt(
                "Reset Password",
                `Enter new password for ${userName}:`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Reset", onPress: (pass?: string) => pass && handler(pass) }
                ],
                "plain-text"
            );
        }
    };

    const handleRemoveAdmin = (userId: string, userName: string) => {
        const performRemoval = async () => {
            try {
                setSaving(true);
                await SettingsService.adminRemove(userId);
                Toast.show({ type: 'success', text1: 'Success', text2: `Admin ${userName} removed successfully` });
                
                // Refresh list
                if (selectedInstId) {
                    handleManageAdmins(selectedInstId);
                }
            } catch (err: any) {
                // api.ts already shows a toast, but we can add secondary handling here if needed.
                // However, the user specifically asked to ensure this is a toast.
                const msg = err?.message || 'Failed to remove admin';
                Toast.show({ 
                    type: 'error', 
                    text1: 'Management Error', 
                    text2: msg,
                    visibilityTime: 4000
                });
            } finally {
                setSaving(false);
            }
        };

        const msg = `Are you sure you want to remove ${userName}? This will permanently delete their account and access.`;
        
        if (Platform.OS === 'web') {
            if (window.confirm(msg)) performRemoval();
        } else {
            Alert.alert(
                "Remove Administrator",
                msg,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: performRemoval }
                ]
            );
        }
    };

    const renderRequestItem = ({ item }: { item: any }) => {
        const isPending = item.status === 'pending';
        const date = new Date(item.created_at).toLocaleDateString();

        return (
            <View style={{
                backgroundColor: themeColors.card,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: themeColors.border,
                marginBottom: 12,
                ...(Platform.OS === 'ios' ? {
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
                } : { elevation: 2 })
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text }}>
                            {item.institutions?.name}
                        </Text>
                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginTop: 2 }}>
                            Requested by: {item.users?.full_name} • {date}
                        </Text>
                    </View>
                    <View style={{
                        backgroundColor: item.status === 'pending' ? '#FEF3C7' : (item.status === 'approved' ? '#D1FAE5' : '#FEE2E2'),
                        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6
                    }}>
                        <Text style={{
                            color: item.status === 'pending' ? '#92400E' : (item.status === 'approved' ? '#065F46' : '#991B1B'),
                            fontSize: 10, fontWeight: '800', textTransform: 'uppercase'
                        }}>{item.status}</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${themeColors.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <MaterialCommunityIcons name="puzzle" size={20} color={themeColors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 14 }}>
                            {item.addon_type.charAt(0).toUpperCase() + item.addon_type.slice(1)} Module
                        </Text>
                        {item.notes && (
                            <Text style={{ color: themeColors.subtext, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                                {item.notes}
                            </Text>
                        )}
                    </View>
                </View>

                {isPending && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    if (window.confirm("Are you sure you want to reject this request?")) {
                                        handleUpdateRequestStatus(item.id, 'rejected');
                                    }
                                } else {
                                    Alert.alert("Reject Request", "Are you sure you want to reject this request?", [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Reject", style: "destructive", onPress: () => handleUpdateRequestStatus(item.id, 'rejected') }
                                    ]);
                                }
                            }}
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2', alignItems: 'center', backgroundColor: '#fef2f2' }}
                        >
                            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const msg = `Grant ${item.addon_type} access to ${item.institutions?.name}?`;
                                if (Platform.OS === 'web') {
                                    if (window.confirm(msg)) {
                                        handleUpdateRequestStatus(item.id, 'approved');
                                    }
                                } else {
                                    Alert.alert("Approve Request", msg, [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Approve", style: "default", onPress: () => handleUpdateRequestStatus(item.id, 'approved') }
                                    ]);
                                }
                            }}
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#10b981' }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const isActive = item.subscription_status === 'active';
        const userCount = item.users?.[0]?.count || 0;

        return (
            <View style={{
                backgroundColor: themeColors.card,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: themeColors.border,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                ...(Platform.OS === 'ios' ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                } : { elevation: 2 })
            }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, marginBottom: 4 }}>
                        {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialCommunityIcons name="email-outline" size={14} color={themeColors.subtext} />
                            <Text style={{ color: themeColors.subtext, fontSize: 13 }}>{item.email || 'No email'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialCommunityIcons name="account-group" size={14} color={themeColors.subtext} />
                            <Text style={{ color: themeColors.subtext, fontSize: 13 }}>{userCount} Users</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialCommunityIcons name={isActive ? 'check-circle' : 'close-circle'} size={14} color={isActive ? '#10b981' : '#f43f5e'} />
                            <Text style={{ color: isActive ? '#10b981' : '#f43f5e', fontSize: 13, fontWeight: '600' }}>{item.subscription_status?.toUpperCase() || 'UNKNOWN'}</Text>
                        </View>
                        {item.subscription_plan && (
                            <View style={{ backgroundColor: `${themeColors.primary}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: themeColors.primary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{item.subscription_plan}</Text>
                            </View>
                        )}
                    </View>

                    {/* Access & Addons Buttons */}
                    <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedInstId(item.id);
                                setFreeModalVisible(true);
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                            <MaterialCommunityIcons name="star-circle-outline" size={16} color={themeColors.primary} />
                            <Text style={{ color: themeColors.primary, fontSize: 13, fontWeight: '600' }}>Grant Free Access</Text>
                        </TouchableOpacity>

                        {/* Manage Add-ons: visible for all paid plans */}
                        {!['trial', 'free', null, undefined].includes(item.subscription_plan) && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedInstId(item.id);
                                    setAddonsForm({
                                        addon_library: item.addon_library || false,
                                        addon_messaging: item.addon_messaging || false,
                                        addon_diary: item.addon_diary || false,
                                        addon_bursary: item.addon_bursary || false,
                                        addon_finance: item.addon_finance || false,
                                        addon_analytics: item.addon_analytics || false,
                                        custom_student_limit: item.custom_student_limit || null
                                    });
                                    setAddonsModalVisible(true);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            >
                                <MaterialCommunityIcons name="puzzle-plus-outline" size={16} color="#3B82F6" />
                                <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>Manage Add-ons</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => toggleSubscription(item.id, item.subscription_status)}
                    style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: isActive ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                        justifyContent: 'center', alignItems: 'center',
                        marginLeft: 16
                    }}
                >
                    <MaterialCommunityIcons
                        name={isActive ? 'power-plug-off' : 'power-plug'}
                        size={24}
                        color={isActive ? '#f43f5e' : '#10b981'}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ backgroundColor: `${themeColors.primary}20`, padding: 8, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="office-building-cog" size={24} color={themeColors.primary} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>Institutions</Text>
                        <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>Manage accounts & subscriptions</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={activeTab === 'institutions' ? fetchInstitutions : fetchAddonRequests}>
                    <MaterialCommunityIcons name="refresh" size={24} color={themeColors.text} />
                </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 12, padding: 4 }}>
                <TouchableOpacity
                    onPress={() => setActiveTab('institutions')}
                    style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === 'institutions' ? themeColors.card : 'transparent', borderRadius: 8 }}
                >
                    <Text style={{ color: activeTab === 'institutions' ? themeColors.primary : themeColors.subtext, fontWeight: '700' }}>Institutions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('requests')}
                    style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === 'requests' ? themeColors.card : 'transparent', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                >
                    <Text style={{ color: activeTab === 'requests' ? themeColors.primary : themeColors.subtext, fontWeight: '700' }}>Feature Requests</Text>
                    {addonRequests.filter(r => r.status === 'pending').length > 0 && (
                        <View style={{ backgroundColor: '#ef4444', height: 18, minWidth: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{addonRequests.filter(r => r.status === 'pending').length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {activeTab === 'institutions' ? (
                loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={institutions}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                        ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <MaterialCommunityIcons name="domain-off" size={48} color={themeColors.border} />
                                <Text style={{ color: themeColors.subtext, marginTop: 16, fontSize: 16 }}>No institutions found.</Text>
                            </View>
                        }
                    />
                )
            ) : (
                requestsLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={addonRequests}
                        keyExtractor={item => item.id}
                        renderItem={renderRequestItem}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={themeColors.border} />
                                <Text style={{ color: themeColors.subtext, marginTop: 16, fontSize: 16 }}>No feature requests yet.</Text>
                            </View>
                        }
                    />
                )
            )}

            {/* Enroll Floating Action Button */}
            <TouchableOpacity
                onPress={() => setEnrollModalVisible(true)}
                style={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: themeColors.primary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 5,
                    shadowColor: themeColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                }}
            >
                <MaterialCommunityIcons name="plus" size={30} color="#fff" />
            </TouchableOpacity>

            {/* ANALYTICS MODAL */}
            <Modal visible={analyticsModalVisible} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text }}>Institution Stats</Text>
                            <TouchableOpacity onPress={() => { setAnalyticsModalVisible(false); setAnalyticsData(null); }}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {analyticsLoading ? (
                            <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: 40 }} />
                        ) : analyticsData ? (
                            <View style={{ gap: 16 }}>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginBottom: 4 }}>Students</Text>
                                        <Text style={{ color: themeColors.text, fontSize: 24, fontWeight: '800' }}>{analyticsData.students}</Text>
                                    </View>
                                    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginBottom: 4 }}>Teachers</Text>
                                        <Text style={{ color: themeColors.text, fontSize: 24, fontWeight: '800' }}>{analyticsData.teachers}</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginBottom: 4 }}>Classes</Text>
                                        <Text style={{ color: themeColors.text, fontSize: 24, fontWeight: '800' }}>{analyticsData.classes}</Text>
                                    </View>
                                    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginBottom: 4 }}>Revenue</Text>
                                        <Text style={{ color: themeColors.primary, fontSize: 20, fontWeight: '800' }}>KES {Number(analyticsData.revenue).toLocaleString()}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => { setAnalyticsModalVisible(false); setAnalyticsData(null); }}
                                    style={{ backgroundColor: themeColors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 }}
                                >
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={{ color: themeColors.subtext, textAlign: 'center', marginVertical: 20 }}>No data available</Text>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ENROLL MODAL */}
            <Modal visible={enrollModalVisible} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text }}>Enroll Institution</Text>
                            <TouchableOpacity onPress={() => setEnrollModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 5 }}>

                            {/* Section: Institution */}
                            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: themeColors.subtext, marginBottom: 10 }}>
                                Institution details
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                <View style={{ flex: 2 }}>
                                    <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Name <Text style={{ color: themeColors.primary }}>*</Text></Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                        placeholder="Alliance Highschool"
                                        placeholderTextColor={themeColors.subtext}
                                        value={enrollForm.institution_name}
                                        onChangeText={t => setEnrollForm(prev => ({ ...prev, institution_name: t }))}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Location</Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                        placeholder="Nairobi"
                                        placeholderTextColor={themeColors.subtext}
                                        value={enrollForm.location}
                                        onChangeText={t => setEnrollForm(prev => ({ ...prev, location: t }))}
                                    />
                                </View>
                            </View>
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Email domain</Text>
                                <TextInput
                                    style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                    placeholder="e.g. alliance.edu"
                                    placeholderTextColor={themeColors.subtext}
                                    autoCapitalize="none"
                                    value={enrollForm.email_domain}
                                    onChangeText={t => setEnrollForm(prev => ({ ...prev, email_domain: t }))}
                                />
                            </View>

                            {/* Divider */}
                            <View style={{ height: 0.5, backgroundColor: themeColors.border, marginBottom: 16 }} />

                            {/* Section: Admin */}
                            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: themeColors.subtext, marginBottom: 10 }}>
                                Primary admin
                            </Text>
                            <View style={{ marginBottom: 10 }}>
                                <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Full name <Text style={{ color: themeColors.primary }}>*</Text></Text>
                                <TextInput
                                    style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                    placeholder="Jane Mwangi"
                                    placeholderTextColor={themeColors.subtext}
                                    value={enrollForm.admin_full_name}
                                    onChangeText={t => setEnrollForm(prev => ({ ...prev, admin_full_name: t }))}
                                />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Email <Text style={{ color: themeColors.primary }}>*</Text></Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                        placeholder="jane@alliance.edu"
                                        placeholderTextColor={themeColors.subtext}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={enrollForm.admin_email}
                                        onChangeText={t => setEnrollForm(prev => ({ ...prev, admin_email: t }))}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Password <Text style={{ color: themeColors.primary }}>*</Text></Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                        placeholder="••••••••"
                                        placeholderTextColor={themeColors.subtext}
                                        secureTextEntry
                                        value={enrollForm.admin_password}
                                        onChangeText={t => setEnrollForm(prev => ({ ...prev, admin_password: t }))}
                                    />
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={{ height: 0.5, backgroundColor: themeColors.border, marginBottom: 16 }} />

                            {/* Section: Subscription */}
                            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: themeColors.subtext, marginBottom: 10 }}>
                                Subscription
                            </Text>

                            {/* Plan picker — grid of chips */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                {[
                                    { label: 'Trial', value: 'trial', sub: '14 days' },
                                    { label: 'Basic', value: 'basic', sub: '$100/mo' },
                                    { label: 'Pro', value: 'pro', sub: '$300/mo' },
                                    { label: 'Premium', value: 'premium', sub: '$500/mo' },
                                    { label: 'Enterprise', value: 'custom', sub: 'Custom' },
                                    { label: 'Free', value: 'free', sub: 'Forever' },
                                ].map(plan => {
                                    const selected = enrollForm.subscription_plan === plan.value;
                                    return (
                                        <TouchableOpacity
                                            key={plan.value}
                                            onPress={() => setEnrollForm(prev => ({ ...prev, subscription_plan: plan.value, subscription_status: plan.value === 'trial' ? 'trial' : 'active' }))}
                                            style={{
                                                paddingVertical: 8, paddingHorizontal: 14,
                                                borderRadius: 10,
                                                borderWidth: selected ? 1.5 : 0.5,
                                                borderColor: selected ? themeColors.primary : themeColors.border,
                                                backgroundColor: selected ? `${themeColors.primary}12` : themeColors.bg,
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? themeColors.primary : themeColors.text }}>{plan.label}</Text>
                                            <Text style={{ fontSize: 11, color: selected ? themeColors.primary : themeColors.subtext, marginTop: 1 }}>{plan.sub}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {enrollForm.subscription_plan === 'free' && (
                                <View style={{ marginBottom: 12 }}>
                                    <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Expiry date <Text style={{ color: themeColors.subtext, fontWeight: '400' }}>(optional, ISO format)</Text></Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                        placeholder="e.g. 2026-12-31"
                                        placeholderTextColor={themeColors.subtext}
                                        value={enrollForm.trial_end_date}
                                        onChangeText={t => setEnrollForm(prev => ({ ...prev, trial_end_date: t }))}
                                    />
                                </View>
                            )}

                            {enrollForm.subscription_plan === 'custom' && (
                                <View style={{ marginBottom: 12 }}>
                                    <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Custom student limit <Text style={{ color: themeColors.primary }}>*</Text></Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, fontSize: 14 }}
                                        placeholder="e.g. 2500"
                                        placeholderTextColor={themeColors.subtext}
                                        keyboardType="number-pad"
                                        value={enrollForm.custom_student_limit}
                                        onChangeText={t => setEnrollForm(prev => ({ ...prev, custom_student_limit: t }))}
                                    />
                                </View>
                            )}

                            <View style={{ marginBottom: 28 }}>
                                <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 4 }}>Initial status</Text>
                                <View style={{ backgroundColor: themeColors.bg, borderRadius: 10, borderWidth: 0.5, borderColor: themeColors.border, overflow: 'hidden' }}>
                                    <Picker
                                        selectedValue={enrollForm.subscription_status}
                                        onValueChange={v => setEnrollForm(prev => ({ ...prev, subscription_status: v }))}
                                        style={{ color: themeColors.text, backgroundColor: themeColors.bg, padding: 10 }}
                                        dropdownIconColor={themeColors.subtext}
                                    >
                                        <Picker.Item label="Trial" value="trial" />
                                        <Picker.Item label="Active" value="active" />
                                        <Picker.Item label="Suspended" value="suspended" />
                                        <Picker.Item label="Expired" value="expired" />
                                    </Picker>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleEnroll}
                                disabled={enrollLoading}
                                style={{ backgroundColor: themeColors.primary, padding: 14, borderRadius: 12, alignItems: 'center', opacity: enrollLoading ? 0.7 : 1 }}
                            >
                                {enrollLoading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Enroll institution</Text>
                                }
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* FREE ACCESS MODAL */}
            <Modal visible={freeModalVisible} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text, marginBottom: 8 }}>Grant Free Access</Text>
                        <Text style={{ color: themeColors.subtext, fontSize: 14, marginBottom: 20 }}>
                            This provides the institution full 'Basic' features for a limited time duration without payment.
                        </Text>

                        <Text style={{ color: themeColors.text, marginBottom: 8, fontWeight: '600' }}>Duration (Days)</Text>
                        <TextInput
                            style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, marginBottom: 24 }}
                            placeholder="e.g. 30"
                            placeholderTextColor={themeColors.subtext}
                            keyboardType="number-pad"
                            value={freeDays}
                            onChangeText={setFreeDays}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setFreeModalVisible(false)}
                                style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: themeColors.border }}
                            >
                                <Text style={{ color: themeColors.text, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleGrantFreeAccess}
                                disabled={isSubmitting}
                                style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: themeColors.primary, opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Grant Access</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ADMIN MANAGEMENT MODAL */}
            <Modal visible={adminModalVisible} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 450 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text }}>Institution Admins</Text>
                            <TouchableOpacity onPress={() => { setAdminModalVisible(false); setSelectedInstAdmins([]); }}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {adminLoading ? (
                            <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: 40 }} />
                        ) : selectedInstAdmins.length > 0 ? (
                            <View style={{ gap: 12 }}>
                                {selectedInstAdmins.map((admin) => (
                                    <View key={admin.id} style={{
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                        padding: 16,
                                        borderRadius: 16,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 15 }}>{admin.full_name}</Text>
                                            <Text style={{ color: themeColors.subtext, fontSize: 13 }}>{admin.email}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                                            <TouchableOpacity
                                                onPress={() => handleResetAdminPassword(admin.id, admin.full_name)}
                                                style={{ padding: 2, borderRadius: 10 }}
                                            >
                                                <Text style={{ color: themeColors.primary, fontSize: 13, fontWeight: '600' }}>Change password</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleRemoveAdmin(admin.id, admin.full_name)}
                                                style={{ padding: 2, borderRadius: 10 }}
                                            >
                                                <Text style={{ color: themeColors.primary, fontSize: 13, fontWeight: '600' }}>Remove admin</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={{ color: themeColors.subtext, textAlign: 'center', marginVertical: 20 }}>No admin users found.</Text>
                        )}

                        <TouchableOpacity
                            onPress={() => { setAdminModalVisible(false); setSelectedInstAdmins([]); }}
                            style={{ backgroundColor: themeColors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MANAGE ADDONS MODAL */}
            <Modal visible={addonsModalVisible} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text, marginBottom: 8 }}>Manage Add-ons</Text>
                        <Text style={{ color: themeColors.subtext, fontSize: 14, marginBottom: 20 }}>
                            Allocate or revoke add-on modules for this institution. Add-ons are master-admin controlled and independent of the subscription plan.
                        </Text>

                        <View style={{ marginBottom: 24, gap: 16 }}>
                            {[
                                { key: 'addon_library', label: '📖 Digital Library', sub: 'Enable Library Management' },
                                { key: 'addon_bursary', label: '🏦 Bursary Module', sub: 'Financial tracking & receipts' },
                                { key: 'addon_messaging', label: '💬 Messaging Module', sub: 'Announcements & direct chat' },
                                { key: 'addon_diary', label: '📒 Virtual Diary', sub: 'Class entries & daily reports' },
                                { key: 'addon_finance', label: '💰 Accounting Plus', sub: 'Advanced financial reports' },
                                { key: 'addon_analytics', label: '📈 Performance Analytics', sub: 'Insightful progress tracking' }
                            ].map((addon) => (
                                <TouchableOpacity
                                    key={addon.key}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                                    onPress={() => setAddonsForm(prev => ({ ...prev, [addon.key]: !prev[addon.key as keyof typeof prev] }))}
                                >
                                    <View>
                                        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600' }}>{addon.label}</Text>
                                        <Text style={{ color: themeColors.subtext, fontSize: 11, marginTop: 2 }}>{addon.sub}</Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name={addonsForm[addon.key as keyof typeof addonsForm] ? "toggle-switch" : "toggle-switch-off"}
                                        size={36}
                                        color={addonsForm[addon.key as keyof typeof addonsForm] ? '#10b981' : themeColors.subtext}
                                    />
                                </TouchableOpacity>
                            ))}

                            <View style={{ marginTop: 8 }}>
                                <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8 }}>Custom Student Limit</Text>
                                <TextInput
                                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: themeColors.text, borderRadius: 12, padding: 14 }}
                                    placeholder="e.g. 5000 (Set to clear for default)"
                                    placeholderTextColor={themeColors.subtext}
                                    keyboardType="number-pad"
                                    value={addonsForm.custom_student_limit?.toString() || ''}
                                    onChangeText={(t) => setAddonsForm(prev => ({ ...prev, custom_student_limit: t ? parseInt(t, 10) : null }))}
                                />
                                <Text style={{ color: themeColors.subtext, fontSize: 10, marginTop: 4 }}>
                                    Leave empty to use the default plan limits.
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setAddonsModalVisible(false)}
                                style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: themeColors.border }}
                            >
                                <Text style={{ color: themeColors.text, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveAddons}
                                disabled={addonsLoading}
                                style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#3B82F6', opacity: addonsLoading ? 0.7 : 1 }}
                            >
                                {addonsLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Save Add-ons</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}
