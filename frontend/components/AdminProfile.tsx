import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/libs/supabase";
import { Edit3, Mail, Save, ShieldCheck, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

export default function AdminProfile() {
    const { profile, user, refreshProfile, displayId } = useAuth();
    const { isDark } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [saving, setSaving] = useState(false);

    const tokens = {
        bg:           isDark ? "#000000" : "#ffffff",
        surface:      isDark ? "#1a1a1a" : "#ffffff",
        border:       isDark ? "#2a2a2a" : "#f3f4f6",
        textPrimary:  isDark ? "#ffffff" : "#111827",
        textSecondary:isDark ? "#d1d5db" : "#4b5563",
        textMuted:    isDark ? "#6b7280" : "#9ca3af",
        inputBg:      isDark ? "#2a2a2a" : "#f9fafb",
        inputBorder:  isDark ? "#3a3a3a" : "#e5e7eb",
        inputText:    isDark ? "#ffffff" : "#111827",
        redIconBg:    isDark ? "#2a0a0a" : "#fef2f2",
        blueIconBg:   isDark ? "#0c1a3a" : "#eff6ff",
    };

    useEffect(() => {
        if (profile) {
            setName(profile.full_name || "");
            setPhone(profile.phone || "");
        }
    }, [profile]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }
        setSaving(true);
        try {
            const { error } = await authService.updateProfile({ full_name: name, phone });
            if (error) throw error;
            await refreshProfile();
            setIsEditing(false);
            Alert.alert("Success", "Profile updated successfully");
        } catch (error: any) {
            Alert.alert("Error", "Failed to update profile: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!profile) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: tokens.bg }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: tokens.bg }}>
            <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }}>
                <View style={{ padding: 16, maxWidth: 768, marginHorizontal: "auto", width: "100%" }}>
                    {/* Profile Card */}
                    <View style={{
                        backgroundColor: tokens.surface,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        overflow: "hidden",
                        shadowColor: "#000",
                        shadowOpacity: isDark ? 0 : 0.06,
                        shadowRadius: 6,
                        elevation: isDark ? 0 : 3,
                    }}>
                        {/* Red Banner */}
                        <View style={{ backgroundColor: "#c0392b", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                            <View style={{ paddingHorizontal: 24, paddingBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
                                {/* Name + role */}
                                <View style={{ flex: 1, paddingBottom: 8 }}>
                                    {isEditing ? (
                                        <TextInput
                                            value={name}
                                            onChangeText={setName}
                                            autoFocus
                                            style={{
                                                backgroundColor: tokens.inputBg,
                                                color: tokens.inputText,
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 10,
                                                fontSize: 20,
                                                fontWeight: "700",
                                                marginRight: 8,
                                                borderWidth: 1,
                                                borderColor: tokens.inputBorder,
                                            }}
                                        />
                                    ) : (
                                        <Text style={{ fontSize: 24, fontWeight: "700", color: "#ffffff" }}>
                                            {profile.full_name || "Admin"}
                                        </Text>
                                    )}
                                    <Text style={{ color: "#fecaca", fontWeight: "500", marginTop: 2 }}>
                                        System Administrator
                                    </Text>
                                    <View style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginTop: 8,
                                        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#fff1f2",
                                        alignSelf: "flex-start",
                                        paddingHorizontal: 12,
                                        paddingVertical: 4,
                                        borderRadius: 99,
                                    }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e", marginRight: 6 }} />
                                        <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: isDark ? "#86efac" : "#15803d" }}>
                                            {profile.status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Avatar + edit buttons */}
                                <View style={{ position: "relative", elevation: 8, zIndex: 10 }}>
                                    <Image
                                        source={{ uri: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200" }}
                                        style={{ width: 96, height: 96, borderRadius: 16, borderWidth: 4, borderColor: "#ffffff", backgroundColor: "#d1d5db" }}
                                    />
                                    <TouchableOpacity
                                        style={{
                                            position: "absolute",
                                            bottom: -8,
                                            right: -8,
                                            padding: 8,
                                            borderRadius: 99,
                                            backgroundColor: isEditing ? "#22c55e" : "#ffffff",
                                            borderWidth: 1,
                                            borderColor: isDark ? "#3a3a3a" : "#f3f4f6",
                                            elevation: 10,
                                            zIndex: 20,
                                        }}
                                        activeOpacity={0.8}
                                        onPress={() => isEditing ? handleSave() : setIsEditing(true)}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : isEditing ? (
                                            <Save size={18} color="#ffffff" />
                                        ) : (
                                            <Edit3 size={18} color="#c0392b" />
                                        )}
                                    </TouchableOpacity>
                                    {isEditing && (
                                        <TouchableOpacity
                                            style={{
                                                position: "absolute",
                                                bottom: -8,
                                                left: -8,
                                                padding: 8,
                                                borderRadius: 99,
                                                backgroundColor: isDark ? "#2a0a0a" : "#fee2e2",
                                                borderWidth: 1,
                                                borderColor: isDark ? "#3a0a0a" : "#fecaca",
                                                elevation: 10,
                                                zIndex: 20,
                                            }}
                                            activeOpacity={0.8}
                                            onPress={() => { setIsEditing(false); setName(profile.full_name); }}
                                        >
                                            <X size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Info cards */}
                        <View style={{ marginTop: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", padding: 16 }}>
                            {/* Admin Info */}
                            <View style={{
                                width: "100%",
                                backgroundColor: tokens.surface,
                                padding: 20,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: tokens.border,
                                marginBottom: 16,
                                shadowColor: "#000",
                                shadowOpacity: isDark ? 0 : 0.04,
                                shadowRadius: 4,
                                elevation: isDark ? 0 : 1,
                            }}>
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                                    <View style={{ padding: 8, backgroundColor: tokens.redIconBg, borderRadius: 10 }}>
                                        <ShieldCheck size={20} color="#c0392b" />
                                    </View>
                                    <Text style={{ marginLeft: 12, fontWeight: "600", color: tokens.textPrimary }}>Admin Info</Text>
                                </View>
                                <View style={{ gap: 12 }}>
                                    <View>
                                        <Text style={{ fontSize: 11, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Admin ID</Text>
                                        <Text style={{ color: tokens.textSecondary, fontWeight: "500" }} numberOfLines={1}>{displayId || "N/A"}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 11, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Role Permissions</Text>
                                        <Text style={{ color: tokens.textSecondary, fontWeight: "500" }}>Full System Access</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Contact */}
                            <View style={{
                                width: "100%",
                                backgroundColor: tokens.surface,
                                padding: 20,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: tokens.border,
                                marginBottom: 16,
                                shadowColor: "#000",
                                shadowOpacity: isDark ? 0 : 0.04,
                                shadowRadius: 4,
                                elevation: isDark ? 0 : 1,
                            }}>
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                                    <View style={{ padding: 8, backgroundColor: tokens.blueIconBg, borderRadius: 10 }}>
                                        <Mail size={20} color="#2563eb" />
                                    </View>
                                    <Text style={{ marginLeft: 12, fontWeight: "600", color: tokens.textPrimary }}>Contact</Text>
                                </View>
                                <View style={{ gap: 12 }}>
                                    <View>
                                        <Text style={{ fontSize: 11, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Email Address</Text>
                                        <Text style={{ color: tokens.textSecondary, fontWeight: "500" }}>{profile.email}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 11, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Personal Phone</Text>
                                        {isEditing ? (
                                            <TextInput
                                                value={phone}
                                                onChangeText={setPhone}
                                                placeholder="Enter phone number"
                                                placeholderTextColor={tokens.textMuted}
                                                keyboardType="phone-pad"
                                                style={{
                                                    backgroundColor: tokens.inputBg,
                                                    color: tokens.inputText,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 8,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: tokens.inputBorder,
                                                    marginTop: 4,
                                                }}
                                            />
                                        ) : (
                                            <Text style={{ color: profile.phone ? tokens.textSecondary : tokens.textMuted, fontWeight: "500", fontStyle: profile.phone ? "normal" : "italic" }}>
                                                {profile.phone || "Not set"}
                                            </Text>
                                        )}
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 11, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>System Notify</Text>
                                        <Text style={{ color: tokens.textSecondary, fontWeight: "500" }}>Enabled</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}