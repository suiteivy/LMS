import { BaseComponentProps, User } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';



interface UserCardProps extends BaseComponentProps {
  user: User;
  variant?: 'default' | 'compact' | 'detailed';
  onPress?: (user: User) => void;
  showActions?: boolean;
  onEditPress?: (user: User) => void;
  onDeletePress?: (user: User) => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  variant = 'default',
  onPress,
  showActions = false,
  onEditPress,
  onDeletePress,
  showBackButton = false,
  onBackPress,
  className = "",
  testID
}) => {
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: 'shield' };
      case 'teacher':
        return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: 'school' };
      case 'student':
        return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', icon: 'person' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', icon: 'help' };
    }
  };

  const roleColors = getRoleColor(user.role);

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

  const renderAvatar = (size: number = 12) => {
    const sizeClass = `w-${size} h-${size}`;
    if (user.avatar) {
      return (
        <Image
          source={{ uri: user.avatar }}
          className={`${sizeClass} rounded-2xl`}
        />
      );
    }

    return (
      <View className={`${sizeClass} rounded-2xl bg-gray-100 items-center justify-center border border-gray-200`}>
        <Text className="text-gray-500 font-bold text-lg">
          {user.name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderBackButton = () => {
    if (!showBackButton) return null;
    return (
      <TouchableOpacity 
        onPress={onBackPress}
        className="absolute -left-2 top-1/2 -mt-5 w-10 h-10 items-center justify-center z-10"
      >
        <Ionicons name="chevron-back" size={24} color="#1F2937" />
      </TouchableOpacity>
    );
  };

  const renderCompactCard = () => (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
      <View className="flex-row items-center gap-4">
        {renderAvatar(12)}
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-900 leading-tight mb-1" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-sm text-gray-500 font-medium" numberOfLines={1}>
            {user.displayId || user.email}
          </Text>
        </View>
        <View className={`px-3 py-1.5 rounded-xl border ${roleColors.bg} ${roleColors.border}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-wider ${roleColors.text}`}>
            {user.role}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderDefaultCard = () => (
    <View className="bg-white rounded-[24px] shadow-sm border border-gray-50 mb-3 overflow-hidden">
      <View className="p-5">
        <View className="flex-row items-center justify-between">
          {/* Left: Avatar + Info */}
          <View className={`flex-row items-center flex-1 ${showBackButton ? 'pl-8' : ''}`}>
            {renderBackButton()}
            <View className="flex-row items-center gap-4 flex-1">
              {renderAvatar(14)}
              <View className="flex-1">
                <Text className="font-bold text-lg text-gray-900 leading-snug" numberOfLines={1}>
                  {user.name}
                </Text>
                <Text className="text-gray-500 font-medium text-xs leading-none mt-1" numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Role + Date + Actions */}
          <View className="flex-row items-center gap-4">
            <View className="items-end gap-1.5">
              <View className={`px-2.5 py-1 rounded-lg border ${roleColors.bg} ${roleColors.border}`}>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${roleColors.text}`}>
                  {user.role}
                </Text>
              </View>
              <Text className="text-[10px] font-bold text-gray-400">
                {new Date(user.joinDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>

            {showActions && (
              <View className="flex-row gap-1.5">
                <TouchableOpacity
                  onPress={handleEditPress}
                  className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeletePress}
                  className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderDetailedCard = () => (
    <View className="bg-white rounded-[24px] shadow-md shadow-gray-100 border border-gray-50 mb-4 overflow-hidden">
      <View className="p-6">
        <View className="flex-row items-center justify-between">
          {/* Left: Enhanced Avatar + Detailed Info */}
          <View className={`flex-row items-center flex-1 ${showBackButton ? 'pl-10' : ''}`}>
            {renderBackButton()}
            <View className="flex-row items-center gap-5 flex-1">
              {renderAvatar(16)}
              <View className="flex-1">
                <Text className="text-xl font-black text-gray-900 leading-tight">
                  {user.name}
                </Text>
                <Text className="text-gray-500 font-bold text-sm mt-0.5" numberOfLines={1}>
                  {user.email}
                </Text>
                {user.displayId && (
                  <Text className="text-gray-400 font-bold text-[10px] mt-1 uppercase tracking-tighter">
                    ID: {user.displayId}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Right: Detailed Stats + Actions */}
          <View className="flex-row items-center gap-6">
            <View className="items-end gap-2">
              <View className={`flex-row items-center px-3 py-1.5 rounded-xl border ${roleColors.bg} ${roleColors.border}`}>
                <Ionicons name={roleColors.icon as any} size={12} color={roleColors.text.replace('text-', '')} style={{ marginRight: 6 }} />
                <Text className={`text-[10px] font-black uppercase tracking-widest ${roleColors.text}`}>
                  {user.role}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">Joined</Text>
                <Text className="text-xs font-black text-gray-700">
                  {new Date(user.joinDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>

            {showActions && (
              <View className="flex-col gap-1.5">
                <TouchableOpacity
                  onPress={handleEditPress}
                  className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeletePress}
                  className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
        activeOpacity={0.8}
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
