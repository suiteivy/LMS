import React from 'react';
import { View, Platform, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Aurora from './Aurora';

const isWeb = Platform.OS === 'web';

export interface LivingBackgroundProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  lightMode?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * LivingBackground
 *
 * Refactored to solely use the WebGL Aurora background from React Bits,
 * tailored to the SuiteIvy / LMS theme colors (Teacher Orange #FF6B00,
 * Cyber Violet #7C3AED, and Azure Stream #3166BE) against the deep space
 * base (#070514).
 */
export const LivingBackground: React.FC<LivingBackgroundProps> = ({
  colorStops = ['#FF6B00', '#7C3AED', '#3166BE'],
  amplitude = 1.0,
  blend = 0.5,
  speed = 0.5,
  lightMode = false,
  style,
}) => {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: '#070514',
          overflow: 'hidden',
          zIndex: 0,
          ...(isWeb ? ({ position: 'fixed', inset: 0 } as any) : {}),
        },
        style,
      ]}
    >
      {isWeb ? (
        <Aurora
          colorStops={colorStops}
          amplitude={amplitude}
          blend={blend}
          speed={speed}
          lightMode={lightMode}
        />
      ) : null}
    </View>
  );
};

export default LivingBackground;