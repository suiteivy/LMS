import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import {
  MessageSquare,
  Star,
  Users,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Search,
  Filter,
  Check,
  Archive,
  Eye,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getApiBaseUrl } from '@/utils/backendUrl';
import { useAuth } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';

interface DemoFeedbackItem {
  id: string;
  rating: number | null;
  module_ratings: Record<string, any>;
  liked: string | null;
  improve: string | null;
  role: string | null;
  contact_requested: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  consent: boolean;
  engaged_modules: string[];
  session_ref: string | null;
  status: 'unread' | 'read' | 'handled' | 'archived';
  created_at: string;
}

interface FeedbackStats {
  totalCount: number;
  avgRating: number;
  unreadCount: number;
  contactRequestsCount: number;
}

export default function MasterAdminFeedbackScreen() {
  const { isDark } = useTheme();
  const { session } = useAuth();

  const [feedbackList, setFeedbackList] = useState<DemoFeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    totalCount: 0,
    avgRating: 0,
    unreadCount: 0,
    contactRequestsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (ratingFilter !== 'all') queryParams.append('rating', ratingFilter);
      if (contactFilter) queryParams.append('contact_requested', 'true');
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const res = await fetch(`${getApiBaseUrl()}/demo/feedback?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });

      if (!res.ok) throw new Error('Failed to fetch demo feedback');
      const data = await res.json();
      setFeedbackList(data.feedback || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error Loading Feedback',
        text2: err?.message || 'Could not retrieve demo feedback submissions.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, ratingFilter, contactFilter, searchQuery, session?.access_token]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/demo/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      setFeedbackList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
      );

      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Feedback marked as ${newStatus}.`,
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: err?.message,
      });
    }
  };

  const colors = {
    bg: isDark ? '#0D1117' : '#F6F8FA',
    card: isDark ? '#161B22' : '#FFFFFF',
    border: isDark ? '#30363D' : '#D0D7DE',
    textPrimary: isDark ? '#F0F6FC' : '#1F2328',
    textSecondary: isDark ? '#8B949E' : '#656D76',
    accent: '#FF6B00',
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchFeedback();
          }}
          tintColor={colors.accent}
        />
      }
    >
      {/* Screen Title */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <MessageSquare size={24} color={colors.accent} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>
            Demo Module Feedback
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          Review interactive demo ratings, user suggestions, and institution contact requests.
        </Text>
      </View>

      {/* KPI Cards Row */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 26,
        }}
      >
        {/* Total Submissions */}
        <View
          style={{
            flex: 1,
            minWidth: 160,
            backgroundColor: colors.card,
            padding: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
            TOTAL SUBMISSIONS
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 4 }}>
            {stats.totalCount}
          </Text>
        </View>

        {/* Average Rating */}
        <View
          style={{
            flex: 1,
            minWidth: 160,
            backgroundColor: colors.card,
            padding: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
            AVG RATING
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Star size={20} color="#FF6B00" fill="#FF6B00" />
            <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900' }}>
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Unread */}
        <View
          style={{
            flex: 1,
            minWidth: 160,
            backgroundColor: colors.card,
            padding: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
            UNREAD
          </Text>
          <Text style={{ color: '#3B82F6', fontSize: 24, fontWeight: '900', marginTop: 4 }}>
            {stats.unreadCount}
          </Text>
        </View>

        {/* Contact Requests */}
        <View
          style={{
            flex: 1,
            minWidth: 160,
            backgroundColor: colors.card,
            padding: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
            CONTACT REQUESTS
          </Text>
          <Text style={{ color: '#10B981', fontSize: 24, fontWeight: '900', marginTop: 4 }}>
            {stats.contactRequestsCount}
          </Text>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View
        style={{
          backgroundColor: colors.card,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 20,
          gap: 12,
        }}
      >
        {/* Search Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#0D1117' : '#F6F8FA',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
          }}
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            placeholder="Search by keywords, user name, role, or email..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              color: colors.textPrimary,
              fontSize: 14,
            }}
          />
        </View>

        {/* Filter Pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginRight: 4 }}>
            STATUS:
          </Text>
          {['all', 'unread', 'read', 'handled'].map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: statusFilter === st ? colors.accent : 'transparent',
                borderWidth: 1,
                borderColor: statusFilter === st ? colors.accent : colors.border,
              }}
            >
              <Text
                style={{
                  color: statusFilter === st ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '700',
                  textTransform: 'capitalize',
                }}
              >
                {st}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => setContactFilter(!contactFilter)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: contactFilter ? '#10B981' : 'transparent',
              borderWidth: 1,
              borderColor: contactFilter ? '#10B981' : colors.border,
              marginLeft: 'auto',
            }}
          >
            <Text
              style={{
                color: contactFilter ? '#FFFFFF' : colors.textSecondary,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Contact Requested Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Submissions List */}
      {loading && !refreshing ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading feedback...</Text>
        </View>
      ) : feedbackList.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.card,
            padding: 40,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          <MessageSquare size={36} color={colors.textSecondary} />
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
            No Feedback Found
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
            {searchQuery || statusFilter !== 'all' || contactFilter
              ? 'Try adjusting your filters.'
              : 'Feedback submitted on the demo page will appear here.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {feedbackList.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.card,
                padding: 20,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: item.status === 'unread' ? 'rgba(255, 107, 0, 0.4)' : colors.border,
              }}
            >
              {/* Header row: Rating, Role, Date, Status */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {item.rating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          color="#FF6B00"
                          fill={s <= item.rating! ? '#FF6B00' : 'transparent'}
                        />
                      ))}
                    </View>
                  )}
                  {item.role && (
                    <View
                      style={{
                        backgroundColor: 'rgba(255, 107, 0, 0.12)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 107, 0, 0.3)',
                      }}
                    >
                      <Text style={{ color: '#FF8C40', fontSize: 11, fontWeight: '800' }}>
                        {item.role}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Status selector buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.status !== 'handled' && (
                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(item.id, 'handled')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>
                        Mark Handled
                      </Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'unread' && (
                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(item.id, 'read')}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(59, 130, 246, 0.35)',
                      }}
                    >
                      <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700' }}>
                        Mark Read
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 6 }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Explored Modules Chips */}
              {item.engaged_modules && item.engaged_modules.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', alignSelf: 'center' }}>
                    Explored:
                  </Text>
                  {item.engaged_modules.map((m) => (
                    <View
                      key={m}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: isDark ? '#21262D' : '#EAEAEA',
                      }}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '600' }}>
                        {m}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Liked & Improvements */}
              {item.liked && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800', marginBottom: 2 }}>
                    WHAT THEY LIKED:
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13.5, lineHeight: 20 }}>
                    {item.liked}
                  </Text>
                </View>
              )}

              {item.improve && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: '#FF8C40', fontSize: 12, fontWeight: '800', marginBottom: 2 }}>
                    AREAS TO IMPROVE:
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13.5, lineHeight: 20 }}>
                    {item.improve}
                  </Text>
                </View>
              )}

              {/* Contact Card if requested */}
              {item.contact_requested && (
                <View
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.25)',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <View>
                    <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                      Follow-up Requested
                    </Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>
                      {item.contact_name || 'Anonymous User'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {item.contact_email && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`mailto:${item.contact_email}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: '#10B981',
                        }}
                      >
                        <Mail size={13} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                          {item.contact_email}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {item.contact_phone && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${item.contact_phone}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <Phone size={13} color={colors.textPrimary} />
                        <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                          {item.contact_phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
