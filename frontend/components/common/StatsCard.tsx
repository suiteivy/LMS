import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseComponentProps, StatsData } from '@/types/types';

interface StatsCardProps extends StatsData, BaseComponentProps {
  loading?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  color,
  trend,
  description,
  loading = false,
  onPress,
  variant = 'default',
  className = "",
  testID
}) => {
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100',
      iconColor: '#3B82F6',
      text: 'text-blue-800',
      value: 'text-blue-900'
    },
    green: {
      bg: 'bg-green-100',
      border: 'border-green-200',
      icon: 'bg-green-100',
      iconColor: '#10B981',
      text: 'text-green-800',
      value: 'text-green-900'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'bg-purple-100',
      iconColor: '#8B5CF6',
      text: 'text-purple-800',
      value: 'text-purple-900'
    },
    yellow: {
      bg: 'bg-yellow-10',
      border: 'border-yellow-200',
      icon: 'bg-yellow-100',
      iconColor: '#F59E0B',
      text: 'text-yellow-800',
      value: 'text-yellow-900'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'bg-red-100',
      iconColor: '#EF4444',
      text: 'text-red-800',
      value: 'text-red-900'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'bg-gray-100',
      iconColor: '#6B7280',
      text: 'text-gray-800',
      value: 'text-gray-900'
    }
  };

  const scheme = colorSchemes[color];
  const isCompact = variant === 'compact';

  if (loading) {
    return (
      <View
        className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4 ${className}`}
        testID={testID}
      >
        <View className="animate-pulse">
          <View className="flex-row items-center space-x-3 mb-2">
            <View className="w-10 h-10 bg-gray-200 rounded-full"></View>
            <View className="flex-1">
              <View className="h-3 bg-gray-200 rounded w-3/4 mb-1"></View>
              <View className="h-2 bg-gray-200 rounded w-1/2"></View>
            </View>
          </View>
          {!isCompact && (
            <View className="h-4 bg-gray-200 rounded w-1/3 mt-2"></View>
          )}
        </View>
      </View>
    );
  }

  const CardContent = () => (
    <View className={`bg-white rounded-xl p-4 shadow-sm border ${scheme.border} mb-4 ${scheme.bg}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center space-x-3 mb-2 gap-2">
            <View className={`w-10 h-10 ${scheme.icon} rounded-full items-center justify-center`}>
              <Ionicons name={icon as any} size={20} color={scheme.iconColor} />
            </View>
            <View className="flex-1">
              <Text className={`text-base font-medium ${scheme.text}`}>
                {label}
              </Text>
              {description && !isCompact && (
                <Text className="text-xs text-gray-500 mt-1">
                  {description}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row items-end justify-between">
            <Text className={`text-2xl font-bold ${scheme.value}`}>
              {value}
            </Text>

            {trend && !isCompact && (
              <View className="flex-row items-center">
                <Ionicons
                  name={trend.isPositive ? "trending-up" : "trending-down"}
                  size={16}
                  color={trend.isPositive ? "#10B981" : "#EF4444"}
                />
                <Text className={`text-sm font-medium ml-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {trend.value}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={className}
        testID={testID}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View className={className} testID={testID}>
      <CardContent />
    </View>
  );
};
