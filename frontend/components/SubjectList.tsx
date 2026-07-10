import { useTheme } from '@/contexts/ThemeContext';
import { Subject } from '@/types/types';
import { BookOpen, Filter } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { SubjectCard } from './SubjectCard';

interface SubjectListProps {
  subjects: Subject[];
  title?: string;
  variant?: 'default' | 'compact' | 'featured';
  onPressSubject: (subject: Subject) => void;
  onDeleteSubject?: (subject: Subject) => void;
  deletingId?: string | null;
  kesRate?: number;
}

export const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  title = "Subjects",
  variant = 'default',
  onPressSubject,
  onDeleteSubject,
  deletingId,
  kesRate = 129,
}) => {
  const { isDark } = useTheme();
  const filteredSubjects = subjects;

 // ── tokens ────────────────────────────────────────────────────────────────
 const textPrimary = isDark ? '#f1f1f1' : '#111827';
 const textSecondary = isDark ? '#9ca3af' : '#6b7280';
 const surface = isDark ? '#13103A' : '#ffffff';
 const border = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
 const accent = '#FF6900';

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      {/* Header */}
      <View style={{ marginBottom: 24, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', letterSpacing: -1, color: textPrimary }}>
            {title.split(' ')[0]}
            <Text style={{ color: accent }}>.</Text>
          </Text>
        </View>
        <Text style={{ color: textSecondary, fontWeight: '600', fontSize: 12, letterSpacing: 2 }}>
          {filteredSubjects.length} Subjects found
        </Text>
      </View>

      {/* Results */}
      <View style={{ flex: 1 }}>
        {filteredSubjects.length > 0 ? (
          <View style={{ paddingBottom: 80 }}>
            {filteredSubjects.map((subject) => (
              <View key={subject.id} style={{ marginBottom: 6 }}>
                <SubjectCard
                  Subject={subject}
                  onPress={() => onPressSubject(subject)}
                  variant={variant}
                  kesRate={kesRate}
                  onDelete={onDeleteSubject ? () => onDeleteSubject(subject) : undefined}
                  deleting={deletingId === subject.id}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <View style={{ width: 96, height: 96, backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <BookOpen size={40} color={accent} />
            </View>
            <Text style={{ fontSize: 19, fontWeight: 'bold', color: textPrimary, marginBottom: 8 }}>Nothing found</Text>
            <Text style={{ color: textSecondary, fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 }}>
              Try adjusting your filters to find what you&apos;re looking for.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
