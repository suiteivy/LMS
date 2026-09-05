import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AppLoading } from '@/components/AppLoading';
import { api } from '@/services/api';
import { LivingBackground } from '@/components/landing/LivingBackground';
import { FuturisticNav } from '@/components/landing/FuturisticNav';
import { HeroConsole } from '@/components/landing/HeroConsole';
import { BentoFeatures } from '@/components/landing/BentoFeatures';
import { TelemetryStrip } from '@/components/landing/TelemetryStrip';
import { FuturisticPricing } from '@/components/landing/FuturisticPricing';
import { FuturisticContact } from '@/components/landing/FuturisticContact';
import {
  Building,
  Plus,
  Settings,
  Check,
  MoveRight,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react-native';

const ADDONS_DATA = [
  {
    name: 'Digital Library',
    tagline: 'Add-On Module',
    price: '$30/mo',
    desc: 'Manage library and virtual learning materials on a main dashboard',
  },
  {
    name: 'Bursary Module',
    tagline: 'Add-On Module',
    price: '$30/mo',
    desc: 'Manage student accounts and financial logs on a main dashboard',
  },
  {
    name: 'Messaging Module',
    tagline: 'Add-On Module',
    price: '$5/mo',
    desc: 'Direct messaging and announcement sharing on e-learning platform',
  },
  {
    name: 'Virtual Diary',
    tagline: 'Add-On Module',
    price: '$5/mo',
    desc: 'Digital class entries, daily reports and performance tracking for students',
  },
];

const CUSTOM_FEATURES_DATA = [
  'Client-specific courses & learning paths',
  'HR system & attendance integration',
  'Custom progress & certification reports',
  'UI adjustments (dashboards, labels, branding)',
  'All add-ons included (Library, Bursary, Messaging)',
  'Dedicated onboarding & support',
];

export default function MarketingPage() {
  const { session, loading, isInitializing, isNavReady } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  // Section position tracking for smooth scrolling
  const [sectionPositions, setSectionPositions] = useState<Record<string, number>>({});
  const [activeNavSection, setActiveNavSection] = useState<string>('hero');

  // Booking & Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [addonModalVisible, setAddonModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedCustomFeatures, setSelectedCustomFeatures] = useState<string[]>([]);
  const [selectedCoreModules, setSelectedCoreModules] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Show AppLoading during session initialization or redirect
  if (isInitializing || (session && !isNavReady)) {
    return <AppLoading />;
  }

  const handleLayout = (key: string, y: number) => {
    setSectionPositions((prev) => ({ ...prev, [key]: y }));
  };

  const scrollToSection = (key: string) => {
    if (key === 'hero') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setActiveNavSection('hero');
      return;
    }
    const y = sectionPositions[key];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
      setActiveNavSection(key);
    }
  };

  const openRegistrationModal = (planName: string) => {
    setSelectedPlan(planName);
    setForm({ name: '', email: '', message: '' });
    setSelectedAddons([]);
    setSelectedCustomFeatures([]);
    setSelectedCoreModules([]);
    setSubmitted(false);

    if (planName.toLowerCase().includes('free trial')) {
      setModalVisible(true);
    } else if (planName.toLowerCase().includes('custom')) {
      setCustomModalVisible(true);
    } else {
      setAddonModalVisible(true);
    }
  };

  const proceedToRegistration = () => {
    setAddonModalVisible(false);
    setCustomModalVisible(false);
    setModalVisible(true);
  };

  const handleSignup = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Missing Info', 'Please fill in your institution name and contact email.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/contact/booking', {
        name: form.name,
        email: form.email,
        plan: selectedPlan,
        addons: selectedAddons,
        customFeatures: selectedCustomFeatures,
        coreModules: selectedCoreModules,
        message:
          form.message ||
          `Setup request for ${selectedPlan} plan${
            selectedCoreModules.length > 0 ? ` with core modules: ${selectedCoreModules.join(', ')}` : ''
          }${selectedAddons.length > 0 ? ` with addons: ${selectedAddons.join(', ')}` : ''}${
            selectedCustomFeatures.length > 0
              ? ` with custom features: ${selectedCustomFeatures.join(', ')}`
              : ''
          }`,
      });

      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070514' }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* SINGLE CONTINUOUS LIVING BACKGROUND CANVAS (persists across whole page) */}
      <LivingBackground />

      {/* FLOATING FUTURISTIC HUD NAVIGATION */}
      <FuturisticNav onScrollTo={scrollToSection} activeSection={activeNavSection} />

      {/* MAIN SCROLLABLE CONTENT CANVAS */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            if (y < 400) setActiveNavSection('hero');
            else if (y < 1200) setActiveNavSection('features');
            else if (y < 1800) setActiveNavSection('architecture');
            else if (y < 2600) setActiveNavSection('pricing');
            else setActiveNavSection('contact');
          }}
        >
          {/* 1. ASYMMETRIC COMMAND CONSOLE HERO */}
          <View onLayout={(e) => handleLayout('hero', e.nativeEvent.layout.y)}>
            <HeroConsole
              onExplorePricing={() => scrollToSection('pricing')}
              onOpenTrial={() => openRegistrationModal('Free Trial')}
            />
          </View>

          {/* 2. ASYMMETRIC BENTO FEATURES MATRIX */}
          <View onLayout={(e) => handleLayout('features', e.nativeEvent.layout.y)}>
            <BentoFeatures />
          </View>

          {/* 3. ENTERPRISE INFRASTRUCTURE TELEMETRY */}
          <View onLayout={(e) => handleLayout('architecture', e.nativeEvent.layout.y)}>
            <TelemetryStrip />
          </View>

          {/* 4. FUTURISTIC GLASS ARMOR PRICING & ADD-ONS */}
          <View onLayout={(e) => handleLayout('pricing', e.nativeEvent.layout.y)}>
            <FuturisticPricing onSelectPlan={openRegistrationModal} />
          </View>

          {/* 5. HYPER-CONNECT COMMUNICATION PORTAL & FOOTER */}
          <View onLayout={(e) => handleLayout('contact', e.nativeEvent.layout.y)}>
            <FuturisticContact onOpenBooking={() => openRegistrationModal('Custom Institutional Deployment')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL 1: ADDON SELECTOR MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addonModalVisible}
        onRequestClose={() => setAddonModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(5, 3, 15, 0.85)',
            padding: 16,
            ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(24px)' } as any) : {}),
          }}
        >
          <View
            style={{
              backgroundColor: '#0F0B2E',
              borderRadius: 30,
              padding: 26,
              width: '100%',
              maxWidth: 520,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 107, 0, 0.3)',
              boxShadow: [{
                offsetX: 0,
                offsetY: 24,
                blurRadius: 48,
                color: 'rgba(0, 0, 0, 0.6)',
              }],
            }}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 10,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setAddonModalVisible(false)}
            >
              <X size={18} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginBottom: 22 }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255, 107, 0, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 107, 0, 0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Plus size={26} color="#FF8C40" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
                Augment Your {selectedPlan}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.55)',
                  textAlign: 'center',
                  fontSize: 13.5,
                  marginTop: 6,
                }}
              >
                Select optional institutional modules to bundle into your deployment.
              </Text>
            </View>

            <View style={{ gap: 10, marginBottom: 24 }}>
              {ADDONS_DATA.map((addon) => {
                const isSelected = selectedAddons.includes(addon.name);
                return (
                  <TouchableOpacity
                    key={addon.name}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedAddons(selectedAddons.filter((a) => a !== addon.name));
                      } else {
                        setSelectedAddons([...selectedAddons, addon.name]);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? 'rgba(255, 107, 0, 0.14)'
                        : 'rgba(255, 255, 255, 0.04)',
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#FF6B00' : 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)',
                          fontWeight: '700',
                          fontSize: 14.5,
                        }}
                      >
                        {addon.name}
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.45)',
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {addon.desc}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                      <Text style={{ color: '#FF8C40', fontWeight: '800', fontSize: 13.5 }}>
                        {addon.price}
                      </Text>
                      {isSelected && (
                        <View
                          style={{
                            backgroundColor: '#FF6B00',
                            borderRadius: 6,
                            padding: 2,
                            marginTop: 4,
                          }}
                        >
                          <Check size={11} color="white" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#FF6B00',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 8,
                    blurRadius: 18,
                    color: 'rgba(255, 107, 0, 0.4)',
                  }],
                }}
                onPress={proceedToRegistration}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                  {selectedAddons.length > 0 ? 'Apply Add-Ons & Continue' : 'Skip & Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CUSTOM PLAN CONFIGURATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customModalVisible}
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(5, 3, 15, 0.85)',
            padding: 16,
            ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(24px)' } as any) : {}),
          }}
        >
          <View
            style={{
              backgroundColor: '#0F0B2E',
              borderRadius: 30,
              padding: 26,
              width: '100%',
              maxWidth: 620,
              borderWidth: 1.5,
              borderColor: 'rgba(139, 92, 246, 0.35)',
              boxShadow: [{
                offsetX: 0,
                offsetY: 24,
                blurRadius: 48,
                color: 'rgba(0, 0, 0, 0.6)',
              }],
            }}
          >
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 10,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setCustomModalVisible(false)}
            >
              <X size={18} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(139, 92, 246, 0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Settings size={26} color="#A78BFA" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
                Configure Custom Deployment
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.55)',
                  textAlign: 'center',
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Select the specialized architectural features and modules required.
              </Text>
            </View>

            <View style={{ maxHeight: 380 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Core Modules */}
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  Core Portals
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {['Student module', 'Teacher module', 'Parent/Guardian module'].map((mod) => {
                    const isSelected = selectedCoreModules.includes(mod);
                    return (
                      <TouchableOpacity
                        key={mod}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedCoreModules(selectedCoreModules.filter((m) => m !== mod));
                          } else {
                            setSelectedCoreModules([...selectedCoreModules, mod]);
                          }
                        }}
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(255, 255, 255, 0.04)',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                            fontWeight: '600',
                            fontSize: 12.5,
                          }}
                        >
                          {mod}
                        </Text>
                        {isSelected && <Check size={13} color="#3B82F6" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Modules */}
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  Enterprise Integrations
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {CUSTOM_FEATURES_DATA.map((feat) => {
                    const isSelected = selectedCustomFeatures.includes(feat);
                    return (
                      <TouchableOpacity
                        key={feat}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedCustomFeatures(selectedCustomFeatures.filter((f) => f !== feat));
                          } else {
                            setSelectedCustomFeatures([...selectedCustomFeatures, feat]);
                          }
                        }}
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(139, 92, 246, 0.2)'
                            : 'rgba(255, 255, 255, 0.04)',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#8B5CF6' : 'rgba(255, 255, 255, 0.08)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                            fontWeight: '600',
                            fontSize: 12.5,
                          }}
                        >
                          {feat}
                        </Text>
                        {isSelected && <Check size={13} color="#8B5CF6" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#8B5CF6',
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
                marginTop: 18,
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 8,
                  blurRadius: 18,
                  color: 'rgba(139, 92, 246, 0.4)',
                }],
              }}
              onPress={proceedToRegistration}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                Apply Custom Configuration & Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: REGISTRATION & SETUP REQUEST MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(5, 3, 15, 0.8)',
              ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)' } as any) : {}),
            }}
          >
            <View
              style={{
                backgroundColor: '#0F0B2E',
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                padding: 32,
                paddingTop: 24,
                minHeight: 520,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 107, 0, 0.25)',
                borderBottomWidth: 0,
              }}
            >
              {/* Drag Handle */}
              <View
                style={{
                  width: 48,
                  height: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 3,
                  alignSelf: 'center',
                  marginBottom: 24,
                }}
              />

              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 24,
                  right: 28,
                  zIndex: 10,
                  width: 34,
                  height: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 17,
                }}
                onPress={() => setModalVisible(false)}
              >
                <X size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>

              {submitted ? (
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 48,
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 20,
                      borderWidth: 1,
                      borderColor: 'rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <Check size={40} color="#10B981" strokeWidth={3} />
                  </View>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 26,
                      fontWeight: '900',
                      textAlign: 'center',
                      marginBottom: 10,
                    }}
                  >
                    Request Registered Successfully!
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      textAlign: 'center',
                      marginBottom: 32,
                      fontSize: 15,
                      lineHeight: 22,
                      maxWidth: 480,
                    }}
                  >
                    Thank you! Our implementation engineering team will reach out within 24 hours
                    to configure your {selectedPlan} platform.
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#10B981',
                      paddingHorizontal: 40,
                      paddingVertical: 16,
                      borderRadius: 16,
                    }}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                      Return to Command Center
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: 'rgba(255, 107, 0, 0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 107, 0, 0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Building size={22} color="#FF6B00" />
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>
                        Deploy {selectedPlan}
                      </Text>
                      <Text
                        style={{
                          color: '#FF8C40',
                          fontWeight: '700',
                          fontSize: 12,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        Institutional Setup & Architecture
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.55)',
                      fontSize: 14,
                      lineHeight: 20,
                      marginBottom: 24,
                    }}
                  >
                    Complete the institutional details below to initialize deployment provisioning.
                  </Text>

                  <View style={{ gap: 16, marginBottom: 32 }}>
                    <View>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: 13,
                          fontWeight: '700',
                          marginBottom: 6,
                        }}
                      >
                        Institution or Academy Name
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: 14,
                          padding: 16,
                          color: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          fontSize: 14.5,
                        }}
                        placeholder="E.g. Strathmore Academy"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        value={form.name}
                        onChangeText={(t) => setForm((prev) => ({ ...prev, name: t }))}
                      />
                    </View>

                    <View>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: 13,
                          fontWeight: '700',
                          marginBottom: 6,
                        }}
                      >
                        Administrator Contact Email
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: 14,
                          padding: 16,
                          color: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          fontSize: 14.5,
                        }}
                        placeholder="admin@institution.ac.ke"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        keyboardType="email-address"
                        value={form.email}
                        onChangeText={(t) => setForm((prev) => ({ ...prev, email: t }))}
                      />
                    </View>

                    <View>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: 13,
                          fontWeight: '700',
                          marginBottom: 6,
                        }}
                      >
                        Deployment Specifications & Student Capacity (Optional)
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: 14,
                          padding: 16,
                          color: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          fontSize: 14.5,
                          minHeight: 90,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Describe campus count, current SIS/ERP system, or specific timeline..."
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        multiline
                        value={form.message}
                        onChangeText={(t) => setForm((prev) => ({ ...prev, message: t }))}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FF6B00',
                      paddingVertical: 18,
                      borderRadius: 16,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      boxShadow: [{
                        offsetX: 0,
                        offsetY: 8,
                        blurRadius: 20,
                        color: 'rgba(255, 107, 0, 0.45)',
                      }],
                    }}
                    onPress={handleSignup}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="white" style={{ marginRight: 10 }} />
                    ) : null}
                    <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                      {submitting ? 'Transmitting Request...' : 'Authorize Setup Request'}
                    </Text>
                    {!submitting && <MoveRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
