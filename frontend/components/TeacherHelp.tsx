import { ChevronDown, ChevronUp, LifeBuoy, Mail, MessageSquare, Search, X, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, ActivityIndicator, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';
import { useTheme } from '@/contexts/ThemeContext';

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const { isDark } = useTheme();

    return (
        <View
            style={{
                marginBottom: 12,
                backgroundColor: isDark ? '#161B22' : '#F6F8FA',
                borderWidth: 1,
                borderColor: isDark ? '#21262D' : '#D0D7DE',
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                className="flex-row items-center justify-between p-4"
                activeOpacity={0.7}
            >
                <Text style={{ flex: 1, color: isDark ? '#f3f4f6' : '#1f2937', fontWeight: '600', fontSize: 15 }}>{question}</Text>
                {isOpen ? <ChevronUp size={20} color="#0d9488" /> : <ChevronDown size={20} color="#9ca3af" />}
            </TouchableOpacity>
            {isOpen && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#21262D' : '#D0D7DE' }}>
                    <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', lineHeight: 24 }}>{answer}</Text>
                </View>
            )}
        </View>
    );
};

export default function TeacherHelp() {
    const { isDark } = useTheme();
    const [selectedTab, setSelectedTab] = useState<'ticket' | 'email' | null>(null);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketDescription, setTicketDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

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

    return (
        <>
            <ScrollView className="flex-1" style={{ backgroundColor: isDark ? '#0B1117' : '#FCFCFC' }}>
                <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                    {/* Header Section */}
                    <View className="items-center mb-8">
                        <View className="p-4 bg-teal-100 rounded-full mb-4">
                            <LifeBuoy size={40} color="#0d9488" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Help Center</Text>
                        <Text className="text-gray-500 mt-1">Resources to help you manage your classes.</Text>
                    </View>

                    {/* Search Bar */}
                    <View 
                        className="flex-row items-center border rounded-lg px-4 py-3 mb-8"
                        style={{ 
                            backgroundColor: isDark ? '#1C2128' : '#FCFCFC',
                            borderColor: isFocused ? '#FB6900' : (isDark ? '#4B5563' : '#E5E7EB')
                        }}
                    >
                        <Search size={20} color="#9ca3af" className="mr-2" />
                        <TextInput
                            placeholder="Search teacher resources..."
                            className="flex-1 text-gray-700 dark:text-gray-200 h-6 bg-transparent"
                            placeholderTextColor="#9ca3af"
                            style={{ 
                                color: isDark ? '#F9FAFB' : '#111827',
                                ...Platform.select({
                                    web: { outlineStyle: 'none' } as any
                                })
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </View>

                    {/* FAQ Section */}
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mb-4">Frequently Asked Questions</Text>

                    <FAQItem
                        question="How do I grade a submission?"
                        answer="Navigate to Manage > Grades. Select a student's submission from the list and use the grade interface to assign points and feedback."
                    />
                    <FAQItem
                        question="How do I create a new assignment?"
                        answer="Go to Manage > Assignments and tap the 'Create Assignment' button. Fill in the details including due date and points."
                    />
                    <FAQItem
                        question="Can I export my earnings report?"
                        answer="Yes, in the Earnings tab, you can use the download button to export your monthly payment history as a PDF or CSV."
                    />
                    <FAQItem
                        question="Where do I find my Teacher ID?"
                        answer="Your Teacher ID is displayed on the Profile page under the 'Professional Info' section."
                    />

                    {/* Contact Options */}
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mt-6 mb-4">Support for Educators</Text>

                    <View className="flex-row flex-wrap justify-between">
                        <TouchableOpacity
                            onPress={() => setSelectedTab('ticket')}
                            className="w-[48%] bg-white dark:bg-[#161B22] p-5 rounded-lg border border-gray-100 dark:border-gray-600 items-center"
                        >
                            <Send size={24} color="#0d9488" />
                            <Text className="mt-2 font-bold text-gray-800 dark:text-white">Submit Ticket</Text>
                            <Text className="text-xs text-gray-400">In-App Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => Linking.openURL('mailto:Support@cloudoraltd@gmail.com')}
                            className="w-[48%] bg-white dark:bg-[#161B22] p-5 rounded-lg border border-gray-100 dark:border-gray-600 items-center"
                        >
                            <Mail size={24} color="#3b82f6" />
                            <Text className="mt-2 font-bold text-gray-800 dark:text-white">Email Admin</Text>
                            <Text className="text-[10px] text-orange-500 font-medium">Support@cloudoraltd@gmail.com</Text>
                            <Text className="text-[10px] text-gray-400 mt-1">Response in 12h</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            {/* Modal */}
            <Modal animationType="fade" transparent visible={!!selectedTab} onRequestClose={() => setSelectedTab(null)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16 }}>
                    <View style={{ backgroundColor: isDark ? '#161B22' : '#F6F8FA', borderColor: isDark ? '#21262D' : '#D0D7DE' }} className="w-full max-w-lg rounded-xl overflow-hidden border">
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">
                                {selectedTab === 'ticket' ? 'Submit Support Ticket' : 'Email Support'}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedTab(null)}>
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View className="p-8 items-center">
                            {selectedTab === 'ticket' ? (
                                <View className="w-full items-start">
                                    <Text className="text-gray-900 dark:text-white font-semibold mb-2 text-sm uppercase tracking-wider">Subject</Text>
                                    <TextInput
                                        className="rounded-xl p-4 mb-4 border-2 w-full"
                                        style={{ backgroundColor: isDark ? '#0F141C' : '#FFFFFF', borderColor: isDark ? '#374151' : '#D0D7DE', color: isDark ? '#F9FAFB' : '#111827' }}
                                        placeholder="Brief summary of the issue"
                                        placeholderTextColor="#9ca3af"
                                        value={ticketSubject}
                                        onChangeText={setTicketSubject}
                                    />

                                    <Text className="text-gray-900 dark:text-white font-semibold mb-2 text-sm uppercase tracking-wider">Description</Text>
                                    <TextInput
                                        className="rounded-xl p-4 mb-6 border-2 w-full min-h-[120px]"
                                        style={{ textAlignVertical: 'top', backgroundColor: isDark ? '#0F141C' : '#FFFFFF', borderColor: isDark ? '#374151' : '#D0D7DE', color: isDark ? '#F9FAFB' : '#111827' }}
                                        placeholder="Please describe your issue in detail..."
                                        placeholderTextColor="#9ca3af"
                                        multiline
                                        numberOfLines={5}
                                        value={ticketDescription}
                                        onChangeText={setTicketDescription}
                                    />

                                    <TouchableOpacity
                                        onPress={handleSubmitTicket}
                                        disabled={submitting}
                                        className="bg-orange-600 py-4 rounded-lg items-center w-full flex-row justify-center"
                                    >
                                        {submitting ? <ActivityIndicator color="#fff" /> : (
                                            <>
                                                <Send size={20} color="#fff" style={{ marginRight: 8 }} />
                                                <Text className="text-white font-extrabold tracking-wide">SUBMIT TICKET</Text>
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
