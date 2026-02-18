import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, FlatList } from "react-native";
import { MessageService } from "@/services/MessageService";
import { ChevronLeft, Plus, Search, Send, User, MessageCircle } from "lucide-react-native";
import { format } from "date-fns";
import { router } from "expo-router";

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
                className={`flex-row items-center p-4 mb-3 rounded-3xl bg-white border ${!item.is_read && activeTab === 'inbox' ? 'border-orange-200 bg-orange-50' : 'border-gray-100'}`}
                onPress={() => {
                    if (!item.is_read && activeTab === 'inbox') {
                        MessageService.markAsRead(item.id);
                        fetchMessages();
                    }
                    // Show full message modal or navigation
                    Alert.alert(item.subject || "Message", item.content);
                }}
            >
                <View className="bg-gray-100 p-3 rounded-2xl mr-4">
                    <User size={24} color="#6B7280" />
                </View>
                <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-gray-900 font-bold text-base">{interlocutor?.full_name}</Text>
                        <Text className="text-gray-400 text-xs">{format(new Date(item.created_at), 'MMM dd, HH:mm')}</Text>
                    </View>
                    <Text className="text-gray-500 text-sm" numberOfLines={1}>{item.content}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-gray-900">Messages</Text>
                    <TouchableOpacity onPress={() => setComposeModal(true)} className="bg-[#FF6B00] p-2 rounded-full">
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View className="flex-row bg-gray-100 p-1 rounded-2xl">
                    <TouchableOpacity
                        className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'inbox' ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setActiveTab('inbox')}
                    >
                        <Text className={`font-bold ${activeTab === 'inbox' ? 'text-[#FF6B00]' : 'text-gray-500'}`}>Inbox</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'sent' ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setActiveTab('sent')}
                    >
                        <Text className={`font-bold ${activeTab === 'sent' ? 'text-[#FF6B00]' : 'text-gray-500'}`}>Sent</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-4">
                {loading ? (
                    <ActivityIndicator size="large" color="#FF6B00" className="mt-20" />
                ) : messages.length > 0 ? (
                    messages.map(renderMessageItem)
                ) : (
                    <View className="items-center py-20">
                        <MessageCircle size={64} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-4 text-lg">No messages yet</Text>
                    </View>
                )}
                <View className="h-20" />
            </ScrollView>

            {/* Compose Modal */}
            <Modal
                visible={composeModal}
                animationType="slide"
                transparent={true}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white h-[85%] rounded-t-[40px] px-6 pt-8">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-gray-900">New Message</Text>
                            <TouchableOpacity onPress={() => setComposeModal(false)}>
                                <Text className="text-gray-500 font-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Recipient */}
                        {!selectedReceiver ? (
                            <View>
                                <View className="flex-row items-center bg-gray-100 px-4 py-3 rounded-2xl mb-4">
                                    <Search size={20} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900 font-medium"
                                        placeholder="Search recipient..."
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                    />
                                </View>
                                <FlatList
                                    data={searchResults}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            className="flex-row items-center p-3 border-b border-gray-50"
                                            onPress={() => setSelectedReceiver(item)}
                                        >
                                            <View className="bg-gray-100 p-2 rounded-xl mr-3">
                                                <User size={20} color="#6B7280" />
                                            </View>
                                            <View>
                                                <Text className="text-gray-900 font-bold">{item.full_name}</Text>
                                                <Text className="text-gray-400 text-xs capitalize">{item.role}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    style={{ maxHeight: 200 }}
                                />
                            </View>
                        ) : (
                            <View className="flex-row items-center bg-orange-50 p-4 rounded-2xl mb-4 border border-orange-100">
                                <View className="bg-orange-200 p-2 rounded-xl mr-3">
                                    <User size={20} color="#FF6B00" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold">{selectedReceiver.full_name}</Text>
                                    <Text className="text-orange-600 text-xs capitalize">{selectedReceiver.role}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedReceiver(null)}>
                                    <Text className="text-gray-400 font-bold">Change</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Content */}
                        <TextInput
                            className="bg-gray-50 p-6 rounded-3xl text-gray-900 text-lg min-h-[200px]"
                            placeholder="Type your message here..."
                            multiline
                            textAlignVertical="top"
                            value={messageContent}
                            onChangeText={setMessageContent}
                        />

                        <TouchableOpacity
                            className={`mt-6 py-4 rounded-2xl flex-row justify-center items-center ${sending ? 'bg-gray-300' : 'bg-[#FF6B00]'}`}
                            onPress={handleSendMessage}
                            disabled={sending}
                        >
                            {sending ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Text className="text-white font-bold text-lg mr-2">Send Message</Text>
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
