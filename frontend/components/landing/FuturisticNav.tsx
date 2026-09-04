import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Dimensions } from 'react-native';
import { School, Sparkles, MoveRight, LogIn, Cpu, Layers } from 'lucide-react-native';
import { router } from 'expo-router';

interface FuturisticNavProps {
  onScrollTo: (sectionKey: string) => void;
  activeSection?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FuturisticNav: React.FC<FuturisticNavProps> = ({ onScrollTo, activeSection }) => {
  const isWeb = Platform.OS === 'web';
  const isMobile = SCREEN_WIDTH < 768;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [demoHovered, setDemoHovered] = useState(false);

  const navItems = [
    { key: 'features', label: 'Capabilities' },
    { key: 'architecture', label: 'Architecture' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'contact', label: 'Connect' },
  ];

  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 12 : 16,
        paddingHorizontal: 20,
        zIndex: 100,
      }}
    >
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 1200,
            borderRadius: 24,
            paddingVertical: 10,
            paddingHorizontal: isMobile ? 14 : 20,
            backgroundColor: 'rgba(15, 11, 46, 0.65)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: [{
              offsetX: 0,
              offsetY: 12,
              blurRadius: 32,
              color: 'rgba(0, 0, 0, 0.45)',
            }],
          },
          isWeb
            ? ({
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              } as any)
            : {},
        ]}
      >
        {/* Left: Brand Identity with Glowing Core */}
        <TouchableOpacity
          onPress={() => onScrollTo('hero')}
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: 'rgba(255, 107, 0, 0.16)',
              borderWidth: 1,
              borderColor: 'rgba(255, 107, 0, 0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FF6B00',
              boxShadow: [{
                offsetX: 0,
                offsetY: 0,
                blurRadius: 14,
                color: 'rgba(255, 107, 0, 0.4)',
              }],
            }}
          >
            <School size={20} color="#FF8C40" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '900',
                  fontSize: 17,
                  letterSpacing: -0.3,
                }}
              >
                Cloudora
              </Text>
              <View
                style={{
                  backgroundColor: 'rgba(255, 107, 0, 0.18)',
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  borderWidth: 0.5,
                  borderColor: 'rgba(255, 107, 0, 0.35)',
                }}
              >
                <Text
                  style={{
                    color: '#FF8C40',
                    fontSize: 9,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                  }}
                >
                  LMS
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Center: Desktop Navigation Pills */}
        {!isMobile && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 16,
              padding: 4,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
            }}
          >
            {navItems.map((item) => {
              const isHovered = hoveredItem === item.key;
              const isActive = activeSection === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => onScrollTo(item.key)}
                  activeOpacity={0.8}
                  //@ts-ignore
                  onPointerEnter={() => setHoveredItem(item.key)}
                  onPointerLeave={() => setHoveredItem(null)}
                  style={[
                    {
                      paddingHorizontal: 16,
                      paddingVertical: 7,
                      borderRadius: 12,
                      backgroundColor: isActive
                        ? 'rgba(255, 107, 0, 0.15)'
                        : isHovered
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: isActive
                        ? 'rgba(255, 107, 0, 0.3)'
                        : 'transparent',
                    },
                    isWeb
                      ? ({
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          cursor: 'pointer',
                        } as any)
                      : {},
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? '#FF8C40' : isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: 13,
                      fontWeight: isActive || isHovered ? '700' : '500',
                      letterSpacing: 0.2,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Right: Interactive Demo Action */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                gap: 7,
                paddingHorizontal: isMobile ? 14 : 18,
                paddingVertical: 9,
                borderRadius: 14,
                backgroundColor: demoHovered ? '#FF6B00' : 'rgba(255, 107, 0, 0.15)',
                borderWidth: 1.5,
                borderColor: demoHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 107, 0, 0.45)',
                shadowColor: '#FF6B00',
                boxShadow: [{
                  offsetX: 0,
                  offsetY: demoHovered ? 6 : 2,
                  blurRadius: demoHovered ? 20 : 10,
                  color: demoHovered ? 'rgba(255, 107, 0, 0.6)' : 'rgba(255, 107, 0, 0.2)',
                }],
              },
              isWeb
                ? ({
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: demoHovered ? [{ translateY: -2 }, { scale: 1.04 }] : [{ translateY: 0 }, { scale: 1 }],
                    cursor: 'pointer',
                  } as any)
                : {},
            ]}
          >
            <Sparkles size={15} color={demoHovered ? '#FFFFFF' : '#FF8C40'} />
            <Text
              style={{
                color: demoHovered ? '#FFFFFF' : '#FF8C40',
                fontWeight: '800',
                fontSize: 13,
                letterSpacing: 0.3,
              }}
            >
              Interactive Demo
            </Text>
            <MoveRight
              size={14}
              color={demoHovered ? '#FFFFFF' : '#FF8C40'}
              style={
                isWeb
                  ? ({
                      transition: 'transform 0.2s ease',
                      transform: demoHovered ? [{ translateX: 2 }] : [{ translateX: 0 }],
                    } as any)
                  : {}
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
