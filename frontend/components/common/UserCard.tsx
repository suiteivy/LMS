import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseComponentProps, User } from '@/types/types';


interface UserCardProps extends BaseComponentProps {
  user: User;
  variant?: 'default' | 'compact' | 'detailed';
  onPress?: (user: User) => void;
  showActions?: boolean;
  onEditPress?: (user: User) => void;
  onDeletePress?: (user: User) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  variant = 'default',
  onPress,
  showActions = false,
  onEditPress,
  onDeletePress,
  className = "",
  testID
}) => {
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'teacher':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'student':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const getStatusColor = (status: string) => {
    return status.toLowerCase() === 'active'
      ? { bg: 'bg-green-100', text: 'text-green-800' }
      : { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  const roleColors = getRoleColor(user.role);
  const statusColors = getStatusColor(user.status);

  const handlePress = () => {
    onPress?.(user);
  };

  const handleEditPress = (e: any) => {
    e.stopPropagation();
    onEditPress?.(user);
  };

  const handleDeletePress = (e: any) => {
    e.stopPropagation();
    onDeletePress?.(user);
  };

  const renderAvatar = () => {
    if (user.avatar) {
      return (
        <Image
          source={{ uri: user.avatar }}
          className="w-10 h-10 rounded-full"
        />
      );
    }

    return (
      <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
        <Text className="text-gray-600 font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderCompactCard = () => (
    <View className="bg-white rounded-xl p-3 shadow-sm mb-2">
      <View className="flex-row items-center space-x-3 gap-2">
        {renderAvatar()}
        <View className="flex-1">
          <Text className="font-semibold text-gray-900" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {user.email} {user.displayId ? `• ${user.displayId}` : ''}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${roleColors.bg}`}>
          <Text className={`text-xs font-medium capitalize ${roleColors.text}`}>
            {user.role}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderDefaultCard = () => (
    <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center space-x-3 flex-1">
          {renderAvatar()}
          <View className="flex-1">
            <Text className="font-semibold text-gray-900" numberOfLines={1}>
              {user.name}
            </Text>
            <Text className="text-sm text-gray-500" numberOfLines={1}>
              {user.email} {user.displayId ? `• ${user.displayId}` : ''}
            </Text>
          </View>
        </View>

        {showActions && (
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={handleEditPress}
              className="p-2 rounded-full bg-gray-100"
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeletePress}
              className="p-2 rounded-full bg-red-100"
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row space-x-2">
          <View className={`px-2 py-1 rounded-full ${roleColors.bg}`}>
            <Text className={`text-xs font-medium capitalize ${roleColors.text}`}>
              {user.role}
            </Text>
          </View>
          <View className={`px-2 py-1 rounded-full ${statusColors.bg}`}>
            <Text className={`text-xs font-medium capitalize ${statusColors.text}`}>
              {user.status}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-400">
          Joined {new Date(user.joinDate).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderDetailedCard = () => (
    <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-row items-center space-x-4 flex-1">
          {renderAvatar()}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {user.name}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              {user.email} {user.displayId ? `• ${user.displayId}` : ''}
            </Text>
            {user.lastActive && (
              <Text className="text-xs text-gray-400 mt-1">
                Last active: {new Date(user.lastActive).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {showActions && (
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={handleEditPress}
              className="p-2 rounded-full bg-gray-100"
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeletePress}
              className="p-2 rounded-full bg-red-100"
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row space-x-3">
          <View className={`px-3 py-1 rounded-full ${roleColors.bg}`}>
            <Text className={`text-sm font-medium capitalize ${roleColors.text}`}>
              {user.role}
            </Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${statusColors.bg}`}>
            <Text className={`text-sm font-medium capitalize ${statusColors.text}`}>
              {user.status}
            </Text>
          </View>
        </View>

        <Text className="text-sm text-gray-500">
          Joined {new Date(user.joinDate).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderCard = () => {
    switch (variant) {
      case 'compact':
        return renderCompactCard();
      case 'detailed':
        return renderDetailedCard();
      default:
        return renderDefaultCard();
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className={className}
        testID={testID}
      >
        {renderCard()}
      </TouchableOpacity>
    );
  }

  return (
    <View className={className} testID={testID}>
      {renderCard()}
    </View>
  );
};