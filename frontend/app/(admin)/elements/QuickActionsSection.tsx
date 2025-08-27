import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  actions,
}) => {
  const defaultActions: QuickAction[] = [
    {
      id: "add-user",
      title: "Add User",
      icon: "person-add",
      color: {
        bg: "bg-white",
        border: "border-slate-200",
        active: "active:bg-slate-50",
        iconBg: "bg-slate-100",
        iconColor: "#2C3E50",
        textColor: "text-slate-800",
      },
    },
    {
      id: "add-course",
      title: "Add Course",
      icon: "book-outline",
      color: {
        bg: "bg-white",
        border: "border-slate-200",
        active: "active:bg-teal-50",
        iconBg: "bg-slate-100",
        iconColor: "#2C3E50",
        textColor: "text-slate-800",
      },
    },
    {
      id: "library",
      title: "Library",
      icon: "library-outline",
      color: {
        bg: "bg-white",
        border: "border-slate-200",
        active: "active:bg-mint-50",
        iconBg: "bg-slate-100",
        iconColor: "#2C3E50",
        textColor: "text-slate-800",
      },
    },
    {
      id: "analytics",
      title: "Analytics",
      icon: "analytics-outline",
      color: {
        bg: "bg-white",
        border: "border-slate-200",
        active: "active:bg-teal-50",
        iconBg: "bg-slate-100",
        iconColor: "#2C3E50",
        textColor: "text-slate-800",
      },
    },
    {
      id: "settings",
      title: "Settings",
      icon: "settings-outline",
      color: {
        bg: "bg-white",
        border: "border-slate-200",
        active: "active:bg-slate-50",
        iconBg: "bg-slate-100",
        iconColor: "#2C3E50",
        textColor: "text-slate-800",
      },
    },
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
          <View
            className={`w-12 h-12 ${action.color.iconBg} rounded-full items-center justify-center mb-2`}
          >
            <Ionicons
              name={action.icon as any}
              size={24}
              color={action.color.iconColor}
            />
          </View>
          <Text
            className={`${action.color.textColor} font-medium text-sm text-center`}
          >
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
