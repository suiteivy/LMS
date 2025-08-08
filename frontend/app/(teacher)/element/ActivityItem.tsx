import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Activity {
  type: 'enrollment' | 'completion' | 'question' | 'review';
  message: string;
  time: string;
}

export const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const icons: Record<Activity['type'], string> = {
    enrollment: 'person-add',
    completion: 'checkmark-circle',
    question: 'help-circle',
    review: 'star',
  };

  const colors: Record<Activity['type'], string> = {
    enrollment: '#A1EBE5',
    completion: '#10B981',
    question: '#3B82F6',
    review: '#F59E0B',
  };

  return (
    <View className="flex-row items-start p-4 border-b border-gray-100">
      <View className="p-2 rounded-lg mr-3" style={{ backgroundColor: colors[activity.type] + '20' }}>
        <Ionicons name={icons[activity.type]} size={16} color={colors[activity.type]} />
      </View>
      <View className="flex-1">
        <Text className="text-[#2C3E50] font-medium text-sm">{activity.message}</Text>
        <Text className="text-gray-500 text-xs mt-1">{activity.time}</Text>
      </View>
    </View>
  );
};
