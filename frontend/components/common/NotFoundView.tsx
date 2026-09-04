import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/appTheme';
import {
    CircleAlert,
    FileQuestion,
    Home,
    ArrowLeft,
    HelpCircle,
    LogIn,
    LayoutDashboard,
    Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const { isDark } = useTheme();
    const { session, profile, isPlatformAdmin, getRoleRedirect } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;

    const colors = isDark ? darkColors : lightColors;

    // Subtle floating animation for the icon badge
    const translateY = useSharedValue(0);
    const pulseOpacity = useSharedValue(0.5);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, [translateY, pulseOpacity]);

    const floatingStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    // Determine target dashboard path if user is authenticated
    const roleDashboard = React.useMemo(() => {
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
    const resolvedTitle = title || (
        mode === 'record'
            ? `${recordType} Not Found`
            : 'Page Not Found'
    );

    const resolvedSubtitle = message || (
        mode === 'record'
            ? `The requested ${recordType.toLowerCase()} could not be located in the system. It may have been archived, removed, or the link may be invalid.`
            : "We searched every classroom, library shelf, and corridor, but couldn't find the page you're looking for. The link might be broken or the URL could have a typo."
    );

    const resolvedActionLabel = actionLabel || (
        mode === 'record'
            ? (backPath ? `Back to ${recordType}s` : 'Go Back')
            : (session ? 'Return to Dashboard' : 'Back to Home')
    );

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: colors.bg,
            }}
        >
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                    paddingVertical: 40,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Card */}
                <View
                    style={{
                        width: '100%',
                        maxWidth: 580,
                        backgroundColor: colors.surface,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: isDesktop ? 40 : 24,
                        paddingVertical: isDesktop ? 44 : 32,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: isDark ? 0.4 : 0.08,
                        shadowRadius: 24,
                        elevation: 6,
                    }}
                >
                    {/* Ambient Glow & Icon Badge */}
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                        {/* Background Glow Ring */}
                        <Reanimated.View
                            style={[
                                {
                                    position: 'absolute',
                                    width: 130,
                                    height: 130,
                                    borderRadius: 65,
                                    backgroundColor: colors.accent,
                                    filter: 'blur(32px)',
                                },
                                glowStyle,
                            ]}
                        />

                        {/* Animated Icon Container */}
                        <Reanimated.View
                            style={[
                                {
                                    width: 88,
                                    height: 88,
                                    borderRadius: 44,
                                    backgroundColor: isDark ? colors.surface2 : '#FFF5ED',
                                    borderWidth: 1.5,
                                    borderColor: colors.accentBorder,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                },
                                floatingStyle,
                            ]}
                        >
                            {mode === 'record' ? (
                                <FileQuestion size={44} color={colors.accent} strokeWidth={1.75} />
                            ) : (
                                <CircleAlert size={44} color={colors.accent} strokeWidth={2} />
                            )}
                        </Reanimated.View>
                    </View>

                    {/* Status Pill */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderRadius: 999,
                            backgroundColor: colors.accentDim,
                            borderWidth: 1,
                            borderColor: colors.accentBorder,
                            marginBottom: 16,
                        }}
                    >
                        <Sparkles size={13} color={colors.accent} />
                        <Text
                            style={{
                                color: colors.accent,
                                fontSize: 12,
                                fontWeight: '700',
                                letterSpacing: 0.8,
                                textTransform: 'uppercase',
                            }}
                        >
                            {mode === 'record' ? '404 • Resource Missing' : '404 • Lost in the Hallways'}
                        </Text>
                    </View>

                    {/* Title */}
                    <Text
                        style={{
                            color: colors.text,
                            fontSize: isDesktop ? 28 : 24,
                            fontWeight: '800',
                            textAlign: 'center',
                            marginBottom: 10,
                            letterSpacing: -0.5,
                        }}
                    >
                        {resolvedTitle}
                    </Text>

                    {/* Description */}
                    <Text
                        style={{
                            color: colors.textSub,
                            fontSize: isDesktop ? 15 : 14,
                            lineHeight: 23,
                            textAlign: 'center',
                            marginBottom: 28,
                            maxWidth: 460,
                        }}
                    >
                        {resolvedSubtitle}
                    </Text>

                    {/* Action Buttons */}
                    <View
                        style={{
                            width: '100%',
                            flexDirection: isDesktop ? 'row' : 'column',
                            gap: 12,
                            justifyContent: 'center',
                        }}
                    >
                        {/* Primary Button */}
                        <TouchableOpacity
                            onPress={handlePrimaryAction}
                            activeOpacity={0.85}
                            style={{
                                flex: isDesktop ? 1 : undefined,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                backgroundColor: colors.accent,
                                paddingVertical: 14,
                                paddingHorizontal: 20,
                                borderRadius: 14,
                                shadowColor: colors.accent,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.25,
                                shadowRadius: 8,
                                elevation: 3,
                            }}
                        >
                            {session ? (
                                <LayoutDashboard size={18} color="#ffffff" strokeWidth={2} />
                            ) : (
                                <Home size={18} color="#ffffff" strokeWidth={2} />
                            )}
                            <Text
                                style={{
                                    color: '#ffffff',
                                    fontSize: 15,
                                    fontWeight: '700',
                                }}
                            >
                                {resolvedActionLabel}
                            </Text>
                        </TouchableOpacity>

                        {/* Secondary Button: Go Back or Retry */}
                        {onRetry ? (
                            <TouchableOpacity
                                onPress={onRetry}
                                activeOpacity={0.8}
                                style={{
                                    flex: isDesktop ? 1 : undefined,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    backgroundColor: colors.surface2,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    paddingVertical: 14,
                                    paddingHorizontal: 20,
                                    borderRadius: 14,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 15,
                                        fontWeight: '600',
                                    }}
                                >
                                    Try Again
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleGoBack}
                                activeOpacity={0.8}
                                style={{
                                    flex: isDesktop ? 1 : undefined,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    backgroundColor: colors.surface2,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    paddingVertical: 14,
                                    paddingHorizontal: 20,
                                    borderRadius: 14,
                                }}
                            >
                                <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 15,
                                        fontWeight: '600',
                                    }}
                                >
                                    Go Back
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Quick Navigation Links (for route mode when not logged in) */}
                    {mode === 'route' && !session && (
                        <View
                            style={{
                                width: '100%',
                                marginTop: 28,
                                paddingTop: 20,
                                borderTopWidth: 1,
                                borderTopColor: colors.borderLight,
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: 16,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => router.replace('/(auth)/signIn')}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            >
                                <LogIn size={15} color={colors.accent} />
                                <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>
                                    Sign In
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Footer Brand Note */}
                <Text
                    style={{
                        marginTop: 24,
                        fontSize: 12,
                        color: colors.textMuted,
                        textAlign: 'center',
                    }}
                >
                    Cloudora LTD
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};
