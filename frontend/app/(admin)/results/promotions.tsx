import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { GradingAPI } from '@/services/GradingService';
import { PromotionAPI, type PromotionCycle, type PromotionDecision } from '@/services/PromotionService';
import { api } from '@/services/api';
import { router } from 'expo-router';
import { CheckCircle2, PlayCircle, RefreshCw, ShieldCheck, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ClassRow = { id: string; display_name?: string; name?: string };
type TermRow = { id: string; name: string; locked_at?: string | null };

const selectCardColor = (isDark: boolean) => (isDark ? '#13103A' : '#FFFFFF');
const selectBorderColor = (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB');

export default function AdminPromotionsScreen() {
  const { isDark } = useTheme();
  const card = selectCardColor(isDark);
  const border = selectBorderColor(isDark);
  const text = isDark ? '#F9FAFB' : '#111827';
  const muted = isDark ? '#9CA3AF' : '#6B7280';

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [cycles, setCycles] = useState<PromotionCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [decisions, setDecisions] = useState<PromotionDecision[]>([]);

  const [name, setName] = useState('');
  const [termId, setTermId] = useState('');
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [minAvg, setMinAvg] = useState('50');
  const [minAtt, setMinAtt] = useState('0');

  const selectedTerm = useMemo(() => terms.find((t) => t.id === termId) || null, [termId, terms]);
  const selectedFromClass = useMemo(() => classes.find((c) => c.id === fromClassId) || null, [classes, fromClassId]);
  const selectedToClass = useMemo(() => classes.find((c) => c.id === toClassId) || null, [classes, toClassId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [classData, termData, cycleData] = await Promise.all([
        api.get('/classes').then((r) => r.data || []),
        GradingAPI.getTerms(),
        PromotionAPI.getCycles(),
      ]);

      setClasses(Array.isArray(classData) ? classData : []);
      setTerms((Array.isArray(termData) ? termData : []).map((t: { id: string; name: string; locked_at?: string | null }) => ({ id: t.id, name: t.name, locked_at: t.locked_at || null })));
      setCycles(Array.isArray(cycleData) ? cycleData : []);

      if (!termId && Array.isArray(termData) && termData[0]?.id) {
        setTermId(termData[0].id);
      }
      if (!fromClassId && Array.isArray(classData) && classData[0]?.id) {
        setFromClassId(classData[0].id);
      }
      if (!toClassId && Array.isArray(classData) && classData[1]?.id) {
        setToClassId(classData[1].id);
      }

      if (!selectedCycleId && cycleData?.[0]?.id) {
        setSelectedCycleId(cycleData[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [fromClassId, selectedCycleId, termId, toClassId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
    Alert.alert('Execute promotion', 'This will move eligible students to the next class. Continue?', [
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
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F0B2E' : '#F9FAFB' }}>
        <UnifiedHeader title="Promotions" subtitle="Progression Engine" role="Admin" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F0B2E' : '#F9FAFB' }}>
      <UnifiedHeader title="Promotions" subtitle="Progression Engine" role="Admin" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ color: text, fontWeight: '700', marginBottom: 10 }}>Create Cycle</Text>
          <Text style={{ color: muted, fontSize: 12, marginBottom: 8 }}>
            Loaded {classes.length} classes and {terms.length} terms.
          </Text>
          <TextInput value={name} onChangeText={setName} placeholder="Cycle name" placeholderTextColor={muted} style={{ color: text, borderColor: border, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 }} />
          <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Term</Text>
          <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
            <Picker selectedValue={termId} onValueChange={(v) => setTermId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
              {terms.map((t) => (
                <Picker.Item key={t.id} label={`${t.name}${t.locked_at ? ' (Locked)' : ''}`} value={t.id} />
              ))}
            </Picker>
          </View>
          <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>From Class</Text>
          <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
            <Picker selectedValue={fromClassId} onValueChange={(v) => setFromClassId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
              {classes.map((c) => (
                <Picker.Item key={c.id} label={c.display_name || c.name || c.id} value={c.id} />
              ))}
            </Picker>
          </View>
          <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>To Class</Text>
          <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
            <Picker selectedValue={toClassId} onValueChange={(v) => setToClassId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
              {classes.map((c) => (
                <Picker.Item key={c.id} label={c.display_name || c.name || c.id} value={c.id} />
              ))}
            </Picker>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={minAvg} onChangeText={setMinAvg} placeholder="Min Avg %" placeholderTextColor={muted} keyboardType="numeric" style={{ flex: 1, color: text, borderColor: border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
            <TextInput value={minAtt} onChangeText={setMinAtt} placeholder="Min Attendance %" placeholderTextColor={muted} keyboardType="numeric" style={{ flex: 1, color: text, borderColor: border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
          </View>
          <Text style={{ color: muted, marginTop: 8, fontSize: 12 }}>
            Path: {selectedFromClass?.display_name || selectedFromClass?.name || '-'} → {selectedToClass?.display_name || selectedToClass?.name || '-'}
          </Text>
          {selectedTerm?.locked_at ? (
            <Text style={{ color: '#EF4444', marginTop: 8, fontSize: 12 }}>Selected term is locked. Execution is blocked by backend policies.</Text>
          ) : null}
          <TouchableOpacity onPress={createCycle} disabled={working} style={{ marginTop: 10, backgroundColor: '#FF6B00', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Create Promotion Cycle</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ color: text, fontWeight: '700', marginBottom: 10 }}>Cycle Actions</Text>
          <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Promotion Cycle</Text>
          <View style={{ borderColor: border, borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
            <Picker selectedValue={selectedCycleId} onValueChange={(v) => setSelectedCycleId(String(v))} dropdownIconColor={muted} style={{ color: text }}>
              <Picker.Item label="Select cycle" value="" />
              {cycles.map((c) => (
                <Picker.Item key={c.id} label={`${c.name} (${c.status})`} value={c.id} />
              ))}
            </Picker>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={previewCycle} disabled={working || !selectedCycleId} style={{ flex: 1, backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Preview</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={executeCycle} disabled={working || !selectedCycleId} style={{ flex: 1, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <PlayCircle size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Execute</Text>
              </View>
            </TouchableOpacity>
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
      </ScrollView>
    </View>
  );
}
