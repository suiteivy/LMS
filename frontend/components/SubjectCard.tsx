import { useTheme } from "@/contexts/ThemeContext";
import { Subject } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface SubjectCardProps {
  Subject: Subject;
  onPress: () => void;
  variant?: "default" | "compact" | "featured";
  kesRate?: number;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  Subject,
  onPress,
  variant = "default",
  kesRate = 129,
}) => {
  const { isDark } = useTheme();

  const t = {
    surface: isDark ? '#1a1a1a' : '#ffffff',
    border: isDark ? '#1f2937' : '#f3f4f6',
    textPrimary: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    textMuted: isDark ? '#6b7280' : '#9ca3af',
    divider: isDark ? '#1f2937' : '#f9fafb',
    ratingBg: isDark ? 'rgba(249,115,22,0.15)' : '#fff7ed',
    instructorBg: isDark ? '#1f2937' : '#f3f4f6',
    instructorBorder: isDark ? 'rgba(249,115,22,0.2)' : '#fff7ed',
    levelBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)',
    levelText: isDark ? '#ffffff' : '#111827',
  };

  const shadow = {
    boxShadow: [{
      offsetX: 0,
      offsetY: 4,
      blurRadius: 10,
      color: isDark ? 'transparent' : 'rgba(0,0,0,0.05)',
    }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 10,
    elevation: isDark ? 0 : 2,
  };

  if (variant === "compact") {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          backgroundColor: t.surface,
          borderRadius: 18,
          padding: 12,
          borderWidth: 1,
          borderColor: t.border,
          marginBottom: 10,
          flexDirection: 'row',
          ...shadow,
        }}
      >
        <Image
          source={{ uri: Subject.image }}
          style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#e5e7eb' }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
            {Subject.category}
          </Text>
          <Text style={{ fontWeight: '700', fontSize: 14, color: t.textPrimary, marginBottom: 4 }} numberOfLines={1}>
            {Subject.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="star" size={11} color="#f97316" />
            <Text style={{ fontSize: 11, color: t.textPrimary, fontWeight: '600', marginLeft: 3 }}>{Subject.rating}</Text>
            <Text style={{ fontSize: 11, color: t.textMuted, marginLeft: 3 }}>({Subject.reviewsCount})</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === "featured") {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          backgroundColor: t.surface,
          borderRadius: 24,
          marginBottom: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: t.border,
          ...shadow,
        }}
      >
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: Subject.image }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 }}>
            <View style={{ backgroundColor: t.levelBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
              <Text style={{ color: t.levelText, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{Subject.level}</Text>
            </View>
            <View style={{ backgroundColor: '#f97316', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
              <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{Subject.category}</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: t.textPrimary, marginBottom: 6 }} numberOfLines={2}>
            {Subject.title}
          </Text>
          <Text style={{ color: t.textSecondary, fontSize: 13, marginBottom: 12, lineHeight: 20 }} numberOfLines={2}>
            {Subject.shortDescription}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 99, backgroundColor: t.instructorBg, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: t.instructorBorder }}>
                <Ionicons name="person" size={13} color="#f97316" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.textPrimary }}>
                {Subject.instructors && Subject.instructors.length > 0
                  ? Subject.instructors.map(inst => inst.name).join(", ")
                  : (Subject.instructor?.name || "Unknown Instructor")}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.ratingBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
              <Ionicons name="star" size={13} color="#f97316" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: t.textPrimary, marginLeft: 4 }}>{Subject.rating}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: t.divider, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={onPress}
              style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: Subject.isEnrolled ? '#111827' : '#f97316' }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                {Subject.isEnrolled ? "CONTINUE" : "ENROLL"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Default variant   smaller
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: t.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: t.border,
        marginBottom: 16,
        overflow: 'hidden',
        padding: 14,
        ...shadow,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: t.textPrimary, flex: 1, marginRight: 10 }} numberOfLines={2}>
          {Subject.title}
        </Text>
        <View style={{ backgroundColor: '#f97316', width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-forward" size={16} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  );
};
