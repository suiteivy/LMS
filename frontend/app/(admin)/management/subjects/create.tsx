import { CustomPicker } from "@/components/form/CustomPicker";
import { FormInput } from "@/components/form/FormInput";
import { FormSection } from "@/components/form/FormSection";
import {
    IconInput,
    ImageUpload,
    LearningOutcomes,
    SettingsToggle,
    TagInput,
} from "@/components/form/IconInput";
import { useTheme } from "@/contexts/ThemeContext";
import { CATEGORIES, LEVELS } from "@/hooks/FormOption";
import { useSubjectForm } from "@/hooks/useSubjectForm";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.92;

const CreateSubject = () => {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
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

    // ── Animation values ──────────────────────────────────────────────────────
    const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Slide up + fade in backdrop simultaneously
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 120,
                mass: 0.8,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: MODAL_HEIGHT,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => router.back());
    };

    const categoryOptions = CATEGORIES.map((cat) => ({ value: cat, label: cat }));

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const bg = isDark ? '#121212' : '#f9fafb';
    const border = isDark ? '#2c2c2c' : '#e5e7eb';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const inputBg = isDark ? '#242424' : '#f9fafb';

    return (
        <View style={{ flex: 1 }}>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        opacity: backdropOpacity,
                    }}
                />
            </TouchableWithoutFeedback>

            {/* Modal Sheet */}
            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: MODAL_HEIGHT,
                    backgroundColor: bg,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    overflow: 'hidden',
                    transform: [{ translateY }],
                }}
            >
                {/* Drag handle */}
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                    <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#2c2c2c' : '#e5e7eb', borderRadius: 2 }} />
                </View>

                {/* Modal Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: border,
                    backgroundColor: surface,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', padding: 10, borderRadius: 12, marginRight: 12 }}>
                            <Ionicons name="book" size={22} color="#FF6B00" />
                        </View>
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: textPrimary }}>Create Subject</Text>
                            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 1 }}>Fill in the details below</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={{ backgroundColor: isDark ? '#242424' : '#f3f4f6', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: border }}
                    >
                        <Ionicons name="close" size={20} color={textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Scrollable Form */}
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <ScrollView
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 120 }}
                        keyboardShouldPersistTaps="handled"
                    >
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
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Price *</Text>
                                <IconInput iconName="logo-usd" value={formData.price} onChangeText={(text) => handleInputChange("price", text)} placeholder="0.00" keyboardType="numeric" />
                            </View>
                            <FormInput label="Short Description" value={formData.shortDescription} onChangeText={(text) => handleInputChange("shortDescription", text)} placeholder="Brief description for Subject preview" maxLength={150} />
                            <FormInput label="Full Description" required value={formData.description} onChangeText={(text) => handleInputChange("description", text)} placeholder="Detailed Subject description" multiline numberOfLines={6} textAlignVertical="top" style={{ minHeight: 120 }} />
                        </FormSection>

                        {/* Subject Details */}
                        <FormSection title="Subject Details">
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Duration (hours)</Text>
                                <IconInput iconName="time" value={formData.duration} onChangeText={(text) => handleInputChange("duration", text)} placeholder="0" keyboardType="numeric" />
                            </View>
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Max Students</Text>
                                <IconInput iconName="people" value={formData.maxStudents} onChangeText={(text) => handleInputChange("maxStudents", text)} placeholder="150" keyboardType="numeric" />
                            </View>
                            <TagInput tags={formData.tags} onAddTag={addTag} onRemoveTag={removeTag} />
                        </FormSection>

                        {/* Learning Outcomes */}
                        <FormSection title="Learning Outcomes">
                            <LearningOutcomes outcomes={formData.learningOutcomes} onUpdateOutcome={updateLearningOutcome} onAddOutcome={addLearningOutcome} onRemoveOutcome={removeLearningOutcome} />
                        </FormSection>

                        {/* Subject Image */}
                        <FormSection title="Subject Image">
                            <ImageUpload imageUri={formData.SubjectImage} onImageSelect={(uri) => handleInputChange("SubjectImage", uri)} />
                        </FormSection>

                        {/* Settings */}
                        <FormSection title="Subject Settings">
                            <SettingsToggle icon="globe" title="Public Subject" description="Anyone can view and enroll" value={formData.isPublic} onValueChange={(value) => handleInputChange("isPublic", value)} />
                            <SettingsToggle icon="chatbubbles" title="Allow Discussions" description="Students can discuss Subject content" value={formData.allowDiscussions} onValueChange={(value) => handleInputChange("allowDiscussions", value)} />
                            <SettingsToggle icon="ribbon" title="Certificate" description="Issue certificate upon completion" value={formData.certificateEnabled} onValueChange={(value) => handleInputChange("certificateEnabled", value)} />
                        </FormSection>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Sticky Footer Buttons */}
                <View style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    backgroundColor: surface,
                    borderTopWidth: 1,
                    borderTopColor: border,
                    paddingHorizontal: 24,
                    paddingTop: 16,
                    paddingBottom: insets.bottom + 16,
                    flexDirection: 'row',
                    gap: 12,
                }}>
                    <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: isDark ? '#242424' : '#f3f4f6', borderWidth: 1, borderColor: border }}
                        onPress={saveDraft}
                    >
                        <Text style={{ color: textSecondary, fontWeight: '600' }}>Save Draft</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        style={{ flex: 2, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#FF6B00', opacity: isSubmitting ? 0.5 : 1 }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                            {isSubmitting ? "Creating..." : "Create Subject"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

export default CreateSubject;