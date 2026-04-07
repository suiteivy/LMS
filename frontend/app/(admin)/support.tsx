import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/libs/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function UserSupport() {
    const { isDark } = useTheme();
    const { profile } = useAuth();

    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    
    const [isCreating, setIsCreating] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', description: '', category: 'technical' });

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    };

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${getBackendUrl()}/api/support/tickets`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (res.ok) setTickets(data.tickets || []);
        } catch (err) {
            console.error("Error fetching tickets:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTicketDetails = async (id: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${getBackendUrl()}/api/support/tickets/${id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setMessages(data.messages || []);
                setSelectedTicket(data.ticket);
            }
        } catch (err) {
            console.error("Error fetching ticket details:", err);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleCreateTicket = async () => {
        if (!newTicket.subject || !newTicket.description) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${getBackendUrl()}/api/support/tickets`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTicket)
            });
            if (res.ok) {
                setIsCreating(false);
                setNewTicket({ subject: '', description: '', category: 'technical' });
                fetchTickets();
            }
        } catch (err) {
            console.error("Error creating ticket:", err);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;
        setSendingMessage(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${getBackendUrl()}/api/support/tickets/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: newMessage })
            });
            if (res.ok) {
                setNewMessage('');
                fetchTicketDetails(selectedTicket.id);
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
        border: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
        primary: '#FF6B00',
        inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        modalBg: 'rgba(0,0,0,0.6)'
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>Support</Text>
                    <Text style={{ fontSize: 14, color: themeColors.subtext }}>How can we help you today?</Text>
                </View>
                <TouchableOpacity onPress={() => setIsCreating(true)} style={{ backgroundColor: themeColors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700' }}>New Ticket</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                    {tickets.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <MaterialCommunityIcons name="comment-question-outline" size={64} color={themeColors.subtext} />
                            <Text style={{ color: themeColors.subtext, marginTop: 16, fontSize: 16 }}>No support tickets found.</Text>
                        </View>
                    ) : (
                        tickets.map(t => (
                            <TouchableOpacity 
                                key={t.id} 
                                onPress={() => fetchTicketDetails(t.id)}
                                style={{ backgroundColor: themeColors.card, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: themeColors.border, marginBottom: 12 }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, flex: 1 }}>{t.subject}</Text>
                                    <View style={{ backgroundColor: `${getStatusColor(t.status)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                        <Text style={{ color: getStatusColor(t.status), fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{(t.status || 'pending').replace('_', ' ')}</Text>
                                    </View>
                                </View>
                                <Text style={{ color: themeColors.subtext, fontSize: 13 }} numberOfLines={2}>{t.description}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                                    <Text style={{ color: themeColors.subtext, fontSize: 12 }}>ID: #{t.id.slice(0,8)}</Text>
                                    <Text style={{ color: themeColors.subtext, fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString()}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Create Ticket Modal */}
            <Modal visible={isCreating} transparent animationType="slide" onRequestClose={() => setIsCreating(false)}>
                <View style={{ flex: 1, backgroundColor: themeColors.modalBg, justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: themeColors.border }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: themeColors.text, marginBottom: 20 }}>Open Support Ticket</Text>
                        
                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginBottom: 6, textTransform: 'uppercase' }}>Subject</Text>
                        <TextInput 
                            style={{ backgroundColor: themeColors.inputBg, borderRadius: 12, padding: 12, color: themeColors.text, marginBottom: 16 }}
                            placeholder="Briefly describe the issue"
                            placeholderTextColor={themeColors.subtext}
                            value={newTicket.subject}
                            onChangeText={txt => setNewTicket({...newTicket, subject: txt})}
                        />

                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginBottom: 6, textTransform: 'uppercase' }}>Description</Text>
                        <TextInput 
                            style={{ backgroundColor: themeColors.inputBg, borderRadius: 12, padding: 12, color: themeColors.text, height: 120, marginBottom: 24 }}
                            placeholder="Tell us more details..."
                            placeholderTextColor={themeColors.subtext}
                            multiline
                            value={newTicket.description}
                            onChangeText={txt => setNewTicket({...newTicket, description: txt})}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setIsCreating(false)} style={{ flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ color: themeColors.subtext, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateTicket} style={{ flex: 1, backgroundColor: themeColors.primary, padding: 16, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Ticket Thread Modal */}
            <Modal visible={!!selectedTicket} transparent animationType="fade" onRequestClose={() => setSelectedTicket(null)}>
                <View style={{ flex: 1, backgroundColor: themeColors.modalBg, justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.card, height: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
                        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.text }}>Ticket Details</Text>
                            <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {selectedTicket && (
                            <>
                                <ScrollView style={{ flex: 1, padding: 20 }}>
                                    <Text style={{ fontSize: 20, fontWeight: '800', color: themeColors.text, marginBottom: 8 }}>{selectedTicket.subject}</Text>
                                    <View style={{ backgroundColor: themeColors.inputBg, padding: 16, borderRadius: 16, marginBottom: 24 }}>
                                        <Text style={{ color: themeColors.text, lineHeight: 22 }}>{selectedTicket.description}</Text>
                                    </View>

                                    <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.text, marginBottom: 16, textTransform: 'uppercase' }}>Messages</Text>
                                    {messages.map(m => (
                                        <View key={m.id} style={{ 
                                            alignSelf: m.sender_id === profile?.id ? 'flex-end' : 'flex-start',
                                            maxWidth: '85%',
                                            marginBottom: 12,
                                            backgroundColor: m.sender_id === profile?.id ? themeColors.primary : themeColors.inputBg,
                                            padding: 12,
                                            borderRadius: 16,
                                            borderBottomRightRadius: m.sender_id === profile?.id ? 4 : 16,
                                            borderBottomLeftRadius: m.sender_id === profile?.id ? 16 : 4,
                                        }}>
                                            <Text style={{ color: m.sender_id === profile?.id ? '#fff' : themeColors.text, fontSize: 14 }}>{m.message}</Text>
                                            <Text style={{ color: m.sender_id === profile?.id ? 'rgba(255,255,255,0.6)' : themeColors.subtext, fontSize: 10, marginTop: 4 }}>{new Date(m.created_at).toLocaleTimeString()}</Text>
                                        </View>
                                    ))}
                                </ScrollView>

                                <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopWidth: 1, borderTopColor: themeColors.border }}>
                                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                        <TextInput 
                                            style={{ flex: 1, backgroundColor: themeColors.inputBg, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, color: themeColors.text }}
                                            placeholder="Write a message..."
                                            placeholderTextColor={themeColors.subtext}
                                            value={newMessage}
                                            onChangeText={setNewMessage}
                                            multiline
                                        />
                                        <TouchableOpacity 
                                            onPress={sendMessage}
                                            disabled={sendingMessage || !newMessage.trim()}
                                            style={{ backgroundColor: themeColors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {sendingMessage ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="send" size={20} color="#fff" />}
                                        </TouchableOpacity>
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
