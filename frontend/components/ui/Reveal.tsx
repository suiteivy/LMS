import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MOTION_TOKENS, RevealVariant } from './motionTokens';

// Shared scroll-direction and viewport coordinator for the web
let lastGlobalScrollY = 0;
let globalScrollDirection: 'down' | 'up' = 'down';
let isScrollListenerAttached = false;

function setupGlobalScrollListener() {
  if (typeof window === 'undefined' || isScrollListenerAttached) return;
  lastGlobalScrollY = window.scrollY || document.documentElement.scrollTop || 0;

  const onScroll = () => {
    const currentY = window.scrollY || document.documentElement.scrollTop || 0;
    if (Math.abs(currentY - lastGlobalScrollY) > 4) {
      globalScrollDirection = currentY >= lastGlobalScrollY ? 'down' : 'up';
      lastGlobalScrollY = currentY;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  // Also capture scroll on any inner scroll containers
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  isScrollListenerAttached = true;
}

/**
 * Checks whether user prefers reduced motion, with a dev-override toggle.
 * To force motion on in the browser console for testing:
 * window.__FORCE_MOTION__ = true;
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (
      (window as any).__FORCE_MOTION__ === true ||
      window.localStorage?.getItem('FORCE_MOTION') === 'true'
    ) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export interface RevealProps {
  children?: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  staggerIndex?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  id?: string;
}

/**
 * Core Reveal Component
 * Replays on every downward scroll; stays calmly revealed when scrolling up.
 * Re-arms to hidden when scrolled out through the bottom edge.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  variant = 'cards',
  delay = 0,
  duration,
  staggerIndex = 0,
  style,
  id,
}) => {
  const isWeb = Platform.OS === 'web';
  const elementRef = useRef<any>(null);

  // States: 'hidden' | 'revealed'
  const [isRevealed, setIsRevealed] = useState(!isWeb);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isRevealedRef = useRef(isRevealed);
  isRevealedRef.current = isRevealed;

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    setupGlobalScrollListener();
    setReducedMotion(isReducedMotionPreferred());

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMediaChange = () => setReducedMotion(isReducedMotionPreferred());
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const node = elementRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    // Resolve target HTML element (React Native Web passes HTMLDivElement or element with getScrollableNode)
    const domNode =
      node instanceof HTMLElement
        ? node
        : node.getScrollableNode
        ? node.getScrollableNode()
        : node._nativeTag || node;

    if (!(domNode instanceof HTMLElement)) {
      setIsRevealed(true);
      return;
    }

    // Check initial position on mount / anchor jumps / mid-page refresh
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const initialRect = domNode.getBoundingClientRect();
    if (initialRect.top < vh * 0.92) {
      // Already at or above current viewport fold: reveal immediately
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }

    let rearmTimeout: any = null;

    // Viewport observer configured with 15% threshold and bottom margin hysteresis
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rect = entry.boundingClientRect;
          const currentVh = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;

          if (entry.isIntersecting) {
            // Element entered viewport!
            if (rearmTimeout) {
              clearTimeout(rearmTimeout);
              rearmTimeout = null;
            }

            // Downward entry from below OR re-entering from top:
            // Whenever it enters viewport, it transitions to revealed.
            setIsRevealed(true);
          } else {
            // Element is currently outside the viewport.
            // Check WHICH edge it left through:
            // 1. If it exited through the bottom edge (rect.top >= currentVh):
            //    The user scrolled back UP past this element.
            //    Re-arm to hidden with hysteresis (+60px buffer) so downward scroll will replay!
            if (rect.top >= currentVh + 40) {
              if (rearmTimeout) clearTimeout(rearmTimeout);
              rearmTimeout = setTimeout(() => {
                const latestRect = domNode.getBoundingClientRect();
                if (latestRect.top >= currentVh + 30) {
                  setIsRevealed(false);
                }
              }, 120);
            }
            // 2. If it exited through the top edge (rect.bottom <= 0):
            //    The user scrolled DOWN past this element.
            //    Keep it revealed so scrolling back up does not hide or flicker!
          }
        });
      },
      {
        threshold: [0, 0.15],
        rootMargin: '0px 0px -5% 0px',
      }
    );

    observer.observe(domNode);

    return () => {
      if (rearmTimeout) clearTimeout(rearmTimeout);
      observer.disconnect();
    };
  }, [isWeb]);

  // Variant motion settings from central MOTION_TOKENS
  // eslint-disable-next-line security/detect-object-injection
  const variantConfig = MOTION_TOKENS.variants[variant] || MOTION_TOKENS.variants.cards;
  const animDuration =
    duration ||
    ('duration' in variantConfig ? variantConfig.duration : MOTION_TOKENS.durations.revealBase);
  const staggerDelay =
    'stagger' in variantConfig ? (variantConfig as any).stagger : MOTION_TOKENS.durations.cardStagger;
  const totalDelay = delay + staggerIndex * staggerDelay;
  const easing =
    'easing' in variantConfig ? (variantConfig as any).easing : MOTION_TOKENS.easings.smoothEaseOut;

  // Build initial hidden transform
  let initialTransform = 'none';
  if ('yOffset' in variantConfig && variantConfig.yOffset) {
    initialTransform = `translateY(${variantConfig.yOffset}px)`;
  }
  if ('scaleStart' in variantConfig && variantConfig.scaleStart) {
    initialTransform += ` scale(${variantConfig.scaleStart})`;
  }
  if ('xOffset' in variantConfig && (variantConfig as any).xOffset) {
    initialTransform = `translateX(${(variantConfig as any).xOffset}px)`;
  }

  const webMotionStyle: any = isWeb
    ? {
        opacity: isRevealed ? 1 : 0,
        transform: reducedMotion
          ? 'none'
          : isRevealed
          ? 'none'
          : initialTransform,
        transition: reducedMotion
          ? `opacity 600ms ease ${totalDelay}ms`
          : `opacity ${animDuration}ms ${easing} ${totalDelay}ms, transform ${animDuration}ms ${easing} ${totalDelay}ms`,
        willChange: 'transform, opacity',
      }
    : {};

  return (
    <View ref={elementRef} nativeID={id} style={[webMotionStyle, style]}>
      {children}
    </View>
  );
};

export interface RevealTextProps {
  text: string;
  variant?: 'words' | 'headline' | 'sentences';
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  id?: string;
}

/**
 * RevealText Component
 * Word-by-word or sentence mask reveal.
 * Accessible for screen readers: parent has accessibilityLabel, split words have aria-hidden="true".
 * Replays on every downward scroll.
 */
export const RevealText: React.FC<RevealTextProps> = ({
  text,
  variant = 'headline',
  delay = 0,
  duration,
  style,
  textStyle,
  id,
}) => {
  const isWeb = Platform.OS === 'web';
  const containerRef = useRef<any>(null);
  const [isRevealed, setIsRevealed] = useState(!isWeb);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    setupGlobalScrollListener();
    setReducedMotion(isReducedMotionPreferred());
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    const domNode =
      node instanceof HTMLElement
        ? node
        : node.getScrollableNode
        ? node.getScrollableNode()
        : node._nativeTag || node;

    if (!(domNode instanceof HTMLElement)) {
      setIsRevealed(true);
      return;
    }

    const vh = window.innerHeight || document.documentElement.clientHeight;
    const initialRect = domNode.getBoundingClientRect();
    if (initialRect.top < vh * 0.92) {
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }

    let rearmTimeout: any = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rect = entry.boundingClientRect;
          const currentVh = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;

          if (entry.isIntersecting) {
            if (rearmTimeout) clearTimeout(rearmTimeout);
            setIsRevealed(true);
          } else if (rect.top >= currentVh + 40) {
            if (rearmTimeout) clearTimeout(rearmTimeout);
            rearmTimeout = setTimeout(() => {
              const latestRect = domNode.getBoundingClientRect();
              if (latestRect.top >= currentVh + 30) {
                setIsRevealed(false);
              }
            }, 120);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );

    observer.observe(domNode);
    return () => {
      if (rearmTimeout) clearTimeout(rearmTimeout);
      observer.disconnect();
    };
  }, [isWeb]);

  const words = text ? text.split(' ') : [];
  const animDuration =
    duration || (variant === 'headline' ? MOTION_TOKENS.durations.headlineMask : MOTION_TOKENS.durations.revealBase);
  const wordStagger = MOTION_TOKENS.durations.wordStagger;
  const easing = MOTION_TOKENS.easings.smoothEaseOut;

  return (
    <View
      ref={containerRef}
      nativeID={id}
      accessibilityLabel={text}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}
    >
      {words.map((word, index) => {
        const itemDelay = delay + index * wordStagger;
        const wordStyle: any = isWeb
          ? {
              opacity: isRevealed ? 1 : 0,
              transform: reducedMotion
                ? 'none'
                : isRevealed
                ? 'none'
                : 'translateY(24px)',
              transition: reducedMotion
                ? `opacity 600ms ease ${itemDelay}ms`
                : `opacity ${animDuration}ms ${easing} ${itemDelay}ms, transform ${animDuration}ms ${easing} ${itemDelay}ms`,
              display: 'inline-block',
              willChange: 'transform, opacity',
            }
          : {};

        return (
          <View key={index} style={wordStyle} aria-hidden={true}>
            <Text style={textStyle}>{word}</Text>
          </View>
        );
      })}
    </View>
  );
};

export interface CountUpProps {
  targetValue: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  id?: string;
}

/**
 * CountUp Component
 * Numbers count up on downward scroll reveal, and re-arm to 0 when scrolled away.
 */
export const CountUp: React.FC<CountUpProps> = ({
  targetValue,
  duration = MOTION_TOKENS.durations.countUp,
  prefix = '',
  suffix = '',
  decimals = 0,
  style,
  textStyle,
  id,
}) => {
  const isWeb = Platform.OS === 'web';
  const containerRef = useRef<any>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const [isRevealed, setIsRevealed] = useState(!isWeb);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    setupGlobalScrollListener();
    setReducedMotion(isReducedMotionPreferred());
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    const domNode =
      node instanceof HTMLElement
        ? node
        : node.getScrollableNode
        ? node.getScrollableNode()
        : node._nativeTag || node;

    if (!(domNode instanceof HTMLElement)) {
      setIsRevealed(true);
      return;
    }

    const vh = window.innerHeight || document.documentElement.clientHeight;
    const initialRect = domNode.getBoundingClientRect();
    if (initialRect.top < vh * 0.92) {
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }

    let rearmTimeout: any = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rect = entry.boundingClientRect;
          const currentVh = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;

          if (entry.isIntersecting) {
            if (rearmTimeout) clearTimeout(rearmTimeout);
            setIsRevealed(true);
          } else if (rect.top >= currentVh + 40) {
            if (rearmTimeout) clearTimeout(rearmTimeout);
            rearmTimeout = setTimeout(() => {
              const latestRect = domNode.getBoundingClientRect();
              if (latestRect.top >= currentVh + 30) {
                setIsRevealed(false);
                setDisplayValue(0);
              }
            }, 120);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );

    observer.observe(domNode);
    return () => {
      if (rearmTimeout) clearTimeout(rearmTimeout);
      observer.disconnect();
    };
  }, [isWeb]);

  // Handle count-up calculation
  useEffect(() => {
    if (!isRevealed || targetValue <= 0) {
      if (!isRevealed) setDisplayValue(0);
      return;
    }

    if (reducedMotion) {
      setDisplayValue(targetValue);
      return;
    }

    let startTime: number | null = null;
    let animId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = ease * targetValue;

      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isRevealed, targetValue, duration, reducedMotion]);

  const formattedValue =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.floor(displayValue).toLocaleString();

  const webMotionStyle: any = isWeb
    ? {
        opacity: isRevealed ? 1 : 0,
        transform: reducedMotion
          ? 'none'
          : isRevealed
          ? 'none'
          : `translateY(${MOTION_TOKENS.distances.riseSm}px)`,
        transition: reducedMotion
          ? 'opacity 600ms ease'
          : `opacity ${MOTION_TOKENS.durations.revealBase}ms ${MOTION_TOKENS.easings.smoothEaseOut}, transform ${MOTION_TOKENS.durations.revealBase}ms ${MOTION_TOKENS.easings.smoothEaseOut}`,
        willChange: 'transform, opacity',
      }
    : {};

  return (
    <View ref={containerRef} nativeID={id} style={[webMotionStyle, style]}>
      <Text style={textStyle}>
        {prefix}
        {formattedValue}
        {suffix}
      </Text>
    </View>
  );
};

export default Reveal;
