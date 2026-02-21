import { useTheme } from '@/contexts/ThemeContext';
import { Subject } from '@/types/types';
import { BookOpen, Filter } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SubjectCard } from './SubjectCard';

interface SubjectListProps {
  subjects: Subject[];
  title?: string;
  showFilters?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  onPressSubject: (subject: Subject) => void;
  kesRate?: number;
}

export const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  title = "Subjects",
  showFilters = false,
  variant = 'default',
  onPressSubject,
  kesRate = 129,
}) => {
  const { isDark } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const categories = ['all', 'Literacy', 'Mathematics', 'Science', 'Creative Arts'];
  const levels = ['all', 'beginner', 'intermediate', 'advanced'];

  const filteredSubjects = subjects.filter(subject => {
    const categoryMatch = selectedFilter === 'all' ||
      subject.category?.toLowerCase() === selectedFilter.toLowerCase() ||
      (selectedFilter === 'Science' && subject.category?.includes('Science'));
    const levelMatch = selectedLevel === 'all' || subject.level === selectedLevel;
    return categoryMatch && levelMatch;
  });

  // ── tokens ────────────────────────────────────────────────────────────────
  const textPrimary = isDark ? '#f1f1f1' : '#111827';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const surface = isDark ? '#1e1e1e' : '#ffffff';
  const border = isDark ? '#2c2c2c' : '#f3f4f6';
  const accent = '#FF6B00';

  const FilterChip = ({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 999,
        marginRight: 10,
        borderWidth: 1,
        backgroundColor: isSelected ? accent : surface,
        borderColor: isSelected ? accent : border,
        ...(isSelected ? {
          shadowColor: accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        } : {}),
      }}
    >
      <Text style={{
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        color: isSelected ? '#ffffff' : textSecondary,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      {/* Header */}
      <View style={{ marginBottom: 24, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', letterSpacing: -1, color: textPrimary }}>
            {title.split(' ')[0]}
            <Text style={{ color: accent }}>.</Text>
          </Text>
          <View style={{ backgroundColor: isDark ? '#1e1e1e' : '#111827', width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: isDark ? 1 : 0, borderColor: border }}>
            <Filter size={20} color="white" />
          </View>
        </View>
        <Text style={{ color: textSecondary, fontWeight: '600', fontSize: 12, letterSpacing: 2 }}>
          DISCOVER {filteredSubjects.length} PREMIUM COURSES
        </Text>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 3, height: 18, backgroundColor: accent, borderRadius: 2, marginRight: 10 }} />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: textSecondary, textTransform: 'uppercase', letterSpacing: 2 }}>Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {categories.map((category) => (
              <FilterChip key={category} label={category} isSelected={selectedFilter === category} onPress={() => setSelectedFilter(category)} />
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 3, height: 18, backgroundColor: isDark ? '#f1f1f1' : '#111827', borderRadius: 2, marginRight: 10 }} />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: textSecondary, textTransform: 'uppercase', letterSpacing: 2 }}>Skill Level</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {levels.map((level) => (
              <FilterChip key={level} label={level} isSelected={selectedLevel === level} onPress={() => setSelectedLevel(level)} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results */}
      <View style={{ flex: 1 }}>
        {filteredSubjects.length > 0 ? (
          <View style={{ paddingBottom: 80 }}>
            {filteredSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                Subject={subject}
                onPress={() => onPressSubject(subject)}
                variant={variant}
                kesRate={kesRate}
              />
            ))}
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <View style={{ width: 96, height: 96, backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <BookOpen size={40} color={accent} />
            </View>
            <Text style={{ fontSize: 19, fontWeight: 'bold', color: textPrimary, marginBottom: 8 }}>Nothing found</Text>
            <Text style={{ color: textSecondary, fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 }}>
              Try adjusting your filters to find what you're looking for.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};