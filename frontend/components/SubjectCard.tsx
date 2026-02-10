import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Subject } from "@/types/types";

interface SubjectCardProps {
  Subject: Subject;
  onPress: () => void;
  variant?: "default" | "compact" | "featured";
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  Subject,
  onPress,
  variant = "default",
}) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "#1ABC9C";
      case "intermediate":
        return "#F39C12";
      case "advanced":
        return "#E74C3C";
      default:
        return "#1ABC9C";
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? "Free" : `$${price}`;
  };

  if (variant === "compact") {
    return (
      <TouchableOpacity
        onPress={onPress}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3"
      >
        <View className="flex-row">
          <Image
            source={{ uri: Subject.image }}
            className="w-16 h-16 rounded-lg"
            resizeMode="cover"
          />
          <View className="flex-1 ml-3">
            <Text
              className="font-semibold text-sm"
              style={{ color: "#2C3E50" }}
              numberOfLines={2}
            >
              {Subject.title}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              {Subject.instructor.name}
            </Text>
            <View className="flex-row items-center mt-2">
              <View className="flex-row items-center mr-3">
                <Ionicons name="star" size={12} color="#F39C12" />
                <Text className="text-xs text-gray-600 ml-1">
                  {Subject.rating}
                </Text>
              </View>
              <Text
                className="text-xs font-semibold"
                style={{ color: "#1ABC9C" }}
              >
                {formatPrice(Subject.price)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === "featured") {
    return (
      <TouchableOpacity
        onPress={onPress}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden"
      >
        <View className="relative">
          <Image
            source={{ uri: Subject.image }}
            className="w-full h-48"
            resizeMode="cover"
          />
          <View className="absolute top-3 left-3">
            <View
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: getLevelColor(Subject.level) }}
            >
              <Text className="text-white text-xs font-medium capitalize">
                {Subject.level}
              </Text>
            </View>
          </View>
          {Subject.originalPrice && Subject.originalPrice > Subject.price && (
            <View
              className="absolute top-3 right-3 px-2 py-1 rounded-full"
              style={{ backgroundColor: "#E74C3C" }}
            >
              <Text className="text-white text-xs font-bold">
                {Math.round(
                  ((Subject.originalPrice - Subject.price) /
                    Subject.originalPrice) *
                  100
                )}
                % OFF
              </Text>
            </View>
          )}
        </View>

        <View className="p-4">
          <Text
            className="font-bold text-lg mb-2"
            style={{ color: "#2C3E50" }}
            numberOfLines={2}
          >
            {Subject.title}
          </Text>

          <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
            {Subject.shortDescription}
          </Text>

          <View className="flex-row items-center mb-3">
            <Ionicons name="person-circle" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-1">
              {Subject.instructor.name}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color="#F39C12" />
              <Text
                className="text-sm font-medium ml-1"
                style={{ color: "#2C3E50" }}
              >
                {Subject.rating}
              </Text>
              <Text className="text-sm text-gray-500 ml-1">
                ({Subject.reviewsCount})
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="people" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-1">
                {Subject.studentsCount}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              {Subject.originalPrice && Subject.originalPrice > Subject.price && (
                <Text className="text-sm text-gray-400 line-through">
                  ${Subject.originalPrice}
                </Text>
              )}
              <Text
                className="text-xl font-bold"
                style={{ color: Subject.price === 0 ? "#1ABC9C" : "#2C3E50" }}
              >
                {formatPrice(Subject.price)}
              </Text>
            </View>

            <TouchableOpacity
              className="px-6 py-2 rounded-lg"
              style={{ backgroundColor: "#1ABC9C" }}
            >
              <Text className="text-white font-semibold">
                {Subject.isEnrolled ? "Continue" : "Enroll"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden"
    >
      <Image
        source={{ uri: Subject.image }}
        className="w-full h-40"
        resizeMode="cover"
      />

      <View className="p-4">
        <View className="flex-row items-center justify-between mb-2">
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: "#A1EBE5" }}
          >
            <Text
              className="text-xs font-medium capitalize"
              style={{ color: "#2C3E50" }}
            >
              {Subject.level}
            </Text>
          </View>
          <Text className="text-xs text-gray-500">{Subject.category}</Text>
        </View>

        <Text
          className="font-bold text-base mb-2"
          style={{ color: "#2C3E50" }}
          numberOfLines={2}
        >
          {Subject.title}
        </Text>

        <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
          {Subject.shortDescription}
        </Text>

        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#F39C12" />
            <Text className="text-sm ml-1" style={{ color: "#2C3E50" }}>
              {Subject.rating}
            </Text>
            <Text className="text-sm text-gray-500 ml-1">
              ({Subject.reviewsCount})
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="time" size={14} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-1">
              {Subject.duration}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text
            className="text-lg font-bold"
            style={{ color: Subject.price === 0 ? "#1ABC9C" : "#2C3E50" }}
          >
            {formatPrice(Subject.price)}
          </Text>

          <Text className="text-sm text-gray-500">
            {Subject.studentsCount} students
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
