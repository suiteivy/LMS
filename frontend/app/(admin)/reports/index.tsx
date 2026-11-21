import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import SmartReportsService, {
  CatalogResponse,
  ReportPreset,
  QuerySpec,
} from '@/services/SmartReportsService';
import { ReportBuilderModal } from '@/components/reports/ReportBuilderModal';
import { RecordsDossierModal } from '@/components/reports/RecordsDossierModal';
import { showError, showSuccess } from '@/utils/toast';

export default function AdminReportsCenterPage() {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');

  // Modals
  const [builderVisible, setBuilderVisible] = useState(false);
  const [builderSection, setBuilderSection] = useState('management');
  const [dossierVisible, setDossierVisible] = useState(false);

  const tokens = useMemo(
    () => ({
      bg: isDark ? '#0D1117' : '#F6F8FA',
      card: isDark ? '#161B22' : '#FFFFFF',
      border: isDark ? '#30363D' : '#E5E7EB',
      text: isDark ? '#E6EDF3' : '#111827',
      subtext: isDark ? '#8B949E' : '#6B7280',
      inputBg: isDark ? '#111827' : '#F3F4F6',
    }),
    [isDark]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [cat, saved] = await Promise.all([
        SmartReportsService.getCatalog('management'),
        SmartReportsService.getSavedReports(),
      ]);
      setCatalog(cat);
      setSavedReports(saved);
    } catch (err: any) {
      showError(err.message || 'Failed to load reports catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openBuilder = (section: string = 'management') => {
    setBuilderSection(section);
    setBuilderVisible(true);
  };

  const filteredPresets = useMemo(() => {
    if (!catalog?.presets) return [];
    if (activeSectionFilter === 'all') return catalog.presets;
    return catalog.presets.filter((p) => p.contextSection === activeSectionFilter);
  }, [catalog, activeSectionFilter]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: tokens.card,
          borderBottomWidth: 1,
          borderBottomColor: tokens.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.text }}>
            Universal Reports & History Center
          </Text>
          <Text style={{ fontSize: 12, color: tokens.subtext, marginTop: 2 }}>
            Section-scoped query builder, cumulative records dossiers, and official vector PDFs
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setDossierVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: tokens.inputBg,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: tokens.border,
            }}
          >
            <Ionicons name="folder-open-outline" size={16} color="#FF6900" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.text }}>Records Dossier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openBuilder('management')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#FF6900',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Ionicons name="add-circle" size={16} color="#FFF" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Create Custom Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Filter Pills */}
      <View style={{ backgroundColor: tokens.card, borderBottomWidth: 1, borderBottomColor: tokens.border, paddingHorizontal: 20, paddingVertical: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'students', label: 'Students' },
              { id: 'finance', label: 'Finance & Ledger' },
              { id: 'results', label: 'Results & Academics' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'library', label: 'Library' },
            ].map((sec) => {
              const active = activeSectionFilter === sec.id;
              return (
                <TouchableOpacity
                  key={sec.id}
                  onPress={() => setActiveSectionFilter(sec.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: active ? '#FF6900' : tokens.inputBg,
                    borderWidth: 1,
                    borderColor: active ? '#FF6900' : tokens.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? '#FFF' : tokens.text }}>
                    {sec.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF6900" />
            <Text style={{ color: tokens.subtext, marginTop: 10, fontSize: 13 }}>Loading Reports Center...</Text>
          </View>
        ) : (
          <>
            {/* Dossier Banner Card */}
            <View
              style={{
                backgroundColor: tokens.card,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: '#FF6900',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, paddingRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="shield-checkmark" size={18} color="#FF6900" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.text }}>
                    Cumulative Person Records Dossier
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: tokens.subtext }}>
                  Audit, export, and print the official multi-year institutional history for any student, teacher, or parent. Omits unpermitted areas with clear access disclosure notices.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDossierVisible(true)}
                style={{ backgroundColor: '#FF6900', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Launch Dossier</Text>
              </TouchableOpacity>
            </View>

            {/* Presets Grid */}
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.text, marginBottom: 10 }}>
                Standard Starter Presets ({filteredPresets.length})
              </Text>
              <View style={{ gap: 10 }}>
                {filteredPresets.map((p) => (
                  <View
                    key={p.code}
                    style={{
                      backgroundColor: tokens.card,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>{p.title}</Text>
                        <View style={{ backgroundColor: tokens.inputBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#FF6900' }}>
                            {p.contextSection.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: tokens.subtext, marginTop: 4 }}>{p.description}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => openBuilder(p.contextSection)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: tokens.border,
                      }}
                    >
                      <Ionicons name="play" size={14} color="#FF6900" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.text }}>Run / Customize</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Saved Reports */}
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.text, marginBottom: 10 }}>
                Saved & Scheduled Reports ({savedReports.length})
              </Text>
              {savedReports.length === 0 ? (
                <View
                  style={{
                    backgroundColor: tokens.card,
                    padding: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: tokens.border,
                  }}
                >
                  <Ionicons name="bookmark-outline" size={28} color={tokens.subtext} />
                  <Text style={{ fontSize: 13, color: tokens.subtext, marginTop: 8 }}>
                    No saved reports yet. Custom reports you save will appear here for 1-click re-generation.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {savedReports.map((r) => (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: tokens.card,
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>{r.title}</Text>
                        <Text style={{ fontSize: 11, color: tokens.subtext, marginTop: 2 }}>
                          Module: {r.context_section} | Created: {new Date(r.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openBuilder(r.context_section)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: tokens.inputBg }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#FF6900' }}>Re-run</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Report Builder Modal */}
      <ReportBuilderModal
        visible={builderVisible}
        onClose={() => setBuilderVisible(false)}
        sectionContext={builderSection}
      />

      {/* Records Dossier Modal */}
      <RecordsDossierModal
        visible={dossierVisible}
        onClose={() => setDossierVisible(false)}
      />
    </SafeAreaView>
  );
}
