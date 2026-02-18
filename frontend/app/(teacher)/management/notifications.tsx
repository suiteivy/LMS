import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { ArrowLeft, Bell, Calendar, CheckCircle, Info, AlertCircle, Trash2 } from 'lucide-react-native';
import { router } from "expo-router";
import { NotificationAPI } from "@/services/NotificationService";
import { formatDistanceToNow } from 'date-fns';

export default function TeacherNotifications() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    const getIcon = (type: string) => {
        switch (type) {
            case 'announcement': return <Info size={18} color="#3b82f6" />;
            case 'assignment': return <Calendar size={18} color="#8b5cf6" />;
            case 'alert': return <AlertCircle size={18} color="#f43f5e" />;
            default: return <Bell size={18} color="#9CA3AF" />;
        }
    };

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <View className="p-4 flex-row items-center justify-between bg-white border-b border-gray-100">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-2">
                            <ArrowLeft size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-gray-900">Notifications</Text>
                    </View>
                    {notifications.some(n => !n.is_read) && (
                        <TouchableOpacity onPress={markAllAsRead}>
                            <Text className="text-teacherOrange font-bold text-xs">Mark all as read</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#FF6B00" />
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1"
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} />}
                        contentContainerStyle={{ padding: 16 }}
                    >
                        {notifications.length === 0 ? (
                            <View className="items-center justify-center py-20">
                                <Bell size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4 text-base font-medium">No notifications yet</Text>
                            </View>
                        ) : (
                            notifications.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => !item.is_read && markAsRead(item.id)}
                                    className={`p-4 rounded-2xl mb-3 flex-row items-start border ${item.is_read ? 'bg-white border-gray-50' : 'bg-orange-50 border-orange-100'}`}
                                >
                                    <View className={`p-2 rounded-xl mr-3 ${item.is_read ? 'bg-gray-100' : 'bg-white'}`}>
                                        {getIcon(item.type)}
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-base ${item.is_read ? 'text-gray-600' : 'text-gray-900 font-bold'}`}>
                                            {item.title}
                                        </Text>
                                        <Text className="text-gray-500 text-sm mt-1">{item.message}</Text>
                                        <Text className="text-gray-400 text-[10px] mt-2 font-medium">
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                        </Text>
                                    </View>
                                    {!item.is_read && (
                                        <View className="w-2 h-2 bg-teacherOrange rounded-full mt-2" />
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>
        </>
    );
}
