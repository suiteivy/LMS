import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Subject {
    id: number;
    title: string;
    students: number;
    completion: number;
    revenue: string;
    status: string;
    lastUpdated: string;
}

interface SubjectCardProps {
    Subject: Subject;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ Subject }) => {
    const isActive = Subject.status === "active";

    return (
        <View className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 mb-4 shadow-sm border border-gray-50 dark:border-gray-800">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                    <Text className="text-gray-900 dark:text-white font-bold text-base">
                        {Subject.title}
                    </Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                        Updated {Subject.lastUpdated}
                    </Text>
                </View>
                <View
                    className={`px-2 py-1 rounded-full ${isActive ? "bg-green-100 dark:bg-green-950/20" : "bg-gray-100 dark:bg-gray-800"
                        }`}
                >
                    <Text
                        className={`text-xs font-medium ${isActive ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                            }`}
                    >
                        {Subject.status.charAt(0).toUpperCase() + Subject.status.slice(1)}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between mb-4">
                <View className="flex-row items-center">
                    <Ionicons name="people" size={14} color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-300 text-xs ml-1">
                        {Subject.students} students
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="trending-up" size={14} color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-300 text-xs ml-1">
                        {Subject.completion}% completion
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="cash" size={14} color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-300 text-xs ml-1">{Subject.revenue}</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <View
                    className="h-full bg-[#1ABC9C] rounded-full"
                    style={{ width: `${Subject.completion}%` }}
                />
            </View>

            <View className="flex-row justify-end mt-4">
                <TouchableOpacity className="flex-row items-center mr-4">
                    <Ionicons name="create-outline" size={16} color="#1ABC9C" />
                    <Text className="text-[#1ABC9C] text-xs ml-1 font-medium">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center">
                    <Ionicons name="eye-outline" size={16} color="#6B7280" />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs ml-1 font-medium">View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export { SubjectCard };
export default SubjectCard;
