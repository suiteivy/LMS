import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Modal } from 'react-native';
import { Calendar, Clock, Bell, ArrowRight, BookOpen, Star, GraduationCap, Info, AlertCircle, CheckCircle, X } from 'lucide-react-native';
import { Pressable } from "react-native-gesture-handler";

interface NotificationProps {
  visible: boolean;
  onClose: () => void;
}

import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/NotificationContext';

const Notifications = ({ visible, onClose }: NotificationProps) => {
  const { notifications, unreadCount, markAllAsRead, refreshNotifications, loading } = useNotifications();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      onShow={refreshNotifications}
    >
      {/* Backdrop */}
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>

        {/* Pane Container */}
        <View className="mt-20 flex-1 bg-white rounded-t-[40px] shadow-2xl overflow-hidden">

          {/* Pane Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-gray-900">Notifications</Text>
              {unreadCount > 0 && (
                <View className="bg-red-500 px-2 py-0.5 rounded-full">
                  <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <X size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          <ScrollView className="flex-1 p-4">
            {loading && notifications.length === 0 ? (
              <View className="p-4 items-center"><Text className="text-gray-400">Loading...</Text></View>
            ) : notifications.length === 0 ? (
              <View className="p-8 items-center">
                <Bell size={48} color="#e5e7eb" />
                <Text className="text-gray-400 mt-4 text-center">No notifications yet</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View key={item.id} className={`flex-row p-4 mb-3 rounded-2xl border ${item.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'}`}>
                  <View className="mr-3 mt-1">
                    {item.type === 'info' && <Info size={18} color="#3b82f6" />}
                    {item.type === 'success' && <CheckCircle size={18} color="#10b981" />}
                    {item.type === 'warning' && <AlertCircle size={18} color="#f59e0b" />}
                    {item.type === 'error' && <AlertCircle size={18} color="#ef4444" />}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={`font-bold ${item.is_read ? 'text-gray-900' : 'text-blue-900'}`}>{item.title}</Text>
                      <Text className="text-[10px] text-gray-400 font-bold uppercase">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-sm leading-5">{item.message}</Text>
                  </View>
                </View>
              ))
            )}

            {/* Empty State Link */}
            {notifications.length > 0 && (
              <TouchableOpacity className="mt-4 mb-8 items-center" onPress={markAllAsRead}>
                <Text className="text-teal-600 font-bold">Mark all as read</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

        </View>
      </Pressable>
    </Modal>
  );
};

export default Notifications
