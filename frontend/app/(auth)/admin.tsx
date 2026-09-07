import React, { useState } from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Shield, Lock, ArrowLeft } from "lucide-react-native";
import { LivingBackground } from "@/components/landing/LivingBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { CompactAdminTooltip } from "@/components/ui/AdminTooltip";

export default function AdminAuthScreen() {
  const [showCompact, setShowCompact] = useState(false);

  return (
    <>
      <LivingBackground />
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <GlassCard
          variant="modal"
          accentColor="#FF6B00"
          glowColor="rgba(255, 107, 0, 0.25)"
          borderRadius={28}
          style={{ width: "100%", maxWidth: 460 }}
          contentStyle={{ padding: 32 }}
        >
          {/* Top back button */}
          <TouchableOpacity
            onPress={() => router.replace("/")}
            activeOpacity={0.7}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={18} color="rgba(255, 255, 255, 0.7)" />
          </TouchableOpacity>

          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: "rgba(255, 107, 0, 0.12)",
                borderWidth: 1.5,
                borderColor: "rgba(255, 107, 0, 0.4)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Shield size={26} color="#FF6B00" />
            </View>
            <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "900", letterSpacing: -0.4, textAlign: "center", marginBottom: 8 }}>
              Admin Clearance Portal
            </Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 13.5, textAlign: "center", lineHeight: 20 }}>
              Restricted access node. Administrative operations require verified institutional credentials.
            </Text>
          </View>

          {/* Admin Action 1: Tooltip Info */}
          <TouchableOpacity
            onPress={() => setShowCompact(true)}
            activeOpacity={0.8}
            style={{
              width: "100%",
              paddingVertical: 16,
              paddingHorizontal: 20,
              borderRadius: 18,
              backgroundColor: "rgba(255, 107, 0, 0.12)",
              borderWidth: 1,
              borderColor: "rgba(255, 107, 0, 0.35)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <Lock size={18} color="#FF6B00" />
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14.5 }}>
              Enter Admin Portal (Restricted)
            </Text>
          </TouchableOpacity>

          {/* Admin Action 2: Sign in link */}
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/signIn" as any)}
            activeOpacity={0.8}
            style={{
              width: "100%",
              paddingVertical: 15,
              borderRadius: 18,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "rgba(255, 255, 255, 0.75)", fontWeight: "700", fontSize: 14 }}>
              Regular Institutional Sign In
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Compact Tooltip */}
        <CompactAdminTooltip
          visible={showCompact}
          onClose={() => setShowCompact(false)}
        />
      </SafeAreaView>
    </>
  );
}
