import { BaseComponentProps, StatsData } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

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
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      border: 'border-blue-200 dark:border-blue-900/30',
      icon: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: '#3B82F6',
      text: 'text-blue-800 dark:text-blue-300',
      value: 'text-blue-900 dark:text-white'
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/10',
      border: 'border-green-200 dark:border-green-900/30',
      icon: 'bg-green-100 dark:bg-green-900/30',
      iconColor: '#10B981',
      text: 'text-green-800 dark:text-green-300',
      value: 'text-green-900 dark:text-white'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/10',
      border: 'border-purple-200 dark:border-purple-900/30',
      icon: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: '#8B5CF6',
      text: 'text-purple-800 dark:text-purple-300',
      value: 'text-purple-900 dark:text-white'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
      border: 'border-yellow-200 dark:border-yellow-900/30',
      icon: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: '#F59E0B',
      text: 'text-yellow-800 dark:text-yellow-300',
      value: 'text-yellow-900 dark:text-white'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-900/30',
      icon: 'bg-red-100 dark:bg-red-900/30',
      iconColor: '#EF4444',
      text: 'text-red-800 dark:text-red-400',
      value: 'text-red-900 dark:text-white'
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      border: 'border-gray-200 dark:border-gray-800',
      icon: 'bg-gray-100 dark:bg-gray-800',
      iconColor: '#6B7280',
      text: 'text-gray-800 dark:text-gray-300',
      value: 'text-gray-900 dark:text-white'
    }
  };

  const scheme = colorSchemes[color];
  const isCompact = variant === 'compact';

  if (loading) {
    return (
      <View
        className={`bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 mb-4 ${className}`}
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
    <View className={`bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border ${scheme.border} mb-4 ${scheme.bg}`}>
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
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
