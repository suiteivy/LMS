import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubjectCard } from './SubjectCard';
import { Subject } from '@/types/types';
import { EmptyState } from '@/components/common/EmptyState';
import { BookOpen } from 'lucide-react-native';

interface SubjectListProps {
  subjects: Subject[];
  title?: string;
  showFilters?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  onPressSubject: (subject: Subject) => void;
}

export const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  title = "Subjects",
  showFilters = false,
  variant = 'default',
  onPressSubject,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const categories = ['all', 'Literacy', 'Mathematics', 'Science & Technology', 'Creative Arts'];
  const levels = ['all', 'beginner', 'intermediate', 'advanced'];

  const filteredSubjects = subjects.filter(subject => {
    const categoryMatch = selectedFilter === 'all' || subject.category === selectedFilter;
    const levelMatch = selectedLevel === 'all' || subject.level === selectedLevel;
    return categoryMatch && levelMatch;
  });

  return (
    <View className="flex-1 px-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-[#2C3E50]">
          {title}
        </Text>
        <Text className="text-gray-500">
          {filteredSubjects.length} Subject{filteredSubjects.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filters */}
      {showFilters && (
        <View className="mb-4">
          {/* Category Filter */}
          <Text className="text-sm font-medium mb-2 text-[#2C3E50]">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedFilter(category)}
                className={`px-4 py-2 rounded-full mr-2 ${selectedFilter === category
<<<<<<< HEAD
                    ? 'bg-orange-500'
                    : 'bg-white border border-gray-200'
=======
                  ? 'bg-teal-500'
                  : 'bg-white border border-gray-200'
>>>>>>> 10094d0dbae412cbf5513a83d4d4825af887a959
                  }`}
              >
                <Text
                  className={`text-sm font-medium capitalize 
                  ${selectedFilter === category ? 'text-white' : 'text-[#2C3E50]'
                    }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Level Filter */}
          <Text className="text-sm font-medium mb-2 text-[#2C3E50]">Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {levels.map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setSelectedLevel(level)}
<<<<<<< HEAD
                className={`px-4 py-2 rounded-full mr-2 
                  ${selectedLevel === level
                    ? 'bg-orange-500'
                    : 'bg-white border border-gray-200'
=======
                className={`px-4 py-2 rounded-full mr-2 ${selectedLevel === level
                  ? 'bg-[#A1EBE5]'
                  : 'bg-white border border-gray-200'
>>>>>>> 10094d0dbae412cbf5513a83d4d4825af887a959
                  }`}
              >
                <Text className={`text-sm font-medium capitalize 
                  ${selectedFilter === level ? 'text-white' : 'text-[#2C3E50]'
                    }`}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Subject Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              Subject={subject}
              onPress={() => onPressSubject(subject)}
              variant={variant}
            />
          ))
        ) : (
          <EmptyState
            title="No Subjects found"
            message="Try adjusting your filters or search query."
            icon={BookOpen}
          />
<<<<<<< HEAD
        ))}
        {filteredSubjects.length === 0 && (
          <View className="items-center py-12">
            <Ionicons name="school" size={48} color="orange" />
            <Text className="text-gray-500 mt-4 text-center">
              No Subjects found{'\n'}Try adjusting your filters
            </Text>
          </View>
=======
>>>>>>> 10094d0dbae412cbf5513a83d4d4825af887a959
        )}
      </ScrollView>
    </View>
  );
};
