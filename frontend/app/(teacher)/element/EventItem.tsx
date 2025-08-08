import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Event {
  title: string;
  date: string;
  type: 'live' | 'deadline' | 'meeting';
}

export const EventItem: React.FC<{ event: Event }> = ({ event }) => (
  <View className="p-3 border border-gray-100 rounded-lg mb-3">
    <View className="flex-row items-center mb-2">
      <View className={`w-2 h-2 rounded-full mr-2 ${
        event.type === 'live' ? 'bg-red-500' :
        event.type === 'deadline' ? 'bg-orange-500' :
        'bg-[#1ABC9C]'
      }`} />
      <Text className="text-sm font-medium text-[#2C3E50] flex-1">{event.title}</Text>
    </View>
    <View className="flex-row items-center ml-4">
      <Ionicons name="time" size={12} color="#6B7280" />
      <Text className="text-xs text-gray-500 ml-1">{event.date}</Text>
    </View>
  </View>
);
