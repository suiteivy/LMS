import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Calendar, Clock, Bell, ArrowRight, BookOpen, Star, GraduationCap, Book } from 'lucide-react-native';
import Notifications from '../../components/Notifications';
import { useAuth } from '@/contexts/AuthContext';

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

export default function Index() {
  const { profile, displayId } = useAuth();
  const [showNotification, setShowNotification] = useState(false);

  return (
    /* Use a Fragment so we don't add an extra wrapping View that could mess up the Tab layout */
    <>
      <StatusBar barStyle="dark-content" />

      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          // contentContainerStyle handles the internal padding correctly
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
                  {profile?.full_name || 'Student'} 👋
                </Text>
                <Text className="text-sm text-gray-500 font-medium">
                  ID: {displayId || 'Loading...'}
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
                <Star size={20} color="white" />
                <Text className="text-white text-2xl font-bold mt-2">3.82</Text>
                <Text className="text-teal-100 text-xs font-medium uppercase italic">
                  GPA
                </Text>
              </View>
              <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <Clock size={20} color="#0d9488" />
                <Text className="text-gray-900 text-2xl font-bold mt-2">
                  92%
                </Text>
                <Text className="text-gray-400 text-xs font-medium uppercase italic">
                  Attendance
                </Text>
              </View>
            </View>

            {/* --- 3. Upcoming Schedule --- */}
            {/* Tightened header: removed pb-8, kept mb-4 */}
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
                    CS302 • 09:00 AM
                  </Text>
                </View>
                <Text className="text-gray-900 font-bold text-lg mb-1">
                  Advanced React Native
                </Text>
                <Text className="text-gray-500 text-sm">
                  Lecture Hall B, Room 402
                </Text>
              </View>

              {/* Card 2 */}
              <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-64">
                <View className="flex-row items-center mb-3">
                  <View className="bg-blue-100 p-2 rounded-xl mr-3">
                    <BookOpen size={20} color="#3b82f6" />
                  </View>
                  <Text className="text-gray-400 font-bold text-[10px] uppercase">
                    DS101 • 11:30 AM
                  </Text>
                </View>
                <Text className="text-gray-900 font-bold text-lg mb-1">
                  Database Systems
                </Text>
                <Text className="text-gray-500 text-sm">Virtual Lab 2</Text>
              </View>
            </ScrollView>

            {/* --- 4. Quick Actions Grid --- */}
            {/* Removed pt-2 and mt-5, replaced with a clean mt-2 */}
            <View className="mt-2">
              <Text className="text-xl font-bold text-gray-900 mb-4">
                Resources
              </Text>
              <View className="flex-row flex-wrap justify-between">
                <QuickAction
                  icon={GraduationCap}
                  label="Library"
                  color="#0d9488"
                />
                <QuickAction icon={Book} label="Subjects" color="#8b5cf6" />
                <QuickAction
                  icon={ArrowRight}
                  label="Assignments"
                  color="#f43f5e"
                />
                <QuickAction icon={Star} label="Grades" color="#eab308" />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Notifications Modal rendered outside the ScrollView */}
        <Notifications
          visible={showNotification}
          onClose={() => setShowNotification(false)}
        />
      </View>
    </>
  );
}
