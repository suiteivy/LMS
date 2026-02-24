import { ChevronDown, ChevronUp, LifeBuoy, Mail, MessageSquare, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    return (
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
                    <TouchableOpacity className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm">
                        <MessageSquare size={24} color="#0d9488" />
                        <Text className="mt-2 font-bold text-gray-800">Direct Support</Text>
                        <Text className="text-xs text-gray-400">Response in 1h</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="w-[48%] bg-white p-5 rounded-2xl border border-gray-100 items-center shadow-sm">
                        <Mail size={24} color="#3b82f6" />
                        <Text className="mt-2 font-bold text-gray-800">Email Admin</Text>
                        <Text className="text-xs text-gray-400">Response in 12h</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </ScrollView>
    );
}
