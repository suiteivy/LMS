import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { ChevronLeft, Megaphone, BookOpen, User, Clock } from "lucide-react-native";
import { router } from "expo-router";
import { StudentService } from "@/services/StudentService";
import { format } from "date-fns";

interface Announcement {
    id: string;
    title: string;
    description: string;
    created_at: string;
    subjects?: {
        id: string;
        title: string;
        teacher_id: string;
        teachers?: {
            users?: {
                full_name: string;
            }
        }
    };
}

export default function StudentAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const data = await StudentService.getAnnouncements();
            setAnnouncements(data || []);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAnnouncements();
        setRefreshing(false);
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                    <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-gray-900">Announcements</Text>
                    <View className="w-10" />
                </View>
                <Text className="text-gray-500 text-sm text-center">Stay updated with your teachers</Text>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#FF6B00" className="mt-20" />
                ) : announcements.length > 0 ? (
                    announcements.map((item) => {
                        const isExpanded = expandedId === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                className="mb-3 bg-white rounded-3xl border border-gray-100 overflow-hidden"
                                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                                activeOpacity={0.7}
                            >
                                <View className="p-4">
                                    <View className="flex-row items-start">
                                        <View className="bg-orange-100 p-3 rounded-2xl mr-4">
                                            <Megaphone size={22} color="#FF6B00" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={isExpanded ? undefined : 2}>
                                                {item.title}
                                            </Text>

                                            {item.subjects && (
                                                <View className="flex-row items-center mb-2">
                                                    <BookOpen size={14} color="#9CA3AF" />
                                                    <Text className="text-gray-500 text-xs ml-1">{item.subjects.title}</Text>
                                                </View>
                                            )}

                                            <View className="flex-row items-center">
                                                {item.subjects?.teachers?.users?.full_name && (
                                                    <View className="flex-row items-center mr-4">
                                                        <User size={12} color="#9CA3AF" />
                                                        <Text className="text-gray-400 text-xs ml-1">{item.subjects.teachers.users.full_name}</Text>
                                                    </View>
                                                )}
                                                <View className="flex-row items-center">
                                                    <Clock size={12} color="#9CA3AF" />
                                                    <Text className="text-gray-400 text-xs ml-1">
                                                        {format(new Date(item.created_at), 'MMM dd, yyyy')}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {isExpanded && item.description && (
                                        <View className="mt-3 pt-3 border-t border-gray-100">
                                            <Text className="text-gray-600 text-sm leading-5">{item.description}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <View className="items-center py-20">
                        <Megaphone size={64} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-4 text-lg">No announcements yet</Text>
                        <Text className="text-gray-300 mt-1 text-sm">Check back later for updates from your teachers</Text>
                    </View>
                )}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
