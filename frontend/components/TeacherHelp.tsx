import { ChevronDown, ChevronUp, LifeBuoy, Mail, MessageSquare, Search, X, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, ActivityIndicator, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View className="mb-3 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                className="flex-row items-center justify-between p-4"
                activeOpacity={0.7}
            >
                <Text className="flex-1 text-gray-800 font-semibold text-base">{question}</Text>
                {isOpen ? <ChevronUp size={20} color="#0d9488" /> : <ChevronDown size={20} color="#9ca3af" />}
            </TouchableOpacity>
            {isOpen && (
                <View className="px-4 pb-4 border-t border-gray-50 pt-3">
                    <Text className="text-gray-600 leading-6">{answer}</Text>
                </View>
            )}
        </View>
    );
};

export default function TeacherHelp() {
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

    return (
        <>
            <ScrollView className="flex-1 bg-gray-50">
                <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                    {/* Header Section */}
                    <View className="items-center mb-8">
                        <View className="p-4 bg-teal-100 rounded-full mb-4">
                            <LifeBuoy size={40} color="#0d9488" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">Teacher Help Center</Text>
                        <Text className="text-gray-500 mt-1">Resources to help you manage your classes.</Text>
                    </View>

                    {/* Search Bar */}
                    <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-8 shadow-sm">
                        <Search size={20} color="#9ca3af" className="mr-2" />
                        <TextInput
                            placeholder="Search teacher resources..."
                            className="flex-1 text-gray-700 h-6"
                            placeholderTextColor="#9ca3af"
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
                            className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm"
                        >
                            <Send size={24} color="#0d9488" />
                            <Text className="mt-2 font-bold text-gray-800">Submit Ticket</Text>
                            <Text className="text-xs text-gray-400">In-App Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => Linking.openURL('mailto:Support@cloudoraltd@gmail.com')}
                            className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm"
                        >
                            <Mail size={24} color="#3b82f6" />
                            <Text className="mt-2 font-bold text-gray-800">Email Admin</Text>
                            <Text className="text-[10px] text-blue-500 font-medium">Support@cloudoraltd@gmail.com</Text>
                            <Text className="text-[10px] text-gray-400 mt-1">Response in 12h</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            {/* Modal */}
            <Modal animationType="fade" transparent visible={!!selectedTab} onRequestClose={() => setSelectedTab(null)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16 }}>
                    <View className="bg-white w-full max-w-lg rounded-3xl overflow-hidden border border-gray-200">
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900">
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
                                    <Text className="text-gray-900 font-semibold mb-2 text-sm uppercase tracking-wider">Subject</Text>
                                    <TextInput
                                        className="bg-gray-50 text-gray-900 rounded-xl p-4 mb-4 border border-gray-200 w-full"
                                        placeholder="Brief summary of the issue"
                                        placeholderTextColor="#9ca3af"
                                        value={ticketSubject}
                                        onChangeText={setTicketSubject}
                                    />

                                    <Text className="text-gray-900 font-semibold mb-2 text-sm uppercase tracking-wider">Description</Text>
                                    <TextInput
                                        className="bg-gray-50 text-gray-900 rounded-xl p-4 mb-6 border border-gray-200 w-full min-h-[120px]"
                                        placeholder="Please describe your issue in detail..."
                                        placeholderTextColor="#9ca3af"
                                        multiline
                                        numberOfLines={5}
                                        value={ticketDescription}
                                        onChangeText={setTicketDescription}
                                        style={{ textAlignVertical: 'top' }}
                                    />

                                    <TouchableOpacity
                                        onPress={handleSubmitTicket}
                                        disabled={submitting}
                                        className="bg-teal-600 py-4 rounded-2xl items-center w-full flex-row justify-center"
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
