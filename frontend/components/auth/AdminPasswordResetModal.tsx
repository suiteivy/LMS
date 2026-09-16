import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

export interface VerificationDetails {
    verificationMethod: string;
    verificationNotes?: string;
}

interface AdminPasswordResetModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (verification: VerificationDetails) => Promise<void> | void;
    loading?: boolean;
    targetUser: {
        id?: string;
        name?: string;
        email?: string;
        role?: string;
    } | null;
}

const PRESET_METHODS = [
    {
        id: 'in_person',
        label: 'In-person verification',
        icon: 'account-check-outline',
        description: 'User appeared in person at the administration office.',
    },
    {
        id: 'phone_call',
        label: 'Phone call verification',
        icon: 'phone-check-outline',
        description: 'Verified via known registered phone number on file.',
    },
    {
        id: 'official_id',
        label: 'Official ID presented',
        icon: 'card-account-details-outline',
        description: 'National ID, passport, or birth certificate inspected.',
    },
    {
        id: 'custom',
        label: 'Custom verification method',
        icon: 'form-textbox',
        description: 'Specify an alternative identity verification method.',
    },
];

export const AdminPasswordResetModal: React.FC<AdminPasswordResetModalProps> = ({
    visible,
    onClose,
    onConfirm,
    loading = false,
    targetUser,
}) => {
    const { isDark } = useTheme();
    const [selectedMethod, setSelectedMethod] = useState('in_person');
    const [customMethodText, setCustomMethodText] = useState('');
    const [notes, setNotes] = useState('');
    const [validationError, setValidationError] = useState('');

    const card = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#30363D' : '#E1E4E8';
    const textPrimary = isDark ? '#F0F6FC' : '#111827';
    const textSecondary = isDark ? '#8B949E' : '#6B7280';
    const inputBg = isDark ? '#0D1117' : '#F9FAFB';

    const handleConfirm = () => {
        setValidationError('');
        let finalMethod = selectedMethod;
        if (selectedMethod === 'custom') {
            if (!customMethodText.trim()) {
                setValidationError('Please specify the custom verification method used.');
                return;
            }
            finalMethod = customMethodText.trim();
        }

        onConfirm({
            verificationMethod: finalMethod,
            verificationNotes: notes.trim() || undefined,
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => !loading && onClose()}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                    zIndex: 100000,
                }}
            >
                <View
                    style={{
                        backgroundColor: card,
                        borderColor: border,
                        borderWidth: 1,
                        borderRadius: 18,
                        padding: 22,
                        width: '100%',
                        maxWidth: 480,
                        maxHeight: '92%',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.35,
                        shadowRadius: 18,
                        elevation: 10,
                    }}
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#DC2626" />
                                </View>
                                <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>
                                    Identity Verification
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                disabled={loading}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialCommunityIcons name="close" size={22} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* User Summary Banner */}
                        <View
                            style={{
                                backgroundColor: isDark ? '#0D1117' : '#F3F4F6',
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: border,
                            }}
                        >
                            <Text style={{ color: textSecondary, fontSize: 12 }}>Target User:</Text>
                            <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '700', marginTop: 2 }}>
                                {targetUser?.name || targetUser?.email || 'Selected User'}
                            </Text>
                            {!!targetUser?.email && (
                                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 1 }}>
                                    {targetUser.email} {targetUser.role ? `• ${targetUser.role.toUpperCase()}` : ''}
                                </Text>
                            )}
                        </View>

                        {/* Policy explanation */}
                        <Text style={{ color: textSecondary, fontSize: 12.5, lineHeight: 18, marginBottom: 14 }}>
                            For security compliance and audit trails, confirm how the user’s identity was verified prior to resetting credentials. This reason will be logged in the immutable audit ledger.
                        </Text>

                        {/* Presets List */}
                        <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                            Verification Method <Text style={{ color: '#DC2626' }}>*</Text>
                        </Text>

                        <View style={{ gap: 8, marginBottom: 14 }}>
                            {PRESET_METHODS.map((method) => {
                                const isSelected = selectedMethod === method.id;
                                return (
                                    <TouchableOpacity
                                        key={method.id}
                                        onPress={() => {
                                            setSelectedMethod(method.id);
                                            setValidationError('');
                                        }}
                                        activeOpacity={0.7}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1.5,
                                            borderColor: isSelected ? '#FF6900' : border,
                                            backgroundColor: isSelected
                                                ? (isDark ? 'rgba(255, 105, 0, 0.12)' : 'rgba(255, 105, 0, 0.06)')
                                                : inputBg,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                backgroundColor: isSelected ? '#FF6900' : (isDark ? '#21262D' : '#E5E7EB'),
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: 10,
                                            }}
                                        >
                                            <MaterialCommunityIcons
                                                name={method.icon as any}
                                                size={18}
                                                color={isSelected ? '#FFF' : textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: textPrimary, fontSize: 13.5, fontWeight: isSelected ? '700' : '600' }}>
                                                {method.label}
                                            </Text>
                                            <Text style={{ color: textSecondary, fontSize: 11.5, marginTop: 2 }}>
                                                {method.description}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                            size={18}
                                            color={isSelected ? '#FF6900' : textSecondary}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom Method Text Input */}
                        {selectedMethod === 'custom' && (
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{ color: textPrimary, fontSize: 12.5, fontWeight: '700', marginBottom: 6 }}>
                                    Specify Custom Method <Text style={{ color: '#DC2626' }}>*</Text>
                                </Text>
                                <TextInput
                                    value={customMethodText}
                                    onChangeText={(txt) => {
                                        setCustomMethodText(txt);
                                        if (validationError) setValidationError('');
                                    }}
                                    placeholder="e.g., Video call with national ID verification"
                                    placeholderTextColor={textSecondary}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: validationError ? '#DC2626' : border,
                                        borderRadius: 10,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        color: textPrimary,
                                        backgroundColor: inputBg,
                                        fontSize: 13,
                                    }}
                                />
                            </View>
                        )}

                        {/* Verification Notes / Reference Number */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: textPrimary, fontSize: 12.5, fontWeight: '600', marginBottom: 6 }}>
                                Reference Notes / ID Number (Optional)
                            </Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="e.g., ID: 29841029 or call made to parent 0712345678"
                                placeholderTextColor={textSecondary}
                                style={{
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    color: textPrimary,
                                    backgroundColor: inputBg,
                                    fontSize: 13,
                                }}
                            />
                        </View>

                        {/* Validation Error Banner */}
                        {!!validationError && (
                            <View
                                style={{
                                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                                    borderWidth: 1,
                                    borderColor: '#DC2626',
                                    borderRadius: 10,
                                    padding: 10,
                                    marginBottom: 14,
                                }}
                            >
                                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>
                                    {validationError}
                                </Text>
                            </View>
                        )}

                        {/* Action buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
                            <TouchableOpacity
                                onPress={onClose}
                                disabled={loading}
                                style={{
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderRadius: 10,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    backgroundColor: inputBg,
                                }}
                            >
                                <Text style={{ color: textSecondary, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>

                            {(() => {
                                const canConfirm = !loading && (selectedMethod !== 'custom' || !!customMethodText.trim());
                                return (
                                    <TouchableOpacity
                                        onPress={handleConfirm}
                                        disabled={!canConfirm}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: '#DC2626',
                                            borderRadius: 10,
                                            paddingHorizontal: 18,
                                            paddingVertical: 10,
                                            backgroundColor: '#DC2626',
                                            minWidth: 130,
                                            alignItems: 'center',
                                            opacity: canConfirm ? 1 : 0.5,
                                        }}
                                        accessibilityState={{ disabled: !canConfirm, busy: loading }}
                                    >
                                        {loading ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={{ color: '#FFF', fontWeight: '800' }}>Confirm Reset</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })()}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
