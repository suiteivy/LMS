import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Mail, Phone, Instagram, Linkedin, MoveRight, ShieldCheck, Sparkles } from 'lucide-react-native';

interface FuturisticContactProps {
  onOpenBooking: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FuturisticContact: React.FC<FuturisticContactProps> = ({ onOpenBooking }) => {
  const isWeb = Platform.OS === 'web';
  const isDesktop = SCREEN_WIDTH >= 1024;
  const isTablet = SCREEN_WIDTH >= 768 && SCREEN_WIDTH < 1024;

  const [setupBtnHovered, setSetupBtnHovered] = useState(false);

  const contacts = [
    {
      title: 'Institutional Dispatch',
      value: 'Support@cloudoraltd.live',
      sub: 'Direct response within 1 Business day',
      icon: <Mail size={22} color="#8B5CF6" />,
      accent: '#8B5CF6',
    },
    {
      title: 'Voice Telecom Line',
      value: '+254 759 585 197',
      sub: 'Monday to Friday, 08:00 - 18:00 EAT',
      icon: <Phone size={22} color="#FF6B00" />,
      accent: '#FF6B00',
    },
    {
      title: 'Digital Social Channel',
      value: '@cloudora.solutions',
      sub: 'Product releases & announcements',
      icon: <Instagram size={22} color="#EC4899" />,
      accent: '#EC4899',
    },
    {
      title: 'Enterprise Network',
      value: 'Cloudora Solutions',
      sub: 'Institutional partnerships & careers',
      icon: <Linkedin size={22} color="#3B82F6" />,
      accent: '#3B82F6',
    },
  ];

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 1240,
        alignSelf: 'center',
        paddingTop: 72,
        paddingBottom: 40,
        paddingHorizontal: 20,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 44 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(139, 92, 246, 0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Mail size={24} color="#A78BFA" />
        </View>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: isDesktop ? 38 : 28,
            fontWeight: '900',
            textAlign: 'center',
            letterSpacing: -0.8,
            marginBottom: 10,
          }}
        >
          Connect with our Team
        </Text>
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: 16,
            textAlign: 'center',
            maxWidth: 540,
            lineHeight: 24,
          }}
        >
          Ready to deploy Cloudora at your academy or university? Connect directly with our
          implementation specialists for institutional onboarding.
        </Text>
      </View>

      {/* 4 Contact Terminals Grid */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
          marginBottom: 54,
        }}
      >
        {contacts.map((c, i) => (
          <View
            key={i}
            style={[
              {
                width: isDesktop || isTablet ? '48%' : '100%',
                backgroundColor: 'rgba(15, 11, 46, 0.5)',
                borderRadius: 24,
                padding: 24,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 12,
                  blurRadius: 28,
                  color: 'rgba(0, 0, 0, 0.3)',
                }],
              },
              isWeb
                ? ({
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    transition: 'border-color 0.25s ease, transform 0.25s ease',
                  } as any)
                : {},
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: `${c.accent}18`,
                borderWidth: 1,
                borderColor: `${c.accent}33`,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {c.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.45)',
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 3,
                }}
              >
                {c.title}
              </Text>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: -0.2,
                  marginBottom: 2,
                }}
              >
                {c.value}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}>
                {c.sub}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Interactive Quick Dispatch Banner */}
      <View
        style={[
          {
            borderRadius: 24,
            backgroundColor: 'rgba(255, 107, 0, 0.08)',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 107, 0, 0.3)',
            padding: 28,
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            marginBottom: 60,
          },
          isWeb
            ? ({
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              } as any)
            : {},
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 4 }}>
            Schedule a Guided Platform Walkthrough
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
            Our solutions architects will demonstrate custom courseware and bursary setups tailored to your syllabus.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onOpenBooking}
          activeOpacity={0.85}
          //@ts-ignore
          onPointerEnter={() => setSetupBtnHovered(true)}
          onPointerLeave={() => setSetupBtnHovered(false)}
          style={[
            {
              backgroundColor: setupBtnHovered ? '#FF7A1A' : '#FF6B00',
              paddingVertical: 16,
              paddingHorizontal: 30,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: setupBtnHovered ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 107, 0, 0.3)',
              boxShadow: [{
                offsetX: 0,
                offsetY: setupBtnHovered ? 12 : 8,
                blurRadius: setupBtnHovered ? 28 : 20,
                color: setupBtnHovered ? 'rgba(255, 107, 0, 0.65)' : 'rgba(255, 107, 0, 0.4)',
              }],
            },
            isWeb
              ? ({
                  transitionProperty: 'all',
                  transitionDuration: '0.25s',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: setupBtnHovered
                    ? [{ translateY: -3 }, { scale: 1.03 }]
                    : [{ translateY: 0 }, { scale: 1 }],
                  cursor: 'pointer',
                } as any)
              : {},
          ]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
            Request Institutional Setup
          </Text>
          <MoveRight
            size={16}
            color="#FFFFFF"
            style={
              isWeb
                ? ({
                    transition: 'transform 0.25s ease',
                    transform: setupBtnHovered ? [{ translateX: 4 }] : [{ translateX: 0 }],
                  } as any)
                : {}
            }
          />
        </TouchableOpacity>
      </View>

      {/* Cyber Footer */}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          paddingTop: 28,
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, textAlign: 'center' }}>
          © {new Date().getFullYear()} Cloudora Solutions Limited. All rights reserved.
        </Text>
      </View>
    </View>
  );
};
