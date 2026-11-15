import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import {
  Mail,
  Phone,
  Instagram,
  Linkedin,
  MoveRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react-native';
import { GlassCard } from '../ui/GlassCard';
import { SITE_CONFIG } from '@/constants/siteConfig';
import { Reveal } from '../ui/Reveal';

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

export const FuturisticContact: React.FC<FuturisticContactProps> = ({ onOpenBooking }) => {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [setupBtnHovered, setSetupBtnHovered] = useState(false);
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Build contact list dynamically from SITE_CONFIG.
  // Missing or empty values are automatically filtered out.
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
          title: 'Social Channels',
          value: SITE_CONFIG.socials.instagram.handle,
          sub: SITE_CONFIG.socials.instagram.sub,
          url: SITE_CONFIG.socials.instagram.url,
          icon: <Instagram size={22} color="#EC4899" />,
          accent: '#EC4899',
          isExternal: true,
          accessibilityLabel: SITE_CONFIG.socials.instagram.label,
        }
      : null,
    SITE_CONFIG.socials?.linkedin?.url
      ? {
          key: 'linkedin',
          title: 'Office & Partnerships',
          value: SITE_CONFIG.socials.linkedin.handle,
          sub: SITE_CONFIG.socials.linkedin.sub,
          url: SITE_CONFIG.socials.linkedin.url,
          icon: <Linkedin size={22} color="#3B82F6" />,
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
      <Reveal variant="wrapper" style={{ alignItems: 'center', marginBottom: 44 }}>
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

      {/* Modern 2x2 Clickable Contact Matrix */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
          marginBottom: 48,
        }}
      >
        {contacts.map((c, i) => {
          const isHovered = hoveredCardKey === c.key;
          const isCopied = copiedKey === c.key;

          return (
            <Reveal
              key={c.key}
              variant="cards"
              staggerIndex={i}
              style={{
                width: isDesktop ? '48.5%' : '100%',
                minWidth: 280,
              }}
            >
              <TouchableOpacity
                onPress={() => handleCardPress(c)}
                activeOpacity={0.85}
                accessibilityRole="link"
                accessibilityLabel={c.accessibilityLabel}
                //@ts-ignore
                onPointerEnter={() => setHoveredCardKey(c.key)}
                onPointerLeave={() => setHoveredCardKey(null)}
                style={[
                  {
                    width: '100%',
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
                    borderWidth: 1,
                    borderColor: isHovered ? `${c.accent}80` : 'rgba(255, 255, 255, 0.1)',
                  }}
                  contentStyle={{
                    padding: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 18,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
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
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>
                      {c.sub}
                    </Text>
                  </View>

                  {/* Actions / indicators */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {c.canCopy && isDesktop && (
                      <TouchableOpacity
                        onPress={(e) => handleCopy(e, c)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Copy ${c.value}`}
                        style={{
                          padding: 8,
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
                          <Check size={14} color="#10B981" />
                        ) : (
                          <Copy size={14} color="rgba(255, 255, 255, 0.6)" />
                        )}
                      </TouchableOpacity>
                    )}

                    <View
                      style={[
                        {
                          width: 32,
                          height: 32,
                          borderRadius: 10,
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
                          size={14}
                          color={isHovered ? c.accent : 'rgba(255, 255, 255, 0.5)'}
                        />
                      ) : (
                        <MoveRight
                          size={15}
                          color={isHovered ? c.accent : 'rgba(255, 255, 255, 0.5)'}
                        />
                      )}
                    </View>
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
            //@ts-ignore
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
          © {new Date().getFullYear()} {SITE_CONFIG.legalName}. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

export default FuturisticContact;
