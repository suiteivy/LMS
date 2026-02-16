import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Search, MessageSquare, Mail, ChevronDown, ChevronUp, LifeBuoy, X } from 'lucide-react-native';

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
                {isOpen ? <ChevronUp size={20} color="#f97316" /> : <ChevronDown size={20} color="#9ca3af" />}
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
    // State to track which contact method is selected
    const [selectedTab, setSelectedTab] = useState<'chat' | 'email' | null>(null);

    return (
        <>
            <ScrollView className="flex-1 bg-gray-50">
                <View className="p-4 md:p-8 max-w-2xl mx-auto w-full">

                    {/* Header Section */}
                    <View className="items-center mb-8">
                        <View className="p-4 bg-orange-100 rounded-full mb-4">
                            <LifeBuoy size={40} color="orange" />
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
                        <TouchableOpacity 
                            onPress={() => setSelectedTab('chat')}
                            className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm"
                        >
                            <MessageSquare size={24} color="#0d9488" />
                            <Text className="mt-2 font-bold text-gray-800">Live Chat</Text>
                            <Text className="text-xs text-gray-400">Wait time: 5m</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setSelectedTab('email')}
                            className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm"
                        >
                            <Mail size={24} color="#3b82f6" />
                            <Text className="mt-2 font-bold text-gray-800">Email Us</Text>
                            <Text className="text-xs text-gray-400">Response in 24h</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            {/* Support Modal */}
            <Modal 
                animationType='fade'
                transparent={true}
                visible={!!selectedTab}
                onRequestClose={() => setSelectedTab(null)}
            >
                <View className='flex-1 justify-center items-center bg-black/60 px-4'>
                    <View className='bg-white w-full max-w-[500px] overflow-hidden shadow-2xl rounded-[32px]'>
                        
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900">
                                {selectedTab === 'chat' ? 'Live Chat' : 'Email Support'}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedTab(null)}>
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View className="p-10 items-center">
                            {selectedTab === 'chat' ? (
                                <>
                                    <View className="w-20 h-20 bg-teal-50 rounded-full items-center justify-center mb-4">
                                        <MessageSquare size={32} color="#0d9488" />
                                    </View>
                                    <Text className="text-2xl font-black text-gray-900 mb-2">Coming Soon!</Text>
                                    <Text className="text-gray-500 text-center leading-5">
                                        Our real-time chat feature is currently under development. Please use Email Support in the meantime.
                                    </Text>
                                </>
                            ) : (
                                <View className="w-full">
                                     <Text className="text-gray-900 font-bold mb-4 text-center">Send us a message</Text>
                                     <TextInput 
                                        placeholder="How can we help?"
                                        multiline
                                        numberOfLines={4}
                                        className="bg-gray-50 border border-gray-100 rounded-2xl p-4 h-32 text-gray-800"
                                        textAlignVertical="top"
                                     />
                                     <TouchableOpacity 
                                        className="bg-orange-500 py-4 rounded-2xl mt-6 items-center shadow-lg shadow-orange-200"
                                        onPress={() => setSelectedTab(null)}
                                     >
                                        <Text className="text-white font-bold">Send Email</Text>
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