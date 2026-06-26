import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Image, Text, View } from "react-native";
import { UserCircle } from "lucide-react-native";
import { resolveAvatarUri } from "@/utils/avatar";

export default function ReadOnlyProfile() {
  const { profile, displayId } = useAuth();
  const { isDark } = useTheme();

  const bg = isDark ? "#161B22" : "#FFFFFF";
  const card = isDark ? "#161B22" : "#F6F8FA";
  const border = isDark ? "#21262D" : "#D0D7DE";
  const textPrimary = isDark ? "#F9FAFB" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";

  const fullName = profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "User";
  const roleLabel = profile?.role ? profile.role.replace("_", " ").toUpperCase() : "USER";
  const avatarUri = resolveAvatarUri(profile?.avatar_url);

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
      <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 20, padding: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <View style={{ width: 110, height: 110, borderRadius: 18, borderWidth: 1, borderColor: border, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "#0F141C" : "#FFFFFF" }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <UserCircle size={64} color={isDark ? "#4B5563" : "#9CA3AF"} />
            )}
          </View>
          <Text style={{ color: textPrimary, fontSize: 24, fontWeight: "800", marginTop: 12 }}>{fullName}</Text>
          <Text style={{ color: "#FF6900", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 4 }}>{roleLabel}</Text>
        </View>

        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Custom ID</Text>
            <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "700", marginTop: 2 }}>{displayId || "N/A"}</Text>
          </View>
          <View>
            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Email</Text>
            <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "700", marginTop: 2 }}>{profile?.email || "N/A"}</Text>
          </View>
          <View>
            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Phone</Text>
            <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "700", marginTop: 2 }}>{profile?.phone || "Not set"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
