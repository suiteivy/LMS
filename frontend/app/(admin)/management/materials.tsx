import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    ActivityIndicator, TextInput, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

type ResourceItem = {
    id: string;
    title: string;
    url: string;
    type: string;
    status: string;
    created_at: string;
    subject: { title: string } | null;
    teacher: { user: { full_name: string; email: string } | null } | null;
};

const TYPE_ICONS: Record<string, string> = {
    pdf: 'file-pdf-box',
    video: 'video',
    link: 'link-variant',
    image: 'image',
    other: 'file',
};

const TYPE_COLORS: Record<string, string> = {
    pdf: '#ef4444',
    video: '#8b5cf6',
    link: '#3b82f6',
    image: '#10b981',
    other: '#6b7280',
};

export default function AdminMaterialsScreen() {
    const { isDark } = useTheme();
    const { session } = useAuth();
    const getToken = () => session?.access_token || '';
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [allResources, setAllResources] = useState<ResourceItem[]>([]);

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#111827',
        subtext: isDark ? '#94a3b8' : '#6b7280',
        border: isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb',
        inputBg: isDark ? '#1a1645' : '#f9fafb',
        primary: '#FF6B00',
    };

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001';

    const fetchPending = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiUrl}/api/resources/pending`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (res.ok) setResources(data);
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load pending materials' });
        } finally {
            setLoading(false);
        }
    };

    const fetchAll = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiUrl}/api/resources`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (res.ok) setAllResources(data);
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load materials' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'pending') fetchPending();
        else fetchAll();
    }, [activeTab]);

    const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
        setSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/api/resources/${id}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status, feedback }),
            });
            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: `Material ${status}`, text2: data.message });
                setSelectedResource(null);
                setFeedback('');
                fetchPending();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Network error' });
        } finally {
            setSubmitting(false);
        }
    };

    const displayList = activeTab === 'pending' ? resources : allResources;

    const renderItem = ({ item }: { item: ResourceItem }) => {
        const icon = TYPE_ICONS[item.type] || 'file';
        const color = TYPE_COLORS[item.type] || '#6b7280';
        const teacher = item.teacher?.user?.full_name || 'Unknown Teacher';
        const subject = item.subject?.title || 'Unknown Subject';
        const date = new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        const statusColor = item.status === 'approved' ? '#10b981' : item.status === 'rejected' ? '#ef4444' : '#f59e0b';
        const statusBg = item.status === 'approved' ? '#D1FAE5' : item.status === 'rejected' ? '#FEE2E2' : '#FEF3C7';

        return (
            <TouchableOpacity
                onPress={() => item.status === 'pending' ? setSelectedResource(item) : null}
                style={{
                    backgroundColor: themeColors.card,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                }}
                activeOpacity={item.status === 'pending' ? 0.7 : 1}
            >
                <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: `${color}15`,
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={color} />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={{ color: themeColors.subtext, fontSize: 12, marginTop: 2 }}>
                        {subject} • {teacher}
                    </Text>
                    <Text style={{ color: themeColors.subtext, fontSize: 11, marginTop: 2 }}>
                        {date} • {item.type.toUpperCase()}
                    </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                            {item.status}
                        </Text>
                    </View>
                    {item.status === 'pending' && (
                        <MaterialCommunityIcons name="chevron-right" size={16} color={themeColors.subtext} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
                paddingTop: 10, paddingBottom: 16, gap: 12
            }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: themeColors.text }}>Materials Review</Text>
                    <Text style={{ color: themeColors.subtext, fontSize: 13 }}>
                        {resources.length} pending approval{resources.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => activeTab === 'pending' ? fetchPending() : fetchAll()}>
                    <MaterialCommunityIcons name="refresh" size={22} color={themeColors.text} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={{
                flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                borderRadius: 12, padding: 4
            }}>
                {(['pending', 'all'] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={{
                            flex: 1, paddingVertical: 10, alignItems: 'center',
                            backgroundColor: activeTab === tab ? themeColors.card : 'transparent',
                            borderRadius: 8
                        }}
                    >
                        <Text style={{
                            fontWeight: '700',
                            color: activeTab === tab ? themeColors.primary : themeColors.subtext
                        }}>
                            {tab === 'pending' ? `Pending (${resources.length})` : 'All Materials'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                </View>
            ) : (
                <FlatList
                    data={displayList}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 60 }}>
                            <MaterialCommunityIcons
                                name={activeTab === 'pending' ? 'check-circle-outline' : 'folder-open-outline'}
                                size={56}
                                color={themeColors.border}
                            />
                            <Text style={{ color: themeColors.subtext, marginTop: 16, fontSize: 16, fontWeight: '600' }}>
                                {activeTab === 'pending' ? 'No pending approvals' : 'No materials yet'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Approval Modal */}
            <Modal visible={selectedResource !== null} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: themeColors.card,
                        borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        padding: 24, paddingBottom: 40
                    }}>
                        {/* Handle */}
                        <View style={{
                            width: 40, height: 4, borderRadius: 2,
                            backgroundColor: themeColors.border,
                            alignSelf: 'center', marginBottom: 20
                        }} />

                        <Text style={{ fontSize: 18, fontWeight: '800', color: themeColors.text, marginBottom: 4 }}>
                            Review Material
                        </Text>
                        <Text style={{ color: themeColors.subtext, fontSize: 13, marginBottom: 20 }}>
                            {selectedResource?.title}
                        </Text>

                        <View style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                            borderRadius: 14, padding: 14, marginBottom: 16, gap: 8
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: themeColors.subtext, fontSize: 13 }}>Subject</Text>
                                <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 13 }}>
                                    {selectedResource?.subject?.title || '-'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: themeColors.subtext, fontSize: 13 }}>Teacher</Text>
                                <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 13 }}>
                                    {selectedResource?.teacher?.user?.full_name || '-'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: themeColors.subtext, fontSize: 13 }}>Type</Text>
                                <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 13 }}>
                                    {selectedResource?.type?.toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: themeColors.subtext, fontSize: 13 }}>URL</Text>
                                <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 12 }} numberOfLines={1}>
                                    {selectedResource?.url}
                                </Text>
                            </View>
                        </View>

                        <Text style={{ color: themeColors.subtext, fontSize: 12, marginBottom: 8, fontWeight: '600' }}>
                            FEEDBACK (optional)
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: themeColors.inputBg,
                                borderRadius: 12, padding: 14, marginBottom: 20,
                                color: themeColors.text, borderWidth: 1, borderColor: themeColors.border,
                                minHeight: 80, textAlignVertical: 'top', fontSize: 14
                            }}
                            placeholder="Add feedback for the teacher..."
                            placeholderTextColor={themeColors.subtext}
                            value={feedback}
                            onChangeText={setFeedback}
                            multiline
                        />

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                            <TouchableOpacity
                                onPress={() => { setSelectedResource(null); setFeedback(''); }}
                                style={{
                                    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
                                    borderWidth: 1, borderColor: themeColors.border, alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: themeColors.subtext, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => selectedResource && handleApprove(selectedResource.id, 'rejected')}
                                disabled={submitting}
                                style={{
                                    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
                                    backgroundColor: '#FEE2E2', alignItems: 'center', opacity: submitting ? 0.6 : 1
                                }}
                            >
                                <Text style={{ color: '#DC2626', fontWeight: '700' }}>Reject</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => selectedResource && handleApprove(selectedResource.id, 'approved')}
                                disabled={submitting}
                                style={{
                                    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
                                    backgroundColor: '#10b981', alignItems: 'center', flex: 1,
                                    opacity: submitting ? 0.6 : 1
                                }}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '700' }}>✓ Approve</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
