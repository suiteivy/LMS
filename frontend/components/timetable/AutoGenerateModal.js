"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoGenerateModal = void 0;
var react_1 = require("react");
var react_native_1 = require("react-native");
var lucide_react_native_1 = require("lucide-react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var ThemeContext_1 = require("@/contexts/ThemeContext");
var appTheme_1 = require("@/constants/appTheme");
var TimetableService_1 = require("@/services/TimetableService");
var toast_1 = require("@/utils/toast");
var ALL_WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var AutoGenerateModal = function (_a) {
    var visible = _a.visible, onClose = _a.onClose, onGenerated = _a.onGenerated, selectedClassId = _a.selectedClassId, selectedClassName = _a.selectedClassName;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var isDark = (0, ThemeContext_1.useTheme)().isDark;
    var colors = isDark ? appTheme_1.darkColors : appTheme_1.lightColors;
    var _b = (0, react_1.useState)('readiness'), activeTab = _b[0], setActiveTab = _b[1];
    var _c = (0, react_1.useState)(null), readiness = _c[0], setReadiness = _c[1];
    var _d = (0, react_1.useState)(false), loadingReadiness = _d[0], setLoadingReadiness = _d[1];
    var _e = (0, react_1.useState)(null), config = _e[0], setConfig = _e[1];
    var _f = (0, react_1.useState)(false), loadingConfig = _f[0], setLoadingConfig = _f[1];
    var _g = (0, react_1.useState)(false), savingConfig = _g[0], setSavingConfig = _g[1];
    var _h = (0, react_1.useState)(false), generating = _h[0], setGenerating = _h[1];
    var _j = (0, react_1.useState)(null), generationResult = _j[0], setGenerationResult = _j[1];
    var _k = (0, react_1.useState)('all'), targetScope = _k[0], setTargetScope = _k[1];
    (0, react_1.useEffect)(function () {
        if (visible) {
            loadReadiness();
            loadConfig();
            setGenerationResult(null);
        }
    }, [visible]);
    var loadReadiness = function () { return __awaiter(void 0, void 0, void 0, function () {
        var data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setLoadingReadiness(true);
                    return [4 /*yield*/, TimetableService_1.TimetableAPI.getReadiness()];
                case 1:
                    data = _a.sent();
                    setReadiness(data);
                    return [3 /*break*/, 4];
                case 2:
                    err_1 = _a.sent();
                    console.error('Failed to load readiness:', err_1);
                    return [3 /*break*/, 4];
                case 3:
                    setLoadingReadiness(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var loadConfig = function () { return __awaiter(void 0, void 0, void 0, function () {
        var data, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setLoadingConfig(true);
                    return [4 /*yield*/, TimetableService_1.TimetableAPI.getConfig()];
                case 1:
                    data = _a.sent();
                    setConfig(data);
                    return [3 /*break*/, 4];
                case 2:
                    err_2 = _a.sent();
                    console.error('Failed to load config:', err_2);
                    return [3 /*break*/, 4];
                case 3:
                    setLoadingConfig(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveConfig = function () { return __awaiter(void 0, void 0, void 0, function () {
        var err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    setSavingConfig(true);
                    return [4 /*yield*/, TimetableService_1.TimetableAPI.saveConfig(config)];
                case 2:
                    _a.sent();
                    (0, toast_1.showSuccess)('Config Saved', 'Schedule configuration updated.');
                    return [4 /*yield*/, loadReadiness()];
                case 3:
                    _a.sent();
                    setActiveTab('readiness');
                    return [3 /*break*/, 6];
                case 4:
                    err_3 = _a.sent();
                    (0, toast_1.showError)('Error', err_3.message || 'Failed to save configuration');
                    return [3 /*break*/, 6];
                case 5:
                    setSavingConfig(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var toggleDay = function (day) {
        if (!config)
            return;
        var exists = config.days.includes(day);
        var updated = exists ? config.days.filter(function (d) { return d !== day; }) : __spreadArray(__spreadArray([], config.days, true), [day], false);
        if (updated.length === 0) {
            react_native_1.Alert.alert('Validation', 'At least one day must be active.');
            return;
        }
        setConfig(__assign(__assign({}, config), { days: updated }));
    };
    var handleGenerate = function () { return __awaiter(void 0, void 0, void 0, function () {
        var payload, result, err_4;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, 3, 4]);
                    setGenerating(true);
                    setGenerationResult(null);
                    payload = {
                        save_as_draft: true,
                        target_class_ids: targetScope === 'selected' && selectedClassId ? [selectedClassId] : null
                    };
                    return [4 /*yield*/, TimetableService_1.TimetableAPI.generateTimetable(payload)];
                case 1:
                    result = _b.sent();
                    if (!result.success) {
                        setGenerationResult(result);
                        (0, toast_1.showError)('Generation Infeasible', ((_a = result.diagnostics) === null || _a === void 0 ? void 0 : _a[0]) || 'Constraints could not be satisfied.');
                        return [2 /*return*/];
                    }
                    setGenerationResult(result);
                    (0, toast_1.showSuccess)('Timetable Generated', "Created ".concat(result.total_scheduled, " period slots in draft mode."));
                    onGenerated();
                    return [3 /*break*/, 4];
                case 2:
                    err_4 = _b.sent();
                    (0, toast_1.showError)('Generation Failed', err_4.message || 'Failed to run solver.');
                    return [3 /*break*/, 4];
                case 3:
                    setGenerating(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_1.Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <react_native_1.View style={styles.backdrop}>
                <react_native_1.View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    {/* Header */}
                    <react_native_1.View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(234, 88, 12, 0.15)' }]}>
                                <lucide_react_native_1.Sparkles size={20} color="#EA580C"/>
                            </react_native_1.View>
                            <react_native_1.View>
                                <react_native_1.Text style={[styles.title, { color: colors.text }]}>Automatic Timetable Builder</react_native_1.Text>
                                <react_native_1.Text style={[styles.subtitle, { color: colors.textSub }]}>
                                    MILP (PuLP) Solver & CBC Constraint Optimization
                                </react_native_1.Text>
                            </react_native_1.View>
                        </react_native_1.View>
                        <react_native_1.TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <lucide_react_native_1.X size={20} color={colors.textSub}/>
                        </react_native_1.TouchableOpacity>
                    </react_native_1.View>

                    {/* Tabs */}
                    <react_native_1.View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
                        <react_native_1.TouchableOpacity style={[styles.tabItem, activeTab === 'readiness' && { borderBottomColor: '#EA580C', borderBottomWidth: 2 }]} onPress={function () { return setActiveTab('readiness'); }}>
                            <lucide_react_native_1.ShieldAlert size={16} color={activeTab === 'readiness' ? '#EA580C' : colors.textSub}/>
                            <react_native_1.Text style={[styles.tabText, { color: activeTab === 'readiness' ? '#EA580C' : colors.textSub, fontWeight: activeTab === 'readiness' ? '700' : '500' }]}>
                                Readiness Checklist
                            </react_native_1.Text>
                        </react_native_1.TouchableOpacity>
                        <react_native_1.TouchableOpacity style={[styles.tabItem, activeTab === 'config' && { borderBottomColor: '#EA580C', borderBottomWidth: 2 }]} onPress={function () { return setActiveTab('config'); }}>
                            <lucide_react_native_1.Sliders size={16} color={activeTab === 'config' ? '#EA580C' : colors.textSub}/>
                            <react_native_1.Text style={[styles.tabText, { color: activeTab === 'config' ? '#EA580C' : colors.textSub, fontWeight: activeTab === 'config' ? '700' : '500' }]}>
                                Schedule Config
                            </react_native_1.Text>
                        </react_native_1.TouchableOpacity>
                    </react_native_1.View>

                    {/* Body */}
                    <react_native_1.ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                        {activeTab === 'readiness' ? (<react_native_1.View>
                                <react_native_1.Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    Pre-Generation Verification
                                </react_native_1.Text>
                                <react_native_1.Text style={[styles.sectionSub, { color: colors.textSub }]}>
                                    The solver verifies all administrative prerequisites before running constraint optimization.
                                </react_native_1.Text>

                                {loadingReadiness ? (<react_native_1.View style={styles.loaderWrap}>
                                        <react_native_1.ActivityIndicator size="small" color="#EA580C"/>
                                        <react_native_1.Text style={{ color: colors.textSub, fontSize: 13, marginTop: 8 }}>Verifying institution configuration...</react_native_1.Text>
                                    </react_native_1.View>) : readiness ? (<react_native_1.View style={{ gap: 10, marginTop: 12 }}>
                                        {readiness.checks.map(function (chk) { return (<react_native_1.View key={chk.key} style={[
                        styles.checkCard,
                        {
                            backgroundColor: chk.passed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            borderColor: chk.passed ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'
                        }
                    ]}>
                                                {chk.passed ? (<lucide_react_native_1.CheckCircle2 size={18} color="#22C55E" style={{ marginTop: 2 }}/>) : (<lucide_react_native_1.AlertTriangle size={18} color="#EF4444" style={{ marginTop: 2 }}/>)}
                                                <react_native_1.View style={{ flex: 1 }}>
                                                    <react_native_1.Text style={[styles.checkTitle, { color: colors.text }]}>{chk.title}</react_native_1.Text>
                                                    <react_native_1.Text style={[styles.checkDetail, { color: colors.textSub }]}>{chk.details}</react_native_1.Text>
                                                </react_native_1.View>
                                            </react_native_1.View>); })}

                                        {readiness.ready ? (<react_native_1.View style={[styles.readyBanner, { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: '#22C55E' }]}>
                                                <lucide_react_native_1.CheckCircle2 size={20} color="#22C55E"/>
                                                <react_native_1.View style={{ flex: 1 }}>
                                                    <react_native_1.Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 14 }}>
                                                        All Verification Checks Passed
                                                    </react_native_1.Text>
                                                    <react_native_1.Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                                                        Your institution is fully configured. The solver is ready to generate an optimal timetable.
                                                    </react_native_1.Text>
                                                </react_native_1.View>
                                            </react_native_1.View>) : (<react_native_1.View style={[styles.readyBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                                                <lucide_react_native_1.AlertTriangle size={20} color="#EF4444"/>
                                                <react_native_1.View style={{ flex: 1 }}>
                                                    <react_native_1.Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>
                                                        Prerequisites Incomplete
                                                    </react_native_1.Text>
                                                    <react_native_1.Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                                                        Please resolve the unmet checks above before automatic generation can proceed.
                                                    </react_native_1.Text>
                                                </react_native_1.View>
                                            </react_native_1.View>)}

                                        {/* Scope Selector */}
                                        <react_native_1.View style={{ marginTop: 16 }}>
                                            <react_native_1.Text style={[styles.scopeLabel, { color: colors.text }]}>Generation Target Scope</react_native_1.Text>
                                            <react_native_1.View style={styles.scopeOptions}>
                                                <react_native_1.TouchableOpacity style={[
                    styles.scopeBtn,
                    targetScope === 'all' && styles.scopeBtnActive,
                    { borderColor: targetScope === 'all' ? '#EA580C' : colors.border }
                ]} onPress={function () { return setTargetScope('all'); }}>
                                                    <react_native_1.Text style={[styles.scopeBtnText, { color: targetScope === 'all' ? '#EA580C' : colors.text }]}>
                                                        All Classes (Institution-wide)
                                                    </react_native_1.Text>
                                                </react_native_1.TouchableOpacity>
                                                {selectedClassId ? (<react_native_1.TouchableOpacity style={[
                        styles.scopeBtn,
                        targetScope === 'selected' && styles.scopeBtnActive,
                        { borderColor: targetScope === 'selected' ? '#EA580C' : colors.border }
                    ]} onPress={function () { return setTargetScope('selected'); }}>
                                                        <react_native_1.Text style={[styles.scopeBtnText, { color: targetScope === 'selected' ? '#EA580C' : colors.text }]}>
                                                            Only {selectedClassName || 'Selected Class'}
                                                        </react_native_1.Text>
                                                    </react_native_1.TouchableOpacity>) : null}
                                            </react_native_1.View>
                                        </react_native_1.View>

                                        {/* Generation Result / Diagnostics feedback */}
                                        {generationResult && (<react_native_1.View style={[
                        styles.resultBox,
                        {
                            backgroundColor: generationResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            borderColor: generationResult.success ? '#22C55E' : '#EF4444'
                        }
                    ]}>
                                                <react_native_1.Text style={{ fontWeight: '700', color: generationResult.success ? '#16A34A' : '#DC2626', fontSize: 14 }}>
                                                    {generationResult.success ? '✓ Generation Complete' : '✗ Optimization Infeasible'}
                                                </react_native_1.Text>
                                                {generationResult.success ? (<react_native_1.Text style={{ color: colors.textSub, fontSize: 12, marginTop: 4 }}>
                                                        Successfully scheduled {generationResult.total_scheduled} periods into Draft mode via {generationResult.solver_engine}.
                                                    </react_native_1.Text>) : (<react_native_1.View style={{ marginTop: 6, gap: 4 }}>
                                                        {(generationResult.diagnostics || []).map(function (diag, dIdx) { return (<react_native_1.Text key={dIdx} style={{ color: '#DC2626', fontSize: 12 }}>
                                                                • {diag}
                                                            </react_native_1.Text>); })}
                                                    </react_native_1.View>)}
                                            </react_native_1.View>)}
                                    </react_native_1.View>) : null}
                            </react_native_1.View>) : (
        /* Config Tab */
        <react_native_1.View>
                                <react_native_1.Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule Configuration</react_native_1.Text>
                                <react_native_1.Text style={[styles.sectionSub, { color: colors.textSub }]}>
                                    Set operational days, period timing, and workload boundaries.
                                </react_native_1.Text>

                                {loadingConfig ? (<react_native_1.View style={styles.loaderWrap}>
                                        <react_native_1.ActivityIndicator size="small" color="#EA580C"/>
                                    </react_native_1.View>) : config ? (<react_native_1.View style={{ marginTop: 14, gap: 16 }}>
                                        {/* Days */}
                                        <react_native_1.View>
                                            <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Active School Days</react_native_1.Text>
                                            <react_native_1.View style={styles.daysRow}>
                                                {ALL_WEEK_DAYS.map(function (day) {
                    var active = config.days.includes(day);
                    return (<react_native_1.TouchableOpacity key={day} style={[
                            styles.dayChip,
                            active && { backgroundColor: '#EA580C', borderColor: '#EA580C' },
                            !active && { borderColor: colors.border }
                        ]} onPress={function () { return toggleDay(day); }}>
                                                            <react_native_1.Text style={{ color: active ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>
                                                                {day.slice(0, 3)}
                                                            </react_native_1.Text>
                                                        </react_native_1.TouchableOpacity>);
                })}
                                            </react_native_1.View>
                                        </react_native_1.View>

                                        {/* Periods Summary */}
                                        <react_native_1.View>
                                            <react_native_1.Text style={[styles.fieldLabel, { color: colors.text }]}>Daily Periods ({config.periods.length})</react_native_1.Text>
                                            <react_native_1.View style={[styles.periodsContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                                {config.periods.map(function (p) { return (<react_native_1.View key={p.period_number} style={[styles.periodRow, { borderBottomColor: colors.border }]}>
                                                        <react_native_1.Text style={[styles.periodNum, { color: colors.text }]}>#{p.period_number}</react_native_1.Text>
                                                        <react_native_1.Text style={[styles.periodTime, { color: colors.textSub }]}>
                                                            {p.start_time} - {p.end_time}
                                                        </react_native_1.Text>
                                                        <react_native_1.View style={[
                        styles.breakBadge,
                        { backgroundColor: p.is_break ? 'rgba(234, 88, 12, 0.15)' : 'rgba(59, 130, 246, 0.15)' }
                    ]}>
                                                            <react_native_1.Text style={{ color: p.is_break ? '#EA580C' : '#3B82F6', fontSize: 11, fontWeight: '700' }}>
                                                                {p.is_break ? 'BREAK' : 'LESSON'}
                                                            </react_native_1.Text>
                                                        </react_native_1.View>
                                                        <react_native_1.Text style={[styles.periodLabel, { color: colors.text }]}>{p.label || ''}</react_native_1.Text>
                                                    </react_native_1.View>); })}
                                            </react_native_1.View>
                                        </react_native_1.View>

                                        {/* Save Config Button */}
                                        <react_native_1.TouchableOpacity style={[styles.saveConfigBtn, savingConfig && { opacity: 0.6 }]} onPress={handleSaveConfig} disabled={savingConfig}>
                                            {savingConfig ? (<react_native_1.ActivityIndicator size="small" color="#fff"/>) : (<react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                                    Save Schedule Configuration
                                                </react_native_1.Text>)}
                                        </react_native_1.TouchableOpacity>
                                    </react_native_1.View>) : null}
                            </react_native_1.View>)}
                    </react_native_1.ScrollView>

                    {/* Footer Actions */}
                    {activeTab === 'readiness' && (<react_native_1.View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
                            <react_native_1.TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                                <react_native_1.Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>Close</react_native_1.Text>
                            </react_native_1.TouchableOpacity>

                            <react_native_1.TouchableOpacity style={[
                styles.generateBtn,
                (!(readiness === null || readiness === void 0 ? void 0 : readiness.ready) || generating) && { opacity: 0.5 }
            ]} onPress={handleGenerate} disabled={!(readiness === null || readiness === void 0 ? void 0 : readiness.ready) || generating}>
                                {generating ? (<react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <react_native_1.ActivityIndicator size="small" color="#fff"/>
                                        <react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Solving MILP Constraints...</react_native_1.Text>
                                    </react_native_1.View>) : (<react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <lucide_react_native_1.Zap size={16} color="#fff"/>
                                        <react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                            Generate Timetable (PuLP)
                                        </react_native_1.Text>
                                    </react_native_1.View>)}
                            </react_native_1.TouchableOpacity>
                        </react_native_1.View>)}
                </react_native_1.View>
            </react_native_1.View>
        </react_native_1.Modal>);
};
exports.AutoGenerateModal = AutoGenerateModal;
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
