import { useState } from "react";
import { Alert } from "react-native";
import { SubjectFormData } from "../types/types";

//  hook to manage Subject form state and actions
export const useSubjectForm = () => {
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
      Alert.alert("Error", "Please fill in all required fields");
      return false;
    }
    return true;
  };

  // Handle form submission with a simulated async delay
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      console.log("Subject submitted:", formData);
      Alert.alert("Success", "Subject created successfully!");
      setIsSubmitting(false);
    }, 2000);
  };

  // Save the current form state as a draft
  const saveDraft = () => {
    Alert.alert("Draft", "Subject saved as draft");
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
