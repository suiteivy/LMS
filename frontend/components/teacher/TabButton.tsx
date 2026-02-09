import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TabButtonProps {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    isActive: boolean;
    onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({
    label,
    icon,
    isActive,
    onPress,
}) => {
    return (
        <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center py-2 rounded-md ${isActive ? "bg-[#1ABC9C]" : "bg-transparent"
                }`}
            onPress={onPress}
        >
            <Ionicons
                name={icon}
                size={16}
                color={isActive ? "white" : "#6B7280"}
            />
            <Text
                className={`ml-1 text-xs font-medium ${isActive ? "text-white" : "text-gray-500"
                    }`}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

export { TabButton };
export default TabButton;
