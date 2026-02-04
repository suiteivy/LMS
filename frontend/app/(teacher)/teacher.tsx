import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TabButton } from "./element/TabButton";
import { StatCard } from "./element/StatCard";
import { ActivityItem } from "./element/ActivityItem";
import { EventItem } from "./element/EventItem";
import { CourseCard } from "./element/CourseCard";

// Types Definitions
type ActivityType = "enrollment" | "completion" | "question" | "review";
type EventType = "live" | "deadline" | "meeting";

interface Activity {
  type: ActivityType;
  message: string;
  time: string;
}

interface Event {
  title: string;
  date: string;
  type: EventType;
}

const TeachersDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "courses" | "students" | "analytics"
  >("overview");

  // Stats
  const stats = [
    { title: "Total Students", value: "1,247", icon: "people", change: "+12%" },
    { title: "Active Courses", value: "8", icon: "book", change: "+2" },
    {
      title: "Course Completion",
      value: "87%",
      icon: "trending-up",
      change: "+5%",
    },
    {
      title: "This Month Revenue",
      value: "$3,420",
      icon: "trophy",
      change: "+18%",
    },
  ];

  // Courses
  const courses = [
    {
      id: 1,
      title: "Introduction to Mathematics",
      students: 245,
      completion: 78,
      revenue: "$1,230",
      status: "active",
      lastUpdated: "2 days ago",
    },
    {
      id: 2,
      title: "Creative Writing Workshop",
      students: 189,
      completion: 92,
      revenue: "$945",
      status: "active",
      lastUpdated: "1 week ago",
    },
    {
      id: 3,
      title: "Computer Science Basics",
      students: 312,
      completion: 65,
      revenue: "$1,560",
      status: "active",
      lastUpdated: "3 days ago",
    },
    {
      id: 4,
      title: "Digital Literacy Fundamentals",
      students: 156,
      completion: 45,
      revenue: "$780",
      status: "draft",
      lastUpdated: "1 day ago",
    },
  ] as const;

  // Recent Activity
  const recentActivity: Activity[] = [
    {
      type: "enrollment",
      message: "Sarah Johnson enrolled in Mathematics",
      time: "5 mins ago",
    },
    {
      type: "completion",
      message: "Michael Chen completed Writing Workshop",
      time: "1 hour ago",
    },
    {
      type: "question",
      message: "New question in Computer Science forum",
      time: "2 hours ago",
    },
    {
      type: "review",
      message: "Alice Kamau left a 5-star review",
      time: "4 hours ago",
    },
  ];

  // Events
  const upcomingEvents: Event[] = [
    {
      title: "Live Q&A Session - Mathematics",
      date: "Today, 3:00 PM",
      type: "live",
    },
    {
      title: "Assignment Due - Creative Writing",
      date: "Tomorrow, 11:59 PM",
      type: "deadline",
    },
    {
      title: "New Course Launch Meeting",
      date: "Dec 15, 10:00 AM",
      type: "meeting",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F1FFF8]">
      <StatusBar barStyle="dark-content" backgroundColor="#F1FFF8" />

      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-[#2C3E50] mb-1">
          Teachers Dashboard
        </Text>
        <Text className="text-gray-600 text-sm">
          Welcome back! Here's what's happening with your courses.
        </Text>
      </View>

      {/* Navigation Tabs */}
      <View className="bg-white mx-6 rounded-lg p-1 mb-4 shadow-sm">
        <View className="flex-row">
          <TabButton
            label="Overview"
            icon="analytics"
            isActive={activeTab === "overview"}
            onPress={() => setActiveTab("overview")}
          />
          <TabButton
            label="Courses"
            icon="book"
            isActive={activeTab === "courses"}
            onPress={() => setActiveTab("courses")}
          />
          <TabButton
            label="Students"
            icon="people"
            isActive={activeTab === "students"}
            onPress={() => setActiveTab("students")}
          />
          <TabButton
            label="Analytics"
            icon="bar-chart"
            isActive={activeTab === "analytics"}
            onPress={() => setActiveTab("analytics")}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <View className="pb-6">
            {/* Stats Grid */}
            <View className="flex-row mb-6">
              <View className="flex-1">
                <View className="flex-row mb-2">
                  <StatCard {...stats[0]} />
                  <StatCard {...stats[1]} />
                </View>
                <View className="flex-row">
                  <StatCard {...stats[2]} />
                  <StatCard {...stats[3]} />
                </View>
              </View>
            </View>

            {/* Recent Activity */}
            <View className="bg-white rounded-xl shadow-sm mb-6">
              <View className="p-4 border-b border-gray-100">
                <Text className="text-lg font-bold text-[#2C3E50]">
                  Recent Activity
                </Text>
              </View>
              {recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </View>

            {/* Upcoming Events */}
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-[#2C3E50] mb-4">
                Upcoming Events
              </Text>
              {upcomingEvents.map((event, index) => (
                <EventItem key={index} event={event} />
              ))}
            </View>
          </View>
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <View className="pb-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-[#2C3E50]">
                My Courses
              </Text>
              <TouchableOpacity
                className="bg-[#1ABC9C] px-4 py-2 rounded-lg flex-row items-center"
                onPress={() => router.push("(admin)/CreateCourse")}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white font-medium ml-1 text-sm">
                  New Course
                </Text>
              </TouchableOpacity>
            </View>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </View>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <View className="bg-white rounded-xl p-8 shadow-sm items-center mb-6">
            <Ionicons name="people" size={64} color="#A1EBE5" />
            <Text className="text-lg font-medium text-[#2C3E50] mt-4 mb-2">
              Student Management Coming Soon
            </Text>
            <Text className="text-gray-600 text-center text-sm">
              View and manage all your students in one place
            </Text>
          </View>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <View className="bg-white rounded-xl p-8 shadow-sm items-center mb-6">
            <Ionicons name="trending-up" size={64} color="#A1EBE5" />
            <Text className="text-lg font-medium text-[#2C3E50] mt-4 mb-2">
              Detailed Analytics Coming Soon
            </Text>
            <Text className="text-gray-600 text-center text-sm">
              Track student progress, engagement, and course performance
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeachersDashboard;
