import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ActivityType = "enrollment" | "completion" | "question" | "review";

interface Activity {
    type: ActivityType;
    message: string;
    time: string;
}

interface ActivityItemProps {
    activity: Activity;
}

const activityConfig: Record<
    ActivityType,
    { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }
> = {
    enrollment: { icon: "person-add", color: "#3B82F6", bgColor: "#EFF6FF" },
    completion: { icon: "checkmark-circle", color: "#10B981", bgColor: "#ECFDF5" },
    question: { icon: "help-circle", color: "#F59E0B", bgColor: "#FFFBEB" },
    review: { icon: "star", color: "#8B5CF6", bgColor: "#F5F3FF" },
};

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
    const config = activityConfig[activity.type];

    return (
        <View className="flex-row items-center p-4 border-b border-gray-100">
            <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: config.bgColor }}
            >
                <Ionicons name={config.icon} size={20} color={config.color} />
            </View>
            <View className="flex-1">
                <Text className="text-[#2C3E50] text-sm">{activity.message}</Text>
                <Text className="text-gray-400 text-xs mt-1">{activity.time}</Text>
            </View>
        </View>
    );
};

export { ActivityItem };
export default ActivityItem;
