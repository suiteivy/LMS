import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ManagementLayout() {
    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1 }} className="bg-gray-50 dark:bg-black">
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="grades" />
                <Stack.Screen name="assignments" />
                <Stack.Screen name="attendance" />
                <Stack.Screen name="announcements" />
                <Stack.Screen name="analytics" />
                <Stack.Screen name="earnings" />
                <Stack.Screen name="resources" />
            </Stack>
        </View>
    );
}
