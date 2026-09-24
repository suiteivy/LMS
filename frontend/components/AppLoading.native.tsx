/**
 * AppLoading — Mobile-Native Version
 * 
 * Replaces the heavy Web cyber spinner / LivingBackground with a clean,
 * mobile-native entrance screen that seamlessly pairs with the mobile splash screen.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { CloudoraLogo } from '@/components/common/CloudoraLogo';

export function CyberConduit({
  progressVal,
  maxWidth = 340,
}: {
  progressVal?: Animated.Value;
  maxWidth?: number;
}) {
  return null;
}

export function QuantumReactorLoader({
  size = 180,
  progressVal,
  showProgress = false,
}: {
  size?: number;
  progressVal?: Animated.Value;
  showProgress?: boolean;
}) {
  return <CloudoraLogo size={size} />;
}

export function AppLoading({
  onLogout,
  message,
}: {
  onLogout?: () => void;
  message?: string;
}) {
  const { isDark } = useTheme();
  const [showRescue, setShowRescue] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const rescueTimer = setTimeout(() => setShowRescue(true), 6000);

    return () => {
      pulse.stop();
      clearTimeout(rescueTimer);
    };
  }, [pulseAnim]);

  const bg = isDark ? '#0D1117' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#111827';
  const subColor = isDark ? '#64748B' : '#94A3B8';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Animated.View style={[styles.center, { transform: [{ scale: pulseAnim }] }]}>
        <CloudoraLogo size={160} />
        <Text style={[styles.brandTitle, { color: textColor }]}>
          {message || 'CLOUDORA'}
        </Text>
        <Text style={[styles.brandSubtitle, { color: subColor }]}>
          INTELLIGENT LEARNING ECOSYSTEM
        </Text>
      </Animated.View>

      {showRescue && onLogout && (
        <View style={styles.rescueContainer}>
          <TouchableOpacity
            onPress={onLogout}
            style={styles.rescueButton}
            activeOpacity={0.7}
          >
            <LogOut size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.rescueText}>Sign out & restart</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  center: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 24,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  rescueContainer: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
  rescueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  rescueText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
