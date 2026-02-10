import React from 'react';
import { View, Text } from 'react-native';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
  return (
    <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
      <Text className="text-xl font-semibold mb-6" style={{ color: "#2C3E50" }}>
        {title}
      </Text>
      {children}
    </View>
  );
};
