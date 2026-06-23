import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    FileText,
    Filter,
    RefreshCw,
    Send,
    Shield,
    Users,
    XCircle,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GradingAPI } from '@/services/GradingService';
import { api } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';

// ─── Types ─────────────────────────────────────────────────

interface ClassOption {
    id: string;
    name: string;
    display_name?: string;
}

interface TermOption {
    id: string;
    name: string;
    term_number?: number;
    is_current?: boolean;
    start_date?: string;
    end_date?: string;
}

interface SubjectOption {
    id: string;
    title: string;
}

interface MissingStudent {
    student_id: string;
    student_name: string;
    admission_number?: string;
}

interface SubjectCompleteness {
    subject_id: string;
    subject_name: string;
    total_students: number;
    graded_students: number;
    missing_students: MissingStudent[];
    is_complete: boolean;
}

interface ReportCardStudent {
    id: string;
    student_id: string;
    student_name: string;
    admission_number?: string;
    status: 'draft' | 'pending_review' | 'published' | 'released';
    gpa?: number;
    average_score?: number;
    total_score?: number;
}

interface ReportCardSummary {
    total_students: number;
    generated: number;
    published: number;
    released: number;
    average_gpa: number;
}

type TabSection = 'completeness' | 'reportcards';

// ─── Status Helpers ────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    draft: { color: '#6B7280', bg: '#F3F4F6', label: 'Draft' },
    pending_review: { color: '#D97706', bg: '#FEF3C7', label: 'Pending Review' },
    published: { color: '#2563EB', bg: '#DBEAFE', label: 'Published' },
    released: { color: '#059669', bg: '#D1FAE5', label: 'Released' },
};

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const darkBg = isDark
        ? status === 'draft' ? '#374151'
        : status === 'pending_review' ? '#78350F'
        : status === 'published' ? '#1E3A5F'
        : '#064E3B'
        : config.bg;

    return (
        <View style={{ backgroundColor: darkBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ color: config.color, fontSize: 11, fontWeight: '700' }}>{config.label}</Text>
        </View>
    );
}

// ─── Dropdown Selector ─────────────────────────────────────

interface DropdownProps {
    label: string;
    options: { id: string; label: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder?: string;
    isDark: boolean;
    disabled?: boolean;
}

function DropdownSelector({ label, options, selectedId, onSelect, placeholder, isDark, disabled }: DropdownProps) {
    const [open, setOpen] = useState(false);

    const bg = isDark ? '#13103A' : '#FFFFFF';
    const border = isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6';
    const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#F9FAFB';
    const textPrimary = isDark ? '#F9FAFB' : '#111827';
    const textMuted = isDark ? '#6B7280' : '#9CA3AF';

    const selectedLabel = options.find(o => o.id === selectedId)?.label || placeholder || 'Select...';

    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={{
                fontSize: 11, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
            }}>
                {label}
            </Text>
            <TouchableOpacity
                onPress={() => !disabled && setOpen(!open)}
                disabled={disabled}
                style={{
                    backgroundColor: inputBg, borderWidth: 1.5, borderColor: border,
                    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    opacity: disabled ? 0.5 : 1,
                }}
                activeOpacity={0.7}
            >
                <Text style={{
                    color: selectedId ? textPrimary : textMuted,
                    fontSize: 14, fontWeight: selectedId ? '600' : '400',
                    flex: 1,
                }} numberOfLines={1}>
                    {selectedLabel}
                </Text>
                <ChevronDown size={16} color={textMuted} style={{ marginLeft: 8, transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>

            {open && (
                <View style={{
                    backgroundColor: bg, borderWidth: 1.5, borderColor: isDark ? '#3F3F3F' : '#E5E7EB',
                    borderRadius: 14, marginTop: 4, maxHeight: 180, overflow: 'hidden',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.4 : 0.1,
                    shadowRadius: 8, elevation: 5,
                }}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {options.map((option, i) => (
                            <TouchableOpacity
                                key={option.id}
                                onPress={() => { onSelect(option.id); setOpen(false); }}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 12,
                                    borderBottomWidth: i < options.length - 1 ? 1 : 0,
                                    borderBottomColor: border,
                                    backgroundColor: option.id === selectedId ? (isDark ? '#2A1A0A' : '#FFF7F0') : 'transparent',
                                }}
                            >
                                <Text style={{
                                    color: option.id === selectedId ? '#FF6B00' : textPrimary,
                                    fontSize: 14, fontWeight: option.id === selectedId ? '700' : '500',
                                }} numberOfLines={1}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

// ─── Main Component ────────────────────────────────────────

export default function AdminResults() {
    const { isDark } = useTheme();

    // ── Theme colors ──
    const bg = isDark ? '#0F0B2E' : '#F9FAFB';
    const card = isDark ? '#13103A' : '#FFFFFF';
    const border = isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6';
    const textPrimary = isDark ? '#F9FAFB' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const textMuted = isDark ? '#6B7280' : '#9CA3AF';
    const sectionBg = isDark ? '#1A1650' : '#F9FAFB';

    // ── Active tab ──
    const [activeTab, setActiveTab] = useState<TabSection>('completeness');

    // ── Filter state ──
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [terms, setTerms] = useState<TermOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTermId, setSelectedTermId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [resolvedActiveTerm, setResolvedActiveTerm] = useState<TermOption | null>(null);

    // ── Completeness state ──
    const [completenessResults, setCompletenessResults] = useState<SubjectCompleteness[]>([]);
    const [checkingCompleteness, setCheckingCompleteness] = useState(false);
    const [completenessChecked, setCompletenessChecked] = useState(false);

    // ── Report card state ──
    const [reportCards, setReportCards] = useState<ReportCardStudent[]>([]);
    const [reportSummary, setReportSummary] = useState<ReportCardSummary | null>(null);
    const [loadingReportCards, setLoadingReportCards] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [publishingAll, setPublishingAll] = useState(false);
    const [releasingAll, setReleasingAll] = useState(false);
    const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);
    const [manualRefreshing, setManualRefreshing] = useState(false);

    const loadFilters = useCallback(async () => {
        setLoadingFilters(true);
        try {
            const [classData, termData] = await Promise.all([
                api.get('/classes').then(r => r.data),
                GradingAPI.getTerms(),
            ]);

            setClasses(
                (Array.isArray(classData) ? classData : []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    display_name: c.display_name,
                }))
            );

            const mappedTerms = (Array.isArray(termData) ? termData : []).map((t: any) => ({
                id: t.id,
                name: t.name,
                term_number: t.term_number,
                is_current: t.is_current,
                start_date: t.start_date ?? t.startDate,
                end_date: t.end_date ?? t.endDate,
            }));
            setTerms(mappedTerms);

            const activeData = await GradingAPI.getActiveTerm().catch(() => null);
            const activeTerm = activeData?.active_term || null;
            setResolvedActiveTerm(activeTerm);
            if (activeTerm?.id) {
                setSelectedTermId(prev => {
                    if (prev && mappedTerms.some(t => t.id === prev)) return prev;
                    return activeTerm.id;
                });
            }
        } catch (err: any) {
            console.error('loadFilters error:', err);
            showError('Error', 'Failed to load filter options');
        } finally {
            setLoadingFilters(false);
        }
    }, []);

    // ── Fetch filter options + active term ──
    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

    // ── Fetch subjects when class is selected ──
    useEffect(() => {
        if (!selectedClassId) {
            setSubjects([]);
            setSelectedSubjectId('');
            return;
        }
        const loadSubjects = async () => {
            try {
                const data = await api.get(`/subjects/class/${selectedClassId}`).then(r => r.data);
                setSubjects(
                    (Array.isArray(data) ? data : []).map((s: any) => ({
                        id: s.id,
                        title: s.title || s.name || 'Unknown',
                    }))
                );
            } catch {
                setSubjects([]);
            }
        };
        loadSubjects();
    }, [selectedClassId]);

    const hasFilters = !!selectedClassId && !!selectedTermId;

    // ── Completeness ──
    const handleCheckCompleteness = useCallback(async () => {
        if (!selectedClassId || !selectedTermId) {
            Alert.alert('Missing Filters', 'Please select a class and term first.');
            return;
        }
        setCheckingCompleteness(true);
        setCompletenessChecked(false);
        try {
            const params: any = { class_id: selectedClassId, term_id: selectedTermId };
            if (selectedSubjectId) params.subject_id = selectedSubjectId;

            const data = await GradingAPI.checkCompleteness(params);
            const results = Array.isArray(data) ? data : data?.subjects || [];
            setCompletenessResults(results);
            setCompletenessChecked(true);
        } catch (err: any) {
            console.error('checkCompleteness error:', err);
            showError('Error', err.message || 'Failed to check completeness');
        } finally {
            setCheckingCompleteness(false);
        }
    }, [selectedClassId, selectedTermId, selectedSubjectId]);

    // ── Report Cards ──
    const loadReportCards = useCallback(async () => {
        if (!selectedClassId || !selectedTermId) return;
        setLoadingReportCards(true);
        try {
            const params = { class_id: selectedClassId, term_id: selectedTermId };
            const [cards, summary] = await Promise.all([
                GradingAPI.getReportCards(params),
                GradingAPI.getReportCardSummary(params).catch(() => null),
            ]);
            setReportCards(Array.isArray(cards) ? cards : cards?.data || []);
            if (summary) {
                setReportSummary({
                    total_students: summary.total_students || 0,
                    generated: summary.generated || 0,
                    published: summary.published || 0,
                    released: summary.released || 0,
                    average_gpa: summary.average_gpa || 0,
                });
            }
        } catch (err: any) {
            console.error('loadReportCards error:', err);
            showError('Error', err.message || 'Failed to load report cards');
        } finally {
            setLoadingReportCards(false);
        }
    }, [selectedClassId, selectedTermId]);

    useEffect(() => {
        if (hasFilters && activeTab === 'reportcards') {
            loadReportCards();
        }
    }, [hasFilters, activeTab, loadReportCards]);

    // ── Generate single ──
    const handleGenerate = async (studentId: string) => {
        setProcessingStudentId(studentId);
        try {
            await GradingAPI.generateStudentReportCard({
                student_id: studentId,
                class_id: selectedClassId,
                term_id: selectedTermId,
            });
            showSuccess('Generated', 'Report card generated successfully');
            await loadReportCards();
        } catch (err: any) {
            showError('Error', err.message || 'Failed to generate report card');
        } finally {
            setProcessingStudentId(null);
        }
    };

    // ── Publish single ──
    const handlePublish = async (reportCardId: string) => {
        setProcessingStudentId(reportCardId);
        try {
            await GradingAPI.publishReportCard(reportCardId);
            showSuccess('Published', 'Report card published successfully');
            await loadReportCards();
        } catch (err: any) {
            showError('Error', err.message || 'Failed to publish report card');
        } finally {
            setProcessingStudentId(null);
        }
    };

    // ── Release single ──
    const handleRelease = async (reportCardId: string) => {
        setProcessingStudentId(reportCardId);
        try {
            await GradingAPI.releaseReportCard(reportCardId);
            showSuccess('Released', 'Report card released to parents');
            await loadReportCards();
        } catch (err: any) {
            showError('Error', err.message || 'Failed to release report card');
        } finally {
            setProcessingStudentId(null);
        }
    };

    // ── Bulk generate ──
    const handleGenerateAll = () => {
        if (!hasFilters) return;
        Alert.alert(
            'Generate All Report Cards',
            'This will generate report cards for all students in this class. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Generate',
                    onPress: async () => {
                        setGeneratingAll(true);
                        try {
                            await GradingAPI.generateClassReportCards({
                                class_id: selectedClassId,
                                term_id: selectedTermId,
                            });
                            showSuccess('Success', 'Report cards generated for all students');
                            await loadReportCards();
                        } catch (err: any) {
                            showError('Error', err.message || 'Failed to generate report cards');
                        } finally {
                            setGeneratingAll(false);
                        }
                    },
                },
            ]
        );
    };

    // ── Bulk publish ──
    const handlePublishAll = () => {
        if (!hasFilters) return;

        if (completenessChecked && completenessResults.some(s => !s.is_complete)) {
            Alert.alert(
                'Incomplete Grades',
                'Some subjects have missing grades. Are you sure you want to publish?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Publish Anyway', style: 'destructive', onPress: doPublishAll },
                ]
            );
            return;
        }

        Alert.alert(
            'Publish All Report Cards',
            'This will publish all generated report cards for this class. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Publish', onPress: doPublishAll },
            ]
        );
    };

    const doPublishAll = async () => {
        setPublishingAll(true);
        try {
            const publishable = reportCards.filter(r => r.status === 'draft' || r.status === 'pending_review');
            if (publishable.length === 0) {
                showSuccess('Info', 'No report cards to publish');
                return;
            }
            await GradingAPI.bulkPublishReportCards({
                class_id: selectedClassId,
                term_id: selectedTermId,
            });
            showSuccess('Published', `${publishable.length} report cards published`);
            await loadReportCards();
        } catch (err: any) {
            showError('Error', err.message || 'Failed to publish report cards');
        } finally {
            setPublishingAll(false);
        }
    };

    // ── Bulk release ──
    const handleReleaseAll = () => {
        if (!hasFilters) return;
        Alert.alert(
            'Release All Report Cards',
            'This will release all published report cards to parents. This action cannot be undone. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Release',
                    style: 'destructive',
                    onPress: async () => {
                        setReleasingAll(true);
                        try {
                            const releasable = reportCards.filter(r => r.status === 'published');
                            if (releasable.length === 0) {
                                showSuccess('Info', 'No report cards to release');
                                return;
                            }
                            await GradingAPI.bulkReleaseReportCards({
                                class_id: selectedClassId,
                                term_id: selectedTermId,
                            });
                            showSuccess('Released', `${releasable.length} report cards released to parents`);
                            await loadReportCards();
                        } catch (err: any) {
                            showError('Error', err.message || 'Failed to release report cards');
                        } finally {
                            setReleasingAll(false);
                        }
                    },
                },
            ]
        );
    };

    // ── Derived completeness stats ──
    const totalSubjects = completenessResults.length;
    const completeSubjects = completenessResults.filter(s => s.is_complete).length;
    const incompleteSubjects = totalSubjects - completeSubjects;
    const totalMissingGrades = completenessResults.reduce((sum, s) => sum + s.missing_students.length, 0);

    const handleRefreshPage = useCallback(async () => {
        setManualRefreshing(true);
        try {
            await loadFilters();

            if (selectedClassId && selectedTermId) {
                await Promise.all([
                    loadReportCards(),
                    (activeTab === 'completeness' || completenessChecked) ? handleCheckCompleteness() : Promise.resolve(),
                ]);
            }
            showSuccess('Refreshed', 'Page data updated');
        } catch {
            showError('Error', 'Failed to refresh page');
        } finally {
            setManualRefreshing(false);
        }
    }, [activeTab, completenessChecked, handleCheckCompleteness, loadFilters, loadReportCards, selectedClassId, selectedTermId]);

    // ── Render ──
    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <UnifiedHeader
                title="Results"
                subtitle="Grade Management"
                role="Admin"
                onBack={() => router.back()}
                showNotification={false}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ padding: 16 }}>

                    {/* ═══ Filter Section ═══ */}
                    <View style={{
                        backgroundColor: card, borderRadius: 20, padding: 16, marginBottom: 16,
                        borderWidth: 1, borderColor: border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{
                                backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8',
                                padding: 10, borderRadius: 12, marginRight: 10,
                            }}>
                                <Filter size={18} color="#FF6B00" />
                            </View>
                            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16, flex: 1 }}>Filters</Text>
                            <TouchableOpacity
                                onPress={handleRefreshPage}
                                disabled={manualRefreshing}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: isDark ? '#1A1650' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderRadius: 10,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    opacity: manualRefreshing ? 0.7 : 1,
                                }}
                            >
                                {manualRefreshing ? (
                                    <ActivityIndicator size="small" color={isDark ? '#F9FAFB' : '#111827'} />
                                ) : (
                                    <RefreshCw size={14} color={isDark ? '#F9FAFB' : '#111827'} />
                                )}
                                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 12, marginLeft: 6 }}>
                                    Refresh
                                </Text>
                            </TouchableOpacity>
                            {loadingFilters && !manualRefreshing && (
                                <ActivityIndicator size="small" color="#FF6B00" style={{ marginLeft: 8 }} />
                            )}
                        </View>

                        <DropdownSelector
                            label="Class"
                            options={classes.map(c => ({ id: c.id, label: c.display_name || c.name }))}
                            selectedId={selectedClassId}
                            onSelect={setSelectedClassId}
                            placeholder="Select a class"
                            isDark={isDark}
                        />

                        <DropdownSelector
                            label="Term"
                            options={terms.map(t => ({ id: t.id, label: t.name }))}
                            selectedId={selectedTermId}
                            onSelect={setSelectedTermId}
                            placeholder="Select a term"
                            isDark={isDark}
                        />

                        <DropdownSelector
                            label="Subject (Optional)"
                            options={[{ id: '', label: 'All Subjects' }, ...subjects.map(s => ({ id: s.id, label: s.title }))]}
                            selectedId={selectedSubjectId}
                            onSelect={setSelectedSubjectId}
                            placeholder="All Subjects"
                            isDark={isDark}
                            disabled={!selectedClassId}
                        />
                    </View>

                    {/* ═══ No Active Term Banner ═══ */}
                    {!resolvedActiveTerm && !loadingFilters && (
                        <View style={{
                            backgroundColor: isDark ? '#2D1F00' : '#FFFBEB',
                            borderRadius: 14, padding: 14, marginBottom: 16,
                            borderWidth: 1, borderColor: isDark ? '#92400E' : '#FCD34D',
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                        }}>
                            <AlertCircle size={18} color="#D97706" />
                            <Text style={{ color: isDark ? '#FCD34D' : '#92400E', fontSize: 13, flex: 1 }}>
                                No active term found for today. Results are scoped to the current academic calendar.
                            </Text>
                        </View>
                    )}

                    {/* ═══ Tab Switcher ═══ */}
                    <View style={{
                        flexDirection: 'row', backgroundColor: card, borderRadius: 16,
                        padding: 4, marginBottom: 16, borderWidth: 1, borderColor: border,
                    }}>
                        {[
                            { key: 'completeness' as const, label: 'Grade Completeness', icon: AlertCircle },
                            { key: 'reportcards' as const, label: 'Report Cards', icon: FileText },
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    onPress={() => setActiveTab(tab.key)}
                                    style={{
                                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                        paddingVertical: 12, borderRadius: 13,
                                        backgroundColor: isActive ? '#FF6B00' : 'transparent',
                                    }}
                                >
                                    <Icon size={16} color={isActive ? '#FFFFFF' : textSecondary} />
                                    <Text style={{
                                        marginLeft: 6, fontSize: 13, fontWeight: '700',
                                        color: isActive ? '#FFFFFF' : textSecondary,
                                    }}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/(admin)/results/promotions')}
                        style={{
                            backgroundColor: card,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: border,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            marginBottom: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Shield size={16} color="#FF6B00" />
                            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>
                                Promotion Cycles
                            </Text>
                        </View>
                        <ChevronRight size={16} color={textSecondary} />
                    </TouchableOpacity>

                    {/* ═══ COMPLETENESS TAB ═══ */}
                    {activeTab === 'completeness' && (
                        <View>
                            {/* Check Button */}
                            <TouchableOpacity
                                onPress={handleCheckCompleteness}
                                disabled={checkingCompleteness || !hasFilters}
                                style={{
                                    backgroundColor: !hasFilters ? (isDark ? '#374151' : '#E5E7EB') : '#FF6B00',
                                    paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 16,
                                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                                    opacity: !hasFilters ? 0.5 : 1,
                                }}
                            >
                                {checkingCompleteness ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <RefreshCw size={16} color="#FFFFFF" />
                                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                                            Check Completeness
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {!hasFilters && (
                                <View style={{
                                    backgroundColor: isDark ? '#1E2A35' : '#EFF6FF', padding: 20, borderRadius: 16,
                                    alignItems: 'center', marginBottom: 16,
                                }}>
                                    <Filter size={28} color={textMuted} />
                                    <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 8, textAlign: 'center' }}>
                                        Select a class and term to check grade completeness
                                    </Text>
                                </View>
                            )}

                            {/* Completeness Summary */}
                            {completenessChecked && (
                                <View style={{
                                    backgroundColor: incompleteSubjects === 0 ? (isDark ? '#052E16' : '#ECFDF5') : (isDark ? '#2D1A00' : '#FFFBEB'),
                                    padding: 16, borderRadius: 16, marginBottom: 16,
                                    borderWidth: 1, borderColor: incompleteSubjects === 0 ? '#059669' : '#D97706',
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        {incompleteSubjects === 0 ? (
                                            <CheckCircle2 size={20} color="#059669" />
                                        ) : (
                                            <AlertCircle size={20} color="#D97706" />
                                        )}
                                        <Text style={{
                                            marginLeft: 8, fontSize: 15, fontWeight: '700', color: textPrimary,
                                        }}>
                                            {incompleteSubjects === 0 ? 'All Complete!' : `${incompleteSubjects} Incomplete`}
                                        </Text>
                                    </View>
                                    <Text style={{ color: textSecondary, fontSize: 13, lineHeight: 20 }}>
                                        {completeSubjects}/{totalSubjects} subjects complete
                                        {totalMissingGrades > 0 && `, ${totalMissingGrades} missing grade${totalMissingGrades !== 1 ? 's' : ''}`}
                                    </Text>
                                </View>
                            )}

                            {/* Per-subject completeness */}
                            {completenessResults.map(subject => (
                                <View
                                    key={subject.subject_id}
                                    style={{
                                        backgroundColor: card, borderRadius: 16, marginBottom: 12,
                                        borderWidth: 1, borderColor: border, overflow: 'hidden',
                                    }}
                                >
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                        padding: 14, backgroundColor: sectionBg,
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <View style={{
                                                backgroundColor: subject.is_complete ? (isDark ? '#052E16' : '#ECFDF5') : (isDark ? '#2D1A00' : '#FEF2F2'),
                                                padding: 8, borderRadius: 10, marginRight: 10,
                                            }}>
                                                <BookOpen size={16} color={subject.is_complete ? '#059669' : '#EF4444'} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                                                    {subject.subject_name}
                                                </Text>
                                                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                                    {subject.graded_students}/{subject.total_students} graded
                                                </Text>
                                            </View>
                                        </View>
                                        {subject.is_complete ? (
                                            <CheckCircle2 size={20} color="#059669" />
                                        ) : (
                                            <XCircle size={20} color="#EF4444" />
                                        )}
                                    </View>

                                    {/* Missing students list */}
                                    {subject.missing_students.length > 0 && (
                                        <View style={{ padding: 12, paddingTop: 0 }}>
                                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                                                Missing Grades ({subject.missing_students.length})
                                            </Text>
                                            {subject.missing_students.map(student => (
                                                <View
                                                    key={student.student_id}
                                                    style={{
                                                        flexDirection: 'row', alignItems: 'center',
                                                        paddingVertical: 6, paddingHorizontal: 8,
                                                        backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2',
                                                        borderRadius: 8, marginBottom: 4,
                                                    }}
                                                >
                                                    <View style={{
                                                        width: 6, height: 6, borderRadius: 3,
                                                        backgroundColor: '#EF4444', marginRight: 8,
                                                    }} />
                                                    <Text style={{ color: textPrimary, fontSize: 13, flex: 1 }}>
                                                        {student.student_name}
                                                    </Text>
                                                    {student.admission_number && (
                                                        <Text style={{ color: textMuted, fontSize: 11 }}>
                                                            {student.admission_number}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ═══ REPORT CARDS TAB ═══ */}
                    {activeTab === 'reportcards' && (
                        <View>
                            {!hasFilters ? (
                                <View style={{
                                    backgroundColor: isDark ? '#1E2A35' : '#EFF6FF', padding: 20, borderRadius: 16,
                                    alignItems: 'center',
                                }}>
                                    <Filter size={28} color={textMuted} />
                                    <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 8, textAlign: 'center' }}>
                                        Select a class and term to manage report cards
                                    </Text>
                                </View>
                            ) : loadingReportCards ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#FF6B00" />
                                    <Text style={{ color: textSecondary, marginTop: 12 }}>Loading report cards...</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Summary Stats */}
                                    {reportSummary && (
                                        <View style={{
                                            flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
                                        }}>
                                            {[
                                                { label: 'Total', value: reportSummary.total_students, color: '#6B7280', bg: isDark ? '#1F2937' : '#F3F4F6' },
                                                { label: 'Generated', value: reportSummary.generated, color: '#8B5CF6', bg: isDark ? '#2E1065' : '#EDE9FE' },
                                                { label: 'Published', value: reportSummary.published, color: '#2563EB', bg: isDark ? '#1E3A5F' : '#DBEAFE' },
                                                { label: 'Released', value: reportSummary.released, color: '#059669', bg: isDark ? '#064E3B' : '#D1FAE5' },
                                                { label: 'Avg GPA', value: reportSummary.average_gpa.toFixed(2), color: '#FF6B00', bg: isDark ? '#2A1A0A' : '#FFF3E8' },
                                            ].map(stat => (
                                                <View key={stat.label} style={{
                                                    flex: 1, minWidth: 80, backgroundColor: stat.bg,
                                                    padding: 12, borderRadius: 14, alignItems: 'center',
                                                }}>
                                                    <Text style={{ color: stat.color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                        {stat.label}
                                                    </Text>
                                                    <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800', marginTop: 4 }}>
                                                        {stat.value}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Bulk Actions */}
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                        <TouchableOpacity
                                            onPress={handleGenerateAll}
                                            disabled={generatingAll}
                                            style={{
                                                flex: 1, backgroundColor: '#8B5CF6', paddingVertical: 12, borderRadius: 14,
                                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            }}
                                        >
                                            {generatingAll ? <ActivityIndicator color="#FFF" size="small" /> : (
                                                <>
                                                    <FileText size={14} color="#FFF" />
                                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Generate All</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handlePublishAll}
                                            disabled={publishingAll}
                                            style={{
                                                flex: 1, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 14,
                                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            }}
                                        >
                                            {publishingAll ? <ActivityIndicator color="#FFF" size="small" /> : (
                                                <>
                                                    <Shield size={14} color="#FFF" />
                                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Publish All</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleReleaseAll}
                                            disabled={releasingAll}
                                            style={{
                                                flex: 1, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 14,
                                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            }}
                                        >
                                            {releasingAll ? <ActivityIndicator color="#FFF" size="small" /> : (
                                                <>
                                                    <Send size={14} color="#FFF" />
                                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Release All</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {/* Per-student cards */}
                                    {reportCards.length === 0 ? (
                                        <View style={{
                                            backgroundColor: card, padding: 32, borderRadius: 20,
                                            alignItems: 'center', borderWidth: 1, borderColor: border, borderStyle: 'dashed',
                                        }}>
                                            <Users size={40} color={textMuted} />
                                            <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 12, textAlign: 'center' }}>
                                                No report cards found for this class and term
                                            </Text>
                                        </View>
                                    ) : (
                                        reportCards.map(rc => {
                                            const isProcessing = processingStudentId === rc.id || processingStudentId === rc.student_id;
                                            return (
                                                <View
                                                    key={rc.id}
                                                    style={{
                                                        backgroundColor: card, borderRadius: 16, marginBottom: 12,
                                                        borderWidth: 1, borderColor: border, overflow: 'hidden',
                                                    }}
                                                >
                                                    {/* Student info */}
                                                    <View style={{
                                                        flexDirection: 'row', alignItems: 'center', padding: 14,
                                                    }}>
                                                        <View style={{
                                                            width: 42, height: 42, borderRadius: 21,
                                                            backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8',
                                                            alignItems: 'center', justifyContent: 'center', marginRight: 12,
                                                        }}>
                                                            <Text style={{ color: '#FF6B00', fontWeight: '700', fontSize: 16 }}>
                                                                {rc.student_name?.charAt(0)?.toUpperCase() || '?'}
                                                            </Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                                                                    {rc.student_name}
                                                                </Text>
                                                                {rc.admission_number && (
                                                                    <Text style={{ color: textMuted, fontSize: 11, marginLeft: 8 }}>
                                                                        #{rc.admission_number}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                                                <StatusBadge status={rc.status} isDark={isDark} />
                                                                {rc.gpa != null && (
                                                                    <View style={{
                                                                        backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8',
                                                                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                                                                    }}>
                                                                        <Text style={{ color: '#FF6B00', fontSize: 12, fontWeight: '700' }}>
                                                                            GPA {rc.gpa.toFixed(2)}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                        {isProcessing && (
                                                            <ActivityIndicator size="small" color="#FF6B00" />
                                                        )}
                                                    </View>

                                                    {/* Action buttons */}
                                                    <View style={{
                                                        flexDirection: 'row', borderTopWidth: 1, borderTopColor: border,
                                                    }}>
                                                        {(rc.status === 'draft' || !rc.gpa) && (
                                                            <TouchableOpacity
                                                                onPress={() => handleGenerate(rc.student_id)}
                                                                disabled={isProcessing}
                                                                style={{
                                                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                                                    paddingVertical: 12, borderRightWidth: 1, borderRightColor: border,
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <FileText size={14} color="#8B5CF6" />
                                                                <Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 12 }}>Generate</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {(rc.status === 'draft' || rc.status === 'pending_review') && rc.gpa != null && (
                                                            <TouchableOpacity
                                                                onPress={() => handlePublish(rc.id)}
                                                                disabled={isProcessing}
                                                                style={{
                                                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                                                    paddingVertical: 12, borderRightWidth: (rc.status === 'draft' || rc.status === 'pending_review') && rc.gpa != null ? 1 : 0,
                                                                    borderRightColor: border,
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <Shield size={14} color="#2563EB" />
                                                                <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 12 }}>Publish</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {rc.status === 'published' && (
                                                            <TouchableOpacity
                                                                onPress={() => handleRelease(rc.id)}
                                                                disabled={isProcessing}
                                                                style={{
                                                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                                                    paddingVertical: 12, gap: 4,
                                                                }}
                                                            >
                                                                <Send size={14} color="#059669" />
                                                                <Text style={{ color: '#059669', fontWeight: '700', fontSize: 12 }}>Release</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {rc.status === 'released' && (
                                                            <View style={{
                                                                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                                                paddingVertical: 12,
                                                            }}>
                                                                <CheckCircle2 size={14} color="#059669" />
                                                                <Text style={{ color: '#059669', fontWeight: '600', fontSize: 12, marginLeft: 4 }}>
                                                                    Released
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {rc.status === 'pending_review' && rc.gpa == null && (
                                                            <View style={{
                                                                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                                                paddingVertical: 12,
                                                            }}>
                                                                <AlertCircle size={14} color="#D97706" />
                                                                <Text style={{ color: '#D97706', fontWeight: '600', fontSize: 12, marginLeft: 4 }}>
                                                                    Awaiting Grades
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </>
                            )}
                        </View>
                    )}

                </View>
            </ScrollView>
        </View>
    );
}
