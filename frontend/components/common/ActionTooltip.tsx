import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SETTINGS_TOOLTIPS, type TooltipTargetId } from '@/components/settings/tooltips.config';

let createPortal: any = null;
if (Platform.OS === 'web') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        createPortal = require('react-dom').createPortal;
    } catch {
        // fallback
    }
}

interface ActionTooltipProps {
    targetId?: TooltipTargetId;
    text?: string;
    label?: string;
    description?: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
    learnMoreAnchor?: string;
    onLearnMore?: () => void;
    style?: any;
    className?: string;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
    targetId,
    text,
    label,
    description,
    children,
    position = 'top',
    learnMoreAnchor,
    onLearnMore,
    style,
    className,
}) => {
    const { isDark } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; isTop: boolean } | null>(null);
    const containerRef = useRef<any>(null);
    const hideTimeoutRef = useRef<any>(null);

    const entry = targetId ? SETTINGS_TOOLTIPS[targetId] : undefined;
    const resolvedLabel = label || entry?.title;
    const resolvedText = description || text || entry?.text;
    const resolvedAnchor = learnMoreAnchor || entry?.learnMoreAnchor;

    if (Platform.OS !== 'web') {
        return <View style={style} className={className}>{children}</View>;
    }

    const clearHideTimer = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    const updateCoords = () => {
        if (!containerRef.current || typeof window === 'undefined') return;
        const node = containerRef.current;
        const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null;
        if (!rect) return;

        const spaceAbove = rect.top;
        const isTopPreferred = position === 'top';
        const useTop = isTopPreferred ? spaceAbove >= 48 : spaceAbove < 48;

        const estimatedWidth = resolvedAnchor ? 280 : Math.min(260, Math.max(80, (resolvedText?.length || 10) * 8 + 24));
        const center = rect.left + rect.width / 2;
        const clampedCenter = Math.max(estimatedWidth / 2 + 12, Math.min(window.innerWidth - estimatedWidth / 2 - 12, center));

        setCoords({
            top: useTop ? rect.top - 8 : rect.bottom + 8,
            left: clampedCenter,
            isTop: useTop,
        });
    };

    const handleMouseEnter = () => {
        clearHideTimer();
        updateCoords();
        setVisible(true);
    };

    const handleMouseLeave = () => {
        if (resolvedAnchor) {
            clearHideTimer();
            hideTimeoutRef.current = setTimeout(() => {
                setVisible(false);
            }, 180);
        } else {
            setVisible(false);
        }
    };

    const handleLearnMorePress = () => {
        setVisible(false);
        if (onLearnMore) {
            onLearnMore();
        } else if (resolvedAnchor) {
            const isTeacher = pathname?.includes('(teacher)') || (typeof window !== 'undefined' && window.location.pathname.includes('/teacher'));
            const targetPath = isTeacher ? '/(teacher)/accessibility/settings' : '/(admin)/accessibility/settings';
            router.push({
                pathname: targetPath as any,
                params: { manual: '1', anchor: resolvedAnchor },
            });
        }
    };

    useEffect(() => {
        if (!visible) return;
        const handleScrollOrResize = () => {
            updateCoords();
        };
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [visible]);

    const renderTooltipBubble = () => {
        if (!visible || !coords) return null;

        const bubble = (
            <View
                // @ts-ignore - Web DOM event props supported by react-native-web
                onMouseEnter={clearHideTimer}
                onMouseLeave={handleMouseLeave}
                style={[
                    styles.tooltipBubblePortal,
                    {
                        left: coords.left,
                        ...(coords.isTop
                            ? { bottom: typeof window !== 'undefined' ? window.innerHeight - coords.top : 0 }
                            : { top: coords.top }),
                        backgroundColor: isDark ? '#1F2937' : '#111827',
                        borderColor: isDark ? '#374151' : '#1F2937',
                        // @ts-ignore - web-specific
                        pointerEvents: resolvedAnchor ? 'auto' : 'none',
                    },
                ]}
            >
                <View style={{ flexDirection: 'column', maxWidth: 280, minWidth: 60, gap: 4 }}>
                    {resolvedLabel ? (
                        <Text style={[styles.tooltipText, { fontWeight: '700', fontSize: 12, marginBottom: resolvedText ? 2 : 0 }]}>
                            {resolvedLabel}
                        </Text>
                    ) : null}
                    {resolvedText ? (
                        <Text style={[styles.tooltipText, { fontSize: resolvedLabel ? 11 : 12, opacity: resolvedLabel ? 0.9 : 1, lineHeight: 16 }]}>
                            {resolvedText}
                        </Text>
                    ) : null}
                    {resolvedAnchor ? (
                        <TouchableOpacity
                            onPress={handleLearnMorePress}
                            style={styles.learnMoreBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Learn more"
                        >
                            <Text style={styles.learnMoreText}>Learn more →</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        );

        if (createPortal && typeof document !== 'undefined' && document.body) {
            return createPortal(bubble, document.body);
        }
        return bubble;
    };

    return (
        <View
            ref={containerRef}
            style={[styles.container, style]}
            className={className}
            // @ts-ignore - Web DOM event props supported by react-native-web
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={() => setVisible(false)}
        >
            {children}
            {renderTooltipBubble()}
        </View>
    );
};

const styles: any = StyleSheet.create({
    container: {
        position: 'relative',
    },
    tooltipBubblePortal: {
        position: 'fixed' as any,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        zIndex: 9999999,
        // @ts-ignore - web-specific
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        elevation: 100,
        flexDirection: 'column',
        alignItems: 'flex-start',
        // @ts-ignore - web-specific width and transform
        width: 'max-content',
        maxWidth: 290,
        transform: [{ translateX: '-50%' }],
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    learnMoreBtn: {
        paddingTop: 4,
        alignSelf: 'flex-start',
    },
    learnMoreText: {
        color: '#FF8A3D',
        fontSize: 11,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});
