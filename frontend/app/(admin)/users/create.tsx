import { DatePicker } from '@/components/common/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { api } from '@/services/api';
import { formatClassLabel } from '@/utils/classLabel';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform,
    ScrollView,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------- Types ----------
type Role = 'student' | 'teacher' | 'parent' | 'admin';
type Step = 0 | 1 | 2 | 3 | 4;

interface FormData {
    role: Role | null;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string;
    gender: string;
    date_of_birth: string;
    address: string;
    institution_id: string;
    grade_level: string;
    form_level: string;
    academic_year: string;
    parent_contact: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    class_id: string;
    class_ids: string[];
    class_category_id: string;
    class_level_id: string;
    class_stream_id: string;
    existing_parent_id: string;
    parent_relationship: string;
    department: string;
    qualification: string;
    specialization: string;
    position: string;
    subject_ids: string[];
    class_teacher_id: string;
    occupation: string;
    parent_address: string;
    linked_students: { student_id: string; relationship: string; name?: string }[];
    create_parent: boolean;
    parent_info: {
        first_name: string;
        last_name: string;
        full_name: string;
        email: string;
        phone: string;
        occupation: string;
        address: string;
    };
}

interface SelectOption {
    value: string;
    label: string;
}

interface ClassOptionLevel {
    value: number;
    label: string;
}

interface DomainCategoryOption {
    id: string;
    name: string;
}

interface DomainLevelOption {
    id: string;
    category_id: string;
    level_number: number;
    name?: string;
}

interface DomainStreamOption {
    id: string;
    level_id: string;
    code: string;
    name?: string;
}

const calculateAgeFromDob = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return age >= 0 ? age : null;
};

const initialFormData: FormData = {
    role: null, first_name: '', last_name: '', full_name: '', email: '', phone: '', gender: '',
    date_of_birth: '', address: '', institution_id: '',
    grade_level: '', form_level: '', academic_year: '',
    parent_contact: '', emergency_contact_name: '', emergency_contact_phone: '',
    class_id: '',
    class_ids: [],
    class_category_id: '',
    class_level_id: '',
    class_stream_id: '',
    existing_parent_id: '',
    parent_relationship: 'guardian',
    department: '', qualification: '', specialization: '', position: 'teacher',
    subject_ids: [], class_teacher_id: '',
    occupation: '', parent_address: '',
    linked_students: [],
    create_parent: false,
    parent_info: { first_name: '', last_name: '', full_name: '', email: '', phone: '', occupation: '', address: '' },
};

// ---------- Sanitizers ----------
const DANGEROUS_CHARS = /['"`;\\<>{}()\[\]|&$#%^*+=~]/g;
const sanitize = (v: string) => v.replace(DANGEROUS_CHARS, '');
const sanitizeEmail = (v: string) => v.replace(/[^a-zA-Z0-9@._+\-]/g, '');
const sanitizePhone = (v: string) => v.replace(/[^0-9+\-\s()]/g, '');

// ---------- Main Component ----------
export default function CreateUserScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { profile, session, isProfileLoading } = useAuth();

    const instClassTypeLabel =
        (profile as any)?.institutions?.school_categories?.class_type ||
        (profile as any)?.institutions?.categories?.[0]?.class_type ||
        (profile as any)?.institutions?.school_categories?.level_label ||
        'Grade';
    const isSecondary = instClassTypeLabel === 'Form';

    const [step, setStep] = useState<Step>(0);
    const [form, setForm] = useState<FormData>({ ...initialFormData });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [parents, setParents] = useState<any[]>([]);
    const [domainCategories, setDomainCategories] = useState<DomainCategoryOption[]>([]);
    const [domainLevels, setDomainLevels] = useState<DomainLevelOption[]>([]);
    const [domainStreams, setDomainStreams] = useState<DomainStreamOption[]>([]);
    const [levelOptions, setLevelOptions] = useState<SelectOption[]>([]);
    const [genderOptions, setGenderOptions] = useState<SelectOption[]>([]);
    const [positionOptions, setPositionOptions] = useState<SelectOption[]>([]);
    const [relationshipOptions, setRelationshipOptions] = useState<SelectOption[]>([]);
    const [academicYearOptions, setAcademicYearOptions] = useState<SelectOption[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [slotCapacity, setSlotCapacity] = useState<{
        plan: string;
        limits: { student: number | null; admin: number | null };
        usage: { student: number; admin: number };
        remaining: { student: number | null; admin: number | null };
        at_capacity: { student: boolean; admin: boolean };
    } | null>(null);
    const [slotCapacityStatus, setSlotCapacityStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    const computedAge = calculateAgeFromDob(form.date_of_birth);

    useEffect(() => {
        if (!session?.access_token || !profile?.institution_id || isProfileLoading) return;
        loadLookupData();
    }, [session?.access_token, profile?.institution_id, isProfileLoading]);

    useEffect(() => {
        if (!form.academic_year && academicYearOptions.length > 0) {
            updateForm('academic_year', academicYearOptions[0].value);
        }
    }, [academicYearOptions, form.academic_year]);

    const loadLookupData = async () => {
        if (!profile?.institution_id) return;
        setSlotCapacityStatus('loading');

        let subjectQuery = supabase.from('subjects').select('id, title, teacher_id');
        let studentQuery = supabase.from('students').select('id, user_id, grade_level, users!inner(first_name, last_name, full_name, institution_id), parent_students(relationship, parents(users(full_name)))') as any;
        let parentQuery = supabase.from('parents').select('id, user_id, users!inner(first_name, last_name, full_name, institution_id)') as any;

        if (profile?.institution_id) {
            subjectQuery = subjectQuery.eq('institution_id', profile.institution_id);
            studentQuery = studentQuery.eq('users.institution_id', profile.institution_id);
            parentQuery = parentQuery.eq('users.institution_id', profile.institution_id);
        }

        const [classRes, subjectRes, studentRes, parentRes, classOptionsRes, yearsRes, gendersRes, positionsRes, slotCapacityRes] = await Promise.all([
            supabase.from('classes')
                .select('id, grade_level, form_level, stream, display_name')
                .eq('institution_id', profile.institution_id)
                .order('grade_level', { ascending: true })
                .order('form_level', { ascending: true })
                .order('stream', { ascending: true }),
            subjectQuery,
            studentQuery,
            parentQuery,
            api.get('/classes/options').catch(() => null),
            supabase.from('academic_years').select('id, name').eq('institution_id', profile?.institution_id || '').order('start_date', { ascending: false }),
            supabase.from('users').select('gender').eq('institution_id', profile?.institution_id || '').not('gender', 'is', null),
            supabase.from('teachers').select('position').eq('institution_id', profile?.institution_id || '').not('position', 'is', null),
            api.get('/auth/enrollment-slot-capacity', { skipErrorToast: true, skipErrorLog: true }).catch(() => null)
        ]);
        if (classRes.data) {
            setClasses(
                classRes.data.map((cls: any) => ({
                    ...cls,
                    name: formatClassLabel(cls),
                }))
            );
        }
        if (subjectRes.data) setSubjects(subjectRes.data);
        if (studentRes.data) setStudents(studentRes.data);
        if (parentRes.data) setParents(parentRes.data);

        const classOptionsData = (classOptionsRes && 'data' in classOptionsRes) ? classOptionsRes.data : null;
        if (classOptionsData?.level_options?.length) {
            const mappedLevels: ClassOptionLevel[] = classOptionsData.level_options.map((opt: any) => ({
                value: Number(opt.value),
                label: String(opt.label),
                level_id: opt.level_id,
            })).filter((opt: ClassOptionLevel) => Number.isFinite(opt.value));

            setLevelOptions(mappedLevels.map((opt) => ({ value: String(opt.value), label: opt.label })));
        }

        if (classOptionsData?.categories) {
            setDomainCategories((classOptionsData.categories as any[]).map((c) => ({ id: c.id, name: String(c.name || '') })));
        }
        if (classOptionsData?.levels) {
            setDomainLevels((classOptionsData.levels as any[]).map((l) => ({
                id: l.id,
                category_id: l.category_id,
                level_number: Number(l.level_number),
                name: l.name || undefined,
            })));
        }
        if (classOptionsData?.streams) {
            setDomainStreams((classOptionsData.streams as any[]).map((s) => ({
                id: s.id,
                level_id: s.level_id,
                code: String(s.code || ''),
                name: s.name || undefined,
            })));
        }

        if (yearsRes.data) {
            const options = yearsRes.data
                .map((row: any) => ({ value: String(row.name || ''), label: String(row.name || '') }))
                .filter((row: SelectOption) => row.value);
            setAcademicYearOptions(options);
        }

        if (gendersRes.data) {
            const genderRows = gendersRes.data as any[];
            const genderSet = new Set<string>();
            for (const row of genderRows) {
                const value = String(row.gender || '').trim().toLowerCase();
                if (value) genderSet.add(value);
            }
            ['male', 'female', 'other'].forEach((value) => genderSet.add(value));
            setGenderOptions(Array.from(genderSet).map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })));
        }

        if (positionsRes.data) {
            const positionRows = positionsRes.data as any[];
            const positionSet = new Set<string>();
            for (const row of positionRows) {
                const value = String(row.position || '').trim();
                if (value) positionSet.add(value);
            }
            ['teacher', 'head_of_department', 'assistant', 'class_teacher', 'dean'].forEach((value) => positionSet.add(value));
            setPositionOptions(Array.from(positionSet).map((value) => ({ value, label: value.replace(/_/g, ' ') })));
        }

        if (studentRes.data) {
            const relationshipRows = (studentRes.data as any[])
                .flatMap((student) => Array.isArray(student.parent_students) ? student.parent_students : []);
            const relSet = new Set<string>();
            for (const row of relationshipRows) {
                const value = String(row.relationship || '').trim().toLowerCase();
                if (value) relSet.add(value);
            }
            ['father', 'mother', 'guardian', 'sibling', 'other'].forEach((value) => relSet.add(value));
            setRelationshipOptions(Array.from(relSet).map((value) => ({ value, label: value })));
        }

        const slotData = (slotCapacityRes && 'data' in slotCapacityRes) ? slotCapacityRes.data : null;
        if (slotData && slotData.limits && slotData.usage && slotData.remaining && slotData.at_capacity) {
            setSlotCapacity({
                plan: String(slotData.plan || ''),
                limits: {
                    student: slotData.limits.student === null ? null : Number(slotData.limits.student),
                    admin: slotData.limits.admin === null ? null : Number(slotData.limits.admin),
                },
                usage: {
                    student: Number(slotData.usage.student || 0),
                    admin: Number(slotData.usage.admin || 0),
                },
                remaining: {
                    student: slotData.remaining.student === null ? null : Number(slotData.remaining.student),
                    admin: slotData.remaining.admin === null ? null : Number(slotData.remaining.admin),
                },
                at_capacity: {
                    student: !!slotData.at_capacity.student,
                    admin: !!slotData.at_capacity.admin,
                },
            });
            setSlotCapacityStatus('ready');
        } else {
            setSlotCapacity(null);
            setSlotCapacityStatus('error');
        }
    };

    const updateForm = (key: keyof FormData, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    const updateFormSanitized = (key: keyof FormData, value: string, type: 'default' | 'email' | 'phone' = 'default') => {
        const clean = type === 'email' ? sanitizeEmail(value) : type === 'phone' ? sanitizePhone(value) : sanitize(value);
        setForm(prev => ({ ...prev, [key]: clean }));
    };

    const toggleArrayItem = (key: 'subject_ids', id: string) => {
        setForm(prev => {
            const arr = [...(prev[key] as string[])];
            const idx = arr.indexOf(id);
            if (idx === -1) arr.push(id); else arr.splice(idx, 1);
            return { ...prev, [key]: arr };
        });
    };

    const selectStudentClass = (id: string) => {
        setForm(prev => ({ ...prev, class_id: id, class_ids: id ? [id] : [] }));
    };

    // Filtered classes logic
    const getFilteredClasses = () => {
        if (form.class_stream_id) {
            return classes.filter((c) => c.stream_id === form.class_stream_id || c.id === form.class_id);
        }
        const levelStr = form.grade_level || form.form_level;
        if (!levelStr) return [];

        const numLevel = parseInt(levelStr.replace(/[^0-9]/g, ''), 10);
        return classes.filter(c => {
            const classLevel = isSecondary ? c.form_level : c.grade_level;
            return classLevel === numLevel;
        });
    };

    const levelsForSelectedCategory = domainLevels.filter((level) => level.category_id === form.class_category_id);
    const streamsForSelectedLevel = domainStreams.filter((stream) => stream.level_id === form.class_level_id);
    const classesForSelectedStream = classes.filter((cls) => cls.stream_id === form.class_stream_id);
    const availableParents = parents.filter((p: any) => {
        const u = p.users as any;
        if (!u) return false;
        return !!(u.full_name || u.first_name || u.last_name);
    });

    const fallbackLevelOptions = React.useMemo(() => {
        const values = new Set<number>();
        classes.forEach((c) => {
            const raw = isSecondary ? c.form_level : c.grade_level;
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) values.add(parsed);
        });

        return Array.from(values)
            .sort((a, b) => a - b)
            .map((v) => ({ value: String(v), label: `${instClassTypeLabel} ${v}` }));
    }, [classes, isSecondary, instClassTypeLabel]);

    const resolvedLevelOptions = levelOptions.length > 0 ? levelOptions : fallbackLevelOptions;
    const resolvedAcademicYearOptions = academicYearOptions.length > 0
        ? academicYearOptions
        : [{ value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() }];
    const resolvedGenderOptions = genderOptions.length > 0
        ? genderOptions
        : [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
        ];
    const resolvedPositionOptions = positionOptions.length > 0
        ? positionOptions
        : [
            { value: 'teacher', label: 'teacher' },
            { value: 'head_of_department', label: 'head of department' },
            { value: 'assistant', label: 'assistant' },
            { value: 'class_teacher', label: 'class teacher' },
            { value: 'dean', label: 'dean' },
        ];
    const resolvedRelationshipOptions = relationshipOptions.length > 0
        ? relationshipOptions
        : [
            { value: 'father', label: 'father' },
            { value: 'mother', label: 'mother' },
            { value: 'guardian', label: 'guardian' },
            { value: 'sibling', label: 'sibling' },
            { value: 'other', label: 'other' },
        ];

    // Reset class when level changes
    useEffect(() => {
        if (form.role === 'student') {
            setForm(prev => ({
                ...prev,
                class_id: '',
                class_ids: [],
                class_stream_id: '',
                class_level_id: '',
                class_category_id: '',
            }));
        }
    }, [form.grade_level, form.form_level]);

    useEffect(() => {
        if (!form.class_category_id) return;
        if (form.class_level_id) {
            const stillValid = domainLevels.some((l) => l.id === form.class_level_id && l.category_id === form.class_category_id);
            if (!stillValid) {
                setForm((prev) => ({ ...prev, class_level_id: '', class_stream_id: '', class_id: '', class_ids: [] }));
            }
        }
    }, [form.class_category_id, form.class_level_id, domainLevels]);

    useEffect(() => {
        if (!form.class_level_id) return;
        if (form.class_stream_id) {
            const stillValid = domainStreams.some((s) => s.id === form.class_stream_id && s.level_id === form.class_level_id);
            if (!stillValid) {
                setForm((prev) => ({ ...prev, class_stream_id: '', class_id: '', class_ids: [] }));
            }
        }
    }, [form.class_level_id, form.class_stream_id, domainStreams]);

    const addLinkedStudent = (studentId: string, studentName: string) => {
        if (form.linked_students.some(ls => ls.student_id === studentId)) return;
        setForm(prev => ({ ...prev, linked_students: [...prev.linked_students, { student_id: studentId, relationship: 'guardian', name: studentName }] }));
    };
    const removeLinkedStudent = (studentId: string) => setForm(prev => prev.linked_students ? ({ ...prev, linked_students: prev.linked_students.filter(ls => ls.student_id !== studentId) }) : prev);
    const updateLinkedRelationship = (studentId: string, relationship: string) =>
        setForm(prev => ({ ...prev, linked_students: prev.linked_students.map(ls => ls.student_id === studentId ? { ...ls, relationship } : ls) }));

    const handleSubmit = async () => {
        const isParentRole = form.role === 'parent';
        if (!form.first_name.trim() || !form.last_name.trim() || (isParentRole && !form.email.trim())) {
            Alert.alert('Validation', `First name, last name ${isParentRole ? 'and email ' : ''}are required`);
            return;
        }
        try {
            setLoading(true);
            // Map the selected level string (e.g. "Grade 1") to numeric fields for the backend
            const levelStr = form.grade_level || form.form_level;
            const numLevel = levelStr ? parseInt(levelStr.replace(/[^0-9]/g, ''), 10) : null;
            
            const payload: any = {
                ...form,
                institution_id: profile?.institution_id || form.institution_id,
                grade_level: !isSecondary ? numLevel : null,
                form_level: isSecondary ? numLevel : null,
                class_ids: form.class_id ? [form.class_id] : [],
                parent_info: form.create_parent ? form.parent_info : undefined 
            };

            if (!form.create_parent) {
                delete payload.parent_info;
            }

            if (form.role === 'student') {
                if (form.existing_parent_id) {
                    payload.linked_parents = [form.existing_parent_id];
                }

                if (form.parent_relationship && form.create_parent) {
                    payload.parent_info = {
                        ...payload.parent_info,
                        relationship: form.parent_relationship,
                    };
                }
            }
            const response = await api.post('/auth/enroll-user', payload);
            setResult(response.data);
            setStep(4);
        } catch (err: any) {
            const errorData = err.response?.data;
            if (errorData?.code === 'ADMIN_LIMIT_REACHED') {
                Alert.alert(
                    'Limit Reached',
                    errorData.error,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Upgrade Plan', onPress: () => router.push('/(admin)/finance') }
                    ]
                );
            } else if (errorData?.code === 'STUDENT_LIMIT_REACHED') {
                Alert.alert(
                    'Limit Reached',
                    errorData.error,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Upgrade Plan', onPress: () => router.push('/(admin)/finance') }
                    ]
                );
            } else {
                Alert.alert('Error', err.message || 'Failed to enroll user');
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (Platform.OS === 'web' && navigator?.clipboard) await navigator.clipboard.writeText(text);
            Alert.alert('Copied', 'Credentials copied to clipboard');
        } catch { Alert.alert('Copy', `Password: ${text}`); }
    };

    const canGoNext = (): boolean => {
        if (step === 0) return !!form.role;
        if (step === 1) {
            const isParentRole = form.role === 'parent';
            return !!form.first_name.trim() && !!form.last_name.trim() && (isParentRole ? !!form.email.trim() : true);
        }
        if (step === 2) {
            if (form.role === 'student') {
                const hasCoreStudentFields = !!form.class_category_id && !!form.class_level_id && !!form.class_stream_id && !!form.class_id && !!form.academic_year;
                const hasParentFields = !!form.parent_relationship && (
                    !!form.existing_parent_id || form.create_parent
                );
                const hasCreatedParentFields = !form.create_parent || (
                    !!form.parent_info.first_name.trim()
                    && !!form.parent_info.last_name.trim()
                    && !!form.parent_info.email.trim()
                );
                return hasCoreStudentFields && hasParentFields && hasCreatedParentFields;
            }
        }
        return true;
    };
    const nextStep = () => { if (step === 3) { handleSubmit(); return; } if (canGoNext()) setStep((step + 1) as Step); };
    const prevStep = () => { if (step > 0) setStep((step - 1) as Step); else router.back(); };

    // ---------- Theme shorthands ----------
    const bg = isDark ? '#161B22' : '#f9fafb';
    const card = isDark ? '#161B22' : '#ffffff';
    const border = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const inputBg = isDark ? '#0F172A' : '#FFFFFF';
    const inputBorder = isDark ? '#334155' : '#CBD5E1';

    // ---------- Options ----------
    const ROLE_CARDS = [
        { role: 'student' as Role, icon: 'school-outline', label: 'Student', desc: 'Enroll a new student', color: '#10B981' },
        { role: 'teacher' as Role, icon: 'people-outline', label: 'Teacher', desc: 'Add a new teacher', color: '#3B82F6' },
        { role: 'parent' as Role, icon: 'heart-outline', label: 'Parent/Guardian', desc: 'Register a parent/guardian', color: '#F59E0B' },
        { role: 'admin' as Role, icon: 'shield-outline', label: 'Admin', desc: 'Create an admin account', color: '#EF4444' },
    ];
    // ---------- Sub-renders ----------
    const renderStepIndicator = () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }}>
            {['Role', 'Personal', form.role === 'admin' ? '' : 'Details', 'Review', 'Done'].filter(Boolean).map((label, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= step ? '#FF6B00' : (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb') }}>
                        {i < step
                            ? <Ionicons name="checkmark" size={16} color="white" />
                            : <Text style={{ fontSize: 12, fontWeight: '700', color: i <= step ? 'white' : textSecondary }}>{i + 1}</Text>
                        }
                    </View>
                    {i < 4 && <View style={{ width: 32, height: 2, backgroundColor: i < step ? '#FF6B00' : (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb') }} />}
                </View>
            ))}
        </View>
    );

    const getRoleCapacityState = (role: Role) => {
        if (role !== 'student' && role !== 'admin') {
            return { isAtCapacity: false, unavailable: false, checking: false, limit: null as number | null, current: 0, remaining: null as number | null };
        }

        if (slotCapacityStatus === 'loading') {
            return { isAtCapacity: false, unavailable: false, checking: true, limit: null as number | null, current: 0, remaining: null as number | null };
        }

        if (slotCapacity) {
            return {
                isAtCapacity: role === 'student' ? slotCapacity.at_capacity.student : slotCapacity.at_capacity.admin,
                unavailable: false,
                checking: false,
                limit: role === 'student' ? slotCapacity.limits.student : slotCapacity.limits.admin,
                current: role === 'student' ? slotCapacity.usage.student : slotCapacity.usage.admin,
                remaining: role === 'student' ? slotCapacity.remaining.student : slotCapacity.remaining.admin,
            };
        }

        return { isAtCapacity: true, unavailable: true, checking: false, limit: null as number | null, current: 0, remaining: null as number | null };
    };

    const getRemainingSlotsText = (role: Role) => {
        if (role === 'student' || role === 'admin') {
            if (slotCapacityStatus === 'loading') return 'Checking capacity...';
            if (!slotCapacity) return 'Capacity unavailable';
            const limit = role === 'student' ? slotCapacity.limits.student : slotCapacity.limits.admin;
            const remaining = role === 'student' ? slotCapacity.remaining.student : slotCapacity.remaining.admin;
            if (limit === null) return 'Unlimited slots';
            return `${Math.max(0, Number(remaining ?? 0))} of ${limit} slots remaining`;
        }
        return 'Unlimited slots';
    };

    const renderRoleSelection = () => (
        <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Select Role</Text>
            <Text style={{ color: textSecondary, marginBottom: 24 }}>Choose the type of user you want to enroll</Text>
            {ROLE_CARDS.map(roleCard => {
                const capacity = getRoleCapacityState(roleCard.role);
                return (
                <TouchableOpacity key={roleCard.role} onPress={() => {
                    if (capacity.checking) {
                        Alert.alert('Checking Capacity', 'Please wait while slot capacity is being verified.');
                        return;
                    }
                    if (capacity.unavailable) {
                        Alert.alert(
                            'Capacity Unavailable',
                            'Unable to verify role capacity right now. Please refresh and try again.'
                        );
                        return;
                    }
                    if (capacity.isAtCapacity) {
                        Alert.alert(
                            'Limit Reached',
                            `${roleCard.label} slots are currently full. Please upgrade your plan to add more ${roleCard.label.toLowerCase()} accounts.`
                        );
                        return;
                    }
                    updateForm('role', roleCard.role);
                }} disabled={capacity.isAtCapacity || capacity.checking} activeOpacity={0.7}
                    style={{ padding: 20, borderRadius: 16, borderWidth: 2, flexDirection: 'row', alignItems: 'center', marginBottom: 12, opacity: capacity.isAtCapacity ? 0.55 : 1, backgroundColor: form.role === roleCard.role ? (isDark ? '#2a1a0a' : '#fff7ed') : card, borderColor: form.role === roleCard.role ? '#FF6B00' : border }}>
                    <View style={{ width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: roleCard.color + '20' }}>
                        <Ionicons name={roleCard.icon as any} size={28} color={roleCard.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: textPrimary }}>{roleCard.label}</Text>
                        <Text style={{ fontSize: 13, color: textSecondary }}>{roleCard.desc}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6B00', marginTop: 4 }}>
                            {getRemainingSlotsText(roleCard.role)}
                        </Text>
                        {capacity.unavailable && (
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444', marginTop: 4 }}>
                                Capacity unavailable
                            </Text>
                        )}
                        {capacity.isAtCapacity && !capacity.unavailable && !capacity.checking && (
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444', marginTop: 4 }}>
                                Full - upgrade plan
                            </Text>
                        )}
                    </View>
                    {form.role === roleCard.role && !capacity.isAtCapacity && (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            )})}
        </View>
    );

    const renderPersonalInfo = () => (
        <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Personal Information</Text>
            <Text style={{ color: textSecondary, marginBottom: 24 }}>Enter the user&apos;s basic details</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <RenderInput label="First Name *" value={form.first_name} onChangeText={(v: string) => updateFormSanitized('first_name', v)} placeholder="John" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                </View>
                <View style={{ flex: 1 }}>
                    <RenderInput label="Last Name *" value={form.last_name} onChangeText={(v: string) => updateFormSanitized('last_name', v)} placeholder="Doe" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                </View>
            </View>
            <RenderInput 
                label={`Email ${form.role === 'parent' ? '*' : '(Optional)'}`} 
                value={form.email} 
                onChangeText={(v: string) => updateFormSanitized('email', v, 'email')} 
                placeholder={form.role === 'parent' ? "parent_guardian@example.com" : "Auto-generated if left blank"} 
                keyboardType="email-address" 
                isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} 
            />
            {form.role !== 'parent' && !form.email.trim() && (
                <View style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, color: textSecondary }}>
                        Leaving this blank will automatically create an email: <Text style={{ fontWeight: 'bold' }}>first.last@institution.com</Text>
                    </Text>
                </View>
            )}
            {form.role !== 'student' && (
                <RenderInput label="Phone" value={form.phone} onChangeText={(v: string) => updateFormSanitized('phone', v, 'phone')} placeholder="+254 7XX XXX XXX" keyboardType="phone-pad" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
            )}
            <RenderPicker label="Gender" options={resolvedGenderOptions} selected={form.gender} onSelect={(v: string) => updateForm('gender', v)} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} border={border} card={card} />
            <DatePicker label="Date of Birth" value={form.date_of_birth} onChange={(v: string) => updateForm('date_of_birth', v)} isDark={isDark} />
            <View style={{ marginTop: -10, marginBottom: 16 }}>
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                    Age: <Text style={{ color: textPrimary, fontWeight: '700' }}>{computedAge !== null ? `${computedAge} years` : 'Set date of birth to calculate'}</Text>
                </Text>
            </View>
            <RenderInput label="Address" value={form.address} onChangeText={(v: string) => updateFormSanitized('address', v)} placeholder="Enter physical address" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
        </View>
    );

    const renderStudentDetails = () => (
        <View>
            <RenderPicker
                label="Class Category *"
                options={domainCategories.map((c) => ({ value: c.id, label: c.name }))}
                selected={form.class_category_id}
                onSelect={(v: string) => updateForm('class_category_id', v)}
                isDark={isDark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                border={border}
                card={card}
            />
            <RenderPicker
                label={`${instClassTypeLabel} Level *`}
                options={levelsForSelectedCategory.map((level) => ({
                    value: level.id,
                    label: level.name || `${instClassTypeLabel} ${level.level_number}`,
                }))}
                selected={form.class_level_id}
                onSelect={(v: string) => {
                    const selectedLevel = levelsForSelectedCategory.find((l) => l.id === v);
                    if (!selectedLevel) return;
                    updateForm('class_level_id', v);
                    const levelNumber = String(selectedLevel.level_number);
                    updateForm('grade_level', levelNumber);
                    updateForm('form_level', isSecondary ? levelNumber : '');
                    updateForm('class_stream_id', '');
                    updateForm('class_id', '');
                    updateForm('class_ids', []);
                }}
                isDark={isDark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                border={border}
                card={card}
            />
            <RenderPicker
                label="Class Stream *"
                options={streamsForSelectedLevel.map((stream) => ({ value: stream.id, label: stream.name || stream.code }))}
                selected={form.class_stream_id}
                onSelect={(v: string) => {
                    updateForm('class_stream_id', v);
                    const candidates = classes.filter((cls) => cls.stream_id === v);
                    if (candidates.length === 1) {
                        selectStudentClass(candidates[0].id);
                    } else {
                        updateForm('class_id', '');
                        updateForm('class_ids', []);
                    }
                }}
                isDark={isDark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                border={border}
                card={card}
            />
            <RenderPicker label="Academic Year *" options={resolvedAcademicYearOptions} selected={form.academic_year} onSelect={(v: string) => updateForm('academic_year', v)} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} border={border} card={card} />
            <RenderInput label="Parent/Guardian Contact" value={form.parent_contact} onChangeText={(v: string) => updateFormSanitized('parent_contact', v, 'phone')} placeholder="Phone number" keyboardType="phone-pad" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />

            <RenderPicker
                label="Parent Relationship *"
                options={resolvedRelationshipOptions}
                selected={form.parent_relationship}
                onSelect={(v: string) => updateForm('parent_relationship', v)}
                isDark={isDark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                border={border}
                card={card}
            />

            <View style={{ backgroundColor: isDark ? '#1c1008' : '#fff7ed', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#fed7aa' : '#7c2d12', marginBottom: 12 }}>Emergency Contact</Text>
                <RenderInput label="Name" value={form.emergency_contact_name} onChangeText={(v: string) => updateFormSanitized('emergency_contact_name', v)} placeholder="Emergency contact name" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                <RenderInput label="Phone" value={form.emergency_contact_phone} onChangeText={(v: string) => updateFormSanitized('emergency_contact_phone', v, 'phone')} placeholder="Emergency phone" keyboardType="phone-pad" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
            </View>

            {/* Class Assignment Section */}
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assign to Class (Stream) *</Text>
                
                {!(form.grade_level || form.form_level) ? (
                    <View style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: border }}>
                        <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center' }}>Please select a {instClassTypeLabel} level first</Text>
                    </View>
                ) : getFilteredClasses().length === 0 ? (
                    <View style={{ backgroundColor: isDark ? '#450a0a' : '#fef2f2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#991b1b' : '#fecaca' }}>
                        <Ionicons name="alert-circle" size={20} color={isDark ? '#f87171' : '#dc2626'} style={{ marginBottom: 8 }} />
                        <Text style={{ color: isDark ? '#fecaca' : '#991b1b', fontSize: 13, fontWeight: '600' }}>No streams found for {form.grade_level || form.form_level}</Text>
                        <TouchableOpacity 
                            onPress={() => router.push('/(admin)/classes')}
                            style={{ marginTop: 12, backgroundColor: isDark ? '#991b1b' : '#dc2626', padding: 10, borderRadius: 8, alignSelf: 'flex-start' }}
                        >
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Manage Streams</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ gap: 8 }}>
                        {getFilteredClasses().map(c => (
                            <TouchableOpacity 
                                key={c.id} 
                                onPress={() => selectStudentClass(c.id)}
                                activeOpacity={0.7}
                                style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    padding: 16, 
                                    borderRadius: 12, 
                                    borderWidth: 1.5, 
                                    backgroundColor: form.class_id === c.id ? (isDark ? '#1e3a8a' : '#eff6ff') : card,
                                    borderColor: form.class_id === c.id ? '#3b82f6' : border
                                }}
                            >
                                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: form.class_id === c.id ? '#3b82f6' : border, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    {form.class_id === c.id && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6' }} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 15 }}>{c.name}</Text>
                                     <Text style={{ color: textSecondary, fontSize: 12 }}>Class stream</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View style={{ backgroundColor: isDark ? '#0f172a' : '#eff6ff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#1e3a5f' : '#bfdbfe' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#93c5fd' : '#1e3a8a', marginBottom: 8 }}>Link Existing Parent/Guardian</Text>
                <RenderPicker
                    label="Choose Existing Parent"
                    options={availableParents.map((p: any) => ({
                        value: p.id,
                        label: (() => {
                            const u = p.users as any;
                            return u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || p.id;
                        })(),
                    }))}
                    selected={form.existing_parent_id}
                    onSelect={(v: string) => {
                        updateForm('existing_parent_id', v);
                        if (v) {
                            updateForm('create_parent', false);
                        }
                    }}
                    isDark={isDark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                    card={card}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontWeight: '700', fontSize: 15, color: isDark ? '#93c5fd' : '#1e3a8a' }}>Create Parent/Guardian Account</Text>
                        <Text style={{ fontSize: 12, color: isDark ? '#60a5fa' : '#3b82f6' }}>Simultaneously register and link a guardian</Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                        const nextValue = !form.create_parent;
                        updateForm('create_parent', nextValue);
                        if (nextValue) {
                            updateForm('existing_parent_id', '');
                        }
                    }}
                        style={{ width: 48, height: 24, borderRadius: 12, paddingHorizontal: 4, justifyContent: 'center', alignItems: form.create_parent ? 'flex-end' : 'flex-start', backgroundColor: form.create_parent ? '#3b82f6' : (isDark ? '#374151' : '#d1d5db') }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white' }} />
                    </TouchableOpacity>
                </View>
                {form.create_parent && (
                    <View>
                        {[
                            { label: 'Parent/Guardian First Name *', key: 'first_name', placeholder: "First name", type: 'default' },
                            { label: 'Parent/Guardian Last Name *', key: 'last_name', placeholder: "Last name", type: 'default' },
                            { label: 'Parent/Guardian Email *', key: 'email', placeholder: 'parent_guardian@example.com', type: 'email' },
                            { label: 'Parent/Guardian Phone', key: 'phone', placeholder: '+254...', type: 'phone' },
                            { label: 'Parent/Guardian Occupation', key: 'occupation', placeholder: 'e.g. Doctor', type: 'default' },
                        ].map(f => (
                            <View key={f.key} style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#93c5fd' : '#1e40af', marginBottom: 6 }}>{f.label}</Text>
                                <TextInput
                                    style={{ backgroundColor: isDark ? '#1e2d3d' : 'white', borderWidth: 1, borderColor: isDark ? '#1e3a5f' : '#bfdbfe', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: textPrimary }}
                                    placeholder={f.placeholder}
                                    placeholderTextColor={textSecondary}
                                    keyboardType={f.type === 'email' ? 'email-address' : f.type === 'phone' ? 'phone-pad' : 'default'}
                                    value={(form.parent_info as any)[f.key]}
                                    onChangeText={v => {
                                        const clean = f.type === 'email' ? sanitizeEmail(v) : f.type === 'phone' ? sanitizePhone(v) : sanitize(v);
                                        setForm(prev => ({ ...prev, parent_info: { ...prev.parent_info, [f.key]: clean } }));
                                    }}
                                />
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );

    const renderTeacherDetails = () => {
        const unassignedSubjects = subjects.filter(s => !s.teacher_id);
        return (
            <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary, marginBottom: 16 }}> Teacher Details</Text>
                <RenderInput label="Department" value={form.department} onChangeText={(v: string) => updateFormSanitized('department', v)} placeholder="e.g. Mathematics" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                <RenderInput label="Qualification" value={form.qualification} onChangeText={(v: string) => updateFormSanitized('qualification', v)} placeholder="e.g. B.Ed Mathematics" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                <RenderInput label="Specialization" value={form.specialization} onChangeText={(v: string) => updateFormSanitized('specialization', v)} placeholder="e.g. Applied Mathematics" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                <RenderPicker label="Position" options={resolvedPositionOptions} selected={form.position} onSelect={(v: string) => updateForm('position', v)} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} border={border} card={card} />
                <RenderMultiSelect label="Assign Subjects (unassigned only)" items={unassignedSubjects} selectedIds={form.subject_ids} toggleItem={(id: string) => toggleArrayItem('subject_ids', id)} displayFn={(s: any) => s.title} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} border={border} card={card} />
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Assign as Class Teacher</Text>
                    {classes.map(c => (
                        <TouchableOpacity key={c.id} onPress={() => updateForm('class_teacher_id', form.class_teacher_id === c.id ? '' : c.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, backgroundColor: form.class_teacher_id === c.id ? '#FF6B00' : card, borderColor: form.class_teacher_id === c.id ? '#FF6B00' : border }}>
                            <Ionicons name={form.class_teacher_id === c.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={form.class_teacher_id === c.id ? 'white' : textSecondary} />
                            <Text style={{ marginLeft: 12, fontWeight: '500', color: form.class_teacher_id === c.id ? 'white' : textPrimary }}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderParentDetails = () => {
        const filteredStudents = students.filter(s => {
            const u = s.users as any;
            const name = u?.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u?.full_name || '');
            return name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id?.toLowerCase().includes(studentSearch.toLowerCase());
        });
        return (
            <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary, marginBottom: 16 }}> Parent/Guardian Details</Text>
                <RenderInput label="Occupation" value={form.occupation} onChangeText={(v: string) => updateFormSanitized('occupation', v)} placeholder="e.g. Engineer" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                <RenderInput label="Home Address" value={form.parent_address} onChangeText={(v: string) => updateFormSanitized('parent_address', v)} placeholder="Physical address" isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} inputBg={inputBg} inputBorder={inputBorder} />
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 8 }}>Link to Student(s)</Text>
                    <TextInput
                        style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: textPrimary, marginBottom: 8 }}
                        placeholder="Search student by name or ID..."
                        value={studentSearch}
                        onChangeText={v => setStudentSearch(sanitize(v))}
                        placeholderTextColor={textSecondary}
                    />
                    {studentSearch.length > 0 && (
                        <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 12, maxHeight: 160, overflow: 'hidden', marginBottom: 12 }}>
                            <ScrollView nestedScrollEnabled>
                                {filteredStudents.slice(0, 10).map(s => {
                                    const parentInfo = s.parent_students?.[0]?.parents?.users;
                                    const parentName = parentInfo ? (`${parentInfo.first_name || ''} ${parentInfo.last_name || ''}`.trim() || parentInfo.full_name) : null;
                                    return (
                                        <TouchableOpacity 
                                            key={s.id} 
                                            onPress={() => { addLinkedStudent(s.id, (s.users as any)?.full_name || s.id); setStudentSearch(''); }}
                                            disabled={!!parentName}
                                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border, opacity: parentName ? 0.5 : 1 }}>
                                            <Ionicons name="person-outline" size={18} color={textSecondary} />
                                            <Text style={{ marginLeft: 8, color: textPrimary, fontWeight: '500', flex: 1 }}>
                                                {(() => {
                                                    const u = s.users as any;
                                                    return u?.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u?.full_name || 'Unknown');
                                                })()}
                                                {parentName ? ` (Linked to: ${parentName})` : ''}
                                            </Text>
                                            <Text style={{ color: textSecondary, fontSize: 11, marginLeft: 4 }}>{s.id}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}
                    {form.linked_students.map(ls => (
                        <View key={ls.student_id} style={{ backgroundColor: isDark ? '#161B22' : '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="person" size={16} color="#FF6B00" />
                                    <Text style={{ marginLeft: 8, fontWeight: '600', color: textPrimary }}>{ls.name}</Text>
                                    <Text style={{ color: textSecondary, fontSize: 11, marginLeft: 6 }}>{ls.student_id}</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeLinkedStudent(ls.student_id)}>
                                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {resolvedRelationshipOptions.map(rel => (
                                    <TouchableOpacity key={rel.value} onPress={() => updateLinkedRelationship(ls.student_id, rel.value)}
                                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: ls.relationship === rel.value ? '#FF6B00' : card, borderColor: ls.relationship === rel.value ? '#FF6B00' : border }}>
                                        <Text style={{ fontSize: 12, fontWeight: '500', textTransform: 'capitalize', color: ls.relationship === rel.value ? 'white' : textPrimary }}>{rel.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderRoleDetails = () => (
        <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Role-Specific Details</Text>
            <Text style={{ color: textSecondary, marginBottom: 24 }}>Enter details relevant to the {form.role} role</Text>
            {form.role === 'student' && renderStudentDetails()}
            {form.role === 'teacher' && renderTeacherDetails()}
            {form.role === 'parent' && renderParentDetails()}
            {form.role === 'admin' && (
                <View style={{ backgroundColor: isDark ? '#161B22' : '#f9fafb', borderRadius: 12, padding: 24, alignItems: 'center' }}>
                    <Ionicons name="shield-checkmark" size={48} color={textSecondary} />
                    <Text style={{ color: textSecondary, marginTop: 12, textAlign: 'center' }}>No additional details needed for admin accounts</Text>
                </View>
            )}
        </View>
    );

    const renderReviewRow = (label: string, value: string | undefined) => {
        if (!value) return null;
        return (
            <View style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border }}>
                <Text style={{ width: '40%', color: textSecondary, fontSize: 13 }}>{label}</Text>
                <Text style={{ flex: 1, color: textPrimary, fontWeight: '500', fontSize: 13, textAlign: 'right' }}>{value}</Text>
            </View>
        );
    };

    const renderReview = () => (
        <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Review & Confirm</Text>
            <Text style={{ color: textSecondary, marginBottom: 24 }}>Verify the details before enrolling</Text>
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Personal</Text>
                {renderReviewRow('Role', form.role || '')}
                {renderReviewRow('First Name', form.first_name)}
                {renderReviewRow('Last Name', form.last_name)}
                {renderReviewRow('Email', form.email)}
                {renderReviewRow('Phone', form.phone)}
                {renderReviewRow('Gender', form.gender)}
                {renderReviewRow('Date of Birth', form.date_of_birth)}
                {renderReviewRow('Age', computedAge !== null ? `${computedAge} years` : '')}
                {renderReviewRow('Address', form.address)}
            </View>
            {form.role === 'student' && (
                <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Student Details</Text>
                    {renderReviewRow(instClassTypeLabel, form.grade_level)}
                    {renderReviewRow('Academic Year', form.academic_year)}
                    {renderReviewRow('Parent Contact', form.parent_contact)}
                    {renderReviewRow('Parent Relationship', form.parent_relationship)}
                    {renderReviewRow('Emergency Contact', form.emergency_contact_name)}
                    {renderReviewRow('Emergency Phone', form.emergency_contact_phone)}
                    {renderReviewRow('Class', form.class_id ? (classes.find(c => c.id === form.class_id)?.name || form.class_id) : undefined)}
                    {renderReviewRow('Linked Existing Parent', form.existing_parent_id ? (() => {
                        const p = parents.find((item: any) => item.id === form.existing_parent_id);
                        const u = p?.users as any;
                        return u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || form.existing_parent_id;
                    })() : undefined)}
                </View>
            )}
            {form.role === 'student' && form.create_parent && (
                <View style={{ backgroundColor: isDark ? '#0f172a' : '#eff6ff', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1e3a5f' : '#bfdbfe', padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Parent/Guardian to be Created</Text>
                    {renderReviewRow('Parent/Guardian First Name', form.parent_info.first_name)}
                    {renderReviewRow('Parent/Guardian Last Name', form.parent_info.last_name)}
                    {renderReviewRow('Parent/Guardian Email', form.parent_info.email)}
                    {renderReviewRow('Parent/Guardian Phone', form.parent_info.phone)}
                    {renderReviewRow('Occupation', form.parent_info.occupation)}
                </View>
            )}
            {form.role === 'teacher' && (
                <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Teacher Details</Text>
                    {renderReviewRow('Department', form.department)}
                    {renderReviewRow('Qualification', form.qualification)}
                    {renderReviewRow('Specialization', form.specialization)}
                    {renderReviewRow('Position', form.position?.replace(/_/g, ' '))}
                    {renderReviewRow('Subjects', form.subject_ids.length > 0 ? form.subject_ids.map(id => subjects.find(s => s.id === id)?.title || id).join(', ') : undefined)}
                    {renderReviewRow('Class Teacher', form.class_teacher_id ? classes.find(c => c.id === form.class_teacher_id)?.name : undefined)}
                </View>
            )}
            {form.role === 'parent' && (
                <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Parent/Guardian Details</Text>
                    {renderReviewRow('Occupation', form.occupation)}
                    {renderReviewRow('Address', form.parent_address)}
                    {form.linked_students.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Linked Students:</Text>
                            {form.linked_students.map(ls => (
                                <Text key={ls.student_id} style={{ fontSize: 13, color: textPrimary }}>{"\u2022 "} {ls.name} ({ls.relationship})</Text>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    const renderSuccess = () => (
        <View style={{ padding: 24, alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? '#052e16' : '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 8 }}>User Enrolled!</Text>
            <Text style={{ color: textSecondary, textAlign: 'center', marginBottom: 32 }}>The user has been successfully created</Text>
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 20, width: '100%', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isDark ? '#431407' : '#fff7ed', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        <Ionicons name="school" size={12} color="#FF6B00" />
                    </View>
                    <Text style={{ fontWeight: '700', color: textPrimary }}>{form.role?.toUpperCase()} CREDENTIALS</Text>
                </View>
                {[{ label: 'ID', value: result?.customId || 'N/A' }, { label: 'Email', value: result?.email }].map(row => (
                    <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }}>
                        <Text style={{ color: textSecondary }}>{row.label}</Text>
                        <Text style={{ fontWeight: '700', color: textPrimary }}>{row.value}</Text>
                    </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={{ color: textSecondary }}>Temp Password</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: 17, color: '#FF6B00', marginRight: 8 }}>{result?.tempPassword}</Text>
                        <TouchableOpacity onPress={() => copyToClipboard(result?.tempPassword || '')}>
                            <Ionicons name="copy-outline" size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
                {!!result?.credential_delivery?.url && (
                    <View style={{ paddingTop: 8 }}>
                        <Text style={{ color: textSecondary, marginBottom: 4 }}>One-time credential link</Text>
                        <TouchableOpacity onPress={() => copyToClipboard(result?.credential_delivery?.url || '')}>
                            <Text style={{ color: '#FF6B00', fontWeight: '700' }}>Copy secure link</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {!!result?.credential_document && (
                    <View style={{ paddingTop: 8 }}>
                        <Text style={{ color: textSecondary, marginBottom: 4 }}>Credential document</Text>
                        <TouchableOpacity onPress={() => copyToClipboard(result?.credential_document || '')}>
                            <Text style={{ color: '#FF6B00', fontWeight: '700' }}>Copy credential document</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {result?.parentResult && (
                    <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 2, borderTopColor: border, borderStyle: 'dashed' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isDark ? '#1e3a5f' : '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                                <Ionicons name="heart" size={12} color="#3b82f6" />
                            </View>
                            <Text style={{ fontWeight: '700', color: textPrimary }}>PARENT/GUARDIAN CREDENTIALS</Text>
                        </View>
                        {result.parentResult.error ? (
                            <View style={{ backgroundColor: isDark ? '#450a0a' : '#fef2f2', padding: 12, borderRadius: 8, marginTop: 8 }}>
                                <Text style={{ color: '#ef4444', fontWeight: '600' }}>Error creating Parent/Guardian:</Text>
                                <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{result.parentResult.error}</Text>
                            </View>
                        ) : (
                            <>
                                {[{ label: 'ID', value: result.parentResult.customId || 'N/A' }, { label: 'Email', value: result.parentResult.email }].map(row => (
                                    <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }}>
                                        <Text style={{ color: textSecondary }}>{row.label}</Text>
                                        <Text style={{ fontWeight: '700', color: textPrimary }}>{row.value}</Text>
                                    </View>
                                ))}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                                    <Text style={{ color: textSecondary }}>Temp Password</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: 17, color: '#3b82f6', marginRight: 8 }}>{result.parentResult.tempPassword}</Text>
                                        <TouchableOpacity onPress={() => copyToClipboard(result.parentResult.tempPassword)}>
                                            <Ionicons name="copy-outline" size={20} color={textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {!!result?.parentResult?.credential_delivery?.url && (
                                    <View style={{ paddingTop: 8 }}>
                                        <Text style={{ color: textSecondary, marginBottom: 4 }}>One-time credential link</Text>
                                        <TouchableOpacity onPress={() => copyToClipboard(result?.parentResult?.credential_delivery?.url || '')}>
                                            <Text style={{ color: '#3b82f6', fontWeight: '700' }}>Copy secure link</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {!!result?.parentResult?.credential_document && (
                                    <View style={{ paddingTop: 8 }}>
                                        <Text style={{ color: textSecondary, marginBottom: 4 }}>Credential document</Text>
                                        <TouchableOpacity onPress={() => copyToClipboard(result?.parentResult?.credential_document || '')}>
                                            <Text style={{ color: '#3b82f6', fontWeight: '700' }}>Copy credential document</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}
            </View>
            <View style={{ backgroundColor: isDark ? '#1c1008' : '#fff7ed', borderRadius: 12, padding: 16, width: '100%', marginBottom: 24 }}>
                <Text style={{ color: isDark ? '#fed7aa' : '#7c2d12', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                    Share these credentials securely. The user should change their password on first login.
                </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, width: '100%' }}>
                <TouchableOpacity onPress={() => { setForm({ ...initialFormData }); setResult(null); setStep(0); }}
                    style={{ flex: 1, backgroundColor: isDark ? '#f9fafb' : '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}>
                    <Text style={{ color: isDark ? '#111827' : 'white', fontWeight: '700' }}>Enroll Another</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()}
                    style={{ flex: 1, backgroundColor: isDark ? '#1f2937' : '#f3f4f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const stepContent = [renderRoleSelection, renderPersonalInfo, renderRoleDetails, renderReview, renderSuccess];

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom top bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
                    <Ionicons name="arrow-back" size={22} color={textPrimary} />
                </TouchableOpacity>
                <Text style={{ fontSize: 17, fontWeight: '700', color: textPrimary }}>Enroll User</Text>
            </View>

            {step < 4 && renderStepIndicator()}
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                {stepContent[step]()}
            </ScrollView>
            {step < 4 && (
                <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom || 16, backgroundColor: card, borderTopWidth: 1, borderTopColor: border, gap: 16 }}>
                    <TouchableOpacity onPress={prevStep}
                        style={{ flex: 1, backgroundColor: isDark ? '#1f2937' : '#f3f4f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}>
                        <Text style={{ fontWeight: '700', color: textPrimary }}>{step === 0 ? 'Cancel' : 'Back'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={nextStep} disabled={!canGoNext() || loading}
                        style={{ flex: 1, backgroundColor: canGoNext() ? '#FF6B00' : (isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db'), paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}>
                        {loading
                            ? <ActivityIndicator color="white" />
                            : <Text style={{ fontWeight: '700', color: 'white' }}>{step === 3 ? 'Confirm & Enroll' : 'Next'}</Text>
                        }
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

// ---------- Rendering Helpers ----------
const RenderInput = ({ label, value, onChangeText, placeholder, keyboardType, isDark, textPrimary, textSecondary, inputBg, inputBorder }: any) => (
    <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>{label}</Text>
        <TextInput
            style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: textPrimary, fontWeight: '500' }}
            placeholder={placeholder}
            value={String(value || '')}
            onChangeText={onChangeText}
            placeholderTextColor={textSecondary}
            keyboardType={keyboardType}
        />
    </View>
);

const RenderPicker = ({ label, options, selected, onSelect, isDark, textPrimary, textSecondary, border, card }: any) => (
    <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>{label}</Text>
        {(!options || options.length === 0) ? (
            <Text style={{ color: textSecondary, fontSize: 13, fontStyle: 'italic' }}>No options available</Text>
        ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map((opt: any) => {
                    const value = typeof opt === 'string' ? opt : String(opt.value);
                    const labelText = typeof opt === 'string' ? opt.replace(/_/g, ' ') : String(opt.label || opt.value).replace(/_/g, ' ');
                    const isSelected = selected === value;
                    return (
                        <TouchableOpacity key={value} onPress={() => onSelect(value)}
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: isSelected ? '#FF6B00' : card, borderColor: isSelected ? '#FF6B00' : border }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', textTransform: 'capitalize', color: isSelected ? 'white' : textPrimary }}>
                                {labelText}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        )}
    </View>
);

const RenderMultiSelect = ({ label, items, selectedIds, toggleItem, displayFn, isDark, textPrimary, textSecondary, border, card }: any) => (
    <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>{label}</Text>
        {items.length === 0
            ? <Text style={{ color: textSecondary, fontSize: 13, fontStyle: 'italic' }}>No items available</Text>
            : items.map((item: any) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                    <TouchableOpacity key={item.id} onPress={() => toggleItem(item.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, backgroundColor: isSelected ? '#FF6B00' : card, borderColor: isSelected ? '#FF6B00' : border }}>
                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, marginRight: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'white' : 'transparent', borderColor: isSelected ? 'white' : textSecondary }}>
                            {isSelected && <Ionicons name="checkmark" size={12} color="#FF6B00" />}
                        </View>
                        <Text style={{ fontWeight: '500', color: isSelected ? 'white' : textPrimary }}>{displayFn(item)}</Text>
                    </TouchableOpacity>
                );
            })
        }
    </View>
);
