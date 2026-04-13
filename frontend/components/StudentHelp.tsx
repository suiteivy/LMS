import { useTheme } from "@/contexts/ThemeContext";
import { ChevronDown, ChevronUp, LifeBuoy, Mail, MessageSquare, Search, X, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';

interface FAQItemProps {
    question: string;
    answer: string;
    isDark: boolean;
}

const FAQItem = ({ question, answer, isDark }: FAQItemProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View style={{
            marginBottom: 12,
            backgroundColor: isDark ? '#13103A' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: [{ 
                offsetX: 0, 
                offsetY: 1, 
                blurRadius: 4, 
                color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)' 
            }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.5 : 0.04,
            shadowRadius: 4,
            elevation: isDark ? 0 : 1,
        }}>
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
                activeOpacity={0.7}
            >
                <Text style={{ flex: 1, color: isDark ? '#f3f4f6' : '#1f2937', fontWeight: '600', fontSize: 15 }}>{question}</Text>
                {isOpen
                    ? <ChevronUp size={20} color="#f97316" />
                    : <ChevronDown size={20} color={isDark ? '#6b7280' : '#9ca3af'} />
                }
            </TouchableOpacity>
            {isOpen && (
                <View style={{
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#1f2937' : '#f9fafb',
                }}>
                    <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', lineHeight: 24 }}>{answer}</Text>
                </View>
            )}
        </View>
    );
};

export default function StudentHelp() {
    const { isDark } = useTheme();
    const [selectedTab, setSelectedTab] = useState<'ticket' | 'email' | null>(null);

    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketDescription, setTicketDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
                    priority: 'normal'
                })
            });

            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Support ticket submitted successfully.' });
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

    const tokens = {
        bg: isDark ? '#0F0B2E' : '#f9fafb',
        surface: isDark ? '#13103A' : '#ffffff',
        border: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
        textPrimary: isDark ? '#ffffff' : '#111827',
        textSecondary: isDark ? '#9ca3af' : '#6b7280',
        textMuted: isDark ? '#6b7280' : '#9ca3af',
        inputBg: isDark ? '#1A1650' : '#f9fafb',
        inputBorder: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
        inputText: isDark ? '#ffffff' : '#111827',
    };

    return (
        <>
            <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }}>
                <View style={{ padding: 16, maxWidth: 672, alignSelf: 'center', width: '100%' }}>

                    {/* Header */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <View style={{ padding: 16, backgroundColor: isDark ? '#2a1200' : '#fff7ed', borderRadius: 99, marginBottom: 16 }}>
                            <LifeBuoy size={40} color="#f97316" />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: tokens.textPrimary }}>How can we help?</Text>
                        <Text style={{ color: tokens.textSecondary, marginTop: 4 }}>Search our help center or contact support.</Text>
                    </View>

                    {/* Search */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: tokens.surface,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        marginBottom: 32,
                        boxShadow: [{ 
                            offsetX: 0, 
                            offsetY: 1, 
                            blurRadius: 4, 
                            color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)' 
                        }],
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isDark ? 0.5 : 0.04,
                        shadowRadius: 4,
                        elevation: isDark ? 0 : 1,
                    }}>
                        <Search size={20} color={tokens.textMuted} />
                        <TextInput
                            placeholder="Search for articles..."
                            style={{ flex: 1, color: tokens.inputText, marginLeft: 10, height: 24 }}
                            placeholderTextColor={tokens.textMuted}
                        />
                    </View>

                    {/* FAQ */}
                    <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: 2, marginLeft: 4, marginBottom: 16 }}>
                        Frequently Asked Questions
                    </Text>
                    <FAQItem isDark={isDark} question="How do I change my profile photo?" answer="Go to your Profile page, click the edit icon on your profile picture, and select a new image from your device." />
                    <FAQItem isDark={isDark} question="Can I reset my password?" answer="Yes, navigate to Settings > Change Password to update your security credentials." />
                    <FAQItem isDark={isDark} question="Where is my student ID?" answer="Your student ID is displayed on the Profile card under the 'Academic Info' section." />

                    {/* Contact */}
                    <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: 2, marginLeft: 4, marginTop: 24, marginBottom: 16 }}>
                        Still need help?
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                            onPress={() => setSelectedTab('ticket')}
                            style={{
                                width: '48%',
                                backgroundColor: tokens.surface,
                                padding: 20,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: tokens.border,
                                alignItems: 'center',
                                boxShadow: [{ 
                                    offsetX: 0, 
                                    offsetY: 1, 
                                    blurRadius: 4, 
                                    color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)' 
                                }],
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.5 : 0.04,
                                shadowRadius: 4,
                                elevation: isDark ? 0 : 1,
                            }}
                        >
                            <Send size={24} color="#0d9488" />
                            <Text style={{ marginTop: 8, fontWeight: '700', color: tokens.textPrimary }}>Submit Ticket</Text>
                            <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>In-App Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                Linking.openURL('mailto:Support@cloudoraltd@gmail.com');
                                setSelectedTab(null);
                            }}
                            style={{
                                width: '48%',
                                backgroundColor: tokens.surface,
                                padding: 20,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: tokens.border,
                                alignItems: 'center',
                                boxShadow: [{ 
                                    offsetX: 0, 
                                    offsetY: 1, 
                                    blurRadius: 4, 
                                    color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)' 
                                }],
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.5 : 0.04,
                                shadowRadius: 4,
                                elevation: isDark ? 0 : 1,
                            }}
                        >
                            <Mail size={24} color="#3b82f6" />
                            <Text style={{ marginTop: 8, fontWeight: '700', color: tokens.textPrimary }}>Email Us</Text>
                            <Text style={{ fontSize: 10, color: '#3b82f6', marginTop: 4 }}>Support@cloudoraltd@gmail.com</Text>
                            <Text style={{ fontSize: 10, color: tokens.textMuted, marginTop: 2 }}>Response in 24h</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Modal */}
            <Modal animationType="fade" transparent visible={!!selectedTab} onRequestClose={() => setSelectedTab(null)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16 }}>
                    <View style={{
                        backgroundColor: tokens.surface,
                        width: '100%',
                        maxWidth: 500,
                        borderRadius: 32,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: tokens.border,
                    }}>
                        {/* Modal Header */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 24,
                            borderBottomWidth: 1,
                            borderBottomColor: tokens.border,
                        }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.textPrimary }}>
                                {selectedTab === 'ticket' ? 'Submit Support Ticket' : 'Email Support'}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedTab(null)}>
                                <X size={24} color={tokens.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            {selectedTab === 'ticket' ? (
                                <View style={{ width: '100%', alignItems: 'flex-start' }}>
                                    <Text style={{ color: tokens.textPrimary, fontWeight: '600', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Subject</Text>
                                    <TextInput
                                        style={{ backgroundColor: tokens.inputBg, color: tokens.inputText, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: tokens.inputBorder, width: '100%' }}
                                        placeholder="Brief summary of the issue"
                                        placeholderTextColor={tokens.textMuted}
                                        value={ticketSubject}
                                        onChangeText={setTicketSubject}
                                    />

                                    <Text style={{ color: tokens.textPrimary, fontWeight: '600', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Description</Text>
                                    <TextInput
                                        style={{ backgroundColor: tokens.inputBg, color: tokens.inputText, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: tokens.inputBorder, width: '100%', minHeight: 120, textAlignVertical: 'top' }}
                                        placeholder="Please describe your issue in detail..."
                                        placeholderTextColor={tokens.textMuted}
                                        multiline
                                        numberOfLines={5}
                                        value={ticketDescription}
                                        onChangeText={setTicketDescription}
                                    />

                                    <TouchableOpacity
                                        onPress={handleSubmitTicket}
                                        disabled={submitting}
                                        style={{ backgroundColor: '#0d9488', paddingVertical: 16, borderRadius: 20, alignItems: 'center', width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                    >
                                        {submitting ? <ActivityIndicator color="#fff" /> : (
                                            <>
                                                <Send size={20} color="#fff" />
                                                <Text style={{ color: '#ffffff', fontWeight: '800', letterSpacing: 0.5 }}>SUBMIT TICKET</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ width: '100%' }}>
                                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                        <View style={{ width: 64, height: 64, backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                            <Mail size={32} color="#3b82f6" />
                                        </View>
                                        <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 18 }}>Email Support</Text>
                                        <Text style={{ color: '#3b82f6', fontWeight: '500', fontSize: 14, marginTop: 4 }}>Support@cloudoraltd@gmail.com</Text>
                                    </View>

                                    <Text style={{ color: tokens.textSecondary, textAlign: 'center', marginBottom: 24, fontSize: 14 }}>
                                        Questions about your account or technical issues? Our support team is here to help.
                                    </Text>

                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#f97316',
                                            paddingVertical: 16,
                                            borderRadius: 20,
                                            alignItems: 'center',
                                            boxShadow: [{ 
                                                offsetX: 0, 
                                                offsetY: 4, 
                                                blurRadius: 8, 
                                                color: 'rgba(249, 115, 22, 0.3)' 
                                            }],
                                            shadowColor: '#f97316',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                            elevation: 4,
                                        }}
                                        onPress={() => {
                                            Linking.openURL('mailto:Support@cloudoraltd@gmail.com');
                                            setSelectedTab(null);
                                        }}
                                    >
                                        <Text style={{ color: '#ffffff', fontWeight: '800', letterSpacing: 0.5 }}>CONTACT VIA EMAIL</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}