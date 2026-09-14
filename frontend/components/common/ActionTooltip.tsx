import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActionTooltipProps {
    text?: string;
    label?: string;
    description?: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
    learnMoreAnchor?: string;
    onLearnMore?: () => void;
    style?: any;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
    text,
    label,
    description,
    children,
    position = 'top',
    learnMoreAnchor,
    onLearnMore,
    style,
}) => {
    const { isDark } = useTheme();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const hideTimeoutRef = useRef<any>(null);

    if (Platform.OS !== 'web') {
        return <View style={style}>{children}</View>;
    }

    const isTop = position === 'top';

    const clearHideTimer = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    const handleMouseEnter = () => {
        clearHideTimer();
        setVisible(true);
    };

    const handleMouseLeave = () => {
        if (learnMoreAnchor) {
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
        } else if (learnMoreAnchor) {
            router.push({
                pathname: '/(admin)/accessibility/settings' as any,
                params: { manual: '1', anchor: learnMoreAnchor },
            });
        }
    };

    return (
        <View
            style={[styles.container, style]}
            // @ts-ignore - Web DOM event props supported by react-native-web
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={() => setVisible(false)}
        >
            {children}
            {visible && (
                <View
                    // @ts-ignore - Web DOM event props supported by react-native-web
                    onMouseEnter={clearHideTimer}
                    onMouseLeave={handleMouseLeave}
                    style={[
                        styles.tooltipBubble,
                        isTop ? styles.positionTop : styles.positionBottom,
                        {
                            backgroundColor: isDark ? '#1F2937' : '#111827',
                            borderColor: isDark ? '#374151' : '#1F2937',
                            // @ts-ignore - web-specific
                            pointerEvents: learnMoreAnchor ? 'auto' : 'none',
                        },
                    ]}
                >
                    <View style={{ flexDirection: 'column', maxWidth: 260 }}>
                        {label ? (
                            <Text style={[styles.tooltipText, { fontWeight: '700', fontSize: 12 }]} numberOfLines={1}>
                                {label}
                            </Text>
                        ) : null}
                        <Text style={[styles.tooltipText, { fontSize: label ? 11 : 12, opacity: label ? 0.9 : 1 }]} numberOfLines={3}>
                            {description || text || ''}
                        </Text>
                    </View>
                    {learnMoreAnchor ? (
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
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tooltipBubble: {
        position: 'absolute',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        zIndex: 99999,
        // @ts-ignore - web-specific
        whiteSpace: 'nowrap',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    positionTop: {
        bottom: '100%',
        marginBottom: 6,
    },
    positionBottom: {
        top: '100%',
        marginTop: 6,
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    learnMoreBtn: {
        paddingVertical: 1,
        paddingHorizontal: 3,
    },
    learnMoreText: {
        color: '#FF8A3D',
        fontSize: 11,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});
