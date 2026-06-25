import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { GradingAPI } from '@/services/GradingService';
import { showSuccess, showError } from '@/utils/toast';
import { useRouter } from 'expo-router';
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    ChevronLeft,
    Plus,
    Trash2,
    Star,
    StarOff,
    Award,
    ClipboardCheck,
    GraduationCap,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Pencil,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Types ─────────────────────────────────────────────────
interface AcademicYear {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    terms?: Term[];
}

interface Term {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    academic_year_id: string;
    locked_at?: string | null;
}

interface GradingScale {
    id: string;
    name: string;
    min_score: number;
    max_score: number;
    letter_grade: string;
    gpa_points: number;
    description: string;
}

interface AssessmentType {
    id: string;
    name: string;
    code: string;
    category: string;
    default_weight: number;
    display_order: number;
    is_deleted?: boolean;
}

type TabKey = 'academic_years' | 'grading_scales' | 'assessment_types';

const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'academic_years', label: 'Academic Years', icon: Calendar },
    { key: 'grading_scales', label: 'Grading Scales', icon: Award },
    { key: 'assessment_types', label: 'Assessment Types', icon: ClipboardCheck },
];

const DEFAULT_7POINT_SCALE: Omit<GradingScale, 'id'>[] = [
    { name: 'Standard 7-Point', min_score: 90, max_score: 100, letter_grade: 'A', gpa_points: 4.0, description: 'Excellent' },
    { name: 'Standard 7-Point', min_score: 80, max_score: 89, letter_grade: 'B+', gpa_points: 3.5, description: 'Very Good' },
    { name: 'Standard 7-Point', min_score: 70, max_score: 79, letter_grade: 'B', gpa_points: 3.0, description: 'Good' },
    { name: 'Standard 7-Point', min_score: 60, max_score: 69, letter_grade: 'C+', gpa_points: 2.5, description: 'Above Average' },
    { name: 'Standard 7-Point', min_score: 50, max_score: 59, letter_grade: 'C', gpa_points: 2.0, description: 'Average' },
    { name: 'Standard 7-Point', min_score: 40, max_score: 49, letter_grade: 'D', gpa_points: 1.0, description: 'Below Average' },
    { name: 'Standard 7-Point', min_score: 0, max_score: 39, letter_grade: 'F', gpa_points: 0.0, description: 'Fail' },
];

// ─── Component ─────────────────────────────────────────────
export default function AcademicSetupPage() {
    const router = useRouter();
    const { isDark } = useTheme();

    // ─── Theme helpers ─────────────────────────────────────
    const bg = isDark ? '#0D1117' : '#FFFFFF';
    const card = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const textMuted = isDark ? '#6B7280' : '#9CA3AF';
    const inputBg = isDark ? '#1C2128' : '#EAEEF2';
    const inputBorder = isDark ? '#21262D' : '#D0D7DE';
    const pillInactive = isDark ? '#1C2128' : '#EAEEF2';
    const pillInactiveBorder = isDark ? '#21262D' : '#D0D7DE';
    const pillInactiveText = isDark ? '#9CA3AF' : '#4B5563';
    const sectionBg = isDark ? '#1C2128' : '#EAEEF2';
    const accent = '#FF6900';

    // ─── State ────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<TabKey>('academic_years');
    const [loading, setLoading] = useState(true);

    // Academic Years
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [expandedYear, setExpandedYear] = useState<string | null>(null);
    const [showYearModal, setShowYearModal] = useState(false);
    const [showTermModal, setShowTermModal] = useState(false);
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Year form
    const [yearFormName, setYearFormName] = useState('');
    const [yearFormStart, setYearFormStart] = useState('');
    const [yearFormEnd, setYearFormEnd] = useState('');
    const [yearFormIsCurrent, setYearFormIsCurrent] = useState(false);

    // Term form
    const [termFormName, setTermFormName] = useState('');
    const [termFormStart, setTermFormStart] = useState('');
    const [termFormEnd, setTermFormEnd] = useState('');
    const [editingTerm, setEditingTerm] = useState<Term | null>(null);

    // Active term resolution (date-driven)
    const [resolvedActiveTerm, setResolvedActiveTerm] = useState<any>(null);
    const [nextUpcomingTerm, setNextUpcomingTerm] = useState<any>(null);
    const [activeTermLoading, setActiveTermLoading] = useState(true);

    // Grading Scales
    const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
    const [showScaleModal, setShowScaleModal] = useState(false);
    const [scaleFormName, setScaleFormName] = useState('');
    const [scaleFormMin, setScaleFormMin] = useState('');
    const [scaleFormMax, setScaleFormMax] = useState('');
    const [scaleFormGrade, setScaleFormGrade] = useState('');
    const [scaleFormGpa, setScaleFormGpa] = useState('');
    const [scaleFormDesc, setScaleFormDesc] = useState('');
    const [editingScale, setEditingScale] = useState<GradingScale | null>(null);

    // Assessment Types
    const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [typeFormName, setTypeFormName] = useState('');
    const [typeFormCode, setTypeFormCode] = useState('');
    const [typeFormCategory, setTypeFormCategory] = useState('continuous_assessment');
    const [typeFormWeight, setTypeFormWeight] = useState('');
    const [typeFormOrder, setTypeFormOrder] = useState('');
    const [editingType, setEditingType] = useState<AssessmentType | null>(null);

    // ─── Data Loading ─────────────────────────────────────
    const loadAcademicYears = useCallback(async () => {
        try {
            const data = await GradingAPI.getAcademicYears();
            setAcademicYears(data || []);
        } catch (err: any) {
            console.error('loadAcademicYears error:', err);
            showError('Failed to load academic years');
        }
    }, []);

    const loadTerms = useCallback(async () => {
        try {
            const data = await GradingAPI.getTerms();
            setTerms(data || []);
        } catch (err: any) {
            console.error('loadTerms error:', err);
        }
    }, []);

    const loadGradingScales = useCallback(async () => {
        try {
            const data = await GradingAPI.getGradingScales();
            setGradingScales(data || []);
        } catch (err: any) {
            console.error('loadGradingScales error:', err);
            showError('Failed to load grading scales');
        }
    }, []);

    const loadAssessmentTypes = useCallback(async () => {
        try {
            const data = await GradingAPI.getAssessmentTypes();
            setAssessmentTypes((data || []).filter((t: AssessmentType) => !t.is_deleted));
        } catch (err: any) {
            console.error('loadAssessmentTypes error:', err);
            showError('Failed to load assessment types');
        }
    }, []);

    const loadActiveTerm = useCallback(async () => {
        try {
            setActiveTermLoading(true);
            const data = await GradingAPI.getActiveTerm();
            setResolvedActiveTerm(data?.active_term || null);
            setNextUpcomingTerm(data?.next_upcoming_term || null);
        } catch (err: any) {
            console.error('loadActiveTerm error:', err);
        } finally {
            setActiveTermLoading(false);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            loadAcademicYears(),
            loadTerms(),
            loadGradingScales(),
            loadAssessmentTypes(),
            loadActiveTerm(),
        ]);
        setLoading(false);
    }, [loadAcademicYears, loadTerms, loadGradingScales, loadAssessmentTypes, loadActiveTerm]);

    useEffect(() => {
        loadAllData();
    }, []);

    // ─── Derived data ─────────────────────────────────────
    const getTermsForYear = (yearId: string): Term[] =>
        terms.filter(t => t.academic_year_id === yearId);

    const getTermStatus = (term: Term): 'active' | 'upcoming' | 'completed' => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const start = new Date(term.start_date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(term.end_date);
        end.setHours(0, 0, 0, 0);
        if (now >= start && now <= end) return 'active';
        if (now < start) return 'upcoming';
        return 'completed';
    };

    const groupedScales = gradingScales.reduce<Record<string, GradingScale[]>>((acc, scale) => {
        if (!acc[scale.name]) acc[scale.name] = [];
        acc[scale.name].push(scale);
        return acc;
    }, {});

    const sortedTypes = [...assessmentTypes].sort((a, b) => a.display_order - b.display_order);

    // ─── Academic Year CRUD ────────────────────────────────
    const openCreateYear = () => {
        setYearFormName('');
        setYearFormStart('');
        setYearFormEnd('');
        setYearFormIsCurrent(false);
        setShowYearModal(true);
    };

    const handleSaveYear = async () => {
        if (!yearFormName.trim()) {
            Alert.alert('Validation', 'Year name is required');
            return;
        }
        if (!yearFormStart || !yearFormEnd) {
            Alert.alert('Validation', 'Start and end dates are required');
            return;
        }
        setSaving(true);
        try {
            await GradingAPI.createAcademicYear({
                name: yearFormName.trim(),
                start_date: yearFormStart,
                end_date: yearFormEnd,
                is_current: yearFormIsCurrent,
            });
            setShowYearModal(false);
            showSuccess('Academic year created');
            await loadAcademicYears();
            await loadTerms();
        } catch (err: any) {
            showError(err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteYear = (year: AcademicYear) => {
        Alert.alert(
            'Delete Academic Year',
            `Are you sure you want to delete "${year.name}"? This will also delete all its terms.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await GradingAPI.deleteAcademicYear(year.id);
                            showSuccess('Academic year deleted');
                            if (expandedYear === year.id) setExpandedYear(null);
                            await loadAcademicYears();
                            await loadTerms();
                        } catch (err: any) {
                            showError(err.response?.data?.error || err.message);
                        }
                    },
                },
            ]
        );
    };

    // ─── Term CRUD ────────────────────────────────────────
    const openAddTerm = (yearId: string) => {
        setSelectedYearId(yearId);
        setEditingTerm(null);
        setTermFormName('');
        setTermFormStart('');
        setTermFormEnd('');
        setShowTermModal(true);
    };

    const openEditTerm = (term: Term) => {
        setSelectedYearId(term.academic_year_id);
        setEditingTerm(term);
        setTermFormName(term.name);
        setTermFormStart(term.start_date?.split('T')[0] || '');
        setTermFormEnd(term.end_date?.split('T')[0] || '');
        setShowTermModal(true);
    };

    const handleSaveTerm = async () => {
        if (!termFormName.trim()) {
            Alert.alert('Validation', 'Term name is required');
            return;
        }
        if (!termFormStart || !termFormEnd) {
            Alert.alert('Validation', 'Start and end dates are required');
            return;
        }
        if (termFormStart >= termFormEnd) {
            Alert.alert('Validation', 'Start date must be before end date');
            return;
        }
        setSaving(true);
        try {
            if (editingTerm) {
                await GradingAPI.updateTerm(editingTerm.id, {
                    name: termFormName.trim(),
                    start_date: termFormStart,
                    end_date: termFormEnd,
                });
                showSuccess('Term updated');
            } else {
                await GradingAPI.createTerm({
                    name: termFormName.trim(),
                    start_date: termFormStart,
                    end_date: termFormEnd,
                    academic_year_id: selectedYearId,
                });
                showSuccess('Term created');
            }
            setShowTermModal(false);
            await loadTerms();
            await loadActiveTerm();
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message;
            if (msg.includes('overlaps') || msg.includes('overlap')) {
                Alert.alert('Date Overlap', msg);
            } else {
                showError(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSetCurrentTerm = async (term: Term) => {
        try {
            await GradingAPI.setCurrentTerm(term.id);
            showSuccess(`${term.name} is now the current term`);
            await loadTerms();
            await loadActiveTerm();
        } catch (err: any) {
            showError(err.response?.data?.error || err.message);
        }
    };

    const handleSetTermLockState = (term: Term, locked: boolean) => {
        const action = locked ? 'Lock' : 'Unlock';
        const message = locked
            ? `Lock "${term.name}"? This will prevent grade and report card updates for this term.`
            : `Unlock "${term.name}"? This will allow grade and report card updates for this term.`;

        Alert.alert(action + ' Term', message, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: action,
                style: locked ? 'destructive' : 'default',
                onPress: async () => {
                    try {
                        await GradingAPI.setTermLockState(term.id, locked);
                        showSuccess(`Term ${locked ? 'locked' : 'unlocked'} successfully`);
                        await loadTerms();
                        await loadActiveTerm();
                    } catch (err: any) {
                        showError(err.response?.data?.error || err.message);
                    }
                },
            },
        ]);
    };

    const handleDeleteTerm = (term: Term) => {
        Alert.alert(
            'Delete Term',
            `Are you sure you want to delete "${term.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await GradingAPI.deleteTerm(term.id);
                            showSuccess('Term deleted');
                            await loadTerms();
                            await loadActiveTerm();
                        } catch (err: any) {
                            showError(err.response?.data?.error || err.message);
                        }
                    },
                },
            ]
        );
    };

    // ─── Grading Scale CRUD ───────────────────────────────
    const openCreateScale = () => {
        setEditingScale(null);
        setScaleFormName('Standard 7-Point');
        setScaleFormMin('');
        setScaleFormMax('');
        setScaleFormGrade('');
        setScaleFormGpa('');
        setScaleFormDesc('');
        setShowScaleModal(true);
    };

    const openEditScale = (scale: GradingScale) => {
        setEditingScale(scale);
        setScaleFormName(scale.name);
        setScaleFormMin(String(scale.min_score));
        setScaleFormMax(String(scale.max_score));
        setScaleFormGrade(scale.letter_grade);
        setScaleFormGpa(String(scale.gpa_points));
        setScaleFormDesc(scale.description || '');
        setShowScaleModal(true);
    };

    const handleSaveScale = async () => {
        if (!scaleFormName.trim() || !scaleFormGrade.trim()) {
            Alert.alert('Validation', 'Scale name and letter grade are required');
            return;
        }
        const min = parseFloat(scaleFormMin);
        const max = parseFloat(scaleFormMax);
        const gpa = parseFloat(scaleFormGpa);
        if (isNaN(min) || isNaN(max)) {
            Alert.alert('Validation', 'Min and max scores must be valid numbers');
            return;
        }
        if (min > max) {
            Alert.alert('Validation', 'Min score cannot exceed max score');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: scaleFormName.trim(),
                min_score: min,
                max_score: max,
                letter_grade: scaleFormGrade.trim(),
                gpa_points: isNaN(gpa) ? 0 : gpa,
                description: scaleFormDesc.trim(),
            };
            if (editingScale) {
                await GradingAPI.updateGradingScale(editingScale.id, payload);
                showSuccess('Grading scale updated');
            } else {
                await GradingAPI.createGradingScale(payload);
                showSuccess('Grading scale entry added');
            }
            setShowScaleModal(false);
            await loadGradingScales();
        } catch (err: any) {
            showError(err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLoadDefaultScale = () => {
        Alert.alert(
            'Load Default Scale',
            'This will add the standard 7-point grading scale (A through F). Existing entries are not affected.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Load',
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await GradingAPI.bulkCreateGradingScale({
                                scales: DEFAULT_7POINT_SCALE,
                            });
                            showSuccess('Default 7-point scale loaded');
                            await loadGradingScales();
                        } catch (err: any) {
                            showError(err.response?.data?.error || err.message);
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteScale = (scale: GradingScale) => {
        Alert.alert(
            'Delete Scale Entry',
            `Delete ${scale.letter_grade} (${scale.min_score}-${scale.max_score})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await GradingAPI.deleteGradingScale(scale.id);
                            showSuccess('Scale entry deleted');
                            await loadGradingScales();
                        } catch (err: any) {
                            showError(err.response?.data?.error || err.message);
                        }
                    },
                },
            ]
        );
    };

    // ─── Assessment Type CRUD ──────────────────────────────
    const openCreateType = () => {
        setEditingType(null);
        setTypeFormName('');
        setTypeFormCode('');
        setTypeFormCategory('continuous_assessment');
        setTypeFormWeight('');
        setTypeFormOrder(String(assessmentTypes.length + 1));
        setShowTypeModal(true);
    };

    const openEditType = (type: AssessmentType) => {
        setEditingType(type);
        setTypeFormName(type.name);
        setTypeFormCode(type.code);
        setTypeFormCategory(type.category);
        setTypeFormWeight(String(type.default_weight));
        setTypeFormOrder(String(type.display_order));
        setShowTypeModal(true);
    };

    const handleSaveType = async () => {
        if (!typeFormName.trim() || !typeFormCode.trim()) {
            Alert.alert('Validation', 'Name and code are required');
            return;
        }
        const weight = parseFloat(typeFormWeight);
        const order = parseInt(typeFormOrder, 10);
        if (isNaN(weight) || weight < 0) {
            Alert.alert('Validation', 'Default weight must be a valid non-negative number');
            return;
        }
        if (isNaN(order)) {
            Alert.alert('Validation', 'Display order must be a valid number');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: typeFormName.trim(),
                code: typeFormCode.trim(),
                category: typeFormCategory,
                default_weight: weight,
                display_order: order,
            };
            if (editingType) {
                await GradingAPI.updateAssessmentType(editingType.id, payload);
                showSuccess('Assessment type updated');
            } else {
                await GradingAPI.createAssessmentType(payload);
                showSuccess('Assessment type created');
            }
            setShowTypeModal(false);
            await loadAssessmentTypes();
        } catch (err: any) {
            showError(err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteType = (type: AssessmentType) => {
        Alert.alert(
            'Delete Assessment Type',
            `Are you sure you want to delete "${type.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await GradingAPI.deleteAssessmentType(type.id);
                            showSuccess('Assessment type deleted');
                            await loadAssessmentTypes();
                        } catch (err: any) {
                            showError(err.response?.data?.error || err.message);
                        }
                    },
                },
            ]
        );
    };

    const handleMoveType = async (type: AssessmentType, direction: 'up' | 'down') => {
        const newOrder = direction === 'up' ? type.display_order - 1 : type.display_order + 1;
        if (newOrder < 1) return;
        try {
            await GradingAPI.updateAssessmentType(type.id, { display_order: newOrder });
            // Swap the other type's order
            const sibling = sortedTypes.find(
                t => t.id !== type.id && t.display_order === newOrder
            );
            if (sibling) {
                await GradingAPI.updateAssessmentType(sibling.id, { display_order: type.display_order });
            }
            await loadAssessmentTypes();
        } catch (err: any) {
            showError(err.response?.data?.error || err.message);
        }
    };

    // ─── Date formatting ──────────────────────────────────
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // ─── Render ────────────────────────────────────────────
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={accent} />
                <Text style={{ color: textSecondary, marginTop: 12, fontSize: 14 }}>Loading academic setup...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <UnifiedHeader
                title="Academic Setup"
                subtitle="Manage years, scales & assessments"
                role="Admin"
                onBack={() => router.back()}
                showNotification={true}
            />

            {/* ── Tab Bar ── */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ maxHeight: 56 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
            >
                {TABS.map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 14,
                                borderWidth: 1.5,
                                backgroundColor: isActive ? accent : pillInactive,
                                borderColor: isActive ? accent : pillInactiveBorder,
                            }}
                        >
                            <tab.icon size={16} color={isActive ? 'white' : pillInactiveText} />
                            <Text style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: isActive ? 'white' : pillInactiveText,
                                marginLeft: 6,
                            }}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* ── Content ── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ════════════════════════════════════════════════
                    TAB 1: Academic Years & Terms
                ════════════════════════════════════════════════ */}
                {activeTab === 'academic_years' && (
                    <View>
                        {/* Active Term Banner */}
                        {!activeTermLoading && (
                            <View style={{ marginBottom: 16 }}>
                                {resolvedActiveTerm ? (
                                    <View style={{
                                        backgroundColor: '#10B981' + '15',
                                        borderWidth: 1, borderColor: '#10B981' + '40',
                                        borderRadius: 14, padding: 14,
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, marginRight: 8 }}>
                                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>ACTIVE</Text>
                                            </View>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>
                                                {resolvedActiveTerm.name}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>
                                            {formatDate(resolvedActiveTerm.start_date)} — {formatDate(resolvedActiveTerm.end_date)}
                                        </Text>
                                    </View>
                                ) : nextUpcomingTerm ? (
                                    <View style={{
                                        backgroundColor: '#F59E0B' + '15',
                                        borderWidth: 1, borderColor: '#F59E0B' + '40',
                                        borderRadius: 14, padding: 14,
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, marginRight: 8 }}>
                                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>UPCOMING</Text>
                                            </View>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>
                                                {nextUpcomingTerm.name}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>
                                            Starts {formatDate(nextUpcomingTerm.start_date)}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                                        borderWidth: 1, borderColor: border,
                                        borderRadius: 14, padding: 14,
                                    }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary }}>
                                            No active term — add terms with date ranges to enable automatic resolution.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {academicYears.length} Academic Year{academicYears.length !== 1 ? 's' : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={openCreateYear}
                                style={{ backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Plus size={15} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Add Year</Text>
                            </TouchableOpacity>
                        </View>

                        {academicYears.length === 0 ? (
                            <View style={{
                                backgroundColor: card, padding: 32, borderRadius: 20,
                                alignItems: 'center', borderWidth: 1.5, borderColor: border, borderStyle: 'dashed',
                            }}>
                                <Calendar size={48} color={textMuted} />
                                <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 16, textAlign: 'center' }}>
                                    No academic years yet. Create one to get started.
                                </Text>
                            </View>
                        ) : (
                            academicYears.map(year => {
                                const yearTerms = getTermsForYear(year.id);
                                const isExpanded = expandedYear === year.id;

                                return (
                                    <View
                                        key={year.id}
                                        style={{
                                            backgroundColor: card,
                                            borderRadius: 20,
                                            borderWidth: 1.5,
                                            borderColor: year.is_current ? accent : border,
                                            marginBottom: 12,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {/* Year Header */}
                                        <TouchableOpacity
                                            onPress={() => setExpandedYear(isExpanded ? null : year.id)}
                                            style={{ padding: 16 }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                    <View style={{
                                                        width: 44, height: 44, borderRadius: 14,
                                                        backgroundColor: year.is_current ? (isDark ? '#2A1A0A' : '#FFF3E8') : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'),
                                                        alignItems: 'center', justifyContent: 'center', marginRight: 12,
                                                    }}>
                                                        <Calendar size={22} color={year.is_current ? accent : textSecondary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary }}>{year.name}</Text>
                                                            {year.is_current && (
                                                                <View style={{ marginLeft: 8, backgroundColor: accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                                                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>CURRENT</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                                            {formatDate(year.start_date)} — {formatDate(year.end_date)}
                                                        </Text>
                                                        <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                                                            {yearTerms.length} term{yearTerms.length !== 1 ? 's' : ''}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <TouchableOpacity onPress={() => handleDeleteYear(year)} style={{ padding: 8 }}>
                                                        <Trash2 size={18} color="#EF4444" />
                                                    </TouchableOpacity>
                                                    {isExpanded ? (
                                                        <ChevronUp size={20} color={textSecondary} />
                                                    ) : (
                                                        <ChevronDown size={20} color={textSecondary} />
                                                    )}
                                                </View>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Expanded Terms Section */}
                                        {isExpanded && (
                                            <View style={{ backgroundColor: sectionBg, borderTopWidth: 1, borderTopColor: border, padding: 16 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                        Terms
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => openAddTerm(year.id)}
                                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                                                    >
                                                        <Plus size={14} color="white" />
                                                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 11, marginLeft: 4 }}>Add Term</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {yearTerms.length === 0 ? (
                                                    <View style={{ padding: 20, alignItems: 'center', borderWidth: 1, borderColor: border, borderStyle: 'dashed', borderRadius: 14 }}>
                                                        <Text style={{ color: textMuted, fontSize: 13 }}>No terms added yet</Text>
                                                    </View>
                                                ) : (
                                                    yearTerms.map(term => {
                                                        const status = getTermStatus(term);
                                                        return (
                                                            <View
                                                                key={term.id}
                                                                style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    backgroundColor: card,
                                                                    padding: 14,
                                                                    borderRadius: 14,
                                                                    borderWidth: 1,
                                                                    borderColor: status === 'active' ? '#10B981' : status === 'upcoming' ? '#F59E0B' : border,
                                                                    marginBottom: 8,
                                                                }}
                                                            >
                                                                <View style={{ flex: 1 }}>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                        {!!term.locked_at && (
                                                                            <View style={{ marginRight: 8, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                                                                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>LOCKED</Text>
                                                                            </View>
                                                                        )}
                                                                        <Text style={{ fontSize: 14, fontWeight: '600', color: textPrimary }}>{term.name}</Text>
                                                                        {status === 'active' && (
                                                                            <View style={{ marginLeft: 8, backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                                                                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>ACTIVE</Text>
                                                                            </View>
                                                                        )}
                                                                        {status === 'upcoming' && (
                                                                            <View style={{ marginLeft: 8, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                                                                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>UPCOMING</Text>
                                                                            </View>
                                                                        )}
                                                                        {status === 'completed' && (
                                                                            <View style={{ marginLeft: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                                                                                <Text style={{ color: textSecondary, fontSize: 9, fontWeight: '700' }}>COMPLETED</Text>
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                                                        {formatDate(term.start_date)} — {formatDate(term.end_date)}
                                                                    </Text>
                                                                </View>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleSetTermLockState(term, !term.locked_at)}
                                                                        style={{
                                                                            paddingHorizontal: 8,
                                                                            paddingVertical: 4,
                                                                            borderRadius: 8,
                                                                            borderWidth: 1,
                                                                            borderColor: term.locked_at ? '#10B981' : '#EF4444',
                                                                            marginRight: 6,
                                                                        }}
                                                                    >
                                                                        <Text style={{
                                                                            fontSize: 10,
                                                                            fontWeight: '700',
                                                                            color: term.locked_at ? '#10B981' : '#EF4444',
                                                                        }}>
                                                                            {term.locked_at ? 'UNLOCK' : 'LOCK'}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                    {status === 'active' && !term.is_current && (
                                                                        <TouchableOpacity
                                                                            onPress={() => handleSetCurrentTerm(term)}
                                                                            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: accent, marginRight: 6 }}
                                                                        >
                                                                            <Text style={{ fontSize: 10, fontWeight: '700', color: accent }}>SET CURRENT</Text>
                                                                        </TouchableOpacity>
                                                                    )}
                                                                    <TouchableOpacity
                                                                        onPress={() => openEditTerm(term)}
                                                                        style={{ padding: 6, marginRight: 4 }}
                                                                    >
                                                                        <Pencil size={16} color={textMuted} />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDeleteTerm(term)}
                                                                        style={{ padding: 6 }}
                                                                    >
                                                                        <Trash2 size={16} color="#EF4444" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        );
                                                    })
                                                )}
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                {/* ════════════════════════════════════════════════
                    TAB 2: Grading Scales
                ════════════════════════════════════════════════ */}
                {activeTab === 'grading_scales' && (
                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {gradingScales.length} Scale{gradingScales.length !== 1 ? 's' : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={handleLoadDefaultScale}
                                    disabled={saving}
                                    style={{
                                        backgroundColor: isDark ? '#1A1650' : '#F3F4F6',
                                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                                        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: border,
                                    }}
                                >
                                    <RotateCcw size={14} color={textSecondary} />
                                    <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 11, marginLeft: 5 }}>Default</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={openCreateScale}
                                    style={{ backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                                >
                                    <Plus size={15} color="white" />
                                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Add Scale</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {Object.keys(groupedScales).length === 0 ? (
                            <View style={{
                                backgroundColor: card, padding: 32, borderRadius: 20,
                                alignItems: 'center', borderWidth: 1.5, borderColor: border, borderStyle: 'dashed',
                            }}>
                                <Award size={48} color={textMuted} />
                                <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 16, textAlign: 'center' }}>
                                    No grading scales configured.{'\n'}Add entries or load the default 7-point scale.
                                </Text>
                            </View>
                        ) : (
                            Object.entries(groupedScales).map(([name, scales]) => (
                                <View key={name} style={{ marginBottom: 20 }}>
                                    <Text style={{
                                        fontSize: 14, fontWeight: '700', color: textPrimary, marginBottom: 10,
                                    }}>
                                        {name}
                                    </Text>

                                    {/* Header */}
                                    <View style={{
                                        flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8,
                                        backgroundColor: sectionBg, borderRadius: 12, marginBottom: 4,
                                    }}>
                                        <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>Range</Text>
                                        <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>Grade</Text>
                                        <Text style={{ flex: 0.8, fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>GPA</Text>
                                        <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>Description</Text>
                                        <View style={{ width: 32 }} />
                                    </View>

                                    {scales.sort((a, b) => b.min_score - a.min_score).map((scale, i) => (
                                        <View
                                            key={scale.id}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: card,
                                                paddingHorizontal: 14,
                                                paddingVertical: 12,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: border,
                                                marginBottom: 4,
                                            }}
                                        >
                                            <Text style={{ flex: 1.2, fontSize: 13, fontWeight: '600', color: textPrimary }}>
                                                {scale.min_score}–{scale.max_score}
                                            </Text>
                                            <View style={{ flex: 1 }}>
                                                <View style={{
                                                    backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8',
                                                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
                                                    alignSelf: 'flex-start',
                                                }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: accent }}>{scale.letter_grade}</Text>
                                                </View>
                                            </View>
                                            <Text style={{ flex: 0.8, fontSize: 13, fontWeight: '600', color: textPrimary }}>
                                                {scale.gpa_points.toFixed(1)}
                                            </Text>
                                            <Text style={{ flex: 1.5, fontSize: 12, color: textSecondary }}>
                                                {scale.description}
                                            </Text>
                                            <TouchableOpacity onPress={() => openEditScale(scale)} style={{ padding: 4, marginRight: 4 }}>
                                                <Pencil size={16} color={textSecondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteScale(scale)} style={{ padding: 4 }}>
                                                <Trash2 size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* ════════════════════════════════════════════════
                    TAB 3: Assessment Types
                ════════════════════════════════════════════════ */}
                {activeTab === 'assessment_types' && (
                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {assessmentTypes.length} Assessment Type{assessmentTypes.length !== 1 ? 's' : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={openCreateType}
                                style={{ backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Plus size={15} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Add Type</Text>
                            </TouchableOpacity>
                        </View>

                        {sortedTypes.length === 0 ? (
                            <View style={{
                                backgroundColor: card, padding: 32, borderRadius: 20,
                                alignItems: 'center', borderWidth: 1.5, borderColor: border, borderStyle: 'dashed',
                            }}>
                                <ClipboardCheck size={48} color={textMuted} />
                                <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 16, textAlign: 'center' }}>
                                    No assessment types defined.{'\n'}Create one to start categorizing assessments.
                                </Text>
                            </View>
                        ) : (
                            sortedTypes.map((type, index) => (
                                <TouchableOpacity
                                    key={type.id}
                                    onPress={() => openEditType(type)}
                                    activeOpacity={0.7}
                                    style={{
                                        backgroundColor: card,
                                        padding: 16,
                                        borderRadius: 16,
                                        borderWidth: 1.5,
                                        borderColor: border,
                                        marginBottom: 10,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <View style={{
                                                width: 40, height: 40, borderRadius: 12,
                                                backgroundColor: type.category === 'examination'
                                                    ? (isDark ? '#2A0A2A' : '#FDF2F8')
                                                    : (isDark ? '#0A2A1A' : '#ECFDF5'),
                                                alignItems: 'center', justifyContent: 'center', marginRight: 12,
                                            }}>
                                                <ClipboardCheck size={20} color={type.category === 'examination' ? '#EC4899' : '#10B981'} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary }}>{type.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                                    <View style={{
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                                                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
                                                    }}>
                                                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>
                                                            {type.code}
                                                        </Text>
                                                    </View>
                                                    <View style={{
                                                        backgroundColor: type.category === 'examination'
                                                            ? (isDark ? '#2A0A2A' : '#FDF2F8')
                                                            : (isDark ? '#0A2A1A' : '#ECFDF5'),
                                                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 11, fontWeight: '600',
                                                            color: type.category === 'examination' ? '#EC4899' : '#10B981',
                                                        }}>
                                                            {type.category === 'examination' ? 'Exam' : 'CA'}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: 11, color: textMuted }}>
                                                        {type.default_weight}% weight
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {/* Reorder buttons */}
                                            <View style={{ flexDirection: 'column', marginRight: 8 }}>
                                                {index > 0 && (
                                                    <TouchableOpacity
                                                        onPress={() => handleMoveType(type, 'up')}
                                                        style={{ padding: 2 }}
                                                    >
                                                        <ArrowUp size={16} color={textMuted} />
                                                    </TouchableOpacity>
                                                )}
                                                {index < sortedTypes.length - 1 && (
                                                    <TouchableOpacity
                                                        onPress={() => handleMoveType(type, 'down')}
                                                        style={{ padding: 2 }}
                                                    >
                                                        <ArrowDown size={16} color={textMuted} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <TouchableOpacity onPress={() => handleDeleteType(type)} style={{ padding: 8 }}>
                                                <Trash2 size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* ═══════════════════════════════════════════════════
                MODALS
            ═══════════════════════════════════════════════════ */}

            {/* ── Create Academic Year Modal ── */}
            <Modal visible={showYearModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: isDark ? '#13103A' : '#FFFFFF',
                        borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>New Academic Year</Text>
                            <TouchableOpacity onPress={() => setShowYearModal(false)} style={{ padding: 4 }}>
                                <Text style={{ fontSize: 24, color: textSecondary }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                            {/* Year Name */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Year Name *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="e.g. 2025-2026"
                                    value={yearFormName}
                                    onChangeText={setYearFormName}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            {/* Start Date */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Start Date *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="YYYY-MM-DD"
                                    value={yearFormStart}
                                    onChangeText={setYearFormStart}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            {/* End Date */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    End Date *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="YYYY-MM-DD"
                                    value={yearFormEnd}
                                    onChangeText={setYearFormEnd}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            {/* Is Current Toggle */}
                            <TouchableOpacity
                                onPress={() => setYearFormIsCurrent(!yearFormIsCurrent)}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24,
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '500', color: textPrimary }}>Set as Current Year</Text>
                                <View style={{
                                    width: 48, height: 28, borderRadius: 14,
                                    backgroundColor: yearFormIsCurrent ? accent : (isDark ? '#3F3F3F' : '#D1D5DB'),
                                    justifyContent: 'center', alignItems: yearFormIsCurrent ? 'flex-end' : 'flex-start',
                                    paddingHorizontal: 3,
                                }}>
                                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'white' }} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSaveYear}
                                disabled={saving}
                                style={{
                                    backgroundColor: accent, paddingVertical: 16,
                                    borderRadius: 16, alignItems: 'center',
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Create Year</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Add Term Modal ── */}
            <Modal visible={showTermModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: isDark ? '#13103A' : '#FFFFFF',
                        borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>{editingTerm ? 'Edit Term' : 'Add Term'}</Text>
                            <TouchableOpacity onPress={() => setShowTermModal(false)} style={{ padding: 4 }}>
                                <Text style={{ fontSize: 24, color: textSecondary }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Term Name *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="e.g. Term 1"
                                    value={termFormName}
                                    onChangeText={setTermFormName}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Start Date *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="YYYY-MM-DD"
                                    value={termFormStart}
                                    onChangeText={setTermFormStart}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    End Date *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="YYYY-MM-DD"
                                    value={termFormEnd}
                                    onChangeText={setTermFormEnd}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSaveTerm}
                                disabled={saving}
                                style={{
                                    backgroundColor: accent, paddingVertical: 16,
                                    borderRadius: 16, alignItems: 'center',
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>{editingTerm ? 'Save Changes' : 'Create Term'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Add/Edit Grading Scale Modal ── */}
            <Modal visible={showScaleModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: isDark ? '#13103A' : '#FFFFFF',
                        borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>
                                {editingScale ? 'Edit Grading Scale' : 'Add Grading Scale'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowScaleModal(false)} style={{ padding: 4 }}>
                                <Text style={{ fontSize: 24, color: textSecondary }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                            {/* Scale Name */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Scale Name *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="e.g. Standard 7-Point"
                                    value={scaleFormName}
                                    onChangeText={setScaleFormName}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            {/* Min / Max Score */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Min Score *
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                            color: textPrimary, fontSize: 15, fontWeight: '500',
                                        }}
                                        placeholder="0"
                                        value={scaleFormMin}
                                        onChangeText={setScaleFormMin}
                                        keyboardType="numeric"
                                        placeholderTextColor={textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Max Score *
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                            color: textPrimary, fontSize: 15, fontWeight: '500',
                                        }}
                                        placeholder="100"
                                        value={scaleFormMax}
                                        onChangeText={setScaleFormMax}
                                        keyboardType="numeric"
                                        placeholderTextColor={textMuted}
                                    />
                                </View>
                            </View>

                            {/* Letter Grade / GPA */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Letter Grade *
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                            color: textPrimary, fontSize: 15, fontWeight: '500',
                                        }}
                                        placeholder="A"
                                        value={scaleFormGrade}
                                        onChangeText={setScaleFormGrade}
                                        placeholderTextColor={textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        GPA Points
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                            color: textPrimary, fontSize: 15, fontWeight: '500',
                                        }}
                                        placeholder="4.0"
                                        value={scaleFormGpa}
                                        onChangeText={setScaleFormGpa}
                                        keyboardType="numeric"
                                        placeholderTextColor={textMuted}
                                    />
                                </View>
                            </View>

                            {/* Description */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Description
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="e.g. Excellent"
                                    value={scaleFormDesc}
                                    onChangeText={setScaleFormDesc}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSaveScale}
                                disabled={saving}
                                style={{
                                    backgroundColor: accent, paddingVertical: 16,
                                    borderRadius: 16, alignItems: 'center',
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                                        {editingScale ? 'Save Changes' : 'Add Entry'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Add/Edit Assessment Type Modal ── */}
            <Modal visible={showTypeModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: isDark ? '#13103A' : '#FFFFFF',
                        borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>
                                {editingType ? 'Edit Assessment Type' : 'New Assessment Type'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowTypeModal(false)} style={{ padding: 4 }}>
                                <Text style={{ fontSize: 24, color: textSecondary }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                            {/* Name */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Name *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="e.g. Mid-Term Test"
                                    value={typeFormName}
                                    onChangeText={setTypeFormName}
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            {/* Code */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Code *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="e.g. MT, EX, HW"
                                    value={typeFormCode}
                                    onChangeText={setTypeFormCode}
                                    autoCapitalize="characters"
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            {/* Category */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Category *
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {[
                                        { value: 'continuous_assessment', label: 'Continuous Assessment' },
                                        { value: 'examination', label: 'Examination' },
                                    ].map(cat => (
                                        <TouchableOpacity
                                            key={cat.value}
                                            onPress={() => setTypeFormCategory(cat.value)}
                                            style={{
                                                flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
                                                alignItems: 'center',
                                                backgroundColor: typeFormCategory === cat.value ? accent : pillInactive,
                                                borderColor: typeFormCategory === cat.value ? accent : pillInactiveBorder,
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 13, fontWeight: '700',
                                                color: typeFormCategory === cat.value ? 'white' : pillInactiveText,
                                            }}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Weight / Order */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Default Weight %
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                            color: textPrimary, fontSize: 15, fontWeight: '500',
                                        }}
                                        placeholder="0"
                                        value={typeFormWeight}
                                        onChangeText={setTypeFormWeight}
                                        keyboardType="numeric"
                                        placeholderTextColor={textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Display Order
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                            color: textPrimary, fontSize: 15, fontWeight: '500',
                                        }}
                                        placeholder="1"
                                        value={typeFormOrder}
                                        onChangeText={setTypeFormOrder}
                                        keyboardType="numeric"
                                        placeholderTextColor={textMuted}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleSaveType}
                                disabled={saving}
                                style={{
                                    backgroundColor: accent, paddingVertical: 16,
                                    borderRadius: 16, alignItems: 'center',
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                                        {editingType ? 'Save Changes' : 'Create Type'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
