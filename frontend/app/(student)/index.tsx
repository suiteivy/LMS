import { Text, View,  TouchableOpacity, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CircularProgress from "../../components/CircularProgress";


export default function StudentSignUpScreen() {



    return (
        <>
        <StatusBar barStyle="dark-content"/>
        <SafeAreaView className="flex-1">
            <ScrollView className="flex-grow bg-bgMain py-6">
                <View className="p-4">
                    <Text className="text-xl text-headingColor font-bold">
                        LMS
                    </Text>
                </View>
                {/* first row */}
                <View className="flex-row justify-between items-center p-3">
                    
                    <View className="flex-col justify-start bg-bgLight px-3.5 py-10 rounded-lg">
                        <Text className="text-headingColor text-left text-2xl font-bold">
                            Hello Jane!
                        </Text>
                        <Text className="text-xl text-wrap">
                            Continue with your learning journey
                        </Text>
                    </View>
                    <View className="flex items-center bg-bgLight px-4 py-5 rounded-lg">
                        <TouchableOpacity className="bg-actionColor py-4 px-6 rounded-lg">
                            <Text>New Course</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* second row */}
                <View className="flex-row justify-between p-3">
                    {/* courses */}
                    <View className="flex-col ">
                        <View className="py-2">
                            <Text className="text-xl text-headingColor font-bold">
                                Your Courses
                            </Text>
                        </View>
                        
                        <View className="flex-row gap-3 pb-3">
                            <View className="flex-col bg-bgLight px-4 py-10 rounded-lg">
                                <Text className="text-headingColor text-left text-2xl font-bold">
                                    Course 1
                                </Text>
                                <Text className="text-xl text-wrap">
                                    Learn to code
                                </Text>
                            </View>
                            <View className="flex-col bg-bgLight px-4 py-10 rounded-lg">
                                <Text className="text-headingColor text-left text-2xl font-bold">
                                    Course 1
                                </Text>
                                <Text className="text-xl text-wrap">
                                    Learn to code
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row gap-3">
                            <View className="flex-col bg-bgLight px-4 py-10 rounded-lg">
                                <Text className="text-headingColor text-left text-2xl font-bold">
                                    Course 1
                                </Text>
                                <Text className="text-xl text-wrap">
                                    Learn to code
                                </Text>
                            </View>
                            <View className="flex-col bg-bgLight px-4 py-10 rounded-lg">
                                <Text className="text-headingColor text-left text-2xl font-bold">
                                    Course 1
                                </Text>
                                <Text className="text-xl text-wrap">
                                    Learn to code
                                </Text>
                            </View> 
                        </View>
                    </View>
                    {/* course progress */}
                    <View className="flex-col justify-start bg-bgLight px-4 py-10 rounded-lg">
                        <View className="py-2">
                            <Text className="font-bold text-headingColor text-xl">Course Progress</Text>
                        </View>
                       <CircularProgress
                        size={100}
                        progress={75}
                        
                        
                      />
                    </View>
                </View>
                {/* third row */}
                <View className="flex-row justify-between gap-3 p-3">
                    <View className="w-[47%]">
                        <View className="py-2">
                            <Text className="text-xl font-bold text-headingColor">Upcoming Events</Text>
                        </View>
                        <View className="flex-col bg-bgLight px-3.5 py-10 rounded-lg">
                            <Text className="text-left text-xl text-wrap">
                                Upcoming math test on 10th July
                            </Text>
                        </View>
                    </View>
                     <View className="w-[47%]">
                        <View className="py-2">
                            <Text className="text-xl font-bold text-headingColor">Announcements</Text>
                        </View>
                        <View className="flex-col bg-bgLight px-3.5 py-10 rounded-lg">
                            <Text className="text-left text-xl text-wrap">
                                Upcoming math test on 10th July
                            </Text>
                            
                        </View>
                     </View>
                </View>
            </ScrollView>
        </SafeAreaView>
        </>
    )};