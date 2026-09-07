import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    Animated,
    Easing as EasingRN,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LivingBackground } from '@/components/landing/LivingBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    CircleAlert,
    FileQuestion,
    Home,
    ArrowLeft,
    LogIn,
    LayoutDashboard,
    Sparkles,
    RotateCcw,
    Compass,
} from 'lucide-react-native';
import { CloudoraLogo } from '@/components/common/CloudoraLogo';

// ─── Design Tokens (matches landing & auth screens) ─────────────────────────
const FLAME        = '#FF6B00';
const FLAME_GLOW   = 'rgba(255,107,0,0.35)';
const FLAME_BG     = 'rgba(255,107,0,0.12)';
const GLASS_BORDER = 'rgba(255,255,255,0.09)';

// ─── LogoLockup Component ───────────────────────────────────────────────────
const LogoLockup = ({ entranceAnim }: { entranceAnim: Animated.Value }) => {
    const pulseScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseScale, { toValue: 1.08, duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
                Animated.timing(pulseScale, { toValue: 1, duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => {
            pulse.stop();
        };
    }, [pulseScale]);

    const entranceOpacity = entranceAnim;
    const entranceTranslateY = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

    return (
        <Animated.View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                opacity: entranceOpacity,
                transform: [{ translateY: entranceTranslateY }],
            }}
        >
            {/* Unboxed Logo mark with gentle breathing animation */}
            <Animated.View
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pulseScale }],
                }}
            >
                <CloudoraLogo size={30} glow glowIntensity={0.65} />
            </Animated.View>

            {/* Brand title */}
            <Text
                style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: 3,
                    fontSize: 12,
                }}
            >
                Cloudora
            </Text>
        </Animated.View>
    );
};

// ─── Primary Flame Button ───────────────────────────────────────────────────
const ActionFlameButton = ({
    onPress,
    title,
    icon: Icon,
}: {
    onPress: () => void;
    title: string;
    icon?: any;
}) => {
    const [hovered, setHovered] = useState(false);
    const hoverAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    const onHoverIn = () => {
        setHovered(true);
        Animated.timing(hoverAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    };

    const onHoverOut = () => {
        setHovered(false);
        Animated.timing(hoverAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    };

    const hoverLiftY = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

    return (
        <Animated.View
            style={{
                transform: [{ translateY: hoverLiftY }],
                borderRadius: 16,
                position: 'relative',
                flex: 1,
                minWidth: 160,
            }}
        >
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        top: -4,
                        left: -4,
                        right: -4,
                        bottom: -4,
                        borderRadius: 20,
                        backgroundColor: 'rgba(255,107,0,0.22)',
                        transform: [{ scale: pulseAnim }],
                    },
                    Platform.OS === 'web' ? ({ filter: 'blur(6px)' } as any) : {},
                ]}
            />
            <Pressable
                onPress={onPress}
                onHoverIn={onHoverIn}
                onHoverOut={onHoverOut}
                style={({ pressed }) => [
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        borderRadius: 16,
                        overflow: 'hidden',
                        opacity: pressed ? 0.9 : 1,
                        ...(Platform.OS === 'web'
                            ? {
                                  background: 'linear-gradient(135deg, #FF8C40 0%, #FF6B00 45%, #E85D00 100%)',
                                  boxShadow: hovered
                                      ? '0 0 0 1px rgba(255,140,64,0.5), 0 12px 32px rgba(255,107,0,0.5), 0 4px 12px rgba(255,107,0,0.35)'
                                      : '0 8px 24px rgba(255,107,0,0.35), 0 2px 6px rgba(255,107,0,0.25)',
                                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                                  cursor: 'pointer',
                              }
                            : {
                                  backgroundColor: FLAME,
                              }),
                    } as any,
                ]}
            >
                {Icon && <Icon size={18} color="#ffffff" strokeWidth={2.2} />}
                <Text
                    style={{
                        color: '#ffffff',
                        fontSize: 15,
                        fontWeight: '700',
                        letterSpacing: 0.2,
                    }}
                >
                    {title}
                </Text>
            </Pressable>
        </Animated.View>
    );
};

// ─── Secondary Frosted Glass Button ─────────────────────────────────────────
const ActionGlassButton = ({
    onPress,
    title,
    icon: Icon,
}: {
    onPress: () => void;
    title: string;
    icon?: any;
}) => {
    const [hovered, setHovered] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            style={({ pressed }) => [
                {
                    flex: 1,
                    minWidth: 160,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                    backgroundColor: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: hovered ? 'rgba(255,107,0,0.45)' : 'rgba(255,255,255,0.12)',
                    opacity: pressed ? 0.85 : 1,
                    ...(Platform.OS === 'web'
                        ? {
                              backdropFilter: 'blur(16px)',
                              WebkitBackdropFilter: 'blur(16px)',
                              boxShadow: hovered ? '0 0 16px rgba(255,107,0,0.2)' : '0 4px 12px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                          }
                        : {}),
                } as any,
            ]}
        >
            {Icon && <Icon size={18} color={hovered ? FLAME : 'rgba(255,255,255,0.85)'} strokeWidth={2} />}
            <Text
                style={{
                    color: hovered ? '#ffffff' : 'rgba(255,255,255,0.85)',
                    fontSize: 15,
                    fontWeight: '600',
                    letterSpacing: 0.2,
                }}
            >
                {title}
            </Text>
        </Pressable>
    );
};

export interface NotFoundViewProps {
    /** Whether this represents an unmatched route ('route') or a missing database record ('record') */
    mode?: 'route' | 'record';
    /** Name of the entity when mode is 'record' (e.g. 'User', 'Bursary', 'Subject') */
    recordType?: string;
    /** Custom title override */
    title?: string;
    /** Custom explanatory text */
    message?: string;
    /** Fallback route to go back to (e.g. '/(admin)/users') */
    backPath?: string;
    /** Optional custom action label */
    actionLabel?: string;
    /** Optional custom action handler */
    onAction?: () => void;
    /** Optional retry action handler */
    onRetry?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
    mode = 'route',
    recordType = 'Record',
    title,
    message,
    backPath,
    actionLabel,
    onAction,
    onRetry,
}) => {
    const { session, profile, isPlatformAdmin, getRoleRedirect } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    // ─── Entrance & Ambient Animations ──────────────────────────────────────────
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(24)).current;
    const cardScale = useRef(new Animated.Value(0.97)).current;
    const logoEntrance = useRef(new Animated.Value(0)).current;

    const iconFloat = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(cardFade, { toValue: 1, duration: 420, easing: EasingRN.out(EasingRN.quad), useNativeDriver: true }),
            Animated.timing(cardSlide, { toValue: 0, duration: 420, easing: EasingRN.out(EasingRN.back(1.4)), useNativeDriver: true }),
            Animated.timing(cardScale, { toValue: 1, duration: 420, easing: EasingRN.out(EasingRN.quad), useNativeDriver: true }),
            Animated.timing(logoEntrance, { toValue: 1, duration: 500, delay: 100, easing: EasingRN.out(EasingRN.quad), useNativeDriver: true }),
        ]).start();

        // Icon floating oscillation
        const floatAnim = Animated.loop(
            Animated.sequence([
                Animated.timing(iconFloat, { toValue: -8, duration: 1800, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
                Animated.timing(iconFloat, { toValue: 0, duration: 1800, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
            ])
        );

        // Glow ring pulse
        const pulseAnim = Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 0.85, duration: 2000, easing: EasingRN.inOut(EasingRN.ease), useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0.4, duration: 2000, easing: EasingRN.inOut(EasingRN.ease), useNativeDriver: true }),
            ])
        );

        floatAnim.start();
        pulseAnim.start();

        return () => {
            floatAnim.stop();
            pulseAnim.stop();
        };
    }, [cardFade, cardSlide, cardScale, logoEntrance, iconFloat, glowPulse]);

    // Determine target dashboard path if user is authenticated
    const roleDashboard = useMemo(() => {
        if (!session || !profile) return null;
        return getRoleRedirect(profile, isPlatformAdmin);
    }, [session, profile, isPlatformAdmin, getRoleRedirect]);

    // Handle primary action press
    const handlePrimaryAction = () => {
        if (onAction) {
            onAction();
            return;
        }

        if (mode === 'record') {
            if (backPath) {
                router.replace(backPath as any);
            } else if (router.canGoBack()) {
                router.back();
            } else if (roleDashboard) {
                router.replace(roleDashboard as any);
            } else {
                router.replace('/');
            }
            return;
        }

        // Mode === 'route'
        if (session && roleDashboard) {
            router.replace(roleDashboard as any);
        } else {
            router.replace('/');
        }
    };

    const handleGoBack = () => {
        if (backPath) {
            router.replace(backPath as any);
        } else if (router.canGoBack()) {
            router.back();
        } else if (roleDashboard) {
            router.replace(roleDashboard as any);
        } else {
            router.replace('/');
        }
    };

    // Resolved copy
    const resolvedTitle = title || (mode === 'record' ? `${recordType} Not Found` : 'Page Not Found');

    const resolvedSubtitle =
        message ||
        (mode === 'record'
            ? `The requested ${recordType.toLowerCase()} could not be located in the system. It may have been archived, removed, or the link may be invalid.`
            : "We searched every classroom, library shelf, and corridor, but couldn't find the page you're looking for. The link might be broken or the URL could have a typo.");

    const resolvedActionLabel =
        actionLabel ||
        (mode === 'record'
            ? backPath
                ? `Back to ${recordType}s`
                : 'Go Back'
            : session
              ? 'Return to Dashboard'
              : 'Back to Home');

    return (
        <>
            <StatusBar barStyle="light-content" />

            {/* Continuous WebGL Aurora living background */}
            <LivingBackground />

            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <SafeAreaView style={{ flex: 1, width: '100%', alignSelf: 'center' }}>
                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 40,
                        }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── LIQUID GLASS CARD ─────────────────────────────────── */}
                        <Animated.View
                            style={{
                                opacity: cardFade,
                                transform: [{ translateY: cardSlide }, { scale: cardScale }],
                                width: '100%',
                                maxWidth: 580,
                            }}
                        >
                            <GlassCard
                                variant="modal"
                                accentColor={FLAME}
                                glowColor="rgba(255, 107, 0, 0.25)"
                                borderRadius={28}
                                style={{ width: '100%' }}
                                contentStyle={{
                                    paddingHorizontal: isDesktop ? 40 : 26,
                                    paddingVertical: isDesktop ? 40 : 32,
                                    alignItems: 'center',
                                }}
                            >
                                {/* ── TOP ROW: Back/Home navigation left / Logo Lockup right ── */}
                                <View
                                    style={{
                                        width: '100%',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 28,
                                    }}
                                >
                                    {/* Back or Home Button */}
                                    <TouchableOpacity
                                        onPress={handleGoBack}
                                        activeOpacity={0.7}
                                        style={[
                                            {
                                                width: 38,
                                                height: 38,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: 13,
                                                backgroundColor: 'rgba(255,255,255,0.06)',
                                                borderWidth: 1,
                                                borderColor: GLASS_BORDER,
                                            },
                                            Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease' } as any) : {},
                                        ]}
                                    >
                                        <ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
                                    </TouchableOpacity>

                                    {/* Logo Lockup */}
                                    <LogoLockup entranceAnim={logoEntrance} />
                                </View>

                                {/* ── VISUAL CENTERPIECE: Ambient Glow + Animated Icon ── */}
                                <View
                                    style={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 20,
                                        position: 'relative',
                                    }}
                                >
                                    {/* Background Radial Glow Ring */}
                                    <Animated.View
                                        pointerEvents="none"
                                        style={[
                                            {
                                                position: 'absolute',
                                                width: 150,
                                                height: 150,
                                                borderRadius: 75,
                                                backgroundColor: FLAME,
                                                opacity: glowPulse,
                                            },
                                            Platform.OS === 'web' ? ({ filter: 'blur(36px)' } as any) : {},
                                        ]}
                                    />

                                    {/* Animated Floating Badge */}
                                    <Animated.View
                                        style={[
                                            {
                                                width: 92,
                                                height: 92,
                                                borderRadius: 46,
                                                backgroundColor: 'rgba(255,107,0,0.12)',
                                                borderWidth: 1.5,
                                                borderColor: 'rgba(255,107,0,0.45)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transform: [{ translateY: iconFloat }],
                                            },
                                            Platform.OS === 'web'
                                                ? ({
                                                      boxShadow: '0 0 28px rgba(255,107,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)',
                                                  } as any)
                                                : {},
                                        ]}
                                    >
                                        {mode === 'record' ? (
                                            <FileQuestion size={44} color={FLAME} strokeWidth={1.8} />
                                        ) : (
                                            <CircleAlert size={44} color={FLAME} strokeWidth={2} />
                                        )}
                                    </Animated.View>
                                </View>

                                {/* ── STATUS PILL ── */}
                                <View
                                    style={[
                                        {
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                            paddingHorizontal: 14,
                                            paddingVertical: 6,
                                            borderRadius: 999,
                                            backgroundColor: FLAME_BG,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,107,0,0.35)',
                                            marginBottom: 16,
                                        },
                                        Platform.OS === 'web' ? ({ boxShadow: '0 0 12px rgba(255,107,0,0.15)' } as any) : {},
                                    ]}
                                >
                                    <Sparkles size={13} color={FLAME} />
                                    <Text
                                        style={{
                                            color: FLAME,
                                            fontSize: 12,
                                            fontWeight: '700',
                                            letterSpacing: 0.8,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {mode === 'record' ? '404 • Resource Missing' : '404 • Lost in the Hallways'}
                                    </Text>
                                </View>

                                {/* ── HEADING ── */}
                                <Text
                                    style={{
                                        color: '#ffffff',
                                        fontSize: isDesktop ? 30 : 24,
                                        fontWeight: '800',
                                        textAlign: 'center',
                                        letterSpacing: -0.5,
                                        marginBottom: 8,
                                    }}
                                >
                                    {resolvedTitle}
                                </Text>

                                {/* Accent Underline Bar */}
                                <View
                                    style={[
                                        {
                                            width: 44,
                                            height: 2.5,
                                            backgroundColor: FLAME,
                                            borderRadius: 2,
                                            marginBottom: 16,
                                        },
                                        Platform.OS === 'web'
                                            ? ({
                                                  boxShadow: `0 0 10px ${FLAME_GLOW}, 0 0 4px rgba(255,107,0,0.5)`,
                                              } as any)
                                            : {},
                                    ]}
                                />

                                {/* ── DESCRIPTION ── */}
                                <Text
                                    style={{
                                        color: 'rgba(255,255,255,0.72)',
                                        fontSize: isDesktop ? 15 : 14,
                                        lineHeight: 23,
                                        textAlign: 'center',
                                        marginBottom: 30,
                                        maxWidth: 460,
                                    }}
                                >
                                    {resolvedSubtitle}
                                </Text>

                                {/* ── ACTION BUTTONS ── */}
                                <View
                                    style={{
                                        width: '100%',
                                        flexDirection: isDesktop ? 'row' : 'column',
                                        gap: 12,
                                        justifyContent: 'center',
                                    }}
                                >
                                    {/* Primary Button */}
                                    <ActionFlameButton
                                        title={resolvedActionLabel}
                                        onPress={handlePrimaryAction}
                                        icon={session ? LayoutDashboard : Home}
                                    />

                                    {/* Secondary Button: Retry or Go Back */}
                                    {onRetry ? (
                                        <ActionGlassButton
                                            title="Try Again"
                                            onPress={onRetry}
                                            icon={RotateCcw}
                                        />
                                    ) : (
                                        <ActionGlassButton
                                            title="Go Back"
                                            onPress={handleGoBack}
                                            icon={ArrowLeft}
                                        />
                                    )}
                                </View>

                                {/* ── QUICK NAVIGATION RECOVERY LINKS ── */}
                                <View
                                    style={{
                                        width: '100%',
                                        marginTop: 28,
                                        paddingTop: 20,
                                        borderTopWidth: 1,
                                        borderTopColor: 'rgba(255,255,255,0.08)',
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: 16,
                                    }}
                                >
                                    {!session ? (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => router.replace('/(auth)/signIn')}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                                activeOpacity={0.7}
                                            >
                                                <LogIn size={15} color={FLAME} />
                                                <Text style={{ fontSize: 13, color: FLAME, fontWeight: '600' }}>
                                                    Sign In
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => router.replace('/')}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                            activeOpacity={0.7}
                                        >
                                            <Compass size={15} color={FLAME} />
                                            <Text style={{ fontSize: 13, color: FLAME, fontWeight: '600' }}>
                                                Campus Portal
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </GlassCard>
                        </Animated.View>

                        {/* ── FOOTER BRAND NOTE ── */}
                        <Text
                            style={{
                                marginTop: 24,
                                fontSize: 12,
                                color: 'rgba(255,255,255,0.35)',
                                textAlign: 'center',
                                letterSpacing: 0.3,
                            }}
                        >
                            Cloudora Solutions LTD
                        </Text>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </>
    );
};
