import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/contexts/ThemeContext';
import { Lock } from 'lucide-react-native';

interface CanProps {
    domain: string;
    action: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showDisabledWithTooltip?: boolean;
    disabledMessage?: string;
}

export const Can: React.FC<CanProps> = ({
    domain,
    action,
    children,
    fallback = null,
    showDisabledWithTooltip = false,
    disabledMessage,
}) => {
    const { can, isDomainVisible, isLoading } = usePermissions();
    const { isDark } = useTheme();
    const [tooltipVisible, setTooltipVisible] = React.useState(false);

    // If permissions are still loading from cold cache, don't flash forbidden content
    if (isLoading) {
        return null;
    }

    const hasPermission = can(domain, action);

    if (hasPermission) {
        return <>{children}</>;
    }

    // If user has view permission on the area, but lacks this specific action (e.g. edit or download),
    // and showDisabledWithTooltip is requested: render control disabled with plain explanation
    if (showDisabledWithTooltip && isDomainVisible(domain)) {
        const message = disabledMessage || 'This action is not included in your assigned job role.';

        return (
            <View style={styles.disabledContainer}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTooltipVisible((prev) => !prev)}
                    style={styles.touchableWrapper}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: true }}
                    accessibilityLabel={message}
                >
                    <View style={styles.disabledContent} pointerEvents="none">
                        {children}
                    </View>
                </TouchableOpacity>

                {tooltipVisible && (
                    <View
                        style={[
                            styles.tooltipBox,
                            {
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                borderColor: isDark ? '#374151' : '#E5E7EB',
                            },
                        ]}
                    >
                        <View style={styles.tooltipHeader}>
                            <Lock size={12} color="#F59E0B" />
                            <Text
                                style={[
                                    styles.tooltipText,
                                    { color: isDark ? '#F3F4F6' : '#1F2937' },
                                ]}
                            >
                                {message}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    // User has no access: render fallback or nothing
    return <>{fallback}</>;
};

const styles = StyleSheet.create({
    disabledContainer: {
        position: 'relative',
        opacity: 0.5,
    },
    touchableWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    disabledContent: {
        opacity: 0.6,
    },
    tooltipBox: {
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 9999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        maxWidth: 240,
    },
    tooltipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tooltipText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
