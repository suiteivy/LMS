import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, getAuthErrorMessage } from "@/utils/validation";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import {
  ArrowLeft, Eye, EyeOff, Lock, Mail, School, Sparkles, Zap
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Cast icons to any to avoid nativewind interop issues
const IconFontAwesome = FontAwesome as any;
const IconIonicons = Ionicons as any;

interface FormData {
  email: string;
  password: string;
}

export default function Index() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signIn } = useAuth();

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(20)).current;
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Header animation
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Form staggered reveal
    Animated.parallel([
      Animated.timing(formFade, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
      Animated.timing(formSlide, { toValue: 0, duration: 600, delay: 300, useNativeDriver: true }),
    ]).start();

    // Floating orbs
    const animOrb = (val: Animated.Value, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(val, { toValue: 1, duration: dur, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration: dur, useNativeDriver: true }),
      ]));
    const o1 = animOrb(orb1, 4500);
    const o2 = animOrb(orb2, 3800);
    o1.start(); o2.start();

    return () => { o1.stop(); o2.stop(); };
  }, []);

  // Button pulse when not loading
  useEffect(() => {
    if (!isLoading) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]));
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoading]);

  const orb1Y = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
  const orb1X = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });
  const orb2Y = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const orb2X = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  const showMessage = (msg: string, success: boolean) => {
    setMessage(msg);
    setIsSuccess(success);
    setIsModalVisible(true);
    setTimeout(() => {
      setIsModalVisible(false);
    }, 2000);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    console.log("Form submitted");

    if (!validateForm()) {
      console.log("Form validation failed");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log("Attempting sign in with:", formData.email);
      const { error, data } = await signIn(formData.email, formData.password);

      if (error) {
        console.log("Sign in error:", error);
        setErrorMessage(getAuthErrorMessage(error));
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        console.log("No user data returned");
        setErrorMessage("No user data returned");
        setIsLoading(false);
        return;
      }

      console.log("User signed in with UUID:", data.user.id);

      interface UserRow {
        role: string;
        full_name: string;
        id: string;
        institution_id: string;
      }
      const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role, full_name, id, institution_id")
        .eq("id", data.user.id)
        .single() as { data: UserRow | null; error: any };

      if (roleError || !userData) {
        console.error(
          "Role fetch error:",
          roleError?.message || "No user data",
        );
        setErrorMessage("Could not fetch user role");
        setIsLoading(false);
        return;
      }

      // Fetch custom ID
      let customId = "";
      if (userData.role === "admin") {
        const { data: adm } = (await supabase
          .from("admins")
          .select("id")
          .eq("user_id", userData.id)
          .single()) as { data: { id: string } | null };
        customId = adm?.id || "";
      } else if (userData.role === "teacher") {
        const { data: tea } = (await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", userData.id)
          .single()) as { data: { id: string } | null };
        customId = tea?.id || "";
      } else if (userData.role === "student") {
        const { data: stu } = (await supabase
          .from("students")
          .select("id")
          .eq("user_id", userData.id)
          .single()) as { data: { id: string } | null };
        customId = stu?.id || "";
      }

      if (!userData?.role) {
        console.log("No role found for user");
        setErrorMessage("No role assigned to user.");
        setIsLoading(false);
        return;
      }

      const name = userData.full_name || "there";
      showMessage(`👋 Welcome back, ${name}!`, true);

      // timeout to Delay navigation to let modal show
      setTimeout(() => {
        switch (userData.role) {
          case "admin":
            router.replace("/(admin)");
            break;
          case "teacher":
            router.replace("/(teacher)");
            break;
          case "student":
            router.replace("/(student)");
            break;
          case "parent":
            router.replace("/(parent)" as any);
            break;
          default:
            setErrorMessage("Unrecognized user role: " + userData.role);
            break;
        }
      }, 2000);
    } catch (error: unknown) {
      console.error("Unexpected error:", error);
      setErrorMessage(
        "An unexpected error occurred: " +
        (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#0F0B2E" }}>
        {/* Decorative background elements */}
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          overflow: "hidden",
        }}>
          {/* Gradient blobs */}
          <View style={{
            position: "absolute", top: "-5%", right: "-15%",
            width: 300, height: 300, borderRadius: 150,
            backgroundColor: "rgba(255,107,0,0.06)",
          }} />
          <View style={{
            position: "absolute", bottom: "10%", left: "-20%",
            width: 350, height: 350, borderRadius: 175,
            backgroundColor: "rgba(139,92,246,0.06)",
          }} />

          {/* Floating orbs */}
          <Animated.View style={{
            position: "absolute", top: "12%", left: "8%",
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: "rgba(255,107,0,0.1)",
            transform: [{ translateY: orb1Y }, { translateX: orb1X }],
          }} />
          <Animated.View style={{
            position: "absolute", bottom: "20%", right: "10%",
            width: 45, height: 45, borderRadius: 23,
            backgroundColor: "rgba(139,92,246,0.12)",
            transform: [{ translateY: orb2Y }, { translateX: orb2X }],
          }} />
        </View>

        <SafeAreaView style={{
          flex: 1, width: "100%", maxWidth: 480,
          alignSelf: "center",
        }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <View style={{ padding: 28 }}>

              {/* ═══════════ HEADER ═══════════ */}
              <Animated.View style={{
                opacity: fadeIn,
                transform: [{ translateY: slideUp }],
              }}>
                {/* Back button + badge row */}
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 40,
                }}>
                  <TouchableOpacity
                    onPress={() => router.replace("/")}
                    style={{
                      width: 44, height: 44, borderRadius: 14,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                      justifyContent: "center", alignItems: "center",
                    }}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>

                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "rgba(255,107,0,0.1)",
                    paddingHorizontal: 12, paddingVertical: 5,
                    borderRadius: 12,
                    borderWidth: 1, borderColor: "rgba(255,107,0,0.2)",
                  }}>
                    <Lock size={12} color="#FF8C40" />
                    <Text style={{
                      color: "#FF8C40", fontWeight: "800", fontSize: 10,
                      textTransform: "uppercase", letterSpacing: 1.5, marginLeft: 5,
                    }}>
                      Secure Login
                    </Text>
                  </View>
                </View>

                {/* Logo */}
                <View style={{ alignItems: "center", marginBottom: 28 }}>
                  <View style={{
                    width: 72, height: 72, borderRadius: 20,
                    backgroundColor: "rgba(255,107,0,0.12)",
                    borderWidth: 1, borderColor: "rgba(255,107,0,0.25)",
                    justifyContent: "center", alignItems: "center",
                    marginBottom: 24,
                  }}>
                    <View style={{
                      width: 50, height: 50, borderRadius: 14,
                      backgroundColor: "#FF6B00",
                      justifyContent: "center", alignItems: "center",
                    }}>
                      <School size={28} color="white" />
                    </View>
                  </View>

                  {/* Headline */}
                  <Text style={{
                    color: "white", fontSize: 32, fontWeight: "900",
                    textAlign: "center", letterSpacing: -0.5,
                  }}>
                    Welcome Back
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{
                      color: "rgba(255,255,255,0.4)", fontSize: 32,
                      fontWeight: "300", letterSpacing: -0.5,
                    }}>
                      to your account
                    </Text>
                    <Text style={{
                      color: "#FF6B00", fontSize: 32, fontWeight: "900",
                    }}>.</Text>
                  </View>
                  <Text style={{
                    color: "rgba(255,255,255,0.4)", fontSize: 14,
                    marginTop: 12, textAlign: "center",
                    lineHeight: 20, paddingHorizontal: 16, fontWeight: "500",
                  }}>
                    Enter your credentials to securely access your dashboard.
                  </Text>
                </View>
              </Animated.View>

              {/* ═══════════ FORM ═══════════ */}
              <Animated.View style={{
                opacity: formFade,
                transform: [{ translateY: formSlide }],
              }}>
                {/* Error message */}
                {errorMessage && (
                  <View style={{
                    backgroundColor: "rgba(239,68,68,0.1)",
                    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
                    borderRadius: 16, padding: 14,
                    marginBottom: 20, flexDirection: "row", alignItems: "center",
                  }}>
                    <View style={{
                      width: 28, height: 28, borderRadius: 8,
                      backgroundColor: "rgba(239,68,68,0.15)",
                      justifyContent: "center", alignItems: "center",
                      marginRight: 10,
                    }}>
                      <IconIonicons name="alert-circle" size={16} color="#EF4444" />
                    </View>
                    <Text style={{
                      color: "#FCA5A5", fontWeight: "600", flex: 1, fontSize: 13,
                    }}>
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {/* Email field */}
                <View style={{ marginBottom: 18 }}>
                  <Text style={{
                    color: "rgba(255,255,255,0.4)", fontWeight: "800",
                    fontSize: 11, textTransform: "uppercase",
                    letterSpacing: 1.5, marginBottom: 8, marginLeft: 4,
                  }}>
                    Email Address
                  </Text>
                  <View style={{
                    height: 56,
                    backgroundColor: emailFocused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                    borderWidth: 1.5,
                    borderColor: errors.email
                      ? "rgba(239,68,68,0.5)"
                      : emailFocused
                        ? "rgba(255,107,0,0.4)"
                        : "rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                  }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: emailFocused ? "rgba(255,107,0,0.12)" : "rgba(255,255,255,0.04)",
                      justifyContent: "center", alignItems: "center",
                      marginRight: 12,
                    }}>
                      <Mail size={17} color={emailFocused ? "#FF8C40" : "rgba(255,255,255,0.3)"} />
                    </View>
                    <TextInput
                      keyboardType="email-address"
                      style={{
                        flex: 1, color: "white", fontWeight: "600",
                        fontSize: 15, height: "100%",
                      }}
                      placeholder="name@example.com"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={formData.email}
                      onChangeText={(value) => handleInputChange("email", value)}
                      autoCapitalize="none"
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </View>
                  {errors.email && (
                    <Text style={{
                      color: "#FCA5A5", fontSize: 12,
                      marginTop: 4, marginLeft: 4, fontWeight: "600",
                    }}>
                      {errors.email}
                    </Text>
                  )}
                </View>

                {/* Password field */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{
                    color: "rgba(255,255,255,0.4)", fontWeight: "800",
                    fontSize: 11, textTransform: "uppercase",
                    letterSpacing: 1.5, marginBottom: 8, marginLeft: 4,
                  }}>
                    Password
                  </Text>
                  <View style={{
                    height: 56,
                    backgroundColor: passwordFocused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                    borderWidth: 1.5,
                    borderColor: errors.password
                      ? "rgba(239,68,68,0.5)"
                      : passwordFocused
                        ? "rgba(255,107,0,0.4)"
                        : "rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                  }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: passwordFocused ? "rgba(255,107,0,0.12)" : "rgba(255,255,255,0.04)",
                      justifyContent: "center", alignItems: "center",
                      marginRight: 12,
                    }}>
                      <Lock size={17} color={passwordFocused ? "#FF8C40" : "rgba(255,255,255,0.3)"} />
                    </View>
                    <TextInput
                      style={{
                        flex: 1, color: "white", fontWeight: "600",
                        fontSize: 15, height: "100%",
                      }}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={formData.password}
                      onChangeText={(value) => handleInputChange("password", value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        justifyContent: "center", alignItems: "center",
                      }}
                    >
                      {showPassword
                        ? <Eye size={17} color="rgba(255,255,255,0.4)" />
                        : <EyeOff size={17} color="rgba(255,255,255,0.4)" />
                      }
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={{
                      color: "#FCA5A5", fontSize: 12,
                      marginTop: 4, marginLeft: 4, fontWeight: "600",
                    }}>
                      {errors.password}
                    </Text>
                  )}
                </View>

                {/* Forgot password */}
                <TouchableOpacity
                  onPress={() => router.push("/forgot-password" as any)}
                  style={{ alignSelf: "flex-end", marginTop: 4, marginBottom: 28 }}
                >
                  <Text style={{
                    color: "#FF8C40", fontWeight: "700", fontSize: 13,
                  }}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
                  <TouchableOpacity
                    style={{
                      height: 56, borderRadius: 16,
                      backgroundColor: isLoading ? "rgba(255,107,0,0.6)" : "#FF6B00",
                      justifyContent: "center", alignItems: "center",
                      flexDirection: "row",
                      shadowColor: "#FF6B00",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.35,
                      shadowRadius: 20,
                      elevation: 8,
                    }}
                    onPress={onSubmit}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Zap size={18} color="white" />
                        <Text style={{
                          color: "white", fontWeight: "800", fontSize: 16, marginLeft: 8,
                        }}>
                          Sign In
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* Divider */}
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  marginVertical: 28,
                }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
                  <Text style={{
                    color: "rgba(255,255,255,0.25)", fontSize: 12,
                    fontWeight: "600", marginHorizontal: 16,
                  }}>
                    OR
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
                </View>

                {/* Demo CTA */}
                <TouchableOpacity
                  style={{
                    height: 52, borderRadius: 14,
                    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    justifyContent: "center", alignItems: "center",
                    flexDirection: "row",
                  }}
                  onPress={() => router.push('/trial' as any)}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#FF8C40" />
                  <Text style={{
                    color: "rgba(255,255,255,0.7)", fontWeight: "700",
                    fontSize: 14, marginLeft: 8,
                  }}>
                    Try Interactive Demo
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      <FullScreenLoader visible={isLoading} message="Signing in..." />
    </SafeAreaProvider>
  );
}
