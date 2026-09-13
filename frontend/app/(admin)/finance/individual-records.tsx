import React from 'react';
import { View, ScrollView } from 'react-native';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { IndividualRecordsSection } from '@/components/admin/finance/IndividualRecordsSection';
import { useRouter } from 'expo-router';

export default function IndividualFinancialRecordsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#FFFFFF' }}>
      <UnifiedHeader
        title="Individual Financial Records"
        subtitle="Finance"
        role="Admin"
        onBack={() => router.back()}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, maxWidth: 1280, width: '100%', alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <IndividualRecordsSection />
      </ScrollView>
    </View>
  );
}
