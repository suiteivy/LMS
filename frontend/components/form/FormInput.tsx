import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

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
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium mb-2" style={{ color: "#2C3E50" }}>
        {label} {required && '*'}
      </Text>
      <TextInput
        className="w-full px-4 py-3 border border-gray-200 rounded-lg"
        style={{ fontSize: 16 }}
        {...props}
      />
      {error && (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      )}
    </View>
  );
};