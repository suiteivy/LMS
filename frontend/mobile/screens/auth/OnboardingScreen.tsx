/**
 * OnboardingScreen (Mobile Only)
 * 
 * First-launch onboarding sequence featuring:
 * - 3 swipeable slides highlighting core platform value
 * - Animated MobileLivingBackground with per-slide adaptive ambient color morphing
 * - Bespoke lightweight SVG vector centerpieces (HolographicKnowledgeCore,
 *   InstitutionalSignalConstellation, FloatingWorkspaceMatrix)
 * - 60fps NativeDriver transforms for smooth budget-device rendering
 * - Fluid capsule pagination dots with spring physics
 * - Skip and "Get Started" / "Continue" actions with local persistence
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { mobileColors, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';
import { MobileLivingBackground } from '@/components/landing/MobileLivingBackground';
import {
  HolographicKnowledgeCore,
  InstitutionalSignalConstellation,
  FloatingWorkspaceMatrix,
} from '@/mobile/components/onboarding/OnboardingVisualAnchors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ONBOARDING_COMPLETE_KEY = '@cloudora_onboarding_complete';

const IconArrowRight = ArrowRight as any;

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  component: React.ComponentType;
  accent: string;
  colorStops: string[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'academics',
    title: 'ACADEMIC MASTERY',
    subtitle: 'Everything in One Unified Hub',
    description:
      'Track real-time attendance, grades, report cards, coursework, and dynamic timetables with effortless precision.',
    component: HolographicKnowledgeCore,
    accent: '#FF6B00',
    colorStops: ['#FF6B00', '#FFA040', '#7C3AED'],
  },
  {
    id: 'communication',
    title: 'SEAMLESS CONNECTION',
    subtitle: 'Institutional Communication',
    description:
      'Instant notices, school calendars, interactive alerts, and messages keep educators, students, and parents aligned.',
    component: InstitutionalSignalConstellation,
    accent: '#38BDF8',
    colorStops: ['#3166BE', '#38BDF8', '#7C3AED'],
  },
  {
    id: 'roles',
    title: 'TAILORED WORKSPACES',
    subtitle: 'Role-Specific Fluidity',
    description:
      'Bespoke dashboards designed specifically for Administrators, Teachers, Students, and Parents on every device.',
    component: FloatingWorkspaceMatrix,
    accent: '#A855F7',
    colorStops: ['#7C3AED', '#A855F7', '#FF6B00'],
  },
];

export const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Staggered text entrance animations on slide switch
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const textSlideAnim = useRef(new Animated.Value(0)).current;

  const triggerSlideTransition = () => {
    textFadeAnim.setValue(0);
    textSlideAnim.setValue(12);

    Animated.parallel([
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    triggerSlideTransition();
  }, [activeIndex]);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch {
      // Continue even if storage fails
    }
    router.replace('/(auth)/signIn' as any);
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const currentSlide = SLIDES[activeIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Dynamic Native Living Background with Per-Slide Color Morphing */}
      <MobileLivingBackground colorStops={currentSlide.colorStops} />

      {/* Top Header: Brand Logo & Skip Button */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>CLOUDORA</Text>
        </View>

        {activeIndex < SLIDES.length - 1 ? (
          <TouchableOpacity
            onPress={completeOnboarding}
            style={styles.skipButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Swipeable Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.carousel}
      >
        {SLIDES.map((slide, index) => {
          const Centerpiece = slide.component;
          return (
            <View key={slide.id} style={styles.slide}>
              {/* Bespoke Holographic Vector Centerpiece */}
              <View style={styles.centerpieceContainer}>
                <Centerpiece />
              </View>

              {/* Text Content with Staggered Entrance */}
              <Animated.View
                style={[
                  styles.textContent,
                  index === activeIndex
                    ? {
                        opacity: textFadeAnim,
                        transform: [{ translateY: textSlideAnim }],
                      }
                    : {},
                ]}
              >
                <Text style={[styles.slideBadge, { color: slide.accent }]}>
                  {slide.title}
                </Text>
                <Text style={styles.slideHeading}>
                  {slide.subtitle}
                </Text>
                <Text style={styles.slideDescription}>
                  {slide.description}
                </Text>
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Controls: Pagination Dots & Action Button */}
      <View style={styles.bottomBar}>
        {/* Animated Capsule Pagination Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((slide, i) => {
            const isActive = i === activeIndex;
            return (
              <View
                key={slide.id}
                style={[
                  styles.dot,
                  isActive
                    ? [styles.dotActive, { backgroundColor: currentSlide.accent }]
                    : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[styles.ctaButton, { shadowColor: currentSlide.accent }]}
          accessibilityRole="button"
          accessibilityLabel={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
        >
          <Text style={styles.ctaText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <IconArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070514',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: MIN_TOUCH_TARGET,
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  carousel: {
    flex: 1,
    zIndex: 10,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centerpieceContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  textContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  slideBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  slideHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  slideDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '400',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 30,
    backgroundColor: mobileColors.flame,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  ctaButton: {
    width: '100%',
    height: 54,
    backgroundColor: mobileColors.flame,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default OnboardingScreen;
