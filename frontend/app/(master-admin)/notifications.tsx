import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import Toast from 'react-native-toast-message';
import { ListItemSkeleton } from '@/components/ui/skeletons';

type Institution = { id: string; name: string };

type NoticeItem = {
    notice_id: string;
    title: string;
    message: string;
    target: 'all_admins' | 'specific';
    institution_id: string | null;
    institution_name: string | null;
    created_at: string;
    recipient_count: number;
    delivered_count: number;
    failed_count: number;
    retry_scheduled_count: number;
    notification_ids?: string[];
    expires_at?: string | null;
};

const getBackendUrl = () => (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || 'http://localhost:4001').replace(/\/api\/?$/, '');

const NOTICE_EXPIRY_DEFAULT_DAYS = 2;
const NOTICE_EXPIRY_MIN_DAYS = 1;
const NOTICE_EXPIRY_MAX_DAYS = 365;

const parseDaysInput = (raw: string, fallback = NOTICE_EXPIRY_DEFAULT_DAYS) => {
    const parsed = Number.parseInt(String(raw || '').trim(), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(NOTICE_EXPIRY_MAX_DAYS, Math.max(NOTICE_EXPIRY_MIN_DAYS, parsed));
};

const parseRawDaysInput = (raw: string) => Number.parseInt(String(raw || '').trim(), 10);

const formatCountdown = (expiresAt: string | null | undefined, nowMs: number) => {
    if (!expiresAt) return 'No expiry';
    const endMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(endMs)) return 'No expiry';
    const remaining = endMs - nowMs;
    if (remaining <= 0) return 'Expired';

    const totalMinutes = Math.floor(remaining / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    return `${days}d ${hours}h ${minutes}m left`;
};

export default function MasterNotifications() {
    const { isDark } = useTheme();

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [expiryDays, setExpiryDays] = useState(String(NOTICE_EXPIRY_DEFAULT_DAYS));
    const [loading, setLoading] = useState(false);
    const [target, setTarget] = useState<'all_admins' | 'specific'>('all_admins');
    const [institutionId, setInstitutionId] = useState<string>('');
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [showInstitutionSelector, setShowInstitutionSelector] = useState(false);

    const [historyLoading, setHistoryLoading] = useState(true);
    const [history, setHistory] = useState<NoticeItem[]>([]);
    const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editMessage, setEditMessage] = useState('');
    const [savingNotice, setSavingNotice] = useState(false);
    const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);
    const [confirmDeleteNoticeId, setConfirmDeleteNoticeId] = useState<string | null>(null);
    const [extendingNoticeId, setExtendingNoticeId] = useState<string | null>(null);
    const [extendDaysInput, setExtendDaysInput] = useState('1');
    const [applyingExtendNoticeId, setApplyingExtendNoticeId] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState(Date.now());

    const colors = {
        pageBg: isDark ? '#0D1117' : '#F6F8FA',
        cardBg: isDark ? '#161B22' : '#FFFFFF',
        text: isDark ? '#E6EDF3' : '#111827',
        subtext: isDark ? '#8B949E' : '#6B7280',
        border: isDark ? '#4B5563' : '#9CA3AF',
        primary: '#FF6B00',
        inputBg: isDark ? '#111827' : '#F3F4F6',
    };

    const backendUrl = useMemo(() => {
        let url = getBackendUrl();
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    }, []);

    const selectedInstitutionName = useMemo(() => {
        return institutions.find((i) => i.id === institutionId)?.name || 'Select Institution';
    }, [institutionId, institutions]);

    const fetchInstitutions = useCallback(async () => {
        const { data, error } = await supabase
            .from('institutions')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            console.error('fetchInstitutions error:', error);
            return;
        }
        setInstitutions(data || []);
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setHistory([]);
                setHistoryLoading(false);
                return;
            }

            const res = await fetch(`${backendUrl}/api/master-admin/notifications/history`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'Failed', text2: data?.error || 'Could not load notices', position: 'top' });
                setHistory([]);
                setHistoryLoading(false);
                return;
            }

            setHistory(Array.isArray(data?.notices) ? data.notices : []);
        } catch (err) {
            console.error('fetchHistory error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Could not load notice history', position: 'top' });
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [backendUrl]);

    useEffect(() => {
        fetchInstitutions();
        fetchHistory();
    }, [fetchHistory, fetchInstitutions]);

    useEffect(() => {
        const tick = () => setNowMs(Date.now());
        const interval = setInterval(tick, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (target !== 'specific') {
            setInstitutionId('');
            setShowInstitutionSelector(false);
        }
    }, [target]);

    const dispatchNotification = async () => {
        if (!title.trim() || !message.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please provide both title and message', position: 'top' });
            return;
        }

        if (target === 'specific' && !institutionId) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select an institution', position: 'top' });
            return;
        }

        const rawExpiryDays = parseRawDaysInput(expiryDays);
        if (!Number.isFinite(rawExpiryDays) || rawExpiryDays < NOTICE_EXPIRY_MIN_DAYS || rawExpiryDays > NOTICE_EXPIRY_MAX_DAYS) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: `Expiry days must be between ${NOTICE_EXPIRY_MIN_DAYS} and ${NOTICE_EXPIRY_MAX_DAYS}`, position: 'top' });
            return;
        }
        const normalizedExpiryDays = parseDaysInput(expiryDays);

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const payload: Record<string, unknown> = {
                title: title.trim(),
                message: message.trim(),
                target,
                expiry_days: normalizedExpiryDays,
            };
            if (target === 'specific') payload.institution_id = institutionId;

            const res = await fetch(`${backendUrl}/api/master-admin/notifications`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'Dispatch Failed', text2: data?.error || 'Could not dispatch notice', position: 'top' });
                return;
            }

            const delivered = Number(data?.delivered || 0);
            const failed = Number(data?.failed || 0);
            const recipients = Number(data?.count || 0);

            Toast.show({
                type: failed > 0 ? 'info' : 'success',
                text1: 'Notice Dispatched',
                text2: `Recipients: ${recipients}, Delivered: ${delivered}, Failed: ${failed}`,
                position: 'top',
            });

            setTitle('');
            setMessage('');
            setExpiryDays(String(NOTICE_EXPIRY_DEFAULT_DAYS));
            setInstitutionId('');
            setTarget('all_admins');
            setShowInstitutionSelector(false);
            fetchHistory();
        } catch (err) {
            console.error('dispatchNotification error:', err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to dispatch notifications', position: 'top' });
        } finally {
            setLoading(false);
        }
    };

    const startEditNotice = (notice: NoticeItem) => {
        setEditingNoticeId(notice.notice_id);
        setEditTitle(notice.title || '');
        setEditMessage(notice.message || '');
    };

    const cancelEditNotice = () => {
        if (savingNotice) return;
        setEditingNoticeId(null);
        setEditTitle('');
        setEditMessage('');
    };

    const saveNoticeEdit = async (noticeId: string) => {
        if (savingNotice) return;
        if (!editTitle.trim() || !editMessage.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Title and message are required', position: 'top' });
            return;
        }

        try {
            setSavingNotice(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${backendUrl}/api/master-admin/notifications/${noticeId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ title: editTitle.trim(), message: editMessage.trim() }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'Update Failed', text2: data?.error || 'Could not update notice', position: 'top' });
                setSavingNotice(false);
                return;
            }

            setHistory((prev) => prev.map((n) => n.notice_id === noticeId
                ? { ...n, title: editTitle.trim(), message: editMessage.trim() }
                : n));
            Toast.show({ type: 'success', text1: 'Notice Updated', text2: 'Changes saved successfully', position: 'top' });
            setEditingNoticeId(null);
            setEditTitle('');
            setEditMessage('');
        } catch (err) {
            console.error('saveNoticeEdit error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Failed to update notice', position: 'top' });
        } finally {
            setSavingNotice(false);
        }
    };

    const requestDeleteNotice = (noticeId: string) => {
        setConfirmDeleteNoticeId(noticeId);
    };

    const cancelDeleteNotice = () => {
        if (deletingNoticeId) return;
        setConfirmDeleteNoticeId(null);
    };

    const confirmDeleteNotice = async (noticeId: string) => {
        if (deletingNoticeId) return;

        try {
            setDeletingNoticeId(noticeId);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${backendUrl}/api/master-admin/notifications/${noticeId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'Delete Failed', text2: data?.error || 'Could not delete notice', position: 'top' });
                setDeletingNoticeId(null);
                return;
            }

            setHistory((prev) => prev.filter((n) => n.notice_id !== noticeId));
            Toast.show({ type: 'success', text1: 'Notice Deleted', text2: 'Notice removed successfully', position: 'top' });
            if (editingNoticeId === noticeId) {
                setEditingNoticeId(null);
                setEditTitle('');
                setEditMessage('');
            }
            setConfirmDeleteNoticeId(null);
        } catch (err) {
            console.error('confirmDeleteNotice error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Failed to delete notice', position: 'top' });
        } finally {
            setDeletingNoticeId(null);
        }
    };

    const requestExtendNotice = (noticeId: string) => {
        if (applyingExtendNoticeId) return;
        setExtendingNoticeId(noticeId);
        setExtendDaysInput('1');
    };

    const cancelExtendNotice = () => {
        if (applyingExtendNoticeId) return;
        setExtendingNoticeId(null);
        setExtendDaysInput('1');
    };

    const confirmExtendNotice = async (noticeId: string) => {
        if (applyingExtendNoticeId) return;
        const rawExtendDays = parseRawDaysInput(extendDaysInput);
        if (!Number.isFinite(rawExtendDays) || rawExtendDays < NOTICE_EXPIRY_MIN_DAYS || rawExtendDays > NOTICE_EXPIRY_MAX_DAYS) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: `Extend days must be between ${NOTICE_EXPIRY_MIN_DAYS} and ${NOTICE_EXPIRY_MAX_DAYS}`, position: 'top' });
            return;
        }
        const extendDays = parseDaysInput(extendDaysInput);

        try {
            setApplyingExtendNoticeId(noticeId);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${backendUrl}/api/master-admin/notifications/${noticeId}/extend-expiry`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ extend_days: extendDays }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'Extend Failed', text2: data?.error || 'Could not extend notice expiry', position: 'top' });
                return;
            }

            const nextExpiry = data?.expires_at || null;
            setHistory((prev) => prev.map((n) => n.notice_id === noticeId ? { ...n, expires_at: nextExpiry } : n));
            Toast.show({ type: 'success', text1: 'Expiry Extended', text2: `Extended by ${extendDays} day(s)`, position: 'top' });
            setExtendingNoticeId(null);
            setExtendDaysInput('1');
        } catch (err) {
            console.error('confirmExtendNotice error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Failed to extend notice expiry', position: 'top' });
        } finally {
            setApplyingExtendNoticeId(null);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ backgroundColor: `${colors.primary}20`, padding: 8, borderRadius: 10, marginRight: 10 }}>
                            <MaterialCommunityIcons name="bullhorn-variant-outline" size={22} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Global Notices</Text>
                            <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 2 }}>Broadcast updates to institution administrators</Text>
                        </View>
                    </View>

                    <View style={{ backgroundColor: colors.cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Target Audience</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: target === 'all_admins' ? `${colors.primary}20` : colors.inputBg,
                                    padding: 12,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: target === 'all_admins' ? colors.primary : colors.border,
                                    marginRight: 8,
                                }}
                                onPress={() => setTarget('all_admins')}
                            >
                                <Text style={{ color: target === 'all_admins' ? colors.primary : colors.subtext, fontWeight: '700' }}>All Admins</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: target === 'specific' ? `${colors.primary}20` : colors.inputBg,
                                    padding: 12,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: target === 'specific' ? colors.primary : colors.border,
                                }}
                                onPress={() => setTarget('specific')}
                            >
                                <Text style={{ color: target === 'specific' ? colors.primary : colors.subtext, fontWeight: '700' }}>Specific</Text>
                            </TouchableOpacity>
                        </View>

                        {target === 'specific' && (
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Institution</Text>
                                <TouchableOpacity
                                    onPress={() => setShowInstitutionSelector((v) => !v)}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.inputBg,
                                        borderRadius: 10,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Text style={{ color: institutionId ? colors.text : colors.subtext, fontWeight: institutionId ? '700' : '500' }}>
                                        {selectedInstitutionName}
                                    </Text>
                                    <MaterialCommunityIcons name={showInstitutionSelector ? 'chevron-up' : 'chevron-down'} size={18} color={colors.subtext} />
                                </TouchableOpacity>

                                {showInstitutionSelector && (
                                    <View style={{
                                        marginTop: 8,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 10,
                                        backgroundColor: colors.inputBg,
                                        maxHeight: 220,
                                    }}>
                                        <ScrollView nestedScrollEnabled>
                                            {institutions.map((inst) => (
                                                <TouchableOpacity
                                                    key={inst.id}
                                                    onPress={() => {
                                                        setInstitutionId(inst.id);
                                                        setShowInstitutionSelector(false);
                                                    }}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 11,
                                                        borderBottomWidth: 1,
                                                        borderBottomColor: colors.border,
                                                        backgroundColor: institutionId === inst.id ? `${colors.primary}15` : 'transparent',
                                                    }}
                                                >
                                                    <Text style={{ color: colors.text, fontWeight: institutionId === inst.id ? '700' : '500' }}>{inst.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {institutions.length === 0 && (
                                                <View style={{ padding: 12 }}>
                                                    <Text style={{ color: colors.subtext }}>No institutions available</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}

                        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Notice Title</Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                fontSize: 15,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                            placeholder="e.g. Major Platform Update v2.0"
                            placeholderTextColor={colors.subtext}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Message</Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                fontSize: 15,
                                minHeight: 120,
                                textAlignVertical: 'top',
                                marginBottom: 14,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                            placeholder="Write your announcement here..."
                            placeholderTextColor={colors.subtext}
                            value={message}
                            onChangeText={setMessage}
                            multiline
                        />

                        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Expiry (days)</Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                fontSize: 15,
                                marginBottom: 14,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                            placeholder="2"
                            placeholderTextColor={colors.subtext}
                            value={expiryDays}
                            onChangeText={setExpiryDays}
                            keyboardType="number-pad"
                        />

                        <TouchableOpacity
                            onPress={dispatchNotification}
                            disabled={loading}
                            style={{
                                backgroundColor: colors.primary,
                                height: 52,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="send" size={18} color="#fff" />
                                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginLeft: 8 }}>Dispatch Notice</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={{ backgroundColor: colors.cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Manage Notices</Text>
                            <TouchableOpacity onPress={fetchHistory}>
                                <MaterialCommunityIcons name="refresh" size={18} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {historyLoading ? (
                            <View style={{ paddingVertical: 4 }}>
                                <ListItemSkeleton loading={historyLoading} count={4} label="Loading notice history..." />
                            </View>
                        ) : history.length === 0 ? (
                            <View style={{ paddingVertical: 12 }}>
                                <Text style={{ color: colors.subtext }}>No notices dispatched yet.</Text>
                            </View>
                        ) : (
                            history.map((n) => (
                                <View
                                    key={n.notice_id}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 12,
                                        padding: 12,
                                        marginBottom: 10,
                                        backgroundColor: colors.inputBg,
                                    }}
                                >
                                    {editingNoticeId === n.notice_id ? (
                                        <View>
                                            <TextInput
                                                value={editTitle}
                                                onChangeText={setEditTitle}
                                                placeholder="Notice title"
                                                placeholderTextColor={colors.subtext}
                                                style={{
                                                    backgroundColor: colors.inputBg,
                                                    color: colors.text,
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 8,
                                                    marginBottom: 8,
                                                    fontWeight: '700',
                                                }}
                                            />
                                            <TextInput
                                                value={editMessage}
                                                onChangeText={setEditMessage}
                                                placeholder="Notice message"
                                                placeholderTextColor={colors.subtext}
                                                multiline
                                                style={{
                                                    backgroundColor: colors.inputBg,
                                                    color: colors.text,
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 8,
                                                    marginBottom: 8,
                                                    minHeight: 70,
                                                    textAlignVertical: 'top',
                                                }}
                                            />
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 4 }}>{n.title}</Text>
                                            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 8 }} numberOfLines={2}>{n.message}</Text>
                                        </>
                                    )}

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                                        <Text style={{ color: colors.subtext, fontSize: 11, marginRight: 10 }}>
                                            Target: {n.target === 'specific' ? (n.institution_name || 'Specific Institution') : 'All Admins'}
                                        </Text>
                                        <Text style={{ color: colors.subtext, fontSize: 11, marginRight: 10 }}>
                                            Recipients: {n.recipient_count}
                                        </Text>
                                        <Text style={{ color: '#16A34A', fontSize: 11, marginRight: 10 }}>
                                            Delivered: {n.delivered_count}
                                        </Text>
                                        <Text style={{ color: '#DC2626', fontSize: 11, marginRight: 10 }}>
                                            Failed: {n.failed_count}
                                        </Text>
                                        <Text style={{ color: '#D97706', fontSize: 11 }}>
                                            Retry: {n.retry_scheduled_count}
                                        </Text>
                                    </View>

                                    <Text style={{ color: colors.subtext, fontSize: 11 }}>
                                        {new Date(n.created_at).toLocaleString()}
                                    </Text>

                                    {n.expires_at && (
                                        <>
                                            <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                                                Expires: {new Date(n.expires_at).toLocaleString()}
                                            </Text>
                                            <Text style={{ color: '#D97706', fontSize: 11, marginTop: 2, fontWeight: '700' }}>
                                                {formatCountdown(n.expires_at, nowMs)}
                                            </Text>
                                        </>
                                    )}

                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => requestExtendNotice(n.notice_id)}
                                            disabled={savingNotice || !!deletingNoticeId || !!applyingExtendNoticeId}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: '#D97706',
                                                backgroundColor: '#D97706',
                                                borderRadius: 8,
                                                paddingHorizontal: 10,
                                                paddingVertical: 7,
                                                marginRight: 8,
                                            }}
                                        >
                                            {(applyingExtendNoticeId === n.notice_id) ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Extend</Text>
                                            )}
                                        </TouchableOpacity>

                                        {editingNoticeId === n.notice_id ? (
                                            <>
                                                <TouchableOpacity
                                                    onPress={cancelEditNotice}
                                                    disabled={savingNotice || deletingNoticeId === n.notice_id}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: colors.border,
                                                        backgroundColor: colors.cardBg,
                                                        borderRadius: 8,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 7,
                                                        marginRight: 8,
                                                    }}
                                                >
                                                    <Text style={{ color: colors.subtext, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => saveNoticeEdit(n.notice_id)}
                                                    disabled={savingNotice || deletingNoticeId === n.notice_id}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: colors.primary,
                                                        backgroundColor: colors.primary,
                                                        borderRadius: 8,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 7,
                                                        marginRight: 8,
                                                    }}
                                                >
                                                    {savingNotice ? (
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                    ) : (
                                                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Save</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => startEditNotice(n)}
                                                disabled={!!deletingNoticeId}
                                                style={{
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    backgroundColor: colors.cardBg,
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 7,
                                                    marginRight: 8,
                                                }}
                                            >
                                                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Edit</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={() => requestDeleteNotice(n.notice_id)}
                                            disabled={savingNotice || !!deletingNoticeId}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: '#DC2626',
                                                backgroundColor: '#DC2626',
                                                borderRadius: 8,
                                                paddingHorizontal: 10,
                                                paddingVertical: 7,
                                            }}
                                        >
                                            {(deletingNoticeId === n.notice_id) ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Delete</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {extendingNoticeId === n.notice_id && (
                                        <View style={{
                                            marginTop: 10,
                                            borderWidth: 1,
                                            borderColor: isDark ? '#854D0E' : '#FDE68A',
                                            backgroundColor: isDark ? 'rgba(133,77,14,0.25)' : '#FFFBEB',
                                            borderRadius: 10,
                                            padding: 10,
                                        }}>
                                            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Extend Expiry</Text>
                                            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 8 }}>
                                                Add extra days from current expiry.
                                            </Text>

                                            <TextInput
                                                value={extendDaysInput}
                                                onChangeText={setExtendDaysInput}
                                                placeholder="1"
                                                placeholderTextColor={colors.subtext}
                                                keyboardType="number-pad"
                                                style={{
                                                    backgroundColor: colors.inputBg,
                                                    color: colors.text,
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 8,
                                                    marginBottom: 8,
                                                }}
                                            />

                                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                                <TouchableOpacity
                                                    onPress={cancelExtendNotice}
                                                    disabled={applyingExtendNoticeId === n.notice_id}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: colors.border,
                                                        borderRadius: 8,
                                                        backgroundColor: colors.cardBg,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 7,
                                                        marginRight: 8,
                                                    }}
                                                >
                                                    <Text style={{ color: colors.subtext, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => confirmExtendNotice(n.notice_id)}
                                                    disabled={applyingExtendNoticeId === n.notice_id}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: '#D97706',
                                                        borderRadius: 8,
                                                        backgroundColor: '#D97706',
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 7,
                                                        minWidth: 80,
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {(applyingExtendNoticeId === n.notice_id) ? (
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                    ) : (
                                                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Apply</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {confirmDeleteNoticeId === n.notice_id && (
                                        <View style={{
                                            marginTop: 10,
                                            borderWidth: 1,
                                            borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                                            backgroundColor: isDark ? 'rgba(127,29,29,0.25)' : '#FEF2F2',
                                            borderRadius: 10,
                                            padding: 10,
                                        }}>
                                            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 4 }}>Confirm Delete</Text>
                                            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 8 }}>
                                                Delete this notice from all recipients? This cannot be undone.
                                            </Text>
                                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                                <TouchableOpacity
                                                    onPress={cancelDeleteNotice}
                                                    disabled={deletingNoticeId === n.notice_id}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: colors.border,
                                                        borderRadius: 8,
                                                        backgroundColor: colors.cardBg,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 7,
                                                        marginRight: 8,
                                                    }}
                                                >
                                                    <Text style={{ color: colors.subtext, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => confirmDeleteNotice(n.notice_id)}
                                                    disabled={deletingNoticeId === n.notice_id}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: '#DC2626',
                                                        borderRadius: 8,
                                                        backgroundColor: '#DC2626',
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 7,
                                                        minWidth: 80,
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {(deletingNoticeId === n.notice_id) ? (
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                    ) : (
                                                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Confirm</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
