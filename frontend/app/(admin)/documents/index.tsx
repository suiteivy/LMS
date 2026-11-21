import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { DocumentsService, PublishedDocument } from '@/services/DocumentsService';
import { DocumentPublisherModal } from '@/components/admin/documents/DocumentPublisherModal';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import { PdfService } from '@/services/PdfService';
import { HelpTooltip } from '@/components/settings/HelpTooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError } from '@/utils/toast';

const CATEGORIES = [
  { id: 'all', label: 'All Documents' },
  { id: 'circular', label: 'Circulars & Notices' },
  { id: 'fee_structure', label: 'Fee Structures' },
  { id: 'policy', label: 'School Policies' },
  { id: 'timetable', label: 'Timetables' },
  { id: 'form', label: 'Forms' },
  { id: 'report', label: 'Reports' },
];

export default function AdminDocumentsCenterPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { can, isUnrestricted } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<PublishedDocument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Publisher Modal states
  const [publisherVisible, setPublisherVisible] = useState(false);
  const [trackingDocId, setTrackingDocId] = useState<string | null>(null);

  // PDF Preview Modal
  const [previewPayload, setPreviewPayload] = useState<any | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DocumentsService.getPublishedDocuments({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
      }).catch(() => []);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load published documents:', err);
      showError('Error', 'Unable to load school documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handlePreview = async (doc: PublishedDocument) => {
    try {
      const fileUrl = doc.signed_url || doc.file_url;
      if (fileUrl) {
        setPreviewPayload({
          url: fileUrl,
          title: doc.title,
          documentType: 'document',
        });
      } else {
        showError('Unavailable', 'No downloadable file is attached to this document.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      showError('Error', 'Could not open document preview.');
    }
  };

  const handleViewTracking = (doc: PublishedDocument) => {
    setTrackingDocId(doc.id);
    setPublisherVisible(true);
  };

  const handleOpenPublisher = () => {
    setTrackingDocId(null);
    setPublisherVisible(true);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title?.toLowerCase().includes(q);
        const matchesDesc = doc.description?.toLowerCase().includes(q);
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [documents, selectedCategory, searchQuery]);

  const bgPage = isDark ? '#0d1117' : '#F6F8FA';
  const cardBg = isDark ? '#161B22' : '#FFFFFF';
  const borderColor = isDark ? '#30363D' : '#E5E7EB';
  const textPrimary = isDark ? '#F0F6FC' : '#111827';
  const textSecondary = isDark ? '#8B949E' : '#6B7280';

  return (
    <View style={{ flex: 1, backgroundColor: bgPage }}>
      <UnifiedHeader
        title="Documents Center"
        subtitle="School Documents & Circular Tracking"
        role="Admin"
        fallbackPath="/(admin)/management"
        showNotification={false}
        rightActions={
          <TouchableOpacity
            onPress={handleOpenPublisher}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FF6900',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              gap: 6,
            }}
            accessibilityLabel="Publish new document"
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
              Publish Document
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6900" />}
      >
        {/* Search Bar & Category Chips */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor,
              borderRadius: 12,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <Ionicons name="search" size={18} color={textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search circulars, policies, forms..."
              placeholderTextColor={textSecondary}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                color: textPrimary,
                fontSize: 14,
              }}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: active ? '#FF6900' : cardBg,
                    borderWidth: 1,
                    borderColor: active ? '#FF6900' : borderColor,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? '#FFFFFF' : textSecondary,
                    }}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Documents Listing */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF6900" />
            <Text style={{ marginTop: 12, color: textSecondary, fontSize: 13 }}>
              Loading school documents...
            </Text>
          </View>
        ) : filteredDocuments.length === 0 ? (
          <View
            style={{
              padding: 32,
              backgroundColor: cardBg,
              borderRadius: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor,
              borderStyle: 'dashed',
            }}
          >
            <Ionicons name="documents-outline" size={48} color={textSecondary} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
              No Documents Published
            </Text>
            <Text style={{ fontSize: 13, color: textSecondary, textAlign: 'center', maxWidth: 320, marginBottom: 16 }}>
              Publish newsletters, circulars, fee structures, or policies to classes, parents, and staff.
            </Text>
            <TouchableOpacity
              onPress={handleOpenPublisher}
              style={{
                backgroundColor: '#FF6900',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                Publish First Document
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredDocuments.map((doc) => {
              const totalRecipients = doc.recipient_count || 0;
              const openedCount = doc.opened_count || 0;
              const downloadedCount = doc.downloaded_count || 0;
              const openRate = totalRecipients > 0 ? Math.round((openedCount / totalRecipients) * 100) : 0;

              return (
                <View
                  key={doc.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View
                          style={{
                            backgroundColor: '#FF690015',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: '#FF6900', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                            {doc.category?.replace('_', ' ') || 'Document'}
                          </Text>
                        </View>
                        {doc.audience_type && (
                          <View
                            style={{
                              backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '600' }}>
                              Audience: {doc.audience_type}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
                        {doc.title}
                      </Text>
                      {doc.description ? (
                        <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 8 }} numberOfLines={2}>
                          {doc.description}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handlePreview(doc)}
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                        }}
                        accessibilityLabel="Preview document"
                      >
                        <Ionicons name="eye-outline" size={18} color={textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleViewTracking(doc)}
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                        }}
                        accessibilityLabel="View delivery tracking"
                      >
                        <Ionicons name="stats-chart-outline" size={18} color="#FF6900" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Delivery Tracking Strip */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDark ? '#0d1117' : '#F6F8FA',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginTop: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <Text style={{ fontSize: 11, color: textSecondary }}>
                        Delivered: <Text style={{ fontWeight: '700', color: textPrimary }}>{totalRecipients}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary }}>
                        Opened: <Text style={{ fontWeight: '700', color: '#10B981' }}>{openedCount} ({openRate}%)</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary }}>
                        Downloaded: <Text style={{ fontWeight: '700', color: textPrimary }}>{downloadedCount}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleViewTracking(doc)}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6900' }}>
                        Details →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Publisher Modal */}
      <DocumentPublisherModal
        visible={publisherVisible}
        onClose={() => setPublisherVisible(false)}
        existingDocumentId={trackingDocId}
        onPublished={() => {
          setPublisherVisible(false);
          loadDocuments();
        }}
      />

      {/* In-App PDF Preview Modal */}
      <PdfPreviewModal
        visible={!!previewPayload}
        payload={previewPayload}
        onClose={() => setPreviewPayload(null)}
      />
    </View>
  );
}
