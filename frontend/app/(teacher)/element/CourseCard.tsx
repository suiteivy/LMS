import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Course {
    id: number;
    title: string;
    students: number;
    completion: number;
    revenue: string;
    status: string;
    lastUpdated: string;
}

interface CourseCardProps {
    course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const isActive = course.status === "active";

    return (
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                    <Text className="text-[#2C3E50] font-bold text-base">
                        {course.title}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                        Updated {course.lastUpdated}
                    </Text>
                </View>
                <View
                    className={`px-2 py-1 rounded-full ${isActive ? "bg-green-100" : "bg-gray-100"
                        }`}
                >
                    <Text
                        className={`text-xs font-medium ${isActive ? "text-green-600" : "text-gray-500"
                            }`}
                    >
                        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between mb-4">
                <View className="flex-row items-center">
                    <Ionicons name="people" size={14} color="#6B7280" />
                    <Text className="text-gray-600 text-xs ml-1">
                        {course.students} students
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="trending-up" size={14} color="#6B7280" />
                    <Text className="text-gray-600 text-xs ml-1">
                        {course.completion}% completion
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="cash" size={14} color="#6B7280" />
                    <Text className="text-gray-600 text-xs ml-1">{course.revenue}</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <View
                    className="h-full bg-[#1ABC9C] rounded-full"
                    style={{ width: `${course.completion}%` }}
                />
            </View>

            <View className="flex-row justify-end mt-4">
                <TouchableOpacity className="flex-row items-center mr-4">
                    <Ionicons name="create-outline" size={16} color="#1ABC9C" />
                    <Text className="text-[#1ABC9C] text-xs ml-1 font-medium">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center">
                    <Ionicons name="eye-outline" size={16} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1 font-medium">View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export { CourseCard };
export default CourseCard;
