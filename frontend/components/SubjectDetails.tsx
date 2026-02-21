import { useTheme } from "@/contexts/ThemeContext";
import { Lesson, Subject } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface SubjectDetailsProps {
  Subject: Subject;
  onEnroll: () => void;
  onBack: () => void;
  enrolling?: boolean;
  kesRate?: number;
}

export const SubjectDetails: React.FC<SubjectDetailsProps> = ({
  Subject,
  onEnroll,
  onBack,
  enrolling = false,
  kesRate = 129,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "lessons" | "reviews">("overview");

  const t = {
    bg:            isDark ? '#000000' : '#ffffff',
    surface:       isDark ? '#1a1a1a' : '#ffffff',
    surfaceAlt:    isDark ? '#111827' : '#f9fafb',
    border:        isDark ? '#1f2937' : '#f3f4f6',
    textPrimary:   isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    textMuted:     isDark ? '#6b7280' : '#9ca3af',
    tabBg:         isDark ? '#111827' : '#f3f4f6',
    tabActive:     isDark ? '#1f2937' : '#ffffff',
    detailsBg:     isDark ? '#111827' : '#f9fafb',
    divider:       isDark ? '#1f2937' : '#f3f4f6',
    tagBg:         isDark ? '#1f2937' : '#f9fafb',
    tagBorder:     isDark ? '#374151' : '#f3f4f6',
  };

  const LessonItem = ({ lesson, index }: { lesson: Lesson; index: number }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: t.surface,
      borderRadius: 18,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: t.border,
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        backgroundColor: lesson.isCompleted ? '#f97316' : lesson.isLocked ? (isDark ? '#1f2937' : '#f3f4f6') : (isDark ? '#ffffff' : '#111827'),
      }}>
        {lesson.isCompleted
          ? <Ionicons name="checkmark" size={18} color="white" />
          : lesson.isLocked
            ? <Ionicons name="lock-closed" size={16} color={isDark ? '#6b7280' : '#999'} />
            : <Text style={{ color: isDark ? '#111827' : 'white', fontWeight: '700', fontSize: 14 }}>{index + 1}</Text>
        }
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: lesson.isLocked ? t.textMuted : t.textPrimary }}>
          {lesson.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Ionicons
            name={lesson.type === 'video' ? 'play-circle' : lesson.type === 'quiz' ? 'help-circle' : 'document-text'}
            size={13}
            color={lesson.isLocked ? t.textMuted : '#f97316'}
          />
          <Text style={{ fontSize: 10, fontWeight: '600', color: t.textMuted, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {lesson.type} • {lesson.duration}
          </Text>
        </View>
      </View>

      {!lesson.isLocked && (
        <View style={{ backgroundColor: isDark ? 'rgba(249,115,22,0.15)' : '#fff7ed', padding: 8, borderRadius: 10 }}>
          <Ionicons name="play" size={13} color="#f97316" />
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Floating nav */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
          <Ionicons name="share-social-outline" size={24} color="#111827" />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: Subject.image }} style={{ width: '100%', height: 360 }} resizeMode="cover" />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280, backgroundColor: 'transparent', background: 'linear-gradient(to top, black, transparent)' }} />          {/* Gradient overlay via nested views */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          <View style={{ position: 'absolute', bottom: 40, left: 24, right: 24 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ backgroundColor: '#f97316', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 }}>
                <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 }}>{Subject.category}</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 }}>
                <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 }}>{Subject.level}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#ffffff', lineHeight: 40, marginBottom: 12 }}>{Subject.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 12 }}>
                <Ionicons name="star" size={15} color="#f97316" />
                <Text style={{ color: '#ffffff', fontWeight: '700', marginLeft: 5 }}>{Subject.rating}</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13 }}>
                Join {Subject.studentsCount}+ other learners
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={{ backgroundColor: t.bg, marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 160 }}>
          {/* Price + Enroll */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
            backgroundColor: t.detailsBg,
            padding: 20,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: t.border,
          }}>
            <View>
              <Text style={{ fontSize: 9, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tuition Fee</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: t.textPrimary }}>
                {Subject.price === 0 ? "FREE" : `${Math.round(Subject.price * kesRate).toLocaleString()} KSh`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onEnroll}
              disabled={enrolling || Subject.isEnrolled}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 18,
                backgroundColor: Subject.isEnrolled ? (isDark ? '#374151' : '#111827') : '#f97316',
                shadowColor: Subject.isEnrolled ? '#000' : '#f97316',
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                {enrolling ? "PROCESSING..." : Subject.isEnrolled ? "CONTINUE" : "ENROLL NOW"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', marginBottom: 24, backgroundColor: t.tabBg, padding: 5, borderRadius: 18 }}>
            {["overview", "lessons", "reviews"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab as any)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: activeTab === tab ? t.tabActive : 'transparent',
                  shadowColor: activeTab === tab ? '#000' : 'transparent',
                  shadowOpacity: activeTab === tab ? 0.06 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === tab && !isDark ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: activeTab === tab ? t.textPrimary : t.textMuted }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={{ minHeight: 300 }}>
            {activeTab === "overview" && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: t.textPrimary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Course Description</Text>
                <Text style={{ color: t.textSecondary, fontSize: 16, lineHeight: 26, marginBottom: 32 }}>{Subject.description}</Text>

                <Text style={{ fontSize: 10, fontWeight: '700', color: t.textPrimary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Curriculum Highlights</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {Subject.tags.map((tag, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.tagBg, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: t.tagBorder }}>
                      <Ionicons name="checkmark-circle" size={16} color="#f97316" />
                      <Text style={{ marginLeft: 8, fontWeight: '600', color: t.textPrimary, fontSize: 13 }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === "lessons" && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: t.textPrimary, textTransform: 'uppercase', letterSpacing: 2 }}>Subject Modules</Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#f97316', textTransform: 'uppercase', letterSpacing: 1 }}>{Subject.lessons.length} LESSONS</Text>
                </View>
                {Subject.lessons.map((lesson, index) => (
                  <LessonItem key={lesson.id} lesson={lesson} index={index} />
                ))}
              </View>
            )}

            {activeTab === "reviews" && (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, backgroundColor: t.surfaceAlt, borderRadius: 32 }}>
                <View style={{ width: 72, height: 72, backgroundColor: t.surface, borderRadius: 99, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}>
                  <Ionicons name="chatbubbles" size={30} color="#f97316" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: t.textPrimary, marginBottom: 8 }}>No Reviews Yet</Text>
                <Text style={{ color: t.textSecondary, fontWeight: '500', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>
                  Be the first to share your learning experience with others.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};