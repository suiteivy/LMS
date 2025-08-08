import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Course {
  id: number;
  title: string;
  students: number;
  completion: number;
  revenue: string;
  status: 'active' | 'draft';
  lastUpdated: string;
}

export const CourseCard: React.FC<{ course: Course }> = ({ course }) => (
  <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
    <View className="flex-row justify-between items-start mb-3">
      <View className="flex-1">
        <Text className="text-lg font-bold text-[#2C3E50] mb-2">{course.title}</Text>
        <View className={`self-start px-3 py-1 rounded-full ${course.status === 'active' ? 'bg-[#A1EBE5]' : 'bg-gray-100'}`}>
          <Text className={`text-xs font-medium ${course.status === 'active' ? 'text-[#2C3E50]' : 'text-gray-600'}`}>
            {course.status}
          </Text>
        </View>
      </View>
      <View className="flex-row">
        <TouchableOpacity className="p-2 mr-1">
          <Ionicons name="eye" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2">
          <Ionicons name="create" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>

    <View className="space-y-3">
      <View className="flex-row justify-between">
        <Text className="text-sm text-gray-600">Students: {course.students}</Text>
        <Text className="text-sm text-gray-600">Revenue: {course.revenue}</Text>
      </View>

      <View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-600">Completion Rate</Text>
          <Text className="text-sm font-medium text-[#2C3E50]">{course.completion}%</Text>
        </View>
        <View className="w-full bg-gray-200 rounded-full h-2">
          <View className="bg-[#1ABC9C] h-2 rounded-full" style={{ width: `${course.completion}%` }} />
        </View>
      </View>

      <Text className="text-xs text-gray-500">Last updated: {course.lastUpdated}</Text>
    </View>
  </View>
);
