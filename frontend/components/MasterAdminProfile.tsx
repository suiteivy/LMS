import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Edit3, Mail, Save, ShieldCheck, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Toast from 'react-native-toast-message';
import { supabase } from '@/libs/supabase';

export default function MasterAdminProfile() {
    const { profile, refreshProfile, displayId } = useAuth();
    const { isDark } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [saving, setSaving] = useState(false);

    const tokens = {
        bg: isDark ? "#0F0B2E" : "#ffffff",
        surface: isDark ? "#13103A" : "#ffffff",
        border: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0",
        textPrimary: isDark ? "#ffffff" : "#0f172a",
        textSecondary: isDark ? "#94a3b8" : "#64748b",
        textMuted: isDark ? "#64748b" : "#9ca3af",
        inputBg: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
        inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
        inputText: isDark ? "#ffffff" : "#0f172a",
        redIconBg: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
        blueIconBg: isDark ? "rgba(37, 99, 235, 0.1)" : "#eff6ff",
    };

    useEffect(() => {
        if (profile) {
            setName(profile.full_name || "");
            setPhone(profile.phone || "");
        }
    }, [profile]);

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    }

    const handleSave = async () => {
        if (!name.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name cannot be empty' });
            return;
        }
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ full_name: name, phone })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
                setIsEditing(false);
                await refreshProfile();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update profile: ' + error.message });
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
                        <View style={{ backgroundColor: "#FF6B00", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                            <View style={{ paddingHorizontal: 24, paddingBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
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
                                            {profile.full_name || "Master Admin"}
                                        </Text>
                                    )}
                                    <Text style={{ color: "#ffedd5", fontWeight: "500", marginTop: 2 }}>
                                        Master Platform Admin
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
                                            Active
                                        </Text>
                                    </View>
                                </View>

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
                                            borderColor: isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6",
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
                                            <Edit3 size={18} color="#FF6B00" />
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
                                                backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
                                                borderWidth: 1,
                                                borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#fecaca",
                                                elevation: 10,
                                                zIndex: 20,
                                            }}
                                            activeOpacity={0.8}
                                            onPress={() => { setIsEditing(false); setName(profile.full_name || ""); setPhone(profile.phone || ""); }}
                                        >
                                            <X size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={{ marginTop: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", padding: 16 }}>
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
                                        <ShieldCheck size={20} color="#ef4444" />
                                    </View>
                                    <Text style={{ marginLeft: 12, fontWeight: "600", color: tokens.textPrimary }}>Platform Access</Text>
                                </View>
                                <View style={{ gap: 12 }}>
                                    <View>
                                        <Text style={{ fontSize: 11, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Admin ID</Text>
                                        <Text style={{ color: tokens.textSecondary, fontWeight: "500" }} numberOfLines={1}>{displayId || "N/A"}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 11, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Role Permissions</Text>
                                        <Text style={{ color: tokens.textSecondary, fontWeight: "500" }}>Master System Access</Text>
                                    </View>
                                </View>
                            </View>

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
                                        <Mail size={20} color="#3b82f6" />
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
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
