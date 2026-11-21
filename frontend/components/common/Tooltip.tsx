import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { SETTINGS_TOOLTIPS, type TooltipTargetId } from '@/components/settings/tooltips.config';
import { useHelpContent } from '@/hooks/useHelpContent';

let createPortal: any = null;
if (Platform.OS === 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createPortal = require('react-dom').createPortal;
  } catch {
    createPortal = null;
  }
}

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  id?: TooltipTargetId | string;
  targetId?: TooltipTargetId | string;
  title?: string;
  text?: string;
  label?: string;
  description?: string;
  children?: React.ReactNode;
  learnMoreAnchor?: string;
  onLearnMore?: (anchor?: string) => void;
  placement?: TooltipPlacement;
  position?: 'top' | 'bottom'; // alias for placement
  disabled?: boolean;
  maxWidth?: number;
  openDelay?: number;
  closeDelay?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  role?: string;
  tier?: any;
}

interface TriggerRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  id,
  targetId,
  title,
  text,
  label,
  description,
  children,
  learnMoreAnchor,
  onLearnMore,
  placement = 'top',
  position,
  disabled = false,
  maxWidth = 320,
  openDelay = 60,
  closeDelay = 180,
  style,
  className,
}) => {
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const tooltipId = (targetId || id) as TooltipTargetId | undefined;

  const resolvedPlacement = (position || placement) as TooltipPlacement;

  const { getContent } = useHelpContent();
  const dbHelpItem = tooltipId ? getContent(tooltipId) : undefined;

  // Resolve content: explicit props > DB help_content > static SETTINGS_TOOLTIPS config
  const configEntry = tooltipId ? SETTINGS_TOOLTIPS[tooltipId] : undefined;
  const resolvedTitle = label || title || dbHelpItem?.title || configEntry?.title;
  const resolvedText = description || text || dbHelpItem?.body || configEntry?.text;
  const resolvedAnchor = learnMoreAnchor || configEntry?.learnMoreAnchor;

  const [visible, setVisible] = useState(false);
  const [triggerRect, setTriggerRect] = useState<TriggerRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 220, height: 60 });
  const [coords, setCoords] = useState<{ x: number; y: number; actualPlacement: 'top' | 'bottom'; arrowX: number } | null>(null);

  const triggerRef = useRef<View | null>(null);
  const openTimeoutRef = useRef<any>(null);
  const closeTimeoutRef = useRef<any>(null);

  const clearTimers = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const measureTrigger = useCallback(() => {
    if (!triggerRef.current) return;
    const node = triggerRef.current as any;

    if (Platform.OS === 'web') {
      if (typeof node.getBoundingClientRect === 'function') {
        const rect = node.getBoundingClientRect();
        if (rect && Number.isFinite(rect.left) && Number.isFinite(rect.top)) {
          setTriggerRect({
            left: rect.left,
            top: rect.top,
            width: rect.width || 20,
            height: rect.height || 20,
            right: rect.right,
            bottom: rect.bottom,
          });
        }
      }
    } else {
      if (typeof node.measureInWindow === 'function') {
        node.measureInWindow((x: number, y: number, w: number, h: number) => {
          if (Number.isFinite(x) && Number.isFinite(y)) {
            setTriggerRect({
              left: Math.max(0, x),
              top: Math.max(0, y),
              width: Math.max(1, w || 20),
              height: Math.max(1, h || 20),
              right: Math.max(0, x + (w || 20)),
              bottom: Math.max(0, y + (h || 20)),
            });
          }
        });
      }
    }
  }, []);

  // Compute position whenever trigger rect, tooltip size, or viewport changes
  const computePosition = useCallback(() => {
    if (!triggerRect) return;

    const viewport = Dimensions.get('window');
    const vw = viewport.width;
    const vh = viewport.height;

    const cardWidth = Math.min(maxWidth, vw - 24);
    const cardHeight = tooltipSize.height || 60;

    const spaceAbove = triggerRect.top;
    const spaceBelow = vh - triggerRect.bottom;

    let actualPlacement: 'top' | 'bottom' = 'top';
    if (resolvedPlacement === 'bottom') {
      if (spaceBelow < cardHeight + 12 && spaceAbove > spaceBelow) {
        actualPlacement = 'top';
      } else {
        actualPlacement = 'bottom';
      }
    } else {
      if (spaceAbove < cardHeight + 12 && spaceBelow > spaceAbove) {
        actualPlacement = 'bottom';
      } else {
        actualPlacement = 'top';
      }
    }

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    let cardX = triggerCenterX - cardWidth / 2;

    // Viewport clamping with safe margin
    cardX = Math.max(12, Math.min(cardX, vw - cardWidth - 12));

    let cardY = 0;
    if (actualPlacement === 'top') {
      cardY = triggerRect.top - cardHeight - 8;
    } else {
      cardY = triggerRect.bottom + 8;
    }

    // Clamp Y inside viewport
    cardY = Math.max(8, Math.min(cardY, vh - cardHeight - 8));

    // Arrow relative position inside card
    const rawArrowX = triggerCenterX - cardX;
    const arrowX = Math.max(16, Math.min(rawArrowX, cardWidth - 16));

    setCoords({
      x: cardX,
      y: cardY,
      actualPlacement,
      arrowX,
    });
  }, [triggerRect, tooltipSize, maxWidth, resolvedPlacement]);

  useEffect(() => {
    if (visible) {
      computePosition();
    }
  }, [visible, triggerRect, tooltipSize, computePosition]);

  // Handle scroll and resize
  useEffect(() => {
    if (!visible) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleScrollOrResize = () => {
        measureTrigger();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    } else {
      const subscription = Dimensions.addEventListener('change', () => {
        measureTrigger();
      });
      return () => {
        subscription?.remove?.();
      };
    }
  }, [visible, measureTrigger]);

  const show = () => {
    if (disabled || (!resolvedTitle && !resolvedText)) return;
    clearTimers();
    measureTrigger();
    openTimeoutRef.current = setTimeout(() => {
      measureTrigger();
      setVisible(true);
    }, openDelay);
  };

  const hide = () => {
    clearTimers();
    closeTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, closeDelay);
  };

  const hideImmediately = () => {
    clearTimers();
    setVisible(false);
  };

  const toggle = () => {
    if (visible) {
      hideImmediately();
    } else {
      show();
    }
  };

  const handleLearnMore = () => {
    hideImmediately();
    if (onLearnMore) {
      onLearnMore(resolvedAnchor);
    } else if (resolvedAnchor) {
      const isTeacher =
        pathname?.includes('(teacher)') ||
        (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.includes('/teacher'));
      const targetPath = isTeacher ? '/(teacher)/accessibility/settings' : '/(admin)/accessibility/settings';
      router.push({
        pathname: targetPath as any,
        params: { manual: '1', anchor: resolvedAnchor },
      });
    }
  };

  const handleTooltipLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      if (Math.abs(width - tooltipSize.width) > 2 || Math.abs(height - tooltipSize.height) > 2) {
        setTooltipSize({ width, height });
      }
    }
  };

  // Keyboard dismiss (Escape)
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideImmediately();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  // Color scheme
  const bg = isDark ? '#161B22' : '#1F2937';
  const textCol = '#FFFFFF';
  const mutedCol = isDark ? '#9CA3AF' : '#D1D5DB';
  const borderCol = isDark ? '#30363D' : '#374151';
  const linkCol = '#FF8A3D';

  const renderBubble = () => {
    if (!visible || (!resolvedTitle && !resolvedText)) return null;

    const cardWidth = Math.min(maxWidth, Dimensions.get('window').width - 24);

    const bubbleContent = (
      <View
        onLayout={handleTooltipLayout}
        // @ts-ignore - Web DOM event props supported by react-native-web
        onMouseEnter={() => {
          if (Platform.OS === 'web') clearTimers();
        }}
        onMouseLeave={() => {
          if (Platform.OS === 'web') hide();
        }}
        style={[
          styles.bubbleWrapper,
          {
            width: cardWidth,
            maxWidth: cardWidth,
            left: coords?.x ?? -9999,
            top: coords?.y ?? -9999,
            backgroundColor: bg,
            borderColor: borderCol,
            opacity: coords ? 1 : 0, // avoid flash before position is calculated
          },
        ]}
      >
        {/* Pointer Arrow */}
        {coords && (
          <View
            style={[
              styles.arrow,
              coords.actualPlacement === 'top' ? styles.arrowBottom : styles.arrowTop,
              {
                left: Math.max(12, Math.min(coords.arrowX - 6, cardWidth - 24)),
                backgroundColor: bg,
                borderColor: borderCol,
              },
            ]}
          />
        )}

        {/* Content Box */}
        <View style={styles.contentContainer}>
          <ScrollView
            style={{ maxHeight: 220 }}
            contentContainerStyle={{ flexGrow: 0 }}
            showsVerticalScrollIndicator={false}
          >
            {resolvedTitle ? (
              <Text style={[styles.titleText, { color: textCol, marginBottom: resolvedText ? 3 : 0 }]}>
                {resolvedTitle}
              </Text>
            ) : null}

            {resolvedText ? (
              <Text style={[styles.bodyText, { color: resolvedTitle ? mutedCol : textCol }]}>
                {resolvedText}
              </Text>
            ) : null}

            {resolvedAnchor ? (
              <TouchableOpacity
                onPress={handleLearnMore}
                style={styles.learnMoreRow}
                accessibilityRole="button"
                accessibilityLabel="Learn more"
                activeOpacity={0.7}
              >
                <Text style={[styles.learnMoreText, { color: linkCol }]}>Learn more →</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>
    );

    if (Platform.OS === 'web') {
      if (createPortal && typeof document !== 'undefined' && document.body) {
        return createPortal(bubbleContent, document.body);
      }
      return bubbleContent;
    }

    // Native mobile view using transparent full-screen Modal overlay
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={hideImmediately}
      >
        <Pressable style={styles.modalBackdrop} onPress={hideImmediately}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }} pointerEvents="box-none">
            {bubbleContent}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View
      ref={triggerRef}
      style={[styles.container, style]}
      className={className}
      // @ts-ignore - Web DOM event props supported by react-native-web
      onMouseEnter={Platform.OS === 'web' ? show : undefined}
      onMouseLeave={Platform.OS === 'web' ? hide : undefined}
      onFocus={Platform.OS === 'web' ? show : undefined}
      onBlur={Platform.OS === 'web' ? hide : undefined}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={resolvedTitle || 'Information'}
        accessibilityHint={resolvedText}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {children}
      </TouchableOpacity>
      {renderBubble()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  bubbleWrapper: {
    position: 'absolute' as any,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    zIndex: 9999999,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  contentContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minWidth: 0,
    flexShrink: 1,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  bodyText: {
    fontSize: 11.5,
    lineHeight: 16.5,
    fontWeight: '500',
  },
  learnMoreRow: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  arrow: {
    position: 'absolute',
    width: 10,
    height: 10,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    zIndex: 9999998,
  },
  arrowBottom: {
    bottom: -5,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  arrowTop: {
    top: -5,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
});
