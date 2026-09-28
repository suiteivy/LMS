import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import {
    X,
    CheckCircle2,
    AlertTriangle,
    Zap,
    Clock,
    Calendar,
    Settings,
    ShieldAlert,
    RefreshCw,
    Sparkles,
    Sliders
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/appTheme';
import {
    TimetableAPI,
    TimetableReadinessResponse,
    TimetableConfig,
    GenerateTimetableResponse
} from '@/services/TimetableService';
import { showSuccess, showError } from '@/utils/toast';

interface AutoGenerateModalProps {
    visible: boolean;
    onClose: () => void;
    onGenerated: () => void;
    selectedClassId?: string;
    selectedClassName?: string;
}

const ALL_WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const AutoGenerateModal: React.FC<AutoGenerateModalProps> = ({
    visible,
    onClose,
    onGenerated,
    selectedClassId,
    selectedClassName
}) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const colors = isDark ? darkColors : lightColors;
    const [activeTab, setActiveTab] = useState<'readiness' | 'config'>('readiness');

    const [readiness, setReadiness] = useState<TimetableReadinessResponse | null>(null);
    const [loadingReadiness, setLoadingReadiness] = useState<boolean>(false);

    const [config, setConfig] = useState<TimetableConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
    const [savingConfig, setSavingConfig] = useState<boolean>(false);

    const [generating, setGenerating] = useState<boolean>(false);
    const [generationResult, setGenerationResult] = useState<GenerateTimetableResponse | null>(null);
    const [targetScope, setTargetScope] = useState<'all' | 'selected'>('all');

    useEffect(() => {
        if (visible) {
            loadReadiness();
            loadConfig();
            setGenerationResult(null);
        }
    }, [visible]);

    const loadReadiness = async () => {
        try {
            setLoadingReadiness(true);
            const data = await TimetableAPI.getReadiness();
            setReadiness(data);
        } catch (err: any) {
            console.error('Failed to load readiness:', err);
        } finally {
            setLoadingReadiness(false);
        }
    };

    const loadConfig = async () => {
        try {
            setLoadingConfig(true);
            const data = await TimetableAPI.getConfig();
            setConfig(data);
        } catch (err: any) {
            console.error('Failed to load config:', err);
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        try {
            setSavingConfig(true);
            await TimetableAPI.saveConfig(config);
            showSuccess('Config Saved', 'Schedule configuration updated.');
            await loadReadiness();
            setActiveTab('readiness');
        } catch (err: any) {
            showError('Error', err.message || 'Failed to save configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const toggleDay = (day: string) => {
        if (!config) return;
        const exists = config.days.includes(day);
        const updated = exists ? config.days.filter(d => d !== day) : [...config.days, day];
        if (updated.length === 0) {
            Alert.alert('Validation', 'At least one day must be active.');
            return;
        }
        setConfig({ ...config, days: updated });
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            setGenerationResult(null);

            const payload = {
                save_as_draft: true,
                target_class_ids: targetScope === 'selected' && selectedClassId ? [selectedClassId] : null
            };

            const result = await TimetableAPI.generateTimetable(payload);

            if (!result.success) {
                setGenerationResult(result);
                showError('Generation Infeasible', result.diagnostics?.[0] || 'Constraints could not be satisfied.');
                return;
            }

            setGenerationResult(result);
            showSuccess('Timetable Generated', `Created ${result.total_scheduled} period slots in draft mode.`);
            onGenerated();
        } catch (err: any) {
            showError('Generation Failed', err.message || 'Failed to run solver.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[styles.iconWrap, { backgroundColor: 'rgba(234, 88, 12, 0.15)' }]}>
                                <Sparkles size={20} color="#EA580C" />
                            </View>
                            <View>
                                <Text style={[styles.title, { color: colors.text }]}>Automatic Timetable Builder</Text>
                                <Text style={[styles.subtitle, { color: colors.textSub }]}>
                                    MILP (PuLP) Solver & CBC Constraint Optimization
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={20} color={colors.textSub} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'readiness' && { borderBottomColor: '#EA580C', borderBottomWidth: 2 }]}
                            onPress={() => setActiveTab('readiness')}
                        >
                            <ShieldAlert size={16} color={activeTab === 'readiness' ? '#EA580C' : colors.textSub} />
                            <Text style={[styles.tabText, { color: activeTab === 'readiness' ? '#EA580C' : colors.textSub, fontWeight: activeTab === 'readiness' ? '700' : '500' }]}>
                                Readiness Checklist
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'config' && { borderBottomColor: '#EA580C', borderBottomWidth: 2 }]}
                            onPress={() => setActiveTab('config')}
                        >
                            <Sliders size={16} color={activeTab === 'config' ? '#EA580C' : colors.textSub} />
                            <Text style={[styles.tabText, { color: activeTab === 'config' ? '#EA580C' : colors.textSub, fontWeight: activeTab === 'config' ? '700' : '500' }]}>
                                Schedule Config
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Body */}
                    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                        {activeTab === 'readiness' ? (
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    Pre-Generation Verification
                                </Text>
                                <Text style={[styles.sectionSub, { color: colors.textSub }]}>
                                    The solver verifies all administrative prerequisites before running constraint optimization.
                                </Text>

                                {loadingReadiness ? (
                                    <View style={styles.loaderWrap}>
                                        <ActivityIndicator size="small" color="#EA580C" />
                                        <Text style={{ color: colors.textSub, fontSize: 13, marginTop: 8 }}>Verifying institution configuration...</Text>
                                    </View>
                                ) : readiness ? (
                                    <View style={{ gap: 10, marginTop: 12 }}>
                                        {readiness.checks.map((chk) => (
                                            <View
                                                key={chk.key}
                                                style={[
                                                    styles.checkCard,
                                                    {
                                                        backgroundColor: chk.passed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                        borderColor: chk.passed ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'
                                                    }
                                                ]}
                                            >
                                                {chk.passed ? (
                                                    <CheckCircle2 size={18} color="#22C55E" style={{ marginTop: 2 }} />
                                                ) : (
                                                    <AlertTriangle size={18} color="#EF4444" style={{ marginTop: 2 }} />
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.checkTitle, { color: colors.text }]}>{chk.title}</Text>
                                                    <Text style={[styles.checkDetail, { color: colors.textSub }]}>{chk.details}</Text>
                                                </View>
                                            </View>
                                        ))}

                                        {readiness.ready ? (
                                            <View style={[styles.readyBanner, { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: '#22C55E' }]}>
                                                <CheckCircle2 size={20} color="#22C55E" />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 14 }}>
                                                        All Verification Checks Passed
                                                    </Text>
                                                    <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                                                        Your institution is fully configured. The solver is ready to generate an optimal timetable.
                                                    </Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={[styles.readyBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                                                <AlertTriangle size={20} color="#EF4444" />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>
                                                        Prerequisites Incomplete
                                                    </Text>
                                                    <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                                                        Please resolve the unmet checks above before automatic generation can proceed.
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Scope Selector */}
                                        <View style={{ marginTop: 16 }}>
                                            <Text style={[styles.scopeLabel, { color: colors.text }]}>Generation Target Scope</Text>
                                            <View style={styles.scopeOptions}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.scopeBtn,
                                                        targetScope === 'all' && styles.scopeBtnActive,
                                                        { borderColor: targetScope === 'all' ? '#EA580C' : colors.border }
                                                    ]}
                                                    onPress={() => setTargetScope('all')}
                                                >
                                                    <Text style={[styles.scopeBtnText, { color: targetScope === 'all' ? '#EA580C' : colors.text }]}>
                                                        All Classes (Institution-wide)
                                                    </Text>
                                                </TouchableOpacity>
                                                {selectedClassId ? (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.scopeBtn,
                                                            targetScope === 'selected' && styles.scopeBtnActive,
                                                            { borderColor: targetScope === 'selected' ? '#EA580C' : colors.border }
                                                        ]}
                                                        onPress={() => setTargetScope('selected')}
                                                    >
                                                        <Text style={[styles.scopeBtnText, { color: targetScope === 'selected' ? '#EA580C' : colors.text }]}>
                                                            Only {selectedClassName || 'Selected Class'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        </View>

                                        {/* Generation Result / Diagnostics feedback */}
                                        {generationResult && (
                                            <View
                                                style={[
                                                    styles.resultBox,
                                                    {
                                                        backgroundColor: generationResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        borderColor: generationResult.success ? '#22C55E' : '#EF4444'
                                                    }
                                                ]}
                                            >
                                                <Text style={{ fontWeight: '700', color: generationResult.success ? '#16A34A' : '#DC2626', fontSize: 14 }}>
                                                    {generationResult.success ? '✓ Generation Complete' : '✗ Optimization Infeasible'}
                                                </Text>
                                                {generationResult.success ? (
                                                    <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 4 }}>
                                                        Successfully scheduled {generationResult.total_scheduled} periods into Draft mode via {generationResult.solver_engine}.
                                                    </Text>
                                                ) : (
                                                    <View style={{ marginTop: 6, gap: 4 }}>
                                                        {(generationResult.diagnostics || []).map((diag, dIdx) => (
                                                            <Text key={dIdx} style={{ color: '#DC2626', fontSize: 12 }}>
                                                                • {diag}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ) : null}
                            </View>
                        ) : (
                            /* Config Tab */
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule Configuration</Text>
                                <Text style={[styles.sectionSub, { color: colors.textSub }]}>
                                    Set operational days, period timing, and workload boundaries.
                                </Text>

                                {loadingConfig ? (
                                    <View style={styles.loaderWrap}>
                                        <ActivityIndicator size="small" color="#EA580C" />
                                    </View>
                                ) : config ? (
                                    <View style={{ marginTop: 14, gap: 16 }}>
                                        {/* Days */}
                                        <View>
                                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Active School Days</Text>
                                            <View style={styles.daysRow}>
                                                {ALL_WEEK_DAYS.map((day) => {
                                                    const active = config.days.includes(day);
                                                    return (
                                                        <TouchableOpacity
                                                            key={day}
                                                            style={[
                                                                styles.dayChip,
                                                                active && { backgroundColor: '#EA580C', borderColor: '#EA580C' },
                                                                !active && { borderColor: colors.border }
                                                            ]}
                                                            onPress={() => toggleDay(day)}
                                                        >
                                                            <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>
                                                                {day.slice(0, 3)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>

                                        {/* Periods Summary */}
                                        <View>
                                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Daily Periods ({config.periods.length})</Text>
                                            <View style={[styles.periodsContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                                {config.periods.map((p) => (
                                                    <View key={p.period_number} style={[styles.periodRow, { borderBottomColor: colors.border }]}>
                                                        <Text style={[styles.periodNum, { color: colors.text }]}>#{p.period_number}</Text>
                                                        <Text style={[styles.periodTime, { color: colors.textSub }]}>
                                                            {p.start_time} - {p.end_time}
                                                        </Text>
                                                        <View
                                                            style={[
                                                                styles.breakBadge,
                                                                { backgroundColor: p.is_break ? 'rgba(234, 88, 12, 0.15)' : 'rgba(59, 130, 246, 0.15)' }
                                                            ]}
                                                        >
                                                            <Text style={{ color: p.is_break ? '#EA580C' : '#3B82F6', fontSize: 11, fontWeight: '700' }}>
                                                                {p.is_break ? 'BREAK' : 'LESSON'}
                                                            </Text>
                                                        </View>
                                                        <Text style={[styles.periodLabel, { color: colors.text }]}>{p.label || ''}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Save Config Button */}
                                        <TouchableOpacity
                                            style={[styles.saveConfigBtn, savingConfig && { opacity: 0.6 }]}
                                            onPress={handleSaveConfig}
                                            disabled={savingConfig}
                                        >
                                            {savingConfig ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                                    Save Schedule Configuration
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    {activeTab === 'readiness' && (
                        <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
                            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                                <Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>Close</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.generateBtn,
                                    (!readiness?.ready || generating) && { opacity: 0.5 }
                                ]}
                                onPress={handleGenerate}
                                disabled={!readiness?.ready || generating}
                            >
                                {generating ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Solving MILP Constraints...</Text>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Zap size={16} color="#fff" />
                                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                            Generate Timetable (PuLP)
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        maxHeight: '90%',
        minHeight: '65%'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: 17,
        fontWeight: '800'
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2
    },
    closeBtn: {
        padding: 6
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14
    },
    tabText: {
        fontSize: 13
    },
    body: {
        padding: 20,
        paddingBottom: 40
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800'
    },
    sectionSub: {
        fontSize: 12,
        marginTop: 4,
        marginBottom: 8
    },
    loaderWrap: {
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center'
    },
    checkCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1
    },
    checkTitle: {
        fontSize: 14,
        fontWeight: '700'
    },
    checkDetail: {
        fontSize: 12,
        marginTop: 3,
        lineHeight: 17
    },
    readyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 8
    },
    scopeLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8
    },
    scopeOptions: {
        flexDirection: 'row',
        gap: 10
    },
    scopeBtn: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    scopeBtnActive: {
        backgroundColor: 'rgba(234, 88, 12, 0.12)'
    },
    scopeBtnText: {
        fontSize: 12,
        fontWeight: '700'
    },
    resultBox: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 14
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8
    },
    daysRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    dayChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1
    },
    periodsContainer: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden'
    },
    periodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 10
    },
    periodNum: {
        fontSize: 13,
        fontWeight: '700',
        width: 28
    },
    periodTime: {
        fontSize: 12,
        fontWeight: '500',
        width: 100
    },
    breakBadge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 6
    },
    periodLabel: {
        fontSize: 12,
        flex: 1
    },
    saveConfigBtn: {
        backgroundColor: '#EA580C',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center'
    },
    generateBtn: {
        flex: 1,
        backgroundColor: '#EA580C',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    }
});
