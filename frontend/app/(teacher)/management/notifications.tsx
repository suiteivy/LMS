import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { NotificationAPI } from "@/services/NotificationService";
import { formatDistanceToNow } from 'date-fns';
import { router } from "expo-router";
import { AlertCircle, Bell, Calendar, CheckCircle2, Info } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";

export default function TeacherNotifications() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Listen to realtime changes on the notifications table
    useRealtimeQuery('notifications', () => {
        if (!loading && !refreshing) {
            fetchNotifications();
        }
    });

    const fetchNotifications = async () => {
        try {
            const data = await NotificationAPI.getUserNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id: string) => {
        try {
            await NotificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await NotificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const getIcon = (type: string, isRead: boolean) => {
        const color = isRead ? "#9CA3AF" : "#FF6900";
        switch (type) {
            case 'announcement': return <Info size={18} color={color} />;
            case 'assignment': return <Calendar size={18} color={color} />;
            case 'alert': return <AlertCircle size={18} color={color} />;
            default: return <Bell size={18} color={color} />;
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <View className="flex-1 bg-gray-50">
            <UnifiedHeader
                title="Updates"
                subtitle="Notifications"
                role="Teacher"
                onBack={() => router.back()}
            />
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF6900" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4 md:p-8">
                        {/* Header Actions */}
                        <View className="flex-row justify-between items-center mb-8 px-2">
                            <View>
                                <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                                    {unreadCount} unread notifications
                                </Text>
                            </View>
                            {unreadCount > 0 && (
                                <TouchableOpacity
                                    className="flex-row items-center bg-white px-5 py-2.5 rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50"
                                    onPress={markAllAsRead}
                                >
                                    <CheckCircle2 size={16} color="#FF6900" />
                                    <Text className="text-[#FF6900] font-bold text-xs ml-2 uppercase tracking-widest">Mark All</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {notifications.length === 0 ? (
                            <View className="bg-white p-12 rounded-[40px] items-center border border-gray-100 border-dashed mt-10">
                                <Bell size={48} color="#E5E7EB" />
                                <Text className="text-gray-400 font-bold text-center mt-6 tracking-tight">Stay tuned for updates!</Text>
                            </View>
                        ) : (
                            notifications.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => !item.is_read && markAsRead(item.id)}
                                    className={`p-6 rounded-[32px] mb-4 flex-row items-start border shadow-sm ${item.is_read ? 'bg-white border-gray-50' : 'bg-white border-orange-100'}`}
                                >
                                    <View className={`p-3 rounded-2xl mr-4 ${item.is_read ? 'bg-gray-50' : 'bg-orange-50'}`}>
                                        {getIcon(item.type, item.is_read)}
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row justify-between items-start mb-1">
                                            <Text className={`text-base flex-1 leading-tight ${item.is_read ? 'text-gray-500 font-medium' : 'text-gray-900 font-bold'}`} numberOfLines={2}>
                                                {item.title}
                                            </Text>
                                            {!item.is_read && (
                                                <View className="w-2 h-2 bg-[#FF6900] rounded-full mt-1.5 ml-2 shadow-sm" />
                                            )}
                                        </View>
                                        <Text className={`text-sm mt-1 mb-3 ${item.is_read ? 'text-gray-400 font-medium' : 'text-gray-600 font-bold'}`} numberOfLines={2}>
                                            {item.message}
                                        </Text>
                                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
