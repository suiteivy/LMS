import React, { useId } from 'react';
import { View, Platform, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
} from 'react-native-svg';

export interface CloudoraLogoProps {
  /** Height of the logo in points/pixels. Width automatically scales with the wider ~1.36:1 cloud aspect ratio unless width is explicitly provided. */
  size?: number;
  /** Explicit width override. */
  width?: number;
  /** Explicit height override. */
  height?: number;
  glow?: boolean;
  glowIntensity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Unboxed Canonical Cloudora Cloud Logo
 * Completely unconstrained with zero background container, border, or bounding box.
 * Wider silhouette with dual flame gradients and top specular crest.
 */
export const CloudoraLogo: React.FC<CloudoraLogoProps> = ({
  size = 28,
  width,
  height,
  glow = false,
  glowIntensity = 0.55,
  style,
}) => {
  const isWeb = Platform.OS === 'web';
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cloudGradId = `cloudora-cloud-${safeId}`;
  const rimGradId = `cloudora-rim-${safeId}`;

  // Aspect ratio is 28:20 (1.4:1) for an aerodynamic, wide cloud silhouette
  const computedHeight = height || size;
  const computedWidth = width || Math.round(computedHeight * 1.38);

  return (
    <View
      style={[
        {
          width: computedWidth,
          height: computedHeight,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        },
        glow && isWeb
          ? ({
              filter: `drop-shadow(0 0 ${Math.max(5, computedHeight * 0.38)}px rgba(255, 107, 0, ${glowIntensity}))`,
            } as any)
          : {},
        style,
      ]}
    >
      <Svg width={computedWidth} height={computedHeight} viewBox="0 0 28 20" fill="none">
        <Defs>
          <LinearGradient id={cloudGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFA040" />
            <Stop offset="45%" stopColor="#FF6B00" />
            <Stop offset="100%" stopColor="#E05300" />
          </LinearGradient>
          <LinearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#FF6B00" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>

        {/* Wide Cloudora Cloud Anatomy */}
        {/* Core solid body */}
        <Circle cx="14" cy="12.5" r="5.5" fill={`url(#${cloudGradId})`} />

        {/* Outer side puffs giving the wide silhouette */}
        <Circle cx="6.5" cy="13.5" r="4.2" fill={`url(#${cloudGradId})`} />
        <Circle cx="21.5" cy="13.5" r="4.2" fill={`url(#${cloudGradId})`} />

        {/* Upper cloud domes */}
        <Circle cx="10.5" cy="9.8" r="4.4" fill={`url(#${cloudGradId})`} />
        <Circle cx="16.5" cy="8.8" r="5.0" fill={`url(#${cloudGradId})`} />

        {/* Crisp wide base connector pill */}
        <Rect x="5.5" y="11.8" width="17" height="5" rx="2.5" fill={`url(#${cloudGradId})`} />

        {/* Upper specular crest highlight */}
        <Path
          d="M 12 7.2 C 14 5.5 18 5.8 19.8 8.6"
          stroke={`url(#${rimGradId})`}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};
