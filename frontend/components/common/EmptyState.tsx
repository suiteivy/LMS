import { Info, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateProps {
    title: string;
    message?: string;
    icon?: LucideIcon;
    color?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    message,
    icon: Icon = Info,
    color = '#94a3b8',
    actionLabel,
    onAction
}) => {
    return (
        <View className="flex-1 items-center justify-center p-10 mt-10">
            <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${color}15` }}
            >
                <Icon size={48} color={color} strokeWidth={1.5} />
            </View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">{title}</Text>
            {message && <Text className="text-sm text-gray-600 dark:text-gray-300 text-center leading-5">{message}</Text>}
            {actionLabel && onAction && (
                <TouchableOpacity
                    onPress={onAction}
                    className="mt-6 px-6 py-3 rounded-xl shadow-sm"
                    style={{ backgroundColor: color }}
                >
                    <Text className="text-white text-[15px] font-bold">{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};


