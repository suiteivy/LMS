import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { MessageService } from "@/services/MessageService";
import { format } from "date-fns";
import { router } from "expo-router";
import { ChevronRight, MessageCircle, Plus, Search, Send, User, X, Zap } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SubscriptionGate, AddonRequestButton } from "@/components/shared/SubscriptionComponents";

export default function MessagingPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const { profile, isDemo } = useAuth();

    useEffect(() => {
        fetchMessages();
    }, [isDemo]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            if (isDemo) {
                const mockMessages = [
                    { id: '1', sender_id: 'parent-1', receiver_id: 'teacher-1', subject: 'Homework Query', body: 'Hello, I wanted to ask about the math homework.', created_at: new Date().toISOString(), sender: { full_name: 'John Parent' }, receiver: { full_name: 'Sarah Teacher' } },
                    { id: '2', sender_id: 'teacher-1', receiver_id: 'parent-2', subject: 'Progress Update', body: 'Your child is doing great in science.', created_at: new Date().toISOString(), sender: { full_name: 'Sarah Teacher' }, receiver: { full_name: 'Mary Parent' } }
                ];
                setMessages(mockMessages);
                return;
            }
            const data = await MessageService.getMessages();
            setMessages(data || []);
        } catch (error) {
            console.error("Error fetching messages:", error);
            Alert.alert("Error", "Failed to fetch messages.");
        } finally {
            setLoading(false);
        }
    };

    const filteredMessages = messages.filter(msg => {
        const isCorrectTab = activeTab === 'received' 
            ? msg.receiver_id === profile?.id 
            : msg.sender_id === profile?.id;
        
        const matchesSearch = msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             msg.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        
        return isCorrectTab && matchesSearch;
    });

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Management"
                subtitle="Messaging"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />

            <SubscriptionGate 
                feature="messaging"
                fallback={
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="bg-orange-50 p-8 rounded-[40px] items-center border border-orange-100 border-dashed max-w-sm">
                            <Zap size={48} color="#FF6900" style={{ marginBottom: 20 }} />
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Messaging Locked</Text>
                            <Text className="text-gray-500 text-center mb-8 leading-5">
                                Advanced messaging features are not included in your current subscription plan.
                            </Text>
                            <AddonRequestButton onPress={() => { /* Handle request */ }} />
                        </View>
                    </View>
                }
            >
                <View className="flex-1">
                    <View className="px-4 md:px-8 mt-6">
                        <View className="flex-row bg-white dark:bg-navy-surface p-1.5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
                            <TouchableOpacity
                                onPress={() => setActiveTab('received')}
                                className={`flex-1 flex-row items-center justify-center py-3.5 rounded-2xl ${activeTab === 'received' ? 'bg-teacherOrange shadow-md' : ''}`}
                            >
                                <MessageCircle size={18} color={activeTab === 'received' ? 'white' : '#64748b'} />
                                <Text className={`ml-2 font-bold text-sm ${activeTab === 'received' ? 'text-white' : 'text-slate-500'}`}>Inbox</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('sent')}
                                className={`flex-1 flex-row items-center justify-center py-3.5 rounded-2xl ${activeTab === 'sent' ? 'bg-teacherBlack shadow-md' : ''}`}
                            >
                                <Send size={18} color={activeTab === 'sent' ? 'white' : '#64748b'} />
                                <Text className={`ml-2 font-bold text-sm ${activeTab === 'sent' ? 'text-white' : 'text-slate-500'}`}>Sent</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center bg-white dark:bg-navy-surface px-5 py-4 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
                            <Search size={20} color="#94a3b8" />
                            <TextInput
                                placeholder="Search by subject or name..."
                                placeholderTextColor="#94a3b8"
                                className="flex-1 ml-3 text-slate-900 dark:text-white font-medium"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                        ) : filteredMessages.length === 0 ? (
                            <View className="bg-white dark:bg-navy-surface p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
                                <MessageCircle size={48} color="#e2e8f0" style={{ opacity: 0.5 }} />
                                <Text className="text-slate-400 font-bold text-center mt-6">No messages found</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                                {filteredMessages.map((msg) => (
                                    <TouchableOpacity
                                        key={msg.id}
                                        onPress={() => {
                                            setSelectedMessage(msg);
                                            setModalVisible(true);
                                        }}
                                        className="bg-white dark:bg-navy-surface p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 flex-row items-center shadow-sm active:bg-slate-50 dark:active:bg-slate-900"
                                    >
                                        <View className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-navy-light items-center justify-center mr-4">
                                            <User size={22} color="#64748b" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-slate-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>{msg.subject}</Text>
                                            <Text className="text-slate-400 text-xs font-medium mt-1">
                                                {activeTab === 'received' ? `From: ${msg.sender?.full_name}` : `To: ${msg.receiver?.full_name}`}
                                            </Text>
                                        </View>
                                        <ChevronRight size={20} color="#cbd5e1" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </SubscriptionGate>

            <Modal animationType="slide" transparent visible={modalVisible}>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-navy rounded-t-[50px] p-8 pb-12 shadow-2xl">
                        <View className="flex-row justify-between items-start mb-8">
                            <View className="flex-1 pr-6">
                                <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-[3px] mb-2">Message Detail</Text>
                                <Text className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{selectedMessage?.subject}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="w-10 h-10 bg-slate-50 dark:bg-navy-light rounded-full items-center justify-center">
                                <X size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="max-h-96">
                            <Text className="text-slate-600 dark:text-slate-400 text-base leading-7">{selectedMessage?.body}</Text>
                        </ScrollView>
                        <View className="mt-8 pt-8 border-t border-slate-100 dark:border-gray-800">
                            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                Sent on {selectedMessage && format(new Date(selectedMessage.created_at), 'MMM d, yyyy h:mm a')}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
