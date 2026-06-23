import { useTheme } from "@/contexts/ThemeContext";
import { Bell } from "lucide-react-native";
import React from "react";
import { GestureResponderEvent, Pressable, Text, View } from "react-native";

interface NotificationTabButtonProps {
    onPress: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    isOpen: boolean;
    unreadCount: number;
    accentColor?: string;
    label?: string;
    testID?: string;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected?: boolean; disabled?: boolean };
    style?: any;
}

export function NotificationTabButton({
    onPress,
    onLongPress,
    isOpen,
    unreadCount,
    accentColor = "#FF6B00",
    label,
    testID,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    style,
}: NotificationTabButtonProps) {
    const { isDark } = useTheme();
    const color = isOpen ? accentColor : isDark ? "#94a3b8" : "#64748b";

    const handlePress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        onPress?.(e);
    };

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={onLongPress}
            testID={testID}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole as any}
            accessibilityState={accessibilityState}
            style={[
                {
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    paddingTop: 4,
                },
                style,
            ]}
        >
            <View>
                <Bell size={24} color={color} strokeWidth={2} />
                {unreadCount > 0 && (
                    <View
                        style={{
                            position: "absolute",
                            top: -4,
                            right: -6,
                            minWidth: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: accentColor,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: isDark ? "#0F0B2E" : "#ffffff",
                        }}
                    >
                        <Text style={{ color: "white", fontSize: 8, fontWeight: "bold" }}>
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                    </View>
                )}
            </View>
            {label ? (
                <Text
                    style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color,
                        marginTop: 2,
                    }}
                >
                    {label}
                </Text>
            ) : null}
        </Pressable>
    );
}
