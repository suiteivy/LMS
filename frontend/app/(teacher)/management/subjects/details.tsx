import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { ResourceAPI } from "@/services/ResourceService";
import * as DocumentPicker from 'expo-document-picker';
import { BookOpen, FileText, Trash2, Upload, File, FileImage, FileCode } from "lucide-react-native";

// Use a plain record to avoid Supabase generic overload resolution fighting
// with the frontend Subject type (which has fields like `lessons`, `rating`,
// `isEnrolled` that don't exist in the DB).
type SubjectRecord = Record<string, any>;

function TeacherSubjectDetailsScreen() {
    const { isDark } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [subject, setSubject] = useState<SubjectRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<SubjectRecord>({});
    const [saving, setSaving] = useState(false);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    
    // Resources State
    const [resources, setResources] = useState<any[]>([]);
    const [resourcesLoading, setResourcesLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const border   = isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6";
    const inputBg  = isDark ? "#1A1650" : "#f3f4f6";
    const textPrimary = isDark ? "#f1f1f1" : "#111827";
    const textMuted   = isDark ? "#9ca3af" : "#9ca3af";

    useEffect(() => {
        if (id) {
            fetchSubject();
            loadLookupData();
            fetchResources();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadLookupData = async () => {
        const { data } = await supabase.from("classes").select("id, name").order("name");
        if (data) setClasses(data as { id: string; name: string }[]);
    };

    const fetchSubject = async () => {
        setLoading(true);
        try {
            const subjectId = Array.isArray(id) ? id[0] : id;
            if (!subjectId) throw new Error("Invalid subject ID");

            const { data, error } = await (supabase as any)
                .from("subjects")
                .select("*")
                .eq("id", subjectId)
                .single();

            if (error) throw error;
            setSubject(data);
            setForm(data);
        } catch {
            Alert.alert("Error", "Failed to load subject details.");
        } finally {
            setLoading(false);
        }
    };

    const fetchResources = async () => {
        setResourcesLoading(true);
        try {
            const subjectId = Array.isArray(id) ? id[0] : id;
            if (!subjectId) return;
            const data = await ResourceAPI.getResources(subjectId);
            setResources(data || []);
        } catch (error) {
            console.error("Error fetching resources:", error);
        } finally {
            setResourcesLoading(false);
        }
    };

    const handleFileUpload = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            });

            if (res.canceled) return;

            setUploading(true);
            const file = res.assets[0];
            const subjectId = Array.isArray(id) ? id[0] : id;

            setUploading(true);
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const fileName = `subjects/${subjectId}/${Date.now()}-${file.name}`;

            const { error: uploadError } = await supabase.storage
                .from('resources')
                .upload(fileName, blob, { contentType: file.mimeType });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('resources')
                .getPublicUrl(fileName);

            // Map MIME type to database allowed literal types
            const getResourceType = (mime?: string): "link" | "video" | "pdf" | "image" | "other" => {
                if (!mime) return "other";
                if (mime.includes("pdf")) return "pdf";
                if (mime.includes("video")) return "video";
                if (mime.includes("image")) return "image";
                return "other";
            };

            await ResourceAPI.createResource({
                subject_id: subjectId,
                title: file.name,
                url: publicUrl,
                type: getResourceType(file.mimeType),
                size: `${Math.round((file.size || 0) / 1024)} KB`
            });

            Alert.alert("Success", "Resource uploaded successfully.");
            fetchResources();
        } catch (error: any) {
            console.error("Upload error:", error);
            Alert.alert("Upload Failed", error.message || "Could not upload file.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteResource = async (resourceId: string) => {
        Alert.alert(
            "Delete Resource",
            "Are you sure you want to delete this resource?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await ResourceAPI.deleteResource(resourceId);
                            setResources(prev => prev.filter(r => r.id !== resourceId));
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete resource.");
                        }
                    }
                }
            ]
        );
    };


    const handleChange = (key: string, value: unknown) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const subjectId = Array.isArray(id) ? id[0] : id;
            if (!subjectId) throw new Error("Invalid subject ID");

            // Extract only DB-writable fields (exclude Supabase read-only metadata)
            const { id: _id, created_at, ...updatePayload } = form;

            const { error } = await (supabase as any)
                .from("subjects")
                .update(updatePayload)
                .eq("id", subjectId);

            if (error) throw error;
            setSubject(form);
            setEditing(false);
            Alert.alert("Success", "Subject updated successfully.");
        } catch (err) {
            console.error("Error updating subject:", err);
            Alert.alert("Error", "Failed to update subject.");
        } finally {
            setSaving(false);
        }
    };

    /* ─── Loading / empty states ─── */

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDark ? "#0F0B2E" : "#f9fafb" }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    if (!subject) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDark ? "#0F0B2E" : "#f9fafb" }}>
                <Text style={{ color: textPrimary }}>Subject not found.</Text>
            </View>
        );
    }

    /* ─── Derived values ─── */
    const progressPercent: number = Number(form.progress_percent) || 0;

    /* ─── Main UI ─── */

    return (
        <ScrollView style={{ flex: 1, backgroundColor: isDark ? "#0F0B2E" : "#f9fafb" }}>
            <View style={{ flex: 1, backgroundColor: isDark ? "#0F0B2E" : "#f9fafb" }}>
                <UnifiedHeader
                    title="Subject Details"
                    subtitle={String(subject.title ?? "")}
                    role="Teacher"
                    onBack={() => router.back()}
                />

                {/* Edit toggle */}
                <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 8, marginRight: 16 }}>
                    {!editing && (
                        <TouchableOpacity onPress={() => setEditing(true)} style={{ backgroundColor: "transparent", padding: 8 }}>
                            <Ionicons name="pencil" size={24} color="#FF6B00" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ padding: 16 }}>

                    {/* Title */}
                    <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>Title</Text>
                    <TextInput
                        style={{ backgroundColor: inputBg, color: textPrimary, borderRadius: 8, borderWidth: 1, borderColor: border, padding: 10, marginBottom: 12, fontWeight: "500" }}
                        value={String(form.title ?? "")}
                        editable={editing}
                        onChangeText={(v) => handleChange("title", v)}
                    />

                    {/* Description */}
                    <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>Description</Text>
                    <TextInput
                        style={{ backgroundColor: inputBg, color: textPrimary, borderRadius: 8, borderWidth: 1, borderColor: border, padding: 10, marginBottom: 12, minHeight: 60, textAlignVertical: "top" }}
                        value={String(form.description ?? "")}
                        editable={editing}
                        multiline
                        onChangeText={(v) => handleChange("description", v)}
                    />

                    {/* Category */}
                    <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>Category</Text>
                    <TextInput
                        style={{ backgroundColor: inputBg, color: textPrimary, borderRadius: 8, borderWidth: 1, borderColor: border, padding: 10, marginBottom: 12 }}
                        value={String(form.category ?? "")}
                        editable={editing}
                        onChangeText={(v) => handleChange("category", v)}
                    />

                    {/* Progress */}
                    <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>
                        Subject Progress ({progressPercent}%)
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        {/* Track */}
                        <View style={{ flex: 1, height: 10, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderRadius: 5, overflow: "hidden", borderWidth: 1, borderColor: border }}>
                            <View style={{ width: `${progressPercent}%` as any, height: "100%", backgroundColor: "#FF6B00" }} />
                        </View>
                        {/* Editable number input */}
                        {editing && (
                            <TextInput
                                style={{ backgroundColor: inputBg, color: textPrimary, borderRadius: 8, borderWidth: 1, borderColor: border, paddingVertical: 4, paddingHorizontal: 8, width: 60, textAlign: "center", fontSize: 14, fontWeight: "bold" }}
                                value={String(progressPercent)}
                                keyboardType="numeric"
                                onChangeText={(v) => {
                                    const parsed = parseInt(v.replace(/[^0-9]/g, ""), 10);
                                    handleChange("progress_percent", Math.min(100, isNaN(parsed) ? 0 : parsed));
                                }}
                            />
                        )}
                    </View>

                    {/* Class picker */}
                    <Text style={{ color: textMuted, fontSize: 13, marginBottom: 4 }}>Assigned Class</Text>
                    <View style={{ backgroundColor: inputBg, borderRadius: 8, borderWidth: 1, borderColor: border, marginBottom: 12 }}>
                        <Picker
                            enabled={editing}
                            selectedValue={String(form.class_id ?? "")}
                            onValueChange={(v) => handleChange("class_id", v)}
                            style={{ color: textPrimary }}
                        >
                            <Picker.Item label="Select class" value="" />
                            {classes.map((c) => (
                                <Picker.Item key={c.id} label={c.name} value={c.id} />
                            ))}
                        </Picker>
                    </View>

                    {/* Save / Cancel */}
                    {editing && (
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                style={{ backgroundColor: "#FF6B00", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, alignItems: "center", opacity: saving ? 0.7 : 1 }}
                            >
                                {saving
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={{ color: "white", fontWeight: "bold" }}>Save</Text>
                                }
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { setEditing(false); setForm(subject); }}
                                style={{ backgroundColor: border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, alignItems: "center" }}
                            >
                                <Text style={{ color: textPrimary, fontWeight: "bold" }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Resources Section */}
                    <View style={{ marginTop: 32, borderTopWidth: 1, borderTopColor: border, paddingTop: 24 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <View>
                                <Text style={{ color: textPrimary, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 }}>Subject Resources</Text>
                                <Text style={{ color: textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>Shared documents & files</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={handleFileUpload}
                                disabled={uploading}
                                style={{ backgroundColor: "#FF6B00", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: "row", alignItems: "center" }}
                            >
                                {uploading ? <ActivityIndicator size="small" color="white" /> : <Upload size={16} color="white" />}
                                <Text style={{ color: "white", fontWeight: "bold", marginLeft: 8, fontSize: 12 }}>Upload</Text>
                            </TouchableOpacity>
                        </View>

                        {resourcesLoading ? (
                            <ActivityIndicator color="#FF6B00" style={{ marginVertical: 20 }} />
                        ) : resources.length === 0 ? (
                            <View style={{ padding: 40, alignItems: "center", backgroundColor: inputBg, borderRadius: 24, borderStyle: "dashed", borderWidth: 1, borderColor: border }}>
                                <FileText size={40} color={textMuted} style={{ opacity: 0.3 }} />
                                <Text style={{ color: textMuted, fontSize: 13, fontWeight: "600", marginTop: 12 }}>No resources yet</Text>
                            </View>
                        ) : (
                            resources.map((res) => (
                                <View 
                                    key={res.id} 
                                    style={{ 
                                        flexDirection: "row", 
                                        alignItems: "center", 
                                        backgroundColor: inputBg, 
                                        padding: 16, 
                                        borderRadius: 20, 
                                        marginBottom: 10,
                                        borderWidth: 1,
                                        borderColor: border
                                    }}
                                >
                                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? "rgba(255,107,0,0.1)" : "#FFF7ED", alignItems: "center", justifyContent: "center" }}>
                                        {res.type?.includes("pdf") ? <FileText size={20} color="#FF6B00" /> : 
                                         res.type?.includes("image") ? <FileImage size={20} color="#FF6B00" /> : 
                                         <File size={20} color="#FF6B00" />}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Text style={{ color: textPrimary, fontWeight: "bold", fontSize: 14 }} numberOfLines={1}>{res.title}</Text>
                                        <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{res.size} • {res.status}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => handleDeleteResource(res.id)}
                                        style={{ padding: 8 }}
                                    >
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>

                </View>
            </View>
        </ScrollView>
    );
}

export default TeacherSubjectDetailsScreen;
