import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ManagementLayout() {
    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1 }} className="bg-[#FFFFFF] dark:bg-[#161B22]">
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="grades" />
                <Stack.Screen name="grade-entry" />
                <Stack.Screen name="report-cards" />
                <Stack.Screen name="assignments" />
                <Stack.Screen name="submissions" />
                <Stack.Screen name="exams" />
                <Stack.Screen name="exam-results" />
                <Stack.Screen name="attendance" />
                <Stack.Screen name="announcements" />
                <Stack.Screen name="messages" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="timetable" />
                <Stack.Screen name="library" />
                <Stack.Screen name="analytics" />
                <Stack.Screen name="resources" />
                <Stack.Screen name="diary" />
            </Stack>
        </View>
    );
}
