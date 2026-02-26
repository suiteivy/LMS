import { useTheme } from "@/contexts/ThemeContext";
import { ChevronDown, ChevronUp, LifeBuoy, Mail, MessageSquare, Search, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? '#1f2937' : '#f3f4f6',
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: isDark ? 0 : 0.04,
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
    const [selectedTab, setSelectedTab] = useState<'chat' | 'email' | null>(null);

    const tokens = {
        bg: isDark ? '#000000' : '#f9fafb',
        surface: isDark ? '#1a1a1a' : '#ffffff',
        border: isDark ? '#1f2937' : '#f3f4f6',
        textPrimary: isDark ? '#ffffff' : '#111827',
        textSecondary: isDark ? '#9ca3af' : '#6b7280',
        textMuted: isDark ? '#6b7280' : '#9ca3af',
        inputBg: isDark ? '#111827' : '#f9fafb',
        inputBorder: isDark ? '#1f2937' : '#f3f4f6',
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
                        shadowColor: '#000',
                        shadowOpacity: isDark ? 0 : 0.04,
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
                            onPress={() => setSelectedTab('chat')}
                            style={{
                                width: '48%',
                                backgroundColor: tokens.surface,
                                padding: 20,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: tokens.border,
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOpacity: isDark ? 0 : 0.04,
                                shadowRadius: 4,
                                elevation: isDark ? 0 : 1,
                            }}
                        >
                            <MessageSquare size={24} color="#0d9488" />
                            <Text style={{ marginTop: 8, fontWeight: '700', color: tokens.textPrimary }}>Live Chat</Text>
                            <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>Wait time: 5m</Text>
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
                                shadowColor: '#000',
                                shadowOpacity: isDark ? 0 : 0.04,
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
                                {selectedTab === 'chat' ? 'Live Chat' : 'Email Support'}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedTab(null)}>
                                <X size={24} color={tokens.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            {selectedTab === 'chat' ? (
                                <>
                                    <View style={{ width: 80, height: 80, backgroundColor: isDark ? '#0d2926' : '#f0fdfa', borderRadius: 99, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <MessageSquare size={32} color="#0d9488" />
                                    </View>
                                    <Text style={{ fontSize: 24, fontWeight: '900', color: tokens.textPrimary, marginBottom: 8 }}>Coming Soon!</Text>
                                    <Text style={{ color: tokens.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                                        Our real-time chat feature is currently under development. Please use Email Support in the meantime.
                                    </Text>
                                </>
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
                                            shadowColor: '#f97316',
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