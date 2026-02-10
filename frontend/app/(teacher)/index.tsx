import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Calendar, Clock, Bell, ArrowRight, BookOpen, Users, GraduationCap, School } from 'lucide-react-native';

// Define Interface for the QuickAction props
interface QuickActionProps {
    icon: any;
    label: string;
    color: string;
}

const QuickAction = ({ icon: Icon, label, color }: QuickActionProps) => (
    <TouchableOpacity className="w-[48%] bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center mb-4 active:bg-gray-50">
        <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
            <Icon size={24} color={color} />
        </View>
        <Text className="text-gray-800 font-bold">{label}</Text>
    </TouchableOpacity>
);

export default function TeacherHome() {
    const [showNotification, setShowNotification] = useState(false);

    return (
        <>
            <StatusBar barStyle="dark-content" />

            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4 md:p-8">
                        {/* --- 1. Header Section --- */}
                        <View className="flex-row justify-between items-center mb-8">
                            <View>
                                <Text className="text-gray-500 text-base font-medium">
                                    Welcome back,
                                </Text>
                                <Text className="text-3xl font-bold text-gray-900">
                                    Teacher 👋
                                </Text>
                            </View>

                            <TouchableOpacity
                                className="relative p-2 bg-white rounded-full border border-gray-100 shadow-sm active:opacity-70"
                                onPress={() => setShowNotification(true)}
                            >
                                <Bell size={24} color="#374151" />
                                <View className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                            </TouchableOpacity>
                        </View>

                        {/* --- 2. Quick Status Cards --- */}
                        <View className="flex-row gap-4 mb-8">
                            <View className="flex-1 bg-teal-600 p-4 rounded-3xl shadow-sm">
                                <Users size={20} color="white" />
                                <Text className="text-white text-2xl font-bold mt-2">1,247</Text>
                                <Text className="text-teal-100 text-xs font-medium uppercase italic">
                                    Students
                                </Text>
                            </View>
                            <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                                <Clock size={20} color="#0d9488" />
                                <Text className="text-gray-900 text-2xl font-bold mt-2">
                                    8
                                </Text>
                                <Text className="text-gray-400 text-xs font-medium uppercase italic">
                                    Active Subjects
                                </Text>
                            </View>
                        </View>

                        {/* --- 3. Today's Schedule --- */}
                        <View className="flex-row justify-between items-end mb-4 ">
                            <Text className="text-xl font-bold text-gray-900">
                                Today's Schedule
                            </Text>
                            <TouchableOpacity>
                                <Text className="text-teal-600 font-semibold">View All</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row mb-6 -mx-4 px-4 pb-4"
                        >
                            {/* Card 1 */}
                            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-64">
                                <View className="flex-row items-center mb-3">
                                    <View className="bg-orange-100 p-2 rounded-xl mr-3">
                                        <BookOpen size={20} color="#f97316" />
                                    </View>
                                    <Text className="text-gray-400 font-bold text-[10px] uppercase">
                                        MATH101 • 09:00 AM
                                    </Text>
                                </View>
                                <Text className="text-gray-900 font-bold text-lg mb-1">
                                    Introduction to Mathematics
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    Lecture Hall A, Room 201
                                </Text>
                            </View>

                            {/* Card 2 */}
                            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-64">
                                <View className="flex-row items-center mb-3">
                                    <View className="bg-blue-100 p-2 rounded-xl mr-3">
                                        <BookOpen size={20} color="#3b82f6" />
                                    </View>
                                    <Text className="text-gray-400 font-bold text-[10px] uppercase">
                                        CS302 • 11:30 AM
                                    </Text>
                                </View>
                                <Text className="text-gray-900 font-bold text-lg mb-1">
                                    Computer Science Basics
                                </Text>
                                <Text className="text-gray-500 text-sm">Virtual Lab 1</Text>
                            </View>

                            {/* Card 3 */}
                            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-64">
                                <View className="flex-row items-center mb-3">
                                    <View className="bg-purple-100 p-2 rounded-xl mr-3">
                                        <BookOpen size={20} color="#8b5cf6" />
                                    </View>
                                    <Text className="text-gray-400 font-bold text-[10px] uppercase">
                                        ENG201 • 02:00 PM
                                    </Text>
                                </View>
                                <Text className="text-gray-900 font-bold text-lg mb-1">
                                    Creative Writing Workshop
                                </Text>
                                <Text className="text-gray-500 text-sm">Building B, Room 105</Text>
                            </View>
                        </ScrollView>

                        {/* --- 4. Quick Actions Grid --- */}
                        <View className="mt-2">
                            <Text className="text-xl font-bold text-gray-900 mb-4">
                                Quick Actions
                            </Text>
                            <View className="flex-row flex-wrap justify-between">
                                <QuickAction
                                    icon={GraduationCap}
                                    label="Grades"
                                    color="#0d9488"
                                />
                                <QuickAction
                                    icon={School}
                                    label="Classes"
                                    color="#8b5cf6"
                                />
                                <QuickAction
                                    icon={ArrowRight}
                                    label="Assignments"
                                    color="#f43f5e"
                                />
                                <QuickAction icon={Users} label="Students" color="#eab308" />
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
