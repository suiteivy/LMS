import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { DocumentsService, DocumentTrackingStats, DocumentRecipient } from '@/services/DocumentsService';
import { ClassService } from '@/services/ClassService';
import { showSuccess, showError } from '@/utils/toast';

export interface DocumentPublisherModalProps {
  visible: boolean;
  onClose: () => void;
  onPublished?: () => void;
  existingDocumentId?: string | null;
}

const CATEGORIES = [
  { id: 'circular', label: 'Circular / Notice' },
  { id: 'fee_structure', label: 'Fee Structure' },
  { id: 'policy', label: 'School Policy' },
  { id: 'timetable', label: 'Timetable / Schedule' },
  { id: 'form', label: 'Form / Agreement' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'report', label: 'Academic Report' },
  { id: 'other', label: 'Other Document' },
];

export const DocumentPublisherModal: React.FC<DocumentPublisherModalProps> = ({
  visible,
  onClose,
  onPublished,
  existingDocumentId,
}) => {
  const { isDark } = useTheme();

  // Mode: 'publish' (create new) or 'tracking' (view tracking for existing document)
  const isTrackingMode = !!existingDocumentId;

  // Publish Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('circular');
  const [isPinned, setIsPinned] = useState(false);
  const [autoDeliverNew, setAutoDeliverNew] = useState(true);
  const [audienceType, setAudienceType] = useState<'institution' | 'level' | 'class' | 'student'>('institution');
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size?: number;
    uri: string;
    mimeType?: string;
  } | null>(null);

  const [classesList, setClassesList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Tracking Stats State
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingStats, setTrackingStats] = useState<DocumentTrackingStats | null>(null);
  const [recipients, setRecipients] = useState<DocumentRecipient[]>([]);
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (isTrackingMode && existingDocumentId) {
      loadTracking(existingDocumentId);
    } else {
      // Load classes for audience picker
      ClassService.getClasses()
        .then((res) => setClassesList(res || []))
        .catch((e) => console.warn('Failed to load classes:', e));
    }
  }, [visible, existingDocumentId, isTrackingMode]);

  const loadTracking = async (docId: string) => {
    try {
      setLoadingTracking(true);
      const data = await DocumentsService.getDocumentTracking(docId);
      setTrackingStats(data?.stats || null);
      setRecipients(data?.recipients || []);
    } catch (e: any) {
      console.error('Failed to load document tracking:', e);
      showError('Error', 'Unable to load delivery statistics.');
    } finally {
      setLoadingTracking(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          size: asset.size,
          uri: asset.uri,
          mimeType: asset.mimeType || 'application/pdf',
        });
      }
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Document title is required.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Validation', 'Please select a document file to upload.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        storage_path: `documents/${Date.now()}-${selectedFile.name}`,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.mimeType || 'application/pdf',
        is_pinned: isPinned,
        auto_deliver_new_students: autoDeliverNew,
        audiences: [
          {
            audience_type: audienceType,
            audience_id: audienceType === 'institution' ? null : selectedAudienceId || null,
          },
        ],
      };

      await DocumentsService.publishDocument(payload);
      showSuccess('Document Published', 'The document was published and delivered to targeted recipients.');
      if (onPublished) onPublished();
      onClose();
    } catch (err: any) {
      console.error('Publish error:', err);
      showError('Publish Failed', err?.response?.data?.error || 'Unable to publish document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = async () => {
    if (!existingDocumentId) return;
    try {
      setSendingReminder(true);
      await DocumentsService.sendReminders(existingDocumentId);
      showSuccess('Reminders Dispatched', 'Notification reminder dispatched to all unread recipients.');
      loadTracking(existingDocumentId);
    } catch (err: any) {
      console.error('Reminder error:', err);
      showError('Error', 'Failed to dispatch reminders.');
    } finally {
      setSendingReminder(false);
    }
  };

  const bg = isDark ? '#161B22' : '#FFFFFF';
  const cardBg = isDark ? '#21262D' : '#F6F8FA';
  const border = isDark ? '#30363D' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: bg,
            width: '100%',
            maxWidth: 620,
            maxHeight: '92%',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: border,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              padding: 18,
              borderBottomWidth: 1,
              borderBottomColor: border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: cardBg,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '800' }}>
                {isTrackingMode ? 'Document Delivery & Read Tracking' : 'Publish School Document'}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                {isTrackingMode
                  ? 'Real-time read receipts and delivery analytics'
                  : 'Distribute circulars, notices, and policies to targeted school audiences'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {isTrackingMode ? (
            /* ================= TRACKING VIEW ================= */
            loadingTracking ? (
              <View style={{ padding: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FF6900" />
                <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                  Loading delivery tracking metrics...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1, padding: 18 }} contentContainerStyle={{ gap: 16 }}>
                {/* Stats Metric Cards */}
                {trackingStats && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        padding: 12,
                        backgroundColor: cardBg,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: border,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700' }}>DELIVERED</Text>
                      <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                        {trackingStats.total_delivered}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        padding: 12,
                        backgroundColor: cardBg,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: border,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700' }}>VIEWED</Text>
                      <Text style={{ color: '#10B981', fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                        {trackingStats.total_viewed}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        padding: 12,
                        backgroundColor: cardBg,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: border,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700' }}>VIEW RATE</Text>
                      <Text style={{ color: '#FF6900', fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                        {trackingStats.view_rate_percent}%
                      </Text>
                    </View>
                  </View>
                )}

                {/* Reminder Action */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: isDark ? '#1C2733' : '#FFF0E5',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#2E4C6E' : '#FFD8BF',
                  }}
                >
                  <View>
                    <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>
                      {trackingStats?.total_unread || 0} Unread Recipient(s)
                    </Text>
                    <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                      Send an alert push/notification reminder
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleSendReminder}
                    disabled={sendingReminder || (trackingStats?.total_unread || 0) === 0}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: '#FF6900',
                      opacity: (trackingStats?.total_unread || 0) === 0 ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                      {sendingReminder ? 'Sending...' : 'Send Reminder'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Recipient Log */}
                <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  Recipient Read Receipts ({recipients.length})
                </Text>
                <View style={{ gap: 8 }}>
                  {recipients.map((r) => (
                    <View
                      key={r.delivery_id}
                      style={{
                        padding: 12,
                        backgroundColor: cardBg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View>
                        <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>
                          {r.recipient_name}
                        </Text>
                        <Text style={{ color: textSecondary, fontSize: 11 }}>
                          {r.student_name ? `Parent of ${r.student_name}` : r.role || 'Recipient'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: r.viewed_at ? '#10B981' : '#EF4444',
                          }}
                        >
                          {r.viewed_at ? 'Read' : 'Unread'}
                        </Text>
                        {r.viewed_at && (
                          <Text style={{ color: textSecondary, fontSize: 10 }}>
                            {new Date(r.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )
          ) : (
            /* ================= PUBLISH VIEW ================= */
            <ScrollView style={{ flex: 1, padding: 18 }} contentContainerStyle={{ gap: 14 }}>
              {/* Title */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Document Title *
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Term 1 Fee Schedule & Circular"
                  placeholderTextColor={textSecondary}
                  style={{
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    padding: 10,
                    color: textPrimary,
                    fontSize: 13,
                    backgroundColor: cardBg,
                  }}
                />
              </View>

              {/* Description */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Description / Overview (Optional)
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief note to accompany the document..."
                  placeholderTextColor={textSecondary}
                  style={{
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    padding: 10,
                    color: textPrimary,
                    fontSize: 13,
                    backgroundColor: cardBg,
                    minHeight: 50,
                  }}
                  multiline
                />
              </View>

              {/* Category */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: category === cat.id ? '#FF6900' : border,
                        backgroundColor: category === cat.id ? (isDark ? 'rgba(255,105,0,0.2)' : '#FFF0E5') : cardBg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: category === cat.id ? '#FF6900' : textSecondary,
                        }}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Target Audience */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Target Audience
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'institution', label: 'All School' },
                    { id: 'level', label: 'By Level' },
                    { id: 'class', label: 'By Class' },
                  ].map((aud) => (
                    <TouchableOpacity
                      key={aud.id}
                      onPress={() => setAudienceType(aud.id as any)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: audienceType === aud.id ? '#FF6900' : border,
                        backgroundColor: audienceType === aud.id ? (isDark ? 'rgba(255,105,0,0.2)' : '#FFF0E5') : cardBg,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: audienceType === aud.id ? '#FF6900' : textSecondary,
                        }}
                      >
                        {aud.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {audienceType === 'class' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 4 }}>
                    {classesList.map((cls) => {
                      const active = selectedAudienceId === cls.id;
                      return (
                        <TouchableOpacity
                          key={cls.id}
                          onPress={() => setSelectedAudienceId(cls.id)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: active ? '#FF6900' : border,
                            backgroundColor: active ? '#FF6900' : cardBg,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : textPrimary }}>
                            {cls.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* File Attachment */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  File Attachment *
                </Text>
                <TouchableOpacity
                  onPress={handlePickDocument}
                  style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: border,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: cardBg,
                    gap: 6,
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={28} color="#FF6900" />
                  <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>
                    {selectedFile ? selectedFile.name : 'Choose File to Upload'}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                    {selectedFile && selectedFile.size
                      ? `${(selectedFile.size / 1024).toFixed(0)} KB · Tap to change`
                      : 'PDF, Word, or image formats supported'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Toggles */}
              <View style={{ gap: 10, paddingTop: 6 }}>
                <TouchableOpacity
                  onPress={() => setIsPinned((p) => !p)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <Ionicons
                    name={isPinned ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isPinned ? '#FF6900' : textSecondary}
                  />
                  <Text style={{ color: textPrimary, fontSize: 13 }}>
                    Pin to top of Documents Center
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAutoDeliverNew((a) => !a)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <Ionicons
                    name={autoDeliverNew ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={autoDeliverNew ? '#FF6900' : textSecondary}
                  />
                  <Text style={{ color: textPrimary, fontSize: 13 }}>
                    Auto-deliver to students enrolling later in the term
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Footer */}
          {!isTrackingMode && (
            <View
              style={{
                padding: 16,
                backgroundColor: cardBg,
                borderTopWidth: 1,
                borderTopColor: border,
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Text style={{ color: textSecondary, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePublish}
                disabled={submitting}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#FF6900',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    Publish & Deliver
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
