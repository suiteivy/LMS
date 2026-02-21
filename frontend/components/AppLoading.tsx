import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';

const PROMPTS = [
  "Getting things ready...",
  "Hold on a bit...",
  "Almost there...",
  "Setting up your dashboard...",
  "Looking for your data...",
  "Preparing the experience..."
];

export const AppLoading: React.FC = () => {
  const [promptIndex, setPromptIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const promptFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial fade in for the whole component
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Loop through prompts
    const interval = setInterval(() => {
      // Fade out current prompt
      Animated.timing(promptFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change prompt and fade back in
        setPromptIndex((prev) => (prev + 1) % PROMPTS.length);
        Animated.timing(promptFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View
      style={{ flex: 1, opacity: fadeAnim }}
      className="justify-center items-center bg-white dark:bg-black"
    >
      <View className="items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B00" />
        <Animated.View style={{ opacity: promptFadeAnim, marginTop: 20 }}>
          <Text className="text-base text-gray-600 dark:text-gray-300 font-medium text-center">
            {PROMPTS[promptIndex]}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};
