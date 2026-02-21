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
    surface:       isDark ? '#1a1a1a' : '#ffffff',
    border:        isDark ? '#1f2937' : '#f3f4f6',
    textPrimary:   isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    textMuted:     isDark ? '#6b7280' : '#9ca3af',
    divider:       isDark ? '#1f2937' : '#f9fafb',
    ratingBg:      isDark ? 'rgba(249,115,22,0.15)' : '#fff7ed',
    instructorBg:  isDark ? '#1f2937' : '#f3f4f6',
    instructorBorder: isDark ? 'rgba(249,115,22,0.2)' : '#fff7ed',
    levelBg:       isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)',
    levelText:     isDark ? '#ffffff' : '#111827',
  };

  const shadow = {
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
            <View style={{ width: 3, height: 3, borderRadius: 99, backgroundColor: t.textMuted, marginHorizontal: 6 }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f97316' }}>
              {Subject.price === 0 ? "FREE" : `${Math.round(Subject.price * kesRate).toLocaleString()} KSh`}
            </Text>
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
          {Subject.originalPrice && Subject.originalPrice > Subject.price && (
            <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
              <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '700', fontStyle: 'italic' }}>
                {Math.round(((Subject.originalPrice - Subject.price) / Subject.originalPrice) * 100)}% OFF
              </Text>
            </View>
          )}
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
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.textPrimary }}>{Subject.instructor.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.ratingBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
              <Ionicons name="star" size={13} color="#f97316" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: t.textPrimary, marginLeft: 4 }}>{Subject.rating}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: t.divider, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 9, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Total Fee</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: t.textPrimary }}>
                {Subject.price === 0 ? "FREE" : `${Math.round(Subject.price * kesRate).toLocaleString()} KSh`}
              </Text>
            </View>
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

  // Default variant — smaller
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
        ...shadow,
      }}
    >
      <View style={{ position: 'relative' }}>
        <Image source={{ uri: Subject.image }} style={{ width: '100%', height: 130 }} resizeMode="cover" />
        <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: t.levelBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: 1 }}>{Subject.level}</Text>
        </View>
      </View>

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{Subject.category}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people" size={12} color="#f97316" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.textPrimary, marginLeft: 4 }}>{Subject.studentsCount}</Text>
          </View>
        </View>

        <Text style={{ fontWeight: '700', fontSize: 15, color: t.textPrimary, marginBottom: 6 }} numberOfLines={2}>
          {Subject.title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="time-outline" size={12} color={t.textMuted} />
          <Text style={{ fontSize: 11, color: t.textSecondary, marginLeft: 4 }}>{Subject.duration}</Text>
          <View style={{ width: 3, height: 3, borderRadius: 99, backgroundColor: t.textMuted, marginHorizontal: 6 }} />
          <Ionicons name="star" size={12} color="#f97316" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: t.textPrimary, marginLeft: 4 }}>{Subject.rating}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: t.divider, paddingTop: 10 }}>
          <View>
            <Text style={{ fontSize: 9, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', marginBottom: 1 }}>Price</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.textPrimary }}>
              {Subject.price === 0 ? "FREE" : `${Math.round(Subject.price * kesRate).toLocaleString()} KSh`}
            </Text>
          </View>
          <View style={{ backgroundColor: '#f97316', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={18} color="white" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};