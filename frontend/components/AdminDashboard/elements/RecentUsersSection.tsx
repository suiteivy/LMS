import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types/types';
import { UserCard } from '@/components/common/UserCard';

interface RecentUsersSectionProps {
  users?: User[];
  loading?: boolean;
  maxUsers?: number;
  onUserPress?: (user: User) => void;
  onViewAllPress?: () => void;
}

export const RecentUsersSection: React.FC<RecentUsersSectionProps> = ({
  users = [],
  loading = false,
  maxUsers = 5,
  onUserPress,
  onViewAllPress
}) => {
  const displayUsers = users.slice(0, maxUsers);

  const handleUserPress = (user: User) => {
    onUserPress?.(user);
  };

  const renderLoadingState = () => (
    <View className="space-y-3">
      {[...Array(3)].map((_, index) => (
        <View key={index} className="bg-white rounded-xl p-4 shadow-sm">
          <View className="animate-pulse flex-row space-x-3">
            <View className="w-10 h-10 bg-gray-200 rounded-full"></View>
            <View className="flex-1 space-y-2">
              <View className="h-3 bg-gray-200 rounded w-3/4"></View>
              <View className="h-3 bg-gray-200 rounded w-1/2"></View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View className="bg-white rounded-xl p-8 shadow-sm">
      <View className="items-center">
        <Ionicons name="people-outline" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-2">No recent users</Text>
      </View>
    </View>
  );

  const renderUsersList = () => (
    <>
      {displayUsers.map(user => (
        <UserCard 
          key={user.id} 
          user={user} 
          variant="compact"
          onPress={handleUserPress}
        />
      ))}
    </>
  );

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-gray-900">
          Recent Users
        </Text>
        
        {onViewAllPress && (
          <TouchableOpacity 
            onPress={onViewAllPress}
            activeOpacity={0.7}
          >
            <Text className="text-blue-600 font-medium">
              View All
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? renderLoadingState() : 
       displayUsers.length > 0 ? renderUsersList() : 
       renderEmptyState()}
    </View>
  );
};