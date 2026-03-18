import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/libs/supabase';

export default function MasterSupport() {
    const { isDark } = useTheme();
    const { profile } = useAuth();

    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

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

    const fetchMessages = async (ticketId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${getBackendUrl()}/api/master-admin/support-requests/${ticketId}/messages`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (res.ok) setMessages(data.messages || []);
        } catch (err) {
            console.error("Error fetching messages:", err);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);
        } else {
            setMessages([]);
        }
    }, [selectedTicket]);

    const updateTicketDetails = async (id: string, updates: any) => {
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
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                setTickets(tickets.map(t => t.id === id ? { ...t, ...updates } : t));
                if (selectedTicket?.id === id) {
                    setSelectedTicket({ ...selectedTicket, ...updates });
                }
            }
        } catch (err) {
            console.error("Error updating ticket:", err);
        } finally {
            setStatusUpdating(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;
        setSendingMessage(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${getBackendUrl()}/api/master-admin/support-requests/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: newMessage, is_internal: false })
            });

            if (res.ok) {
                setNewMessage('');
                fetchMessages(selectedTicket.id);
                // Also update status to 'in_progress' locally if it was 'pending'
                if (selectedTicket.status === 'pending') {
                    setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t));
                    setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
                }
            }
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setSendingMessage(false);
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
            case 'awaiting_customer': return '#3b82f6';
            case 'resolved': return '#10b981';
            case 'closed': return themeColors.subtext;
            default: return themeColors.subtext;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return '#ef4444';
            case 'high': return '#f59e0b';
            case 'normal': return '#3b82f6';
            case 'low': return '#10b981';
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
                        <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>Support Desk</Text>
                        <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>Banking-grade Ticketing & Escalation</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text }}>Active Tickets</Text>
                            <TouchableOpacity onPress={fetchTickets} style={{ padding: 4 }}>
                                <MaterialCommunityIcons name="refresh" size={20} color={themeColors.primary} />
                            </TouchableOpacity>
                        </View>

                        {tickets.length === 0 ? (
                            <View style={{ backgroundColor: themeColors.card, padding: 40, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: themeColors.border }}>
                                <MaterialCommunityIcons name="check-all" size={48} color={`${themeColors.primary}40`} />
                                <Text style={{ color: themeColors.text, fontWeight: '700', marginTop: 16 }}>Safe & Sound</Text>
                                <Text style={{ color: themeColors.subtext, textAlign: 'center', marginTop: 4 }}>No pending support tickets at the moment.</Text>
                            </View>
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
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, flex: 1 }}>{t.subject}</Text>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            <View style={{ backgroundColor: `${getPriorityColor(t.priority)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                <Text style={{ color: getPriorityColor(t.priority), fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{t.priority}</Text>
                                            </View>
                                            <View style={{ backgroundColor: `${getStatusColor(t.status)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                <Text style={{ color: getStatusColor(t.status), fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{t.status.replace('_', ' ')}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <MaterialCommunityIcons name="domain" size={14} color={themeColors.subtext} />
                                                <Text style={{ color: themeColors.subtext, fontSize: 12 }}>{t.institution?.name || 'Legacy'}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <MaterialCommunityIcons name="account" size={14} color={themeColors.subtext} />
                                                <Text style={{ color: themeColors.subtext, fontSize: 12 }}>{t.assigned_name || 'Unassigned'}</Text>
                                            </View>
                                        </View>
                                        <Text style={{ color: themeColors.subtext, fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </>
                )}
            </ScrollView>

            <Modal visible={!!selectedTicket} transparent animationType="slide" onRequestClose={() => setSelectedTicket(null)}>
                <View style={{ flex: 1, backgroundColor: themeColors.modalBg, justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: themeColors.card,
                        height: '92%',
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        borderWidth: 1,
                        borderColor: themeColors.border,
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
                            <View>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.text }}>Ticket Info</Text>
                                <Text style={{ fontSize: 12, color: themeColors.subtext }}>Escalation Level: {selectedTicket?.escalation_level || 0}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedTicket(null)} style={{ padding: 8 }}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {selectedTicket && (
                            <>
                                <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                                    <View style={{ marginBottom: 24 }}>
                                        <Text style={{ fontSize: 20, fontWeight: '800', color: themeColors.text, marginBottom: 12 }}>{selectedTicket.subject}</Text>
                                        
                                        <View style={{ backgroundColor: themeColors.inputBg, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: themeColors.border, marginBottom: 24 }}>
                                            <Text style={{ color: themeColors.text, lineHeight: 24, fontSize: 15 }}>{selectedTicket.description}</Text>
                                        </View>

                                        {/* Status & Actions */}
                                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                            <TouchableOpacity 
                                                onPress={() => updateTicketDetails(selectedTicket.id, { assigned_to_id: profile?.id })}
                                                style={{ flex: 1, backgroundColor: themeColors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                                            >
                                                <MaterialCommunityIcons name="account-check" size={18} color="#fff" />
                                                <Text style={{ color: '#fff', fontWeight: '700' }}>Assign to Me</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                onPress={() => updateTicketDetails(selectedTicket.id, { escalation_level: (selectedTicket.escalation_level || 0) + 1, priority: 'urgent' })}
                                                style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                                            >
                                                <MaterialCommunityIcons name="trending-up" size={18} color="#fff" />
                                                <Text style={{ color: '#fff', fontWeight: '700' }}>Escalate</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Communication Thread</Text>
                                        
                                        {messages.length === 0 ? (
                                            <Text style={{ color: themeColors.subtext, textAlign: 'center', paddingVertical: 20 }}>No messages yet. Send a reply below.</Text>
                                        ) : (
                                            messages.map((m, idx) => (
                                                <View key={m.id} style={{
                                                    alignSelf: m.sender_id === profile?.id ? 'flex-end' : 'flex-start',
                                                    maxWidth: '85%',
                                                    marginBottom: 12,
                                                    backgroundColor: m.sender_id === profile?.id ? themeColors.primary : (m.sender?.role === 'master_admin' ? '#4f46e5' : themeColors.inputBg),
                                                    padding: 12,
                                                    borderRadius: 16,
                                                    borderBottomRightRadius: m.sender_id === profile?.id ? 4 : 16,
                                                    borderBottomLeftRadius: m.sender_id === profile?.id ? 16 : 4,
                                                }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <Text style={{ color: m.sender_id === profile?.id ? '#fff' : (m.sender?.role === 'master_admin' ? '#fff' : themeColors.text), fontSize: 11, fontWeight: '700' }}>
                                                            {m.sender?.first_name ? `${m.sender.first_name} ${m.sender.last_name || ''}`.trim() : (m.sender?.full_name || 'System')}
                                                        </Text>
                                                        <Text style={{ color: m.sender_id === profile?.id ? 'rgba(255,255,255,0.7)' : themeColors.subtext, fontSize: 10, marginLeft: 12 }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                    </View>
                                                    <Text style={{ color: m.sender_id === profile?.id || m.sender?.role === 'master_admin' ? '#fff' : themeColors.text, fontSize: 14 }}>{m.message}</Text>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                </ScrollView>

                                {/* Message Input */}
                                <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: themeColors.border, backgroundColor: themeColors.card, paddingBottom: Platform.OS === 'ios' ? 40 : 20 }}>
                                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                        <View style={{ flex: 1, backgroundColor: themeColors.inputBg, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: themeColors.border }}>
                                            <TextInput
                                                placeholder="Type your reply..."
                                                placeholderTextColor={themeColors.subtext}
                                                style={{ color: themeColors.text, fontSize: 15 }}
                                                value={newMessage}
                                                onChangeText={setNewMessage}
                                                multiline
                                            />
                                        </View>
                                        <TouchableOpacity 
                                            onPress={sendMessage}
                                            disabled={sendingMessage || !newMessage.trim()}
                                            style={{ backgroundColor: themeColors.primary, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', opacity: sendingMessage || !newMessage.trim() ? 0.6 : 1 }}
                                        >
                                            {sendingMessage ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="send" size={20} color="#fff" />}
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                                        {['pending', 'in_progress', 'awaiting_customer', 'resolved', 'closed'].map(st => (
                                            <TouchableOpacity 
                                                key={st} 
                                                onPress={() => updateTicketDetails(selectedTicket.id, { status: st })}
                                                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: selectedTicket.status === st ? getStatusColor(st) : themeColors.border, backgroundColor: selectedTicket.status === st ? `${getStatusColor(st) }15` : 'transparent' }}
                                            >
                                                <Text style={{ fontSize: 11, color: selectedTicket.status === st ? getStatusColor(st) : themeColors.subtext, fontWeight: '700', textTransform: 'capitalize' }}>{st.replace('_', ' ')}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
