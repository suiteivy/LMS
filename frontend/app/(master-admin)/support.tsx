import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/libs/supabase';

export default function MasterSupport() {
    const { isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    };

    const fetchTickets = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${getBackendUrl()}/api/master-admin/support-requests`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setTickets(data.requests || []);
            }
        } catch (err) {
            console.error("Error fetching support requests:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const updateTicketStatus = async (id: string, newStatus: string) => {
        setStatusUpdating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${getBackendUrl()}/api/master-admin/support-requests/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
                if (selectedTicket?.id === id) {
                    setSelectedTicket({ ...selectedTicket, status: newStatus });
                }
            }
        } catch (err) {
            console.error("Error updating ticket status:", err);
        } finally {
            setStatusUpdating(false);
        }
    };

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00',
        modalBg: 'rgba(0,0,0,0.5)',
        inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#ef4444';
            case 'in_progress': return '#f59e0b';
            case 'resolved': return '#10b981';
            case 'closed': return themeColors.subtext;
            case 'Open': return '#ef4444'; // Fallback
            case 'Pending': return '#f59e0b'; // Fallback
            case 'Resolved': return '#10b981'; // Fallback
            default: return themeColors.subtext;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                    <View style={{ backgroundColor: `${themeColors.primary}20`, padding: 8, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="headphones" size={24} color={themeColors.primary} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>App Support</Text>
                        <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>Institution Complaints & Inquiries</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, marginBottom: 12 }}>Active Support Tickets</Text>

                        {tickets.length === 0 ? (
                            <Text style={{ color: themeColors.subtext, textAlign: 'center', marginTop: 24 }}>No support requests found.</Text>
                        ) : (
                            tickets.map(t => (
                                <TouchableOpacity
                                    key={t.id}
                                    onPress={() => setSelectedTicket(t)}
                                    style={{
                                        backgroundColor: themeColors.card,
                                        padding: 16,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: themeColors.border,
                                        marginBottom: 12
                                    }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, flex: 1 }}>{t.title}</Text>
                                        <View style={{ backgroundColor: `${getStatusColor(t.status)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 12 }}>
                                            <Text style={{ color: getStatusColor(t.status), fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>{t.status.replace('_', ' ')}</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <MaterialCommunityIcons name="domain" size={14} color={themeColors.subtext} />
                                            <Text style={{ color: themeColors.subtext, fontSize: 13 }}>{t.inst}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <MaterialCommunityIcons name="calendar" size={14} color={themeColors.subtext} />
                                            <Text style={{ color: themeColors.subtext, fontSize: 13 }}>{t.date}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}

                        <View style={{ marginTop: 24, backgroundColor: `${themeColors.primary}10`, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: `${themeColors.primary}30` }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <MaterialCommunityIcons name="information" size={20} color={themeColors.primary} />
                                <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 15 }}>Integration Note</Text>
                            </View>
                            <Text style={{ color: themeColors.subtext, lineHeight: 20 }}>
                                Connect this module to an external help desk service like Zendesk or Intercom for more advanced ticketing features.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>

            <Modal visible={!!selectedTicket} transparent animationType="fade" onRequestClose={() => setSelectedTicket(null)}>
                <View style={{ flex: 1, backgroundColor: themeColors.modalBg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{
                        backgroundColor: themeColors.card,
                        width: '100%',
                        maxWidth: 500,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: themeColors.border,
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.text }}>Ticket Details</Text>
                            <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        {selectedTicket && (
                            <ScrollView style={{ padding: 20, maxHeight: 400 }}>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: themeColors.text, marginBottom: 8 }}>{selectedTicket.subject}</Text>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginBottom: 20 }}>
                                    <View>
                                        <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Institution</Text>
                                        <Text style={{ color: themeColors.text, fontWeight: '600' }}>{selectedTicket.inst}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>User</Text>
                                        <Text style={{ color: themeColors.text, fontWeight: '600' }}>{selectedTicket.user_name}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Priority</Text>
                                        <Text style={{ color: themeColors.text, fontWeight: '600', textTransform: 'capitalize' }}>{selectedTicket.priority}</Text>
                                    </View>
                                </View>

                                <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Description</Text>
                                <View style={{ backgroundColor: themeColors.inputBg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border }}>
                                    <Text style={{ color: themeColors.text, lineHeight: 22 }}>
                                        {selectedTicket.description}
                                    </Text>
                                </View>

                                <View style={{ marginTop: 24, marginBottom: 20 }}>
                                    <Text style={{ fontSize: 12, color: themeColors.subtext, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Update Status</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {['pending', 'in_progress', 'resolved', 'closed'].map(statusOption => (
                                            <TouchableOpacity
                                                key={statusOption}
                                                onPress={() => updateTicketStatus(selectedTicket.id, statusOption)}
                                                disabled={statusUpdating}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    paddingVertical: 8,
                                                    paddingHorizontal: 12,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    borderColor: selectedTicket.status === statusOption ? getStatusColor(statusOption) : themeColors.border,
                                                    backgroundColor: selectedTicket.status === statusOption ? `${getStatusColor(statusOption)}15` : 'transparent',
                                                    opacity: statusUpdating ? 0.5 : 1
                                                }}
                                            >
                                                {selectedTicket.status === statusOption && (
                                                    <MaterialCommunityIcons name="check-circle" size={14} color={getStatusColor(statusOption)} />
                                                )}
                                                <Text style={{
                                                    color: selectedTicket.status === statusOption ? getStatusColor(statusOption) : themeColors.text,
                                                    fontWeight: selectedTicket.status === statusOption ? '700' : '500',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {statusOption.replace('_', ' ')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
