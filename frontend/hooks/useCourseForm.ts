import { useState } from 'react';
import { Alert } from 'react-native';
import { CourseFormData } from '../types/types';

export const useCourseForm = () => {
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    shortDescription: "",
    category: "",
    level: "beginner",
    language: "english",
    price: "",
    duration: "",
    maxStudents: "150", // Set to 150 as requested
    startDate: "",
    tags: [],
    prerequisites: "",
    learningOutcomes: [""],
    courseImage: null,
    isPublic: true,
    allowDiscussions: true,
    certificateEnabled: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = <K extends keyof CourseFormData>(
    field: K,
    value: CourseFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      handleInputChange("tags", [...formData.tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange("tags", formData.tags.filter((tag) => tag !== tagToRemove));
  };

  const addLearningOutcome = () => {
    handleInputChange("learningOutcomes", [...formData.learningOutcomes, ""]);
  };

  const updateLearningOutcome = (index: number, value: string) => {
    const updated = formData.learningOutcomes.map((item, i) =>
      i === index ? value : item
    );
    handleInputChange("learningOutcomes", updated);
  };

  const removeLearningOutcome = (index: number) => {
    if (formData.learningOutcomes.length > 1) {
      const updated = formData.learningOutcomes.filter((_, i) => i !== index);
      handleInputChange("learningOutcomes", updated);
    }
  };

  const validateForm = () => {
    const { title, description, category, price } = formData;
    if (!title || !description || !category || !price) {
      Alert.alert("Error", "Please fill in all required fields");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      console.log("Course submitted:", formData);
      Alert.alert("Success", "Course created successfully!");
      setIsSubmitting(false);
    }, 2000);
  };

  const saveDraft = () => {
    Alert.alert("Draft", "Course saved as draft");
  };

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