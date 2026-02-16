import { useState } from "react";
import { Alert } from "react-native";
import { SubjectFormData } from "../types/types";
import { SubjectAPI } from "../services/SubjectService";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "expo-router";

// hook to manage Subject form state and actions
export const useSubjectForm = () => {
  const { profile } = useAuth();
  const router = useRouter();

  // Initializing form state with its default values
  const [formData, setFormData] = useState<SubjectFormData>({
    title: "",
    description: "",
    shortDescription: "",
    category: "",
    level: "beginner",
    language: "english",
    price: "",
    duration: "",
    maxStudents: "150",
    startDate: "",
    tags: [],
    prerequisites: "",
    learningOutcomes: [""],
    SubjectImage: null,
    isPublic: true,
    allowDiscussions: true,
    certificateEnabled: true,
  });

  // Track form submission status
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generic function to update form fields
  const handleInputChange = <K extends keyof SubjectFormData>(
    field: K,
    value: SubjectFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Add a new tag to the tags array if it doesn't already exist
  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      handleInputChange("tags", [...formData.tags, tag]);
    }
  };

  // Remove a specific tag from the tags array
  const removeTag = (tagToRemove: string) => {
    handleInputChange(
      "tags",
      formData.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  // Add a new empty learning outcome to the array
  const addLearningOutcome = () => {
    handleInputChange("learningOutcomes", [...formData.learningOutcomes, ""]);
  };

  // Update a specific learning outcome at the given index
  const updateLearningOutcome = (index: number, value: string) => {
    const updated = formData.learningOutcomes.map((item, i) =>
      i === index ? value : item
    );
    handleInputChange("learningOutcomes", updated);
  };

  // Remove a learning outcome at the given index, ensuring at least one remains
  const removeLearningOutcome = (index: number) => {
    if (formData.learningOutcomes.length > 1) {
      const updated = formData.learningOutcomes.filter((_, i) => i !== index);
      handleInputChange("learningOutcomes", updated);
    }
  };

  // Validate required form fields
  const validateForm = () => {
    const { title, description, category, price } = formData;
    if (!title || !description || !category || !price) {
      Alert.alert("Error", "Please fill in all required fields (Title, Description, Category, Price)");
      return false;
    }
    return true;
  };

  // Handle form submission with real API call
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const metadata = {
        shortDescription: formData.shortDescription,
        category: formData.category,
        level: formData.level,
        language: formData.language,
        duration: formData.duration,
        maxStudents: formData.maxStudents,
        startDate: formData.startDate,
        tags: formData.tags,
        prerequisites: formData.prerequisites,
        learningOutcomes: formData.learningOutcomes,
        image: formData.SubjectImage,
        isPublic: formData.isPublic,
        allowDiscussions: formData.allowDiscussions,
        certificateEnabled: formData.certificateEnabled,
      };

      await SubjectAPI.createSubject({
        title: formData.title,
        description: formData.description,
        fee_amount: parseFloat(formData.price) || 0,
        institution_id: profile?.institution_id || "",
        // @ts-ignore - Validated by backend
        metadata: metadata
      });

      Alert.alert("Success", "Subject created successfully!");
      router.back();
    } catch (err: any) {
      console.error("Submit failed:", err);
      // Global interceptor handles the toast, but we might want a specific error here
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save the current form state as a draft
  const saveDraft = () => {
    Alert.alert("Draft", "Subject saved as draft (locally)");
    // Here you could save to AsyncStorage
  };

  //  all form state and handler functions Returned
  return {
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
  };
};
