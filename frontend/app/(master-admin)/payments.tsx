import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
    RefreshControl,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';

export default function MasterPayments() {
    const { isDark } = useTheme();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00'
    };

    const getBackendUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
        if (Platform.OS === 'android') {
            url = url.replace('localhost', '10.0.2.2');
        }
        return url;
    };

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getBackendUrl()}/api/master-admin/payments`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            if (res.ok) {
                setPayments(data.payments || []);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: "Failed to fetch payments ledger" });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPayments();
    };

    const filteredPayments = payments.filter(p => 
        p.institutions?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPaymentItem = ({ item }: { item: any }) => {
        const date = new Date(item.date).toLocaleDateString();
        const statusColor = item.status === 'completed' ? '#10b981' : (item.status === 'pending' ? '#f59e0b' : '#f43f5e');

        return (
            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.instInfo}>
                        <Text style={[styles.instName, { color: themeColors.text }]}>{item.institutions?.name || 'Unknown Institution'}</Text>
                        <Text style={[styles.subtext, { color: themeColors.subtext }]}>{item.users?.full_name || 'Staff'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status?.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="cash-multiple" size={16} color={themeColors.subtext} />
                        <Text style={[styles.amountText, { color: themeColors.text }]}>
                            {item.currency || 'KES'} {Number(item.amount).toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="credit-card-outline" size={16} color={themeColors.subtext} />
                        <Text style={[styles.infoLabel, { color: themeColors.subtext }]}>Method: </Text>
                        <Text style={[styles.infoValue, { color: themeColors.text }]}>{item.payment_method?.toUpperCase() || 'CASH'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="calendar" size={16} color={themeColors.subtext} />
                        <Text style={[styles.infoLabel, { color: themeColors.subtext }]}>Date: </Text>
                        <Text style={[styles.infoValue, { color: themeColors.text }]}>{date}</Text>
                    </View>
                    {item.reference_number && (
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="identifier" size={16} color={themeColors.subtext} />
                            <Text style={[styles.infoLabel, { color: themeColors.subtext }]}>Ref: </Text>
                            <Text style={[styles.infoValue, { color: themeColors.text }]}>{item.reference_number}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: themeColors.text }]}>Platform Ledger</Text>
                    <Text style={[styles.subtitle, { color: themeColors.subtext }]}>Global Transaction History</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: `${themeColors.primary}20` }]}>
                    <Text style={[styles.statText, { color: themeColors.primary }]}>
                        {payments.length} TOTAL
                    </Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={themeColors.subtext} />
                    <TextInput
                        style={[styles.searchInput, { color: themeColors.text }]}
                        placeholder="Search by institution, name or reference..."
                        placeholderTextColor={themeColors.subtext}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredPayments}
                    keyExtractor={item => item.id}
                    renderItem={renderPaymentItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="cash-off" size={64} color={themeColors.border} />
                            <Text style={[styles.emptyText, { color: themeColors.subtext }]}>No transactions found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    statBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statText: {
        fontSize: 12,
        fontWeight: '800',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            }
        })
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    instInfo: {
        flex: 1,
    },
    instName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    subtext: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: 12,
    },
    cardContent: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    amountText: {
        fontSize: 18,
        fontWeight: '800',
    },
    infoLabel: {
        fontSize: 13,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    }
});
