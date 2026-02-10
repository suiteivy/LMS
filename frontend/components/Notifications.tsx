import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Modal } from 'react-native';
import { Calendar, Clock, Bell, ArrowRight, BookOpen, Star, GraduationCap, Info, AlertCircle, CheckCircle, X } from 'lucide-react-native';
import { Pressable } from "react-native-gesture-handler";

interface NotificationProps {
  visible: boolean;
  onClose: () => void;
}

const Notifications = ({ visible, onClose }: NotificationProps) => {
  const mockNotifications = [
    { id: '1', title: 'Grade Updated', body: 'Your CS302 grade was posted.', type: 'info', time: '2m ago' },
    { id: '2', title: 'New Message', body: 'Prof. Smith sent a new announcement.', type: 'success', time: '1h ago' },
    { id: '3', title: 'Attendance Alert', body: 'You were marked absent in DS101.', type: 'warning', time: '5h ago' },
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        
        {/* Pane Container */}
        <View className="mt-20 flex-1 bg-white rounded-t-[40px] shadow-2xl overflow-hidden">
          
          {/* Pane Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">Notifications</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <X size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          <ScrollView className="flex-1 p-4">
            {mockNotifications.map((item) => (
              <View key={item.id} className="flex-row p-4 mb-3 bg-gray-50 rounded-2xl border border-gray-100">
                <View className="mr-3 mt-1">
                  {item.type === 'info' && <Info size={18} color="#3b82f6" />}
                  {item.type === 'success' && <CheckCircle size={18} color="#10b981" />}
                  {item.type === 'warning' && <AlertCircle size={18} color="#f59e0b" />}
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="font-bold text-gray-900">{item.title}</Text>
                    <Text className="text-[10px] text-gray-400 font-bold uppercase">{item.time}</Text>
                  </View>
                  <Text className="text-gray-500 text-sm leading-5">{item.body}</Text>
                </View>
              </View>
            ))}

            {/* Empty State Link */}
            <TouchableOpacity className="mt-4 items-center">
              <Text className="text-teal-600 font-bold">Mark all as read</Text>
            </TouchableOpacity>
          </ScrollView>

        </View>
      </Pressable>
    </Modal>
  );
};

export default Notifications
