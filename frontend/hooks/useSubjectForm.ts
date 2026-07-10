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
    class_id: "",
    class_ids: [],
    teacher_ids: [],
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

  // Validate required form fields
  const validateForm = () => {
    const { title, description } = formData;
    if (!title || !description) {
      Alert.alert("Error", "Please fill in all required fields (Title, Description)");
      return false;
    }
    return true;
  };

  // Handle form submission with real API call
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const created = await SubjectAPI.createSubject({
        title: formData.title,
        description: formData.description,
        institution_id: profile?.institution_id || "",
        class_id: formData.class_id || undefined,
        class_ids: formData.class_ids || [],
        teacher_ids: formData.teacher_ids || [],
        fee_amount: 0,
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
    handleSubmit,
    saveDraft,
  };
};
