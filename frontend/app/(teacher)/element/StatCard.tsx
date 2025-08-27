import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  change: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change }) => (
  <View className="bg-white rounded-xl p-4 shadow-sm flex-1 mx-1">
    <View className="flex-row items-center justify-between mb-3">
      <View className="p-3 bg-[#A1EBE5] rounded-lg">
        <Ionicons name={icon} size={20} color="#2C3E50" />
      </View>
      <Text className="text-sm font-medium text-[#1ABC9C]">{change}</Text>
    </View>
    <Text className="text-xl font-bold text-[#2C3E50] mb-1">{value}</Text>
    <Text className="text-gray-600 text-xs">{title}</Text>
  </View>
);
