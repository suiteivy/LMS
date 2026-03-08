import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { Cloud } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const PROMPTS = [
  "Preparing your workspace...",
  "Syncing cloud data...",
  "Loading curriculum resources...",
  "Almost there...",
  "Welcome back to Cloudora"
];

export function AppLoading({ onLogout, message }: { onLogout?: () => void, message?: string }) {
  const { isDark } = useTheme();
  const [promptIndex, setPromptIndex] = useState(0);
  const [showRescue, setShowRescue] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % PROMPTS.length);
    }, 2500);

    const rescueTimer = setTimeout(() => {
      setShowRescue(true);
    }, 7000);

    return () => {
      clearInterval(interval);
      clearTimeout(rescueTimer);
    };
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(800)}
      exiting={FadeOut.duration(400)}
      style={{
        flex: 1,
        backgroundColor: isDark ? '#0F0B2E' : '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        {/* Simple Cloud Icon */}
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 30,
          backgroundColor: isDark ? 'rgba(255, 105, 0, 0.1)' : 'rgba(255, 105, 0, 0.05)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          borderWidth: 1,
          borderColor: 'rgba(255, 105, 0, 0.2)',
        }}>
          <Cloud size={52} color="#FF6900" strokeWidth={1.5} />
        </View>

        <ActivityIndicator size="large" color="#FF6900" />

        <Text style={{
          marginTop: 24,
          fontSize: 18,
          fontWeight: '700',
          color: isDark ? '#FFFFFF' : '#0F0B2E',
          textAlign: 'center'
        }}>
          {message || "Loading Cloudora"}
        </Text>

        <Animated.View
          key={promptIndex}
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(500)}
          style={{ marginTop: 8 }}
        >
          <Text style={{
            fontSize: 14,
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,11,46,0.5)',
            textAlign: 'center'
          }}>
            {PROMPTS[promptIndex]}
          </Text>
        </Animated.View>
      </View>

      {/* Emergency Logout Link */}
      {showRescue && onLogout && (
        <Animated.View
          entering={FadeIn.delay(500)}
          style={{
            position: 'absolute',
            bottom: 60,
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Text style={{
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            fontSize: 13,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            Taking too long?
          </Text>
          <TouchableOpacity
            onPress={onLogout}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 105, 0, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255, 105, 0, 0.2)',
            }}
          >
            <Text style={{ color: '#FF6900', fontWeight: '700', fontSize: 14 }}>
              Emergency Sign Out
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}