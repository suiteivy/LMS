import { ActionTooltip } from "@/components/common/ActionTooltip";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { DatePicker } from "@/components/common/DatePicker";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { ExamService } from "@/services/ExamService";
import { GradingAPI } from "@/services/GradingService";
import { SubjectAPI } from "@/services/SubjectService";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    Award,
    Calendar,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Edit3,
    FileSpreadsheet,
    FileText,
    Filter,
    Layers,
    Lock,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    Users,
    X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

interface ExamPeriod {
    id: string;
    name: string;
    academic_year: string;
    term: string;
    start_date: string;
    end_date: string;
    submission_deadline?: string | null;
    applicable_class_ids?: string[];
    applicable_subject_ids?: string[];
    status: 'draft' | 'active' | 'completed' | 'archived';
    total_papers?: number;
    created_at?: string;
}

interface ExamPaper {
    id: string;
    title: string;
    description?: string;
    date: string;
    max_score: number;
    weight: number;
    term: string;
    is_published: boolean;
    submission_deadline?: string | null;
    exam_period_id?: string | null;
    subject_id: string;
    subjects?: {
        id: string;
        title: string;
        class_id?: string;
    };
    exam_periods?: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        submission_deadline?: string | null;
    } | null;
}

export default function AdminExamsManagement() {
    const { isDark } = useTheme();
    const tier = useSubscriptionTier();
    const params = useLocalSearchParams<{ tab?: string; period_id?: string }>();

    const [activeTab, setActiveTab] = useState<'periods' | 'papers'>(
        params.tab === 'papers' ? 'papers' : 'periods'
    );

    // Filter states
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [terms, setTerms] = useState<string[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [allSubjects, setAllSubjects] = useState<any[]>([]);

    // Exam Periods State
    const [periods, setPeriods] = useState<ExamPeriod[]>([]);
    const [periodsLoading, setPeriodsLoading] = useState<boolean>(true);
    const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
    const [editingPeriod, setEditingPeriod] = useState<ExamPeriod | null>(null);
    const [savingPeriod, setSavingPeriod] = useState<boolean>(false);
    const [periodToDelete, setPeriodToDelete] = useState<ExamPeriod | null>(null);

    // Period Form Fields
    const [pName, setPName] = useState("");
    const [pYear, setPYear] = useState("");
    const [pTerm, setPTerm] = useState("");
    const [pStartDate, setPStartDate] = useState("");
    const [pEndDate, setPEndDate] = useState("");
    const [pDeadline, setPDeadline] = useState("");
    const [pStatus, setPStatus] = useState<'draft' | 'active' | 'completed' | 'archived'>('active');

    // Exam Papers State
    const [papers, setPapers] = useState<ExamPaper[]>([]);
    const [papersLoading, setPapersLoading] = useState<boolean>(false);
    const [paperSearchQuery, setPaperSearchQuery] = useState<string>("");
    const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>(params.period_id || "all");
    const [paperToDelete, setPaperToDelete] = useState<ExamPaper | null>(null);
    const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);
    const [showPaperEditModal, setShowPaperEditModal] = useState<boolean>(false);
    const [savingPaper, setSavingPaper] = useState<boolean>(false);

    // Paper Edit Form Fields
    const [paperTitle, setPaperTitle] = useState("");
    const [paperMaxScore, setPaperMaxScore] = useState("100");
    const [paperWeight, setPaperWeight] = useState("0");
    const [paperDeadline, setPaperDeadline] = useState("");
    const [paperPublished, setPaperPublished] = useState(true);

    // Initial load: years, terms, subjects
    useEffect(() => {
        const init = async () => {
            try {
                const years = await GradingAPI.getAcademicYears().catch(() => []);
                setAcademicYears(years || []);
                const curYear = (years || []).find((y: any) => y.is_current) || (years || [])[0];
                const yearName = curYear?.name || new Date().getFullYear().toString();
                setSelectedYear(yearName);
                setPYear(yearName);

                const termsData = await GradingAPI.getTerms(curYear?.id || undefined).catch(() => []);
                if (Array.isArray(termsData) && termsData.length > 0) {
                    const termNames = termsData.map((t: any) => t.name || `Term ${t.term_number || ''}`.trim());
                    setTerms(termNames);
                    const curTerm = termsData.find((t: any) => t.is_current) || termsData[0];
                    const termName = curTerm?.name || termNames[0] || "Term 1";
                    setSelectedTerm(termName);
                    setPTerm(termName);
                } else {
                    setTerms(["Term 1", "Term 2", "Term 3"]);
                    setSelectedTerm("Term 1");
                    setPTerm("Term 1");
                }

                const subList = await SubjectAPI.getFilteredSubjects().catch(() => []);
                setAllSubjects(subList || []);
            } catch (err) {
                console.error("Init exams management error:", err);
            }
        };

        init();
    }, []);

    // Load exam periods
    const loadPeriods = useCallback(async () => {
        setPeriodsLoading(true);
        try {
            const data = await ExamService.getExamPeriods({
                academic_year: selectedYear || undefined,
                term: selectedTerm || undefined
            });
            setPeriods(data || []);
        } catch (err: any) {
            console.error("loadPeriods error:", err);
            Toast.show({ type: 'error', text1: 'Failed to load exam periods', text2: err.message });
        } finally {
            setPeriodsLoading(false);
        }
    }, [selectedYear, selectedTerm]);

    // Load exam papers
    const loadPapers = useCallback(async () => {
        setPapersLoading(true);
        try {
            const data = await ExamService.getExams({
                exam_period_id: selectedPeriodFilter !== 'all' ? selectedPeriodFilter : undefined
            });
            setPapers(data || []);
        } catch (err: any) {
            console.error("loadPapers error:", err);
            Toast.show({ type: 'error', text1: 'Failed to load scheduled exams', text2: err.message });
        } finally {
            setPapersLoading(false);
        }
    }, [selectedPeriodFilter]);

    useEffect(() => {
        if (activeTab === 'periods') {
            loadPeriods();
        } else {
            loadPapers();
        }
    }, [activeTab, loadPeriods, loadPapers]);

    // Open period modal for create or edit
    const handleOpenPeriodModal = (period?: ExamPeriod) => {
        if (period) {
            setEditingPeriod(period);
            setPName(period.name);
            setPYear(period.academic_year);
            setPTerm(period.term);
            setPStartDate(period.start_date);
            setPEndDate(period.end_date);
            setPDeadline(period.submission_deadline || "");
            setPStatus(period.status);
        } else {
            setEditingPeriod(null);
            setPName("");
            setPYear(selectedYear || new Date().getFullYear().toString());
            setPTerm(selectedTerm || "Term 1");
            setPStartDate(new Date().toISOString().split('T')[0]);
            setPEndDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
            setPDeadline(new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]);
            setPStatus('active');
        }
        setShowPeriodModal(true);
    };

    // Save period (Create / Update)
    const handleSavePeriod = async () => {
        if (!pName.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Exam period name is required' });
            return;
        }
        if (!pStartDate || !pEndDate) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Start and end dates are required' });
            return;
        }

        setSavingPeriod(true);
        try {
            const payload = {
                name: pName.trim(),
                academic_year: pYear,
                term: pTerm,
                start_date: pStartDate,
                end_date: pEndDate,
                submission_deadline: pDeadline || null,
                status: pStatus
            };

            if (editingPeriod) {
                await ExamService.updateExamPeriod(editingPeriod.id, payload);
                Toast.show({ type: 'success', text1: 'Updated', text2: 'Exam period updated successfully' });
            } else {
                await ExamService.createExamPeriod(payload);
                Toast.show({ type: 'success', text1: 'Created', text2: 'New exam period opened' });
            }

            setShowPeriodModal(false);
            await loadPeriods();
        } catch (err: any) {
            console.error("handleSavePeriod error:", err);
            Toast.show({ type: 'error', text1: 'Failed to save', text2: err.message });
        } finally {
            setSavingPeriod(false);
        }
    };

    // Delete period
    const confirmDeletePeriod = async () => {
        if (!periodToDelete) return;
        try {
            await ExamService.deleteExamPeriod(periodToDelete.id);
            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Exam period removed' });
            setPeriodToDelete(null);
            await loadPeriods();
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Delete failed', text2: err.message });
        }
    };

    // Open paper edit modal
    const handleOpenPaperEdit = (paper: ExamPaper) => {
        setEditingPaper(paper);
        setPaperTitle(paper.title);
        setPaperMaxScore(paper.max_score.toString());
        setPaperWeight(paper.weight.toString());
        setPaperDeadline(paper.submission_deadline ? paper.submission_deadline.split('T')[0] : "");
        setPaperPublished(paper.is_published);
        setShowPaperEditModal(true);
    };

    // Save paper edits
    const handleSavePaper = async () => {
        if (!editingPaper) return;
        setSavingPaper(true);
        try {
            await ExamService.updateExam(editingPaper.id, {
                title: paperTitle.trim(),
                max_score: Number(paperMaxScore) || 100,
                weight: Number(paperWeight) || 0,
                submission_deadline: paperDeadline || null,
                is_published: paperPublished
            });
            Toast.show({ type: 'success', text1: 'Updated', text2: 'Exam paper details updated' });
            setShowPaperEditModal(false);
            await loadPapers();
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Update failed', text2: err.message });
        } finally {
            setSavingPaper(false);
        }
    };

    // Delete paper
    const confirmDeletePaper = async () => {
        if (!paperToDelete) return;
        try {
            await ExamService.deleteExam(paperToDelete.id);
            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Exam paper and grades removed' });
            setPaperToDelete(null);
            await loadPapers();
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Delete failed', text2: err.message });
        }
    };

    const filteredPapers = papers.filter(p => {
        const q = paperSearchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) ||
            (p.subjects?.title && p.subjects.title.toLowerCase().includes(q));
    });

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0d1117' : '#f8fafc' }}>
            <UnifiedHeader
                title="Examinations"
                subtitle="Periods & Oversight"
                role="Admin"
                onBack={() => router.back()}
                rightActions={
                    <ActionTooltip
                        label="Exam Module Help"
                        description="Configure institutional assessment windows that gate HOD paper scheduling."
                        learnMoreAnchor="exams-module"
                    >
                        <TouchableOpacity
                            onPress={() => activeTab === 'periods' ? loadPeriods() : loadPapers()}
                            style={{
                                padding: 8,
                                borderRadius: 10,
                                backgroundColor: isDark ? '#161b22' : '#ffffff',
                                borderWidth: 1,
                                borderColor: isDark ? '#30363d' : '#e2e8f0'
                            }}
                        >
                            <RefreshCw size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>
                    </ActionTooltip>
                }
            />

            {/* Segmented Control Tabs */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
                <View style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? '#161b22' : '#e2e8f0',
                    borderRadius: 12,
                    padding: 3
                }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('periods')}
                        style={{
                            flex: 1,
                            paddingVertical: 9,
                            borderRadius: 9,
                            backgroundColor: activeTab === 'periods' ? (isDark ? '#21262d' : '#ffffff') : 'transparent',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOpacity: activeTab === 'periods' ? 0.05 : 0,
                            shadowRadius: 2,
                            elevation: activeTab === 'periods' ? 1 : 0
                        }}
                    >
                        <Text style={{
                            fontSize: 13,
                            fontWeight: activeTab === 'periods' ? '700' : '500',
                            color: activeTab === 'periods' ? '#FF6900' : (isDark ? '#94a3b8' : '#64748b')
                        }}>
                            Exam Periods Setup
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('papers')}
                        style={{
                            flex: 1,
                            paddingVertical: 9,
                            borderRadius: 9,
                            backgroundColor: activeTab === 'papers' ? (isDark ? '#21262d' : '#ffffff') : 'transparent',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOpacity: activeTab === 'papers' ? 0.05 : 0,
                            shadowRadius: 2,
                            elevation: activeTab === 'papers' ? 1 : 0
                        }}
                    >
                        <Text style={{
                            fontSize: 13,
                            fontWeight: activeTab === 'papers' ? '700' : '500',
                            color: activeTab === 'papers' ? '#FF6900' : (isDark ? '#94a3b8' : '#64748b')
                        }}>
                            Scheduled Papers Oversight
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* TAB 1: Exam Periods Setup */}
            {activeTab === 'periods' && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Banner */}
                    <View style={{
                        backgroundColor: isDark ? '#161b22' : '#ffffff',
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: isDark ? '#30363d' : '#e2e8f0',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                Institutional Assessment Periods
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginTop: 4 }}>
                                HODs can only schedule exam papers when an active exam period is configured here by Administration.
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleOpenPeriodModal()}
                            style={{
                                backgroundColor: '#FF6900',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 10
                            }}
                        >
                            <Plus size={16} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                                Open Period
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Periods List */}
                    {periodsLoading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#FF6900" />
                        </View>
                    ) : periods.length === 0 ? (
                        <View style={{
                            padding: 32,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <CalendarDays size={36} color={isDark ? '#484f58' : '#cbd5e1'} />
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 12 }}>
                                No exam periods defined
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 4, maxWidth: 300 }}>
                                Create your first exam period (e.g. "Term 1 Mid-Term Assessments") to enable paper scheduling across departments.
                            </Text>
                            <TouchableOpacity
                                onPress={() => handleOpenPeriodModal()}
                                style={{
                                    marginTop: 16,
                                    backgroundColor: '#FF6900',
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 10
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                                    Open First Exam Period
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ gap: 12 }}>
                            {periods.map(p => {
                                const isPassed = p.submission_deadline && new Date() > new Date(p.submission_deadline);
                                return (
                                    <View
                                        key={p.id}
                                        style={{
                                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                                            borderRadius: 16,
                                            padding: 16,
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                                        {p.name}
                                                    </Text>
                                                    <View style={{
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 6,
                                                        backgroundColor: p.status === 'active' ? (isDark ? '#064e3b' : '#d1fae5') : (isDark ? '#21262d' : '#f1f5f9')
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 11,
                                                            fontWeight: '700',
                                                            color: p.status === 'active' ? '#10b981' : (isDark ? '#94a3b8' : '#64748b'),
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {p.status}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 4 }}>
                                                    {p.academic_year} • {p.term}
                                                </Text>

                                                {/* Date Range & Submission Deadline */}
                                                <View style={{ marginTop: 10, gap: 4 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Calendar size={13} color={isDark ? '#94a3b8' : '#64748b'} />
                                                        <Text style={{ fontSize: 12, color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                                            Examination Dates: {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                    {p.submission_deadline && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <Clock size={13} color={isPassed ? '#ef4444' : '#f59e0b'} />
                                                            <Text style={{ fontSize: 12, color: isPassed ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b') }}>
                                                                Result Submission Deadline: {new Date(p.submission_deadline).toLocaleDateString()}
                                                                {isPassed ? " (Closed for Regular Teachers)" : ""}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>

                                            {/* Action Buttons */}
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                <TouchableOpacity
                                                    onPress={() => handleOpenPeriodModal(p)}
                                                    style={{ padding: 6 }}
                                                >
                                                    <Edit3 size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setPeriodToDelete(p)}
                                                    style={{ padding: 6 }}
                                                >
                                                    <Trash2 size={16} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Footer: Scheduled Papers Count & Filter Link */}
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderTopWidth: 1,
                                            borderTopColor: isDark ? '#21262d' : '#f1f5f9',
                                            marginTop: 12,
                                            paddingTop: 10
                                        }}>
                                            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                {p.total_papers || 0} scheduled papers attached
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedPeriodFilter(p.id);
                                                    setActiveTab('papers');
                                                }}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF6900' }}>
                                                    View Papers
                                                </Text>
                                                <ChevronRight size={14} color="#FF6900" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* TAB 2: Scheduled Papers Oversight */}
            {activeTab === 'papers' && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Search & Period Filter */}
                    <View style={{ gap: 10, marginBottom: 16 }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            height: 44,
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <Search size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                            <TextInput
                                placeholder="Search exams by paper title or subject..."
                                placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                value={paperSearchQuery}
                                onChangeText={setPaperSearchQuery}
                                style={{
                                    flex: 1,
                                    marginLeft: 8,
                                    fontSize: 13,
                                    color: isDark ? '#f0f6fc' : '#0f172a'
                                }}
                            />
                            {paperSearchQuery ? (
                                <TouchableOpacity onPress={() => setPaperSearchQuery("")}>
                                    <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Period Filter Pills */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 6 }}
                        >
                            <TouchableOpacity
                                onPress={() => setSelectedPeriodFilter('all')}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 7,
                                    borderRadius: 10,
                                    backgroundColor: selectedPeriodFilter === 'all' ? '#FF6900' : (isDark ? '#161b22' : '#ffffff'),
                                    borderWidth: 1,
                                    borderColor: selectedPeriodFilter === 'all' ? '#FF6900' : (isDark ? '#30363d' : '#e2e8f0')
                                }}
                            >
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: '600',
                                    color: selectedPeriodFilter === 'all' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')
                                }}>
                                    All Periods
                                </Text>
                            </TouchableOpacity>

                            {periods.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => setSelectedPeriodFilter(p.id)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 7,
                                        borderRadius: 10,
                                        backgroundColor: selectedPeriodFilter === p.id ? '#FF6900' : (isDark ? '#161b22' : '#ffffff'),
                                        borderWidth: 1,
                                        borderColor: selectedPeriodFilter === p.id ? '#FF6900' : (isDark ? '#30363d' : '#e2e8f0')
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: selectedPeriodFilter === p.id ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')
                                    }}>
                                        {p.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Papers List */}
                    {papersLoading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#FF6900" />
                        </View>
                    ) : filteredPapers.length === 0 ? (
                        <View style={{
                            padding: 32,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <FileSpreadsheet size={36} color={isDark ? '#484f58' : '#cbd5e1'} />
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 12 }}>
                                No scheduled papers found
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 4 }}>
                                Teachers and HODs schedule exam papers under open assessment periods.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {filteredPapers.map(paper => {
                                const isLocked = paper.submission_deadline && new Date() > new Date(paper.submission_deadline);
                                return (
                                    <View
                                        key={paper.id}
                                        style={{
                                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                                            borderRadius: 16,
                                            padding: 16,
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                                        {paper.title}
                                                    </Text>
                                                    <View style={{
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 6,
                                                        backgroundColor: paper.is_published ? (isDark ? '#064e3b' : '#d1fae5') : (isDark ? '#451a03' : '#fef3c7')
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 11,
                                                            fontWeight: '700',
                                                            color: paper.is_published ? '#10b981' : '#f59e0b',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {paper.is_published ? "Published" : "Draft"}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '600', marginTop: 4 }}>
                                                    {paper.subjects?.title || "Subject"}
                                                </Text>

                                                {paper.exam_periods?.name && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                        <CalendarDays size={12} color={isDark ? '#94a3b8' : '#64748b'} />
                                                        <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                            Period: {paper.exam_periods.name}
                                                        </Text>
                                                    </View>
                                                )}

                                                <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                        Date: {new Date(paper.date).toLocaleDateString()}
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                        Max Score: {paper.max_score} pts
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                        Weight: {paper.weight}%
                                                    </Text>
                                                </View>

                                                {paper.submission_deadline && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                                                        {isLocked ? (
                                                            <Lock size={12} color="#ef4444" />
                                                        ) : (
                                                            <Clock size={12} color="#10b981" />
                                                        )}
                                                        <Text style={{ fontSize: 12, color: isLocked ? '#ef4444' : '#10b981' }}>
                                                            Deadline: {new Date(paper.submission_deadline).toLocaleDateString()}
                                                            {isLocked ? " (Locked for Regular Teachers)" : " (Open for grading)"}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Action Buttons */}
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                <TouchableOpacity
                                                    onPress={() => handleOpenPaperEdit(paper)}
                                                    style={{ padding: 6 }}
                                                >
                                                    <Edit3 size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setPaperToDelete(paper)}
                                                    style={{ padding: 6 }}
                                                >
                                                    <Trash2 size={16} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Create/Edit Period Modal */}
            <Modal
                visible={showPeriodModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPeriodModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <View style={{
                        backgroundColor: isDark ? '#161b22' : '#ffffff',
                        borderRadius: 20,
                        padding: 20,
                        maxHeight: '90%',
                        borderWidth: 1,
                        borderColor: isDark ? '#30363d' : '#e2e8f0'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                {editingPeriod ? "Edit Exam Period" : "Open New Exam Period"}
                            </Text>
                            <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                                <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Period Name */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                Period Name *
                            </Text>
                            <TextInput
                                placeholder="e.g. Term 1 Mid-Term Assessments"
                                placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                value={pName}
                                onChangeText={setPName}
                                style={{
                                    height: 44,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                    borderWidth: 1,
                                    borderColor: isDark ? '#30363d' : '#e2e8f0',
                                    color: isDark ? '#f0f6fc' : '#0f172a',
                                    marginBottom: 14
                                }}
                            />

                            {/* Academic Year & Term */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Academic Year *
                                    </Text>
                                    <TextInput
                                        placeholder="2026"
                                        placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                        value={pYear}
                                        onChangeText={setPYear}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            color: isDark ? '#f0f6fc' : '#0f172a'
                                        }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Term *
                                    </Text>
                                    <TextInput
                                        placeholder="Term 1"
                                        placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                        value={pTerm}
                                        onChangeText={setPTerm}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            color: isDark ? '#f0f6fc' : '#0f172a'
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Examination Start & End Dates */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Exam Start Date *
                                    </Text>
                                    <DatePicker
                                        value={pStartDate}
                                        onChange={setPStartDate}
                                        placeholder="Start date"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Exam End Date *
                                    </Text>
                                    <DatePicker
                                        value={pEndDate}
                                        onChange={setPEndDate}
                                        placeholder="End date"
                                    />
                                </View>
                            </View>

                            {/* Result Submission Deadline */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                Result Submission Deadline (Grading Window Closes)
                            </Text>
                            <DatePicker
                                value={pDeadline}
                                onChange={setPDeadline}
                                placeholder="Select grading cutoff date"
                            />

                            {/* Status */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 14, marginBottom: 6 }}>
                                Status
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                                {(['active', 'draft', 'completed', 'archived'] as const).map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        onPress={() => setPStatus(s)}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 8,
                                            backgroundColor: pStatus === s ? '#FF6900' : (isDark ? '#0d1117' : '#f8fafc'),
                                            borderWidth: 1,
                                            borderColor: pStatus === s ? '#FF6900' : (isDark ? '#30363d' : '#e2e8f0')
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: pStatus === s ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                                            textTransform: 'capitalize'
                                        }}>
                                            {s}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Submit */}
                            <TouchableOpacity
                                onPress={handleSavePeriod}
                                disabled={savingPeriod}
                                style={{
                                    backgroundColor: '#FF6900',
                                    height: 48,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8
                                }}
                            >
                                {savingPeriod ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                                        {editingPeriod ? "Update Exam Period" : "Save & Open Exam Period"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Paper Quick Edit Modal */}
            <Modal
                visible={showPaperEditModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPaperEditModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <View style={{
                        backgroundColor: isDark ? '#161b22' : '#ffffff',
                        borderRadius: 20,
                        padding: 20,
                        maxHeight: '90%',
                        borderWidth: 1,
                        borderColor: isDark ? '#30363d' : '#e2e8f0'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                Edit Exam Paper Details
                            </Text>
                            <TouchableOpacity onPress={() => setShowPaperEditModal(false)}>
                                <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                Paper Title
                            </Text>
                            <TextInput
                                value={paperTitle}
                                onChangeText={setPaperTitle}
                                style={{
                                    height: 44,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                    borderWidth: 1,
                                    borderColor: isDark ? '#30363d' : '#e2e8f0',
                                    color: isDark ? '#f0f6fc' : '#0f172a',
                                    marginBottom: 14
                                }}
                            />

                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Max Score
                                    </Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        value={paperMaxScore}
                                        onChangeText={setPaperMaxScore}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            color: isDark ? '#f0f6fc' : '#0f172a'
                                        }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Weight (%)
                                    </Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        value={paperWeight}
                                        onChangeText={setPaperWeight}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            color: isDark ? '#f0f6fc' : '#0f172a'
                                        }}
                                    />
                                </View>
                            </View>

                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                Submission Deadline Override
                            </Text>
                            <DatePicker
                                value={paperDeadline}
                                onChange={setPaperDeadline}
                                placeholder="Select new submission cutoff"
                            />

                            {/* Publish toggle */}
                            <TouchableOpacity
                                onPress={() => setPaperPublished(!paperPublished)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginTop: 16,
                                    marginBottom: 20
                                }}
                            >
                                <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    backgroundColor: paperPublished ? '#FF6900' : 'transparent',
                                    borderWidth: 1,
                                    borderColor: paperPublished ? '#FF6900' : (isDark ? '#6e7681' : '#94a3b8'),
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {paperPublished && <CheckCircle2 size={14} color="#ffffff" />}
                                </View>
                                <Text style={{ color: isDark ? '#f0f6fc' : '#0f172a', fontSize: 13 }}>
                                    Publish exam paper to students and parents
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSavePaper}
                                disabled={savingPaper}
                                style={{
                                    backgroundColor: '#FF6900',
                                    height: 48,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {savingPaper ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                                        Save Changes
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Confirm Delete Period Modal */}
            <ConfirmationModal
                visible={!!periodToDelete}
                title="Delete Exam Period"
                message={`Are you sure you want to delete "${periodToDelete?.name}"? Any linked exam papers will be unlinked but retained.`}
                confirmText="Delete Period"
                cancelText="Cancel"
                isDestructive={true}
                onConfirm={confirmDeletePeriod}
                onClose={() => setPeriodToDelete(null)}
            />

            {/* Confirm Delete Paper Modal */}
            <ConfirmationModal
                visible={!!paperToDelete}
                title="Delete Exam Paper"
                message={`Are you sure you want to delete paper "${paperToDelete?.title}"? All student results associated with this exam will be permanently removed.`}
                confirmText="Delete Paper"
                cancelText="Cancel"
                isDestructive={true}
                onConfirm={confirmDeletePaper}
                onClose={() => setPaperToDelete(null)}
            />
        </View>
    );
}
