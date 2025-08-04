import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { User } from '../types';

interface UsersTableSectionProps {
  users: User[];
  loading?: boolean;
  onUserPress?: (user: User) => void;
}

export const UsersTableSection: React.FC<UsersTableSectionProps> = ({
  users,
  loading = false,
  onUserPress
}) => {
  if (loading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View className="mt-4 bg-white p-4 rounded-lg shadow">
      <Text className="text- ${claslg font-bold mb-2">All Users</Text>
      {users.map((user) => (
        <TouchableOpacity
          key={user.id}
          onPress={() => onUserPress?.(user)}
          className="py-2 border-b border-gray-200"
        >
          <Text className="text-sm font-medium">{user.name} - {user.role}</Text>
          <Text className="text-xs text-gray-500">{user.email}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
