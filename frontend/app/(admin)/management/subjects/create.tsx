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
import { ClassService } from "@/services/ClassService";
import { ActionTooltip } from "@/components/common/ActionTooltip";
import { SubjectAPI, SubjectCategoryData } from "@/services/SubjectService";
import { SubjectCategoryModal } from "@/components/admin/SubjectCategoryModal";

const CreateSubject = () => {
    const router = useRouter();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const {
        formData,
        isValid,
        isSubmitting,
        handleInputChange,
        handleSubmit,
    } = useSubjectForm();
    const { profile, isReadOnlyAdmin } = useAuth();
    const [classes, setClasses] = React.useState<any[]>([]);
    const [teachers, setTeachers] = React.useState<any[]>([]);
    const [levels, setLevels] = React.useState<any[]>([]);
    const [categories, setCategories] = React.useState<SubjectCategoryData[]>([]);
    const [showCategoryModal, setShowCategoryModal] = React.useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await SubjectAPI.getSubjectCategories();
                setCategories(data || []);
            } catch (err) {
                console.warn('Error fetching subject categories:', err);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const data = await ClassService.getClasses();
                if (data && data.length > 0) {
                    const options = data.map((c: any) => ({
                        value: c.id,
                        level_id: c.level_id,
                        label: formatClassLabel(c)
                    }));
                    setClasses(options);
                    return;
                }
            } catch (err) {
                console.warn('ClassService.getClasses error, falling back to direct query:', err);
            }

            const { data } = await (supabase.from('classes') as any)
                .select('id, display_name, grade_level, form_level, stream, level_id')
                .eq('institution_id', profile?.institution_id || '')
                .order('grade_level', { ascending: true })
                .order('form_level', { ascending: true })
                .order('stream', { ascending: true });
            
            if (data) {
                const options = data.map((c: any) => ({
                    value: c.id,
                    level_id: c.level_id,
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
        const fetchLevels = async () => {
            try {
                const domainOptions = await ClassService.getClassOptions();
                if (domainOptions && domainOptions.levels && domainOptions.levels.length > 0) {
                    setLevels(domainOptions.levels);
                    return;
                }
            } catch (err) {
                console.warn('ClassService.getClassOptions error:', err);
            }
            const { data } = await (supabase.from('class_levels') as any)
                .select('id, name, level_number')
                .eq('institution_id', profile?.institution_id || '')
                .order('sort_order', { ascending: true })
                .order('level_number', { ascending: true });
            if (data) setLevels(data);
        };
        fetchClasses();
        fetchTeachers();
        fetchLevels();
    }, [profile?.institution_id]);

    const handleLevelToggle = (levelId: string) => {
        const current = new Set<string>(formData.level_ids || []);
        if (current.has(levelId)) current.delete(levelId);
        else current.add(levelId);
        handleInputChange("level_ids", Array.from(current));
    };

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
                                    placeholder="e.g. Mathematics, Physical Science"
                                    placeholderTextColor={textSecondary}
                                    style={{
                                        backgroundColor: inputBg,
                                        color: textPrimary,
                                        borderRadius: 12,
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderWidth: 1,
                                        borderColor: border,
                                        fontSize: 15,
                                    }}
                                />
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>
                                    Description
                                </Text>
                                <TextInput
                                    value={formData.description}
                                    onChangeText={(text) => handleInputChange("description", text)}
                                    placeholder="Overview of subject syllabus and scope"
                                    placeholderTextColor={textSecondary}
                                    multiline
                                    numberOfLines={3}
                                    style={{
                                        backgroundColor: inputBg,
                                        borderRadius: 12,
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderWidth: 1,
                                        borderColor: border,
                                        color: textPrimary,
                                        fontSize: 14,
                                        textAlignVertical: 'top',
                                        minHeight: 80,
                                    }}
                                />
                            </View>

                            {/* Curriculum Category (Optional) */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary }}>
                                        Curriculum Category (Optional)
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                                        <Text style={{ fontSize: 11, color: '#FF6B00', fontWeight: '600' }}>
                                            {categories.length === 0 ? '+ Create Category' : 'Manage Categories'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 8 }}>
                                    Classify subjects into curriculum areas (e.g. Sciences, Languages, Humanities).
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                                    {/* Uncategorized / None option */}
                                    <TouchableOpacity
                                        onPress={() => handleInputChange("category_id", null)}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: !formData.category_id ? '#FF6B00' : border,
                                            backgroundColor: !formData.category_id ? (isDark ? '#21262D' : '#FFF7ED') : inputBg,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: !formData.category_id ? '700' : '500', color: !formData.category_id ? '#FF6B00' : textPrimary }}>
                                            None (Uncategorized)
                                        </Text>
                                    </TouchableOpacity>
                                    {categories.map((cat) => {
                                        const isSelected = formData.category_id === cat.id;
                                        const catColor = cat.color || '#3B82F6';
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                onPress={() => handleInputChange("category_id", cat.id)}
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? catColor : border,
                                                    backgroundColor: isSelected ? `${catColor}20` : inputBg,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColor }} />
                                                <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '500', color: isSelected ? catColor : textPrimary }}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Level Scoping */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary }}>
                                        Applicable Levels
                                    </Text>
                                    {(formData.level_ids || []).length > 0 && (
                                        <TouchableOpacity onPress={() => handleInputChange("level_ids", [])}>
                                            <Text style={{ fontSize: 11, color: '#FF6B00', fontWeight: '600' }}>Clear Filter</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 8 }}>
                                    Select which educational levels take this subject. Selecting levels also filters the assigned classes list below.
                                </Text>
                                {levels.length > 0 ? (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {levels.map((lvl) => {
                                            const isSelected = (formData.level_ids || []).includes(lvl.id);
                                            return (
                                                <TouchableOpacity
                                                    key={lvl.id}
                                                    onPress={() => handleLevelToggle(lvl.id)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 20,
                                                        borderWidth: 1,
                                                        borderColor: isSelected ? '#FF6B00' : border,
                                                        backgroundColor: isSelected ? (isDark ? '#21262D' : '#FFF7ED') : inputBg,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: isSelected ? '700' : '500',
                                                            color: isSelected ? '#FF6B00' : textPrimary,
                                                        }}
                                                    >
                                                        {lvl.name || `Level ${lvl.level_number || ''}`}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary }}>Assigned Classes</Text>
                                    {(formData.level_ids || []).length > 0 && (
                                        <Text style={{ fontSize: 11, color: '#FF6B00', fontWeight: '600' }}>
                                            Filtered by {formData.level_ids?.length} Level(s)
                                        </Text>
                                    )}
                                </View>
                                <View style={{ backgroundColor: inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border }}>
                                    {(() => {
                                        const selectedLevels = formData.level_ids || [];
                                        const displayedClasses = selectedLevels.length > 0
                                            ? classes.filter(c => !c.level_id || selectedLevels.includes(c.level_id))
                                            : classes;

                                        return (
                                            <>
                                                {displayedClasses.map((c) => {
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
                                                {displayedClasses.length === 0 && (
                                                    <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>
                                                        {selectedLevels.length > 0 ? 'No classes found in selected level(s)' : 'No classes available'}
                                                    </Text>
                                                )}
                                            </>
                                        );
                                    })()}
                                </View>
                            </View>

                            {/* Per-Class Teacher Assignment Matrix */}
                            {(() => {
                                const selectedClassIds = Array.from(new Set([...(formData.class_ids || []), ...(formData.class_id ? [formData.class_id] : [])]));
                                if (selectedClassIds.length === 0) return null;
                                const selectedClassObjects = classes.filter(c => selectedClassIds.includes(c.value));

                                const handleClassTeacherSelect = (classId: string, teacherId: string) => {
                                    const existingAssignments = formData.class_teacher_assignments || [];
                                    const nextAssignments = existingAssignments.filter(a => a.class_id !== classId);
                                    if (teacherId) {
                                        nextAssignments.push({ class_id: classId, teacher_id: teacherId });
                                    }
                                    handleInputChange("class_teacher_assignments", nextAssignments);

                                    // Keep teacher_ids in sync with all assigned teachers
                                    const assignedTids = Array.from(new Set([
                                        ...nextAssignments.map(a => a.teacher_id),
                                        ...(formData.hod_teacher_id ? [formData.hod_teacher_id] : [])
                                    ]));
                                    handleInputChange("teacher_ids", assignedTids);
                                };

                                return (
                                    <View style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                                                Per-Class Teacher Assignment Matrix
                                            </Text>
                                            <View style={{ backgroundColor: isDark ? '#21262D' : '#E5E7EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>
                                                    {selectedClassObjects.length} Class{selectedClassObjects.length > 1 ? 'es' : ''}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 10 }}>
                                            Assign the primary teacher responsible for this subject in each class. Students and parents will see their specific class&apos;s assigned teacher.
                                        </Text>

                                        <View style={{ backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                                            {selectedClassObjects.map((c, idx) => {
                                                const currentAssignment = (formData.class_teacher_assignments || []).find(a => a.class_id === c.value);
                                                const assignedTeacherId = currentAssignment?.teacher_id || "";
                                                const isUnassigned = !assignedTeacherId;

                                                return (
                                                    <View
                                                        key={c.value}
                                                        style={{
                                                            padding: 12,
                                                            borderBottomWidth: idx < selectedClassObjects.length - 1 ? 1 : 0,
                                                            borderBottomColor: border,
                                                        }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                <Ionicons name="school-outline" size={16} color="#FF6B00" />
                                                                <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{c.label}</Text>
                                                            </View>
                                                            {isUnassigned ? (
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                                    <Ionicons name="warning-outline" size={12} color="#F59E0B" />
                                                                    <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '700' }}>Unassigned</Text>
                                                                </View>
                                                            ) : (
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                                    <Ionicons name="checkmark-circle-outline" size={12} color="#10B981" />
                                                                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>Assigned</Text>
                                                                </View>
                                                            )}
                                                        </View>

                                                        {/* Teacher chips for this class */}
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                                                            <TouchableOpacity
                                                                onPress={() => handleClassTeacherSelect(c.value, "")}
                                                                style={{
                                                                    paddingHorizontal: 10,
                                                                    paddingVertical: 5,
                                                                    borderRadius: 14,
                                                                    borderWidth: 1,
                                                                    borderColor: isUnassigned ? '#F59E0B' : border,
                                                                    backgroundColor: isUnassigned ? (isDark ? '#21262D' : '#FEF3C7') : 'transparent',
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: 11, fontWeight: isUnassigned ? '700' : '400', color: isUnassigned ? '#F59E0B' : textSecondary }}>
                                                                    None
                                                                </Text>
                                                            </TouchableOpacity>
                                                            {teachers.map((t) => {
                                                                const isSelected = assignedTeacherId === t.id;
                                                                const teacherName = t.users?.full_name || t.id;
                                                                return (
                                                                    <TouchableOpacity
                                                                        key={`${c.value}-${t.id}`}
                                                                        onPress={() => handleClassTeacherSelect(c.value, t.id)}
                                                                        style={{
                                                                            paddingHorizontal: 10,
                                                                            paddingVertical: 5,
                                                                            borderRadius: 14,
                                                                            borderWidth: 1,
                                                                            borderColor: isSelected ? '#FF6B00' : border,
                                                                            backgroundColor: isSelected ? (isDark ? '#21262D' : '#FFF7ED') : 'transparent',
                                                                            flexDirection: 'row',
                                                                            alignItems: 'center',
                                                                            gap: 4,
                                                                        }}
                                                                    >
                                                                        {isSelected && <Ionicons name="checkmark-circle" size={12} color="#FF6B00" />}
                                                                        <Text style={{ fontSize: 11, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#FF6B00' : textPrimary }}>
                                                                            {teacherName}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                );
                                                            })}
                                                        </ScrollView>

                                                        {isUnassigned && (
                                                            <Text style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, fontWeight: '500' }}>
                                                                ⚠️ No teacher assigned for {c.label}
                                                            </Text>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })()}

                            {/* Head of Department (HOD) Picker */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary }}>Head of Department (HOD)</Text>
                                    <ActionTooltip text="Assign HOD for curriculum pacing and exam approvals" learnMoreAnchor="hod-role">
                                        <Ionicons name="information-circle-outline" size={16} color="#FF6B00" />
                                    </ActionTooltip>
                                </View>
                                <View style={{ backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                                    <TouchableOpacity
                                        onPress={() => handleInputChange("hod_teacher_id", "")}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 12,
                                            paddingVertical: 10,
                                            borderBottomWidth: 1,
                                            borderBottomColor: border,
                                            backgroundColor: !formData.hod_teacher_id ? (isDark ? '#21262D' : '#FFF7ED') : 'transparent',
                                        }}
                                    >
                                        <Ionicons
                                            name={!formData.hod_teacher_id ? "radio-button-on" : "radio-button-off"}
                                            size={18}
                                            color={!formData.hod_teacher_id ? "#FF6B00" : textSecondary}
                                            style={{ marginRight: 10 }}
                                        />
                                        <Text style={{ color: !formData.hod_teacher_id ? '#FF6B00' : textSecondary, fontSize: 14, fontWeight: !formData.hod_teacher_id ? '700' : '400' }}>
                                            None (No HOD assigned)
                                        </Text>
                                    </TouchableOpacity>
                                    {teachers.map((t) => {
                                        const isHod = formData.hod_teacher_id === t.id;
                                        return (
                                            <TouchableOpacity
                                                key={`hod-${t.id}`}
                                                onPress={() => {
                                                    handleInputChange("hod_teacher_id", t.id);
                                                    if (!(formData.teacher_ids || []).includes(t.id)) {
                                                        handleInputChange("teacher_ids", [...(formData.teacher_ids || []), t.id]);
                                                    }
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: border,
                                                    backgroundColor: isHod ? (isDark ? '#21262D' : '#FFF7ED') : 'transparent',
                                                }}
                                            >
                                                <Ionicons
                                                    name={isHod ? "radio-button-on" : "radio-button-off"}
                                                    size={18}
                                                    color={isHod ? "#FF6B00" : textSecondary}
                                                    style={{ marginRight: 10 }}
                                                />
                                                <Text style={{ color: isHod ? textPrimary : textSecondary, fontSize: 14, fontWeight: isHod ? '700' : '500', flex: 1 }}>
                                                    {t.users?.full_name || t.id}
                                                </Text>
                                                {isHod && (
                                                    <View style={{ backgroundColor: '#FF6B00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>HOD</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Assigned Teachers Checkbox List */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>All Assigned Teachers</Text>
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
                    <ActionTooltip
                        text={isReadOnlyAdmin ? "Read-only access — contact the main administrator to make changes." : (!isValid ? "Enter a subject title to create subject" : "Save and create new subject")}
                        style={{ flex: 2 }}
                    >
                       <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!isValid || isSubmitting || isReadOnlyAdmin}
                            style={{
                                alignSelf: 'center',
                                paddingVertical: 14,
                                paddingHorizontal: 24,
                                borderRadius: 16,
                                alignItems: 'center',
                                backgroundColor: (!isValid || isSubmitting || isReadOnlyAdmin) ? (isDark ? '#374151' : '#D1D5DB') : '#FF6B00',
                                opacity: (!isValid || isSubmitting || isReadOnlyAdmin) ? 0.6 : 1,
                                cursor: ((!isValid || isSubmitting || isReadOnlyAdmin) ? 'not-allowed' : 'pointer') as any,
                            }}
                        >
                            <Text style={{ color: (!isValid || isSubmitting || isReadOnlyAdmin) ? (isDark ? '#9CA3AF' : '#6B7280') : 'white', fontWeight: '700', fontSize: 15 }}>
                                {isReadOnlyAdmin ? "Read-Only Access" : isSubmitting ? "Creating..." : "Create Subject"}
                            </Text>
                        </TouchableOpacity>
                    </ActionTooltip>
                        </View>
                    </View>
                </View>

                {/* Subject Category Modal */}
                <SubjectCategoryModal
                    visible={showCategoryModal}
                    onClose={() => setShowCategoryModal(false)}
                    isReadOnly={isReadOnlyAdmin}
                    onCategoriesChanged={async () => {
                        try {
                            const data = await SubjectAPI.getSubjectCategories();
                            setCategories(data || []);
                        } catch {}
                    }}
                />
            </Modal>
        </View>
    );
};

export default CreateSubject;
