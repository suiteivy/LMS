import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
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
  const { id } = useLocalSearchParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // const surface = isDark ? "#1e1e1e" : "#ffffff";
  const border = isDark ? "#2c2c2c" : "#f3f4f6";
  const inputBg = isDark ? "#242424" : "#f3f4f6";
  const textPrimary = isDark ? "#f1f1f1" : "#111827";
  const textMuted = isDark ? "#9ca3af" : "#9ca3af";

  useEffect(() => {
    fetchSubject();
    loadLookupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadLookupData = async () => {
    // Fetch teachers and classes for dropdowns
    const [teacherRes, classRes] = await Promise.all([
      supabase.from("teachers").select("id, user_id, users:user_id(full_name)"),
      supabase.from("classes").select("id, name").order("name"),
    ]);
    if (teacherRes.data) setTeachers(teacherRes.data);
    if (classRes.data) setClasses(classRes.data);
  };

  const fetchSubject = async () => {
    setLoading(true);
    try {
      // id from useLocalSearchParams can be string | string[] | undefined
      const subjectId = Array.isArray(id) ? id[0] : id;
      if (!subjectId) throw new Error("Invalid subject ID");
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .single();
      if (error) throw error;
      setSubject(data as Subject);
      setForm(data);
    } catch {
      Alert.alert("Error", "Failed to load subject details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const subjectId = Array.isArray(id) ? id[0] : id;
      if (!subjectId) throw new Error("Invalid subject ID");
      const { error } = await supabase
        .from("subjects")
        .update(form)
        .eq("id", subjectId);
      if (error) throw error;
      setSubject(form);
      setEditing(false);
      Alert.alert("Success", "Subject updated successfully.");
    } catch (error) {
      console.error("Error updating subject:", error);
      Alert.alert("Error", "Failed to update subject. ");
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
          backgroundColor: isDark ? "#121212" : "#f9fafb",
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
          backgroundColor: isDark ? "#121212" : "#f9fafb",
        }}
      >
        <Text style={{ color: textPrimary }}>Subject not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? "#121212" : "#f9fafb" }}
    >
      <View
        style={{ flex: 1, backgroundColor: isDark ? "#121212" : "#f9fafb" }}
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

          {/* Price */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Price
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
            value={form.price?.toString() || ""}
            editable={editing}
            keyboardType="numeric"
            onChangeText={(v) =>
              handleChange("price", v.replace(/[^0-9.]/g, ""))
            }
          />

          {/* Fee Amount */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Fee Amount
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
            value={form.fee_amount?.toString() || ""}
            editable={editing}
            keyboardType="numeric"
            onChangeText={(v) =>
              handleChange("fee_amount", v.replace(/[^0-9.]/g, ""))
            }
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

          {/* Teacher Dropdown */}
          <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
            Assigned Teacher
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
              selectedValue={form.teacher_id || ""}
              onValueChange={(v) => handleChange("teacher_id", v)}
              style={{ color: textPrimary }}
            >
              <Picker.Item label="Select teacher" value="" />
              {teachers.map((t) => (
                <Picker.Item
                  key={t.id}
                  label={t.users?.full_name || t.id}
                  value={t.id}
                />
              ))}
            </Picker>
          </View>

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
