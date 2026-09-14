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
    const [levels, setLevels] = React.useState<any[]>([]);

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
                    <ActionTooltip text="Save and create new subject" style={{ flex: 2 }}>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            style={{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#FF6B00', opacity: isSubmitting ? 0.5 : 1 }}
                        >
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                                {isSubmitting ? "Creating..." : "Create Subject"}
                            </Text>
                        </TouchableOpacity>
                    </ActionTooltip>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default CreateSubject;
