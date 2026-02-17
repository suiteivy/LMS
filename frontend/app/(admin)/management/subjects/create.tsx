import React from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
    IconInput,
    ImageUpload,
    LearningOutcomes,
    SettingsToggle,
    TagInput,
} from "@/components/form/IconInput";
import { FormInput } from "@/components/form/FormInput";
import { FormSection } from "@/components/form/FormSection";
import { CustomPicker } from "@/components/form/CustomPicker";
import { useSubjectForm } from "@/hooks/useSubjectForm";
import { CATEGORIES, LEVELS } from "@/hooks/FormOption";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const CreateSubject = () => {
    const router = useRouter();
    const {
        formData,
        isSubmitting,
        handleInputChange,
        addTag,
        removeTag,
        addLearningOutcome,
        updateLearningOutcome,
        removeLearningOutcome,
        handleSubmit,
        saveDraft,
    } = useSubjectForm();

    const categoryOptions = CATEGORIES.map((cat) => ({ value: cat, label: cat }));

    return (
        <KeyboardAvoidingView
            className="flex-1"
            style={{ backgroundColor: "#F1FFF8" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <SafeAreaView>
                    <View className="px-6 py-8">
                        {/* Back Button */}
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="mb-4 flex-row items-center"
                            accessibilityLabel="Go back"
                        >
                            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                            <Text className="ml-2 text-base font-medium" style={{ color: "#2C3E50" }}>
                                Back
                            </Text>
                        </TouchableOpacity>

                        {/* Header */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-2">
                                <View
                                    className="p-3 rounded-xl mr-3"
                                    style={{ backgroundColor: "#A1EBE5" }}
                                >
                                    <Ionicons name="book" size={24} color="#2C3E50" />
                                </View>
                                <View className="flex-1">
                                    <Text
                                        className="text-2xl font-bold"
                                        style={{ color: "#2C3E50" }}
                                    >
                                        Create New Subject
                                    </Text>
                                    <Text className="text-gray-600 mt-1">
                                        Fill in the details to create your subject
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Basic Information */}
                        <FormSection title="Basic Information">
                            <FormInput
                                label="Subject Title"
                                required
                                value={formData.title}
                                onChangeText={(text) => handleInputChange("title", text)}
                                placeholder="Enter subject title"
                            />


                            <CustomPicker
                                label="Category"
                                required
                                value={formData.category}
                                options={categoryOptions}
                                onSelect={(value) => handleInputChange("category", value)}
                                placeholder="Select category"
                            />

                            <CustomPicker
                                label="Level"
                                value={formData.level}
                                options={LEVELS}
                                onSelect={(value) => handleInputChange("level", value)}
                            />

                            <View className="mb-4">
                                <Text
                                    className="text-sm font-medium mb-2"
                                    style={{ color: "#2C3E50" }}
                                >
                                    Price *
                                </Text>
                                <IconInput
                                    iconName="logo-usd"
                                    value={formData.price}
                                    onChangeText={(text) => handleInputChange("price", text)}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                />
                            </View>

                            <FormInput
                                label="Short Description"
                                value={formData.shortDescription}
                                onChangeText={(text) =>
                                    handleInputChange("shortDescription", text)
                                }
                                placeholder="Brief description for Subject preview"
                                maxLength={150}
                            />

                            <FormInput
                                label="Full Description"
                                required
                                value={formData.description}
                                onChangeText={(text) => handleInputChange("description", text)}
                                placeholder="Detailed Subject description"
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                style={{ minHeight: 120 }}
                            />
                        </FormSection>

                        {/* Subject Details */}
                        <FormSection title="Subject Details">
                            <View className="mb-4">
                                <Text
                                    className="text-sm font-medium mb-2"
                                    style={{ color: "#2C3E50" }}
                                >
                                    Duration (hours)
                                </Text>
                                <IconInput
                                    iconName="time"
                                    value={formData.duration}
                                    onChangeText={(text) => handleInputChange("duration", text)}
                                    placeholder="0"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View className="mb-4">
                                <Text
                                    className="text-sm font-medium mb-2"
                                    style={{ color: "#2C3E50" }}
                                >
                                    Max Students
                                </Text>
                                <IconInput
                                    iconName="people"
                                    value={formData.maxStudents}
                                    onChangeText={(text) => handleInputChange("maxStudents", text)}
                                    placeholder="150"
                                    keyboardType="numeric"
                                />
                            </View>

                            <TagInput
                                tags={formData.tags}
                                onAddTag={addTag}
                                onRemoveTag={removeTag}
                            />
                        </FormSection>

                        {/* Learning Outcomes */}
                        <FormSection title="Learning Outcomes">
                            <LearningOutcomes
                                outcomes={formData.learningOutcomes}
                                onUpdateOutcome={updateLearningOutcome}
                                onAddOutcome={addLearningOutcome}
                                onRemoveOutcome={removeLearningOutcome}
                            />
                        </FormSection>

                        {/* Subject Image */}
                        <FormSection title="Subject Image">
                            <ImageUpload
                                imageUri={formData.SubjectImage}
                                onImageSelect={(uri) => handleInputChange("SubjectImage", uri)}
                            />
                        </FormSection>

                        {/* Settings */}
                        <FormSection title="Subject Settings">
                            <SettingsToggle
                                icon="globe"
                                title="Public Subject"
                                description="Anyone can view and enroll"
                                value={formData.isPublic}
                                onValueChange={(value) => handleInputChange("isPublic", value)}
                            />

                            <SettingsToggle
                                icon="chatbubbles"
                                title="Allow Discussions"
                                description="Students can discuss Subject content"
                                value={formData.allowDiscussions}
                                onValueChange={(value) =>
                                    handleInputChange("allowDiscussions", value)
                                }
                            />

                            <SettingsToggle
                                icon="ribbon"
                                title="Certificate"
                                description="Issue certificate upon completion"
                                value={formData.certificateEnabled}
                                onValueChange={(value) =>
                                    handleInputChange("certificateEnabled", value)
                                }
                            />
                        </FormSection>

                        {/* Submit Buttons */}
                        <View className="space-y-4">
                            <TouchableOpacity
                                className="w-full py-4 border border-gray-200 rounded-lg items-center"
                                onPress={saveDraft}
                            >
                                <Text className="text-gray-700 font-medium">Save as Draft</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                className={`w-full py-4 rounded-lg items-center ${isSubmitting ? "opacity-50" : ""
                                    }`}
                                style={{ backgroundColor: "#1ABC9C" }}
                            >
                                <Text className="text-white font-medium text-lg">
                                    {isSubmitting ? "Creating Subject..." : "Create Subject"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default CreateSubject;
