import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    Platform,
    useWindowDimensions
} from 'react-native';
import {
    User,
    Shield,
    Briefcase,
    Globe,
    Check,
    ChevronRight,
    ChevronLeft,
    X,
    AlertTriangle,
    Eye,
    Plus,
    Lock
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { RoleAPI, CustomRole, FeatureItem } from '@/services/RoleService';
import { api } from '@/services/api';
import { generatePlainEnglishSummary, analyzePermissionRisks } from '@/utils/permissionGuidance';

interface AdminEnrollmentWizardProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (newUserId?: string) => void;
    institutionId?: string;
}

export function AdminEnrollmentWizard({
    visible,
    onClose,
    onSuccess,
    institutionId
}: AdminEnrollmentWizardProps) {
    const { isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [currentStep, setCurrentStep] = useState<number>(1);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [loadingRoles, setLoadingRoles] = useState<boolean>(true);

    // Roles and Features data
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [features, setFeatures] = useState<FeatureItem[]>([]);

    // Step 1: Admin Details
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [employeeId, setEmployeeId] = useState('');

    // Step 2: Type
    const [adminType, setAdminType] = useState<'standard'>('standard');

    // Step 3: Role(s)
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

    // Step 4: Access (Data Scope)
    const [scopeType, setScopeType] = useState<'all' | 'levels' | 'classes'>('all');
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

    // Step 5: Feature Overrides
    const [overrides, setOverrides] = useState<Array<{ domain: string; action: string; effect: 'allow' | 'deny'; reason: string }>>([]);
    const [overrideDomain, setOverrideDomain] = useState('academic');
    const [overrideAction, setOverrideAction] = useState('view');
    const [overrideEffect, setOverrideEffect] = useState<'allow' | 'deny'>('allow');
    const [overrideReason, setOverrideReason] = useState('');

    useEffect(() => {
        if (visible) {
            loadInitialData();
        } else {
            resetForm();
        }
    }, [visible]);

    const resetForm = () => {
        setCurrentStep(1);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setEmployeeId('');
        setSelectedRoleIds([]);
        setScopeType('all');
        setSelectedGrades([]);
        setOverrides([]);
        setSubmitting(false);
    };

    const loadInitialData = async () => {
        try {
            setLoadingRoles(true);
            const [rolesData, featuresData] = await Promise.all([
                RoleAPI.getRoles(),
                RoleAPI.getFeatures().catch(() => [])
            ]);
            setRoles(rolesData || []);
            setFeatures(featuresData || []);
        } catch (e) {
            console.error('[AdminEnrollmentWizard] Load error:', e);
        } finally {
            setLoadingRoles(false);
        }
    };

    const toggleRole = (roleId: string) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    };

    // Calculate effective permissions summary from selected roles
    const selectedRoles = useMemo(() => {
        return roles.filter(r => selectedRoleIds.includes(r.id));
    }, [roles, selectedRoleIds]);

    const combinedPermissions = useMemo(() => {
        const perms: Array<{ domain: string; action: string }> = [];
        selectedRoles.forEach(r => {
            if (Array.isArray(r.permissions)) {
                r.permissions.forEach(p => {
                    if (typeof p === 'object' && p.domain && p.action) {
                        perms.push({ domain: p.domain, action: p.action });
                    }
                });
            }
        });
        return perms;
    }, [selectedRoles]);

    const plainEnglishSummary = useMemo(() => {
        return generatePlainEnglishSummary(combinedPermissions, {
            data_scope: scopeType,
            levels: selectedGrades
        });
    }, [combinedPermissions, scopeType, selectedGrades]);

    const risks = useMemo(() => {
        return analyzePermissionRisks(combinedPermissions);
    }, [combinedPermissions]);

    // Validation per step
    const canProceed = useMemo(() => {
        switch (currentStep) {
            case 1:
                return firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().includes('@');
            case 2:
                return true;
            case 3:
                return selectedRoleIds.length > 0;
            case 4:
                return true;
            case 5:
                return true;
            case 6:
                return true;
            default:
                return false;
        }
    }, [currentStep, firstName, lastName, email, selectedRoleIds]);

    const handleAddOverride = () => {
        if (!overrideReason.trim()) {
            Alert.alert("Reason Required", "Please provide a clear justification for this permission override.");
            return;
        }
        setOverrides(prev => [
            ...prev,
            { domain: overrideDomain, action: overrideAction, effect: overrideEffect, reason: overrideReason.trim() }
        ]);
        setOverrideReason('');
    };

    const handleRemoveOverride = (index: number) => {
        setOverrides(prev => prev.filter((_, i) => i !== index));
    };

    const handleFinish = async () => {
        try {
            setSubmitting(true);
            const payload = {
                role: 'admin',
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName.trim()} ${lastName.trim()}`,
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                employee_id: employeeId.trim(),
                role_ids: selectedRoleIds,
                overrides: overrides,
                institution_id: institutionId
            };

            const response = await api.post('/auth/enroll-user', payload);
            Alert.alert("Admin Enrolled", `${firstName} ${lastName} has been enrolled successfully with their assigned roles.`);
            onSuccess(response.data?.user?.id);
            onClose();
        } catch (err: any) {
            console.error('[AdminEnrollmentWizard] Submit error:', err);
            const msg = err.response?.data?.error || err.message || "Failed to enroll administrator";
            Alert.alert("Enrollment Failed", msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Color definitions
    const bg = isDark ? '#161B22' : '#FFFFFF';
    const cardBg = isDark ? '#0D1117' : '#F6F8FA';
    const border = isDark ? '#30363D' : '#E1E4E8';
    const textPrimary = isDark ? '#F0F6FC' : '#1F2328';
    const textSecondary = isDark ? '#8B949E' : '#656D76';

    const renderStepHeader = () => {
        const steps = ['Admin', 'Type', 'Role(s)', 'Access', 'Features', 'Review'];
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                {steps.map((label, idx) => {
                    const stepNum = idx + 1;
                    const isActive = stepNum === currentStep;
                    const isCompleted = stepNum < currentStep;
                    return (
                        <View key={label} style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: isActive ? '#FF6900' : (isCompleted ? '#10B981' : (isDark ? '#21262D' : '#E5E7EB')),
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 4
                            }}>
                                {isCompleted ? (
                                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                ) : (
                                    <Text style={{ color: isActive ? '#FFFFFF' : textSecondary, fontSize: 12, fontWeight: '700' }}>
                                        {stepNum}
                                    </Text>
                                )}
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: isActive ? '700' : '500', color: isActive ? '#FF6900' : textSecondary }}>
                                {label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: bg }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 48 : 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Shield size={22} color="#FF6900" />
                        <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                            Enroll Administrator
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} color={textSecondary} />
                    </TouchableOpacity>
                </View>

                {renderStepHeader()}

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                    {/* STEP 1: ADMIN DETAILS */}
                    {currentStep === 1 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
                                Step 1: Administrator Identity
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 20 }}>
                                Enter the administrator's personal details to create their profile.
                            </Text>

                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>FIRST NAME *</Text>
                            <TextInput
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="e.g. John"
                                placeholderTextColor={textSecondary}
                                style={{ height: 48, backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: textPrimary, marginBottom: 16 }}
                            />

                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>LAST NAME *</Text>
                            <TextInput
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="e.g. Doe"
                                placeholderTextColor={textSecondary}
                                style={{ height: 48, backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: textPrimary, marginBottom: 16 }}
                            />

                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>EMAIL ADDRESS *</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholder="e.g. john.doe@institution.edu"
                                placeholderTextColor={textSecondary}
                                style={{ height: 48, backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: textPrimary, marginBottom: 16 }}
                            />

                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>PHONE NUMBER</Text>
                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                placeholder="+254 700 000 000"
                                placeholderTextColor={textSecondary}
                                style={{ height: 48, backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: textPrimary, marginBottom: 16 }}
                            />

                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>EMPLOYEE ID / BADGE NUMBER</Text>
                            <TextInput
                                value={employeeId}
                                onChangeText={setEmployeeId}
                                placeholder="EMP-2026-001"
                                placeholderTextColor={textSecondary}
                                style={{ height: 48, backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: textPrimary, marginBottom: 16 }}
                            />
                        </View>
                    )}

                    {/* STEP 2: TYPE */}
                    {currentStep === 2 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
                                Step 2: Administrator Type
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 20 }}>
                                Select the level of authority for this administrative user.
                            </Text>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setAdminType('standard')}
                                style={{
                                    padding: 16,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: '#FF6900',
                                    backgroundColor: isDark ? 'rgba(255, 105, 0, 0.08)' : '#FFF9F5',
                                    marginBottom: 16
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Briefcase size={20} color="#FF6900" />
                                        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>
                                            Standard Administrator
                                        </Text>
                                    </View>
                                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF6900', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                    </View>
                                </View>
                                <Text style={{ fontSize: 13, color: textSecondary, lineHeight: 18 }}>
                                    Governed by assigned Job Roles. Sees only authorized sections. Bound by institutional data scoping.
                                </Text>
                            </TouchableOpacity>

                            <View style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: cardBg, opacity: 0.7 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <Lock size={18} color={textSecondary} />
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>
                                        Main Administrator (Unique & Protected)
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 17 }}>
                                    Each institution possesses exactly one primary Main Administrator account with unrestricted access. Main Administrator status cannot be assigned through standard enrollment.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* STEP 3: ROLE(S) */}
                    {currentStep === 3 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
                                Step 3: Assign Job Role(s)
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 16 }}>
                                Select one or more roles that define what this administrator can do.
                            </Text>

                            {loadingRoles ? (
                                <ActivityIndicator size="small" color="#FF6900" style={{ marginVertical: 32 }} />
                            ) : roles.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center', backgroundColor: cardBg, borderRadius: 12 }}>
                                    <Text style={{ color: textSecondary, fontSize: 14 }}>No job roles created yet. You can create custom roles from Tab 1.</Text>
                                </View>
                            ) : (
                                roles.map(role => {
                                    const isSelected = selectedRoleIds.includes(role.id);
                                    return (
                                        <TouchableOpacity
                                            key={role.id}
                                            activeOpacity={0.7}
                                            onPress={() => toggleRole(role.id)}
                                            style={{
                                                padding: 16,
                                                borderRadius: 12,
                                                borderWidth: 1.5,
                                                borderColor: isSelected ? '#FF6900' : border,
                                                backgroundColor: isSelected ? (isDark ? 'rgba(255, 105, 0, 0.08)' : '#FFF9F5') : cardBg,
                                                marginBottom: 12
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: isSelected ? '#FF6900' : textPrimary }}>
                                                    {role.name}
                                                </Text>
                                                <View style={{
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: 6,
                                                    borderWidth: 1.5,
                                                    borderColor: isSelected ? '#FF6900' : textSecondary,
                                                    backgroundColor: isSelected ? '#FF6900' : 'transparent',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                                </View>
                                            </View>
                                            {role.description ? (
                                                <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 6 }}>
                                                    {role.description}
                                                </Text>
                                            ) : null}
                                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: isDark ? '#21262D' : '#E5E7EB' }}>
                                                    <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>
                                                        Scope: {role.data_scope || 'all'}
                                                    </Text>
                                                </View>
                                                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: isDark ? '#21262D' : '#E5E7EB' }}>
                                                    <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>
                                                        {Array.isArray(role.permissions) ? role.permissions.length : 0} permissions
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {/* STEP 4: ACCESS (DATA SCOPING) */}
                    {currentStep === 4 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
                                Step 4: Data Scoping
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 16 }}>
                                Choose which institution records this administrator can access.
                            </Text>

                            <TouchableOpacity
                                onPress={() => setScopeType('all')}
                                style={{
                                    padding: 16,
                                    borderRadius: 12,
                                    borderWidth: 1.5,
                                    borderColor: scopeType === 'all' ? '#FF6900' : border,
                                    backgroundColor: scopeType === 'all' ? (isDark ? 'rgba(255,105,0,0.08)' : '#FFF9F5') : cardBg,
                                    marginBottom: 12
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>All Institution Data</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Access records across all grades, classes, and departments.</Text>
                                    </View>
                                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: scopeType === 'all' ? '#FF6900' : textSecondary, alignItems: 'center', justifyContent: 'center' }}>
                                        {scopeType === 'all' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6900' }} />}
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setScopeType('levels')}
                                style={{
                                    padding: 16,
                                    borderRadius: 12,
                                    borderWidth: 1.5,
                                    borderColor: scopeType === 'levels' ? '#FF6900' : border,
                                    backgroundColor: scopeType === 'levels' ? (isDark ? 'rgba(255,105,0,0.08)' : '#FFF9F5') : cardBg,
                                    marginBottom: 12
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Specific Grade Levels</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Restrict access to specified grade cohorts (e.g. Grades 7-9).</Text>
                                    </View>
                                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: scopeType === 'levels' ? '#FF6900' : textSecondary, alignItems: 'center', justifyContent: 'center' }}>
                                        {scopeType === 'levels' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6900' }} />}
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {scopeType === 'levels' && (
                                <View style={{ padding: 14, borderRadius: 10, backgroundColor: cardBg, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 8 }}>SELECT GRADES:</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => {
                                            const isGSelected = selectedGrades.includes(g);
                                            return (
                                                <TouchableOpacity
                                                    key={g}
                                                    onPress={() => {
                                                        setSelectedGrades(prev =>
                                                            prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                                                        );
                                                    }}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        borderColor: isGSelected ? '#FF6900' : border,
                                                        backgroundColor: isGSelected ? '#FF6900' : (isDark ? '#21262D' : '#FFFFFF')
                                                    }}
                                                >
                                                    <Text style={{ color: isGSelected ? '#FFFFFF' : textPrimary, fontSize: 12, fontWeight: '600' }}>
                                                        {g}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* STEP 5: FEATURES & OVERRIDES */}
                    {currentStep === 5 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
                                Step 5: Feature Overrides (Optional)
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 16 }}>
                                Fine-tune access by explicitly granting or denying specific actions. Every override requires a documented reason.
                            </Text>

                            {overrides.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 8 }}>ACTIVE OVERRIDES:</Text>
                                    {overrides.map((ov, idx) => (
                                        <View key={idx} style={{ padding: 12, borderRadius: 8, backgroundColor: cardBg, borderWidth: 1, borderColor: border, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: ov.effect === 'allow' ? '#10B981' : '#EF4444' }}>
                                                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{ov.effect.toUpperCase()}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{ov.domain} : {ov.action}</Text>
                                                </View>
                                                <Text style={{ fontSize: 11, color: textSecondary }}>Reason: {ov.reason}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => handleRemoveOverride(idx)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                                                <X size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <View style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: cardBg }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginBottom: 12 }}>Add an Override</Text>

                                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 4 }}>AREA / DOMAIN</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                    {['academic', 'students', 'finance', 'attendance', 'reports', 'settings'].map(d => (
                                        <TouchableOpacity
                                            key={d}
                                            onPress={() => setOverrideDomain(d)}
                                            style={{
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 6,
                                                backgroundColor: overrideDomain === d ? '#FF6900' : (isDark ? '#21262D' : '#E5E7EB')
                                            }}
                                        >
                                            <Text style={{ color: overrideDomain === d ? '#FFFFFF' : textSecondary, fontSize: 11, fontWeight: '700' }}>{d}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 4 }}>ACTION</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                    {['view', 'create', 'edit', 'delete', 'download_report'].map(a => (
                                        <TouchableOpacity
                                            key={a}
                                            onPress={() => setOverrideAction(a)}
                                            style={{
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 6,
                                                backgroundColor: overrideAction === a ? '#FF6900' : (isDark ? '#21262D' : '#E5E7EB')
                                            }}
                                        >
                                            <Text style={{ color: overrideAction === a ? '#FFFFFF' : textSecondary, fontSize: 11, fontWeight: '700' }}>{a}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 4 }}>EFFECT</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                                    <TouchableOpacity
                                        onPress={() => setOverrideEffect('allow')}
                                        style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: overrideEffect === 'allow' ? '#10B981' : (isDark ? '#21262D' : '#E5E7EB'), alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Text style={{ color: overrideEffect === 'allow' ? '#FFFFFF' : textSecondary, fontWeight: '700', fontSize: 12 }}>Explicit Allow</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setOverrideEffect('deny')}
                                        style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: overrideEffect === 'deny' ? '#EF4444' : (isDark ? '#21262D' : '#E5E7EB'), alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Text style={{ color: overrideEffect === 'deny' ? '#FFFFFF' : textSecondary, fontWeight: '700', fontSize: 12 }}>Explicit Deny</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 4 }}>REASON / JUSTIFICATION *</Text>
                                <TextInput
                                    value={overrideReason}
                                    onChangeText={setOverrideReason}
                                    placeholder="e.g. Audit requirement per Board of Governors"
                                    placeholderTextColor={textSecondary}
                                    style={{ height: 44, backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: border, paddingHorizontal: 12, color: textPrimary, marginBottom: 12, fontSize: 12 }}
                                />

                                <TouchableOpacity
                                    onPress={handleAddOverride}
                                    style={{ height: 44, borderRadius: 8, backgroundColor: '#FF6900', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>+ Add Override</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* STEP 6: REVIEW */}
                    {currentStep === 6 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
                                Step 6: Review & Finalize
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 16 }}>
                                Verify what this administrator will see and access across the school platform.
                            </Text>

                            {/* Summary Sentence Box */}
                            <View style={{ padding: 16, borderRadius: 12, backgroundColor: isDark ? '#1C2128' : '#F0FDF4', borderWidth: 1, borderColor: isDark ? '#30363D' : '#BBF7D0', marginBottom: 16 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', textTransform: 'uppercase', marginBottom: 4 }}>
                                    Summary of Effective Access
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: textPrimary, lineHeight: 20 }}>
                                    {plainEnglishSummary}
                                </Text>
                            </View>

                            {/* Risk Warnings */}
                            {risks.length > 0 && (
                                <View style={{ padding: 14, borderRadius: 10, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <AlertTriangle size={16} color="#EF4444" />
                                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>SECURITY AUDIT NOTICES</Text>
                                    </View>
                                    {risks.map((r, i) => (
                                        <Text key={i} style={{ fontSize: 12, color: isDark ? '#FCA5A5' : '#991B1B', marginBottom: 4, lineHeight: 16 }}>
                                            • {r.message}
                                        </Text>
                                    ))}
                                </View>
                            )}

                            {/* Identity Summary Card */}
                            <View style={{ padding: 14, borderRadius: 10, backgroundColor: cardBg, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>ADMINISTRATOR DETAILS</Text>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{firstName} {lastName}</Text>
                                <Text style={{ fontSize: 13, color: textSecondary }}>{email}</Text>
                                {phone ? <Text style={{ fontSize: 12, color: textSecondary }}>{phone}</Text> : null}
                                {employeeId ? <Text style={{ fontSize: 12, color: textSecondary }}>ID: {employeeId}</Text> : null}
                            </View>

                            {/* Assigned Roles */}
                            <View style={{ padding: 14, borderRadius: 10, backgroundColor: cardBg, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>ASSIGNED ROLES</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {selectedRoles.map(r => (
                                        <View key={r.id} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FF6900' }}>
                                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{r.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Footer Controls */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
                    backgroundColor: bg,
                    borderTopWidth: 1,
                    borderTopColor: border,
                    flexDirection: 'row',
                    gap: 12
                }}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            onPress={() => setCurrentStep(prev => prev - 1)}
                            disabled={submitting}
                            style={{
                                flex: 1,
                                height: 48,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: border,
                                backgroundColor: cardBg,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 6
                            }}
                        >
                            <ChevronLeft size={18} color={textSecondary} />
                            <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '700' }}>Back</Text>
                        </TouchableOpacity>
                    )}

                    {currentStep < 6 ? (
                        <TouchableOpacity
                            onPress={() => setCurrentStep(prev => prev + 1)}
                            disabled={!canProceed}
                            style={{
                                flex: 2,
                                height: 48,
                                borderRadius: 10,
                                backgroundColor: canProceed ? '#FF6900' : (isDark ? '#21262D' : '#E5E7EB'),
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 6
                            }}
                        >
                            <Text style={{ color: canProceed ? '#FFFFFF' : textSecondary, fontSize: 14, fontWeight: '700' }}>
                                Continue
                            </Text>
                            <ChevronRight size={18} color={canProceed ? '#FFFFFF' : textSecondary} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleFinish}
                            disabled={submitting}
                            style={{
                                flex: 2,
                                height: 48,
                                borderRadius: 10,
                                backgroundColor: '#10B981',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 6
                            }}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                                        Complete Enrollment
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}
