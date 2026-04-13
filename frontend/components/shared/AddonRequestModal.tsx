import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { X, CheckCircle, Info, Library, MessageSquare, BadgeCent, BarChart3, HelpCircle, Users, Zap } from 'lucide-react-native';
import { api } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';

interface AddonRequestModalProps {
    visible: boolean;
    onClose: () => void;
    currentAddons: Record<string, boolean>;
}

const ADDON_OPTIONS = [
    { key: 'library', label: 'ðŸ“– Digital Library', icon: Library, color: '#FF6B00', desc: 'Manage books, PDFs and student borrowing.' },
    { key: 'messaging', label: 'ðŸ’¬ Messaging + Diary', icon: MessageSquare, color: '#8B5CF6', desc: 'Direct chat, announcements and daily logs.' },
    { key: 'attendance', label: 'ðŸ“‹ Attendance Management', icon: Users, color: '#EC4899', desc: 'Advanced student and teacher tracking.' },
    { key: 'feature_request', label: 'âœ¨ Feature Request', icon: Zap, color: '#F59E0B', desc: 'Describe a new feature or modification you need.' },
    { key: 'finance', label: 'ðŸ’° Accounting Plus', icon: BadgeCent, color: '#10B981', desc: 'Advanced financial reports and fee tracking.' },
    { key: 'analytics', label: 'ðŸ“ˆ Performance Analytics', icon: BarChart3, color: '#3B82F6', desc: 'Student progress and visual data insights.' },
    { key: 'bursary', label: 'ðŸ¦ Bursary Module', icon: HelpCircle, color: '#F59E0B', desc: 'Financial aid tracking and disbursements.' },
];

export const AddonRequestModal = ({ visible, onClose, currentAddons }: AddonRequestModalProps) => {
    const [selectedAddon, setSelectedAddon] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!selectedAddon) {
            Alert.alert('Selection Required', 'Please select an add-on feature to request.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/addon-requests/submit', {
                addon_type: selectedAddon,
                notes: notes
            });
            setSuccess(true);
            showSuccess('Request Sent', 'Your feature request has been submitted to Cloudera Admins.');
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (error: any) {
            console.error('Error submitting addon request:', error);
            showError('Request Failed', error.response?.data?.error || 'Could not submit your request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedAddon(null);
        setNotes('');
        setSuccess(false);
        onClose();
    };

    if (success) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 32, alignItems: 'center', width: '100%', maxWidth: 400 }}>
                        <CheckCircle size={64} color="#10B981" />
                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 24, textAlign: 'center' }}>Request Submitted!</Text>
                        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 12 }}>Our team will review your request and get back to you shortly via email.</Text>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: '60%', boxShadow: [{ offsetX: 0, offsetY: -10, blurRadius: 20, color: 'rgba(0, 0, 0, 0.1)' }], shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 }}>

                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827' }}>Enhance Your Plan</Text>
                            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Request premium features for your institution</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={{ backgroundColor: '#F3F4F6', padding: 8, borderRadius: 20 }}>
                            <X size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select a Feature</Text>

                        <View style={{ gap: 12 }}>
                            {ADDON_OPTIONS.map((item) => {
                                const isOwned = currentAddons[item.key];
                                const isSelected = selectedAddon === item.key;
                                const Icon = item.icon;

                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        onPress={() => !isOwned && setSelectedAddon(item.key)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 16,
                                            borderRadius: 24,
                                            borderWidth: 2,
                                            borderColor: isSelected ? item.color : '#F3F4F6',
                                            backgroundColor: isOwned ? '#F9FAFB' : isSelected ? `${item.color}08` : 'white',
                                            opacity: isOwned ? 0.6 : 1
                                        }}
                                    >
                                        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: isOwned ? '#E5E7EB' : `${item.color}15`, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                            <Icon size={24} color={isOwned ? '#9CA3AF' : item.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: isOwned ? '#9CA3AF' : '#111827' }}>{item.label}</Text>
                                                {isOwned && (
                                                    <View style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Active</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.desc}</Text>
                                        </View>
                                        {!isOwned && (
                                            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isSelected ? item.color : '#D1D5DB', alignItems: 'center', justifyContent: 'center' }}>
                                                {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={{ marginTop: 24 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 }}>Additional Notes (Optional)</Text>
                            <TextInput
                                style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, padding: 16, fontSize: 14, minHeight: 100, textAlignVertical: 'top' }}
                                placeholder="Tell us about your institution's specific needs..."
                                multiline
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading || !selectedAddon}
                            style={{
                                marginTop: 32,
                                backgroundColor: selectedAddon ? '#FF6B00' : '#E5E7EB',
                                paddingVertical: 18,
                                borderRadius: 24,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 10,
                                boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 8, color: 'rgba(255, 107, 0, 0.2)' }],
                                shadowColor: '#FF6B00',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: selectedAddon ? 0.2 : 0,
                                shadowRadius: 8,
                                elevation: 4
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '800' }}>Submit Feature Request</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
