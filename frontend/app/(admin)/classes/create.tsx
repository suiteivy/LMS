import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ClassService } from "@/services/ClassService";
import { supabase } from "@/libs/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import {
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

interface DomainCategory {
    id: string;
    name: string;
}

interface DomainLevel {
    id: string;
    category_id: string;
    level_number: number;
    name?: string | null;
    class_type?: string;
}

interface DomainStream {
    id: string;
    level_id: string | null;
    code: string;
    label: string;
}

export default function CreateClassScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);

    // Form state
    const [gradeLevel, setGradeLevel] = useState("");
    const [capacity, setCapacity] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [levels, setLevels] = useState<string[]>([]);
    const [categories, setCategories] = useState<DomainCategory[]>([]);
    const [domainLevels, setDomainLevels] = useState<DomainLevel[]>([]);
    const [domainStreams, setDomainStreams] = useState<DomainStream[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [levelId, setLevelId] = useState('');
    const [streamId, setStreamId] = useState('');
    const [classType, setClassType] = useState('Grade');
    const [classTypes, setClassTypes] = useState<string[]>(['Grade']);
    const [structure, setStructure] = useState<'stream' | 'single'>('stream');

    const surface = isDark ? "#161B22" : "#ffffff";
    const border = isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
    const inputBg = isDark ? "#161B22" : "#f9fafb";
    const textPrimary = isDark ? "#f1f1f1" : "#111827";
    const textSecondary = isDark ? "#9ca3af" : "#6b7280";
    const labelColor = isDark ? "#9ca3af" : "#374151";
    
    const { profile } = useAuth();
    const instLevelLabel = classType || 'Grade';

    const availableLevels = categoryId
        ? domainLevels.filter((item) => item.category_id === categoryId)
        : domainLevels;

    const availableStreams = levelId
        ? domainStreams.filter((item) => item.level_id === levelId)
        : [];

    useEffect(() => {
        const init = async () => {
            await Promise.all([loadTeachers(), loadClassOptions()]);
        };
        init();
    }, []);

    const loadClassOptions = async () => {
        try {
            const options = await ClassService.getClassOptions();
            const optionMap = new Map((options.level_options || []).map((item) => [item.level_id, item]));
            const optionLabels = (options.level_options || []).map((item) => item.label).filter(Boolean);
            setLevels(optionLabels);
            setClassType(options.class_type || 'Grade');
            setClassTypes((options.class_types || [options.class_type || 'Grade']).filter(Boolean));
            setCategories((options.categories || []).map((item) => ({ id: item.id, name: item.name })));
            setDomainLevels((options.levels || []).map((item) => ({
                id: item.id,
                category_id: item.category_id,
                level_number: item.level_number,
                name: item.name,
                class_type: optionMap.get(item.id)?.class_type || options.class_type || 'Grade',
            })));
            setDomainStreams((options.stream_options || []).map((item) => ({
                id: item.id,
                level_id: item.level_id,
                code: item.code,
                label: item.label,
            })));
        } catch (error) {
            console.error("Error loading class options:", error);
            setLevels([]);
            setCategories([]);
            setDomainLevels([]);
            setDomainStreams([]);
        }
    };

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
        try {
            setLoading(true);
            const numLevel = gradeLevel ? parseInt(gradeLevel.replace(/[^0-9]/g, '')) : undefined;
            await ClassService.createClass({
                class_type: classType,
                category_id: categoryId || undefined,
                level_id: levelId || undefined,
                stream_id: structure === 'single' ? undefined : (streamId || undefined),
                grade_level: (instLevelLabel === 'Grade' || instLevelLabel === 'KG') ? numLevel : undefined,
                form_level: instLevelLabel === 'Form' ? numLevel : undefined,
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
        <View style={{ flex: 1, backgroundColor: isDark ? "#161B22" : "#f9fafb" }}>
            <UnifiedHeader
                title="Class Management"
                subtitle="Create Class"
                role="Admin"
                onBack={() => router.back()}
            />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                        Type
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {classTypes.map((typeName) => (
                                <TouchableOpacity
                                    key={typeName}
                                    onPress={() => {
                                        setClassType(typeName);
                                        setCategoryId('');
                                        setLevelId('');
                                        setStreamId('');
                                        setGradeLevel('');
                                    }}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        borderWidth: 1.5,
                                        backgroundColor: classType === typeName ? "#0EA5E9" : inputBg,
                                        borderColor: classType === typeName ? "#0EA5E9" : border,
                                    }}
                                >
                                    <Text style={{ color: classType === typeName ? "white" : textPrimary, fontSize: 12, fontWeight: "700" }}>
                                        {typeName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                        {instLevelLabel} Level
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {levels.map((grade) => (
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

                {categories.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                            Category
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category.id}
                                        onPress={() => {
                                            const nextCategoryId = categoryId === category.id ? '' : category.id;
                                            setCategoryId(nextCategoryId);
                                            setLevelId('');
                                            setStreamId('');
                                        }}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            borderWidth: 1.5,
                                            backgroundColor: categoryId === category.id ? "#0EA5E9" : inputBg,
                                            borderColor: categoryId === category.id ? "#0EA5E9" : border,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: "700", color: categoryId === category.id ? "white" : textPrimary }}>
                                            {category.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {availableLevels.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                            Level
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {availableLevels.map((level) => (
                                    <TouchableOpacity
                                        key={level.id}
                                        onPress={() => {
                                            const nextLevelId = levelId === level.id ? '' : level.id;
                                            setLevelId(nextLevelId);
                                            setStreamId('');
                                            if (nextLevelId) {
                                                setGradeLevel(`${instLevelLabel} ${level.level_number}`);
                                            }
                                        }}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            borderWidth: 1.5,
                                            backgroundColor: levelId === level.id ? "#0EA5E9" : inputBg,
                                            borderColor: levelId === level.id ? "#0EA5E9" : border,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: "700", color: levelId === level.id ? "white" : textPrimary }}>
                                            {level.name || `${instLevelLabel} ${level.level_number}`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Class Structure (Entire Grade vs Streams) */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                        Class Structure
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => setStructure('stream')}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                borderRadius: 10,
                                borderWidth: 1.5,
                                backgroundColor: structure === 'stream' ? (isDark ? "rgba(14,165,233,0.15)" : "#e0f2fe") : inputBg,
                                borderColor: structure === 'stream' ? "#0EA5E9" : border,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: "700", color: structure === 'stream' ? "#0EA5E9" : textPrimary, marginBottom: 2 }}>
                                Streams / Sections
                            </Text>
                            <Text style={{ fontSize: 11, color: textSecondary }}>
                                Multi-class grade (e.g. 1A, 1B)
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setStructure('single');
                                setStreamId('');
                            }}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                borderRadius: 10,
                                borderWidth: 1.5,
                                backgroundColor: structure === 'single' ? (isDark ? "rgba(255,107,0,0.15)" : "#fff7ed") : inputBg,
                                borderColor: structure === 'single' ? "#FF6B00" : border,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: "700", color: structure === 'single' ? "#FF6B00" : textPrimary, marginBottom: 2 }}>
                                Entire Grade (1 Class)
                            </Text>
                            <Text style={{ fontSize: 11, color: textSecondary }}>
                                Standalone class (e.g. Grade 1)
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {structure === 'single' ? (
                    <View
                        style={{
                            marginBottom: 20,
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: isDark ? "rgba(255,107,0,0.1)" : "#fff7ed",
                            borderWidth: 1,
                            borderColor: isDark ? "rgba(255,107,0,0.25)" : "#fed7aa",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <Ionicons name="information-circle-outline" size={20} color="#FF6B00" />
                        <Text style={{ fontSize: 13, color: isDark ? "#ffedd5" : "#9a3412", flex: 1 }}>
                            This class will represent the entire grade as a single standalone class. No stream selection is needed.
                        </Text>
                    </View>
                ) : (
                    availableStreams.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: labelColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                                Stream / Section
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {availableStreams.map((streamItem) => (
                                        <TouchableOpacity
                                            key={streamItem.id}
                                            onPress={() => {
                                                const nextStreamId = streamId === streamItem.id ? '' : streamItem.id;
                                                setStreamId(nextStreamId);
                                                if (nextStreamId && !gradeLevel && levelId) {
                                                    const selectedLevel = domainLevels.find((item) => item.id === levelId);
                                                    if (selectedLevel) {
                                                        setGradeLevel(`${instLevelLabel} ${selectedLevel.level_number}`);
                                                    }
                                                }
                                            }}
                                            style={{
                                                paddingHorizontal: 14,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                borderWidth: 1.5,
                                                backgroundColor: streamId === streamItem.id ? "#0EA5E9" : inputBg,
                                                borderColor: streamId === streamItem.id ? "#0EA5E9" : border,
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: "700", color: streamId === streamItem.id ? "white" : textPrimary }}>
                                                {streamItem.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )
                )}

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
                        opacity: loading ? 0.75 : 1,
                    }}
                    accessibilityState={{ disabled: loading, busy: loading }}
                >
                    {loading ? (
                        <Spinner color="white" label="Creating class" />
                    ) : (
                        <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                            Create Class
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Teacher Selection Modal */}
            <Modal visible={showTeacherModal} animationType="fade" transparent onRequestClose={() => setShowTeacherModal(false)}>
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
                    <View
                        style={{
                            backgroundColor: surface,
                            borderRadius: 24,
                            width: "100%",
                            maxWidth: 520,
                            maxHeight: "75%",
                            paddingBottom: 20,
                            borderWidth: 1,
                            borderColor: border,
                            shadowColor: "#000",
                            shadowOpacity: 0.25,
                            shadowRadius: 20,
                            elevation: 10,
                        }}
                        accessibilityState={{ busy: loadingTeachers }}
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
                            <View style={{ marginTop: 20 }}>
                                <Spinner size="large" color="#FF6B00" centered label="Loading teachers" />
                            </View>
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
