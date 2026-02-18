import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, Bell, MessageSquare, Info, Calendar } from "lucide-react-native";
import { api } from "@/services/api";
import { format } from "date-fns";

export default function StudentAnnouncementsPage() {
    const { studentId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // We'll use a generic announcements endpoint if available, or fetch institutional ones
            const response = await api.get('/academic/announcements');
            setAnnouncements(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full w-10 mb-4">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Announcements</Text>
                <Text className="text-gray-500 text-sm mt-1">Institutional news and school updates</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {announcements.length > 0 ? (
                    announcements.map((item) => (
                        <View key={item.id} className="bg-white p-6 rounded-[2.5rem] mb-6 border border-gray-100 shadow-sm">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center">
                                    <View className="bg-orange-50 p-2 rounded-xl">
                                        <Bell size={18} color="#FF6B00" />
                                    </View>
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase ml-3">{format(new Date(item.created_at), 'MMM dd, yyyy')}</Text>
                                </View>
                                <View className="bg-orange-50 px-3 py-1 rounded-full">
                                    <Text className="text-[#FF6B00] font-bold text-[10px] uppercase">New</Text>
                                </View>
                            </View>

                            <Text className="text-xl font-bold text-gray-900 mb-2">{item.title}</Text>
                            <Text className="text-gray-600 leading-6 mb-6">{item.message}</Text>

                            <View className="pt-4 border-t border-gray-50 flex-row items-center">
                                <View className="bg-gray-100 p-2 rounded-full mr-3">
                                    <MessageSquare size={14} color="#6B7280" />
                                </View>
                                <Text className="text-gray-500 text-xs italic">Posted by {item.teacher?.user?.full_name || "Administration"}</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <View className="bg-gray-100 p-10 rounded-[40px] items-center">
                        <Bell size={48} color="#9CA3AF" />
                        <Text className="text-gray-400 mt-4 text-center">No announcements at the moment.</Text>
                    </View>
                )}

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
