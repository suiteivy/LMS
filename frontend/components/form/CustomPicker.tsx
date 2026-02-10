import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PickerOption {
  value: string;
  label: string;
}

interface CustomPickerProps {
  label: string;
  value: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const CustomPicker: React.FC<CustomPickerProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select option",
  required = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedOption = options.find(option => option.value === value);

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium mb-2" style={{ color: "#2C3E50" }}>
        {label} {required && '*'}
      </Text>
      <TouchableOpacity
        className="w-full px-4 py-3 border border-gray-200 rounded-lg flex-row items-center justify-between"
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 mt-2">
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              className="px-4 py-3 border-b border-gray-100"
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              <Text className="text-base" style={{ color: "#2C3E50" }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};
