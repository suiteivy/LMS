import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { MessageService } from "@/services/MessageService";
import { format } from "date-fns";
import { router } from "expo-router";
import { Mail, MessageCircle, Plus, Search, Send, User, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function StudentMessagingPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [composeModal, setComposeModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
    const [messageContent, setMessageContent] = useState("");
    const [sending, setSending] = useState(false);

    // Listen to realtime changes on the messages table
    useRealtimeQuery('messages', () => {
        if (!loading && !composeModal) {
            fetchMessages();
        }
    });

    useEffect(() => {
        fetchMessages();
    }, [activeTab]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await MessageService.getMessages(activeTab);
            setMessages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 2) {
            try {
                const results = await MessageService.searchUsers(text);
                setSearchResults(results);
            } catch (error) {
                console.error(error);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedReceiver || !messageContent.trim()) {
            Alert.alert("Error", "Please select a recipient and enter a message");
            return;
        }
        try {
            setSending(true);
            await MessageService.sendMessage(selectedReceiver.id, messageContent);
            Alert.alert("Success", "Message sent successfully");
            setComposeModal(false);
            setMessageContent("");
            setSelectedReceiver(null);
            if (activeTab === 'sent') fetchMessages();
        } catch (error) {
            Alert.alert("Error", "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Intelligence"
                subtitle="Portal"
                role="Student"
                onBack={() => router.back()}
            />

            <View className="p-4 md:p-8">
                {/* Header Action Row */}
                <View className="flex-row justify-between items-center mb-6 px-2">
                    <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tighter">Communications</Text>
                    <TouchableOpacity
                        onPress={() => setComposeModal(true)}
                        className="bg-gray-900 w-12 h-12 rounded-2xl items-center justify-center shadow-lg active:bg-gray-800"
                    >
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Tab Switcher */}
                <View className="flex-row bg-white dark:bg-[#1a1a1a] p-1.5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
                    <TouchableOpacity
                        className={`flex-1 py-3.5 rounded-2xl items-center ${activeTab === 'inbox' ? 'bg-[#FF6900]' : ''}`}
                        onPress={() => setActiveTab('inbox')}
                    >
                        <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'inbox' ? 'text-white' : 'text-gray-400'}`}>Inbox</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-3.5 rounded-2xl items-center ${activeTab === 'sent' ? 'bg-gray-900' : ''}`}
                        onPress={() => setActiveTab('sent')}
                    >
                        <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'sent' ? 'text-white' : 'text-gray-400'}`}>Sent Items</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 200 }}
                    >
                        {messages.length > 0 ? (
                            messages.map((item) => {
                                const interlocutor = activeTab === 'inbox' ? item.sender : item.receiver;
                                const isUnread = !item.is_read && activeTab === 'inbox';
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        activeOpacity={0.7}
                                        className={`p-5 mb-4 rounded-[32px] bg-white dark:bg-[#1a1a1a] border border-gray-50 dark:border-gray-800 shadow-sm flex-row items-center active:bg-gray-50 ${isUnread ? 'border-orange-100 dark:border-orange-900 bg-orange-50/30 dark:bg-orange-950/20' : ''}`}
                                        onPress={() => {
                                            if (isUnread) {
                                                MessageService.markAsRead(item.id);
                                                fetchMessages();
                                            }
                                            Alert.alert(item.subject || "Message", item.content);
                                        }}
                                    >
                                        <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${isUnread ? 'bg-orange-100' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                            <User size={24} color={isUnread ? "#FF6900" : "#9CA3AF"} />
                                        </View>
                                        <View className="flex-1">
                                            <View className="flex-row justify-between items-center mb-1">
                                                <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">{interlocutor?.full_name}</Text>
                                                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                                    {format(new Date(item.created_at), 'MMM dd')}
                                                </Text>
                                            </View>
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium" numberOfLines={1}>{item.content}</Text>
                                        </View>
                                        {isUnread && <View className="w-2 h-2 rounded-full bg-[#FF6900] ml-3" />}
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View className="bg-white dark:bg-[#1a1a1a] p-20 rounded-[48px] items-center border border-gray-100 dark:border-gray-700 border-dashed mt-8">
                                <MessageCircle size={64} color="#E5E7EB" style={{ opacity: 0.3 }} />
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">Secure Thread Empty</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            <Modal visible={composeModal} animationType="slide" transparent={true}>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#111] h-[85%] rounded-t-[50px] p-8 pb-12">
                        <View className="flex-row justify-between items-center mb-10">
                            <Text className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Draft Message</Text>
                            <TouchableOpacity onPress={() => setComposeModal(false)} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full items-center justify-center">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-8">
                            {!selectedReceiver ? (
                                <View className="bg-gray-50 dark:bg-gray-800 p-4 rounded-[32px] border border-gray-100 dark:border-gray-700">
                                    <View className="flex-row items-center px-4 mb-2">
                                        <Search size={18} color="#9CA3AF" />
                                        <TextInput
                                            className="flex-1 ml-3 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-widest"
                                            placeholder="Find recipient..."
                                            placeholderTextColor="#9CA3AF"
                                            value={searchQuery}
                                            onChangeText={handleSearch}
                                        />
                                    </View>
                                    <FlatList
                                        data={searchResults}
                                        keyExtractor={(item) => item.id}
                                        className="mt-2"
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                className="flex-row items-center p-4 border-t border-gray-100 dark:border-gray-700"
                                                onPress={() => setSelectedReceiver(item)}
                                            >
                                                <View className="w-10 h-10 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm items-center justify-center mr-3">
                                                    <User size={18} color="#FF6900" />
                                                </View>
                                                <View>
                                                    <Text className="text-gray-900 dark:text-white font-bold text-sm">{item.full_name}</Text>
                                                    <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-widest">{item.role}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        style={{ maxHeight: 200 }}
                                    />
                                </View>
                            ) : (
                                <View className="bg-orange-50 p-6 rounded-[32px] flex-row items-center border border-orange-100">
                                    <View className="w-12 h-12 bg-white rounded-2xl shadow-sm items-center justify-center mr-4">
                                        <Mail size={22} color="#FF6900" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">{selectedReceiver.full_name}</Text>
                                        <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest mt-0.5">{selectedReceiver.role}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSelectedReceiver(null)}
                                        className="bg-white/50 dark:bg-white/10 px-3 py-1.5 rounded-full"
                                    >
                                        <Text className="text-orange-600 dark:text-orange-400 font-bold text-[10px] uppercase">Change</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-700">
                            <TextInput
                                className="flex-1 text-gray-900 dark:text-white text-base font-medium"
                                placeholder="Composition zone..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                textAlignVertical="top"
                                value={messageContent}
                                onChangeText={setMessageContent}
                            />
                        </View>

                        <TouchableOpacity
                            className={`mt-8 p-6 rounded-[32px] flex-row justify-center items-center shadow-xl active:bg-gray-800 ${sending ? 'bg-gray-300 shadow-none' : 'bg-gray-900'}`}
                            onPress={handleSendMessage}
                            disabled={sending}
                        >
                            {sending ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Text className="text-white font-bold text-lg tracking-tight mr-3">Transmit Message</Text>
                                    <Send size={20} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
