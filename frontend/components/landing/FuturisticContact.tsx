import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Linking,
  ViewStyle,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import {
  Mail,
  Phone,
  MoveRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react-native';
import { GlassCard } from '../ui/GlassCard';
import { SITE_CONFIG } from '@/constants/siteConfig';
import { Reveal, RevealText } from '../ui/Reveal';

interface FuturisticContactProps {
  onOpenBooking: () => void;
}

interface ContactItem {
  key: string;
  title: string;
  value: string;
  sub: string;
  url: string;
  icon: React.ReactNode;
  accent: string;
  isExternal?: boolean;
  canCopy?: boolean;
  accessibilityLabel: string;
}

// Crisp inline SVGs for Social Platforms
const InstagramIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#EC4899',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="5.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="12"
      cy="12"
      r="4.2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="17.6" cy="6.4" r="1.2" fill={color} />
  </Svg>
);

const TikTokIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#25F4EE',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19.32 8.16a5.55 5.55 0 0 1-3.6-1.33V16a5.6 5.6 0 1 1-6.72-5.48v3.2a2.4 2.4 0 1 0 3.52 2.12V2.4h3.2a5.6 5.6 0 0 0 3.6 5.76z"
      fill={color}
    />
  </Svg>
);

const LinkedInIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#3B82F6',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="2"
      y="9"
      width="4"
      height="12"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="4" cy="4" r="2" fill={color} />
  </Svg>
);

export const FuturisticContact: React.FC<FuturisticContactProps> = ({ onOpenBooking }) => {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1060;
  const isTablet = width >= 680 && width < 1060;

  const [setupBtnHovered, setSetupBtnHovered] = useState(false);
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 5 Tiles: Email, Phone, Instagram, TikTok, LinkedIn
  const rawContacts: (ContactItem | null)[] = [
    SITE_CONFIG.supportEmail
      ? {
          key: 'email',
          title: 'Email Support',
          value: SITE_CONFIG.supportEmail,
          sub: 'Direct response within 1 business day',
          url: `mailto:${SITE_CONFIG.supportEmail}`,
          icon: <Mail size={22} color="#8B5CF6" />,
          accent: '#8B5CF6',
          canCopy: true,
          accessibilityLabel: `Email us at ${SITE_CONFIG.supportEmail}`,
        }
      : null,
    SITE_CONFIG.phone?.display
      ? {
          key: 'phone',
          title: 'Phone & WhatsApp',
          value: SITE_CONFIG.phone.display,
          sub: SITE_CONFIG.phone.hours,
          url: `tel:${SITE_CONFIG.phone.international}`,
          icon: <Phone size={22} color="#FF6B00" />,
          accent: '#FF6B00',
          canCopy: true,
          accessibilityLabel: `Call or message us at ${SITE_CONFIG.phone.display}`,
        }
      : null,
    SITE_CONFIG.socials?.instagram?.url
      ? {
          key: 'instagram',
          title: 'Instagram',
          value: SITE_CONFIG.socials.instagram.handle,
          sub: SITE_CONFIG.socials.instagram.sub,
          url: SITE_CONFIG.socials.instagram.url,
          icon: <InstagramIcon size={22} color="#EC4899" />,
          accent: '#EC4899',
          isExternal: true,
          accessibilityLabel: SITE_CONFIG.socials.instagram.label,
        }
      : null,
    SITE_CONFIG.socials?.tiktok?.url
      ? {
          key: 'tiktok',
          title: 'TikTok',
          value: SITE_CONFIG.socials.tiktok.handle,
          sub: SITE_CONFIG.socials.tiktok.sub,
          url: SITE_CONFIG.socials.tiktok.url,
          icon: <TikTokIcon size={22} color="#25F4EE" />,
          accent: '#25F4EE',
          isExternal: true,
          accessibilityLabel: SITE_CONFIG.socials.tiktok.label,
        }
      : null,
    SITE_CONFIG.socials?.linkedin?.url
      ? {
          key: 'linkedin',
          title: 'LinkedIn',
          value: SITE_CONFIG.socials.linkedin.handle,
          sub: SITE_CONFIG.socials.linkedin.sub,
          url: SITE_CONFIG.socials.linkedin.url,
          icon: <LinkedInIcon size={22} color="#3B82F6" />,
          accent: '#3B82F6',
          isExternal: true,
          accessibilityLabel: SITE_CONFIG.socials.linkedin.label,
        }
      : null,
  ];

  const contacts = rawContacts.filter((c): c is ContactItem => c !== null);

  const handleCardPress = (contact: ContactItem) => {
    if (isWeb && typeof window !== 'undefined') {
      if (contact.isExternal) {
        window.open(contact.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = contact.url;
      }
    } else {
      Linking.openURL(contact.url).catch(() => {});
    }
  };

  const handleCopy = (e: any, contact: ContactItem) => {
    e?.stopPropagation?.();
    if (isWeb && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(contact.value).then(() => {
        setCopiedKey(contact.key);
        setTimeout(() => setCopiedKey(null), 2000);
      });
    }
  };

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
      <Reveal variant="headline" style={{ alignItems: 'center', marginBottom: 44 }}>
        <View
          style={[
            {
              width: 52,
              height: 52,
              borderRadius: 18,
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(139, 92, 246, 0.35)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: [
                {
                  offsetX: 0,
                  offsetY: 8,
                  blurRadius: 20,
                  color: 'rgba(139, 92, 246, 0.25)',
                },
              ],
            },
            isWeb
              ? ({
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  background:
                    'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(24, 15, 52, 0.6) 100%)',
                } as any)
              : {},
          ]}
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
          Get in Touch with Our Team
        </Text>
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: 16,
            textAlign: 'center',
            maxWidth: 580,
            lineHeight: 24,
          }}
        >
          We help schools, colleges, and education groups set up their digital campus smoothly and affordably.
        </Text>
      </Reveal>

      {/* Modern 5-Tile Clickable Connect Matrix */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'center',
          alignItems: 'stretch',
          marginBottom: 48,
        }}
      >
        {contacts.map((c, i) => {
          const isHovered = hoveredCardKey === c.key;
          const isCopied = copiedKey === c.key;

          // Responsive width for 5 tiles:
          // Desktop: 5 items row (approx 18.5% each with gap)
          // Tablet: 3 on row 1, 2 on row 2 (approx 31% each)
          // Mobile: 100% full width
          const cardWidthStyle: ViewStyle = isDesktop
            ? { width: '18.7%', minWidth: 200 }
            : isTablet
            ? { width: '31%', minWidth: 200 }
            : { width: '100%', minWidth: 260 };

          return (
            <Reveal
              key={c.key}
              variant="cards"
              staggerIndex={i}
              style={[cardWidthStyle, { display: 'flex' }]}
            >
              <TouchableOpacity
                onPress={() => handleCardPress(c)}
                activeOpacity={0.85}
                accessibilityRole="link"
                accessibilityLabel={c.accessibilityLabel}
                // @ts-ignore
                onPointerEnter={() => setHoveredCardKey(c.key)}
                onPointerLeave={() => setHoveredCardKey(null)}
                style={[
                  {
                    width: '100%',
                    height: '100%',
                    borderRadius: 20,
                  },
                  isWeb
                    ? ({
                        cursor: 'pointer',
                        transform: isHovered
                          ? [{ translateY: -4 }, { scale: 1.01 }]
                          : [{ translateY: 0 }, { scale: 1 }],
                        transition:
                          'transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease',
                      } as any)
                    : {},
                ]}
              >
                <GlassCard
                  variant="standard"
                  accentColor={c.accent}
                  glowColor={isHovered ? `${c.accent}45` : `${c.accent}18`}
                  borderRadius={20}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderWidth: 1,
                    borderColor: isHovered ? `${c.accent}80` : 'rgba(255, 255, 255, 0.1)',
                  }}
                  contentStyle={{
                    padding: 20,
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    gap: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 15,
                        backgroundColor: `${c.accent}18`,
                        borderWidth: 1,
                        borderColor: isHovered ? `${c.accent}66` : `${c.accent}33`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {c.icon}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {c.canCopy && isDesktop && (
                        <TouchableOpacity
                          onPress={(e) => handleCopy(e, c)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Copy ${c.value}`}
                          style={{
                            padding: 6,
                            borderRadius: 8,
                            backgroundColor: isCopied
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(255, 255, 255, 0.06)',
                            borderWidth: 1,
                            borderColor: isCopied
                              ? 'rgba(16, 185, 129, 0.4)'
                              : 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          {isCopied ? (
                            <Check size={13} color="#10B981" />
                          ) : (
                            <Copy size={13} color="rgba(255, 255, 255, 0.6)" />
                          )}
                        </TouchableOpacity>
                      )}

                      <View
                        style={[
                          {
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            backgroundColor: isHovered
                              ? `${c.accent}25`
                              : 'rgba(255, 255, 255, 0.05)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                          isWeb
                            ? ({
                                transform: isHovered ? [{ translateX: 2 }] : [{ translateX: 0 }],
                                transition: 'transform 0.2s ease',
                              } as any)
                            : {},
                        ]}
                      >
                        {c.isExternal ? (
                          <ExternalLink
                            size={13}
                            color={isHovered ? c.accent : 'rgba(255, 255, 255, 0.5)'}
                          />
                        ) : (
                          <MoveRight
                            size={14}
                            color={isHovered ? c.accent : 'rgba(255, 255, 255, 0.5)'}
                          />
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ marginTop: 'auto' }}>
                    <Text
                      style={{
                        color: 'rgba(255, 255, 255, 0.45)',
                        fontSize: 11,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 4,
                      }}
                    >
                      {c.title}
                    </Text>
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: '800',
                        letterSpacing: -0.2,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {c.value}
                    </Text>
                    <Text
                      style={{
                        color: 'rgba(255, 255, 255, 0.45)',
                        fontSize: 11.5,
                        lineHeight: 16,
                      }}
                      numberOfLines={2}
                    >
                      {c.sub}
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Reveal>
          );
        })}
      </View>

      {/* Interactive Quick Dispatch Banner */}
      <Reveal variant="wrapper">
        <GlassCard
          variant="elevated"
          accentColor="#FF6B00"
          glowColor="rgba(255, 107, 0, 0.35)"
          borderRadius={24}
          style={{
            width: '100%',
            marginBottom: 60,
          }}
          contentStyle={{
            padding: 28,
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 4 }}>
              Schedule a Guided School Walkthrough
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
              Our team will walk you through live features, gradebook setups, and fee tracking tailored to your school.
            </Text>
          </View>

          <TouchableOpacity
            onPress={onOpenBooking}
            activeOpacity={0.85}
            // @ts-ignore
            onPointerEnter={() => setSetupBtnHovered(true)}
            onPointerLeave={() => setSetupBtnHovered(false)}
            style={[
              {
                backgroundColor: '#FF6B00',
                paddingVertical: 16,
                paddingHorizontal: 30,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: setupBtnHovered ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: [
                  {
                    offsetX: 0,
                    offsetY: setupBtnHovered ? 12 : 8,
                    blurRadius: setupBtnHovered ? 28 : 20,
                    color: setupBtnHovered ? 'rgba(255, 107, 0, 0.7)' : 'rgba(255, 107, 0, 0.45)',
                  },
                ],
              },
              isWeb
                ? ({
                    background: setupBtnHovered
                      ? 'linear-gradient(135deg, #FF8C40 0%, #FF6B00 50%, #E65100 100%)'
                      : 'linear-gradient(135deg, #FF7A1A 0%, #FF6B00 60%, #EA580C 100%)',
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
            {/* Top button sheen */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '45%',
                opacity: 0.6,
                ...(isWeb
                  ? ({
                      background:
                        'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 100%)',
                    } as any)
                  : {}),
              }}
            />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
              Book a Guided Demo
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
        </GlassCard>
      </Reveal>

      {/* Cyber Footer with Socials */}
      <Reveal variant="wrapper">
        <View
          style={{
            borderTopWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            paddingTop: 28,
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, textAlign: 'center' }}>
            © {new Date().getFullYear()} {SITE_CONFIG.legalName}. All rights reserved.
          </Text>

          {/* Social Links In Footer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              onPress={() => handleCardPress(contacts.find((c) => c.key === 'instagram')!)}
              accessibilityLabel="Instagram"
              style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <InstagramIcon size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCardPress(contacts.find((c) => c.key === 'tiktok')!)}
              accessibilityLabel="TikTok"
              style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <TikTokIcon size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCardPress(contacts.find((c) => c.key === 'linkedin')!)}
              accessibilityLabel="LinkedIn"
              style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <LinkedInIcon size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>
      </Reveal>
    </View>
  );
};

export default FuturisticContact;
