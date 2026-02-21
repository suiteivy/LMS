import { UserCard } from '@/components/common/UserCard';
import { User } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface RecentUsersSectionProps {
  users?: User[];
  loading?: boolean;
  maxUsers?: number;
  onUserPress?: (user: User) => void;
  onViewAllPress?: () => void;
}

const RecentUsersSection: React.FC<RecentUsersSectionProps> = ({
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
        <View key={index} className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-transparent dark:border-gray-800">
          <View className="animate-pulse flex-row space-x-3">
            <View className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></View>
            <View className="flex-1 space-y-2">
              <View className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></View>
              <View className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 shadow-sm border border-transparent dark:border-gray-800">
      <View className="items-center">
        <Ionicons name="people-outline" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 dark:text-gray-400 mt-2">No recent users</Text>
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
        <Text className="text-xl font-semibold text-gray-900 dark:text-white">
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

export { RecentUsersSection };
export default RecentUsersSection;
