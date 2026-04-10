import { ChevronDown, ChevronUp, LifeBuoy, Mail, MessageSquare, Search, X, Send, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const { isDark } = useTheme();

    return (
        <View style={{
            marginBottom: 12,
            backgroundColor: isDark ? '#13103A' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
            borderRadius: 16,
            overflow: 'hidden'
        }}>
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
                activeOpacity={0.7}
            >
                <Text style={{ flex: 1, color: isDark ? '#ffffff' : '#1e293b', fontWeight: '600', fontSize: 16 }}>{question}</Text>
                {isOpen ? <ChevronUp size={20} color="#FF6B00" /> : <ChevronDown size={20} color="#94a3b8" />}
            </TouchableOpacity>
            {isOpen && (
                <View style={{ paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', paddingTop: 12, paddingBottom: 16 }}>
                    <Text style={{ color: isDark ? '#94a3b8' : '#64748b', lineHeight: 24 }}>{answer}</Text>
                </View>
            )}
        </View>
    );
};

export default function AdminHelp() {
    const { isDark } = useTheme();
    const [selectedTab, setSelectedTab] = useState<'ticket' | 'email' | null>(null);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketDescription, setTicketDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#1e293b',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00',
        inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'
    };

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    };

    const handleSubmitTicket = async () => {
        if (!ticketSubject.trim() || !ticketDescription.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in all fields.' });
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/settings/support`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: ticketSubject,
                    description: ticketDescription,
                    priority: 'high' // Admins get high priority
                })
            });

            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Support ticket submitted to Platform Admins.' });
                setSelectedTab(null);
                setTicketSubject('');
                setTicketDescription('');
            } else {
                const data = await res.json();
                Toast.show({ type: 'error', text1: 'Error', text2: data.error || 'Failed to submit ticket' });
            }
        } catch (err) {
            console.error("Submit ticket error:", err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to submit ticket' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <ScrollView style={{ flex: 1, backgroundColor: themeColors.bg }}>
                <View style={{ padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' }}>

                    {/* Header */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <View style={{ padding: 16, backgroundColor: `${themeColors.primary}15`, borderRadius: 24, marginBottom: 16 }}>
                            <ShieldCheck size={40} color={themeColors.primary} />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>Admin Support</Text>
                        <Text style={{ color: themeColors.subtext, marginTop: 4, textAlign: 'center' }}>Enterprise assistance for Institution Administrators</Text>
                    </View>

                    {/* FAQ */}
                    <Text style={{ fontSize: 12, fontWeight: '800', color: themeColors.subtext, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Institution Management FAQ</Text>

                    <FAQItem
                        question="How do I manage subscription billing?"
                        answer="Navigate to the Institution Ownership section in your account settings. You can manage your plan, update payment methods, and view invoices there."
                    />
                    <FAQItem
                        question="How do I add new teachers?"
                        answer="Go to the Management Dashboard > Staff. Use the 'Invite Staff' button to send enrollment links to your teachers."
                    />
                    <FAQItem
                        question="Can I customize the institution profile?"
                        answer="Yes, in Admin Settings, you can update your institution's name, logo, and contact information that appears on student reports."
                    />

                    {/* Support Options */}
                    <Text style={{ fontSize: 12, fontWeight: '800', color: themeColors.subtext, textTransform: 'uppercase', letterSpacing: 2, marginTop: 32, marginBottom: 16 }}>Direct Assistance</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                        <TouchableOpacity
                            onPress={() => setSelectedTab('ticket')}
                            style={{ flex: 1, backgroundColor: themeColors.card, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: themeColors.border, alignItems: 'center' }}
                        >
                            <Send size={24} color={themeColors.primary} />
                            <Text style={{ marginTop: 8, fontWeight: '700', color: themeColors.text }}>Submit Ticket</Text>
                            <Text style={{ fontSize: 11, color: themeColors.subtext, marginTop: 2 }}>Priority Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => Linking.openURL('mailto:Support@cloudoraltd@gmail.com')}
                            style={{ flex: 1, backgroundColor: themeColors.card, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: themeColors.border, alignItems: 'center' }}
                        >
                            <Mail size={24} color="#3b82f6" />
                            <Text style={{ marginTop: 8, fontWeight: '700', color: themeColors.text }}>Email Us</Text>
                            <Text style={{ fontSize: 11, color: themeColors.subtext, marginTop: 2 }}>General Inquiries</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: 40, padding: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: themeColors.border }}>
                        <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 15, marginBottom: 8 }}>Service Level Agreement</Text>
                        <Text style={{ color: themeColors.subtext, fontSize: 13, lineHeight: 20 }}>
                            Institution Admins receive priority assistance. Most tickets are addressed within 4-6 business hours. For critical system outages, please use the &apos;Emergency&apos; priority tag in your ticket description.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Modal */}
            <Modal animationType="slide" transparent visible={!!selectedTab} onRequestClose={() => setSelectedTab(null)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.card, width: '100%', maxWidth: 500, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: themeColors.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: themeColors.text }}>{selectedTab === 'ticket' ? 'Platform Support Ticket' : 'Contact Us'}</Text>
                            <TouchableOpacity onPress={() => setSelectedTab(null)}>
                                <X size={24} color={themeColors.subtext} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 32 }}>
                            {selectedTab === 'ticket' ? (
                                <View>
                                    <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Subject</Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.inputBg, color: themeColors.text, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: themeColors.border }}
                                        placeholder="Brief summary of the issue"
                                        placeholderTextColor={themeColors.subtext}
                                        value={ticketSubject}
                                        onChangeText={setTicketSubject}
                                    />

                                    <Text style={{ color: themeColors.text, fontWeight: '600', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Description</Text>
                                    <TextInput
                                        style={{ backgroundColor: themeColors.inputBg, color: themeColors.text, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: themeColors.border, minHeight: 120, textAlignVertical: 'top' }}
                                        placeholder="Please provide technical details..."
                                        placeholderTextColor={themeColors.subtext}
                                        multiline
                                        numberOfLines={5}
                                        value={ticketDescription}
                                        onChangeText={setTicketDescription}
                                    />

                                    <TouchableOpacity
                                        onPress={handleSubmitTicket}
                                        disabled={submitting}
                                        style={{ backgroundColor: themeColors.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
                                    >
                                        {submitting ? <ActivityIndicator color="#fff" /> : (
                                            <>
                                                <Send size={20} color="#fff" />
                                                <Text style={{ color: '#fff', fontWeight: '800', letterSpacing: 1 }}>SUBMIT TO PLATFORM</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}
