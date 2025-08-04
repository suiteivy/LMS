import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { AuthContext } from '@/contexts/AuthContext'; 

const TeacherDashboard = () => {
  // Define the expected context type
  type AuthContextType = {
    user?: {
      displayName?: string;
     
    };
    
  };
  
  const { user } = useContext(AuthContext) as AuthContextType; // Assuming user contains name like user.displayName

  const assignedCourses = [
    { id: 1, title: 'Math 101', time: 'Mon 9:00 AM' },
    { id: 2, title: 'Physics 201', time: 'Tue 11:00 AM' },
    { id: 3, title: 'Chemistry 301', time: 'Wed 2:00 PM' },
  ];

  const announcements = [
    "Submit marks by Friday",
    "Staff meeting on Wednesday 10am",
    "Midterm exams next week",
  ];

  return (
    <ScrollView className="flex-1 bg-gray-100 px-4 pt-8">
      <Text className="text-2xl font-bold text-gray-800 mb-6">
        Welcome, {user?.displayName || 'Teacher'}
      </Text>

      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-700 mb-3">📚 Assigned Courses</Text>
        {assignedCourses.map((course) => (
          <View
            key={course.id}
            className="bg-white p-4 rounded-xl mb-3 shadow shadow-gray-300"
          >
            <Text className="text-base font-semibold text-gray-800">{course.title}</Text>
            <Text className="text-sm text-gray-600">{course.time}</Text>
          </View>
        ))}
      </View>

      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-700 mb-3">📢 Announcements</Text>
        {announcements.map((msg, idx) => (
          <Text key={idx} className="text-sm text-gray-700 mb-1">
            • {msg}
          </Text>
        ))}
      </View>

      <TouchableOpacity className="bg-red-500 py-3 rounded-xl items-center mt-4">
        <Text className="text-white font-bold">Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default TeacherDashboard;
