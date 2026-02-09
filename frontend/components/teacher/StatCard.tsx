import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StatCardProps {
    title: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    change: string;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    change,
}) => {
    const isPositive = change.startsWith("+");

    return (
        <View className="flex-1 bg-white rounded-xl p-4 mr-2 mb-2 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
                <View className="bg-[#E8F8F5] p-2 rounded-lg">
                    <Ionicons name={icon} size={20} color="#1ABC9C" />
                </View>
                <Text
                    className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"
                        }`}
                >
                    {change}
                </Text>
            </View>
            <Text className="text-2xl font-bold text-[#2C3E50]">{value}</Text>
            <Text className="text-gray-500 text-xs mt-1">{title}</Text>
        </View>
    );
};

export { StatCard };
export default StatCard;
