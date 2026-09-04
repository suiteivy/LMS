import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Dimensions,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {
  Package,
  Building,
  Check,
  MoveRight,
  Sparkles,
  Crown,
  BookOpen,
  Library,
  CreditCard,
  BadgeCheck,
  ShieldAlert,
  Layers,
  Zap,
} from 'lucide-react-native';

export function priceConverter(price: string, currency: 'USD' | 'KSH' = 'KSH') {
  if (price.toLowerCase() === 'custom') return price;
  if (currency === 'USD') return price;

  const exchangeRate = 130;
  const numericPrice = price.replace(/[^0-9.]/g, '');
  const priceInUsd = parseFloat(numericPrice);

  if (isNaN(priceInUsd)) return price;

  const priceInKsh = priceInUsd * exchangeRate;
  return `KSH. ${priceInKsh.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface FuturisticPricingProps {
  onSelectPlan: (planName: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TierType = 'plans' | 'custom';

export const FuturisticPricing: React.FC<FuturisticPricingProps> = ({ onSelectPlan }) => {
  const isWeb = Platform.OS === 'web';
  const isDesktop = SCREEN_WIDTH >= 1024;
  const isTablet = SCREEN_WIDTH >= 768 && SCREEN_WIDTH < 1024;

  const tierBtnWidth = isDesktop ? 165 : 145;

  const [selectedTier, setSelectedTier] = useState<TierType>('plans');
  const [currency, setCurrency] = useState<'USD' | 'KSH'>('KSH');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [trialBtnHovered, setTrialBtnHovered] = useState(false);
  const [hoveredAddon, setHoveredAddon] = useState<string | null>(null);
  const [hoveredAddonBtn, setHoveredAddonBtn] = useState<string | null>(null);

  // Smooth cool transition animation refs
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
      badge: 'STARTER',
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
      icon: <Library size={22} color="#8B5CF6" />,
    },
    {
      name: 'School Fees & Invoicing',
      price: '$30/mo',
      accent: '#F59E0B',
      desc: 'Automated term fee invoices, M-Pesa receipts, and printable balance statements.',
      included: 'Included in Premium & Custom',
      icon: <CreditCard size={22} color="#F59E0B" />,
    },
    {
      name: 'Parent Messaging & Diary',
      price: '$10/mo',
      accent: '#10B981',
      desc: 'Instant school notice alerts, daily homework diary, and direct parent messages.',
      included: 'Included in Pro & Premium',
      icon: <BadgeCheck size={22} color="#10B981" />,
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
      {isWeb && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes tierContentFadeIn {
                0% {
                  opacity: 0;
                  transform: translateY(12px) scale(0.995);
                }
                100% {
                  opacity: 1;
                  transform: none;
                }
              }
            `,
          }}
        />
      )}
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 44 }}>
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
            marginBottom: 16,
          }}
        >
          <CreditCard size={13} color="#FF8C40" />
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
            fontSize: isDesktop ? 42 : 30,
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
            marginBottom: 28,
            ...(isWeb ? ({ textWrap: 'pretty' } as any) : {}),
          }}
        >
          Select the plan that best meets the needs of your Institution
        </Text>

        {/* Currency & Tier Switcher Row */}
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
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(15, 11, 46, 0.85)',
              borderRadius: 18,
              padding: 4,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Sliding Active Indicator Pill */}
            <View
              style={[
                {
                  position: 'absolute',
                  top: 4,
                  bottom: 4,
                  left: 4,
                  width: tierBtnWidth,
                  borderRadius: 14,
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
                      transition:
                        'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.28s ease, box-shadow 0.28s ease',
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
                  borderRadius: 14,
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
                    color: selectedTier === 'plans' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
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
                  borderRadius: 14,
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
                    color: selectedTier === 'custom' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
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

          {/* Currency Toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 14,
              padding: 3,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
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
                      paddingVertical: 7,
                      paddingHorizontal: 16,
                      borderRadius: 11,
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
                      color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                      fontSize: 12,
                      fontWeight: '800',
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

      {/* PLAN CARDS ANIMATED CONTAINER */}
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
            alignItems: 'stretch',
            justifyContent: 'center',
            marginBottom: 44,
          }}
        >
          {planConfigs.map((plan) => {
            const isHovered = hoveredCard === plan.name;

            return (
              <View
                key={plan.name}
                style={[
                  {
                    flex: 1,
                    minWidth: isDesktop ? 300 : '100%',
                    borderRadius: 30,
                    backgroundColor: 'rgba(15, 11, 46, 0.58)',
                    borderWidth: plan.popular || plan.elite ? 2 : 1.5,
                    borderColor: plan.popular
                      ? 'rgba(255, 107, 0, 0.55)'
                      : plan.elite
                      ? 'rgba(139, 92, 246, 0.55)'
                      : 'rgba(255, 255, 255, 0.1)',
                    padding: 30,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: [{
                      offsetX: 0,
                      offsetY: 20,
                      blurRadius: 40,
                      color: plan.popular
                        ? 'rgba(255, 107, 0, 0.2)'
                        : plan.elite
                        ? 'rgba(139, 92, 246, 0.2)'
                        : 'rgba(0, 0, 0, 0.4)',
                    }],
                  },
                  isWeb
                    ? ({
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
                        transform: isHovered ? [{ translateY: -8 }] : [{ translateY: 0 }],
                      } as any)
                    : {},
                ]}
                //@ts-ignore
                onPointerEnter={() => setHoveredCard(plan.name)}
                onPointerLeave={() => setHoveredCard(null)}
              >
                {/* Popular / Elite Badge */}
                {(plan.popular || plan.elite) && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 18,
                      right: 18,
                      backgroundColor: plan.popular
                        ? 'rgba(255, 107, 0, 0.2)'
                        : 'rgba(139, 92, 246, 0.2)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: plan.popular
                        ? 'rgba(255, 107, 0, 0.4)'
                        : 'rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    <Text
                      style={{
                        color: plan.popular ? '#FF8C40' : '#A78BFA',
                        fontSize: 10,
                        fontWeight: '900',
                        letterSpacing: 1,
                      }}
                    >
                      {plan.badge}
                    </Text>
                  </View>
                )}

                {/* Plan Icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: `${plan.accent}18`,
                    borderWidth: 1,
                    borderColor: `${plan.accent}35`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                  }}
                >
                  {plan.icon}
                </View>

                {/* Name */}
                <Text
                  style={{
                    color: plan.accent,
                    fontSize: 12,
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
                    marginBottom: 10,
                    opacity: currencyAnim,
                    transform: [{ scale: currencyAnim }],
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 34,
                      fontWeight: '900',
                      letterSpacing: -0.8,
                      ...(isWeb ? ({ fontVariantNumeric: 'tabular-nums' } as any) : {}),
                    }}
                  >
                    {priceConverter(plan.price, currency)}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontSize: 14,
                      fontWeight: '600',
                      marginLeft: 6,
                    }}
                  >
                    {plan.period}
                  </Text>
                </Animated.View>

                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontSize: 13.5,
                    lineHeight: 20,
                    marginBottom: 24,
                  }}
                >
                  {plan.desc}
                </Text>

                {/* Feature Checklist */}
                <View style={{ gap: 12, marginBottom: 32, flex: 1 }}>
                  {plan.features.map((feat, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          backgroundColor: `${plan.accent}18`,
                          borderWidth: 1,
                          borderColor: `${plan.accent}35`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={12} color={plan.accent} strokeWidth={3} />
                      </View>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.85)',
                          fontSize: 13.5,
                          fontWeight: '500',
                        }}
                      >
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Deploy Button */}
                <TouchableOpacity
                  onPress={() => onSelectPlan(`Subscription Plans ${plan.name}`)}
                  activeOpacity={0.85}
                  style={[
                    {
                      width: '100%',
                      paddingVertical: 16,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: plan.popular
                        ? '#FF6B00'
                        : plan.elite
                        ? '#8B5CF6'
                        : 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: plan.popular || plan.elite
                        ? 'rgba(255, 255, 255, 0.25)'
                        : 'rgba(255, 255, 255, 0.15)',
                      boxShadow: [{
                        offsetX: 0,
                        offsetY: 8,
                        blurRadius: 20,
                        color: plan.popular
                          ? 'rgba(255, 107, 0, 0.35)'
                          : plan.elite
                          ? 'rgba(139, 92, 246, 0.35)'
                          : 'transparent',
                      }],
                    },
                    isWeb ? ({ cursor: 'pointer', transitionProperty: 'all', transitionDuration: '0.2s', transitionTimingFunction: 'ease' } as any) : {},
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {plan.cta}
                  </Text>
                  <MoveRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : (
        /* CUSTOM ENTERPRISE CARD */
        <View
          style={[
            {
              width: '100%',
              maxWidth: 900,
              alignSelf: 'center',
              borderRadius: 32,
              backgroundColor: 'rgba(15, 11, 46, 0.65)',
              borderWidth: 2,
              borderColor: 'rgba(139, 92, 246, 0.5)',
              padding: isDesktop ? 40 : 28,
              marginBottom: 44,
              boxShadow: [{
                offsetX: 0,
                offsetY: 20,
                blurRadius: 40,
                color: 'rgba(139, 92, 246, 0.25)',
              }],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                } as any)
              : {},
          ]}
        >
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              alignItems: isDesktop ? 'center' : 'flex-start',
              gap: 30,
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
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

              <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginBottom: 12 }}>
                Custom School Solution
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: 15,
                  lineHeight: 23,
                  marginBottom: 20,
                }}
              >
                Tailored cloud setup designed specifically for your school's unique rules,
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
                  <View key={feat} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Check size={14} color="#A78BFA" strokeWidth={3} />
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 }}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => onSelectPlan('Custom Enterprise')}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#8B5CF6',
                paddingVertical: 20,
                paddingHorizontal: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 200,
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 10,
                  blurRadius: 24,
                  color: 'rgba(139, 92, 246, 0.4)',
                }],
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                Request Custom Plan
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 11, marginTop: 4 }}>
                Quick Contact Form
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </Animated.View>

      {/* 14-DAY ZERO-RISK TRIAL CARD */}
      <View
        style={[
          {
            width: '100%',
            maxWidth: 1000,
            alignSelf: 'center',
            borderRadius: 28,
            backgroundColor: 'rgba(16, 185, 129, 0.06)',
            borderWidth: 1.5,
            borderColor: 'rgba(16, 185, 129, 0.35)',
            padding: 28,
            marginBottom: 54,
            boxShadow: [{
              offsetX: 0,
              offsetY: 16,
              blurRadius: 36,
              color: 'rgba(16, 185, 129, 0.12)',
            }],
          },
          isWeb
            ? ({
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              } as any)
            : {},
        ]}
      >
        <View
          style={{
            flexDirection: isDesktop || isTablet ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                backgroundColor: 'rgba(16, 185, 129, 0.16)',
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.4)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800' }}>
                  Experience Cloudora Free for 14 Days
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>NO CARD NEEDED</Text>
                </View>
              </View>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.55)',
                  fontSize: 13.5,
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                Instant access to all 4 portals. Try it out with sample or real school data with no commitment.
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
                backgroundColor: trialBtnHovered ? '#059669' : '#10B981',
                paddingVertical: 16,
                paddingHorizontal: 28,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 170,
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: trialBtnHovered ? 'rgba(255, 255, 255, 0.4)' : 'rgba(16, 185, 129, 0.3)',
                boxShadow: [{
                  offsetX: 0,
                  offsetY: trialBtnHovered ? 12 : 8,
                  blurRadius: trialBtnHovered ? 28 : 20,
                  color: trialBtnHovered ? 'rgba(16, 185, 129, 0.65)' : 'rgba(16, 185, 129, 0.4)',
                }],
              },
              isWeb
                ? ({
                    transitionProperty: 'all',
                    transitionDuration: '0.25s',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: trialBtnHovered
                      ? [{ translateY: -3 }, { scale: 1.03 }]
                      : [{ translateY: 0 }, { scale: 1 }],
                    cursor: 'pointer',
                  } as any)
                : {},
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>
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
      </View>

      {/* ADD-ONS MATRIX */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 6,
          }}
        >
          Optional Extra Modules
        </Text>
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: 14,
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
          gap: 20,
          justifyContent: 'center',
        }}
      >
        {addOns.map((addon) => {
          const isCardHovered = hoveredAddon === addon.name;
          const isBtnHovered = hoveredAddonBtn === addon.name;

          return (
            <View
              key={addon.name}
              //@ts-ignore
              onPointerEnter={() => setHoveredAddon(addon.name)}
              onPointerLeave={() => setHoveredAddon(null)}
              style={[
                {
                  flex: 1,
                  minWidth: 280,
                  borderRadius: 24,
                  backgroundColor: isCardHovered
                    ? 'rgba(20, 15, 58, 0.75)'
                    : 'rgba(15, 11, 46, 0.5)',
                  borderWidth: 1.5,
                  borderColor: isCardHovered ? addon.accent : `${addon.accent}30`,
                  padding: 24,
                  boxShadow: isCardHovered
                    ? [{
                        offsetX: 0,
                        offsetY: 16,
                        blurRadius: 36,
                        color: `${addon.accent}35`,
                      }]
                    : [{
                        offsetX: 0,
                        offsetY: 4,
                        blurRadius: 16,
                        color: 'rgba(0, 0, 0, 0.2)',
                      }],
                },
                isWeb
                  ? ({
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease',
                      transform: isCardHovered ? [{ translateY: -6 }] : [{ translateY: 0 }],
                    } as any)
                  : {},
              ]}
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
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: isCardHovered ? `${addon.accent}28` : `${addon.accent}18`,
                      borderWidth: 1,
                      borderColor: isCardHovered ? addon.accent : `${addon.accent}35`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    isWeb
                      ? ({
                          transition: 'transform 0.25s ease, background-color 0.25s ease',
                          transform: isCardHovered ? [{ scale: 1.08 }] : [{ scale: 1 }],
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
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>
                    {priceConverter(addon.price, currency)}
                  </Text>
                </Animated.View>
              </View>

              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                {addon.name}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.55)',
                  fontSize: 13,
                  lineHeight: 19,
                  marginBottom: 16,
                }}
              >
                {addon.desc}
              </Text>

              <View
                style={{
                  backgroundColor: `${addon.accent}12`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  marginBottom: 20,
                  borderWidth: 0.5,
                  borderColor: isCardHovered ? `${addon.accent}40` : `${addon.accent}25`,
                }}
              >
                <Text style={{ color: addon.accent, fontSize: 11, fontWeight: '700' }}>
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
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isBtnHovered ? addon.accent : `${addon.accent}45`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isBtnHovered ? `${addon.accent}25` : 'transparent',
                  },
                  isWeb
                    ? ({
                        transitionProperty: 'all',
                        transitionDuration: '0.2s',
                        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: isBtnHovered ? [{ translateY: -2 }, { scale: 1.02 }] : [{ translateY: 0 }, { scale: 1 }],
                        cursor: 'pointer',
                      } as any)
                    : {},
                ]}
              >
                <Text
                  style={{
                    color: isBtnHovered ? '#FFFFFF' : addon.accent,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                >
                  Add to Plan
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};
