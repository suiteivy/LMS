import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Sparkles, Menu, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { CloudoraLogo } from '@/components/common/CloudoraLogo';

interface FuturisticNavProps {
  onScrollTo: (sectionKey: string) => void;
  activeSection?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NAV_ITEMS = [
  { key: 'features', label: 'Capabilities' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'contact', label: 'Connect' },
];

// Respect prefers-reduced-motion on web; native has no equivalent signal here.
const prefersReducedMotion =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const transitionSpeed = prefersReducedMotion ? '0s' : '0.25s';

// Track whether the last input was a mouse or a keyboard, so the focus
// ring only appears for keyboard/tab navigation — a mouse click on the
// active link should just trigger the lift/glow, not a boxed outline.
let lastInputWasKeyboard = false;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') lastInputWasKeyboard = true;
  });
  window.addEventListener('mousedown', () => {
    lastInputWasKeyboard = false;
  });
}

export const FuturisticNav: React.FC<FuturisticNavProps> = ({
  onScrollTo,
  activeSection = 'hero',
}) => {
  const isWeb = Platform.OS === 'web';
  const isMobile = SCREEN_WIDTH < 900;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (key: string) => {
    onScrollTo(key);
    setMobileMenuOpen(false);
  };

  const focusRing = (key: string) =>
    isWeb && focusedKey === key
      ? ({
          outlineStyle: 'solid',
          outlineWidth: 2,
          outlineColor: 'rgba(255, 146, 72, 0.65)',
          outlineOffset: 4,
        } as any)
      : {};

  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 16 : 18,
        paddingHorizontal: isMobile ? 16 : 28,
        zIndex: 100,
      }}
    >
      {/* ── UNBOXED NAV ROW — no shared background, border, or shadow.
          Every element floats directly on the page. ── */}
      <View style={styles.navRow}>
        {/* ── LEFT: WORDMARK ── */}
        <TouchableOpacity
          onPress={() => handleNavClick('hero')}
          activeOpacity={0.75}
          style={styles.brandRow}
          accessibilityRole="link"
        >
          <CloudoraLogo
            size={26}
            glow
            glowIntensity={0.65}
          />
          <Text style={styles.brandTitle}>
            Cloudora <Text style={styles.brandSuffix}>LMS</Text>
          </Text>
        </TouchableOpacity>

        {/* ── CENTER: LINKS SPREAD ACROSS THE AVAILABLE SPACE.
            Each item rises and glows on its own — a lit-from-within
            label with a small pulse-dot beneath it — rather than a
            single shared indicator sliding between them. ── */}
        {!isMobile && (
          <View style={styles.navLinksRow}>
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.key;
              const isHovered = hoveredKey === item.key;
              const isLit = isActive || isHovered;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handleNavClick(item.key)}
                  activeOpacity={0.8}
                  accessibilityRole="link"
                  //@ts-ignore — web-only pointer + focus events
                  onPointerEnter={() => setHoveredKey(item.key)}
                  onPointerLeave={() => setHoveredKey(null)}
                  onFocus={() => {
                    if (lastInputWasKeyboard) setFocusedKey(item.key);
                  }}
                  onBlur={() => setFocusedKey(null)}
                  style={[
                    styles.navLink,
                    focusRing(item.key),
                    isWeb ? ({ cursor: 'pointer' } as any) : {},
                  ]}
                >
                  <Text
                    style={[
                      styles.navLinkText,
                      {
                        color: isLit ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                        fontWeight: isActive ? '700' : '500',
                        textShadowColor: isLit
                          ? 'rgba(255,140,64,0.6)'
                          : 'transparent',
                        textShadowRadius: isLit ? 10 : 0,
                        textShadowOffset: { width: 0, height: 0 },
                      },
                      isWeb
                        ? ({
                            letterSpacing: isLit ? 1 : 0.2,
                            transform: isLit
                              ? [{ translateY: -2 }]
                              : [{ translateY: 0 }],
                            transition: `all ${transitionSpeed} cubic-bezier(0.16,1,0.3,1)`,
                          } as any)
                        : {},
                    ]}
                  >
                    {item.label}
                  </Text>

                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── RIGHT: THE ONE SOLID ELEMENT ON THE BAR ── */}
        <View style={styles.rightCluster}>
          <TouchableOpacity
            onPress={() => router.push('/demo' as any)}
            activeOpacity={0.85}
            //@ts-ignore
            onPointerEnter={() => setCtaHovered(true)}
            onPointerLeave={() => setCtaHovered(false)}
            style={[
              styles.ctaButton,
              {
                paddingHorizontal: isMobile ? 14 : 20,
                paddingVertical: isMobile ? 8 : 9,
              },
              isWeb
                ? ({
                    background: ctaHovered
                      ? 'linear-gradient(135deg, #FF9142 0%, #FF6500 55%, #E65500 100%)'
                      : 'linear-gradient(135deg, #FF7F2E 0%, #FF5A00 55%, #D94F00 100%)',
                    boxShadow: ctaHovered
                      ? '0 8px 22px rgba(255,107,0,0.45), inset 0 1px 0 rgba(255,255,255,0.3)'
                      : '0 4px 14px rgba(255,107,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                    transform: ctaHovered ? [{ translateY: -1 }] : [{ translateY: 0 }],
                    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                    cursor: 'pointer',
                  } as any)
                : {},
            ]}
          >
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.ctaText}>{isMobile ? 'Demo' : 'Interactive Demo'}</Text>
          </TouchableOpacity>

          {isMobile && (
            <TouchableOpacity
              onPress={() => setMobileMenuOpen((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              style={styles.menuToggle}
            >
              {mobileMenuOpen ? (
                <X size={20} color="#FF9248" />
              ) : (
                <Menu size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── MOBILE MENU: an edge-to-edge sheet, not a boxed card. ── */}
      {isMobile && mobileMenuOpen && (
        <View
          style={[
            styles.mobileSheet,
            isWeb
              ? ({
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                } as any)
              : {},
          ]}
        >
          {NAV_ITEMS.map((item, i) => {
            const isActive = activeSection === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleNavClick(item.key)}
                activeOpacity={0.7}
                style={[styles.mobileItem, i === 0 && { borderTopWidth: 0 }]}
              >
                <Text
                  style={[
                    styles.mobileItemText,
                    { color: isActive ? '#FFA35C' : 'rgba(255,255,255,0.82)' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1240,
    height: 50,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  brandSuffix: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    fontSize: 13,
  },
  navLinksRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    maxWidth: 640,
    marginHorizontal: 24,
  },
  navLink: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  navLinkText: {
    fontSize: 14,
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  menuToggle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSheet: {
    width: '100%',
    maxWidth: 1240,
    marginTop: 14,
    backgroundColor: 'rgba(8, 6, 20, 0.9)',
  },
  mobileItem: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  mobileItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default FuturisticNav;