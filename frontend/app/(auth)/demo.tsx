import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Animated,
  Pressable,
  Easing as EasingRN,
  useWindowDimensions,
  AccessibilityInfo,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  LayoutDashboard,
  Play,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { LivingBackground } from "@/components/landing/LivingBackground";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const FLAME = "#FF6B00";
const FLAME_GLOW = "rgba(255,107,0,0.35)";
const GLASS_BORDER = "rgba(255,255,255,0.09)";
const CAN_USE_NATIVE_DRIVER = Platform.OS !== "web";

type RoleType = "student" | "teacher" | "parent" | "admin";

interface RoleData {
  id: RoleType;
  title: string;
  subtitle: string;
  description: string;
  icon: (color: string, size?: number) => React.ReactNode;
  color: string;
  colorLight: string;
  colorGlow: string;
  features: string[];
}

const ROLES: RoleData[] = [
  {
    id: "student",
    title: "Student",
    subtitle: "Assignments, grades & library",
    description:
      "Experience the student  journey submit assignments, check grades, browse the digital library, and track your progress.",
    icon: (color: string, size = 26) => <GraduationCap size={size} color={color} />,
    color: "#FF6B00",
    colorLight: "rgba(255,107,0,0.12)",
    colorGlow: "rgba(255,107,0,0.38)",
    features: [
      "View Assignments",
      "Check Grades",
      "Access Library",
      "Submit Work",
      "Track Progress",
    ],
  },
  {
    id: "teacher",
    title: "Teacher",
    subtitle: "Class management & grading",
    description:
      "Take command of the classroom manage students, grade assignments, create lesson plans, and view real-time analytics.",
    icon: (color: string, size = 26) => <BookOpen size={size} color={color} />,
    color: "#10B981",
    colorLight: "rgba(16,185,129,0.12)",
    colorGlow: "rgba(16,185,129,0.38)",
    features: [
      "Manage Classes",
      "Grade Students",
      "Lesson Planning",
      "Analytics",
      "Attendance",
    ],
  },
  {
    id: "parent",
    title: "Parent/Guardian",
    subtitle: "Monitor progress & attendance",
    description:
      "Stay connected with your child's education track progress, view attendance reports, communicate with teachers, and manage fees.",
    icon: (color: string, size = 26) => <Users size={size} color={color} />,
    color: "#3B82F6",
    colorLight: "rgba(59,130,246,0.12)",
    colorGlow: "rgba(59,130,246,0.38)",
    features: [
      "Track Progress",
      "Attendance Reports",
      "Teacher Chat",
      "Fee Payments",
      "Notifications",
    ],
  },
  {
    id: "admin",
    title: "Admin",
    subtitle: "System control & analytics",
    description:
      "Full administrative control manage users, configure settings, generate financial reports, and monitor system-wide analytics.",
    icon: (color: string, size = 26) => <Settings size={size} color={color} />,
    color: "#8B5CF6",
    colorLight: "rgba(139,92,246,0.12)",
    colorGlow: "rgba(139,92,246,0.38)",
    features: [
      "User Management",
      "System Settings",
      "Financial Reports",
      "Audit Logs",
      "Dashboard",
    ],
  },
];

// ─── Persona Card Component ──────────────────────────────────────────────────
interface PersonaCardProps {
  role: RoleData;
  index: number;
  entranceAnim: Animated.Value;
  onSelect: (role: RoleData) => void;
  isSelected: boolean;
  reducedMotion: boolean;
}

const PersonaCard: React.FC<PersonaCardProps> = ({
  role,
  index,
  entranceAnim,
  onSelect,
  isSelected,
  reducedMotion,
}) => {
  const [hovered, setHovered] = useState(false);
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const iconGlow = useRef(new Animated.Value(0.4)).current;
  const sweepAnim = useRef(new Animated.Value(-1)).current;

  // Idle icon pulse animation (matching LogoLockup in signIn.tsx)
  useEffect(() => {
    if (reducedMotion) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.07,
          duration: 2200 + index * 200,
          easing: EasingRN.inOut(EasingRN.sin),
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 2200 + index * 200,
          easing: EasingRN.inOut(EasingRN.sin),
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(iconGlow, {
          toValue: 0.85,
          duration: 1800 + index * 180,
          easing: EasingRN.inOut(EasingRN.sin),
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        }),
        Animated.timing(iconGlow, {
          toValue: 0.35,
          duration: 1800 + index * 180,
          easing: EasingRN.inOut(EasingRN.sin),
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        }),
      ])
    );

    pulse.start();
    glow.start();
    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [reducedMotion, iconGlow, iconPulse, index]);

  // Hover shine sweep effect on web
  useEffect(() => {
    if (hovered && !reducedMotion && Platform.OS === "web") {
      sweepAnim.setValue(-1);
      Animated.timing(sweepAnim, {
        toValue: 2,
        duration: 550,
        easing: EasingRN.out(EasingRN.cubic),
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }).start();
    }
  }, [hovered, reducedMotion, sweepAnim]);

  const onHoverIn = () => {
    setHovered(true);
    if (!reducedMotion) {
      Animated.timing(hoverAnim, {
        toValue: 1,
        duration: 200,
        easing: EasingRN.out(EasingRN.quad),
        useNativeDriver: false,
      }).start();
    }
  };

  const onHoverOut = () => {
    setHovered(false);
    if (!reducedMotion) {
      Animated.timing(hoverAnim, {
        toValue: 0,
        duration: 220,
        easing: EasingRN.out(EasingRN.quad),
        useNativeDriver: false,
      }).start();
    }
  };

  const sweepTranslateX = sweepAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-240, 380],
  });

  const translateY = reducedMotion
    ? 0
    : hoverAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6],
      });

  const scale = reducedMotion
    ? 1
    : hoverAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.015],
      });

  const borderColor = isSelected
    ? role.color
    : hoverAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [GLASS_BORDER, `${role.color}90`],
      });

  const cardScaleEntrance = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [reducedMotion ? 1 : 0.93, 1],
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        minWidth: 280,
        opacity: entranceAnim,
        transform: [{ scale: cardScaleEntrance }, { translateY }, { scale }],
      }}
    >
      <GlassCard
        variant="interactive"
        hoverable
        accentColor={role.color}
        glowColor={isSelected ? role.colorGlow : undefined}
        borderRadius={24}
        onPress={() => onSelect(role)}
        onPointerEnter={onHoverIn}
        onPointerLeave={onHoverOut}
        style={{
          width: "100%",
          borderColor: isSelected ? role.color : undefined,
          borderWidth: isSelected ? 1.5 : 1,
        }}
        contentStyle={{
          padding: 24,
        }}
      >
        {/* Top Header Row: Icon + Role Title & Subtitle + Action Badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 }}>
              {/* Persona Icon with Ambient Glow */}
              <View style={{ position: "relative" }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -4,
                    left: -4,
                    right: -4,
                    bottom: -4,
                    borderRadius: 18,
                    backgroundColor: role.colorGlow,
                    opacity: iconGlow,
                    transform: [{ scale: iconPulse }],
                    ...(Platform.OS === "web" ? { filter: "blur(6px)" } : {}),
                  } as any}
                />
                <Animated.View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: role.colorLight,
                    borderWidth: 1.5,
                    borderColor: `${role.color}50`,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: iconPulse }],
                    ...(Platform.OS === "web"
                      ? {
                          boxShadow: `0 0 14px ${role.color}35, inset 0 1px 0 rgba(255,255,255,0.18)`,
                        }
                      : {}),
                  } as any}
                >
                  {role.icon(role.color, 24)}
                </Animated.View>
              </View>

              {/* Title & Subtitle */}
              <View style={{ marginLeft: 16, flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "900",
                      fontSize: 20,
                      letterSpacing: 0.3,
                    }}
                  >
                    {role.title}
                  </Text>
                  {isSelected && (
                    <View
                      style={{
                        backgroundColor: `${role.color}25`,
                        borderRadius: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: `${role.color}70`,
                      }}
                    >
                      <Text
                        style={{
                          color: role.color,
                          fontSize: 9,
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Active
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.48)",
                    fontSize: 13,
                    fontWeight: "500",
                    marginTop: 3,
                  }}
                  numberOfLines={1}
                >
                  {role.subtitle}
                </Text>
              </View>
            </View>

            {/* Play / Enter Trigger Button */}
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: isSelected ? role.color : `${role.color}16`,
                borderWidth: 1,
                borderColor: isSelected ? role.color : `${role.color}35`,
                justifyContent: "center",
                alignItems: "center",
                ...(Platform.OS === "web"
                  ? {
                      boxShadow: isSelected
                        ? `0 0 14px ${role.colorGlow}`
                        : hovered
                        ? `0 0 10px ${role.color}30`
                        : "none",
                      transition: "all 0.2s ease",
                    }
                  : {}),
              } as any}
            >
              <Play
                size={16}
                color={isSelected ? "#FFFFFF" : role.color}
                fill={isSelected ? "#FFFFFF" : role.color}
              />
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              color: "rgba(255,255,255,0.62)",
              fontSize: 13.5,
              lineHeight: 20,
              marginBottom: 18,
            }}
          >
            {role.description}
          </Text>

          {/* Feature Pills */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
            {role.features.slice(0, 4).map((feat, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  paddingHorizontal: 11,
                  paddingVertical: 5.5,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.07)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  ...(Platform.OS === "web"
                    ? {
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }
                    : {}),
                } as any}
              >
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: `${role.color}90`,
                  }}
                />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 11.5,
                    fontWeight: "600",
                    letterSpacing: 0.2,
                  }}
                >
                  {feat}
                </Text>
              </View>
            ))}
          </View>

          {/* Bottom Action Footer */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.05)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={13} color={`${role.color}AA`} />
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 11.5,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                }}
              >
                Interactive Demo
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text
                style={{
                  color: role.color,
                  fontSize: 12.5,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                Explore
              </Text>
              <ArrowRight size={14} color={role.color} />
            </View>
          </View>
      </GlassCard>
    </Animated.View>
  );
};

// ─── Launch Demo Primary Button (Inside Detail Modal) ─────────────────────────
interface LaunchButtonProps {
  onPress: () => void;
  loading: boolean;
  color: string;
  reducedMotion: boolean;
}

const LaunchDemoButton: React.FC<LaunchButtonProps> = ({
  onPress,
  loading,
  color,
  reducedMotion,
}) => {
  const [hovered, setHovered] = useState(false);
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sweepAnim = useRef(new Animated.Value(-1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1600,
          easing: EasingRN.inOut(EasingRN.sin),
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: EasingRN.inOut(EasingRN.sin),
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [reducedMotion, pulseAnim]);

  useEffect(() => {
    if (hovered && !reducedMotion && Platform.OS === "web") {
      sweepAnim.setValue(-1);
      Animated.timing(sweepAnim, {
        toValue: 2,
        duration: 600,
        easing: EasingRN.out(EasingRN.cubic),
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }).start();
    }
  }, [hovered, reducedMotion, sweepAnim]);

  const onHoverIn = () => {
    setHovered(true);
    if (!reducedMotion) {
      Animated.timing(hoverAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
  };

  const onHoverOut = () => {
    setHovered(false);
    if (!reducedMotion) {
      Animated.timing(hoverAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const onPressIn = () => {
    if (!reducedMotion) {
      Animated.timing(pressScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }).start();
    }
  };

  const onPressOut = () => {
    if (!reducedMotion) {
      Animated.spring(pressScale, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }).start();
    }
  };

  const sweepTranslateX = sweepAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-260, 360],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: pressScale }],
        borderRadius: 20,
        overflow: "hidden",
        width: "100%",
        position: "relative",
      }}
    >
      {/* Outer ambient glow — pulses softly */}
      {!reducedMotion && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -6,
            left: -6,
            right: -6,
            bottom: -6,
            borderRadius: 26,
            backgroundColor: `${color}30`,
            transform: [{ scale: pulseAnim }],
            ...(Platform.OS === "web" ? { filter: "blur(8px)" } : {}),
          } as any}
        />
      )}

      <Pressable
        onPress={loading ? undefined : onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        style={[
          {
            height: 58,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
            ...(Platform.OS === "web"
              ? {
                  background: loading
                    ? `${color}60`
                    : `linear-gradient(135deg, ${color}DD 0%, ${color} 50%, #0A061C 120%)`,
                  boxShadow:
                    hovered && !loading
                      ? `0 0 0 1px ${color}80, 0 14px 36px ${color}55, 0 2px 8px ${color}40`
                      : `0 10px 28px ${color}40, 0 2px 6px ${color}25`,
                  transition: "box-shadow 0.2s ease",
                  cursor: loading ? "default" : "pointer",
                }
              : {
                  backgroundColor: loading ? `${color}70` : color,
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 10,
                    blurRadius: 24,
                    color: `${color}50`,
                  }],
                }),
          } as any,
        ]}
      >
        {/* Top sheen highlight */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            backgroundColor: "rgba(255,255,255,0.14)",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        />

        {/* Hover sweep shine */}
        {Platform.OS === "web" && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 80,
              backgroundColor: "rgba(255,255,255,0.22)",
              transform: [{ translateX: sweepTranslateX }, { skewX: "-18deg" } as any],
            }}
          />
        )}

        {/* Button Content */}
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
              Preparing Environment...
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                fontSize: 16.5,
                letterSpacing: 0.4,
              }}
            >
              Launch Demo
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ─── Main Demo Component ─────────────────────────────────────────────────────
export default function Demo() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoleData, setSelectedRoleData] = useState<RoleData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { startDemo } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  // Responsive Breakpoints
  const isDesktop = screenWidth >= 960;
  const isTablet = screenWidth >= 640 && screenWidth < 960;

  // Reduced Motion Check
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        setReducedMotion(enabled);
      });
    }
  }, []);

  // Entrance Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(reducedMotion ? 0 : 35)).current;
  const cardAnims = useRef(ROLES.map(() => new Animated.Value(0))).current;

  // Modal Animations
  const modalScale = useRef(new Animated.Value(0.92)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      headerFade.setValue(1);
      headerSlide.setValue(0);
      cardAnims.forEach((anim) => anim.setValue(1));
      return;
    }

    // Header entrance
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 650,
        easing: EasingRN.out(EasingRN.cubic),
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 8,
        tension: 55,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
    ]).start();

    // Staggered cards entrance
    Animated.stagger(
      110,
      cardAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 8,
          tension: 48,
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        })
      )
    ).start();
  }, [reducedMotion, cardAnims, headerFade, headerSlide]);

  const openDemoModal = (role: RoleData) => {
    setSelectedRoleData(role);
    setModalVisible(true);

    if (reducedMotion) {
      modalScale.setValue(1);
      modalOpacity.setValue(1);
      return;
    }

    modalScale.setValue(0.92);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
    ]).start();
  };

  const closeModal = () => {
    if (reducedMotion) {
      setModalVisible(false);
      return;
    }
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.94,
        duration: 180,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
    ]).start(() => setModalVisible(false));
  };

  const handleDemoLogin = async () => {
    if (!selectedRoleData) return;

    setIsLoading(true);
    setModalVisible(false);

    try {
      const { error } = await startDemo(selectedRoleData.id);

      if (error) {
        Alert.alert(
          "Demo Access Failed",
          "Could not start the demo session. Please try again."
        );
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      console.error(error?.message || error);
      Alert.alert("Error", "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ── SHARED LIVING BACKGROUND (IDENTICAL TO LANDING & SIGN-IN) ── */}
      <LivingBackground />

      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <StatusBar style="light" />

        {/* ── FULL-SCREEN NEURAL PORTAL LOADING OVERLAY ── */}
        {isLoading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 300,
              backgroundColor: "rgba(7,5,20,0.88)",
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
              ...(Platform.OS === "web"
                ? {
                    backdropFilter: "blur(40px) saturate(190%)",
                    WebkitBackdropFilter: "blur(40px) saturate(190%)",
                  }
                : {}),
            } as any}
          >
            <GlassCard
              variant="modal"
              borderRadius={28}
              accentColor={selectedRoleData?.color || FLAME}
              glowColor={selectedRoleData?.colorGlow || FLAME_GLOW}
              style={{
                width: "100%",
                maxWidth: 420,
              }}
              contentStyle={{
                padding: 40,
                alignItems: "center",
              }}
            >
              {/* Spinner with Role Accent */}
              <View style={{ marginBottom: 24, position: "relative" }}>
                <ActivityIndicator
                  size="large"
                  color={selectedRoleData?.color || FLAME}
                />
              </View>

              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "800",
                  fontSize: 19,
                  textAlign: "center",
                  letterSpacing: 0.3,
                }}
              >
                Preparing Environment...
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.52)",
                  fontSize: 13.5,
                  marginTop: 6,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Setting up your demo dashboard
              </Text>
            </GlassCard>
          </View>
        )}

        {/* ── MAIN SCROLL CONTAINER ── */}
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 80,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 1140,
              alignSelf: "center",
              paddingHorizontal: isDesktop ? 36 : isTablet ? 28 : 20,
              paddingTop: 12,
            }}
          >
            {/* ── TOP NAV & CONSOLE HEADER ── */}
            <Animated.View
              style={{
                opacity: headerFade,
                transform: [{ translateY: headerSlide }],
                marginBottom: 32,
              }}
            >
              {/* Telemetry Strip & Navigation Bar */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 28,
                  paddingVertical: 10,
                }}
              >
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.push("/");
                    }
                  }}
                  activeOpacity={0.75}
                  style={[
                    {
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.11)",
                      justifyContent: "center",
                      alignItems: "center",
                      ...(Platform.OS === "web"
                        ? {
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            boxShadow:
                              "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
                            cursor: "pointer",
                          }
                        : {}),
                    } as any,
                  ]}
                >
                  <ArrowLeft size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>

                {/* Playground Status Pill */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,107,0,0.12)",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: "rgba(255,107,0,0.3)",
                    ...(Platform.OS === "web"
                      ? {
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          boxShadow: "0 0 16px rgba(255,107,0,0.2)",
                        }
                      : {}),
                  } as any}
                >
                  <Sparkles size={13} color="#FF8C40" />
                  <Text
                    style={{
                      color: "#FF8C40",
                      fontWeight: "800",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.8,
                      marginLeft: 6,
                    }}
                  >
                    Playground
                  </Text>
                </View>
              </View>

              {/* Main Headline & Subtitle */}
              <View style={{ alignItems: "center", paddingHorizontal: 16 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "900",
                    fontSize: isDesktop ? 36 : isTablet ? 30 : 26,
                    textAlign: "center",
                    letterSpacing: -0.5,
                    marginBottom: 10,
                  }}
                >
                  Select Persona
                </Text>

                <Text
                  style={{
                    color: "rgba(255,255,255,0.52)",
                    fontSize: isDesktop ? 16 : 14.5,
                    textAlign: "center",
                    lineHeight: isDesktop ? 24 : 22,
                    maxWidth: 620,
                  }}
                >
                  Choose a role to explore the platform. Each module showcases
                  real features in a safe demo environment.
                </Text>
              </View>
            </Animated.View>

            {/* ── PERSONA MODULE SELECTION GRID ── */}
            <View
              style={{
                flexDirection: isDesktop || isTablet ? "row" : "column",
                flexWrap: isDesktop || isTablet ? "wrap" : "nowrap",
                gap: isDesktop ? 22 : 16,
                marginBottom: 36,
              }}
            >
              {ROLES.map((role, index) => {
                // eslint-disable-next-line security/detect-object-injection
                const entranceAnim = cardAnims[index];
                return (
                  <View
                    key={role.id}
                    style={{
                      width: isDesktop
                        ? "48.8%"
                        : isTablet
                        ? "48.5%"
                        : "100%",
                    }}
                  >
                    <PersonaCard
                      role={role}
                      index={index}
                      entranceAnim={entranceAnim}
                      onSelect={openDemoModal}
                      isSelected={selectedRoleData?.id === role.id && modalVisible}
                      reducedMotion={reducedMotion}
                    />
                  </View>
                );
              })}
            </View>

            {/* ── TELEMETRY INFO FOOTER ── */}
            <GlassCard
              variant="subtle"
              borderRadius={22}
              style={{
                width: "100%",
              }}
              contentStyle={{
                alignItems: "center",
                paddingVertical: 22,
                paddingHorizontal: 26,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <LayoutDashboard size={16} color="rgba(255,255,255,0.6)" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontWeight: "800",
                    fontSize: 12.5,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                  }}
                >
                  What to expect
                </Text>
              </View>

              <Text
                style={{
                  color: "rgba(255,255,255,0.42)",
                  fontSize: 12.5,
                  textAlign: "center",
                  lineHeight: 20,
                  fontWeight: "500",
                }}
              >
                15-minute interactive session{" \u2022 "}Pre-populated data{"\n"}
                Real features, no signup required{" \u2022 "}Data resets periodically
              </Text>
            </GlassCard>
          </View>
        </ScrollView>

        {/* ── ROLE DETAIL MODAL (LIQUID GLASS SHEET) ── */}
        <Modal
          visible={modalVisible}
          animationType="none"
          transparent={true}
          statusBarTranslucent
          onRequestClose={closeModal}
        >
          <View
            style={{
              flex: 1,
              justifyContent: isDesktop ? "center" : "flex-end",
              alignItems: isDesktop ? "center" : "stretch",
              backgroundColor: "transparent",
            }}
          >
            {/* Modal Backdrop with Blur */}
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(4,2,14,0.75)",
                opacity: modalOpacity,
                ...(Platform.OS === "web"
                  ? {
                      backdropFilter: "blur(18px)",
                      WebkitBackdropFilter: "blur(18px)",
                    }
                  : {}),
              } as any}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={closeModal}
                activeOpacity={1}
              />
            </Animated.View>

            {/* Modal Liquid-Glass Content */}
            <Animated.View
              style={{
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
                width: isDesktop ? 520 : "100%",
                maxWidth: 540,
                maxHeight: isDesktop ? "86%" : "82%",
                alignSelf: "center",
              }}
            >
              <GlassCard
                variant="modal"
                borderRadius={isDesktop ? 28 : 26}
                accentColor={selectedRoleData?.color || FLAME}
                glowColor={selectedRoleData?.colorGlow || FLAME_GLOW}
                style={{
                  width: "100%",
                  maxHeight: "100%",
                  borderBottomLeftRadius: isDesktop ? 28 : 0,
                  borderBottomRightRadius: isDesktop ? 28 : 0,
                }}
                contentStyle={{
                  maxHeight: "100%",
                }}
              >

              {/* Modal Header */}
              {selectedRoleData && (
                <View
                  style={{
                    paddingVertical: 18,
                    paddingHorizontal: 26,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: selectedRoleData.colorLight,
                        borderWidth: 1,
                        borderColor: `${selectedRoleData.color}45`,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      {selectedRoleData.icon(selectedRoleData.color, 20)}
                    </View>
                    <Text
                      style={{
                        color: selectedRoleData.color,
                        fontWeight: "800",
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: 1.6,
                      }}
                    >
                      {selectedRoleData.id} Experience
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={closeModal}
                    activeOpacity={0.75}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <X size={17} color="rgba(255,255,255,0.65)" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Modal Scroll Content */}
              <ScrollView
                style={{ paddingHorizontal: 26, paddingTop: 22 }}
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Title & Description */}
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 28,
                    fontWeight: "900",
                    marginBottom: 10,
                    letterSpacing: -0.3,
                  }}
                >
                  Explore as {selectedRoleData?.title}
                </Text>

                <Text
                  style={{
                    color: "rgba(255,255,255,0.58)",
                    fontSize: 14.5,
                    lineHeight: 22,
                    marginBottom: 24,
                  }}
                >
                  {selectedRoleData?.description}
                </Text>

                {/* Feature Checklist */}
                <View style={{ gap: 10, marginBottom: 28 }}>
                  {selectedRoleData?.features.map((feature, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderRadius: 14,
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.07)",
                        ...(Platform.OS === "web"
                          ? {
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                            }
                          : {}),
                      } as any}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          backgroundColor: `${selectedRoleData.color}20`,
                          borderWidth: 1,
                          borderColor: `${selectedRoleData.color}40`,
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 14,
                        }}
                      >
                        <Check
                          size={14}
                          color={selectedRoleData.color}
                          strokeWidth={3}
                        />
                      </View>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.85)",
                          fontSize: 14.5,
                          fontWeight: "600",
                        }}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* CTA Launch Demo Button */}
                {selectedRoleData && (
                  <LaunchDemoButton
                    onPress={handleDemoLogin}
                    loading={isLoading}
                    color={selectedRoleData.color}
                    reducedMotion={reducedMotion}
                  />
                )}

                {/* Public Demo Disclaimer */}
                <Text
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 11.5,
                    textAlign: "center",
                    marginTop: 18,
                    lineHeight: 18,
                  }}
                >
                  By starting, you agree to enter a public demo environment.{"\n"}
                  Data is reset periodically.
                </Text>
              </ScrollView>
              </GlassCard>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}
