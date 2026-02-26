import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';

export default function InstitutionOwnership() {
    const { profile, isMaster, refreshProfile } = useAuth();
    const { isDark } = useTheme();
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [transferring, setTransferring] = useState(false);

    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f3f4f6';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#6b7280' : '#9ca3af';

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            if (!profile?.institution_id || !profile?.id) {
                setLoading(false);
                return;
            }

            // Fetch other admins in the same institution
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('role', 'admin')
                .eq('institution_id', profile.institution_id)
                .neq('id', profile.id);

            if (error) throw error;
            setAdmins(data || []);
        } catch (err: any) {
            console.error('Error fetching admins:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async (targetAdmin: any) => {
        if (!isMaster) {
            Alert.alert("Permission Denied", "Only the Master Admin can transfer institutional ownership.");
            return;
        }

        Alert.alert(
            "Transfer Ownership",
            `Are you sure you want to transfer Master Admin status to ${targetAdmin.full_name}? \n\nThis action will revoke your Master Admin privileges and grant them to ${targetAdmin.full_name}.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Transfer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setTransferring(true);
                            // Call backend API
                            const response = await api.post('/auth/transfer-master', {
                                targetAdminUserId: targetAdmin.id
                            });

                            if (response.data.message) {
                                Alert.alert(
                                    "Success",
                                    "Ownership transferred successfully.",
                                    [{ text: "OK", onPress: () => refreshProfile() }]
                                );
                            }
                        } catch (err: any) {
                            // Error is handled by api interceptor (toast), but we catch here for state
                        } finally {
                            setTransferring(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#ffffff' }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    if (!isMaster) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: isDark ? '#121212' : '#ffffff' }}>
                <View style={{ backgroundColor: isDark ? '#1f2937' : '#fef2f2', padding: 24, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#374151' : '#fecaca' }}>
                    <Ionicons name="lock-closed" size={48} color="#ef4444" />
                    <Text style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold', color: textPrimary, textAlign: 'center' }}>Access Denied</Text>
                    <Text style={{ marginTop: 8, color: textSecondary, textAlign: 'center' }}>Only the Master Admin can manage institutional ownership.</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#ffffff' }} contentContainerStyle={{ padding: 24 }}>
            <View style={{ backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : '#FFFBEB', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(251, 191, 36, 0.2)' : '#FDE68A', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="shield-checkmark" size={18} color="#92400E" />
                    </View>
                    <Text style={{ marginLeft: 12, fontWeight: 'bold', color: '#92400E', fontSize: 16 }}>Institutional Ownership</Text>
                </View>
                <Text style={{ color: isDark ? '#D97706' : '#92400E', fontSize: 13, lineHeight: 20 }}>
                    As the Master Admin, you have full control over the institution's settings and billing. You can transfer this status to another administrator below.
                </Text>
            </View>

            <Text style={{ fontSize: 11, fontWeight: 'bold', color: textSecondary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, marginLeft: 4 }}>
                Eligible Administrators ({admins.length})
            </Text>

            {admins.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center', backgroundColor: surface, borderRadius: 24, borderWidth: 1, borderColor: border }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#1f2937' : '#f9fafb', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Ionicons name="people-outline" size={32} color={textSecondary} />
                    </View>
                    <Text style={{ color: textPrimary, fontWeight: 'bold', fontSize: 16 }}>No recipients found</Text>
                    <Text style={{ marginTop: 8, color: textSecondary, textAlign: 'center', fontSize: 13 }}>There are no other administrators in your institution to transfer ownership to.</Text>
                </View>
            ) : (
                admins.map((admin) => (
                    <TouchableOpacity
                        key={admin.id}
                        onPress={() => handleTransfer(admin)}
                        disabled={transferring}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                            backgroundColor: surface,
                            borderRadius: 20,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: border,
                            opacity: transferring ? 0.6 : 1,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0 : 0.05,
                            shadowRadius: 10,
                            elevation: 2
                        }}
                    >
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? '#1f2937' : '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                            <Text style={{ fontWeight: 'bold', color: textPrimary, fontSize: 16 }}>{admin.full_name?.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold', color: textPrimary, fontSize: 15 }}>{admin.full_name}</Text>
                            <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>{admin.email}</Text>
                        </View>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? '#262626' : '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="swap-horizontal" size={16} color="#FF6900" />
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>
    );
}
