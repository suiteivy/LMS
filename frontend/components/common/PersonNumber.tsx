import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { formatPersonNumber, type PersonIdentifierEntity, type PersonType } from '@/utils/formatters';

export interface PersonNumberProps {
  person?: PersonIdentifierEntity | null;
  type?: PersonType;
  fallback?: string;
  style?: StyleProp<TextStyle>;
  className?: string;
}

/**
 * Standard person number display component.
 * Ensures consistent rendering of Admission Numbers (0001), Staff Numbers (ST0001), and Parent Numbers (PA0001).
 * Never exposes UUIDs or raw legacy codes to users.
 */
export const PersonNumber: React.FC<PersonNumberProps> = ({
  person,
  type,
  fallback = '—',
  style,
  className,
}) => {
  const formatted = formatPersonNumber(person, type, fallback);

  return (
    <Text style={[styles.numberText, style]} className={className}>
      {formatted}
    </Text>
  );
};

const styles = StyleSheet.create({
  numberText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
});

export default PersonNumber;
