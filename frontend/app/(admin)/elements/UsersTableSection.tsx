import { User } from '@/types/types';
import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

interface UsersTableSectionProps {
  users: User[];
  loading?: boolean;
  onUserPress?: (user: User) => void;
  onApproveUser?: (userId: string) => void;
}

const UsersTableSection: React.FC<UsersTableSectionProps> = ({
  users,
  loading = false,
  onUserPress,
  onApproveUser
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
      <Text className="text-lg font-bold mb-2">All Users</Text>
      {users.map((user) => (
        <View
          key={user.id}
          className="py-2 border-b border-gray-200 flex-row justify-between items-center"
        >
          <TouchableOpacity onPress={() => onUserPress?.(user)} className="flex-1">
            <Text className="text-sm font-medium">
              {user.name} - {user.role}
              {user.displayId ? ` (${user.displayId})` : ''}
            </Text>
            <Text className="text-xs text-gray-500">{user.email}</Text>
            <Text className={`text-xs ${user.status === 'pending' ? 'text-orange-500' : 'text-green-500'}`}>
              Status: {user.status || 'Active'}
            </Text>
          </TouchableOpacity>

          {user.status === 'pending' && (
            <View className="flex-row gap-2">
              <Text className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded overflow-hidden">Pending</Text>
              {onApproveUser && (
                <TouchableOpacity
                  onPress={() => onApproveUser(user.id)}
                  className="bg-green-500 px-3 py-1 rounded"
                >
                  <Text className="text-white text-xs font-bold">Approve</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
};


export { UsersTableSection };
export default UsersTableSection;
