import React, { useEffect, useRef, useState } from "react";
import {
  Text, View, TouchableOpacity, ActivityIndicator, Alert,
  Dimensions, Modal, ScrollView, Platform, Animated, Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft, BookOpen, Check, GraduationCap, LayoutDashboard,
  Play, Settings, Sparkles, Users, X
} from "lucide-react-native";

const { height, width } = Dimensions.get('window');

type RoleType = 'student' | 'teacher' | 'parent' | 'admin';

interface RoleData {
  id: RoleType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  colorLight: string;
  features: string[];
}

const ROLES: RoleData[] = [
  {
    id: 'student',
    title: "Student",
    subtitle: "Assignments, grades & library",
    description: "Experience the student journey — submit assignments, check grades, browse the digital library, and track your progress.",
    icon: <GraduationCap size={26} color="#FF8C40" />,
    color: "#FF6B00",
    colorLight: "rgba(255,107,0,0.12)",
    features: ["View Assignments", "Check Grades", "Access Library", "Submit Work", "Track Progress"]
  },
  {
    id: 'teacher',
    title: "Teacher",
    subtitle: "Class management & grading",
    description: "Take command of the classroom — manage students, grade assignments, create lesson plans, and view real-time analytics.",
    icon: <BookOpen size={26} color="#34D399" />,
    color: "#10B981",
    colorLight: "rgba(16,185,129,0.12)",
    features: ["Manage Classes", "Grade Students", "Lesson Planning", "Analytics", "Attendance"]
  },
  {
    id: 'parent',
    title: "Parent",
    subtitle: "Monitor progress & attendance",
    description: "Stay connected with your child's education — track progress, view attendance reports, communicate with teachers, and manage fees.",
    icon: <Users size={26} color="#60A5FA" />,
    color: "#3B82F6",
    colorLight: "rgba(59,130,246,0.12)",
    features: ["Track Progress", "Attendance Reports", "Teacher Chat", "Fee Payments", "Notifications"]
  },
  {
    id: 'admin',
    title: "Admin",
    subtitle: "System control & analytics",
    description: "Full administrative control — manage users, configure settings, generate financial reports, and monitor system-wide analytics.",
    icon: <Settings size={26} color="#A78BFA" />,
    color: "#8B5CF6",
    colorLight: "rgba(139,92,246,0.12)",
    features: ["User Management", "System Settings", "Financial Reports", "Audit Logs", "Dashboard"]
  }
];

export default function Trial() {
  const [isLoading, setIsLoading] = useState(false);
  const { startTrial } = useAuth();

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const cardAnims = useRef(ROLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Header fade in
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    // Staggered card animations
    Animated.stagger(120,
      cardAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
      )
    ).start();
  }, []);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoleData, setSelectedRoleData] = useState<RoleData | null>(null);
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const openTrialModal = (role: RoleData) => {
    setSelectedRoleData(role);
    setModalVisible(true);
    modalScale.setValue(0.9);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setModalVisible(false));
  };

  const handleTrialLogin = async () => {
    if (!selectedRoleData) return;

    setIsLoading(true);
    setModalVisible(false);

    try {
      const { error } = await startTrial(selectedRoleData.id);

      if (error) {
        Alert.alert("Demo Access Failed", "Could not start the demo session. Please try again.");
        setIsLoading(false);
        return;
      }

      const routes: Record<RoleType, string> = {
        admin: '/(admin)',
        teacher: '/(teacher)',
        student: '/(student)',
        parent: '/(parent)'
      };

      router.replace(routes[selectedRoleData.id] as any);

    } catch (error: any) {
      console.error(error.message);
      Alert.alert("Error", "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F0B2E" }}>
      <StatusBar style="light" />

      {/* Full-screen loading overlay */}
      {isLoading && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 200, backgroundColor: "rgba(15,11,46,0.85)",
          justifyContent: "center", alignItems: "center",
        }}>
          <View style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
            borderRadius: 24, padding: 32, alignItems: "center",
          }}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={{
              color: "white", fontWeight: "700", marginTop: 16, fontSize: 15,
            }}>
              Preparing Environment...
            </Text>
            <Text style={{
              color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4,
            }}>
              Setting up your demo dashboard
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }}>
          {/* ═══════════════════ HEADER ═══════════════════ */}
          <Animated.View style={{
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          }}>
            <View style={{
              flexDirection: "row", alignItems: "center",
              justifyContent: "space-between", marginBottom: 32, marginTop: 8,
            }}>
              <TouchableOpacity
                onPress={() => router.push('/')}
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                  justifyContent: "center", alignItems: "center",
                }}
              >
                <ArrowLeft size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>

              <View style={{ alignItems: "flex-end" }}>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: "rgba(255,107,0,0.12)",
                  borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
                  marginBottom: 4,
                }}>
                  <Sparkles size={12} color="#FF8C40" />
                  <Text style={{
                    color: "#FF8C40", fontWeight: "800", fontSize: 10,
                    textTransform: "uppercase", letterSpacing: 1.5, marginLeft: 4,
                  }}>
                    Playground
                  </Text>
                </View>
                <Text style={{
                  color: "white", fontWeight: "900", fontSize: 22,
                }}>
                  Select Persona
                </Text>
              </View>
            </View>

            {/* Subtitle */}
            <Text style={{
              color: "rgba(255,255,255,0.45)", fontSize: 14,
              textAlign: "center", marginBottom: 28, lineHeight: 20,
            }}>
              Choose a role to explore the platform. Each module showcases
              real features in a safe demo environment.
            </Text>
          </Animated.View>

          {/* ═══════════════════ ROLE CARDS ═══════════════════ */}
          <View style={{ gap: 16 }}>
            {ROLES.map((role, index) => {
              const cardScale = cardAnims[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              });
              return (
                <Animated.View
                  key={role.id}
                  style={{
                    opacity: cardAnims[index],
                    transform: [{ scale: cardScale }],
                  }}
                >
                  <Pressable
                    onPress={() => openTrialModal(role)}
                    style={({ pressed }) => ({
                      borderRadius: 22,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: pressed ? role.color : "rgba(255,255,255,0.08)",
                      backgroundColor: pressed ? `${role.color}08` : "rgba(255,255,255,0.03)",
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <View style={{ padding: 22 }}>
                      {/* Card top row */}
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                        <View style={{
                          width: 52, height: 52, borderRadius: 16,
                          backgroundColor: role.colorLight,
                          borderWidth: 1, borderColor: `${role.color}30`,
                          justifyContent: "center", alignItems: "center",
                        }}>
                          {role.icon}
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                          <Text style={{
                            color: "white", fontWeight: "800", fontSize: 19,
                          }}>
                            {role.title}
                          </Text>
                          <Text style={{
                            color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 2,
                          }}>
                            {role.subtitle}
                          </Text>
                        </View>
                        <View style={{
                          width: 36, height: 36, borderRadius: 12,
                          backgroundColor: `${role.color}18`,
                          justifyContent: "center", alignItems: "center",
                        }}>
                          <Play size={16} color={role.color} fill={role.color} />
                        </View>
                      </View>

                      {/* Feature pills */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {role.features.slice(0, 4).map((feat, i) => (
                          <View key={i} style={{
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderRadius: 8,
                            paddingHorizontal: 10, paddingVertical: 5,
                            borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
                          }}>
                            <Text style={{
                              color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "600",
                            }}>
                              {feat}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* ═══════════════════ INFO FOOTER ═══════════════════ */}
          <View style={{
            marginTop: 32, alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 16, padding: 20,
            borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <LayoutDashboard size={16} color="rgba(255,255,255,0.4)" />
              <Text style={{
                color: "rgba(255,255,255,0.5)", fontWeight: "700",
                fontSize: 12, textTransform: "uppercase",
                letterSpacing: 1, marginLeft: 6,
              }}>
                What to expect
              </Text>
            </View>
            <Text style={{
              color: "rgba(255,255,255,0.35)", fontSize: 12,
              textAlign: "center", lineHeight: 18,
            }}>
              15-minute interactive session • Pre-populated data{"\n"}
              Real features, no signup required • Data resets periodically
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ═══════════════════ ROLE DETAIL MODAL ═══════════════════ */}
      <Modal visible={modalVisible} animationType="none" transparent={true} statusBarTranslucent>
        <View style={{
          flex: 1, justifyContent: "flex-end",
          backgroundColor: "transparent",
        }}>
          {/* Backdrop */}
          <Animated.View style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            opacity: modalOpacity,
          }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={closeModal}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Modal Content */}
          <Animated.View style={{
            opacity: modalOpacity,
            transform: [{ scale: modalScale }],
            backgroundColor: "#1A1640",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            borderBottomWidth: 0,
            maxHeight: height * 0.82,
            overflow: "hidden",
            ...(Platform.OS === "web" ? {
              alignSelf: "center" as const,
              width: Math.min(width * 0.92, 480),
              borderRadius: 28,
              marginBottom: 20,
            } : {}),
          }}>
            {/* Modal Header */}
            {selectedRoleData && (
              <View style={{
                paddingVertical: 16, paddingHorizontal: 24,
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: selectedRoleData.colorLight,
                    justifyContent: "center", alignItems: "center",
                    marginRight: 12,
                  }}>
                    {React.cloneElement(selectedRoleData.icon as React.ReactElement, { size: 18 } as any)}
                  </View>
                  <Text style={{
                    color: selectedRoleData.color, fontWeight: "800",
                    fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5,
                  }}>
                    {selectedRoleData.id} Experience
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  <X size={16} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView style={{ paddingHorizontal: 24, paddingTop: 20 }} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Title & Description */}
              <Text style={{
                color: "white", fontSize: 28, fontWeight: "900",
                marginBottom: 8,
              }}>
                Explore as {selectedRoleData?.title}
              </Text>
              <Text style={{
                color: "rgba(255,255,255,0.5)", fontSize: 14,
                lineHeight: 21, marginBottom: 24,
              }}>
                {selectedRoleData?.description}
              </Text>

              {/* Feature list */}
              <View style={{ gap: 10, marginBottom: 28 }}>
                {selectedRoleData?.features.map((feature, index) => (
                  <View key={index} style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
                  }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 7,
                      backgroundColor: `${selectedRoleData.color}18`,
                      justifyContent: "center", alignItems: "center",
                      marginRight: 12,
                    }}>
                      <Check size={13} color={selectedRoleData.color} strokeWidth={3} />
                    </View>
                    <Text style={{
                      color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600",
                    }}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={handleTrialLogin}
                activeOpacity={0.85}
                style={{
                  backgroundColor: selectedRoleData?.color || "#FF6B00",
                  paddingVertical: 18, borderRadius: 16,
                  alignItems: "center", flexDirection: "row",
                  justifyContent: "center",
                  shadowColor: selectedRoleData?.color || "#FF6B00",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35, shadowRadius: 20,
                  elevation: 8,
                }}
              >
                <Play size={18} color="white" fill="white" />
                <Text style={{
                  color: "white", fontWeight: "800", fontSize: 16, marginLeft: 8,
                }}>
                  Launch Demo
                </Text>
              </TouchableOpacity>

              <Text style={{
                color: "rgba(255,255,255,0.25)", fontSize: 11,
                textAlign: "center", marginTop: 16, lineHeight: 16,
              }}>
                By starting, you agree to enter a public demo environment.{"\n"}
                Data is reset periodically.
              </Text>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}