import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);

interface ToastCardProps extends ToastConfigParams<any> {
  type: 'success' | 'error' | 'warning' | 'info';
  iconName: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  badgeBg: string;
}

const ToastCard: React.FC<ToastCardProps> = ({
  text1,
  text2,
  iconName,
  accentColor,
  badgeBg,
  hide,
}) => {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      {/* Icon Badge */}
      <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
        <Ionicons name={iconName} size={20} color={accentColor} />
      </View>

      {/* Text Container */}
      <View style={styles.textContainer}>
        {text1 ? <Text style={styles.titleText} numberOfLines={2}>{text1}</Text> : null}
        {text2 ? <Text style={styles.messageText} numberOfLines={3}>{text2}</Text> : null}
      </View>

      {/* Dismiss Button */}
      <TouchableOpacity
        onPress={() => hide()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.dismissButton}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.55)" />
      </TouchableOpacity>
    </View>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => (
    <ToastCard
      {...props}
      type="success"
      iconName="checkmark-circle"
      accentColor="#10B981"
      badgeBg="rgba(16, 185, 129, 0.16)"
    />
  ),
  error: (props) => (
    <ToastCard
      {...props}
      type="error"
      iconName="alert-circle"
      accentColor="#EF4444"
      badgeBg="rgba(239, 68, 68, 0.16)"
    />
  ),
  warning: (props) => (
    <ToastCard
      {...props}
      type="warning"
      iconName="warning"
      accentColor="#F59E0B"
      badgeBg="rgba(245, 158, 11, 0.16)"
    />
  ),
  info: (props) => (
    <ToastCard
      {...props}
      type="info"
      iconName="information-circle"
      accentColor="#3B82F6"
      badgeBg="rgba(59, 130, 246, 0.16)"
    />
  ),
};

const styles = StyleSheet.create({
  card: {
    width: TOAST_WIDTH,
    minHeight: 56,
    backgroundColor: '#151138',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 'auto',
    // High elevation & shadow to render on top of native stack screens and modals
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    zIndex: 9999999,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  messageText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12.5,
    fontWeight: '400',
    lineHeight: 17,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default toastConfig;
