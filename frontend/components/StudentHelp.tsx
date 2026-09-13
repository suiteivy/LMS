import { useTheme } from "@/contexts/ThemeContext";
import { ChevronDown, ChevronUp, LifeBuoy, Mail, Search, X, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { SupportService } from '@/services/SupportService';

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
            backgroundColor: isDark ? '#161B22' : '#F6F8FA',
            borderWidth: 1,
            borderColor: isDark ? '#21262D' : '#D0D7DE',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: [{ 
                offsetX: 0, 
                offsetY: 1, 
                blurRadius: 4, 
                color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)' 
            }],
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.5 : 0.04,
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
                    borderTopColor: isDark ? '#21262D' : '#D0D7DE',
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



    const handleSubmitTicket = async () => {
        if (!ticketSubject.trim() || !ticketDescription.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in all fields.' });
            return;
        }

        setSubmitting(true);
        try {
            await SupportService.createTicket({
                subject: ticketSubject,
                description: ticketDescription,
                priority: 'normal',
            });

            Toast.show({ type: 'success', text1: 'Success', text2: 'Support ticket submitted successfully. Expected response: 1 business day.' });
            setSelectedTab(null);
            setTicketSubject('');
            setTicketDescription('');
        } catch (err) {
            console.error("Submit ticket error:", err);
            const fallbackMessage = 'Failed to submit ticket';
            const apiMessage =
                (err as any)?.response?.data?.error ||
                (err as any)?.response?.data?.message ||
                (err as any)?.message ||
                fallbackMessage;
            Toast.show({ type: 'error', text1: 'Error', text2: apiMessage });
        } finally {
            setSubmitting(false);
        }
    };

    const tokens = {
        bg: isDark ? '#161B22' : '#FFFFFF',
        surface: isDark ? '#161B22' : '#F6F8FA',
        border: isDark ? '#21262D' : '#D0D7DE',
        textPrimary: isDark ? '#ffffff' : '#111827',
        textSecondary: isDark ? '#9ca3af' : '#6b7280',
        textMuted: isDark ? '#6b7280' : '#9ca3af',
        inputBg: isDark ? '#0F141C' : '#FFFFFF',
        inputBorder: isDark ? '#374151' : '#D0D7DE',
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
                                shadowOpacity: isDark ? 0.5 : 0.04,
                                elevation: isDark ? 0 : 1,
                            }}
                        >
                            <Send size={24} color="#0d9488" />
                            <Text style={{ marginTop: 8, fontWeight: '700', color: tokens.textPrimary }}>Submit Issue</Text>
                            <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>In-App Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                Linking.openURL('mailto:Support@cloudora.live');
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
                                shadowOpacity: isDark ? 0.5 : 0.04,
                                elevation: isDark ? 0 : 1,
                            }}
                        >
                            <Mail size={24} color="#3b82f6" />
                            <Text style={{ marginTop: 8, fontWeight: '700', color: tokens.textPrimary }}>Email Us</Text>
                            <Text style={{ fontSize: 10, color: '#3b82f6', marginTop: 4 }}>Support@cloudora.live</Text>
                            <Text style={{ fontSize: 10, color: tokens.textMuted, marginTop: 2 }}>Response in 1 business day</Text>
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
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>
                                {selectedTab === 'ticket' ? 'Submit Support Issue' : 'Email Support'}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedTab(null)}>
                                <X size={20} color={tokens.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <View style={{ padding: 24 }}>
                            {selectedTab === 'ticket' ? (
                                <>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                        Subject
                                    </Text>
                                    <TextInput
                                        value={ticketSubject}
                                        onChangeText={setTicketSubject}
                                        placeholder="Brief summary of the issue"
                                        placeholderTextColor={tokens.textMuted}
                                        style={{
                                            backgroundColor: tokens.inputBg,
                                            borderWidth: 1,
                                            borderColor: tokens.inputBorder,
                                            borderRadius: 12,
                                            padding: 12,
                                            color: tokens.inputText,
                                            marginBottom: 16,
                                        }}
                                    />

                                    <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                        Description
                                    </Text>
                                    <TextInput
                                        value={ticketDescription}
                                        onChangeText={setTicketDescription}
                                        placeholder="Please describe your issue in detail..."
                                        placeholderTextColor={tokens.textMuted}
                                        multiline
                                        numberOfLines={4}
                                        style={{
                                            backgroundColor: tokens.inputBg,
                                            borderWidth: 1,
                                            borderColor: tokens.inputBorder,
                                            borderRadius: 12,
                                            padding: 12,
                                            color: tokens.inputText,
                                            minHeight: 100,
                                            textAlignVertical: 'top',
                                            marginBottom: 24,
                                        }}
                                    />

                                    <TouchableOpacity
                                        onPress={handleSubmitTicket}
                                        disabled={submitting}
                                        style={{
                                            backgroundColor: '#f97316',
                                            paddingVertical: 14,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Send size={18} color="#fff" />
                                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                    SUBMIT ISSUE
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={{ width: '100%' }}>
                                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                        <View style={{ width: 64, height: 64, backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                            <Mail size={32} color="#3b82f6" />
                                        </View>
                                        <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 18 }}>Email Support</Text>
                                        <Text style={{ color: '#3b82f6', fontWeight: '500', fontSize: 14, marginTop: 4 }}>Support@cloudora.live</Text>
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
                                        }}
                                        onPress={() => {
                                            Linking.openURL('mailto:Support@cloudora.live');
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
