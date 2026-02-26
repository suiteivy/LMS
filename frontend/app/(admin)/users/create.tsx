import { DatePicker } from '@/components/common/DatePicker';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { api } from '@/services/api';
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
    full_name: string;
    email: string;
    phone: string;
    gender: string;
    date_of_birth: string;
    address: string;
    institution_id: string;
    grade_level: string;
    academic_year: string;
    parent_contact: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    class_ids: string[];
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
        full_name: string;
        email: string;
        phone: string;
        occupation: string;
        address: string;
    };
}

const initialFormData: FormData = {
    role: null, full_name: '', email: '', phone: '', gender: '',
    date_of_birth: '', address: '', institution_id: '',
    grade_level: '', academic_year: new Date().getFullYear().toString(),
    parent_contact: '', emergency_contact_name: '', emergency_contact_phone: '',
    class_ids: [],
    department: '', qualification: '', specialization: '', position: 'teacher',
    subject_ids: [], class_teacher_id: '',
    occupation: '', parent_address: '',
    linked_students: [],
    create_parent: false,
    parent_info: { full_name: '', email: '', phone: '', occupation: '', address: '' },
};

// ---------- Sanitizers ----------
const DANGEROUS_CHARS = /['"`;\\<>{}()\[\]|&$#%^*+=~]/g;
const sanitize = (v: string) => v.replace(DANGEROUS_CHARS, '');
const sanitizeEmail = (v: string) => v.replace(/[^a-zA-Z0-9@._+\-]/g, '');
const sanitizePhone = (v: string) => v.replace(/[^0-9+\-\s()]/g, '');

// ---------- Component ----------
export default function CreateUserScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    const [step, setStep] = useState<Step>(0);
    const [form, setForm] = useState<FormData>({ ...initialFormData });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => { loadLookupData(); }, []);

    const loadLookupData = async () => {
        const [classRes, subjectRes, studentRes] = await Promise.all([
            supabase.from('classes').select('id, name, grade_level'),
            supabase.from('subjects').select('id, name, teacher_id'),
            supabase.from('students').select('id, user_id, grade_level, users:user_id(full_name)') as any,
        ]);
        if (classRes.data) setClasses(classRes.data);
        if (subjectRes.data) setSubjects(subjectRes.data);
        if (studentRes.data) setStudents(studentRes.data);
    };

    const updateForm = (key: keyof FormData, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    const updateFormSanitized = (key: keyof FormData, value: string, type: 'default' | 'email' | 'phone' = 'default') => {
        const clean = type === 'email' ? sanitizeEmail(value) : type === 'phone' ? sanitizePhone(value) : sanitize(value);
        setForm(prev => ({ ...prev, [key]: clean }));
    };

    const toggleArrayItem = (key: 'class_ids' | 'subject_ids', id: string) => {
        setForm(prev => {
            const arr = [...(prev[key] as string[])];
            const idx = arr.indexOf(id);
            if (idx === -1) arr.push(id); else arr.splice(idx, 1);
            return { ...prev, [key]: arr };
        });
    };

    const addLinkedStudent = (studentId: string, studentName: string) => {
        if (form.linked_students.some(ls => ls.student_id === studentId)) return;
        setForm(prev => ({ ...prev, linked_students: [...prev.linked_students, { student_id: studentId, relationship: 'guardian', name: studentName }] }));
    };
    const removeLinkedStudent = (studentId: string) => setForm(prev => ({ ...prev, linked_students: prev.linked_students.filter(ls => ls.student_id !== studentId) }));
    const updateLinkedRelationship = (studentId: string, relationship: string) =>
        setForm(prev => ({ ...prev, linked_students: prev.linked_students.map(ls => ls.student_id === studentId ? { ...ls, relationship } : ls) }));

    const handleSubmit = async () => {
        if (!form.full_name.trim() || !form.email.trim()) { Alert.alert('Validation', 'Name and email are required'); return; }
        setLoading(true);
        try {
            const response = await api.post('/auth/enroll-user', { ...form, parent_info: form.create_parent ? form.parent_info : undefined });
            setResult(response.data);
            setStep(4);
        } catch (err: any) {
            Alert.alert('Error', err.message);
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
        if (step === 1) return !!form.full_name.trim() && !!form.email.trim();
        return true;
    };
    const nextStep = () => { if (step === 3) { handleSubmit(); return; } if (canGoNext()) setStep((step + 1) as Step); };
    const prevStep = () => { if (step > 0) setStep((step - 1) as Step); else router.back(); };

    // ---------- Theme shorthands ----------
    const bg = isDark ? '#121212' : '#f9fafb';
    const card = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#e5e7eb';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const inputBg = isDark ? '#1e1e1e' : '#f9fafb';
    const inputBorder = isDark ? '#2c2c2c' : '#e5e7eb';

    // ---------- Role cards ----------
    const ROLE_CARDS = [
        { role: 'student' as Role, icon: 'school-outline', label: 'Student', desc: 'Enroll a new student', color: '#10B981' },
        { role: 'teacher' as Role, icon: 'people-outline', label: 'Teacher', desc: 'Add a new teacher', color: '#3B82F6' },
        { role: 'parent' as Role, icon: 'heart-outline', label: 'Parent', desc: 'Register a parent/guardian', color: '#F59E0B' },
        { role: 'admin' as Role, icon: 'shield-outline', label: 'Admin', desc: 'Create an admin account', color: '#EF4444' },
    ];

    const POSITION_OPTIONS = ['teacher', 'head_of_department', 'assistant', 'class_teacher', 'dean'];
    const GENDER_OPTIONS = ['male', 'female', 'other'];
    const RELATIONSHIP_OPTIONS = ['father', 'mother', 'guardian', 'sibling', 'other'];
    const GRADE_OPTIONS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

    // ---------- Render helpers ----------
    const renderStepIndicator = () => {
        const labels = ['Role', 'Personal', form.role === 'admin' ? '' : 'Details', 'Review', 'Done'].filter(Boolean);
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }}>
                {labels.map((label, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= step ? '#FF6B00' : (isDark ? '#2c2c2c' : '#e5e7eb') }}>
                            {i < step
                                ? <Ionicons name="checkmark" size={16} color="white" />
                                : <Text style={{ fontSize: 12, fontWeight: '700', color: i <= step ? 'white' : textSecondary }}>{i + 1}</Text>
                            }
                        </View>
                        {i < labels.length - 1 && <View style={{ width: 32, height: 2, backgroundColor: i < step ? '#FF6B00' : (isDark ? '#2c2c2c' : '#e5e7eb') }} />}
                    </View>
                ))}
            </View>
        );
    };

    const renderInput = (label: string, key: keyof FormData, placeholder: string, opts?: { keyboardType?: any; type?: 'default' | 'email' | 'phone' }) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>{label}</Text>
            <TextInput
                style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: textPrimary, fontWeight: '500' }}
                placeholder={placeholder}
                value={String(form[key] || '')}
                onChangeText={v => updateFormSanitized(key, v, opts?.type)}
                placeholderTextColor={textSecondary}
                keyboardType={opts?.keyboardType}
            />
        </View>
    );

    const renderPicker = (label: string, options: string[], selected: string, onSelect: (v: string) => void) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => (
                    <TouchableOpacity key={opt} onPress={() => onSelect(opt)}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: selected === opt ? '#FF6B00' : card, borderColor: selected === opt ? '#FF6B00' : border }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', textTransform: 'capitalize', color: selected === opt ? 'white' : textPrimary }}>
                            {opt.replace(/_/g, ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderMultiSelect = (label: string, items: any[], selectedIds: string[], toggleKey: 'class_ids' | 'subject_ids', displayFn: (item: any) => string) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>{label}</Text>
            {items.length === 0
                ? <Text style={{ color: textSecondary, fontSize: 13, fontStyle: 'italic' }}>No items available</Text>
                : items.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                        <TouchableOpacity key={item.id} onPress={() => toggleArrayItem(toggleKey, item.id)}
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

    const renderRoleSelection = () => (
        <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Select Role</Text>
            <Text style={{ color: textSecondary, marginBottom: 24 }}>Choose the type of user you want to enroll</Text>
            {ROLE_CARDS.map(roleCard => (
                <TouchableOpacity key={roleCard.role} onPress={() => updateForm('role', roleCard.role)} activeOpacity={0.7}
                    style={{ padding: 20, borderRadius: 16, borderWidth: 2, flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: form.role === roleCard.role ? (isDark ? '#2a1a0a' : '#fff7ed') : card, borderColor: form.role === roleCard.role ? '#FF6B00' : border }}>
                    <View style={{ width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: roleCard.color + '20' }}>
                        <Ionicons name={roleCard.icon as any} size={28} color={roleCard.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: textPrimary }}>{roleCard.label}</Text>
                        <Text style={{ fontSize: 13, color: textSecondary }}>{roleCard.desc}</Text>
                    </View>
                    {form.role === roleCard.role && (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderPersonalInfo = () => (
        <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Personal Information</Text>
            <Text style={{ color: textSecondary, marginBottom: 24 }}>Enter the user's basic details</Text>
            {renderInput('Full Name *', 'full_name', 'e.g. John Doe')}
            {renderInput('Email *', 'email', 'e.g. john@school.com', { keyboardType: 'email-address', type: 'email' })}
            {renderInput('Phone', 'phone', '+254 7XX XXX XXX', { keyboardType: 'phone-pad', type: 'phone' })}
            {renderPicker('Gender', GENDER_OPTIONS, form.gender, v => updateForm('gender', v))}
            <DatePicker label="Date of Birth" value={form.date_of_birth} onChange={v => updateForm('date_of_birth', v)} isDark={isDark} />
            {renderInput('Address', 'address', 'Enter physical address')}
        </View>
    );

    const renderStudentDetails = () => (
        <View>
            {renderPicker('Grade Level', GRADE_OPTIONS, form.grade_level, v => updateForm('grade_level', v))}
            {renderInput('Academic Year', 'academic_year', '2026')}
            {renderInput('Parent/Guardian Contact', 'parent_contact', 'Phone number', { keyboardType: 'phone-pad', type: 'phone' })}

            <View style={{ backgroundColor: isDark ? '#1c1008' : '#fff7ed', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#fed7aa' : '#7c2d12', marginBottom: 12 }}>🆘 Emergency Contact</Text>
                {renderInput('Name', 'emergency_contact_name', 'Emergency contact name')}
                {renderInput('Phone', 'emergency_contact_phone', 'Emergency phone', { keyboardType: 'phone-pad', type: 'phone' })}
            </View>

            {renderMultiSelect('Assign to Classes', classes, form.class_ids, 'class_ids', (c: any) => `${c.name} (${c.grade_level || 'N/A'})`)}

            <View style={{ backgroundColor: isDark ? '#0f172a' : '#eff6ff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#1e3a5f' : '#bfdbfe' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontWeight: '700', fontSize: 15, color: isDark ? '#93c5fd' : '#1e3a8a' }}>Create Parent Account</Text>
                        <Text style={{ fontSize: 12, color: isDark ? '#60a5fa' : '#3b82f6' }}>Simultaneously register and link a guardian</Text>
                    </View>
                    <TouchableOpacity onPress={() => updateForm('create_parent', !form.create_parent)}
                        style={{ width: 48, height: 24, borderRadius: 12, paddingHorizontal: 4, justifyContent: 'center', alignItems: form.create_parent ? 'flex-end' : 'flex-start', backgroundColor: form.create_parent ? '#3b82f6' : (isDark ? '#374151' : '#d1d5db') }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white' }} />
                    </TouchableOpacity>
                </View>
                {form.create_parent && (
                    <View>
                        {[
                            { label: 'Parent Full Name *', key: 'full_name', placeholder: "Guardian's name", type: 'default' },
                            { label: 'Parent Email *', key: 'email', placeholder: 'parent@example.com', type: 'email' },
                            { label: 'Parent Phone', key: 'phone', placeholder: '+254...', type: 'phone' },
                            { label: 'Parent Occupation', key: 'occupation', placeholder: 'e.g. Doctor', type: 'default' },
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
                <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary, marginBottom: 16 }}>👨‍🏫 Teacher Details</Text>
                {renderInput('Department', 'department', 'e.g. Mathematics')}
                {renderInput('Qualification', 'qualification', 'e.g. B.Ed Mathematics')}
                {renderInput('Specialization', 'specialization', 'e.g. Applied Mathematics')}
                {renderPicker('Position', POSITION_OPTIONS, form.position, v => updateForm('position', v))}
                {renderMultiSelect('Assign Subjects (unassigned only)', unassignedSubjects, form.subject_ids, 'subject_ids', (s: any) => s.name)}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Assign as Class Teacher</Text>
                    {classes.map(c => (
                        <TouchableOpacity key={c.id} onPress={() => updateForm('class_teacher_id', form.class_teacher_id === c.id ? '' : c.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, backgroundColor: form.class_teacher_id === c.id ? '#3b82f6' : card, borderColor: form.class_teacher_id === c.id ? '#3b82f6' : border }}>
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
            const name = (s.users as any)?.full_name || '';
            return name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id?.toLowerCase().includes(studentSearch.toLowerCase());
        });
        return (
            <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary, marginBottom: 16 }}>👨‍👩‍👧 Parent Details</Text>
                {renderInput('Occupation', 'occupation', 'e.g. Engineer')}
                {renderInput('Home Address', 'parent_address', 'Physical address')}
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
                                {filteredStudents.slice(0, 10).map(s => (
                                    <TouchableOpacity key={s.id} onPress={() => { addLinkedStudent(s.id, (s.users as any)?.full_name || s.id); setStudentSearch(''); }}
                                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                                        <Ionicons name="person-outline" size={18} color={textSecondary} />
                                        <Text style={{ marginLeft: 8, color: textPrimary, fontWeight: '500' }}>
                                            {(s.users as any)?.full_name || 'Unknown'}
                                        </Text>
                                        <Text style={{ color: textSecondary, fontSize: 11, marginLeft: 4 }}>{s.id}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                    {form.linked_students.map(ls => (
                        <View key={ls.student_id} style={{ backgroundColor: isDark ? '#1e1e1e' : '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="person" size={16} color="#3b82f6" />
                                    <Text style={{ marginLeft: 8, fontWeight: '600', color: textPrimary }}>{ls.name}</Text>
                                    <Text style={{ color: textSecondary, fontSize: 11, marginLeft: 6 }}>{ls.student_id}</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeLinkedStudent(ls.student_id)}>
                                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {RELATIONSHIP_OPTIONS.map(rel => (
                                    <TouchableOpacity key={rel} onPress={() => updateLinkedRelationship(ls.student_id, rel)}
                                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: ls.relationship === rel ? '#111827' : card, borderColor: ls.relationship === rel ? '#111827' : border }}>
                                        <Text style={{ fontSize: 12, fontWeight: '500', textTransform: 'capitalize', color: ls.relationship === rel ? 'white' : textPrimary }}>{rel}</Text>
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
                <View style={{ backgroundColor: isDark ? '#1e1e1e' : '#f9fafb', borderRadius: 12, padding: 24, alignItems: 'center' }}>
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
                {renderReviewRow('Name', form.full_name)}
                {renderReviewRow('Email', form.email)}
                {renderReviewRow('Phone', form.phone)}
                {renderReviewRow('Gender', form.gender)}
                {renderReviewRow('Date of Birth', form.date_of_birth)}
                {renderReviewRow('Address', form.address)}
            </View>
            {form.role === 'student' && (
                <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Student Details</Text>
                    {renderReviewRow('Grade', form.grade_level)}
                    {renderReviewRow('Academic Year', form.academic_year)}
                    {renderReviewRow('Parent Contact', form.parent_contact)}
                    {renderReviewRow('Emergency Contact', form.emergency_contact_name)}
                    {renderReviewRow('Emergency Phone', form.emergency_contact_phone)}
                    {renderReviewRow('Classes', form.class_ids.length > 0 ? form.class_ids.map(id => classes.find(c => c.id === id)?.name || id).join(', ') : undefined)}
                </View>
            )}
            {form.role === 'student' && form.create_parent && (
                <View style={{ backgroundColor: isDark ? '#0f172a' : '#eff6ff', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1e3a5f' : '#bfdbfe', padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Parent to be Created</Text>
                    {renderReviewRow('Parent Name', form.parent_info.full_name)}
                    {renderReviewRow('Parent Email', form.parent_info.email)}
                    {renderReviewRow('Parent Phone', form.parent_info.phone)}
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
                    {renderReviewRow('Subjects', form.subject_ids.length > 0 ? form.subject_ids.map(id => subjects.find(s => s.id === id)?.name || id).join(', ') : undefined)}
                    {renderReviewRow('Class Teacher', form.class_teacher_id ? classes.find(c => c.id === form.class_teacher_id)?.name : undefined)}
                </View>
            )}
            {form.role === 'parent' && (
                <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Parent Details</Text>
                    {renderReviewRow('Occupation', form.occupation)}
                    {renderReviewRow('Address', form.parent_address)}
                    {form.linked_students.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Linked Students:</Text>
                            {form.linked_students.map(ls => (
                                <Text key={ls.student_id} style={{ fontSize: 13, color: textPrimary }}>• {ls.name} ({ls.relationship})</Text>
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
                {result?.parentResult && (
                    <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 2, borderTopColor: border, borderStyle: 'dashed' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isDark ? '#1e3a5f' : '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                                <Ionicons name="heart" size={12} color="#3b82f6" />
                            </View>
                            <Text style={{ fontWeight: '700', color: textPrimary }}>PARENT CREDENTIALS</Text>
                        </View>
                        {[{ label: 'ID', value: result.parentResult.customId }, { label: 'Email', value: result.parentResult.email }].map(row => (
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
                    </View>
                )}
            </View>
            <View style={{ backgroundColor: isDark ? '#1c1008' : '#fff7ed', borderRadius: 12, padding: 16, width: '100%', marginBottom: 24 }}>
                <Text style={{ color: isDark ? '#fed7aa' : '#7c2d12', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                    ⚠️ Share these credentials securely. The user should change their password on first login.
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
                        style={{ flex: 1, backgroundColor: canGoNext() ? '#FF6B00' : (isDark ? '#2c2c2c' : '#d1d5db'), paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}>
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