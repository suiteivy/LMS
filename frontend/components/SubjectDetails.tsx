import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Subject, Lesson } from "@/types/types";

interface SubjectDetailsProps {
  Subject: Subject;
  onEnroll: () => void;
  onBack: () => void;
  enrolling?: boolean;
}

export const SubjectDetails: React.FC<SubjectDetailsProps> = ({
  Subject,
  onEnroll,
  onBack,
  enrolling = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "lessons" | "reviews"
  >("overview");

  const LessonItem: React.FC<{ lesson: Lesson; index: number }> = ({
    lesson,
    index,
  }) => (
    <View className="flex-row items-center p-4 border-b border-gray-100">
      <View
        className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${lesson.isCompleted
          ? "bg-orange-200"
          : lesson.isLocked
            ? "bg-gray-200"
            : "bg-orange-50"
          }`}
      >
        {lesson.isCompleted ? (
          <Ionicons name="checkmark" size={16} color="white" />
        ) : lesson.isLocked ? (
          <Ionicons name="lock-closed" size={14} color="#6B7280" />
        ) : (
          <Text className="text-xs font-bold text-[#2C3E50]">{index + 1}</Text>
        )}
      </View>

      <View className="flex-1">
        <Text
          className={`font-medium ${lesson.isLocked ? "text-gray-400" : "text-[#2C3E50]"}`}
        >
          {lesson.title}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons
            name={
              lesson.type === "video"
                ? "play-circle"
                : lesson.type === "quiz"
                  ? "help-circle"
                  : "document-text"
            }
            size={14}
            color="#6B7280"
            // color={'#fff'}
          />
          <Text className="text-sm text-gray-500 ml-1 capitalize">
            {lesson.type} • {lesson.duration}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-orange-200">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4 shadow-sm">
        <TouchableOpacity onPress={onBack} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Subject Hero */}
        <View className="bg-white">
          <Image
            source={{ uri: Subject.image }}
            className="w-full h-48"
            resizeMode="cover"
          />

          <View className="p-6">
            <View className="flex-row items-center mb-2">
              <View className="px-3 py-1 rounded-full mr-3 bg-orange-100">
                <Text className="text-sm font-medium text-[#2C3E50]">
                  {Subject.level}
                </Text>
              </View>
              <Text className="text-sm text-gray-500">{Subject.category}</Text>
            </View>

            <Text className="text-2xl font-bold mb-2 text-[#2C3E50]">
              {Subject.title}
            </Text>
            <Text className="text-gray-600 mb-4">{Subject.description}</Text>

            {/* Stats Row */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <Ionicons name="star" size={16} color="#F39C12" />
                <Text className="font-medium ml-1 text-[#2C3E50]">
                  {Subject.rating}
                </Text>
                <Text className="text-gray-500 ml-1">
                  ({Subject.reviewsCount})
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="people" size={16} color="#6B7280" />
                <Text className="text-gray-600 ml-1">
                  {Subject.studentsCount}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="time" size={16} color="#6B7280" />
                <Text className="text-gray-600 ml-1">{Subject.duration}</Text>
              </View>
            </View>

            {/* Price & Enroll */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-3xl font-bold text-black">
                  {Subject.price === 0 ? "Free" : `$${Subject.price}`}
                </Text>
                {Subject.originalPrice &&
                  Subject.originalPrice > Subject.price && (
                    <Text className="text-gray-400 line-through">
                      ${Subject.originalPrice}
                    </Text>
                  )}
              </View>

              <TouchableOpacity
                onPress={onEnroll}
                disabled={enrolling || Subject.isEnrolled}
                className={`px-8 py-3 rounded-lg ${Subject.isEnrolled ? "bg-gray-400" : "bg-orange-400"}`}
              >
                <Text className="text-white font-bold text-lg">
                  {enrolling ? "Enrolling..." : Subject.isEnrolled ? "Enrolled" : "Enroll Now"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="bg-white mt-2">
          <View className="flex-row border-b border-gray-100">
            {[
              { key: "overview", label: "Overview" },
              { key: "lessons", label: "Lessons" },
              { key: "reviews", label: "Reviews" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-4 items-center border-b-2 ${activeTab === tab.key
                  ? "border-[#fd6900] bg-orange-300"
                  : "border-transparent"
                  }`}
              >
                <Text
                  className={`font-medium ${activeTab === tab.key ? "text-white" : "text-gray-500"
                    }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View className="p-6">
            {activeTab === "overview" && (
              <View>
                <Text className="text-lg font-bold mb-4 text-[#2C3E50]">
                  What You'll Learn
                </Text>
                {Subject.tags.map((tag, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#1ABC9C"
                    />
                    <Text className="ml-2 text-gray-700">{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "lessons" && (
              <View>
                <Text className="text-lg font-bold mb-4 text-[#2C3E50]">
                  Subject Content
                </Text>
                <View className="bg-gray-50 rounded-xl overflow-hidden">
                  {Subject.lessons.map((lesson, index) => (
                    <LessonItem key={lesson.id} lesson={lesson} index={index} />
                  ))}
                </View>
              </View>
            )}

            {activeTab === "reviews" && (
              <View>
                <Text className="text-lg font-bold mb-4 text-[#2C3E50]">
                  Student Reviews
                </Text>
                <View className="items-center py-8">
                  <Ionicons name="chatbubbles" size={48} color="#fb6900" />
                  <Text className="text-gray-500 mt-4">No reviews yet</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
