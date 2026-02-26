import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { ClassService } from "@/services/ClassService";
import { supabase } from "@/libs/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface Teacher {
    id: string;
    full_name: string;
}

const GRADE_LEVELS = [
    "Pre-Primary", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "Form 1", "Form 2", "Form 3", "Form 4",
    "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

export default function CreateClassScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);

    // Form state
    const [name, setName] = useState("");
    const [gradeLevel, setGradeLevel] = useState("");
    const [capacity, setCapacity] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [showTeacherModal, setShowTeacherModal] = useState(false);

    const surface = isDark ? "#1e1e1e" : "#ffffff";
    const border = isDark ? "#2c2c2c" : "#e5e7eb";
    const inputBg = isDark ? "#242424" : "#f9fafb";
    const textPrimary = isDark ? "#f1f1f1" : "#111827";
    const textSecondary = isDark ? "#9ca3af" : "#6b7280";
    const labelColor = isDark ? "#9ca3af" : "#374151";

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            const { data } = await supabase
                .from("teachers")
                .select("id, user_id, users:user_id(full_name)") as any;

            if (data) {
                setTeachers(
                    data.map((t: any) => ({
                        id: t.id,
                        full_name: t.users?.full_name || t.id,
                    }))
                );
            }
        } catch (error) {
            console.error("Error loading teachers:", error);
        } finally {
            setLoadingTeachers(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert("Validation", "Class name is required");
            return;
        }

        try {
            setLoading(true);
            await ClassService.createClass({
                name: name.trim(),
                grade_level: gradeLevel || undefined,
                capacity: capacity ? parseInt(capacity) : undefined,
                teacher_id: teacherId || undefined,
            });
            Alert.alert("Success", "Class created successfully");
            router.back();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to create class");
        } finally {
            setLoading(false);
        }
    };

    const selectedTeacher = teachers.find((t) => t.id === teacherId);

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#121212" : "#f9fafb" }}>
            <UnifiedHeader
                title="Class Management"
                subtitle="Create Class"
                role="Admin"
                onBack={() => router.back()}
            />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {/* Class Name */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                        Class Name *
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: inputBg,
                            borderRadius: 10,
                            paddingHorizontal: 14,
                            paddingVertical: 14,
                            fontSize: 16,
                            color: textPrimary,
                            borderWidth: 1,
                            borderColor: border,
                        }}
                        placeholder="e.g. Form 1 East"
                        placeholderTextColor={textSecondary}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Grade Level */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                        Grade Level
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {GRADE_LEVELS.map((grade) => (
                                <TouchableOpacity
                                    key={grade}
                                    onPress={() => setGradeLevel(gradeLevel === grade ? "" : grade)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        borderWidth: 1.5,
                                        backgroundColor: gradeLevel === grade ? "#FF6B00" : inputBg,
                                        borderColor: gradeLevel === grade ? "#FF6B00" : border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "700",
                                            color: gradeLevel === grade ? "white" : textPrimary,
                                        }}
                                    >
                                        {grade}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Capacity */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                        Capacity
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: inputBg,
                            borderRadius: 10,
                            paddingHorizontal: 14,
                            paddingVertical: 14,
                            fontSize: 16,
                            color: textPrimary,
                            borderWidth: 1,
                            borderColor: border,
                        }}
                        placeholder="e.g. 40"
                        placeholderTextColor={textSecondary}
                        value={capacity}
                        onChangeText={setCapacity}
                        keyboardType="number-pad"
                    />
                </View>

                {/* Teacher Selection */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                        Class Teacher
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowTeacherModal(true)}
                        style={{
                            backgroundColor: inputBg,
                            borderRadius: 10,
                            paddingHorizontal: 14,
                            paddingVertical: 14,
                            borderWidth: 1,
                            borderColor: border,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ fontSize: 16, color: selectedTeacher ? textPrimary : textSecondary }}>
                            {selectedTeacher ? selectedTeacher.full_name : "Select a teacher"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Create Button */}
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={loading}
                    style={{
                        backgroundColor: "#FF6B00",
                        borderRadius: 10,
                        paddingVertical: 16,
                        alignItems: "center",
                        marginTop: 20,
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                            Create Class
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Teacher Selection Modal */}
            <Modal visible={showTeacherModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View
                        style={{
                            backgroundColor: surface,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            maxHeight: "60%",
                            paddingBottom: 20,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: border,
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: "700", color: textPrimary }}>
                                Select Teacher
                            </Text>
                            <TouchableOpacity onPress={() => setShowTeacherModal(false)}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {loadingTeachers ? (
                            <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={teachers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setTeacherId(item.id);
                                            setShowTeacherModal(false);
                                        }}
                                        style={{
                                            padding: 16,
                                            borderBottomWidth: 1,
                                            borderBottomColor: border,
                                            backgroundColor: teacherId === item.id ? inputBg : "transparent",
                                        }}
                                    >
                                        <Text style={{ fontSize: 16, color: textPrimary }}>
                                            {item.full_name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={{ textAlign: "center", color: textSecondary, marginTop: 20 }}>
                                        No teachers found
                                    </Text>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
