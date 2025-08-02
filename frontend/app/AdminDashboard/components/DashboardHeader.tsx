import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

interface DashboardHeaderProps {
  onRefresh?: () => void;
  onLogout?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onRefresh,
  onLogout,
}) => {
  return (
    <View className="flex-row justify-between items-center mb-4">
      <Text className="text-2xl font-bold text-gray-800">Admin Dashboard</Text>
      <View className="flex-row space-x-3">
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh}>
         <Feather name="refresh-cw" size={24} color="black" />
          </TouchableOpacity>
        )}
        {onLogout && (
          <TouchableOpacity onPress={onLogout}>
         <Feather name="log-out" size={24} color="red" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
