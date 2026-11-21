import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { IdentifierService, LegacyIdentifierRecord, ResolvedPersonResult } from '@/services/IdentifierService';
import { showSuccess, showError } from '@/utils/toast';

export interface IdentifierCrosswalkModalProps {
  visible: boolean;
  onClose: () => void;
}

export const IdentifierCrosswalkModal: React.FC<IdentifierCrosswalkModalProps> = ({
  visible,
  onClose,
}) => {
  const { isDark } = useTheme();
  const { isMain } = useAuth();

  const [activeTab, setActiveTab] = useState<'lookup' | 'crosswalk'>('lookup');
  const [lookupQuery, setLookupQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<ResolvedPersonResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Crosswalk list state
  const [crosswalkRecords, setCrosswalkRecords] = useState<LegacyIdentifierRecord[]>([]);
  const [loadingCrosswalk, setLoadingCrosswalk] = useState(false);

  useEffect(() => {
    if (visible && activeTab === 'crosswalk' && isMain) {
      loadCrosswalk();
    }
  }, [visible, activeTab, isMain]);

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    try {
      setSearching(true);
      setHasSearched(true);
      const res = await IdentifierService.resolveIdentifier(lookupQuery.trim());
      setSearchResult(res);
    } catch (err: any) {
      console.error('Lookup error:', err);
      showError('Lookup Error', err.message || 'Failed to resolve identifier.');
    } finally {
      setSearching(false);
    }
  };

  const loadCrosswalk = async () => {
    try {
      setLoadingCrosswalk(true);
      const records = await IdentifierService.getCrosswalkReport();
      setCrosswalkRecords(records);
    } catch (err: any) {
      console.error('Failed to load crosswalk:', err);
      showError('Error', 'Failed to load identifier crosswalk.');
    } finally {
      setLoadingCrosswalk(false);
    }
  };

  const handleExportCsv = () => {
    if (!crosswalkRecords || crosswalkRecords.length === 0) {
      showError('Empty', 'No legacy crosswalk records to export.');
      return;
    }

    const headers = 'Person ID,Person Type,Old Identifier,New Identifier,Migrated At\n';
    const rows = crosswalkRecords
      .map((r) => `"${r.person_id}","${r.person_type}","${r.old_identifier}","${r.new_identifier}","${r.migrated_at}"`)
      .join('\n');
    const csvContent = headers + rows;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `identifier_migration_crosswalk_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Exported', 'Crosswalk CSV downloaded successfully.');
    } else {
      showSuccess('Crosswalk Ready', `${crosswalkRecords.length} records available.`);
    }
  };

  const cardBg = isDark ? '#161B22' : '#FFFFFF';
  const borderColor = isDark ? '#30363D' : '#E5E7EB';
  const textPrimary = isDark ? '#F0F6FC' : '#111827';
  const textSecondary = isDark ? '#8B949E' : '#6B7280';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor,
            width: '100%',
            maxWidth: 620,
            maxHeight: '90%',
            padding: 20,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                Identifier Migration & Crosswalk
              </Text>
              <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Mandatory sequential numbering transition and old code lookup
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: isDark ? '#0D1117' : '#F3F4F6',
              borderRadius: 10,
              padding: 3,
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab('lookup')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: activeTab === 'lookup' ? '#FF6900' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: activeTab === 'lookup' ? '#FFFFFF' : textSecondary,
                }}
              >
                Old Code Transition Lookup
              </Text>
            </TouchableOpacity>

            {isMain && (
              <TouchableOpacity
                onPress={() => setActiveTab('crosswalk')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: activeTab === 'crosswalk' ? '#FF6900' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: activeTab === 'crosswalk' ? '#FFFFFF' : textSecondary,
                  }}
                >
                  Full Crosswalk Export
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {activeTab === 'lookup' ? (
              <View>
                <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 10 }}>
                  Enter any legacy code (e.g. STU-001, ADM-2024-05) or active institutional number to find the student, staff, or parent.
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <TextInput
                    value={lookupQuery}
                    onChangeText={(t) => {
                      setLookupQuery(t);
                      setHasSearched(false);
                    }}
                    onSubmitEditing={handleLookup}
                    placeholder="Enter old code or active number..."
                    placeholderTextColor={textSecondary}
                    autoCapitalize="characters"
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      color: textPrimary,
                      fontSize: 14,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleLookup}
                    disabled={searching}
                    style={{
                      backgroundColor: '#FF6900',
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {searching ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                        Lookup
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {hasSearched && (
                  searchResult ? (
                    <View
                      style={{
                        backgroundColor: isDark ? '#0D1117' : '#F6F8FA',
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#10B98140',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary }}>
                          Record Resolved
                        </Text>
                        {searchResult.is_legacy && (
                          <View
                            style={{
                              backgroundColor: '#F59E0B20',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '700' }}>
                              Legacy Crosswalk Match
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ gap: 6 }}>
                        <Text style={{ fontSize: 13, color: textSecondary }}>
                          Person Role: <Text style={{ fontWeight: '700', color: textPrimary, textTransform: 'capitalize' }}>{searchResult.person_type}</Text>
                        </Text>
                        <Text style={{ fontSize: 13, color: textSecondary }}>
                          Current Official Number:{' '}
                          <Text style={{ fontWeight: '800', color: '#FF6900', fontSize: 15 }}>
                            {searchResult.active_number}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: isDark ? '#0D1117' : '#F6F8FA',
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor,
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="alert-circle-outline" size={28} color={textSecondary} style={{ marginBottom: 6 }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>
                        No Match Found
                      </Text>
                      <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginTop: 2 }}>
                        No current record or legacy crosswalk entry matches "{lookupQuery.trim()}".
                      </Text>
                    </View>
                  )
                )}
              </View>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: textSecondary }}>
                    Total Migrated Identifiers:{' '}
                    <Text style={{ fontWeight: '700', color: textPrimary }}>{crosswalkRecords.length}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={handleExportCsv}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor,
                    }}
                  >
                    <Ionicons name="download-outline" size={16} color={textPrimary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>
                      Download CSV
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingCrosswalk ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FF6900" />
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 8 }}>
                      Loading crosswalk archive...
                    </Text>
                  </View>
                ) : crosswalkRecords.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: textSecondary }}>
                      No legacy crosswalk records in archive.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {crosswalkRecords.slice(0, 50).map((record, index) => (
                      <View
                        key={`${record.person_id}-${index}`}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                          borderRadius: 8,
                          padding: 10,
                          borderWidth: 1,
                          borderColor,
                        }}
                      >
                        <View>
                          <Text style={{ fontSize: 11, color: textSecondary, textTransform: 'capitalize' }}>
                            {record.person_type}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary }}>
                            Old: <Text style={{ textDecorationLine: 'line-through' }}>{record.old_identifier}</Text>
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 11, color: textSecondary }}>New Assigned Number</Text>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981' }}>
                            {record.new_identifier}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {crosswalkRecords.length > 50 && (
                      <Text style={{ fontSize: 11, color: textSecondary, textAlign: 'center', marginTop: 4 }}>
                        Showing first 50 records. Download CSV for complete crosswalk.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
