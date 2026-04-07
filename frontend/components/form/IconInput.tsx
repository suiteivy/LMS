import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Switch } from "react-native";
import {
  IconInputProps,
  ImageUploadProps,
  LearningOutcomesProps,
  SettingsToggleProps,
  TagInputProps,
} from "@/types/types";

export const IconInput: React.FC<IconInputProps> = ({ iconName, ...props }) => {
  return (
    <View className="flex-row items-center border border-gray-200 rounded-lg">
      <View className="px-3">
        <Ionicons name={iconName} size={20} color="#6B7280" />
      </View>
      <TextInput
        className="flex-1 py-3 pr-4"
        style={{ fontSize: 16 }}
        {...props}
      />
    </View>
  );
};

// Tag Inputs
export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
}) => {
  const [currentTag, setCurrentTag] = useState("");

  const handleAddTag = () => {
    const trimmed = currentTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
      setCurrentTag("");
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium mb-2" style={{ color: "#2C3E50" }}>
        Tags
      </Text>

      {/* Display Tags */}
      {tags.length > 0 && (
        <View className="flex-row flex-wrap mb-3">
          {tags.map((tag, index) => (
            <View
              key={index}
              className="flex-row items-center mr-2 mb-2 px-3 py-1 rounded-full"
              style={{ backgroundColor: "#A1EBE5" }}
            >
              <Ionicons name="pricetag" size={12} color="#2C3E50" />
              <Text
                className="ml-1 text-sm font-medium"
                style={{ color: "#2C3E50" }}
              >
                {tag}
              </Text>
              <TouchableOpacity
                onPress={() => onRemoveTag(tag)}
                className="ml-2"
              >
                <Ionicons name="close" size={14} color="#2C3E50" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Tag */}
      <View className="flex-row">
        <TextInput
          value={currentTag}
          onChangeText={setCurrentTag}
          placeholder="Add a tag"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg mr-2"
          style={{ fontSize: 16 }}
          onSubmitEditing={handleAddTag}
        />
        <TouchableOpacity
          onPress={handleAddTag}
          className="px-4 py-3 rounded-lg"
          style={{ backgroundColor: "#1ABC9C" }}
        >
          <Text className="text-white font-medium">Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Learning outcomes
export const LearningOutcomes: React.FC<LearningOutcomesProps> = ({
  outcomes,
  onUpdateOutcome,
  onAddOutcome,
  onRemoveOutcome,
}) => {
  return (
    <View>
      {outcomes.map((outcome, index) => (
        <View key={index} className="flex-row items-center mb-3">
          <TextInput
            value={outcome}
            onChangeText={(text) => onUpdateOutcome(index, text)}
            placeholder={`Learning outcome ${index + 1}`}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg"
            style={{ fontSize: 16 }}
          />
          {outcomes.length > 1 && (
            <TouchableOpacity
              onPress={() => onRemoveOutcome(index)}
              className="ml-2 p-2"
            >
              <Ionicons name="close" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity
        onPress={onAddOutcome}
        className="flex-row items-center mt-4 px-4 py-3 border border-gray-200 rounded-lg"
      >
        <Ionicons name="add" size={20} color="#2C3E50" />
        <Text className="ml-2 font-medium" style={{ color: "#2C3E50" }}>
          Add Learning Outcome
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Image upload
export const ImageUpload: React.FC<ImageUploadProps> = ({
  imageUri,
  onImageSelect,
}) => {
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera roll permissions");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];

        // Validate the asset
        if (!asset.uri) {
          Alert.alert('Error', 'Failed to get image URI');
          return;
        }

        onImageSelect(asset.uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  return (
    <TouchableOpacity
      onPress={pickImage}
      className="border-2 border-dashed border-gray-200 rounded-lg p-8 items-center"
    >
      {imageUri ? (
        <View className="relative">
          <Image
            source={{ uri: imageUri }}
            className="w-full h-48 rounded-lg"
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => onImageSelect(null)}
            className="absolute -top-2 -right-2 p-1 rounded-full"
            style={{ backgroundColor: "#EF4444" }}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <View className="items-center">
          <Ionicons name="cloud-upload" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 mt-2 text-center">
            Upload Subject thumbnail
          </Text>
          <Text className="text-sm text-gray-400 mt-1">PNG, JPG up to 5MB</Text>
          <View
            className="mt-4 px-6 py-2 rounded-lg"
            style={{ backgroundColor: "#1ABC9C" }}
          >
            <Text className="text-white font-medium">Choose Image</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Setting toggle
export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  icon,
  title,
  description,
  value,
  onValueChange,
}) => {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center flex-1">
        <Ionicons name={icon} size={20} color="#6B7280" />
        <View className="ml-3 flex-1">
          <Text className="font-medium" style={{ color: "#2C3E50" }}>
            {title}
          </Text>
          <Text className="text-sm text-gray-500">{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D5DB", true: "#1ABC9C" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
};
