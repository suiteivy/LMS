import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    targetName?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    loading?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    targetName,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    loading = false,
    icon,
    onConfirm,
    onClose,
}) => {
    const { isDark } = useTheme();

    const bgCard = isDark ? '#161B22' : '#FFFFFF';
    const borderCard = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#F9FAFB' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const defaultIcon = isDestructive ? 'alert-circle' : 'help-circle';
    const activeIcon = icon || defaultIcon;

    const accentColor = isDestructive ? '#DC2626' : '#FF6900';
    const accentBg = isDestructive
        ? (isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2')
        : (isDark ? 'rgba(255, 105, 0, 0.15)' : '#FFF7ED');
    const accentBorder = isDestructive
        ? (isDark ? 'rgba(220, 38, 38, 0.3)' : '#FEE2E2')
        : (isDark ? 'rgba(255, 105, 0, 0.3)' : '#FFEDD5');

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={loading ? undefined : onClose}
        >
            <View style={styles.overlay}>
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: bgCard,
                            borderColor: borderCard,
                        },
                    ]}
                >
                    {/* Icon & Title Row */}
                    <View style={styles.header}>
                        <View
                            style={[
                                styles.iconContainer,
                                {
                                    backgroundColor: accentBg,
                                    borderColor: accentBorder,
                                },
                            ]}
                        >
                            <Ionicons name={activeIcon} size={24} color={accentColor} />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.title, { color: textPrimary }]}>
                                {title}
                            </Text>
                            {targetName ? (
                                <Text style={[styles.targetName, { color: accentColor }]} numberOfLines={1}>
                                    {targetName}
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    {/* Consequence Message */}
                    <Text style={[styles.message, { color: textSecondary }]}>
                        {message}
                    </Text>

                    {/* Action Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={loading}
                            style={[
                                styles.cancelButton,
                                {
                                    borderColor: borderCard,
                                    backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                                    opacity: loading ? 0.6 : 1,
                                },
                            ]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.cancelButtonText, { color: textPrimary }]}>
                                {cancelText}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            disabled={loading}
                            style={[
                                styles.confirmButton,
                                {
                                    backgroundColor: accentColor,
                                    opacity: loading ? 0.7 : 1,
                                },
                            ]}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.confirmButtonText}>
                                    {confirmText}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 999999,
        elevation: 999999,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        borderRadius: 20,
        borderWidth: 1,
        padding: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    targetName: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 22,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    confirmButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});
