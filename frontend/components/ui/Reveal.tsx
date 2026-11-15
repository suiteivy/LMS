import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MOTION_TOKENS, RevealVariant } from './motionTokens';

interface RevealProps {
  children?: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  staggerIndex?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  asWords?: boolean; // Convenience flag to split text into word-by-word reveal
  text?: string;     // If asWords is true, the text to reveal
  targetValue?: number; // If variant is stats, count up to this target
  prefix?: string;
  suffix?: string;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  variant = 'cards',
  delay = 0,
  duration,
  staggerIndex = 0,
  style,
  textStyle,
  asWords = false,
  text,
  targetValue,
  prefix = '',
  suffix = '',
}) => {
  const isWeb = Platform.OS === 'web';
  const containerRef = useRef<any>(null);

  const [isVisible, setIsVisible] = useState(!isWeb); // On native, default visible immediately
  const [hasAnimated, setHasAnimated] = useState(false);
  const [count, setCount] = useState(0);

  // Check reduced motion
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined' || hasAnimated) return;

    if (reducedMotion) {
      setIsVisible(true);
      setHasAnimated(true);
      if (typeof targetValue === 'number') setCount(targetValue);
      return;
    }

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      setHasAnimated(true);
      return;
    }

    // Viewport observer with a slight bottom offset (triggers just before full view)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasAnimated(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isWeb, hasAnimated, reducedMotion, targetValue]);

  // Handle number count-up for stats variant
  useEffect(() => {
    if (!isVisible || typeof targetValue !== 'number' || targetValue <= 0) return;
    if (reducedMotion) {
      setCount(targetValue);
      return;
    }

    let startTime: number | null = null;
    const animDuration = duration || MOTION_TOKENS.variants.stats.duration;

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / animDuration, 1);
      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * targetValue));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setCount(targetValue);
      }
    };

    const animFrame = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(animFrame);
  }, [isVisible, targetValue, duration, reducedMotion]);

  // eslint-disable-next-line security/detect-object-injection
  const config = MOTION_TOKENS.variants[variant] || MOTION_TOKENS.variants.cards;
  const animDuration = duration || ('duration' in config ? config.duration : MOTION_TOKENS.durations.normal);
  const totalDelay = delay + staggerIndex * ('stagger' in config ? (config as any).stagger : MOTION_TOKENS.durations.staggerDelay);

  // Compute CSS transforms for Web
  let initialTransform = 'none';
  if ('yOffset' in config && config.yOffset) {
    initialTransform = `translateY(${config.yOffset}px)`;
  }
  if ('scaleStart' in config && config.scaleStart) {
    initialTransform += ` scale(${config.scaleStart})`;
  }
  if ('xOffset' in config && (config as any).xOffset) {
    initialTransform = `translateX(${(config as any).xOffset}px)`;
  }

  // Word-by-word text reveal
  if (asWords && text) {
    const words = text.split(' ');
    return (
      <View
        ref={containerRef}
        accessibilityLabel={text}
        style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}
      >
        {words.map((word, index) => {
          const wordDelay = totalDelay + index * MOTION_TOKENS.variants.words.stagger;
          const wordStyle = isWeb
            ? ({
                opacity: isVisible || reducedMotion ? 1 : 0,
                transform: isVisible || reducedMotion ? 'none' : 'translateY(14px)',
                transition: reducedMotion
                  ? 'none'
                  : `opacity ${animDuration}ms ${MOTION_TOKENS.easings.easeOutExpo} ${wordDelay}ms, transform ${animDuration}ms ${MOTION_TOKENS.easings.easeOutExpo} ${wordDelay}ms`,
                display: 'inline-block',
                willChange: 'transform, opacity',
              } as any)
            : {};

          return (
            <View key={index} style={wordStyle} aria-hidden={true}>
              <Text style={textStyle}>{word}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // Stats number reveal
  if (variant === 'stats' && typeof targetValue === 'number') {
    return (
      <View ref={containerRef} style={style}>
        <Text style={textStyle}>
          {prefix}
          {count.toLocaleString()}
          {suffix}
        </Text>
      </View>
    );
  }

  const webMotionStyle = isWeb
    ? ({
        opacity: isVisible || reducedMotion ? 1 : 0,
        transform: isVisible || reducedMotion ? 'none' : initialTransform,
        transition: reducedMotion
          ? 'none'
          : `opacity ${animDuration}ms ${MOTION_TOKENS.easings.easeOutExpo} ${totalDelay}ms, transform ${animDuration}ms ${MOTION_TOKENS.easings.easeOutExpo} ${totalDelay}ms`,
        willChange: 'transform, opacity',
      } as any)
    : {};

  return (
    <View ref={containerRef} style={[webMotionStyle, style]}>
      {children}
    </View>
  );
};

export default Reveal;
