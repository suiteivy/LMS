import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { ParentService } from '@/services/ParentService';
import { DocumentsService, PublishedDocument } from '@/services/DocumentsService';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import { PdfService } from '@/services/PdfService';
import { showError } from '@/utils/toast';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'circular', label: 'Circulars' },
  { id: 'fee_structure', label: 'Fee Structures' },
  { id: 'policy', label: 'Policies' },
  { id: 'form', label: 'Forms' },
  { id: 'report', label: 'Reports' },
  { id: 'newsletter', label: 'Newsletters' },
];

export default function ParentDocumentsPage() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<PublishedDocument[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // PDF Preview Modal
  const [previewPayload, setPreviewPayload] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [students, docs] = await Promise.all([
        ParentService.getLinkedStudents().catch(() => []),
        DocumentsService.getDeliveredDocuments({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          student_id: selectedStudentId || undefined,
          unread_only: unreadOnly,
          search: searchQuery.trim() || undefined,
        }).catch(() => []),
      ]);
      setLinkedStudents(students || []);
      setDocuments(docs || []);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      showError('Error', 'Unable to load school documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStudentId, unreadOnly]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleOpenDocument = async (doc: PublishedDocument) => {
    // Record view interaction
    DocumentsService.recordInteraction(doc.id, 'view');

    // Update local state to mark read
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, is_read: true, viewed_at: new Date().toISOString() } : d))
    );

    if (doc.signed_url) {
      // If signed URL is available and document is PDF:
      setPreviewPayload({
        documentType: 'generic',
        title: doc.title,
        fileName: doc.file_name,
        data: { url: doc.signed_url },
      });
    } else {
      setPreviewPayload({
        documentType: 'generic',
        title: doc.title,
        fileName: doc.file_name,
        data: { id: doc.id },
      });
    }
  };

  const handleDownload = async (doc: PublishedDocument) => {
    DocumentsService.recordInteraction(doc.id, 'download');
    if (doc.signed_url && Platform.OS === 'web') {
      window.open(doc.signed_url, '_blank');
    } else if (doc.signed_url) {
      // On mobile
      PdfService.downloadCompiledPdf({
        documentType: 'generic',
        title: doc.title,
        fileName: doc.file_name,
        data: { url: doc.signed_url },
      });
    }
  };

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        d.category.toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const unreadCount = documents.filter((d) => !d.is_read).length;

  const bg = isDark ? '#161B22' : '#FFFFFF';
  const cardBg = isDark ? '#21262D' : '#F6F8FA';
  const border = isDark ? '#30363D' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0D1117' : '#F6F8FA' }}>
      <UnifiedHeader
        title="Documents & Notices"
        subtitle={unreadCount > 0 ? `${unreadCount} unread official publication${unreadCount > 1 ? 's' : ''}` : 'Official notices & school publications'}
        role="Parent/Guardian"
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6900']} />}
      >
        {/* Child Selector if multiple children */}
        {linkedStudents.length > 1 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
              Filter by Student
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setSelectedStudentId(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selectedStudentId === null ? '#FF6900' : border,
                  backgroundColor: selectedStudentId === null ? '#FF6900' : bg,
                }}
              >
                <Text
                  style={{
                    color: selectedStudentId === null ? '#FFFFFF' : textPrimary,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  All Children
                </Text>
              </TouchableOpacity>
              {linkedStudents.map((st) => {
                const active = selectedStudentId === st.id;
                const name = st.users?.full_name || `${st.users?.first_name || ''} ${st.users?.last_name || ''}`.trim() || 'Student';
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => setSelectedStudentId(st.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: active ? '#FF6900' : border,
                      backgroundColor: active ? '#FF6900' : bg,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : textPrimary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Search & Unread Toggle Bar */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: border,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 42,
            }}
          >
            <Ionicons name="search-outline" size={18} color={textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search circulars, forms, policies..."
              placeholderTextColor={textSecondary}
              style={{ flex: 1, marginLeft: 8, color: textPrimary, fontSize: 13 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Unread Only Button */}
          <TouchableOpacity
            onPress={() => setUnreadOnly((u) => !u)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: unreadOnly ? '#FF6900' : border,
              backgroundColor: unreadOnly ? (isDark ? 'rgba(255,105,0,0.2)' : '#FFF0E5') : bg,
            }}
          >
            <Ionicons
              name={unreadOnly ? 'mail-unread' : 'mail-unread-outline'}
              size={16}
              color={unreadOnly ? '#FF6900' : textSecondary}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: unreadOnly ? '#FF6900' : textSecondary,
              }}
            >
              Unread
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: active ? '#FF6900' : border,
                  backgroundColor: active ? (isDark ? 'rgba(255,105,0,0.2)' : '#FFF0E5') : bg,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: active ? '#FF6900' : textSecondary,
                  }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Document List */}
        {loading ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF6900" />
            <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
              Loading documents...
            </Text>
          </View>
        ) : filteredDocs.length === 0 ? (
          <View
            style={{
              padding: 40,
              alignItems: 'center',
              backgroundColor: bg,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: border,
              marginTop: 10,
            }}
          >
            <Ionicons name="folder-open-outline" size={54} color={textSecondary} />
            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16, marginTop: 14 }}>
              No Documents Found
            </Text>
            <Text style={{ color: textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              No school documents match your current filter or search criteria.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredDocs.map((doc) => {
              const isUnread = !doc.is_read;
              return (
                <View
                  key={doc.id}
                  style={{
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: isUnread ? '#FF6900' : border,
                    borderRadius: 16,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  {/* Top Bar: Badges & Pinned */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {doc.is_pinned && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: '#FEF3C7',
                          }}
                        >
                          <Ionicons name="pin" size={12} color="#D97706" />
                          <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '800' }}>PINNED</Text>
                        </View>
                      )}
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                        }}
                      >
                        <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                          {doc.category.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>

                    {isUnread && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                          backgroundColor: '#FF6900',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>NEW</Text>
                      </View>
                    )}
                  </View>

                  {/* Title & Description */}
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15 }}>
                      {doc.title}
                    </Text>
                    {doc.description ? (
                      <Text style={{ color: textSecondary, fontSize: 12, lineHeight: 17 }}>
                        {doc.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Meta & Student tag */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textSecondary, fontSize: 11 }}>
                      Published: {new Date(doc.published_at).toLocaleDateString()}
                      {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                    </Text>
                    {doc.student_name ? (
                      <Text style={{ color: '#FF6900', fontSize: 11, fontWeight: '700' }}>
                        For: {doc.student_name}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      gap: 8,
                      borderTopWidth: 1,
                      borderTopColor: border,
                      paddingTop: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleOpenDocument(doc)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                      }}
                    >
                      <Ionicons name="eye-outline" size={16} color={textPrimary} />
                      <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>
                        Read Document
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDownload(doc)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#FF6900',
                      }}
                    >
                      <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        Download
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* PDF Vector Preview Modal */}
      <PdfPreviewModal
        visible={!!previewPayload}
        payload={previewPayload}
        onClose={() => setPreviewPayload(null)}
      />
    </View>
  );
}
