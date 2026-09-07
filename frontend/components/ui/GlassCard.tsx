import React, { useState } from 'react';
import {
  View,
  Pressable,
  Platform,
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

export type GlassVariant = 'standard' | 'elevated' | 'interactive' | 'modal' | 'subtle';

export interface GlassCardProps {
  children?: React.ReactNode;
  variant?: GlassVariant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  className?: string;
  borderRadius?: number;
  glowColor?: string;
  accentColor?: string;
  accentTop?: boolean;
  hoverable?: boolean;
  sheen?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onPointerEnter?: (event?: any) => void;
  onPointerLeave?: (event?: any) => void;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  testID?: string;
}

const isWeb = Platform.OS === 'web';

/**
 * GlassCard
 *
 * Core "Liquid Glass" container primitive for SuiteIvy LMS.
 * Implements the full visual spec:
 * 1. Backdrop blur (24px - 40px) with -webkit-backdrop-filter
 * 2. Translucent fill with tailored refraction gradients
 * 3. Hairline border (rgba(255, 255, 255, 0.12) or accent)
 * 4. Soft inner highlight (inset top highlight + gradient sheen)
 * 5. Diffuse outer elevation shadow
 * 6. Smooth rounded corners (20px - 32px)
 * 7. Backdrop saturation boost (saturate(180% - 190%))
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'standard',
  style,
  contentStyle,
  className,
  borderRadius = 28,
  glowColor,
  accentColor,
  accentTop = true,
  hoverable = false,
  sheen = true,
  onPress,
  onPointerEnter,
  onPointerLeave,
  pointerEvents,
  testID,
}) => {
  const [hovered, setHovered] = useState(false);

  const isInteractive = hoverable || variant === 'interactive' || Boolean(onPress);

  // Determine variant-specific parameters
  let blurAmount = 30;
  let saturateAmount = 180;
  let baseBg = 'rgba(15, 11, 46, 0.80)';
  let webGradient =
    'linear-gradient(165deg, rgba(24, 15, 52, 0.82) 0%, rgba(11, 7, 30, 0.88) 45%, rgba(6, 4, 20, 0.94) 100%)';
  let defaultBorder = 'rgba(255, 255, 255, 0.12)';
  let defaultShadow =
    '0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3), 0 12px 24px -4px rgba(0,0,0,0.5), 0 24px 48px -8px rgba(0,0,0,0.65), inset 0 1px 1px 0 rgba(255,255,255,0.18), inset 0 -1px 1px 0 rgba(0,0,0,0.45)';

  if (variant === 'elevated') {
    blurAmount = 36;
    saturateAmount = 190;
    baseBg = 'rgba(18, 12, 54, 0.88)';
    webGradient =
      'linear-gradient(165deg, rgba(28, 18, 62, 0.90) 0%, rgba(13, 8, 38, 0.94) 40%, rgba(6, 4, 22, 0.98) 100%)';
    defaultBorder = 'rgba(255, 255, 255, 0.16)';
    defaultShadow =
      '0 0 0 1px rgba(255,255,255,0.14), 0 4px 8px rgba(0,0,0,0.35), 0 16px 32px -4px rgba(0,0,0,0.55), 0 32px 64px -10px rgba(0,0,0,0.75), inset 0 1px 1px 0 rgba(255,255,255,0.22), inset 0 -1px 1px 0 rgba(0,0,0,0.5)';
  } else if (variant === 'modal') {
    blurAmount = 40;
    saturateAmount = 190;
    baseBg = 'rgba(12, 8, 34, 0.88)';
    webGradient =
      'linear-gradient(165deg, rgba(24, 15, 52, 0.85) 0%, rgba(11, 7, 30, 0.90) 40%, rgba(6, 4, 20, 0.96) 100%)';
    defaultBorder = 'rgba(255, 255, 255, 0.14)';
    defaultShadow =
      '0 0 0 1px rgba(255,255,255,0.12), 0 4px 10px rgba(0,0,0,0.4), 0 16px 36px -6px rgba(0,0,0,0.6), 0 36px 72px -12px rgba(0,0,0,0.8), inset 0 1px 1px 0 rgba(255,255,255,0.2), inset 0 -1px 1px 0 rgba(0,0,0,0.45)';
  } else if (variant === 'subtle') {
    blurAmount = 20;
    saturateAmount = 160;
    baseBg = 'rgba(255, 255, 255, 0.04)';
    webGradient =
      'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(15, 11, 46, 0.45) 100%)';
    defaultBorder = 'rgba(255, 255, 255, 0.08)';
    defaultShadow =
      '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)';
  } else if (variant === 'interactive' && hovered) {
    blurAmount = 36;
    saturateAmount = 190;
    baseBg = 'rgba(24, 15, 54, 0.92)';
    webGradient =
      'linear-gradient(165deg, rgba(32, 20, 70, 0.94) 0%, rgba(15, 10, 42, 0.96) 50%, rgba(8, 5, 26, 0.98) 100%)';
    defaultBorder = accentColor ? `${accentColor}80` : 'rgba(255, 255, 255, 0.22)';
    const glow = glowColor || (accentColor ? `${accentColor}40` : 'rgba(255, 107, 0, 0.35)');
    defaultShadow = `0 0 0 1px ${defaultBorder}, 0 0 36px ${glow}, 0 16px 36px -4px rgba(0,0,0,0.65), 0 28px 56px -10px rgba(0,0,0,0.75), inset 0 1px 1px 0 rgba(255,255,255,0.24), inset 0 -1px 1px 0 rgba(0,0,0,0.5)`;
  }

  // Active glow override if specified (e.g. For selected demo role card)
  if (glowColor && !hovered) {
    defaultShadow = `0 0 0 1.5px ${accentColor || glowColor}, 0 0 32px ${glowColor}, 0 16px 36px -4px rgba(0,0,0,0.7), inset 0 1px 1px 0 rgba(255,255,255,0.22), inset 0 -1px 1px 0 rgba(0,0,0,0.5)`;
  }

  const baseContainerStyle: ViewStyle = {
    borderRadius,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: baseBg,
    borderWidth: 1,
    borderColor: defaultBorder,
  };

  const webPlatformStyle: any = isWeb
    ? {
        backdropFilter: `blur(${blurAmount}px) saturate(${saturateAmount}%)`,
        WebkitBackdropFilter: `blur(${blurAmount}px) saturate(${saturateAmount}%)`,
        background: webGradient,
        boxShadow: defaultShadow,
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
        transform: isInteractive && hovered ? [{ translateY: -4 }] : [{ translateY: 0 }],
        cursor: onPress || isInteractive ? 'pointer' : 'default',
      }
    : {
        // Native shadow fallback
        shadowColor: glowColor ? glowColor : '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 8,
      };

  const ContainerComponent = onPress ? Pressable : View;

  return (
    <ContainerComponent
      testID={testID}
      pointerEvents={pointerEvents}
      onPress={onPress}
      //@ts-ignore
      onPointerEnter={
        isInteractive || onPointerEnter
          ? (e: any) => {
              if (isInteractive) setHovered(true);
              onPointerEnter?.(e);
            }
          : undefined
      }
      //@ts-ignore
      onPointerLeave={
        isInteractive || onPointerLeave
          ? (e: any) => {
              if (isInteractive) setHovered(false);
              onPointerLeave?.(e);
            }
          : undefined
      }
      style={[baseContainerStyle, webPlatformStyle, style]}
    >
      {/* ── Top Refraction Sheen (Liquid Glass Depth Highlight) ── */}
      {sheen && (
        <View
          pointerEvents="none"
          style={[
            styles.sheenLayer,
            {
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
              ...(isWeb
                ? ({
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 65%, transparent 100%)',
                  } as any)
                : {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }),
            },
          ]}
        />
      )}

      {/* ── Ambient Accent Micro-Line at Top Edge ── */}
      {accentTop && (
        <View
          pointerEvents="none"
          style={[
            styles.accentLine,
            {
              ...(isWeb
                ? ({
                    background: accentColor
                      ? `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`
                      : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)',
                  } as any)
                : {
                    backgroundColor: accentColor || 'rgba(255, 255, 255, 0.2)',
                  }),
            },
          ]}
        />
      )}

      {/* ── Card Content ── */}
      <View style={[{ position: 'relative', zIndex: 3 }, contentStyle]}>
        {children}
      </View>
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  sheenLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    opacity: 0.7,
    zIndex: 1,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 2,
  },
});

export default GlassCard;
