import { useTheme } from "@/contexts/ThemeContext";
import { useSubjectForm } from "@/hooks/useSubjectForm";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatClassLabel } from "@/utils/classLabel";

const CreateSubject = () => {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const {
        formData,
        isSubmitting,
        handleInputChange,
        handleSubmit,
    } = useSubjectForm();
    const { profile } = useAuth();
    const [classes, setClasses] = React.useState<any[]>([]);
    const [teachers, setTeachers] = React.useState<any[]>([]);

    useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await (supabase.from('classes') as any)
                .select('id, name, grade_level, form_level, stream')
                .eq('institution_id', profile?.institution_id || '')
                .order('grade_level', { ascending: true })
                .order('form_level', { ascending: true })
                .order('stream', { ascending: true });
            
            if (data) {
                const options = data.map((c: any) => ({
                    value: c.id,
                    label: formatClassLabel(c)
                }));
                setClasses(options);
            }
        };
        const fetchTeachers = async () => {
            const { data } = await supabase
                .from("teachers")
                .select("id, user_id, users:user_id(full_name, institution_id)")
                .eq("institution_id", profile?.institution_id || '');
            if (data) {
                setTeachers(data);
            }
        };
        fetchClasses();
        fetchTeachers();
    }, [profile?.institution_id]);

    const handleTeacherToggle = (teacherId: string) => {
        const currentIds = formData.teacher_ids || [];
        let updatedIds;
        if (currentIds.includes(teacherId)) {
            updatedIds = currentIds.filter((id) => id !== teacherId);
        } else {
            updatedIds = [...currentIds, teacherId];
        }
        handleInputChange("teacher_ids", updatedIds);
    };

    const handleClassToggle = (classId: string) => {
        const current = new Set<string>([...(formData.class_ids || []), ...(formData.class_id ? [formData.class_id] : [])]);
        if (current.has(classId)) current.delete(classId);
        else current.add(classId);
        const next = Array.from(current);
        handleInputChange("class_ids", next);
        handleInputChange("class_id", next[0] || "");
    };

    const handleClose = () => {
        router.back();
    };

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const surface = isDark ? '#161B22' : '#F6F8FA';
    const bg = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const inputBg = isDark ? '#161B22' : '#FFFFFF';

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(15,11,46,0.35)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 860,
                            maxHeight: '92%',
                            backgroundColor: bg,
                            borderRadius: 20,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: border,
                        }}
                    >

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
                        style={{ backgroundColor: isDark ? '#161B22' : '#f3f4f6', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: border }}
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
                        <View style={{ backgroundColor: surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16, color: textPrimary }}>
                                Basic Information
                            </Text>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>
                                    Subject Title *
                                </Text>
                                <TextInput
                                    value={formData.title}
                                    onChangeText={(text) => handleInputChange("title", text)}
                                    placeholder="Enter subject title"
                                    placeholderTextColor={textSecondary}
                                    style={{
                                        backgroundColor: inputBg,
                                        color: textPrimary,
                                        borderRadius: 12,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        borderWidth: 1,
                                        borderColor: border,
                                        fontSize: 15,
                                    }}
                                />
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Assigned Classes</Text>
                                <View style={{ backgroundColor: inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border }}>
                                    {classes.map((c) => {
                                        const selected = new Set<string>([...(formData.class_ids || []), ...(formData.class_id ? [formData.class_id] : [])]);
                                        const isSelected = selected.has(c.value);
                                        return (
                                            <TouchableOpacity
                                                key={c.value}
                                                onPress={() => handleClassToggle(c.value)}
                                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border }}
                                            >
                                                <Ionicons
                                                    name={isSelected ? 'checkbox' : 'square-outline'}
                                                    size={20}
                                                    color={isSelected ? '#FF6B00' : textSecondary}
                                                    style={{ marginRight: 10 }}
                                                />
                                                <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '500' }}>{c.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {classes.length === 0 && (
                                        <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>
                                            No classes available
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Assigned Teachers Checkbox List */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Assigned Teachers</Text>
                                <View style={{ backgroundColor: inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border }}>
                                    {teachers.map((t) => {
                                        const isSelected = (formData.teacher_ids || []).includes(t.id);
                                        return (
                                            <TouchableOpacity
                                                key={t.id}
                                                onPress={() => handleTeacherToggle(t.id)}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    paddingVertical: 10,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: border,
                                                }}
                                            >
                                                <Ionicons
                                                    name={isSelected ? "checkbox" : "square-outline"}
                                                    size={20}
                                                    color={isSelected ? "#FF6B00" : textSecondary}
                                                    style={{ marginRight: 10 }}
                                                />
                                                <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '500' }}>
                                                    {t.users?.full_name || t.id}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {teachers.length === 0 && (
                                        <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>
                                            No teachers available
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>
                                    Full Description *
                                </Text>
                                <TextInput
                                    value={formData.description}
                                    onChangeText={(text) => handleInputChange("description", text)}
                                    placeholder="Detailed Subject description"
                                    placeholderTextColor={textSecondary}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    style={{
                                        minHeight: 120,
                                        backgroundColor: inputBg,
                                        color: textPrimary,
                                        borderRadius: 12,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        borderWidth: 1,
                                        borderColor: border,
                                        fontSize: 15,
                                    }}
                                />
                            </View>
                        </View>
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
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        style={{ flex: 2, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#FF6B00', opacity: isSubmitting ? 0.5 : 1 }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                            {isSubmitting ? "Creating..." : "Create Subject"}
                        </Text>
                    </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default CreateSubject;
