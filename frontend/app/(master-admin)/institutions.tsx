import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function MasterInstitutions() {
    const { isDark } = useTheme();
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [freeModalVisible, setFreeModalVisible] = useState(false);
    const [selectedInstId, setSelectedInstId] = useState<string | null>(null);

    // Addons State
    const [addonsModalVisible, setAddonsModalVisible] = useState(false);
    const [addonsForm, setAddonsForm] = useState({
        addon_library: false,
        addon_messaging: false,
        addon_finance: false,
        addon_analytics: false
    });
    const [addonsLoading, setAddonsLoading] = useState(false);

    // Enrollment State
    const [enrollModalVisible, setEnrollModalVisible] = useState(false);
    const [enrollForm, setEnrollForm] = useState({
        institution_name: '',
        location: '',
        admin_full_name: '',
        admin_email: '',
        admin_password: '',
        subscription_plan: 'trial',
        subscription_status: 'trial',
        trial_end_date: ''
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

    useEffect(() => {
        fetchInstitutions();
    }, []);

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
                    institution_name: '', location: '', admin_full_name: '', admin_email: '', admin_password: '', subscription_plan: 'trial', subscription_status: 'trial', trial_end_date: ''
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
                body: JSON.stringify(addonsForm)
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

                        {(item.subscription_plan === 'basic' || item.subscription_plan === 'basic_basic' || item.subscription_plan === 'beta_free') && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedInstId(item.id);
                                    setAddonsForm({
                                        addon_library: item.addon_library || false,
                                        addon_messaging: item.addon_messaging || false,
                                        addon_finance: item.addon_finance || false,
                                        addon_analytics: item.addon_analytics || false,
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
                <TouchableOpacity onPress={fetchInstitutions}>
                    <MaterialCommunityIcons name="refresh" size={24} color={themeColors.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
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

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ color: themeColors.primary, fontWeight: 'bold', marginBottom: 8, marginTop: 10 }}>Institution Details</Text>
                            <TextInput
                                style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, marginBottom: 16 }}
                                placeholder="Institution Name*"
                                placeholderTextColor={themeColors.subtext}
                                value={enrollForm.institution_name}
                                onChangeText={t => setEnrollForm(prev => ({ ...prev, institution_name: t }))}
                            />
                            <TextInput
                                style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, marginBottom: 24 }}
                                placeholder="Location (Optional)"
                                placeholderTextColor={themeColors.subtext}
                                value={enrollForm.location}
                                onChangeText={t => setEnrollForm(prev => ({ ...prev, location: t }))}
                            />

                            <Text style={{ color: themeColors.primary, fontWeight: 'bold', marginBottom: 8 }}>Primary Admin Details</Text>
                            <TextInput
                                style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, marginBottom: 16 }}
                                placeholder="Admin Full Name*"
                                placeholderTextColor={themeColors.subtext}
                                value={enrollForm.admin_full_name}
                                onChangeText={t => setEnrollForm(prev => ({ ...prev, admin_full_name: t }))}
                            />
                            <TextInput
                                style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, marginBottom: 16 }}
                                placeholder="Admin Email*"
                                placeholderTextColor={themeColors.subtext}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                value={enrollForm.admin_email}
                                onChangeText={t => setEnrollForm(prev => ({ ...prev, admin_email: t }))}
                            />
                            <TextInput
                                style={{ backgroundColor: themeColors.bg, color: themeColors.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, marginBottom: 30 }}
                                placeholder="Admin Password*"
                                placeholderTextColor={themeColors.subtext}
                                secureTextEntry
                                value={enrollForm.admin_password}
                                onChangeText={t => setEnrollForm(prev => ({ ...prev, admin_password: t }))}
                            />

                            <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8, marginTop: 16 }}>Subscription Plan</Text>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 12, marginBottom: 16 }}>
                                <Picker
                                    selectedValue={enrollForm.subscription_plan}
                                    onValueChange={(itemValue) => setEnrollForm({ ...enrollForm, subscription_plan: itemValue })}
                                    style={{ color: themeColors.text }}
                                    dropdownIconColor={themeColors.text}
                                >
                                    <Picker.Item label="Trial" value="trial" />
                                    <Picker.Item label="Basic" value="basic" />
                                    <Picker.Item label="Pro" value="pro" />
                                    <Picker.Item label="Premium" value="premium" />
                                    <Picker.Item label="Beta Free (Hidden Tier)" value="beta_free" />
                                </Picker>
                            </View>

                            {enrollForm.subscription_plan === 'beta_free' && (
                                <>
                                    <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8 }}>Beta Expiration Date (ISO String / Optional)</Text>
                                    <TextInput
                                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: themeColors.text, borderRadius: 12, padding: 14, marginBottom: 16 }}
                                        placeholder="e.g. 2026-12-31"
                                        placeholderTextColor={themeColors.subtext}
                                        value={enrollForm.trial_end_date}
                                        onChangeText={(text) => setEnrollForm({ ...enrollForm, trial_end_date: text })}
                                    />
                                </>
                            )}

                            <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8 }}>Subscription Status</Text>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 12, marginBottom: 24 }}>
                                <Picker
                                    selectedValue={enrollForm.subscription_status}
                                    onValueChange={(itemValue) => setEnrollForm({ ...enrollForm, subscription_status: itemValue })}
                                    style={{ color: themeColors.text }}
                                    dropdownIconColor={themeColors.text}
                                >
                                    <Picker.Item label="Active" value="active" />
                                    <Picker.Item label="Suspended" value="suspended" />
                                    <Picker.Item label="Trial" value="trial" />
                                    <Picker.Item label="Expired" value="expired" />
                                </Picker>
                            </View>

                            <TouchableOpacity
                                onPress={handleEnroll}
                                disabled={enrollLoading}
                                style={{ backgroundColor: themeColors.primary, padding: 16, borderRadius: 12, alignItems: 'center', opacity: enrollLoading ? 0.7 : 1 }}
                            >
                                {enrollLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Enroll Now</Text>}
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

            {/* MANAGE ADDONS MODAL */}
            <Modal visible={addonsModalVisible} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text, marginBottom: 8 }}>Manage Add-ons</Text>
                        <Text style={{ color: themeColors.subtext, fontSize: 14, marginBottom: 20 }}>
                            Toggle individual premium features for this institution.
                        </Text>

                        <View style={{ marginBottom: 24, gap: 16 }}>
                            {[
                                { key: 'addon_library', label: '📖 Digital Library' },
                                { key: 'addon_messaging', label: '💬 Internal Messaging' },
                                { key: 'addon_finance', label: '💰 Bursary & Finance' },
                                { key: 'addon_analytics', label: '📈 Advanced Analytics' }
                            ].map((addon) => (
                                <TouchableOpacity
                                    key={addon.key}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                                    onPress={() => setAddonsForm(prev => ({ ...prev, [addon.key]: !prev[addon.key as keyof typeof prev] }))}
                                >
                                    <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600' }}>{addon.label}</Text>
                                    <MaterialCommunityIcons
                                        name={addonsForm[addon.key as keyof typeof addonsForm] ? "toggle-switch" : "toggle-switch-off"}
                                        size={36}
                                        color={addonsForm[addon.key as keyof typeof addonsForm] ? '#10b981' : themeColors.subtext}
                                    />
                                </TouchableOpacity>
                            ))}
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
