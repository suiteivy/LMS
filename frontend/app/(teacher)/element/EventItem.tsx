import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EventType = "live" | "deadline" | "meeting";

interface Event {
    title: string;
    date: string;
    type: EventType;
}

interface EventItemProps {
    event: Event;
}

const eventConfig: Record<
    EventType,
    { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }
> = {
    live: { icon: "videocam", color: "#EF4444", bgColor: "#FEF2F2" },
    deadline: { icon: "time", color: "#F59E0B", bgColor: "#FFFBEB" },
    meeting: { icon: "calendar", color: "#3B82F6", bgColor: "#EFF6FF" },
};

const EventItem: React.FC<EventItemProps> = ({ event }) => {
    const config = eventConfig[event.type];

    return (
        <View className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0">
            <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: config.bgColor }}
            >
                <Ionicons name={config.icon} size={20} color={config.color} />
            </View>
            <View className="flex-1">
                <Text className="text-[#2C3E50] text-sm font-medium">{event.title}</Text>
                <Text className="text-gray-400 text-xs mt-1">{event.date}</Text>
            </View>
        </View>
    );
};

export { EventItem };
export default EventItem;
