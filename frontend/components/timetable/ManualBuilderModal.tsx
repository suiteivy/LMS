import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    X,
    Clock,
    Calendar,
    User,
    BookOpen,
    CheckCircle2,
    AlertOctagon,
    ArrowRight,
    ArrowLeft,
    Check,
    Tag,
    Sliders,
    Zap
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/appTheme';
import {
    TimetableEntry,
    CreateTimetableDto,
    TimetableAPI,
    ConflictCheckResponse
} from '@/services/TimetableService';
import { SubjectData } from '@/services/SubjectService';
import { showError, showSuccess } from '@/utils/toast';

interface ManualBuilderModalProps {
    visible: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    editingEntry: TimetableEntry | null;
    selectedClassId: string;
    selectedClassName: string;
    subjects: SubjectData[];
    days: readonly string[];
}

export const ManualBuilderModal: React.FC<ManualBuilderModalProps> = ({
    visible,
    onClose,
    onSaveSuccess,
    editingEntry,
    selectedClassId,
    selectedClassName,
    subjects,
    days
}) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const colors = isDark ? darkColors : lightColors;

    // View mode: 'quick' is the original fast manual builder form, 'wizard' is the 3-step flow
    const [builderMode, setBuilderMode] = useState<'quick' | 'wizard'>('quick');
    const [step, setStep] = useState<1 | 2 | 3>(1);

    const [dayOfWeek, setDayOfWeek] = useState<string>('Monday');
    const [startTime, setStartTime] = useState<string>('08:00');
    const [endTime, setEndTime] = useState<string>('08:45');
    const [subjectId, setSubjectId] = useState<string>('');
    const [teacherId, setTeacherId] = useState<string>('');
    const [trackId, setTrackId] = useState<string>('');
    const [cohortName, setCohortName] = useState<string>(selectedClassName);

    const [saving, setSaving] = useState<boolean>(false);
    const [checkingConflict, setCheckingConflict] = useState<boolean>(false);
    const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);

    // Initialize or reset form when modal opens
    useEffect(() => {
        if (visible) {
            setStep(1);
            if (editingEntry) {
                setBuilderMode('quick');
                setDayOfWeek(editingEntry.day_of_week || 'Monday');
                setStartTime(editingEntry.start_time ? editingEntry.start_time.slice(0, 5) : '08:00');
                setEndTime(editingEntry.end_time ? editingEntry.end_time.slice(0, 5) : '08:45');
                setSubjectId(editingEntry.subject_id || '');
                setTeacherId(editingEntry.teacher_id || editingEntry.subjects?.teacher_id || '');
                setTrackId(editingEntry.track_id || '');
                setCohortName(editingEntry.room_number || selectedClassName);
            } else {
                setBuilderMode('quick');
                setDayOfWeek('Monday');
                setStartTime('08:00');
                setEndTime('08:45');
                setSubjectId(subjects[0]?.id || '');
                setTeacherId(subjects[0]?.teacher_id || '');
                setTrackId('');
                setCohortName(selectedClassName);
            }
            setConflictResult(null);
        }
    }, [visible, editingEntry, subjects, selectedClassName]);

    // Update teacher when subject changes
    useEffect(() => {
        if (subjectId) {
            const subj = subjects.find(s => s.id === subjectId);
            if (subj?.teacher_id) {
                setTeacherId(subj.teacher_id);
            }
        }
    }, [subjectId, subjects]);

    // Live conflict check when parameters change
    useEffect(() => {
        if (visible && selectedClassId && dayOfWeek && startTime && endTime) {
            runLiveConflictCheck();
        }
    }, [dayOfWeek, startTime, endTime, subjectId, teacherId]);

    const runLiveConflictCheck = async () => {
        try {
            setCheckingConflict(true);
            const res = await TimetableAPI.checkConflict({
                class_id: selectedClassId,
                subject_id: subjectId || undefined,
                teacher_id: teacherId || undefined,
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                exclude_id: editingEntry?.id,
                track_id: trackId || null
            });
            setConflictResult(res);
        } catch (err: any) {
            console.error('Failed to run conflict check:', err);
        } finally {
            setCheckingConflict(false);
        }
    };

    const validateTime = (): boolean => {
        if (!startTime || !endTime) {
            showError('Validation', 'Start and End time are required.');
            return false;
        }
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
            showError('Invalid Time', 'Please enter time in HH:MM format (e.g. 08:00).');
            return false;
        }
        if ((eh * 60 + em) <= (sh * 60 + sm)) {
            showError('Invalid Time', 'End time must be after start time.');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1) {
            if (!validateTime()) return;
            setStep(2);
        } else if (step === 2) {
            if (!subjectId) {
                showError('Validation', 'Please select a subject.');
                return;
            }
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step === 2) setStep(1);
        if (step === 3) setStep(2);
    };

    const handleSave = async () => {
        if (!validateTime()) return;
        if (!subjectId) {
            showError('Validation', 'Please select a subject.');
            return;
        }

        try {
            setSaving(true);
            const payload: CreateTimetableDto = {
                class_id: selectedClassId,
                subject_id: subjectId,
                teacher_id: teacherId || undefined,
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                room_number: cohortName.trim() || selectedClassName || 'Cohort',
                track_id: trackId.trim() || null
            };

            if (editingEntry) {
                await TimetableAPI.updateEntry(editingEntry.id, payload);
                showSuccess('Updated', 'Timetable slot updated successfully.');
            } else {
                await TimetableAPI.createEntry(payload);
                showSuccess('Created', 'Timetable slot created successfully.');
            }

            onSaveSuccess();
            onClose();
        } catch (err: any) {
            showError('Save Failed', err.message || 'Could not save timetable slot.');
        } finally {
            setSaving(false);
        }
    };

    const selectedSubject = subjects.find(s => s.id === subjectId);
    const assignedEducatorName =
        selectedSubject?.teachers?.users?.full_name ||
        (selectedSubject?.teachers?.users?.first_name
            ? `${selectedSubject.teachers.users.first_name} ${selectedSubject.teachers.users.last_name || ''}`.trim()
            : null);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ width: '100%', justifyContent: 'flex-end' }}
                >
                    <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: colors.text }]}>
                                    {editingEntry ? 'Edit Timetable Slot' : 'Manual Timetable Builder'}
                                </Text>
                                <Text style={[styles.subtitle, { color: colors.textSub }]}>
                                    Cohort: <Text style={{ fontWeight: '700', color: colors.text }}>{selectedClassName}</Text>
                                </Text>
                            </View>

                            {/* Mode Toggle: Quick Form vs Step-by-Step */}
                            <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <TouchableOpacity
                                    style={[styles.modeBtn, builderMode === 'quick' && styles.modeBtnActive]}
                                    onPress={() => setBuilderMode('quick')}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Zap size={13} color={builderMode === 'quick' ? '#fff' : colors.textSub} />
                                    <Text style={[styles.modeBtnText, { color: builderMode === 'quick' ? '#fff' : colors.textSub }]}>
                                        Quick
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modeBtn, builderMode === 'wizard' && styles.modeBtnActive]}
                                    onPress={() => setBuilderMode('wizard')}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Sliders size={13} color={builderMode === 'wizard' ? '#fff' : colors.textSub} />
                                    <Text style={[styles.modeBtnText, { color: builderMode === 'wizard' ? '#fff' : colors.textSub }]}>
                                        Steps
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <X size={20} color={colors.textSub} />
                            </TouchableOpacity>
                        </View>

                        {/* Step Indicator (Only shown in Wizard mode) */}
                        {builderMode === 'wizard' && (
                            <View style={[styles.stepIndicator, { borderBottomColor: colors.border }]}>
                                <TouchableOpacity style={styles.stepItem} onPress={() => setStep(1)} activeOpacity={0.7}>
                                    <View style={[styles.stepCircle, step >= 1 ? styles.stepCircleActive : { borderColor: colors.border }]}>
                                        <Text style={[styles.stepCircleText, step >= 1 && styles.stepCircleTextActive]}>1</Text>
                                    </View>
                                    <Text style={[styles.stepLabel, { color: step === 1 ? colors.text : colors.textSub }]}>Timing</Text>
                                </TouchableOpacity>

                                <View style={[styles.stepLine, { backgroundColor: step >= 2 ? '#EA580C' : colors.border }]} />

                                <TouchableOpacity style={styles.stepItem} onPress={() => setStep(2)} activeOpacity={0.7}>
                                    <View style={[styles.stepCircle, step >= 2 ? styles.stepCircleActive : { borderColor: colors.border }]}>
                                        <Text style={[styles.stepCircleText, step >= 2 && styles.stepCircleTextActive]}>2</Text>
                                    </View>
                                    <Text style={[styles.stepLabel, { color: step === 2 ? colors.text : colors.textSub }]}>Subject</Text>
                                </TouchableOpacity>

                                <View style={[styles.stepLine, { backgroundColor: step >= 3 ? '#EA580C' : colors.border }]} />

                                <TouchableOpacity style={styles.stepItem} onPress={() => setStep(3)} activeOpacity={0.7}>
                                    <View style={[styles.stepCircle, step >= 3 ? styles.stepCircleActive : { borderColor: colors.border }]}>
                                        <Text style={[styles.stepCircleText, step >= 3 && styles.stepCircleTextActive]}>3</Text>
                                    </View>
                                    <Text style={[styles.stepLabel, { color: step === 3 ? colors.text : colors.textSub }]}>Verify</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Modal Body */}
                        <ScrollView
                            contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* ── MODE 1: ORIGINAL QUICK MANUAL BUILDER ── */}
                            {builderMode === 'quick' && (
                                <View style={{ gap: 16 }}>
                                    {/* Day of Week */}
                                    <View>
                                        <Text style={[styles.fieldLabel, { color: colors.text }]}>Day of the Week</Text>
                                        <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <Picker
                                                selectedValue={dayOfWeek}
                                                onValueChange={(v) => setDayOfWeek(v)}
                                                style={{ color: colors.text }}
                                                dropdownIconColor={colors.textSub}
                                            >
                                                {days.map((d) => (
                                                    <Picker.Item key={d} label={d} value={d} color={colors.text} />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>

                                    {/* Subject */}
                                    <View>
                                        <Text style={[styles.fieldLabel, { color: colors.text }]}>Subject</Text>
                                        <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <Picker
                                                selectedValue={subjectId}
                                                onValueChange={(v) => setSubjectId(v)}
                                                style={{ color: colors.text }}
                                                dropdownIconColor={colors.textSub}
                                            >
                                                <Picker.Item label="Select subject..." value="" color={colors.textMuted} />
                                                {subjects.map((s) => (
                                                    <Picker.Item
                                                        key={s.id}
                                                        label={s.category ? `${s.title} (${s.category})` : s.title}
                                                        value={s.id}
                                                        color={colors.text}
                                                    />
                                                ))}
                                            </Picker>
                                        </View>
                                        {selectedSubject?.category && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <Tag size={12} color="#3B82F6" />
                                                <Text style={{ fontSize: 12, color: colors.textSub }}>
                                                    Subject Category: <Text style={{ fontWeight: '700', color: colors.text }}>{selectedSubject.category}</Text>
                                                </Text>
                                            </View>
                                        )}
                                        {assignedEducatorName && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <User size={13} color="#EA580C" />
                                                <Text style={{ fontSize: 12, color: colors.textSub }}>
                                                    Assigned Educator: <Text style={{ fontWeight: '700', color: colors.text }}>{assignedEducatorName}</Text>
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Start & End Time */}
                                    <View style={styles.timeRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Start Time (24h)</Text>
                                            <TextInput
                                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                                placeholder="08:00"
                                                placeholderTextColor={colors.textMuted}
                                                value={startTime}
                                                onChangeText={setStartTime}
                                                keyboardType="numbers-and-punctuation"
                                            />
                                        </View>
                                        <View style={{ paddingHorizontal: 10, justifyContent: 'center', paddingTop: 18 }}>
                                            <Text style={{ color: colors.textSub, fontSize: 16 }}>→</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.fieldLabel, { color: colors.text }]}>End Time (24h)</Text>
                                            <TextInput
                                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                                placeholder="08:45"
                                                placeholderTextColor={colors.textMuted}
                                                value={endTime}
                                                onChangeText={setEndTime}
                                                keyboardType="numbers-and-punctuation"
                                            />
                                        </View>
                                    </View>

                                    {/* Cohort / Stream Identity */}
                                    <View>
                                        <Text style={[styles.fieldLabel, { color: colors.text }]}>
                                            Cohort / Stream Identity <Text style={styles.optional}>(Optional)</Text>
                                        </Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                            placeholder="e.g. Grade 4 East, Stream A, PP1"
                                            placeholderTextColor={colors.textMuted}
                                            value={cohortName}
                                            onChangeText={setCohortName}
                                        />
                                    </View>

                                    {/* Live Conflict Check Status */}
                                    <View style={{ marginTop: 2 }}>
                                        {checkingConflict ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}>
                                                <ActivityIndicator size="small" color="#EA580C" />
                                                <Text style={{ color: colors.textSub, fontSize: 12 }}>Checking institution schedule for clashes...</Text>
                                            </View>
                                        ) : conflictResult?.has_conflict ? (
                                            <View style={[styles.conflictBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#EF4444' }]}>
                                                <AlertOctagon size={18} color="#EF4444" style={{ marginTop: 2 }} />
                                                <View style={{ flex: 1, gap: 4 }}>
                                                    <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>
                                                        Scheduling Conflict Detected
                                                    </Text>
                                                    {conflictResult.conflicts.map((conf, cIdx) => (
                                                        <Text key={cIdx} style={{ color: '#DC2626', fontSize: 12 }}>
                                                            • {conf}
                                                        </Text>
                                                    ))}
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={[styles.conflictBox, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: '#22C55E' }]}>
                                                <CheckCircle2 size={18} color="#22C55E" />
                                                <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 12, flex: 1 }}>
                                                    Clean Slot: No educator or class collisions found.
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* ── MODE 2: STEP-BY-STEP WIZARD ── */}
                            {builderMode === 'wizard' && (
                                <View>
                                    {step === 1 && (
                                        <View style={{ gap: 16 }}>
                                            <Text style={[styles.stepHeading, { color: colors.text }]}>Step 1: Timing & Day</Text>

                                            <View>
                                                <Text style={[styles.fieldLabel, { color: colors.text }]}>Day of the Week</Text>
                                                <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                    <Picker
                                                        selectedValue={dayOfWeek}
                                                        onValueChange={(v) => setDayOfWeek(v)}
                                                        style={{ color: colors.text }}
                                                        dropdownIconColor={colors.textSub}
                                                    >
                                                        {days.map((d) => (
                                                            <Picker.Item key={d} label={d} value={d} color={colors.text} />
                                                        ))}
                                                    </Picker>
                                                </View>
                                            </View>

                                            <View style={styles.timeRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Start Time (24h)</Text>
                                                    <TextInput
                                                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                                        placeholder="08:00"
                                                        placeholderTextColor={colors.textMuted}
                                                        value={startTime}
                                                        onChangeText={setStartTime}
                                                        keyboardType="numbers-and-punctuation"
                                                    />
                                                </View>
                                                <View style={{ paddingHorizontal: 10, justifyContent: 'center', paddingTop: 18 }}>
                                                    <Text style={{ color: colors.textSub, fontSize: 16 }}>→</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.fieldLabel, { color: colors.text }]}>End Time (24h)</Text>
                                                    <TextInput
                                                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                                        placeholder="08:45"
                                                        placeholderTextColor={colors.textMuted}
                                                        value={endTime}
                                                        onChangeText={setEndTime}
                                                        keyboardType="numbers-and-punctuation"
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {step === 2 && (
                                        <View style={{ gap: 16 }}>
                                            <Text style={[styles.stepHeading, { color: colors.text }]}>Step 2: Subject & Categorization</Text>

                                            <View>
                                                <Text style={[styles.fieldLabel, { color: colors.text }]}>Subject</Text>
                                                <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                    <Picker
                                                        selectedValue={subjectId}
                                                        onValueChange={(v) => setSubjectId(v)}
                                                        style={{ color: colors.text }}
                                                        dropdownIconColor={colors.textSub}
                                                    >
                                                        <Picker.Item label="Select subject..." value="" color={colors.textMuted} />
                                                        {subjects.map((s) => (
                                                            <Picker.Item
                                                                key={s.id}
                                                                label={s.category ? `${s.title} (${s.category})` : s.title}
                                                                value={s.id}
                                                                color={colors.text}
                                                            />
                                                        ))}
                                                    </Picker>
                                                </View>
                                                {selectedSubject?.category && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                        <Tag size={12} color="#3B82F6" />
                                                        <Text style={{ fontSize: 12, color: colors.textSub }}>
                                                            Subject Category: <Text style={{ fontWeight: '700', color: colors.text }}>{selectedSubject.category}</Text>
                                                        </Text>
                                                    </View>
                                                )}
                                                {assignedEducatorName && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                        <User size={13} color="#EA580C" />
                                                        <Text style={{ fontSize: 12, color: colors.textSub }}>
                                                            Assigned Educator: <Text style={{ fontWeight: '700', color: colors.text }}>{assignedEducatorName}</Text>
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    {step === 3 && (
                                        <View style={{ gap: 16 }}>
                                            <Text style={[styles.stepHeading, { color: colors.text }]}>Step 3: Verification & Cohort Identity</Text>

                                            {/* Cohort input in Step 3 */}
                                            <View>
                                                <Text style={[styles.fieldLabel, { color: colors.text }]}>Cohort / Stream Identity</Text>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                                    placeholder="e.g. Grade 4 East, Stream A"
                                                    placeholderTextColor={colors.textMuted}
                                                    value={cohortName}
                                                    onChangeText={setCohortName}
                                                />
                                            </View>

                                            {/* Summary Card */}
                                            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={styles.summaryRow}>
                                                    <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Cohort Identity:</Text>
                                                    <Text style={[styles.summaryVal, { color: colors.text }]}>{cohortName || selectedClassName}</Text>
                                                </View>
                                                <View style={styles.summaryRow}>
                                                    <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Day & Timing:</Text>
                                                    <Text style={[styles.summaryVal, { color: colors.text }]}>{dayOfWeek} ({startTime} - {endTime})</Text>
                                                </View>
                                                <View style={styles.summaryRow}>
                                                    <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Subject:</Text>
                                                    <Text style={[styles.summaryVal, { color: colors.text }]}>{selectedSubject?.title || 'None'}</Text>
                                                </View>
                                                {selectedSubject?.category && (
                                                    <View style={styles.summaryRow}>
                                                        <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Category:</Text>
                                                        <Text style={[styles.summaryVal, { color: '#3B82F6', fontWeight: '700' }]}>{selectedSubject.category}</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Live Conflict Feedback */}
                                            <View style={{ marginTop: 4 }}>
                                                <Text style={[styles.fieldLabel, { color: colors.text }]}>Live Conflict Detection</Text>
                                                {checkingConflict ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
                                                        <ActivityIndicator size="small" color="#EA580C" />
                                                        <Text style={{ color: colors.textSub, fontSize: 13 }}>Scanning institution schedule for clashes...</Text>
                                                    </View>
                                                ) : conflictResult?.has_conflict ? (
                                                    <View style={[styles.conflictBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#EF4444' }]}>
                                                        <AlertOctagon size={18} color="#EF4444" style={{ marginTop: 2 }} />
                                                        <View style={{ flex: 1, gap: 4 }}>
                                                            <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>
                                                                Scheduling Conflict Detected
                                                            </Text>
                                                            {conflictResult.conflicts.map((conf, cIdx) => (
                                                                <Text key={cIdx} style={{ color: '#DC2626', fontSize: 12 }}>
                                                                    • {conf}
                                                                </Text>
                                                            ))}
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View style={[styles.conflictBox, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: '#22C55E' }]}>
                                                        <CheckCircle2 size={18} color="#22C55E" />
                                                        <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13, flex: 1 }}>
                                                            Clean Slot: No class or educator double-booking detected.
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
                            {builderMode === 'quick' ? (
                                <>
                                    <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={onClose}>
                                        <Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.saveBtn,
                                            (saving || conflictResult?.has_conflict) && { opacity: 0.65 }
                                        ]}
                                        onPress={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Check size={16} color="#fff" />
                                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                                    {editingEntry ? 'Save Changes' : 'Create Entry'}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    {step > 1 ? (
                                        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={handleBack}>
                                            <ArrowLeft size={16} color={colors.text} />
                                            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Back</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={onClose}>
                                            <Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                                        </TouchableOpacity>
                                    )}

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {step === 2 && subjectId && (
                                            <TouchableOpacity
                                                style={[styles.quickSaveBtn, { borderColor: colors.border }]}
                                                onPress={handleSave}
                                                disabled={saving}
                                            >
                                                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Quick Save</Text>
                                            </TouchableOpacity>
                                        )}

                                        {step < 3 ? (
                                            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Next Step</Text>
                                                <ArrowRight size={16} color="#fff" />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[
                                                    styles.saveBtn,
                                                    (conflictResult?.has_conflict || saving) && { opacity: 0.6 }
                                                ]}
                                                onPress={handleSave}
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                                        {editingEntry ? 'Update Slot' : 'Commit Slot'}
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
        maxHeight: '88%',
        minHeight: '55%'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        gap: 10
    },
    title: {
        fontSize: 16,
        fontWeight: '800'
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2
    },
    modeToggle: {
        flexDirection: 'row',
        borderRadius: 20,
        borderWidth: 1,
        padding: 2
    },
    modeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 16
    },
    modeBtnActive: {
        backgroundColor: '#EA580C'
    },
    modeBtnText: {
        fontSize: 11,
        fontWeight: '700'
    },
    closeBtn: {
        padding: 6
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1
    },
    stepItem: {
        alignItems: 'center',
        gap: 4
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center'
    },
    stepCircleActive: {
        borderColor: '#EA580C',
        backgroundColor: '#EA580C'
    },
    stepCircleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#888'
    },
    stepCircleTextActive: {
        color: '#fff'
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: '600'
    },
    stepLine: {
        flex: 1,
        height: 2,
        marginHorizontal: 12,
        marginBottom: 16
    },
    body: {
        padding: 20
    },
    stepHeading: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    optional: {
        fontWeight: '400',
        textTransform: 'none',
        opacity: 0.7
    },
    pickerWrap: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden'
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14
    },
    summaryCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        gap: 10
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '500'
    },
    summaryVal: {
        fontSize: 12,
        fontWeight: '700'
    },
    conflictBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        gap: 12
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1
    },
    quickSaveBtn: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EA580C',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10
    },
    saveBtn: {
        backgroundColor: '#EA580C',
        paddingVertical: 12,
        paddingHorizontal: 22,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    }
});
