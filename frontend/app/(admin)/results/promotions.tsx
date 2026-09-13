import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { Spinner } from '@/components/ui/Spinner';
import { SubscriptionGate } from '@/components/shared/SubscriptionComponents';
import { HelpTooltip } from '@/components/settings/HelpTooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { GradingAPI } from '@/services/GradingService';
import { PromotionAPI, type PromotionCycle, type PromotionDecision } from '@/services/PromotionService';
import { api } from '@/services/api';
import { formatClassLabel } from '@/utils/classLabel';
import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  UserCheck,
  Users,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ClassRow = {
  id: string;
  name?: string;
  class_type?: string;
  grade_level?: number | string | null;
  form_level?: number | string | null;
  stream?: string | null;
  capacity?: number;
};
type TermRow = { id: string; name: string; locked_at?: string | null };

type StudentRow = {
  student_id: string;
  full_name: string;
  email?: string;
  grade_level?: string | number;
  form_level?: string | number;
};

const selectCardColor = (isDark: boolean) => (isDark ? '#161B22' : '#F6F8FA');
const selectBorderColor = (isDark: boolean) => (isDark ? '#21262D' : '#D0D7DE');

export default function AdminPromotionsScreen() {
  const { isDark } = useTheme();
  const tier = useSubscriptionTier();
  const card = selectCardColor(isDark);
  const border = selectBorderColor(isDark);
  const text = isDark ? '#FFFFFF' : '#111827';
  const muted = isDark ? '#9CA3AF' : '#6B7280';

  const [activeTab, setActiveTab] = useState<'class' | 'individual' | 'cycles'>('class');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [cycles, setCycles] = useState<PromotionCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [decisions, setDecisions] = useState<PromotionDecision[]>([]);

  // Promotion Cycles state
  const [name, setName] = useState('');
  const [termId, setTermId] = useState('');
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [minAvg, setMinAvg] = useState('50');
  const [minAtt, setMinAtt] = useState('0');

  // Class Promotion state
  const [classFromId, setClassFromId] = useState('');
  const [classStudents, setClassStudents] = useState<StudentRow[]>([]);
  const [targetInfo, setTargetInfo] = useState<{
    classes: Array<{
      id: string;
      name: string;
      grade_level?: number;
      form_level?: number;
      stream?: string;
      capacity?: number;
      current_enrollment: number;
    }>;
    has_multiple_classes: boolean;
    is_senior_secondary: boolean;
    tracks: Array<{ id: string; name: string; code?: string }>;
  } | null>(null);
  const [reshuffleMode, setReshuffleMode] = useState(true);
  const [singleTargetClassId, setSingleTargetClassId] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');

  // Individual Promotion state
  const [indivClassId, setIndivClassId] = useState('');
  const [indivStudents, setIndivStudents] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [indivTargetClassId, setIndivTargetClassId] = useState('');
  const [indivTracks, setIndivTracks] = useState<Array<{ id: string; name: string }>>([]);
  const [indivTrackId, setIndivTrackId] = useState('');

  const selectedTerm = useMemo(() => terms.find((t) => t.id === termId) || null, [termId, terms]);
  const selectedFromClass = useMemo(() => classes.find((c) => c.id === fromClassId) || null, [classes, fromClassId]);
  const selectedToClass = useMemo(() => classes.find((c) => c.id === toClassId) || null, [classes, toClassId]);
  const pickerItemColor = isDark ? '#FFFFFF' : '#111827';
  const pickerDropdownItemColor = Platform.OS === 'android' ? '#111827' : pickerItemColor;

  const openManual = (anchor?: string) => {
    router.push({ pathname: '/(admin)/accessibility/settings', params: { manual: '1', anchor: anchor || 'promotion-engine' } } as any);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [classData, termData, cycleData] = await Promise.all([
        api.get('/classes').then((r) => r.data || []),
        GradingAPI.getTerms(),
        PromotionAPI.getCycles(),
      ]);

      const classList = Array.isArray(classData) ? classData : [];
      setClasses(classList);
      setTerms((Array.isArray(termData) ? termData : []).map((t: { id: string; name: string; locked_at?: string | null }) => ({ id: t.id, name: t.name, locked_at: t.locked_at || null })));
      setCycles(Array.isArray(cycleData) ? cycleData : []);

      if (!termId && Array.isArray(termData) && termData[0]?.id) {
        setTermId(termData[0].id);
      }
      if (!fromClassId && classList[0]?.id) {
        setFromClassId(classList[0].id);
      }
      if (!toClassId && classList[1]?.id) {
        setToClassId(classList[1].id);
      }
      if (!classFromId && classList[0]?.id) {
        setClassFromId(classList[0].id);
      }
      if (!indivClassId && classList[0]?.id) {
        setIndivClassId(classList[0].id);
      }
      if (!indivTargetClassId && classList[1]?.id) {
        setIndivTargetClassId(classList[1].id);
      }
      if (!selectedCycleId && cycleData?.[0]?.id) {
        setSelectedCycleId(cycleData[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [classFromId, fromClassId, indivClassId, indivTargetClassId, selectedCycleId, termId, toClassId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Load students and target classes whenever classFromId changes
  useEffect(() => {
    if (!classFromId) return;

    let isMounted = true;
    (async () => {
      try {
        const [studentsRes, targetRes] = await Promise.all([
          api.get(`/classes/${classFromId}/students`).then((r) => r.data || []),
          PromotionAPI.getTargetClasses({ source_class_id: classFromId }),
        ]);

        if (!isMounted) return;
        setClassStudents(Array.isArray(studentsRes) ? studentsRes : []);
        setTargetInfo(targetRes);

        if (targetRes?.classes && targetRes.classes.length > 0) {
          setSingleTargetClassId(targetRes.classes[0].id);
        }
        if (targetRes?.has_multiple_classes) {
          setReshuffleMode(true);
        } else {
          setReshuffleMode(false);
        }
        if (targetRes?.tracks && targetRes.tracks.length > 0) {
          setSelectedTrackId(targetRes.tracks[0].id);
        }
      } catch (err) {
        console.error('Failed to load class promotion context:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [classFromId]);

  // Load students for individual promotion tab
  useEffect(() => {
    if (!indivClassId) return;

    let isMounted = true;
    (async () => {
      try {
        const studentsRes = await api.get(`/classes/${indivClassId}/students`).then((r) => r.data || []);
        if (!isMounted) return;
        const list = Array.isArray(studentsRes) ? studentsRes : [];
        setIndivStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].student_id);
        } else {
          setSelectedStudentId('');
        }
      } catch (err) {
        console.error('Failed to load individual tab students:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [indivClassId]);

  // Check if indivTargetClassId is senior secondary
  useEffect(() => {
    if (!indivTargetClassId) return;
    const targetCls = classes.find((c) => c.id === indivTargetClassId);
    const gradeNum = Number(targetCls?.grade_level || 0);
    const formNum = Number(targetCls?.form_level || 0);
    const isSenior = gradeNum >= 10 || formNum >= 3;

    if (isSenior) {
      api.get('/tracks').then((r) => {
        const trs = r.data || [];
        setIndivTracks(trs);
        if (trs.length > 0) setIndivTrackId(trs[0].id);
      }).catch(() => {});
    } else {
      setIndivTracks([]);
      setIndivTrackId('');
    }
  }, [classes, indivTargetClassId]);

  const loadDecisions = useCallback(async (cycleId: string) => {
    if (!cycleId) {
      setDecisions([]);
      return;
    }
    const data = await PromotionAPI.getDecisions(cycleId);
    setDecisions(data || []);
  }, []);

  useEffect(() => {
    loadDecisions(selectedCycleId);
  }, [selectedCycleId, loadDecisions]);

  // Handle Class Promotion
  const handlePromoteClass = async () => {
    if (!classFromId) {
      Alert.alert('Validation', 'Please select a source class to promote.');
      return;
    }

    if (!targetInfo || targetInfo.classes.length === 0) {
      Alert.alert('No Destination Classes', 'No classes exist at the next level for this class.');
      return;
    }

    const shouldReshuffle = reshuffleMode && targetInfo.has_multiple_classes;
    if (!shouldReshuffle && !singleTargetClassId) {
      Alert.alert('Validation', 'Please select a target destination class.');
      return;
    }

    const sourceCls = classes.find((c) => c.id === classFromId);
    const targetCls = classes.find((c) => c.id === singleTargetClassId);
    const studentCount = classStudents.length;

    const confirmMessage = shouldReshuffle
      ? `Promote ${studentCount} students from ${formatClassLabel(sourceCls)} and evenly reshuffle them across ${targetInfo.classes.length} destination classes (balancing class headcounts)?`
      : `Promote all ${studentCount} students from ${formatClassLabel(sourceCls)} to ${targetCls ? formatClassLabel(targetCls) : 'selected class'}?`;

    Alert.alert('Confirm Class Promotion', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Promote Class',
        style: 'default',
        onPress: async () => {
          setWorking(true);
          try {
            const res = await PromotionAPI.promoteClass({
              from_class_id: classFromId,
              to_class_id: shouldReshuffle ? undefined : singleTargetClassId,
              reshuffle: shouldReshuffle,
              track_id: targetInfo.is_senior_secondary ? selectedTrackId : undefined,
            });

            Alert.alert('Promotion Complete', res.message || `Successfully promoted ${res.data?.promoted_count || 0} students with full class property inheritance.`);
            await loadAll();
          } catch (err: any) {
            Alert.alert('Promotion Error', err?.response?.data?.error || err?.message || 'Failed to promote class.');
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  };

  // Handle Individual Promotion
  const handlePromoteIndividual = async () => {
    if (!selectedStudentId || !indivTargetClassId) {
      Alert.alert('Validation', 'Please select both a student and a target class.');
      return;
    }

    const studentObj = indivStudents.find((s) => s.student_id === selectedStudentId);
    const targetCls = classes.find((c) => c.id === indivTargetClassId);

    Alert.alert(
      'Confirm Individual Promotion',
      `Promote ${studentObj?.full_name || 'student'} to ${targetCls ? formatClassLabel(targetCls) : 'selected class'} with full class property inheritance?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            setWorking(true);
            try {
              const res = await PromotionAPI.promoteIndividual({
                student_id: selectedStudentId,
                to_class_id: indivTargetClassId,
                track_id: indivTrackId || undefined,
              });
              Alert.alert('Success', res.message || 'Student promoted successfully.');
              await loadAll();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to promote student.');
            } finally {
              setWorking(false);
            }
          },
        },
      ]
    );
  };

  // Handle Cycle Creation
  const createCycle = async () => {
    if (!name || !termId || !fromClassId || !toClassId) {
      Alert.alert('Missing fields', 'Please complete all required fields.');
      return;
    }
    if (fromClassId === toClassId) {
      Alert.alert('Invalid selection', 'From and To class must be different.');
      return;
    }

    setWorking(true);
    try {
      const cycle = await PromotionAPI.createCycle({
        name,
        term_id: termId,
        from_class_id: fromClassId,
        to_class_id: toClassId,
        min_average_percentage: Number(minAvg || 50),
        min_attendance_percentage: Number(minAtt || 0),
      });
      await loadAll();
      setSelectedCycleId(cycle.id);
      Alert.alert('Created', 'Promotion cycle created.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create cycle.');
    } finally {
      setWorking(false);
    }
  };

  const previewCycle = async () => {
    if (!selectedCycleId) return;
    setWorking(true);
    try {
      const out = await PromotionAPI.previewCycle(selectedCycleId, true);
      await loadDecisions(selectedCycleId);
      Alert.alert('Preview ready', `Eligible: ${out?.eligible_students || 0}, Retained: ${out?.retained_students || 0}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to preview cycle.');
    } finally {
      setWorking(false);
    }
  };

  const executeCycle = async () => {
    if (!selectedCycleId) return;
    Alert.alert('Execute promotion', 'This will move eligible students to the next class and inherit new subjects and timetable. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Execute',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            const out = await PromotionAPI.executeCycle(selectedCycleId);
            await loadAll();
            await loadDecisions(selectedCycleId);
            Alert.alert('Completed', `Promoted: ${out?.promoted || 0}, Failed: ${out?.failed || 0}`);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to execute cycle.');
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#FFFFFF' }}>
        <UnifiedHeader title="Promotions" subtitle="Progression Engine" role="Admin" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FF6900" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#FFFFFF' }}>
      <UnifiedHeader title="Promotions" subtitle="Progression Engine" role="Admin" onBack={() => router.back()} />
      <SubscriptionGate
        feature="analytics"
        fallback={
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
              <Text style={{ color: text, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>Promotion Engine Guide Locked</Text>
              <Text style={{ color: muted, fontSize: 12, marginBottom: 12 }}>
                Enable Analytics add-on to access enhanced promotion documentation and guided controls.
              </Text>
            </View>
          </View>
        }
      >
        {/* Navigation Tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setActiveTab('class')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab === 'class' ? '#FF6900' : card,
              borderWidth: 1,
              borderColor: activeTab === 'class' ? '#FF6900' : border,
            }}
          >
            <Text style={{ color: activeTab === 'class' ? '#FFF' : text, fontWeight: '700', fontSize: 13 }}>
              Class Promotion
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('individual')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab === 'individual' ? '#FF6900' : card,
              borderWidth: 1,
              borderColor: activeTab === 'individual' ? '#FF6900' : border,
            }}
          >
            <Text style={{ color: activeTab === 'individual' ? '#FFF' : text, fontWeight: '700', fontSize: 13 }}>
              Individual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('cycles')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab === 'cycles' ? '#FF6900' : card,
              borderWidth: 1,
              borderColor: activeTab === 'cycles' ? '#FF6900' : border,
            }}
          >
            <Text style={{ color: activeTab === 'cycles' ? '#FFF' : text, fontWeight: '700', fontSize: 13 }}>
              Term Cycles
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* TAB 1: CLASS PROMOTION */}
          {activeTab === 'class' && (
            <View>
              {/* Source Class Selection */}
              <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: text, fontWeight: '700', fontSize: 15 }}>1. Select Class to Promote</Text>
                  <View style={{ backgroundColor: '#3b82f620', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: '#3b82f6', fontSize: 11, fontWeight: '700' }}>{classStudents.length} Students</Text>
                  </View>
                </View>

                <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 12, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                  <Picker selectedValue={classFromId} onValueChange={(v) => setClassFromId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                    {classes.map((c) => (
                      <Picker.Item key={c.id} label={formatClassLabel(c)} value={c.id} color={pickerDropdownItemColor} />
                    ))}
                  </Picker>
                </View>

                {/* Destination Classes Insight */}
                {targetInfo && (
                  <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: border }}>
                    <Text style={{ color: text, fontWeight: '700', fontSize: 14, marginBottom: 6 }}>
                      Target Level Classes ({targetInfo.classes.length})
                    </Text>

                    {targetInfo.classes.length === 0 ? (
                      <View style={{ backgroundColor: isDark ? '#450a0a' : '#fef2f2', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#991b1b' : '#fecaca', marginBottom: 10 }}>
                        <Text style={{ color: isDark ? '#fecaca' : '#991b1b', fontSize: 12, fontWeight: '600' }}>
                          No classes exist at the next level for this class. Please create a destination class first.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 6, marginBottom: 12 }}>
                        {targetInfo.classes.map((tc) => (
                          <View
                            key={tc.id}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: 10,
                              borderRadius: 8,
                              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: border,
                            }}
                          >
                            <Text style={{ color: text, fontWeight: '600', fontSize: 13 }}>{tc.name}</Text>
                            <Text style={{ color: muted, fontSize: 12 }}>
                              Headcount: {tc.current_enrollment} {tc.capacity ? `/ ${tc.capacity}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Reshuffle vs Single Target Class Option */}
                    {targetInfo.has_multiple_classes ? (
                      <View style={{ marginTop: 6, marginBottom: 14 }}>
                        <Text style={{ color: text, fontWeight: '700', fontSize: 13, marginBottom: 8 }}>
                          Destination Mode:
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => setReshuffleMode(true)}
                            style={{
                              flex: 1,
                              padding: 12,
                              borderRadius: 10,
                              borderWidth: 1.5,
                              borderColor: reshuffleMode ? '#10b981' : border,
                              backgroundColor: reshuffleMode ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#1F2937' : '#FFFFFF'),
                              alignItems: 'center',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Shuffle size={14} color={reshuffleMode ? '#10b981' : muted} />
                              <Text style={{ color: reshuffleMode ? (isDark ? '#a7f3d0' : '#047857') : text, fontWeight: '700', fontSize: 12 }}>
                                Even Reshuffle
                              </Text>
                            </View>
                            <Text style={{ color: muted, fontSize: 11, textAlign: 'center' }}>
                              Balances students across all destination classes
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setReshuffleMode(false)}
                            style={{
                              flex: 1,
                              padding: 12,
                              borderRadius: 10,
                              borderWidth: 1.5,
                              borderColor: !reshuffleMode ? '#3b82f6' : border,
                              backgroundColor: !reshuffleMode ? (isDark ? '#1e3a8a' : '#eff6ff') : (isDark ? '#1F2937' : '#FFFFFF'),
                              alignItems: 'center',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Users size={14} color={!reshuffleMode ? '#3b82f6' : muted} />
                              <Text style={{ color: !reshuffleMode ? (isDark ? '#93c5fd' : '#1d4ed8') : text, fontWeight: '700', fontSize: 12 }}>
                                Single Class
                              </Text>
                            </View>
                            <Text style={{ color: muted, fontSize: 11, textAlign: 'center' }}>
                              Moves all students into one target class
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {!reshuffleMode && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Select Target Class</Text>
                            <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                              <Picker selectedValue={singleTargetClassId} onValueChange={(v) => setSingleTargetClassId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                                {targetInfo.classes.map((tc) => (
                                  <Picker.Item key={tc.id} label={tc.name} value={tc.id} color={pickerDropdownItemColor} />
                                ))}
                              </Picker>
                            </View>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 14 }}>
                        <Text style={{ color: muted, fontSize: 12 }}>
                          Single destination class available ({targetInfo.classes[0]?.name || 'Target Class'}). Reshuffling is automatically disabled. All students will move into this class.
                        </Text>
                      </View>
                    )}

                    {/* Senior Secondary Track Selection */}
                    {targetInfo.is_senior_secondary && (
                      <View style={{ backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#3730a3' : '#c7d2fe', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <GraduationCap size={16} color="#4f46e5" />
                          <Text style={{ color: isDark ? '#c7d2fe' : '#3730a3', fontWeight: '700', fontSize: 13 }}>
                            Senior Secondary Track Selection (Grade 10+)
                          </Text>
                        </View>
                        <Text style={{ color: isDark ? '#a5b4fc' : '#4338ca', fontSize: 12, marginBottom: 8 }}>
                          Students entering Senior Secondary will automatically be assigned this track and inherit all compulsory track subjects.
                        </Text>
                        {targetInfo.tracks.length > 0 ? (
                          <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                            <Picker selectedValue={selectedTrackId} onValueChange={(v) => setSelectedTrackId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                              {targetInfo.tracks.map((tr) => (
                                <Picker.Item key={tr.id} label={tr.name} value={tr.id} color={pickerDropdownItemColor} />
                              ))}
                            </Picker>
                          </View>
                        ) : (
                          <Text style={{ color: muted, fontSize: 12, fontStyle: 'italic' }}>
                            No formal academic tracks configured in settings. Standard subjects will apply.
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      onPress={handlePromoteClass}
                      disabled={working || targetInfo.classes.length === 0 || classStudents.length === 0}
                      style={{
                        backgroundColor: (targetInfo.classes.length === 0 || classStudents.length === 0) ? muted : '#FF6900',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        marginTop: 6,
                      }}
                    >
                      {working ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ArrowRight size={16} color="#FFF" />
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                            Promote Class ({classStudents.length} Students)
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 2: INDIVIDUAL PROMOTION */}
          {activeTab === 'individual' && (
            <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
              <Text style={{ color: text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>Promote Individual Student</Text>

              {/* Filter by class to find student */}
              <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Filter by Current Class</Text>
              <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 12, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Picker selectedValue={indivClassId} onValueChange={(v) => setIndivClassId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                  {classes.map((c) => (
                    <Picker.Item key={c.id} label={formatClassLabel(c)} value={c.id} color={pickerDropdownItemColor} />
                  ))}
                </Picker>
              </View>

              {/* Select Student */}
              <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Select Student ({indivStudents.length})</Text>
              <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 14, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Picker selectedValue={selectedStudentId} onValueChange={(v) => setSelectedStudentId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                  {indivStudents.length === 0 ? (
                    <Picker.Item label="No students in this class" value="" color={pickerDropdownItemColor} />
                  ) : (
                    indivStudents.map((s) => (
                      <Picker.Item key={s.student_id} label={`${s.full_name} (${s.student_id.slice(0, 8)})`} value={s.student_id} color={pickerDropdownItemColor} />
                    ))
                  )}
                </Picker>
              </View>

              {/* Destination Class */}
              <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Select Target Class</Text>
              <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 14, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Picker selectedValue={indivTargetClassId} onValueChange={(v) => setIndivTargetClassId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                  {classes.map((c) => (
                    <Picker.Item key={c.id} label={formatClassLabel(c)} value={c.id} color={pickerDropdownItemColor} />
                  ))}
                </Picker>
              </View>

              {/* Track option if Senior Secondary */}
              {indivTracks.length > 0 && (
                <View style={{ backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', padding: 12, borderRadius: 10, marginBottom: 14 }}>
                  <Text style={{ color: isDark ? '#c7d2fe' : '#3730a3', fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
                    Senior Secondary Track
                  </Text>
                  <View style={{ borderColor: border, borderWidth: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                    <Picker selectedValue={indivTrackId} onValueChange={(v) => setIndivTrackId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                      {indivTracks.map((tr) => (
                        <Picker.Item key={tr.id} label={tr.name} value={tr.id} color={pickerDropdownItemColor} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handlePromoteIndividual}
                disabled={working || !selectedStudentId || !indivTargetClassId}
                style={{
                  backgroundColor: (!selectedStudentId || !indivTargetClassId) ? muted : '#10B981',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                {working ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Promote Student</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: TERM CYCLES (ORIGINAL ENGINE) */}
          {activeTab === 'cycles' && (
            <View>
              <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: text, fontWeight: '700' }}>Create Promotion Cycle</Text>
                  <HelpTooltip id="promotion.cycle_name" role="admin" tier={tier} onLearnMore={openManual} />
                </View>
                <Text style={{ color: muted, fontSize: 12, marginBottom: 8 }}>
                  Loaded {classes.length} classes and {terms.length} terms.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput value={name} onChangeText={setName} placeholder="Cycle name" placeholderTextColor={muted} style={{ flex: 1, color: text, borderColor: border, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 }} />
                  <HelpTooltip id="promotion.cycle_name" role="admin" tier={tier} onLearnMore={openManual} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: muted, fontSize: 12 }}>Term</Text>
                  <HelpTooltip id="promotion.term" role="admin" tier={tier} onLearnMore={openManual} />
                </View>
                <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                  <Picker selectedValue={termId} onValueChange={(v) => setTermId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                    {terms.map((t) => (
                      <Picker.Item key={t.id} label={`${t.name}${t.locked_at ? ' (Locked)' : ''}`} value={t.id} color={pickerDropdownItemColor} />
                    ))}
                  </Picker>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: muted, fontSize: 12 }}>From Class</Text>
                  <HelpTooltip id="promotion.from_class" role="admin" tier={tier} onLearnMore={openManual} />
                </View>
                <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                  <Picker selectedValue={fromClassId} onValueChange={(v) => setFromClassId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                    {classes.map((c) => (
                      <Picker.Item key={c.id} label={formatClassLabel(c)} value={c.id} color={pickerDropdownItemColor} />
                    ))}
                  </Picker>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: muted, fontSize: 12 }}>To Class</Text>
                  <HelpTooltip id="promotion.to_class" role="admin" tier={tier} onLearnMore={openManual} />
                </View>
                <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                  <Picker selectedValue={toClassId} onValueChange={(v) => setToClassId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                    {classes.map((c) => (
                      <Picker.Item key={c.id} label={formatClassLabel(c)} value={c.id} color={pickerDropdownItemColor} />
                    ))}
                  </Picker>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput value={minAvg} onChangeText={setMinAvg} placeholder="Min Avg %" placeholderTextColor={muted} keyboardType="numeric" style={{ flex: 1, color: text, borderColor: border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
                    <HelpTooltip id="promotion.min_average" role="admin" tier={tier} onLearnMore={openManual} />
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput value={minAtt} onChangeText={setMinAtt} placeholder="Min Attendance %" placeholderTextColor={muted} keyboardType="numeric" style={{ flex: 1, color: text, borderColor: border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
                    <HelpTooltip id="promotion.min_attendance" role="admin" tier={tier} onLearnMore={openManual} />
                  </View>
                </View>
                <Text style={{ color: muted, marginTop: 8, fontSize: 12 }}>
                  Path: {selectedFromClass ? formatClassLabel(selectedFromClass) : '-'} → {selectedToClass ? formatClassLabel(selectedToClass) : '-'}
                </Text>
                {selectedTerm?.locked_at ? (
                  <Text style={{ color: '#EF4444', marginTop: 8, fontSize: 12 }}>Selected term is locked. Execution is blocked by backend policies.</Text>
                ) : null}
                <TouchableOpacity onPress={createCycle} disabled={working} style={{ marginTop: 10, backgroundColor: '#FF6900', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Create Promotion Cycle</Text>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <Text style={{ color: text, fontWeight: '700', marginBottom: 10 }}>Cycle Actions</Text>
                <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Promotion Cycle</Text>
                <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
                  <Picker selectedValue={selectedCycleId} onValueChange={(v) => setSelectedCycleId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
                    <Picker.Item label="Select cycle" value="" color={pickerDropdownItemColor} />
                    {cycles.map((c) => (
                      <Picker.Item key={c.id} label={`${c.name} (${c.status})`} value={c.id} color={pickerDropdownItemColor} />
                    ))}
                  </Picker>
                </View>
                <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                  <HelpTooltip id="promotion.cycle_select" role="admin" tier={tier} onLearnMore={openManual} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={previewCycle} disabled={working || !selectedCycleId} style={{ flex: 1, backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={14} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Preview</Text>
                    </View>
                  </TouchableOpacity>
                  <HelpTooltip id="promotion.preview" role="admin" tier={tier} onLearnMore={openManual} />
                  <TouchableOpacity onPress={executeCycle} disabled={working || !selectedCycleId} style={{ flex: 1, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <PlayCircle size={14} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Execute</Text>
                    </View>
                  </TouchableOpacity>
                  <HelpTooltip id="promotion.execute" role="admin" tier={tier} onLearnMore={openManual} />
                </View>
                <TouchableOpacity onPress={loadAll} disabled={working} style={{ marginTop: 8, backgroundColor: isDark ? '#1F2937' : '#E5E7EB', paddingVertical: 9, borderRadius: 10, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} color={text} />
                    <Text style={{ color: text, fontWeight: '700', fontSize: 12 }}>Reload Cycles</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <Text style={{ color: text, fontWeight: '700', marginBottom: 10 }}>Existing Cycles ({cycles.length})</Text>
                {cycles.slice(0, 10).map((c) => (
                  <View key={c.id} style={{ paddingVertical: 8, borderBottomColor: border, borderBottomWidth: 1 }}>
                    <Text style={{ color: text, fontWeight: '600', fontSize: 13 }}>{c.name}</Text>
                    <Text style={{ color: muted, fontSize: 12 }}>{c.id} · {c.status}</Text>
                  </View>
                ))}
                {cycles.length === 0 ? <Text style={{ color: muted, fontSize: 12 }}>No cycles yet.</Text> : null}
              </View>

              <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 14 }}>
                <Text style={{ color: text, fontWeight: '700', marginBottom: 10 }}>Decisions ({decisions.length})</Text>
                {decisions.slice(0, 100).map((d) => (
                  <View key={d.id} style={{ paddingVertical: 8, borderBottomColor: border, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: text, fontSize: 13, fontWeight: '600' }}>{d.student_id}</Text>
                      <Text style={{ color: muted, fontSize: 11 }}>{d.reason}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {d.eligible ? <CheckCircle2 size={14} color="#10B981" /> : <Users size={14} color="#EF4444" />}
                      <Text style={{ color: d.eligible ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: 11 }}>{d.status}</Text>
                    </View>
                  </View>
                ))}
                {decisions.length === 0 ? <Text style={{ color: muted, fontSize: 12 }}>No decisions loaded.</Text> : null}
              </View>
            </View>
          )}
        </ScrollView>
      </SubscriptionGate>
    </View>
  );
}
