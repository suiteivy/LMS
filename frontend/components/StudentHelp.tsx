import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, HelpCircle, MessageSquare, Mail, ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react-native';

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

export default function StudentHelp() {
    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                {/* Header Section */}
                <View className="items-center mb-8">
                    <View className="p-4 bg-teal-100 rounded-full mb-4">
                        <LifeBuoy size={40} color="#0d9488" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">How can we help?</Text>
                    <Text className="text-gray-500 mt-1">Search our help center or contact support.</Text>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-8 shadow-sm">
                    <Search size={20} color="#9ca3af" className="mr-2" />
                    <TextInput
                        placeholder="Search for articles..."
                        className="flex-1 text-gray-700 h-6"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* FAQ Section */}
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mb-4">Frequently Asked Questions</Text>

                <FAQItem
                    question="How do I change my profile photo?"
                    answer="Go to your Profile page, click the edit icon on your profile picture, and select a new image from your device."
                />
                <FAQItem
                    question="Can I reset my password?"
                    answer="Yes, navigate to Settings > Change Password to update your security credentials."
                />
                <FAQItem
                    question="Where is my student ID?"
                    answer="Your student ID is displayed on the Profile card under the 'Academic Info' section."
                />

                {/* Contact Options */}
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mt-6 mb-4">Still need help?</Text>

                <View className="flex-row flex-wrap justify-between">
                    <TouchableOpacity className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm">
                        <MessageSquare size={24} color="#0d9488" />
                        <Text className="mt-2 font-bold text-gray-800">Live Chat</Text>
                        <Text className="text-xs text-gray-400">Wait time: 5m</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm">
                        <Mail size={24} color="#3b82f6" />
                        <Text className="mt-2 font-bold text-gray-800">Email Us</Text>
                        <Text className="text-xs text-gray-400">Response in 24h</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </ScrollView>
    );
}
