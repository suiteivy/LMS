import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { MessageService } from "@/services/MessageService";
import { format } from "date-fns";
import { router } from "expo-router";
import { ChevronRight, MessageCircle, Plus, Search, Send, User, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function MessagingPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [composeModal, setComposeModal] = useState(false);

    // Compose State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
    const [messageContent, setMessageContent] = useState("");
    const [sending, setSending] = useState(false);

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
            setSearchQuery("");
            setSearchResults([]);
            if (activeTab === 'sent') fetchMessages();
        } catch (error) {
            Alert.alert("Error", "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const renderMessageItem = (item: any) => {
        const interlocutor = activeTab === 'inbox' ? item.sender : item.receiver;
        return (
            <TouchableOpacity
                key={item.id}
                className={`flex-row items-center p-5 mb-4 rounded-3xl border shadow-sm ${!item.is_read && activeTab === 'inbox' ? 'bg-white dark:bg-[#1a1a1a] border-orange-100 dark:border-orange-950/20' : 'bg-white dark:bg-[#1a1a1a] border-gray-50 dark:border-gray-800'}`}
                onPress={() => {
                    if (!item.is_read && activeTab === 'inbox') {
                        MessageService.markAsRead(item.id);
                        fetchMessages();
                    }
                    Alert.alert(item.subject || "Message", item.content);
                }}
            >
                <View className={`p-3 rounded-2xl mr-4 ${!item.is_read && activeTab === 'inbox' ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <User size={24} color={!item.is_read && activeTab === 'inbox' ? "#FF6900" : "#6B7280"} />
                </View>
                <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className={`text-base tracking-tight ${!item.is_read && activeTab === 'inbox' ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>{interlocutor?.full_name}</Text>
                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">{format(new Date(item.created_at), 'MMM dd')}</Text>
                    </View>
                    <Text className="text-gray-400 dark:text-gray-500 text-sm font-medium" numberOfLines={1}>{item.content}</Text>
                </View>
                {!item.is_read && activeTab === 'inbox' && (
                    <View className="w-2.5 h-2.5 bg-[#FF6900] rounded-full ml-4 shadow-sm" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Communications"
                subtitle="Messaging"
                role="Teacher"
                onBack={() => router.back()}
            />

            <View className="px-4 md:px-8 mt-6">
                <View className="flex-row bg-white dark:bg-[#1a1a1a] p-1.5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
                    <TouchableOpacity
                        className={`flex-1 py-3.5 rounded-2xl items-center ${activeTab === 'inbox' ? 'bg-[#FF6900]' : ''}`}
                        onPress={() => setActiveTab('inbox')}
                    >
                        <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'inbox' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>Inbox</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-3.5 rounded-2xl items-center ${activeTab === 'sent' ? 'bg-gray-900 dark:bg-gray-800' : ''}`}
                        onPress={() => setActiveTab('sent')}
                    >
                        <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'sent' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>Sent</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 px-4 md:px-8" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-20" />
                ) : messages.length > 0 ? (
                    messages.map(renderMessageItem)
                ) : (
                    <View className="bg-white dark:bg-[#1a1a1a] p-16 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-10">
                        <MessageCircle size={64} color="#E5E7EB" style={{ opacity: 0.3 }} />
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">Your inbox is clear.</Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                onPress={() => setComposeModal(true)}
                className="absolute bottom-10 right-8 w-16 h-16 bg-gray-900 dark:bg-[#1a1a1a] rounded-full items-center justify-center shadow-2xl border border-transparent dark:border-gray-800"
            >
                <Plus size={32} color="white" />
            </TouchableOpacity>

            <Modal visible={composeModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#121212] h-[90%] rounded-t-[40px] p-8 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Compose</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                                onPress={() => setComposeModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Search Recipient */}
                        {!selectedReceiver ? (
                            <View className="mb-6">
                                <View className="flex-row items-center bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-4">
                                    <Search size={20} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-4 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-widest"
                                        placeholder="Search faculty or students..."
                                        placeholderTextColor="#9CA3AF"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                    />
                                </View>
                                <ScrollView className="max-h-60" showsVerticalScrollIndicator={false}>
                                    {searchResults.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            className="flex-row items-center p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl mb-2 border border-gray-50 dark:border-gray-800"
                                            onPress={() => setSelectedReceiver(item)}
                                        >
                                            <View className="bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl mr-4">
                                                <User size={18} color="#6B7280" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{item.full_name}</Text>
                                                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">{item.role}</Text>
                                            </View>
                                            <ChevronRight size={16} color="#D1D5DB" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : (
                            <View className="flex-row items-center bg-orange-50 dark:bg-orange-950/20 p-6 rounded-3xl mb-8 border border-orange-100 dark:border-orange-900">
                                <View className="bg-[#FF6900] p-3 rounded-2xl mr-4 shadow-sm">
                                    <User size={20} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">{selectedReceiver.full_name}</Text>
                                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">{selectedReceiver.role}</Text>
                                </View>
                                <TouchableOpacity
                                    className="bg-white/50 dark:bg-white/10 px-4 py-2 rounded-xl"
                                    onPress={() => setSelectedReceiver(null)}
                                >
                                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">Edit</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View className="flex-1">
                            <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-[2px] ml-2 mb-2">Message Content</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] p-6 rounded-[32px] text-gray-900 dark:text-white font-medium text-base h-full border border-gray-100 dark:border-gray-800"
                                placeholder="Write your message..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                textAlignVertical="top"
                                value={messageContent}
                                onChangeText={setMessageContent}
                            />
                        </View>

                        <TouchableOpacity
                            className={`mt-8 py-5 rounded-[24px] shadow-lg flex-row justify-center items-center ${sending ? 'bg-gray-100' : 'bg-[#FF6900]'}`}
                            onPress={handleSendMessage}
                            disabled={sending}
                        >
                            {sending ? <ActivityIndicator color="#9CA3AF" /> : (
                                <>
                                    <Text className="text-white font-bold text-lg mr-3">Send</Text>
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
