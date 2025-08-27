import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TabButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-lg mx-1 ${
      isActive ? 'bg-[#1ABC9C]' : 'bg-transparent'
    }`}
  >
    <Ionicons name={icon} size={16} color={isActive ? 'white' : '#2C3E50'} />
    <Text className={`ml-2 font-medium text-sm ${isActive ? 'text-white' : 'text-[#2C3E50]'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);
