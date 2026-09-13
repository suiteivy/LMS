import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/services/api";
import { resolveAvatarUri } from "@/utils/avatar";
import { showSuccess, showError } from "@/utils/toast";
import {
  UserCircle,
  BookOpen,
  Users,
  GraduationCap,
  Clock,
  Send,
  AlertCircle,
  X,
  FileText,
  Layers,
  Shield,
  Briefcase,
} from "lucide-react-native";

export default function TeacherProfile() {
  const { profile, displayId } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestedName, setRequestedName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bg = isDark ? "#0D1117" : "#F6F8FA";
  const card = isDark ? "#161B22" : "#FFFFFF";
  const border = isDark ? "#21262D" : "#D0D7DE";
  const textPrimary = isDark ? "#F9FAFB" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const orange = "#FF6900";

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/teacher/profile");
      if (res.data?.success && res.data?.data) {
        setProfileData(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch teacher profile:", err);
      showError("Profile Error", err.response?.data?.error || "Could not load detailed teacher profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleNameChangeSubmit = async () => {
    if (!requestedName.trim()) {
      Alert.alert("Required", "Please provide the requested full name.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Required", "Please provide the reason for this name change.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/teacher/profile/request-name-change", {
        requested_name: requestedName.trim(),
        reason: reason.trim(),
      });

      if (res.data?.success) {
        showSuccess("Request Submitted", "Your name change request has been submitted for admin approval.");
        setRequestModalVisible(false);
        setRequestedName("");
        setReason("");
        await fetchProfile();
      }
    } catch (err: any) {
      console.error("Failed to submit name change:", err);
      Alert.alert("Submission Failed", err.response?.data?.error || "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={orange} />
        <Text style={{ color: textSecondary, marginTop: 12, fontWeight: "600" }}>Loading Profile...</Text>
      </View>
    );
  }

  const personal = profileData?.personal || profile;
  const professional = profileData?.professional || {};
  const subjects = profileData?.assigned_subjects || [];
  const classes = profileData?.designated_classes || [];
  const roleModes = profileData?.role_modes || ["subject"];
  const pendingChange = profileData?.pending_name_change;
  const avatarUri = resolveAvatarUri(personal?.avatar_url || profile?.avatar_url);

  const fullName = personal?.full_name || `${personal?.first_name || ""} ${personal?.last_name || ""}`.trim() || "Teacher";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Pending Request Banner */}
      {pendingChange && (
        <View
          style={{
            backgroundColor: isDark ? "rgba(255, 105, 0, 0.12)" : "#FFF7ED",
            borderColor: orange,
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={20} color={orange} style={{ marginRight: 10, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? "#FFA756" : "#9A3412", fontWeight: "800", fontSize: 13 }}>
              Name Change Request Pending Review
            </Text>
            <Text style={{ color: isDark ? "#E5E7EB" : "#7C2D12", fontSize: 12, marginTop: 2 }}>
              Requested: <Text style={{ fontWeight: "700" }}>{pendingChange.requested_name}</Text>
            </Text>
            <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
              Reason: {pendingChange.reason}
            </Text>
            <Text style={{ color: textSecondary, fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
              Status: Under administrative review · New credentials will be issued upon approval
            </Text>
          </View>
        </View>
      )}

      {/* Profile Overview Card */}
      <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 20, padding: 20, marginBottom: 16 }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: border,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#0F141C" : "#FFFFFF",
            }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <UserCircle size={60} color={isDark ? "#4B5563" : "#9CA3AF"} />
            )}
          </View>
          <Text style={{ color: textPrimary, fontSize: 22, fontWeight: "900", marginTop: 12, textAlign: "center" }}>
            {fullName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <View style={{ backgroundColor: orange, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>
                {professional.position || "Teacher"}
              </Text>
            </View>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "600" }}>
              ID: {displayId || "N/A"}
            </Text>
          </View>

          {/* Request Name Change Button */}
          <TouchableOpacity
            onPress={() => setRequestModalVisible(true)}
            disabled={!!pendingChange}
            style={{
              marginTop: 14,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 10,
              backgroundColor: pendingChange ? (isDark ? "#21262D" : "#E5E7EB") : (isDark ? "rgba(255, 105, 0, 0.15)" : "#FFF7ED"),
              borderWidth: 1,
              borderColor: pendingChange ? "transparent" : orange,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Send size={13} color={pendingChange ? textSecondary : orange} />
            <Text style={{ color: pendingChange ? textSecondary : orange, fontSize: 12, fontWeight: "700" }}>
              {pendingChange ? "Name Change Pending" : "Request Name Change"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info Rows */}
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: border, paddingTop: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "600" }}>Email</Text>
            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: "700" }}>{personal.email || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "600" }}>Phone</Text>
            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: "700" }}>{personal.phone || "Not set"}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "600" }}>Department</Text>
            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: "700" }}>{professional.department || "Academic"}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "600" }}>Qualification</Text>
            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: "700" }}>{professional.qualification || "Bachelor of Education"}</Text>
          </View>
          {professional.date_joined && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "600" }}>Joined Institution</Text>
              <Text style={{ color: textPrimary, fontSize: 13, fontWeight: "700" }}>
                {new Date(professional.date_joined).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Role Scopes & Modes */}
      <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 20, padding: 18, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Shield size={16} color={orange} style={{ marginRight: 8 }} />
          <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Authorized Role Scopes
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {roleModes.map((mode: string) => {
            const isClass = mode === "class";
            const isLib = mode === "librarian";
            return (
              <View
                key={mode}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: isClass ? "#3B82F620" : isLib ? "#10B98120" : "#FF690020",
                  borderWidth: 1,
                  borderColor: isClass ? "#3B82F6" : isLib ? "#10B981" : "#FF6900",
                }}
              >
                <Text
                  style={{
                    color: isClass ? "#3B82F6" : isLib ? "#10B981" : "#FF6900",
                    fontWeight: "800",
                    fontSize: 11,
                    textTransform: "capitalize",
                  }}
                >
                  {mode === "class" ? "Class Teacher" : mode === "librarian" ? "Librarian" : "Subject Teacher"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Designated Classes (for Class Teacher) */}
      <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 20, padding: 18, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Users size={16} color="#3B82F6" style={{ marginRight: 8 }} />
          <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Designated Classes ({classes.length})
          </Text>
        </View>
        {classes.length === 0 ? (
          <Text style={{ color: textSecondary, fontSize: 12, fontStyle: "italic" }}>
            No class teacher assignments currently active.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {classes.map((c: any) => (
              <View
                key={c.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: isDark ? "#0F141C" : "#F6F8FA",
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Text style={{ color: textPrimary, fontWeight: "700", fontSize: 13 }}>{c.label}</Text>
                <Text style={{ color: "#3B82F6", fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>
                  Class Teacher
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Assigned Subjects */}
      <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 20, padding: 18, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <BookOpen size={16} color={orange} style={{ marginRight: 8 }} />
          <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Assigned Subjects ({subjects.length})
          </Text>
        </View>
        {subjects.length === 0 ? (
          <Text style={{ color: textSecondary, fontSize: 12, fontStyle: "italic" }}>
            No teaching subjects assigned yet.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {subjects.map((s: any) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: isDark ? "#0F141C" : "#F6F8FA",
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <View>
                  <Text style={{ color: textPrimary, fontWeight: "700", fontSize: 13 }}>{s.title}</Text>
                  {s.class_name && (
                    <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>{s.class_name}</Text>
                  )}
                </View>
                <View
                  style={{
                    backgroundColor: s.role === "assistant" ? (isDark ? "#374151" : "#E5E7EB") : orange,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: s.role === "assistant" ? textPrimary : "#FFF",
                      fontSize: 10,
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.role === "assistant" ? "Assistant" : "Lead"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Request Name Change Modal */}
      <Modal visible={requestModalVisible} transparent animationType="fade" onRequestClose={() => setRequestModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <View
            style={{
              backgroundColor: card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: border,
              width: "100%",
              maxWidth: 480,
              padding: 22,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View>
                <Text style={{ color: textPrimary, fontSize: 18, fontWeight: "900" }}>Request Name Change</Text>
                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                  Submits a formal request to your school administrator
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: isDark ? "#0F141C" : "#F6F8FA", padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: border }}>
              <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>Current Registered Name</Text>
              <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "800", marginTop: 2 }}>{fullName}</Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
                New Requested Name *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? "#0D1117" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: textPrimary,
                  fontSize: 14,
                }}
                placeholder="Enter your official new name"
                placeholderTextColor={textSecondary}
                value={requestedName}
                onChangeText={setRequestedName}
              />
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
                Reason / Documentation Reference *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? "#0D1117" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: textPrimary,
                  fontSize: 13,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                multiline
                numberOfLines={3}
                placeholder="State the reason (e.g. Marriage, Legal Deed Poll, Gazette Notice)"
                placeholderTextColor={textSecondary}
                value={reason}
                onChangeText={setReason}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRequestModalVisible(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: textSecondary, fontWeight: "700", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNameChangeSubmit}
                disabled={submitting}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: orange,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Send size={14} color="#FFF" />
                    <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
