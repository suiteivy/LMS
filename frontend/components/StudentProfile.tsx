import { BookOpen, Edit2, Edit3, GraduationCap, Mail } from "lucide-react-native";
import React from "react";
import { View, Text, Image, TouchableOpacity} from "react-native";
import { ScrollView } from "react-native-gesture-handler";

export default function StudentProfile() {
    return (
        <ScrollView className="flex-1 bg-gray-50">
        <View className="p-4 md:p-8 max-w-3xl mx-auto w-full">
          {/* Header section / profile card */}
            <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <View className="h-auto bg-teal-500 rounded-t-3xl">
                <View className="px-6 pb-6 flex-row justify-between items-end mt-4">
                <View className="flex-1 pb-2">
                    <Text className="text-2xl font-bold text-gray-900">
                    John doe
                    </Text>
                    <Text className="text-white font-medium">
                    Software Engineering Student
                    </Text>
                    <View className="flex-row items-center mt-2 bg-teal-50 self-start px-3 py-1 rounded-full">
                        <View className="w-2 h-2 rounded-full bg-teal-500 mr-2"/>
                        <Text className="text-teal-700 text-xs font-bold uppercase">Active</Text>
                    </View>
                </View>

                <View className="relative">
                    <View style={{ elevation:8, zIndex: 10}}>
                        <Image 
                            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200'}}
                            className="w-24 h-24 rounded-2xl border-4 border-white bg-gray-200"
                        />
                        {/* <TouchableOpacity
                            style={{elevation: 10, zIndex:20}}
                            activeOpacity={0.8}
                            className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md border border-gray-100"
                        >
                            <Edit3 size={18} color='#0d9488'/>
                        </TouchableOpacity> */}
                    </View>
                </View>
                </View>
            </View>

            <View className="mt-6 flex-row flex-wrap justify-between">
                <View className="w-full md:w-[48%] bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
                <View className="flex-row items-center mb-4">
                    <View className="p-2 bg-teal-50 rounded-lg">
                    <GraduationCap size={20} color="#0d9488" />
                    </View>
                    <Text className="ml-3 font-semibold text-gray-800">
                    Academic Info
                    </Text>
                </View>

                <View className="space-y-3">
                    <View>
                    <Text className="text-xs text-gray-400 uppercase tracking-wider">
                        Student ID
                    </Text>
                    <Text className="text-gray-700 font-medium">
                        STU-2026-004
                    </Text>
                    </View>
                    <View>
                    <Text className="text-xs text-gray-400 uppercase tracking-wider">Current year</Text>
                    <Text className="text-gray-700 font-medium"> 3rd Year, Semester 2</Text>
                    </View>
                </View>
                </View>

                <View className="w-full md:w-[48%] bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
                <View className="flex-row items-center mb-4">
                    <View className="p-2 bg-blue-50 rounded-lg">
                        <Mail size={20} color="#2563eb" />
                    </View>
                    <Text className="ml-3 font-semibold text-gray-800">Contact</Text>
                </View>

                <View className="space-y-3">
                    <View>
                    <Text className="text-xs text-gray-400 uppercase tracking-wider">Email Address</Text>
                    <Text className="text-gray-700 font-medium">
                        john.doe@university.edu
                    </Text>
                    </View>
                    <View className="mt-2">
                    <Text className="text-xs text-gray-400 uppercase tracking-wider">
                        Phone
                    </Text>
                    <Text className="text-gray-700 font-medium">
                        +1 234 567 890
                    </Text>
                    </View>
                </View>
                </View>
                
                {/* courses section */}
                <View className="mt-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <View  className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                            <BookOpen size={20} color="#0d9488" />
                            <Text className="ml-3 font-semibold text-gray-800">Registered Courses</Text>
                        </View>
                        <Text className="text-teal-600 text-sm font-bold"></Text>
                    </View>

                    <View className="border-t border-gray-50 pt-2">
                        {['Advanced React Native', 'UI/UX Design Systems', 'DBMS']. map(( course, index )=> 
                        <View key={index} className="py-3 border-b border-gray-50 last:border-0 flex-row items-center">
                            <View className="w-2 h-2 rounded-full bg-teal-400 mr-3" />
                            <Text className="text-gray-600">{course}</Text>
                        </View>
                        )}
                    </View>
                </View>
            </View>
          </View>
        </View>
      </ScrollView>
    );
}