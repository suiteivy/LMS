import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import {
  Building,
  Check,
  MoveRight,
  Sparkles,
  Crown,
  BookOpen,
  Library,
  CreditCard,
  MessageSquare,
  FileSpreadsheet,
  Zap,
} from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';

interface ExchangeRateConfig {
  usdToKsh: number;
}

const DEFAULT_RATES: ExchangeRateConfig = {
  usdToKsh: 130, // 1 USD = ~130 KSH
};

function formatPrice(priceInUsd: number, currency: 'USD' | 'KSH', exchangeRate = DEFAULT_RATES.usdToKsh): string {
  if (currency === 'USD') {
    return `$${priceInUsd}`;
  }

  const priceInKsh = priceInUsd * exchangeRate;
  return `KSH. ${priceInKsh.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function priceConverter(priceStr: string, curr: 'USD' | 'KSH'): string {
  const numericMatch = priceStr.match(/\d+/);
  if (!numericMatch) return priceStr;
  const num = parseInt(numericMatch[0], 10);
  if (curr === 'USD') {
    return priceStr;
  }
  const inKsh = num * DEFAULT_RATES.usdToKsh;
  return priceStr.replace(`$${num}`, `KSH. ${inKsh.toLocaleString()}`);
}

interface FuturisticPricingProps {
  onSelectPlan: (planName: string) => void;
}

type TierType = 'plans' | 'custom';

export const FuturisticPricing: React.FC<FuturisticPricingProps> = ({ onSelectPlan }) => {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const tierBtnWidth = isDesktop ? 165 : 145;

  const [selectedTier, setSelectedTier] = useState<TierType>('plans');
  const [currency, setCurrency] = useState<'USD' | 'KSH'>('KSH');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [trialBtnHovered, setTrialBtnHovered] = useState(false);
  const [hoveredAddon, setHoveredAddon] = useState<string | null>(null);
  const [hoveredAddonBtn, setHoveredAddonBtn] = useState<string | null>(null);

  // Smooth transition animation refs
  const tierFadeAnim = useRef(new Animated.Value(1)).current;
  const tierSlideAnim = useRef(new Animated.Value(0)).current;
  const currencyAnim = useRef(new Animated.Value(1)).current;

  const handleTierChange = (newTier: TierType) => {
    if (newTier === selectedTier) return;
    setSelectedTier(newTier);

    if (!isWeb) {
      tierFadeAnim.stopAnimation();
      tierSlideAnim.stopAnimation();

      tierFadeAnim.setValue(0);
      tierSlideAnim.setValue(12);

      Animated.parallel([
        Animated.timing(tierFadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tierSlideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleCurrencyChange = (newCurr: 'USD' | 'KSH') => {
    if (newCurr === currency) return;
    setCurrency(newCurr);

    currencyAnim.stopAnimation();
    currencyAnim.setValue(0.7);

    Animated.spring(currencyAnim, {
      toValue: 1,
      friction: 6,
      tension: 110,
      useNativeDriver: true,
    }).start();
  };

  const planConfigs = [
    {
      name: 'Basic',
      price: '$100',
      period: '/month',
      desc: 'Great for growing primary and secondary schools getting started with digital management.',
      accent: '#3B82F6',
      accentGlow: 'rgba(59, 130, 246, 0.38)',
      badge: 'STARTER TIER',
      icon: <BookOpen size={22} color="#3B82F6" />,
      features: [
        'Student Learning Portal',
        'Teacher Lesson & Grading Tools',
        'Parent Daily Portal & Notes',
        'Up to 900 Enrolled Students',
        'One-time setup & training: $20',
      ],
      cta: 'Choose Basic',
      popular: false,
      elite: false,
    },
    {
      name: 'Pro',
      price: '$300',
      period: '/month',
      desc: 'Ideal for established schools needing digital library books, parent diaries, and daily roll-calls.',
      accent: '#FF6B00',
      accentGlow: 'rgba(255, 107, 0, 0.45)',
      badge: 'MOST POPULAR',
      icon: <Crown size={22} color="#FF6B00" />,
      features: [
        'All Student, Teacher & Parent Portals',
        'Digital School Library Included',
        'Parent Messaging & Daily Diary',
        'Up to 1,000 Enrolled Students',
        'Daily Class Roll-Call & Attendance',
        'One-time setup & staff training: $60',
      ],
      cta: 'Choose Pro',
      popular: true,
      elite: false,
    },
    {
      name: 'Premium',
      price: '$500',
      period: '/month',
      desc: 'Built for large private schools and colleges needing complete features and dedicated support.',
      accent: '#8B5CF6',
      accentGlow: 'rgba(139, 92, 246, 0.40)',
      badge: 'ALL INCLUSIVE',
      icon: <Sparkles size={22} color="#8B5CF6" />,
      features: [
        'All 4 School Portals Included',
        'All Extra Modules Included',
        '5,000+ Enrolled Students Capacity',
        'Automated School Fees & M-Pesa Receipts',
        '24/7 Priority Phone & WhatsApp Support',
        'One-time setup & school training: $100',
      ],
      cta: 'Choose Premium',
      popular: false,
      elite: true,
    },
  ];

  const addOns = [
    {
      name: 'Digital School Library',
      price: '$30/mo',
      accent: '#8B5CF6',
      desc: 'Searchable collection of textbooks, revision guides, and past exam papers for students.',
      included: 'Included in Pro & Premium',
      icon: <Library size={20} color="#8B5CF6" />,
    },
    {
      name: 'Bursary & Fee Invoicing',
      price: '$30/mo',
      accent: '#10B981',
      desc: 'Auto fee invoices, SMS reminders to parents, and direct M-Pesa transaction tracking.',
      included: 'Included in Premium',
      icon: <CreditCard size={20} color="#10B981" />,
    },
    {
      name: 'Direct Parent Messaging',
      price: '$5/mo',
      accent: '#FF6B00',
      desc: 'Send fast school announcements, fee reminders, and student reports straight to phone.',
      included: 'Included in Pro & Premium',
      icon: <MessageSquare size={20} color="#FF6B00" />,
    },
    {
      name: 'Class Diary & Daily Attendance',
      price: '$5/mo',
      accent: '#3B82F6',
      desc: 'Daily teacher entries, student conduct notes, and instant absence alerts for parents.',
      included: 'Included in Pro & Premium',
      icon: <FileSpreadsheet size={20} color="#3B82F6" />,
    },
  ];

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 1240,
        alignSelf: 'center',
        paddingVertical: 72,
        paddingHorizontal: 20,
      }}
    >
      {/* ── SECTION HEADER ── */}
      <View style={{ alignItems: 'center', marginBottom: 54 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 30,
            backgroundColor: 'rgba(255, 107, 0, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255, 107, 0, 0.3)',
            marginBottom: 18,
            ...(isWeb
              ? ({
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 0 16px rgba(255,107,0,0.18)',
                } as any)
              : {}),
          }}
        >
          <Zap size={13} color="#FF8C40" />
          <Text
            style={{
              color: '#FF8C40',
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            TRANSPARENT & AFFORDABLE PRICING
          </Text>
        </View>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: isDesktop ? 44 : 32,
            fontWeight: '900',
            textAlign: 'center',
            letterSpacing: -0.8,
            marginBottom: 12,
            ...(isWeb ? ({ textWrap: 'balance' } as any) : {}),
          }}
        >
          Simple Plans for{' '}
          <Text style={{ color: '#FF8C40' }}>Every School</Text>
        </Text>

        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: 16,
            textAlign: 'center',
            maxWidth: 520,
            lineHeight: 24,
            marginBottom: 32,
            ...(isWeb ? ({ textWrap: 'pretty' } as any) : {}),
          }}
        >
          Select the plan that best meets the needs of your Institution
        </Text>

        {/* ── LIQUID-GLASS SWITCHER ROW ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {/* Tier Mode Selector */}
          <View
            style={[
              {
                flexDirection: 'row',
                backgroundColor: 'rgba(12, 8, 34, 0.85)',
                borderRadius: 20,
                padding: 5,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden',
              },
              isWeb
                ? ({
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow:
                      '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
                  } as any)
                : {},
            ]}
          >
            {/* Sliding Active Indicator Pill */}
            <View
              style={[
                {
                  position: 'absolute',
                  top: 5,
                  bottom: 5,
                  left: 5,
                  width: tierBtnWidth,
                  borderRadius: 15,
                  backgroundColor: selectedTier === 'plans' ? '#FF6B00' : '#8B5CF6',
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 4,
                    blurRadius: 16,
                    color: selectedTier === 'plans'
                      ? 'rgba(255, 107, 0, 0.5)'
                      : 'rgba(139, 92, 246, 0.5)',
                  }],
                  zIndex: 1,
                },
                isWeb
                  ? ({
                      background:
                        selectedTier === 'plans'
                          ? 'linear-gradient(135deg, #FFA05C 0%, #FF6B00 50%, #E85D00 100%)'
                          : 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #6D28D9 100%)',
                      boxShadow:
                        selectedTier === 'plans'
                          ? '0 0 18px rgba(255,107,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)'
                          : '0 0 18px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
                      transition:
                        'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), background 0.28s ease, box-shadow 0.28s ease',
                      transform:
                        selectedTier === 'plans'
                          ? [{ translateX: 0 }]
                          : [{ translateX: tierBtnWidth }],
                      pointerEvents: 'none',
                    } as any)
                  : {},
              ]}
            />

            <TouchableOpacity
              onPress={() => handleTierChange('plans')}
              activeOpacity={0.85}
              style={[
                {
                  width: tierBtnWidth,
                  paddingVertical: 10,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: !isWeb && selectedTier === 'plans' ? '#FF6B00' : 'transparent',
                  zIndex: 2,
                },
                isWeb ? ({ cursor: 'pointer' } as any) : {},
              ]}
            >
              <Text
                style={[
                  {
                    color: selectedTier === 'plans' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                    fontSize: 13,
                    fontWeight: '800',
                    letterSpacing: 0.2,
                  },
                  isWeb ? ({ transition: 'color 0.22s ease' } as any) : {},
                ]}
              >
                Standard Plans
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTierChange('custom')}
              activeOpacity={0.85}
              style={[
                {
                  width: tierBtnWidth,
                  paddingVertical: 10,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: !isWeb && selectedTier === 'custom' ? '#8B5CF6' : 'transparent',
                  zIndex: 2,
                },
                isWeb ? ({ cursor: 'pointer' } as any) : {},
              ]}
            >
              <Text
                style={[
                  {
                    color: selectedTier === 'custom' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                    fontSize: 13,
                    fontWeight: '800',
                    letterSpacing: 0.2,
                  },
                  isWeb ? ({ transition: 'color 0.22s ease' } as any) : {},
                ]}
              >
                Custom School Plan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Currency Toggle (Liquid Glass) */}
          <View
            style={[
              {
                flexDirection: 'row',
                backgroundColor: 'rgba(12, 8, 34, 0.85)',
                borderRadius: 16,
                padding: 4,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              isWeb
                ? ({
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow:
                      '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                  } as any)
                : {},
            ]}
          >
            {(['KSH', 'USD'] as const).map((curr) => {
              const isActive = currency === curr;
              return (
                <TouchableOpacity
                  key={curr}
                  onPress={() => handleCurrencyChange(curr)}
                  activeOpacity={0.8}
                  style={[
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                      borderWidth: 1,
                      borderColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                      boxShadow: isActive ? [{
                        offsetX: 0,
                        offsetY: 2,
                        blurRadius: 10,
                        color: 'rgba(255, 255, 255, 0.2)',
                      }] : [],
                    },
                    isWeb ? ({
                      cursor: 'pointer',
                      transitionProperty: 'all',
                      transitionDuration: '0.25s',
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: isActive ? [{ scale: 1.04 }] : [{ scale: 1 }],
                    } as any) : {},
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                      fontSize: 12,
                      fontWeight: '800',
                      letterSpacing: 0.5,
                    }}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── PLAN CARDS CONTAINER ── */}
      <Animated.View
        key={selectedTier}
        style={[
          {
            width: '100%',
          },
          isWeb
            ? ({
                animation: 'tierContentFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                willChange: 'opacity, transform',
              } as any)
            : {
                opacity: tierFadeAnim,
                transform: [{ translateY: tierSlideAnim }],
              },
        ]}
      >
      {selectedTier === 'plans' ? (
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 24,
            alignItems: isDesktop ? 'flex-start' : 'stretch',
            justifyContent: 'center',
            marginBottom: 44,
          }}
        >
          {planConfigs.map((plan) => {
            const isHovered = hoveredCard === plan.name;
            const isPopular = plan.popular;

            return (
              <GlassCard
                key={plan.name}
                variant={isPopular ? 'elevated' : 'standard'}
                accentColor={plan.accent}
                glowColor={isPopular ? 'rgba(255, 107, 0, 0.4)' : `${plan.accentGlow}`}
                borderRadius={30}
                style={[
                  {
                    flex: 1,
                    minWidth: isDesktop ? 300 : '100%',
                    transform: isHovered
                      ? [{ translateY: isPopular ? -16 : -8 }]
                      : [{ translateY: isPopular && isDesktop ? -10 : 0 }],
                  },
                ]}
                contentStyle={{
                  padding: 32,
                }}
                //@ts-ignore
                onPointerEnter={() => setHoveredCard(plan.name)}
                onPointerLeave={() => setHoveredCard(null)}
              >

                {/* Popular / Elite Floating Holographic Badge */}
                {(plan.popular || plan.elite) && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 18,
                      right: 18,
                      backgroundColor: plan.popular
                        ? '#FF6B00'
                        : 'rgba(139, 92, 246, 0.25)',
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: plan.popular
                        ? 'rgba(255, 255, 255, 0.35)'
                        : 'rgba(139, 92, 246, 0.5)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      ...(isWeb
                        ? ({
                            background: plan.popular
                              ? 'linear-gradient(135deg, #FFA05C 0%, #FF6B00 50%, #E85D00 100%)'
                              : 'rgba(139, 92, 246, 0.25)',
                            boxShadow: plan.popular
                              ? '0 0 16px rgba(255,107,0,0.55), inset 0 1px 0 rgba(255,255,255,0.3)'
                              : '0 0 14px rgba(139,92,246,0.4)',
                          } as any)
                        : {}),
                    }}
                  >
                    {plan.popular ? (
                      <Crown size={12} color="#FFFFFF" />
                    ) : (
                      <Sparkles size={12} color="#A78BFA" />
                    )}
                    <Text
                      style={{
                        color: plan.popular ? '#FFFFFF' : '#A78BFA',
                        fontSize: 10.5,
                        fontWeight: '900',
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {plan.badge}
                    </Text>
                  </View>
                )}

                {/* Plan Icon Squircle */}
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    backgroundColor: `${plan.accent}18`,
                    borderWidth: 1.5,
                    borderColor: `${plan.accent}45`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                    ...(isWeb
                      ? ({
                          boxShadow: `0 0 16px ${plan.accent}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
                        } as any)
                      : {}),
                  }}
                >
                  {plan.icon}
                </View>

                {/* Plan Name */}
                <Text
                  style={{
                    color: plan.accent,
                    fontSize: 12.5,
                    fontWeight: '800',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {plan.name} Plan
                </Text>

                {/* Price Display */}
                <Animated.View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    marginBottom: 12,
                    opacity: currencyAnim,
                    transform: [{ scale: currencyAnim }],
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 38,
                      fontWeight: '900',
                      letterSpacing: -1,
                      ...(isWeb ? ({ fontVariantNumeric: 'tabular-nums' } as any) : {}),
                    }}
                  >
                    {priceConverter(plan.price, currency)}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.48)',
                      fontSize: 14.5,
                      fontWeight: '700',
                      marginLeft: 6,
                    }}
                  >
                    {plan.period}
                  </Text>
                </Animated.View>

                {/* Plan Description */}
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.62)',
                    fontSize: 14,
                    lineHeight: 21,
                    marginBottom: 26,
                  }}
                >
                  {plan.desc}
                </Text>

                {/* Feature Checklist */}
                <View style={{ gap: 14, marginBottom: 34, flex: 1 }}>
                  {plan.features.map((feat, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 7,
                          backgroundColor: `${plan.accent}20`,
                          borderWidth: 1,
                          borderColor: `${plan.accent}55`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={13} color={plan.accent} strokeWidth={3} />
                      </View>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.88)',
                          fontSize: 14,
                          fontWeight: '600',
                          lineHeight: 20,
                        }}
                      >
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* ── LIQUID GLASS CTA BUTTON ── */}
                <TouchableOpacity
                  onPress={() => onSelectPlan(`Subscription Plans ${plan.name}`)}
                  activeOpacity={0.85}
                  style={[
                    {
                      width: '100%',
                      paddingVertical: 17,
                      borderRadius: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: plan.accent,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      boxShadow: [{
                        offsetX: 0,
                        offsetY: 8,
                        blurRadius: 22,
                        color: `${plan.accent}50`,
                      }],
                    },
                    isWeb
                      ? ({
                          background: isPopular
                            ? isHovered
                              ? 'linear-gradient(135deg, #FFA05C 0%, #FF6B00 50%, #E85D00 100%)'
                              : 'linear-gradient(135deg, #FF8C40 0%, #FF6B00 50%, #E85D00 100%)'
                            : isHovered
                            ? `linear-gradient(135deg, ${plan.accent}FF 0%, ${plan.accent} 60%, #0A061C 120%)`
                            : `linear-gradient(135deg, ${plan.accent}DD 0%, ${plan.accent} 50%, #0A061C 120%)`,
                          boxShadow: isHovered
                            ? `0 0 0 1px ${plan.accent}80, 0 14px 36px ${plan.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`
                            : `0 8px 24px ${plan.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                          transitionProperty: 'all',
                          transitionDuration: '0.22s',
                          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                          transform: isHovered ? [{ translateY: -2 }, { scale: 1.02 }] : [{ translateY: 0 }, { scale: 1 }],
                          cursor: 'pointer',
                        } as any)
                      : {},
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 }}>
                    {plan.cta}
                  </Text>
                  <MoveRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </GlassCard>
            );
          })}
        </View>
      ) : (
        /* ── CUSTOM ENTERPRISE LIQUID GLASS CONSOLE ── */
        <GlassCard
          variant="elevated"
          accentColor="#8B5CF6"
          glowColor="rgba(139, 92, 246, 0.3)"
          borderRadius={32}
          style={{
            width: '100%',
            maxWidth: 960,
            alignSelf: 'center',
            marginBottom: 44,
          }}
          contentStyle={{
            padding: isDesktop ? 44 : 28,
          }}
        >

          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              alignItems: isDesktop ? 'center' : 'flex-start',
              gap: 32,
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Building size={22} color="#A78BFA" />
                <Text
                  style={{
                    color: '#A78BFA',
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  TAILORED FOR YOUR SCHOOL
                </Text>
              </View>

              <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginBottom: 14, letterSpacing: -0.5 }}>
                Custom School Solution
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: 15.5,
                  lineHeight: 24,
                  marginBottom: 24,
                }}
              >
                Tailored cloud setup designed specifically for your school&apos;s unique rules,
                custom subjects, existing attendance systems, and accounting software.
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  'Custom Curriculum & Grading Schemes',
                  'Connects with Existing Accounting Tools',
                  'Your School Logo & Colors',
                  'All Extra Modules Included',
                  'Guaranteed 99.9% Uptime Support',
                  'Dedicated Support Manager',
                ].map((feat) => (
                  <View
                    key={feat}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(139, 92, 246, 0.25)',
                    }}
                  >
                    <Check size={14} color="#A78BFA" strokeWidth={3} />
                    <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, fontWeight: '600' }}>
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => onSelectPlan('Custom Enterprise')}
              activeOpacity={0.85}
              style={[
                {
                  backgroundColor: '#8B5CF6',
                  paddingVertical: 20,
                  paddingHorizontal: 36,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 220,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 10,
                    blurRadius: 28,
                    color: 'rgba(139, 92, 246, 0.5)',
                  }],
                },
                isWeb
                  ? ({
                      background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #6D28D9 100%)',
                      boxShadow: '0 0 24px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                      transition: 'all 0.22s ease',
                      cursor: 'pointer',
                    } as any)
                  : {},
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>
                Request Custom Plan
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 11.5, marginTop: 4, fontWeight: '600' }}>
                Quick Contact Form
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      )}
      </Animated.View>

      {/* ── 14-DAY ZERO-RISK TRIAL (EMERALD LIQUID GLASS) ── */}
      <GlassCard
        variant="elevated"
        accentColor="#10B981"
        glowColor="rgba(16, 185, 129, 0.35)"
        borderRadius={28}
        style={{
          width: '100%',
          maxWidth: 1040,
          alignSelf: 'center',
          marginBottom: 58,
        }}
        contentStyle={{
          padding: 30,
        }}
      >

        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, flex: 1 }}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 20,
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 1.5,
                borderColor: 'rgba(16, 185, 129, 0.5)',
                alignItems: 'center',
                justifyContent: 'center',
                ...(isWeb
                  ? ({
                      boxShadow: '0 0 18px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
                    } as any)
                  : {}),
              }}
            >
              <Sparkles size={26} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: -0.3 }}>
                  Experience Cloudora Free for 14 Days
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.22)',
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.45)',
                  }}
                >
                  <Text style={{ color: '#34D399', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 }}>
                    NO CREDIT CARD NEEDED
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.62)',
                  fontSize: 14,
                  marginTop: 6,
                  lineHeight: 21,
                }}
              >
                Instant access to all 4 portals. Try it out with sample or real school data with zero commitment.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onSelectPlan('Free Trial')}
            activeOpacity={0.85}
            //@ts-ignore
            onPointerEnter={() => setTrialBtnHovered(true)}
            onPointerLeave={() => setTrialBtnHovered(false)}
            style={[
              {
                backgroundColor: '#10B981',
                paddingVertical: 17,
                paddingHorizontal: 30,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 180,
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 8,
                  blurRadius: 22,
                  color: 'rgba(16, 185, 129, 0.5)',
                }],
              },
              isWeb
                ? ({
                    background: trialBtnHovered
                      ? 'linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)'
                      : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: trialBtnHovered
                      ? '0 0 28px rgba(16,185,129,0.65), inset 0 1px 0 rgba(255,255,255,0.3)'
                      : '0 8px 22px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    transitionProperty: 'all',
                    transitionDuration: '0.22s',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: trialBtnHovered
                      ? [{ translateY: -3 }, { scale: 1.03 }]
                      : [{ translateY: 0 }, { scale: 1 }],
                    cursor: 'pointer',
                  } as any)
                : {},
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 }}>
              Start Free Trial
            </Text>
            <MoveRight
              size={16}
              color="#FFFFFF"
              style={
                isWeb
                  ? ({
                      transition: 'transform 0.25s ease',
                      transform: trialBtnHovered ? [{ translateX: 4 }] : [{ translateX: 0 }],
                    } as any)
                  : {}
              }
            />
          </TouchableOpacity>
        </View>
      </GlassCard>

      {/* ── OPTIONAL EXTRA MODULES (ADD-ONS MATRIX) ── */}
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: 8,
            letterSpacing: -0.3,
          }}
        >
          Optional Extra Modules
        </Text>
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.52)',
            fontSize: 14.5,
            textAlign: 'center',
            maxWidth: 500,
          }}
        >
          Add extra tools anytime as your school grows.
        </Text>
      </View>

      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          flexWrap: isDesktop ? 'wrap' : 'nowrap',
          gap: 20,
          justifyContent: 'center',
        }}
      >
        {addOns.map((addon) => {
          const isCardHovered = hoveredAddon === addon.name;
          const isBtnHovered = hoveredAddonBtn === addon.name;

          return (
            <GlassCard
              key={addon.name}
              variant="interactive"
              hoverable
              accentColor={addon.accent}
              glowColor={`${addon.accent}35`}
              borderRadius={24}
              onPointerEnter={() => setHoveredAddon(addon.name)}
              onPointerLeave={() => setHoveredAddon(null)}
              style={{
                flex: isDesktop ? 1 : undefined,
                width: isDesktop ? '48%' : '100%',
                minWidth: 280,
              }}
              contentStyle={{
                padding: 26,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View
                  style={[
                    {
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      backgroundColor: `${addon.accent}20`,
                      borderWidth: 1.5,
                      borderColor: `${addon.accent}45`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    isWeb
                      ? ({
                          boxShadow: `0 0 14px ${addon.accent}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
                        } as any)
                      : {},
                  ]}
                >
                  {addon.icon}
                </View>
                <Animated.View
                  style={{
                    opacity: currencyAnim,
                    transform: [{ scale: currencyAnim }],
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '900', letterSpacing: -0.3 }}>
                    {priceConverter(addon.price, currency)}
                  </Text>
                </Animated.View>
              </View>

              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
                {addon.name}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.58)',
                  fontSize: 13.5,
                  lineHeight: 20,
                  marginBottom: 18,
                }}
              >
                {addon.desc}
              </Text>

              <View
                style={{
                  backgroundColor: `${addon.accent}14`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: isCardHovered ? `${addon.accent}50` : `${addon.accent}30`,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ color: addon.accent, fontSize: 11.5, fontWeight: '800' }}>
                  {addon.included}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onSelectPlan(`${addon.name} Add-On`)}
                activeOpacity={0.8}
                //@ts-ignore
                onPointerEnter={() => setHoveredAddonBtn(addon.name)}
                onPointerLeave={() => setHoveredAddonBtn(null)}
                style={[
                  {
                    width: '100%',
                    paddingVertical: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isBtnHovered ? addon.accent : `${addon.accent}50`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isBtnHovered ? `${addon.accent}30` : `${addon.accent}14`,
                  },
                  isWeb
                    ? ({
                        transitionProperty: 'all',
                        transitionDuration: '0.2s',
                        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: isBtnHovered ? [{ translateY: -2 }, { scale: 1.02 }] : [{ translateY: 0 }, { scale: 1 }],
                        boxShadow: isBtnHovered ? `0 4px 16px ${addon.accent}40` : 'none',
                        cursor: 'pointer',
                      } as any)
                    : {},
                ]}
              >
                <Text
                  style={{
                    color: isBtnHovered ? '#FFFFFF' : addon.accent,
                    fontWeight: '800',
                    fontSize: 14,
                    letterSpacing: 0.3,
                  }}
                >
                  Add to Plan
                </Text>
              </TouchableOpacity>
            </GlassCard>
          );
        })}
      </View>
    </View>
  );
};
