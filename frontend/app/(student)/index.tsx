import { Text, View, TouchableOpacity, ScrollView, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CircularProgress from "../../components/CircularProgress";

export default function StudentSignUpScreen() {
    return (
        <>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView className="flex-1 bg-bgMain">
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="py-2">
                    
                    {/* Header Row: Welcome Message & Action */}
                    <View className="flex-row items-center p-4 gap-3">
                        <View className="flex-1 bg-bgLight p-6 rounded-2xl shadow-sm">
                            <Text className="text-headingColor text-2xl font-bold">Hello Jane!</Text>
                            <Text className="text-gray-500 text-lg">Continue your journey</Text>
                        </View>
                        <TouchableOpacity className="bg-actionColor p-5 rounded-2xl items-center justify-center shadow-md">
                            <Text className="font-bold text-center">New{"\n"}Course</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content Section: Courses & Progress */}
                    <View className="flex-row p-4 gap-4">
                        {/* Courses Grid */}
                        <View className="flex-[1.5] gap-3">
                            <Text className="text-xl text-headingColor font-bold mb-1">Your Courses</Text>
                            
                            {/* Course Row 1 */}
                            <View className="flex-row gap-3">
                                <View className="flex-1 bg-bgLight p-4 rounded-xl min-h-[120px] justify-center shadow-sm">
                                    <Text className="text-headingColor font-bold text-lg">Python 101</Text>
                                    <Text className="text-gray-400">Learn to code</Text>
                                </View>
                                <View className="flex-1 bg-bgLight p-4 rounded-xl min-h-[120px] justify-center shadow-sm">
                                    <Text className="text-headingColor font-bold text-lg">UI Design</Text>
                                    <Text className="text-gray-400">Master Figma</Text>
                                </View>
                            </View>

                            {/* Course Row 2 */}
                            <View className="flex-row gap-3">
                                <View className="flex-1 bg-bgLight p-4 rounded-xl min-h-[120px] justify-center shadow-sm">
                                    <Text className="text-headingColor font-bold text-lg">Maths</Text>
                                    <Text className="text-gray-400">Calculus</Text>
                                </View>
                                <View className="flex-1 bg-bgLight p-4 rounded-xl min-h-[120px] justify-center shadow-sm">
                                    <Text className="text-headingColor font-bold text-lg">History</Text>
                                    <Text className="text-gray-400">Modern Era</Text>
                                </View>
                            </View>
                        </View>

                        {/* Progress Sidebar */}
                        <View className="flex-1 items-center justify-start bg-bgLight p-4 rounded-2xl shadow-sm self-start mt-9">
                            <Text className="font-bold text-headingColor text-center mb-4">Daily Goal</Text>
                            <CircularProgress size={80} progress={75} />
                            <Text className="mt-2 font-bold text-actionColor">75%</Text>
                        </View>
                    </View>

                    {/* Bottom Row: Events & Announcements */}
                    <View className="flex-row p-4 gap-4">
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-headingColor mb-2">Events</Text>
                            <View className="bg-bgLight p-5 rounded-2xl border-l-4 border-actionColor shadow-sm">
                                <Text className="text-headingColor italic">Math Test: 10th July</Text>
                            </View>
                        </View>

                        <View className="flex-1">
                            <Text className="text-lg font-bold text-headingColor mb-2">Alerts</Text>
                            <View className="bg-bgLight p-5 rounded-2xl border-l-4 border-yellow-400 shadow-sm">
                                <Text className="text-headingColor">New library books!</Text>
                            </View>
                        </View>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </>
    );
}