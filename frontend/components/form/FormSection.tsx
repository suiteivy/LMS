import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface FormSectionProps {
 title: string;
 children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
 const { isDark } = useTheme();
 const surface = isDark ? '#161B22' : '#FFFFFF';
 const border = isDark ? '#21262D' : '#E5E7EB';
 const text = isDark ? '#FFFFFF' : '#2C3E50';

 return (
 <View style={{ backgroundColor: surface, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: border, marginBottom: 24 }}>
 <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 24, color: text }}>
 {title}
 </Text>
 {children}
 </View>
 );
};
