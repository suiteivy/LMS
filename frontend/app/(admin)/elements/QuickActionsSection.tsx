import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: {
    bg: string;
    border: string;
    active: string;
    iconBg: string;
    iconColor: string;
    textColor: string;
  };
}

interface QuickActionsSectionProps {
  onActionPress?: (action: string) => void;
  actions?: QuickAction[];
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onActionPress,
  actions
}) => {
  const defaultActions: QuickAction[] = [
    {
      id: 'add-user',
      title: 'Add User',
      icon: 'person-add',
      color: {
        bg: 'bg-white',
        border: 'border-blue-200',
        active: 'active:bg-blue-50',
        iconBg: 'bg-blue-100',
        iconColor: '#3B82F6',
        textColor: 'text-blue-800'
      }
    },
    {
      id: 'add-course',
      title: 'Add Course',
      icon: 'book-outline',
      color: {
        bg: 'bg-white',
        border: 'border-green-200',
        active: 'active:bg-green-50',
        iconBg: 'bg-green-100',
        iconColor: '#10B981',
        textColor: 'text-green-800'
      }
    },
    {
      id: 'payment-management',
      title: 'Student Payments',
      icon: 'card-outline',
      color: {
        bg: 'bg-white',
        border: 'border-emerald-200',
        active: 'active:bg-emerald-50',
        iconBg: 'bg-emerald-100',
        iconColor: '#059669',
        textColor: 'text-emerald-800'
      }
    },
    {
      id: 'teacher-payouts',
      title: 'Teacher Payouts',
      icon: 'wallet-outline',
      color: {
        bg: 'bg-white',
        border: 'border-indigo-200',
        active: 'active:bg-indigo-50',
        iconBg: 'bg-indigo-100',
        iconColor: '#6366F1',
        textColor: 'text-indigo-800'
      }
    },
    {
      id: 'fee-structure',
      title: 'Fee Structure',
      icon: 'calculator-outline',
      color: {
        bg: 'bg-white',
        border: 'border-orange-200',
        active: 'active:bg-orange-50',
        iconBg: 'bg-orange-100',
        iconColor: '#EA580C',
        textColor: 'text-orange-800'
      }
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: 'analytics-outline',
      color: {
        bg: 'bg-white',
        border: 'border-purple-200',
        active: 'active:bg-purple-50',
        iconBg: 'bg-purple-100',
        iconColor: '#8B5CF6',
        textColor: 'text-purple-800'
      }
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings-outline',
      color: {
        bg: 'bg-white',
        border: 'border-yellow-200',
        active: 'active:bg-yellow-50',
        iconBg: 'bg-yellow-100',
        iconColor: '#F59E0B',
        textColor: 'text-yellow-800'
      }
    }
  ];

  const displayActions = actions || defaultActions;

  const handleActionPress = (actionId: string) => {
    onActionPress?.(actionId);
  };

  const renderAction = (action: QuickAction) => (
    <View key={action.id} className="w-1/2 px-2 mb-4">
      <TouchableOpacity 
        className={`${action.color.bg} rounded-xl p-4 shadow-sm border ${action.color.border} ${action.color.active}`}
        activeOpacity={0.7}
        onPress={() => handleActionPress(action.id)}
      >
        <View className="items-center">
          <View className={`w-12 h-12 ${action.color.iconBg} rounded-full items-center justify-center mb-2`}>
            <Ionicons name={action.icon as any} size={24} color={action.color.iconColor} />
          </View>
          <Text className={`${action.color.textColor} font-medium text-sm text-center`}>
            {action.title}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="mt-4 mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-4">
        Quick Actions
      </Text>
      
      <View className="flex-row flex-wrap -mx-2">
        {displayActions.map(renderAction)}
      </View>
    </View>
  );
};