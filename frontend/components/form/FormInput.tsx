import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface FormInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  required = false, 
  error,
  ...props 
}) => {
  const { isDark } = useTheme();
  const text = isDark ? '#FFFFFF' : '#2C3E50';
  const inputBg = isDark ? '#161B22' : '#FFFFFF';
  const border = isDark ? '#21262D' : '#E5E7EB';
  const placeholder = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: text }}>
        {label} {required && '*'}
      </Text>
      <TextInput
        placeholderTextColor={placeholder}
        style={{
          width: '100%',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 10,
          fontSize: 16,
          color: text,
          backgroundColor: inputBg,
        }}
        {...props}
      />
      {error && (
        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
};
