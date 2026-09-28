"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualBuilderModal = void 0;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var lucide_react_native_1 = require("lucide-react-native");
var picker_1 = require("@react-native-picker/picker");
var ThemeContext_1 = require("@/contexts/ThemeContext");
var appTheme_1 = require("@/constants/appTheme");
var TimetableService_1 = require("@/services/TimetableService");
var toast_1 = require("@/utils/toast");
var ManualBuilderModal = function (_a) {
    var _b, _c, _d, _e;
    var visible = _a.visible, onClose = _a.onClose, onSaveSuccess = _a.onSaveSuccess, editingEntry = _a.editingEntry, selectedClassId = _a.selectedClassId, selectedClassName = _a.selectedClassName, subjects = _a.subjects, days = _a.days;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var isDark = (0, ThemeContext_1.useTheme)().isDark;
    var colors = isDark ? appTheme_1.darkColors : appTheme_1.lightColors;
    // View mode: 'quick' is the original fast manual builder form, 'wizard' is the 3-step flow
    var _f = (0, react_1.useState)('quick'), builderMode = _f[0], setBuilderMode = _f[1];
    var _g = (0, react_1.useState)(1), step = _g[0], setStep = _g[1];
    var _h = (0, react_1.useState)('Monday'), dayOfWeek = _h[0], setDayOfWeek = _h[1];
    var _j = (0, react_1.useState)('08:00'), startTime = _j[0], setStartTime = _j[1];
    var _k = (0, react_1.useState)('08:45'), endTime = _k[0], setEndTime = _k[1];
    var _l = (0, react_1.useState)(''), subjectId = _l[0], setSubjectId = _l[1];
    var _m = (0, react_1.useState)(''), teacherId = _m[0], setTeacherId = _m[1];
    var _o = (0, react_1.useState)(false), isElective = _o[0], setIsElective = _o[1];
    var _p = (0, react_1.useState)(''), trackId = _p[0], setTrackId = _p[1];
    var _q = (0, react_1.useState)(selectedClassName), cohortName = _q[0], setCohortName = _q[1];
    var _r = (0, react_1.useState)(false), saving = _r[0], setSaving = _r[1];
    var _s = (0, react_1.useState)(false), checkingConflict = _s[0], setCheckingConflict = _s[1];
    var _t = (0, react_1.useState)(null), conflictResult = _t[0], setConflictResult = _t[1];
    // Initialize or reset form when modal opens
    (0, react_1.useEffect)(function () {
        var _a, _b, _c;
        if (visible) {
            setStep(1);
            if (editingEntry) {
                // When editing an entry, default to quick form for instant edits
                setBuilderMode('quick');
                setDayOfWeek(editingEntry.day_of_week || 'Monday');
                setStartTime(editingEntry.start_time ? editingEntry.start_time.slice(0, 5) : '08:00');
                setEndTime(editingEntry.end_time ? editingEntry.end_time.slice(0, 5) : '08:45');
                setSubjectId(editingEntry.subject_id || '');
                setTeacherId(editingEntry.teacher_id || ((_a = editingEntry.subjects) === null || _a === void 0 ? void 0 : _a.teacher_id) || '');
                setIsElective(!!editingEntry.is_elective);
                setTrackId(editingEntry.track_id || '');
                setCohortName(editingEntry.room_number || selectedClassName);
            }
            else {
                setBuilderMode('quick');
                setDayOfWeek('Monday');
                setStartTime('08:00');
                setEndTime('08:45');
                setSubjectId(((_b = subjects[0]) === null || _b === void 0 ? void 0 : _b.id) || '');
                setTeacherId(((_c = subjects[0]) === null || _c === void 0 ? void 0 : _c.teacher_id) || '');
                setIsElective(false);
                setTrackId('');
                setCohortName(selectedClassName);
            }
            setConflictResult(null);
        }
    }, [visible, editingEntry, subjects, selectedClassName]);
    // Update teacher when subject changes
    (0, react_1.useEffect)(function () {
        if (subjectId) {
            var subj = subjects.find(function (s) { return s.id === subjectId; });
            if (subj === null || subj === void 0 ? void 0 : subj.teacher_id) {
                setTeacherId(subj.teacher_id);
            }
        }
    }, [subjectId, subjects]);
    // Live conflict check when parameters change
    (0, react_1.useEffect)(function () {
        if (visible && selectedClassId && dayOfWeek && startTime && endTime) {
            runLiveConflictCheck();
        }
    }, [dayOfWeek, startTime, endTime, subjectId, teacherId, isElective]);
    var runLiveConflictCheck = function () { return __awaiter(void 0, void 0, void 0, function () {
        var res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setCheckingConflict(true);
                    return [4 /*yield*/, TimetableService_1.TimetableAPI.checkConflict({
                            class_id: selectedClassId,
                            subject_id: subjectId || undefined,
                            teacher_id: teacherId || undefined,
                            day_of_week: dayOfWeek,
                            start_time: startTime,
                            end_time: endTime,
                            exclude_id: editingEntry === null || editingEntry === void 0 ? void 0 : editingEntry.id,
                            is_elective: isElective,
                            track_id: trackId || null
                        })];
                case 1:
                    res = _a.sent();
                    setConflictResult(res);
                    return [3 /*break*/, 4];
                case 2:
                    err_1 = _a.sent();
                    console.error('Failed to run conflict check:', err_1);
                    return [3 /*break*/, 4];
                case 3:
                    setCheckingConflict(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var validateTime = function () {
        if (!startTime || !endTime) {
            (0, toast_1.showError)('Validation', 'Start and End time are required.');
            return false;
        }
        var _a = startTime.split(':').map(Number), sh = _a[0], sm = _a[1];
        var _b = endTime.split(':').map(Number), eh = _b[0], em = _b[1];
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
            (0, toast_1.showError)('Invalid Time', 'Please enter time in HH:MM format (e.g. 08:00).');
            return false;
        }
        if ((eh * 60 + em) <= (sh * 60 + sm)) {
            (0, toast_1.showError)('Invalid Time', 'End time must be after start time.');
            return false;
        }
        return true;
    };
    var handleNext = function () {
        if (step === 1) {
            if (!validateTime())
                return;
            setStep(2);
        }
        else if (step === 2) {
            if (!subjectId) {
                (0, toast_1.showError)('Validation', 'Please select a subject.');
                return;
            }
            setStep(3);
        }
    };
    var handleBack = function () {
        if (step === 2)
            setStep(1);
        if (step === 3)
            setStep(2);
    };
    var handleSave = function () { return __awaiter(void 0, void 0, void 0, function () {
        var payload, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!validateTime())
                        return [2 /*return*/];
                    if (!subjectId) {
                        (0, toast_1.showError)('Validation', 'Please select a subject.');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, 7, 8]);
                    setSaving(true);
                    payload = {
                        class_id: selectedClassId,
                        subject_id: subjectId,
                        teacher_id: teacherId || undefined,
                        day_of_week: dayOfWeek,
                        start_time: startTime,
                        end_time: endTime,
                        room_number: cohortName.trim() || selectedClassName || 'Cohort',
                        is_elective: isElective,
                        track_id: trackId.trim() || null
                    };
                    if (!editingEntry) return [3 /*break*/, 3];
                    return [4 /*yield*/, TimetableService_1.TimetableAPI.updateEntry(editingEntry.id, payload)];
                case 2:
                    _a.sent();
                    (0, toast_1.showSuccess)('Updated', 'Timetable slot updated successfully.');
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, TimetableService_1.TimetableAPI.createEntry(payload)];
                case 4:
                    _a.sent();
                    (0, toast_1.showSuccess)('Created', 'Timetable slot created successfully.');
                    _a.label = 5;
                case 5:
                    onSaveSuccess();
                    onClose();
                    return [3 /*break*/, 8];
                case 6:
                    err_2 = _a.sent();
                    (0, toast_1.showError)('Save Failed', err_2.message || 'Could not save timetable slot.');
                    return [3 /*break*/, 8];
                case 7:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var selectedSubject = subjects.find(function (s) { return s.id === subjectId; });
    var assignedEducatorName = ((_c = (_b = selectedSubject === null || selectedSubject === void 0 ? void 0 : selectedSubject.teachers) === null || _b === void 0 ? void 0 : _b.users) === null || _c === void 0 ? void 0 : _c.full_name) ||
        (((_e = (_d = selectedSubject === null || selectedSubject === void 0 ? void 0 : selectedSubject.teachers) === null || _d === void 0 ? void 0 : _d.users) === null || _e === void 0 ? void 0 : _e.first_name)
            ? "".concat(selectedSubject.teachers.users.first_name, " ").concat(selectedSubject.teachers.users.last_name || '').trim()
            : null);
    return (<react_native_1.Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <react_native_1.View style={styles.backdrop}>
                <react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <react_native_1.View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        {/* Header */}
                        <react_native_1.View style={[styles.header, { borderBottomColor: colors.border }]}>
                            <react_native_1.View style={{ flex: 1 }}>
                                <react_native_1.Text style={[styles.title, { color: colors.text }]}>
                                    {editingEntry ? 'Edit Timetable Slot' : 'Manual Timetable Builder'}
                                </react_native_1.Text>
                                <react_native_1.Text style={[styles.subtitle, { color: colors.textSub }]}>
                                    Cohort: <react_native_1.Text style={{ fontWeight: '700', color: colors.text }}>{selectedClassName}</react_native_1.Text>
                                </react_native_1.Text>
                            </react_native_1.View>

                            {/* Mode Toggle: Quick Form vs Step-by-Step */}
                            <react_native_1.View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <react_native_1.TouchableOpacity style={[styles.modeBtn, builderMode === 'quick' && styles.modeBtnActive]} onPress={function () { return setBuilderMode('quick'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <lucide_react_native_1.Zap size={13} color={builderMode === 'quick' ? '#fff' : colors.textSub}/>
                                    <react_native_1.Text style={[styles.modeBtnText, { color: builderMode === 'quick' ? '#fff' : colors.textSub }]}>
                                        Quick
                                    </react_native_1.Text>
                                </react_native_1.TouchableOpacity>
                                <react_native_1.TouchableOpacity style={[styles.modeBtn, builderMode === 'wizard' && styles.modeBtnActive]} onPress={function () { return setBuilderMode('wizard'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <lucide_react_native_1.Sliders size={13} color={builderMode === 'wizard' ? '#fff' : colors.textSub}/>
                                    <react_native_1.Text style={[styles.modeBtnText, { color: builderMode === 'wizard' ? '#fff' : colors.textSub }]}>
                                        Steps
                                    </react_native_1.Text>
                                </react_native_1.TouchableOpacity>
                            </react_native_1.View>

                            <react_native_1.TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <lucide_react_native_1.X size={20} color={colors.textSub}/>
                            </react_native_1.TouchableOpacity>
                        </react_native_1.View>

                        {/* Step Indicator (Only shown in Wizard mode) */}
                        {builderMode === 'wizard' && (<react_native_1.View style={[styles.stepIndicator, { borderBottomColor: colors.border }]}>
                                <react_native_1.TouchableOpacity style={styles.stepItem} onPress={function () { return setStep(1); }} activeOpacity={0.7}>
                                    <react_native_1.View style={[styles.stepCircle, step >= 1 ? styles.stepCircleActive : { borderColor: colors.border }]}>
                                        <react_native_1.Text style={[styles.stepCircleText, step >= 1 && styles.stepCircleTextActive]}>1</react_native_1.Text>
                                    </react_native_1.View>
                                    <react_native_1.Text style={[styles.stepLabel, { color: step === 1 ? colors.text : colors.textSub }]}>Timing</react_native_1.Text>
                                </react_native_1.TouchableOpacity>

                                <react_native_1.View style={[styles.stepLine, { backgroundColor: step >= 2 ? '#EA580C' : colors.border }]}/>

                                <react_native_1.TouchableOpacity style={styles.stepItem} onPress={function () { return setStep(2); }} activeOpacity={0.7}>
                                    <react_native_1.View style={[styles.stepCircle, step >= 2 ? styles.stepCircleActive : { borderColor: colors.border }]}>
                                        <react_native_1.Text style={[styles.stepCircleText, step >= 2 && styles.stepCircleTextActive]}>2</react_native_1.Text>
                                    </react_native_1.View>
                                    <react_native_1.Text style={[styles.stepLabel, { color: step === 2 ? colors.text : colors.textSub }]}>Subject</react_native_1.Text>
                                </react_native_1.TouchableOpacity>

                                <react_native_1.View style={[styles.stepLine, { backgroundColor: step >= 3 ? '#EA580C' : colors.border }]}/>

                                <react_native_1.TouchableOpacity style={styles.stepItem} onPress={function () { return setStep(3); }} activeOpacity={0.7}>
                                    <react_native_1.View style={[styles.stepCircle, step >= 3 ? styles.stepCircleActive : { borderColor: colors.border }]}>
                                        <react_native_1.Text style={[styles.stepCircleText, step >= 3 && styles.stepCircleTextActive]}>3</react_native_1.Text>
                                    </react_native_1.View>
                                    <react_native_1.Text style={[styles.stepLabel, { color: step === 3 ? colors.text : colors.textSub }]}>Verify</react_native_1.Text>
                                </react_native_1.TouchableOpacity>
                            </react_native_1.View>)}

                        {/* Modal Body */}
                        <react_native_1.ScrollView contentContainerStyle={[styles.body, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* ── MODE 1: ORIGINAL QUICK MANUAL BUILDER ── */}
                            {builderMode === 'quick' && (<react_native_1.View style={{ gap: 16 }}>
                                    {/* Day of Week */}
                                    <react_native_1.View>
                                        <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Day of the Week</react_native_1.Text>
                                        <react_native_1.View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <picker_1.Picker selectedValue={dayOfWeek} onValueChange={function (v) { return setDayOfWeek(v); }} style={{ color: colors.text }} dropdownIconColor={colors.textSub}>
                                                {days.map(function (d) { return (<picker_1.Picker.Item key={d} label={d} value={d} color={colors.text}/>); })}
                                            </picker_1.Picker>
                                        </react_native_1.View>
                                    </react_native_1.View>

                                    {/* Subject */}
                                    <react_native_1.View>
                                        <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Subject</react_native_1.Text>
                                        <react_native_1.View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <picker_1.Picker selectedValue={subjectId} onValueChange={function (v) { return setSubjectId(v); }} style={{ color: colors.text }} dropdownIconColor={colors.textSub}>
                                                <picker_1.Picker.Item label="Select subject..." value="" color={colors.textMuted}/>
                                                {subjects.map(function (s) { return (<picker_1.Picker.Item key={s.id} label={s.title} value={s.id} color={colors.text}/>); })}
                                            </picker_1.Picker>
                                        </react_native_1.View>
                                        {assignedEducatorName && (<react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <lucide_react_native_1.User size={13} color="#EA580C"/>
                                                <react_native_1.Text style={{ fontSize: 12, color: colors.textSub }}>
                                                    Assigned Educator: <react_native_1.Text style={{ fontWeight: '700', color: colors.text }}>{assignedEducatorName}</react_native_1.Text>
                                                </react_native_1.Text>
                                            </react_native_1.View>)}
                                    </react_native_1.View>

                                    {/* Start & End Time */}
                                    <react_native_1.View style={styles.timeRow}>
                                        <react_native_1.View style={{ flex: 1 }}>
                                            <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Start Time (24h)</react_native_1.Text>
                                            <react_native_1.TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="08:00" placeholderTextColor={colors.textMuted} value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation"/>
                                        </react_native_1.View>
                                        <react_native_1.View style={{ paddingHorizontal: 10, justifyContent: 'center', paddingTop: 18 }}>
                                            <react_native_1.Text style={{ color: colors.textSub, fontSize: 16 }}>→</react_native_1.Text>
                                        </react_native_1.View>
                                        <react_native_1.View style={{ flex: 1 }}>
                                            <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>End Time (24h)</react_native_1.Text>
                                            <react_native_1.TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="08:45" placeholderTextColor={colors.textMuted} value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation"/>
                                        </react_native_1.View>
                                    </react_native_1.View>

                                    {/* Cohort / Stream Identity */}
                                    <react_native_1.View>
                                        <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>
                                            Cohort / Stream Identity <react_native_1.Text style={styles.optional}>(Optional)</react_native_1.Text>
                                        </react_native_1.Text>
                                        <react_native_1.TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="e.g. Grade 4 East, Stream A, PP1" placeholderTextColor={colors.textMuted} value={cohortName} onChangeText={setCohortName}/>
                                    </react_native_1.View>

                                    {/* Senior Secondary Parallel Elective Toggle */}
                                    <react_native_1.TouchableOpacity style={[
                styles.electiveCard,
                {
                    backgroundColor: isElective ? 'rgba(59, 130, 246, 0.08)' : colors.surface,
                    borderColor: isElective ? '#3B82F6' : colors.border
                }
            ]} onPress={function () { return setIsElective(!isElective); }} activeOpacity={0.8}>
                                        <react_native_1.View style={[styles.checkbox, isElective && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }]}>
                                            {isElective && <lucide_react_native_1.Check size={14} color="#fff"/>}
                                        </react_native_1.View>
                                        <react_native_1.View style={{ flex: 1 }}>
                                            <react_native_1.Text style={[styles.electiveTitle, { color: colors.text }]}>
                                                Parallel Senior Secondary Elective Slot
                                            </react_native_1.Text>
                                            <react_native_1.Text style={[styles.electiveSub, { color: colors.textSub }]}>
                                                Permits simultaneous electives in the same timeslot without flagging class double-booking.
                                            </react_native_1.Text>
                                        </react_native_1.View>
                                    </react_native_1.TouchableOpacity>

                                    {/* Live Conflict Check Status */}
                                    <react_native_1.View style={{ marginTop: 2 }}>
                                        {checkingConflict ? (<react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}>
                                                <react_native_1.ActivityIndicator size="small" color="#EA580C"/>
                                                <react_native_1.Text style={{ color: colors.textSub, fontSize: 12 }}>Checking institution schedule for clashes...</react_native_1.Text>
                                            </react_native_1.View>) : (conflictResult === null || conflictResult === void 0 ? void 0 : conflictResult.has_conflict) ? (<react_native_1.View style={[styles.conflictBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#EF4444' }]}>
                                                <lucide_react_native_1.AlertOctagon size={18} color="#EF4444" style={{ marginTop: 2 }}/>
                                                <react_native_1.View style={{ flex: 1, gap: 4 }}>
                                                    <react_native_1.Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>
                                                        Scheduling Conflict Detected
                                                    </react_native_1.Text>
                                                    {conflictResult.conflicts.map(function (conf, cIdx) { return (<react_native_1.Text key={cIdx} style={{ color: '#DC2626', fontSize: 12 }}>
                                                            • {conf}
                                                        </react_native_1.Text>); })}
                                                </react_native_1.View>
                                            </react_native_1.View>) : (<react_native_1.View style={[styles.conflictBox, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: '#22C55E' }]}>
                                                <lucide_react_native_1.CheckCircle2 size={18} color="#22C55E"/>
                                                <react_native_1.Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 12, flex: 1 }}>
                                                    Clean Slot: No educator or class collisions found.
                                                </react_native_1.Text>
                                            </react_native_1.View>)}
                                    </react_native_1.View>
                                </react_native_1.View>)}

                            {/* ── MODE 2: STEP-BY-STEP WIZARD ── */}
                            {builderMode === 'wizard' && (<react_native_1.View>
                                    {step === 1 && (<react_native_1.View style={{ gap: 16 }}>
                                            <react_native_1.Text style={[styles.stepHeading, { color: colors.text }]}>Step 1: Timing & Day</react_native_1.Text>

                                            <react_native_1.View>
                                                <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Day of the Week</react_native_1.Text>
                                                <react_native_1.View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                    <picker_1.Picker selectedValue={dayOfWeek} onValueChange={function (v) { return setDayOfWeek(v); }} style={{ color: colors.text }} dropdownIconColor={colors.textSub}>
                                                        {days.map(function (d) { return (<picker_1.Picker.Item key={d} label={d} value={d} color={colors.text}/>); })}
                                                    </picker_1.Picker>
                                                </react_native_1.View>
                                            </react_native_1.View>

                                            <react_native_1.View style={styles.timeRow}>
                                                <react_native_1.View style={{ flex: 1 }}>
                                                    <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Start Time (24h)</react_native_1.Text>
                                                    <react_native_1.TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="08:00" placeholderTextColor={colors.textMuted} value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation"/>
                                                </react_native_1.View>
                                                <react_native_1.View style={{ paddingHorizontal: 10, justifyContent: 'center', paddingTop: 18 }}>
                                                    <react_native_1.Text style={{ color: colors.textSub, fontSize: 16 }}>→</react_native_1.Text>
                                                </react_native_1.View>
                                                <react_native_1.View style={{ flex: 1 }}>
                                                    <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>End Time (24h)</react_native_1.Text>
                                                    <react_native_1.TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="08:45" placeholderTextColor={colors.textMuted} value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation"/>
                                                </react_native_1.View>
                                            </react_native_1.View>
                                        </react_native_1.View>)}

                                    {step === 2 && (<react_native_1.View style={{ gap: 16 }}>
                                            <react_native_1.Text style={[styles.stepHeading, { color: colors.text }]}>Step 2: Subject & Educator</react_native_1.Text>

                                            <react_native_1.View>
                                                <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Subject</react_native_1.Text>
                                                <react_native_1.View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                    <picker_1.Picker selectedValue={subjectId} onValueChange={function (v) { return setSubjectId(v); }} style={{ color: colors.text }} dropdownIconColor={colors.textSub}>
                                                        <picker_1.Picker.Item label="Select subject..." value="" color={colors.textMuted}/>
                                                        {subjects.map(function (s) { return (<picker_1.Picker.Item key={s.id} label={s.title} value={s.id} color={colors.text}/>); })}
                                                    </picker_1.Picker>
                                                </react_native_1.View>
                                                {assignedEducatorName && (<react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                        <lucide_react_native_1.User size={13} color="#EA580C"/>
                                                        <react_native_1.Text style={{ fontSize: 12, color: colors.textSub }}>
                                                            Assigned Educator: <react_native_1.Text style={{ fontWeight: '700', color: colors.text }}>{assignedEducatorName}</react_native_1.Text>
                                                        </react_native_1.Text>
                                                    </react_native_1.View>)}
                                            </react_native_1.View>

                                            {/* Senior Secondary Elective Toggle */}
                                            <react_native_1.TouchableOpacity style={[
                    styles.electiveCard,
                    {
                        backgroundColor: isElective ? 'rgba(59, 130, 246, 0.08)' : colors.surface,
                        borderColor: isElective ? '#3B82F6' : colors.border
                    }
                ]} onPress={function () { return setIsElective(!isElective); }} activeOpacity={0.8}>
                                                <react_native_1.View style={[styles.checkbox, isElective && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }]}>
                                                    {isElective && <lucide_react_native_1.Check size={14} color="#fff"/>}
                                                </react_native_1.View>
                                                <react_native_1.View style={{ flex: 1 }}>
                                                    <react_native_1.Text style={[styles.electiveTitle, { color: colors.text }]}>
                                                        Parallel Senior Secondary Elective Slot
                                                    </react_native_1.Text>
                                                    <react_native_1.Text style={[styles.electiveSub, { color: colors.textSub }]}>
                                                        Allows simultaneous parallel tracks without flagging class collisions.
                                                    </react_native_1.Text>
                                                </react_native_1.View>
                                            </react_native_1.TouchableOpacity>
                                        </react_native_1.View>)}

                                    {step === 3 && (<react_native_1.View style={{ gap: 16 }}>
                                            <react_native_1.Text style={[styles.stepHeading, { color: colors.text }]}>Step 3: Verification & Cohort Identity</react_native_1.Text>

                                            {/* Cohort input in Step 3 */}
                                            <react_native_1.View>
                                                <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Cohort / Stream Identity</react_native_1.Text>
                                                <react_native_1.TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="e.g. Grade 4 East, Stream A" placeholderTextColor={colors.textMuted} value={cohortName} onChangeText={setCohortName}/>
                                            </react_native_1.View>

                                            {/* Summary Card */}
                                            <react_native_1.View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <react_native_1.View style={styles.summaryRow}>
                                                    <react_native_1.Text style={[styles.summaryLabel, { color: colors.textSub }]}>Cohort Identity:</react_native_1.Text>
                                                    <react_native_1.Text style={[styles.summaryVal, { color: colors.text }]}>{cohortName || selectedClassName}</react_native_1.Text>
                                                </react_native_1.View>
                                                <react_native_1.View style={styles.summaryRow}>
                                                    <react_native_1.Text style={[styles.summaryLabel, { color: colors.textSub }]}>Day & Timing:</react_native_1.Text>
                                                    <react_native_1.Text style={[styles.summaryVal, { color: colors.text }]}>{dayOfWeek} ({startTime} - {endTime})</react_native_1.Text>
                                                </react_native_1.View>
                                                <react_native_1.View style={styles.summaryRow}>
                                                    <react_native_1.Text style={[styles.summaryLabel, { color: colors.textSub }]}>Subject:</react_native_1.Text>
                                                    <react_native_1.Text style={[styles.summaryVal, { color: colors.text }]}>{(selectedSubject === null || selectedSubject === void 0 ? void 0 : selectedSubject.title) || 'None'}</react_native_1.Text>
                                                </react_native_1.View>
                                                {isElective && (<react_native_1.View style={styles.summaryRow}>
                                                        <react_native_1.Text style={[styles.summaryLabel, { color: colors.textSub }]}>Stream Type:</react_native_1.Text>
                                                        <react_native_1.Text style={[styles.summaryVal, { color: '#3B82F6', fontWeight: '700' }]}>Senior Secondary Parallel Elective</react_native_1.Text>
                                                    </react_native_1.View>)}
                                            </react_native_1.View>

                                            {/* Live Conflict Feedback */}
                                            <react_native_1.View style={{ marginTop: 4 }}>
                                                <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Live Conflict Detection</react_native_1.Text>
                                                {checkingConflict ? (<react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
                                                        <react_native_1.ActivityIndicator size="small" color="#EA580C"/>
                                                        <react_native_1.Text style={{ color: colors.textSub, fontSize: 13 }}>Scanning institution schedule for clashes...</react_native_1.Text>
                                                    </react_native_1.View>) : (conflictResult === null || conflictResult === void 0 ? void 0 : conflictResult.has_conflict) ? (<react_native_1.View style={[styles.conflictBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#EF4444' }]}>
                                                        <lucide_react_native_1.AlertOctagon size={18} color="#EF4444" style={{ marginTop: 2 }}/>
                                                        <react_native_1.View style={{ flex: 1, gap: 4 }}>
                                                            <react_native_1.Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>
                                                                Scheduling Conflict Detected
                                                            </react_native_1.Text>
                                                            {conflictResult.conflicts.map(function (conf, cIdx) { return (<react_native_1.Text key={cIdx} style={{ color: '#DC2626', fontSize: 12 }}>
                                                                    • {conf}
                                                                </react_native_1.Text>); })}
                                                        </react_native_1.View>
                                                    </react_native_1.View>) : (<react_native_1.View style={[styles.conflictBox, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: '#22C55E' }]}>
                                                        <lucide_react_native_1.CheckCircle2 size={18} color="#22C55E"/>
                                                        <react_native_1.Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13, flex: 1 }}>
                                                            Clean Slot: No class or educator double-booking detected.
                                                        </react_native_1.Text>
                                                    </react_native_1.View>)}
                                            </react_native_1.View>
                                        </react_native_1.View>)}
                                </react_native_1.View>)}
                        </react_native_1.ScrollView>

                        {/* Footer Actions */}
                        <react_native_1.View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
                            {builderMode === 'quick' ? (<>
                                    <react_native_1.TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={onClose}>
                                        <react_native_1.Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>Cancel</react_native_1.Text>
                                    </react_native_1.TouchableOpacity>

                                    <react_native_1.TouchableOpacity style={[
                styles.saveBtn,
                (saving || (conflictResult === null || conflictResult === void 0 ? void 0 : conflictResult.has_conflict)) && { opacity: 0.65 }
            ]} onPress={handleSave} disabled={saving}>
                                        {saving ? (<react_native_1.ActivityIndicator size="small" color="#fff"/>) : (<react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <lucide_react_native_1.Check size={16} color="#fff"/>
                                                <react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                                    {editingEntry ? 'Save Changes' : 'Create Entry'}
                                                </react_native_1.Text>
                                            </react_native_1.View>)}
                                    </react_native_1.TouchableOpacity>
                                </>) : (<>
                                    {step > 1 ? (<react_native_1.TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={handleBack}>
                                            <lucide_react_native_1.ArrowLeft size={16} color={colors.text}/>
                                            <react_native_1.Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Back</react_native_1.Text>
                                        </react_native_1.TouchableOpacity>) : (<react_native_1.TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={onClose}>
                                            <react_native_1.Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>Cancel</react_native_1.Text>
                                        </react_native_1.TouchableOpacity>)}

                                    <react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {/* Quick commit shortcut if on step 2 */}
                                        {step === 2 && subjectId && (<react_native_1.TouchableOpacity style={[styles.quickSaveBtn, { borderColor: colors.border }]} onPress={handleSave} disabled={saving}>
                                                <react_native_1.Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Quick Save</react_native_1.Text>
                                            </react_native_1.TouchableOpacity>)}

                                        {step < 3 ? (<react_native_1.TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                                                <react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Next Step</react_native_1.Text>
                                                <lucide_react_native_1.ArrowRight size={16} color="#fff"/>
                                            </react_native_1.TouchableOpacity>) : (<react_native_1.TouchableOpacity style={[
                    styles.saveBtn,
                    ((conflictResult === null || conflictResult === void 0 ? void 0 : conflictResult.has_conflict) || saving) && { opacity: 0.6 }
                ]} onPress={handleSave} disabled={saving}>
                                                {saving ? (<react_native_1.ActivityIndicator size="small" color="#fff"/>) : (<react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                                        {editingEntry ? 'Update Slot' : 'Commit Slot'}
                                                    </react_native_1.Text>)}
                                            </react_native_1.TouchableOpacity>)}
                                    </react_native_1.View>
                                </>)}
                        </react_native_1.View>
                    </react_native_1.View>
                </react_native_1.KeyboardAvoidingView>
            </react_native_1.View>
        </react_native_1.Modal>);
};
exports.ManualBuilderModal = ManualBuilderModal;
var styles = react_native_1.StyleSheet.create({
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
    electiveCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#999',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2
    },
    electiveTitle: {
        fontSize: 13,
        fontWeight: '700'
    },
    electiveSub: {
        fontSize: 11,
        marginTop: 2,
        lineHeight: 16
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
