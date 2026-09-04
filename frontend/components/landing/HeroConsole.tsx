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
  Sparkles,
  MoveRight,
  ShieldCheck,
  Zap,
  Layers,
  GraduationCap,
  Users,
  Building,
  HeartHandshake,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Clock,
  BookOpen,
  CreditCard,
  Bell,
  Cpu
} from 'lucide-react-native';
import { router } from 'expo-router';

interface HeroConsoleProps {
  onExplorePricing: () => void;
  onOpenTrial: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RoleType = 'admin' | 'teacher' | 'student' | 'parent';

export const HeroConsole: React.FC<HeroConsoleProps> = ({ onExplorePricing, onOpenTrial }) => {
  const isWeb = Platform.OS === 'web';
  const isDesktop = SCREEN_WIDTH >= 1024;
  const isTablet = SCREEN_WIDTH >= 768 && SCREEN_WIDTH < 1024;

  const [activeRole, setActiveRole] = useState<RoleType>('admin');
  const [demoHovered, setDemoHovered] = useState(false);
  const [pricingHovered, setPricingHovered] = useState(false);

  // Eye-catching transition animation state
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scanBeam = useRef(new Animated.Value(-20)).current;
  const scanOpacity = useRef(new Animated.Value(0)).current;

  const handleRoleSwitch = (newRole: RoleType) => {
    if (newRole === activeRole) return;

    // 1. Immediately update active role without delay (0ms latency on click)
    setActiveRole(newRole);

    // 2. Stop running animations so rapid clicking is fully interruptible
    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();
    scanBeam.stopAnimation();
    scanOpacity.stopAnimation();

    // 3. Reset starting values for smooth reveal
    fadeAnim.setValue(0.35);
    slideAnim.setValue(6);
    scanBeam.setValue(-10);
    scanOpacity.setValue(0.9);

    // 4. Smooth, immediate reveal animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scanBeam, {
        toValue: 420,
        duration: 360,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scanOpacity, {
        toValue: 0,
        duration: 360,
        delay: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const roleConfigs = {
    admin: {
      title: 'School Administration',
      badge: 'ADMINISTRATION & REPORTS',
      accent: '#FF6B00',
      icon: <Building size={16} color="#FF6B00" />,
      stats: [
        { label: 'Enrolled Students', value: '1,420', sub: '+12% this term', trend: true },
        { label: 'Fees Collected', value: '96.4%', sub: 'Direct M-Pesa & Bank', trend: true },
        { label: 'Teaching Staff', value: '48 Active', sub: 'All departments active', trend: false },
      ],
      previewItem: {
        title: 'Term Fee Collection Summary',
        tag: 'PAID & RECORDED',
        metric: 'KSH. 2,840,000 Collected Today',
        progress: 0.96,
        accent: '#FF6B00',
        actionText: 'Download Fee Report',
      },
    },
    teacher: {
      title: 'Teacher Workspace',
      badge: 'LESSONS & GRADING',
      accent: '#8B5CF6',
      icon: <GraduationCap size={16} color="#8B5CF6" />,
      stats: [
        { label: 'Active Classes', value: '18 Classes', sub: 'Videos, notes & quizzes', trend: true },
        { label: 'Assignments Received', value: '142 Tasks', sub: 'Ready for grading', trend: true },
        { label: 'Class Attendance', value: '98.2%', sub: 'Daily roll-call taken', trend: true },
      ],
      previewItem: {
        title: 'Form 4 Mathematics',
        tag: 'CLASS IN PROGRESS',
        metric: '28 of 30 Students Completed Quiz',
        progress: 0.93,
        accent: '#8B5CF6',
        actionText: 'View Student Scores',
      },
    },
    student: {
      title: 'Student Portal',
      badge: 'STUDENT DASHBOARD',
      accent: '#3B82F6',
      icon: <Users size={16} color="#3B82F6" />,
      stats: [
        { label: 'Class Progress', value: '88%', sub: 'Term syllabus covered', trend: true },
        { label: 'Homework Due', value: '2 Pending', sub: 'Physics & Chemistry', trend: false },
        { label: 'School Library', value: '240+ Books', sub: 'Free digital textbooks', trend: true },
      ],
      previewItem: {
        title: 'Physics: Forces and Energy',
        tag: 'DUE TOMORROW',
        metric: 'Chapter 4: Practice Problems & Notes',
        progress: 0.75,
        accent: '#3B82F6',
        actionText: 'Continue Lesson',
      },
    },
    parent: {
      title: 'Parent Portal',
      badge: 'PARENT UPDATES',
      accent: '#10B981',
      icon: <HeartHandshake size={16} color="#10B981" />,
      stats: [
        { label: 'Today Attendance', value: 'Present', sub: 'Arrived at 07:52 AM', trend: true },
        { label: 'Fee Balance', value: 'KSH. 0', sub: 'Fully paid this term', trend: true },
        { label: 'Teacher Messages', value: '3 New Notes', sub: 'From class teacher', trend: false },
      ],
      previewItem: {
        title: 'Daily School Diary & Updates',
        tag: 'NEW MESSAGE',
        metric: 'Great progress in Science this week',
        progress: 1.0,
        accent: '#10B981',
        actionText: 'Message Class Teacher',
      },
    },
  };

  const currentRole = roleConfigs[activeRole];

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 1240,
        alignSelf: 'center',
        paddingTop: isDesktop ? 64 : 40,
        paddingBottom: isDesktop ? 80 : 50,
        paddingHorizontal: 20,
      }}
    >
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'stretch',
          gap: isDesktop ? 48 : 36,
        }}
      >
        {/* Left Column: Asymmetric Visionary Copy & Telemetry */}
        <View style={{ flex: isDesktop ? 1 : undefined, maxWidth: isDesktop ? 580 : '100%' }}>
          {/* Status Telemetry Pill */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 30,
              backgroundColor: 'rgba(255, 107, 0, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255, 107, 0, 0.28)',
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#FF6B00',
                shadowColor: '#FF6B00',
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 0,
                  blurRadius: 8,
                  color: '#FF6B00',
                }],
              }}
            />
            <Text
              style={{
                color: '#FF8C40',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              ALL-IN-ONE SCHOOL MANAGEMENT PLATFORM
            </Text>
          </View>

          {/* Monumental Headline */}
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: isDesktop ? 54 : isTablet ? 44 : 34,
              fontWeight: '900',
              lineHeight: isDesktop ? 62 : isTablet ? 52 : 42,
              letterSpacing: -1.2,
              marginBottom: 20,
              ...(isWeb ? ({ textWrap: 'balance' } as any) : {}),
            }}
          >
            The Intelligent{' '}
            <Text
              style={{
                color: '#FF8C40',
                textShadowColor: 'rgba(255, 107, 0, 0.45)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 18,
              }}
            >
              Learning
            </Text>{' '}
            Ecosystem for{' '}
            <Text
              style={{
                color: '#A78BFA',
                textShadowColor: 'rgba(139, 92, 246, 0.45)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 18,
              }}
            >
              Visionary
            </Text>{' '}
            Schools.
          </Text>

          {/* Subtitle with Technical Clarity */}
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: isDesktop ? 16.5 : 15,
              lineHeight: 25,
              marginBottom: 32,
              ...(isWeb ? ({ textWrap: 'pretty' } as any) : {}),
            }}
          >
            Bring administrators, teachers, students, and parents together in one easy cloud platform.
            Manage classes, student grades, fee payments, and daily attendance with zero hassle.
          </Text>

          {/* High-Impact Actions */}
          <View
            style={{
              flexDirection: isDesktop || isTablet ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 14,
              marginBottom: 40,
            }}
          >
            {/* Primary Action: Interactive Demo */}
            <TouchableOpacity
              onPress={() => router.push('/demo' as any)}
              activeOpacity={0.85}
              //@ts-ignore
              onPointerEnter={() => setDemoHovered(true)}
              onPointerLeave={() => setDemoHovered(false)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  backgroundColor: '#FF6B00',
                  paddingVertical: 18,
                  paddingHorizontal: 28,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  shadowColor: '#FF6B00',
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 10,
                    blurRadius: 28,
                    color: demoHovered ? 'rgba(255, 107, 0, 0.65)' : 'rgba(255, 107, 0, 0.4)',
                  }],
                },
                isWeb
                  ? ({
                      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
                      transform: demoHovered ? [{ translateY: -3 }, { scale: 1.02 }] : [{ translateY: 0 }],
                      cursor: 'pointer',
                    } as any)
                  : {},
              ]}
            >
              <Sparkles size={18} color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: 15,
                  letterSpacing: 0.3,
                }}
              >
                Try Interactive Demo
              </Text>
              <MoveRight size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Secondary Action: Explore Architecture & Pricing */}
            <TouchableOpacity
              onPress={onExplorePricing}
              activeOpacity={0.85}
              //@ts-ignore
              onPointerEnter={() => setPricingHovered(true)}
              onPointerLeave={() => setPricingHovered(false)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: pricingHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.12)',
                },
                isWeb
                  ? ({
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      transition: 'all 0.2s ease',
                      transform: pricingHovered ? [{ translateY: -2 }] : [{ translateY: 0 }],
                      cursor: 'pointer',
                    } as any)
                  : {},
              ]}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 14.5,
                  letterSpacing: 0.2,
                }}
              >
                View Plans & Pricing
              </Text>
            </TouchableOpacity>
          </View>

          {/* Telemetry Proof Strip */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 20,
              paddingTop: 20,
              borderTopWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {[
              { label: 'User Portals', val: '4 in 1' },
              { label: 'Fee Invoicing', val: 'Automated' },
              { label: 'Digital Library', val: 'Built-in' },
            ].map((item, idx) => (
              <View key={idx} style={{ minWidth: 90 }}>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '900',
                    fontSize: 18,
                    letterSpacing: -0.2,
                    ...(isWeb ? ({ fontVariantNumeric: 'tabular-nums' } as any) : {}),
                  }}
                >
                  {item.val}
                </Text>
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right Column: Interactive Holographic Platform HUD Preview */}
        <View
          style={{
            flex: isDesktop ? 1.1 : undefined,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Main Glass HUD Container */}
          <View
            style={[
              {
                borderRadius: 28,
                backgroundColor: 'rgba(15, 11, 46, 0.65)',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.12)',
                overflow: 'hidden',
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 24,
                  blurRadius: 48,
                  color: 'rgba(0, 0, 0, 0.5)',
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
            {/* Top Console Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B' }} />
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 11,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    marginLeft: 8,
                  }}
                >
                  live preview
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.25)',
                }}
              >
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' }} />
                <Text
                  style={{
                    color: '#10B981',
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                  }}
                >
                  CONNECTED
                </Text>
              </View>
            </View>

            {/* Role Switcher Matrix */}
            <View
              style={{
                padding: 14,
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderBottomWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {(['admin', 'teacher', 'student', 'parent'] as RoleType[]).map((roleKey) => {
                  const cfg = roleConfigs[roleKey];
                  const isSelected = activeRole === roleKey;

                  return (
                    <TouchableOpacity
                      key={roleKey}
                      onPress={() => handleRoleSwitch(roleKey)}
                      activeOpacity={0.8}
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingVertical: 7,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: isSelected
                            ? `${cfg.accent}25`
                            : 'rgba(255, 255, 255, 0.04)',
                          borderWidth: 1.5,
                          borderColor: isSelected
                            ? `${cfg.accent}88`
                            : 'rgba(255, 255, 255, 0.08)',
                          boxShadow: isSelected ? [{
                            offsetX: 0,
                            offsetY: 0,
                            blurRadius: 12,
                            color: `${cfg.accent}40`,
                          }] : [],
                        },
                        isWeb ? ({ cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' } as any) : {},
                      ]}
                    >
                      {React.cloneElement(cfg.icon, {
                        size: 14,
                        color: isSelected ? cfg.accent : 'rgba(255, 255, 255, 0.5)',
                      })}
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                          fontWeight: isSelected ? '800' : '600',
                          fontSize: 12,
                          textTransform: 'capitalize',
                        }}
                      >
                        {roleKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Holographic scanning beam */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: currentRole.accent,
                shadowColor: currentRole.accent,
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 0,
                  blurRadius: 14,
                  color: currentRole.accent,
                }],
                opacity: scanOpacity,
                transform: [{ translateY: scanBeam }],
                zIndex: 40,
              }}
            />

            {/* Animated Live Preview Content Container */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >

            {/* Role Header Banner */}
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text
                  style={{
                    color: currentRole.accent,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  {currentRole.badge}
                </Text>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18 }}>
                  {currentRole.title}
                </Text>
              </View>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: `${currentRole.accent}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: `${currentRole.accent}33`,
                }}
              >
                {React.cloneElement(currentRole.icon, { size: 18, color: currentRole.accent })}
              </View>
            </View>

            {/* Dynamic Telemetry Metrics Grid */}
            <View
              style={{
                padding: 20,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {currentRole.stats.map((st, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    minWidth: 130,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontSize: 11,
                      fontWeight: '600',
                      marginBottom: 6,
                    }}
                  >
                    {st.label}
                  </Text>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 19,
                      fontWeight: '900',
                      letterSpacing: -0.3,
                      marginBottom: 4,
                    }}
                  >
                    {st.value}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {st.trend && <TrendingUp size={11} color="#10B981" />}
                    <Text
                      style={{
                        color: st.trend ? '#10B981' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {st.sub}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Active Workflow Focus Box */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View
                style={{
                  backgroundColor: `${currentRole.accent}0C`,
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: `${currentRole.accent}28`,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                    {currentRole.previewItem.title}
                  </Text>
                  <View
                    style={{
                      backgroundColor: `${currentRole.accent}20`,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: `${currentRole.accent}40`,
                    }}
                  >
                    <Text
                      style={{
                        color: currentRole.accent,
                        fontSize: 9,
                        fontWeight: '800',
                        letterSpacing: 1,
                      }}
                    >
                      {currentRole.previewItem.tag}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  {currentRole.previewItem.metric}
                </Text>

                {/* Progress Bar */}
                <View
                  style={{
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${currentRole.previewItem.progress * 100}%`,
                      backgroundColor: currentRole.accent,
                      borderRadius: 3,
                    }}
                  />
                </View>

                {/* Simulated Console Action */}
                <TouchableOpacity
                  onPress={() => router.push('/demo' as any)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: `${currentRole.accent}18`,
                    borderWidth: 1,
                    borderColor: `${currentRole.accent}35`,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {currentRole.previewItem.actionText}
                  </Text>
                  <MoveRight size={13} color={currentRole.accent} />
                </TouchableOpacity>
              </View>
            </View>
            </Animated.View>
          </View>

          {/* Floating Atmospheric Badge 1: Real-time Attendance */}
          {isDesktop && (
            <View
              style={[
                {
                  position: 'absolute',
                  top: -24,
                  right: -20,
                  backgroundColor: 'rgba(15, 11, 46, 0.85)',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 12,
                    blurRadius: 24,
                    color: 'rgba(0, 0, 0, 0.4)',
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
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#10B981',
                  shadowColor: '#10B981',
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 0,
                    blurRadius: 8,
                    color: '#10B981',
                  }],
                }}
              />
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                  Daily Attendance Tracker
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 9.5 }}>
                  Real-time updates for parents
                </Text>
              </View>
            </View>
          )}

          {/* Floating Atmospheric Badge 2: Financial Automation */}
          {isDesktop && (
            <View
              style={[
                {
                  position: 'absolute',
                  bottom: -18,
                  left: -20,
                  backgroundColor: 'rgba(15, 11, 46, 0.85)',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 107, 0, 0.35)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 12,
                    blurRadius: 24,
                    color: 'rgba(0, 0, 0, 0.4)',
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
              <CreditCard size={16} color="#FF8C40" />
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                  Automated Fees & M-Pesa
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 9.5 }}>
                  Instant receipts for parents
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
