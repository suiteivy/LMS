import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { Subject } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

function SubjectDetailsScreen() {
  const { isDark } = useTheme();
  const { profile } = useAuth();
  const { id } = useLocalSearchParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const assignedTeacherNames = teachers
    .filter((t) => (form.teacher_ids || []).includes(t.id))
    .map((t) => t.users?.full_name || t.id)
    .join(", ");
  // const surface = isDark ? "#13103A" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6";
  const inputBg = isDark ? "#1A1650" : "#f3f4f6";
  const textPrimary = isDark ? "#f1f1f1" : "#111827";
  const textMuted = isDark ? "#9ca3af" : "#9ca3af";

  useEffect(() => {
    fetchSubject();
    loadLookupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadLookupData = async () => {
    if (!profile?.institution_id) return;
    // Fetch teachers and classes for dropdowns
    const [teacherRes, classRes] = await Promise.all([
      supabase.from("teachers").select("id, user_id, users:user_id(full_name, institution_id)").eq("institution_id", profile.institution_id),
      supabase.from("v_classes_detailed").select("id, name:display_name").eq("institution_id", profile.institution_id).order("display_name"),
    ]);
    if (teacherRes.data) setTeachers(teacherRes.data);
    if (classRes.data) setClasses(classRes.data);
  };

  const fetchSubject = async () => {
    if (!profile?.institution_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // id from useLocalSearchParams can be string | string[] | undefined
      const subjectId = Array.isArray(id) ? id[0] : id;
      if (!subjectId) throw new Error("Invalid subject ID");
      const { data, error } = await supabase
        .from("subjects")
        .select(`
          *,
          subject_teachers(
            teacher_id
          )
        `)
        .eq("id", subjectId)
        .eq("institution_id", profile.institution_id)
        .single();
      if (error) throw error;
      
      const subjectData = data as any;
      const teacherIds = subjectData.subject_teachers ? subjectData.subject_teachers.map((st: any) => st.teacher_id) : [];
      const populatedSubject = { ...subjectData, teacher_ids: teacherIds };
      setSubject(populatedSubject as any);
      setForm(populatedSubject);
    } catch {
      Alert.alert("Error", "Failed to load subject details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleTeacherToggle = (teacherId: string) => {
    const currentIds = form.teacher_ids || [];
    let updatedIds;
    if (currentIds.includes(teacherId)) {
      updatedIds = currentIds.filter((tid: string) => tid !== teacherId);
    } else {
      updatedIds = [...currentIds, teacherId];
    }
    handleChange("teacher_ids", updatedIds);
  };

  const handleSave = async () => {
    if (!subject) return;
    setSaving(true);
    try {
      const subjectId = Array.isArray(id) ? id[0] : id;
      if (!subjectId) throw new Error("Invalid subject ID");

      // Check if class_id changed to trigger auto-enrollment
      const classChanged = form.class_id !== subject.class_id && form.class_id;

      // Extract DB writable fields
      const { teacher_ids, subject_teachers, ...subjectUpdateData } = form;
      
      // Update primary teacher_id column in subjects table for legacy compatibility
      subjectUpdateData.teacher_id = (teacher_ids && teacher_ids.length > 0) ? teacher_ids[0] : null;

      const { error } = await (supabase.from("subjects") as any)
        .update(subjectUpdateData)
        .eq("id", subjectId)
        .eq("institution_id", profile?.institution_id || '');
      if (error) throw error;

      // Update subject_teachers join table
      const { error: deleteError } = await supabase
        .from("subject_teachers")
        .delete()
        .eq("subject_id", subjectId);
      if (deleteError) throw deleteError;

      if (teacher_ids && teacher_ids.length > 0) {
        const newAssignments = teacher_ids.map((tid: string) => ({
          subject_id: subjectId,
          teacher_id: tid,
          institution_id: profile?.institution_id || ''
        }));
        const { error: insertError } = await supabase
          .from("subject_teachers")
          .insert(newAssignments);
        if (insertError) throw insertError;
      }

      // Auto-enrollment logic if stream was assigned/changed
      if (classChanged) {
        try {
          const { data: studentsInClass } = await (supabase.from('class_enrollments') as any)
            .select('student_id')
            .eq('class_id', form.class_id);

          if (studentsInClass && studentsInClass.length > 0) {
            const enrollments = studentsInClass.map((s: any) => ({
              student_id: s.student_id,
              subject_id: subjectId,
              institution_id: (subject as any).institution_id,
              status: 'enrolled',
              enrollment_date: new Date().toISOString()
            }));

            await (supabase.from('enrollments') as any).upsert(enrollments, { onConflict: 'student_id,subject_id' });
          }
        } catch (enrollErr) {
          console.error("Auto-enrollment failed during update:", enrollErr);
        }
      }

      setSubject(form);
      setEditing(false);
      Alert.alert("Success", "Subject updated and stream students enrolled successfully.");
    } catch (error) {
      console.error("Error updating subject:", error);
      Alert.alert("Error", "Failed to update subject.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? "#0F0B2E" : "#f9fafb",
        }}
      >
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (!subject) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? "#0F0B2E" : "#f9fafb",
        }}
      >
        <Text style={{ color: textPrimary }}>Subject not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? "#0F0B2E" : "#f9fafb" }}
    >
      <View
        style={{ flex: 1, backgroundColor: isDark ? "#0F0B2E" : "#f9fafb" }}
      >
        <UnifiedHeader
          title="Subject Details"
          subtitle={subject.title}
          role="Admin"
          onBack={() => router.back()}
        />

        {/* Edit button at the top right */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            marginTop: 8,
            marginRight: 16,
          }}
        >
          {!editing && (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={{ backgroundColor: "transparent", padding: 8 }}
            >
              <Ionicons name="pencil" size={24} color="#FF6B00" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ padding: 16 }}>
          {/* Title */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Title
          </Text>
          <TextInput
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              marginBottom: 12,
              fontWeight: "500",
            }}
            value={form.title}
            editable={editing}
            onChangeText={(v) => handleChange("title", v)}
          />

          {/* Description */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Description
          </Text>
          <TextInput
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              marginBottom: 12,
              minHeight: 60,
              textAlignVertical: "top",
            }}
            value={form.description}
            editable={editing}
            multiline
            onChangeText={(v) => handleChange("description", v)}
          />

          {/* Category */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Category
          </Text>
          <TextInput
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              marginBottom: 12,
            }}
            value={form.category}
            editable={editing}
            onChangeText={(v) => handleChange("category", v)}
          />

          {/* Level */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Level
          </Text>
          <TextInput
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              marginBottom: 12,
            }}
            value={form.level}
            editable={editing}
            onChangeText={(v) => handleChange("level", v)}
          />

          {/* Duration */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Duration
          </Text>
          <TextInput
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              marginBottom: 12,
            }}
            value={form.duration}
            editable={editing}
            onChangeText={(v) => handleChange("duration", v)}
          />



          {/* Materials */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Materials (comma separated)
          </Text>
          <TextInput
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              marginBottom: 12,
            }}
            value={
              Array.isArray(form.materials)
                ? form.materials.join(", ")
                : form.materials || ""
            }
            editable={editing}
            onChangeText={(v) =>
              handleChange(
                "materials",
                v.split(",").map((s: string) => s.trim()),
              )
            }
          />

          {/* Teachers Section */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 6 }}>
            Assigned Teachers
          </Text>
          {editing ? (
            <View style={{ backgroundColor: inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border, marginBottom: 12 }}>
              {teachers.map((t) => {
                const isSelected = (form.teacher_ids || []).includes(t.id);
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
                      color={isSelected ? "#FF6B00" : textMuted}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '500' }}>
                      {t.users?.full_name || t.id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {teachers.length === 0 && (
                <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>
                  No teachers available
                </Text>
              )}
            </View>
          ) : (
            <View style={{ backgroundColor: inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border, marginBottom: 12 }}>
              <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '500' }}>
                {assignedTeacherNames || "No teachers assigned"}
              </Text>
            </View>
          )}

          {/* Class Dropdown */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Assigned Class
          </Text>
          <View
            style={{
              backgroundColor: inputBg,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              marginBottom: 12,
            }}
          >
            <Picker
              enabled={editing}
              selectedValue={form.class_id || ""}
              onValueChange={(v) => handleChange("class_id", v)}
              style={{ color: textPrimary }}
            >
              <Picker.Item label="Select class" value="" />
              {classes.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          {/* Metadata (JSON) */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Metadata (JSON)
          </Text>
          <TextInput
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              padding: 10,
              marginBottom: 12,
              minHeight: 40,
              textAlignVertical: "top",
            }}
            value={form.metadata ? JSON.stringify(form.metadata, null, 2) : ""}
            editable={editing}
            multiline
            onChangeText={(v) => {
              try {
                handleChange("metadata", v ? JSON.parse(v) : {});
              } catch {
                // ignore parse error
              }
            }}
          />

          {/* Edit/Save Buttons */}
          {editing && (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: "#FF6B00",
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  alignItems: "center",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditing(false);
                  setForm(subject);
                }}
                style={{
                  backgroundColor: border,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: textPrimary, fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

export default SubjectDetailsScreen;
