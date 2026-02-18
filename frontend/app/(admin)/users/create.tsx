import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import { api } from '@/services/api';

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
    // Student
    grade_level: string;
    academic_year: string;
    parent_contact: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    class_ids: string[];
    // Teacher
    department: string;
    qualification: string;
    specialization: string;
    position: string;
    subject_ids: string[];
    class_teacher_id: string;
    // Parent
    occupation: string;
    parent_address: string;
    linked_students: { student_id: string; relationship: string; name?: string }[];
    // Atomic Parent Creation (while enrolling student)
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
    parent_info: {
        full_name: '',
        email: '',
        phone: '',
        occupation: '',
        address: '',
    },
};

// ---------- Component ----------
export default function CreateUserScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(0);
    const [form, setForm] = useState<FormData>({ ...initialFormData });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Lookup data
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

    const updateForm = (key: keyof FormData, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const toggleArrayItem = (key: 'class_ids' | 'subject_ids', id: string) => {
        setForm(prev => {
            const arr = [...(prev[key] as string[])];
            const idx = arr.indexOf(id);
            if (idx === -1) arr.push(id);
            else arr.splice(idx, 1);
            return { ...prev, [key]: arr };
        });
    };

    const addLinkedStudent = (studentId: string, studentName: string) => {
        if (form.linked_students.some(ls => ls.student_id === studentId)) return;
        setForm(prev => ({
            ...prev,
            linked_students: [...prev.linked_students, { student_id: studentId, relationship: 'guardian', name: studentName }],
        }));
    };

    const removeLinkedStudent = (studentId: string) => {
        setForm(prev => ({
            ...prev,
            linked_students: prev.linked_students.filter(ls => ls.student_id !== studentId),
        }));
    };

    const updateLinkedRelationship = (studentId: string, relationship: string) => {
        setForm(prev => ({
            ...prev,
            linked_students: prev.linked_students.map(ls =>
                ls.student_id === studentId ? { ...ls, relationship } : ls
            ),
        }));
    };

    // ---------- Submission via backend ----------
    const handleSubmit = async () => {
        if (!form.full_name.trim() || !form.email.trim()) {
            Alert.alert('Validation', 'Name and email are required');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/auth/enroll-user', {
                ...form,
                parent_info: form.create_parent ? form.parent_info : undefined,
            });

            const data = response.data;
            setResult(data);
            setStep(4);
        } catch (err: any) {
            console.error("Enrollment error:", err);
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (Platform.OS === 'web' && navigator?.clipboard) {
                await navigator.clipboard.writeText(text);
            }
            Alert.alert('Copied', 'Credentials copied to clipboard');
        } catch {
            Alert.alert('Copy', `Password: ${text}`);
        }
    };

    // ---------- Step Navigation ----------
    const canGoNext = (): boolean => {
        if (step === 0) return !!form.role;
        if (step === 1) return !!form.full_name.trim() && !!form.email.trim();
        return true;
    };

    const nextStep = () => {
        if (step === 3) { handleSubmit(); return; }
        if (canGoNext()) setStep((step + 1) as Step);
    };

    const prevStep = () => {
        if (step > 0) setStep((step - 1) as Step);
        else router.back();
    };

    // ---------- UI Helpers ----------
    const ROLE_CARDS: { role: Role; icon: string; label: string; desc: string; color: string }[] = [
        { role: 'student', icon: 'school-outline', label: 'Student', desc: 'Enroll a new student', color: '#10B981' },
        { role: 'teacher', icon: 'people-outline', label: 'Teacher', desc: 'Add a new teacher', color: '#3B82F6' },
        { role: 'parent', icon: 'heart-outline', label: 'Parent', desc: 'Register a parent/guardian', color: '#F59E0B' },
        { role: 'admin', icon: 'shield-outline', label: 'Admin', desc: 'Create an admin account', color: '#EF4444' },
    ];

    const POSITION_OPTIONS = ['teacher', 'head_of_department', 'assistant', 'class_teacher', 'dean'];
    const GENDER_OPTIONS = ['male', 'female', 'other'];
    const RELATIONSHIP_OPTIONS = ['father', 'mother', 'guardian', 'sibling', 'other'];
    const GRADE_OPTIONS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

    // ---------- Renders ----------

    const renderStepIndicator = () => (
        <View className="flex-row items-center justify-center py-4 px-6 bg-white border-b border-gray-100">
            {['Role', 'Personal', form.role === 'admin' ? '' : 'Details', 'Review', 'Done'].filter(Boolean).map((label, i) => (
                <View key={i} className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${i <= step ? 'bg-black' : 'bg-gray-200'
                        }`}>
                        {i < step ? (
                            <Ionicons name="checkmark" size={16} color="white" />
                        ) : (
                            <Text className={`text-xs font-bold ${i <= step ? 'text-white' : 'text-gray-500'}`}>{i + 1}</Text>
                        )}
                    </View>
                    {i < 3 && <View className={`w-8 h-[2px] ${i < step ? 'bg-black' : 'bg-gray-200'}`} />}
                </View>
            ))}
        </View>
    );

    const renderRoleSelection = () => (
        <View className="p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Select Role</Text>
            <Text className="text-gray-500 mb-6">Choose the type of user you want to enroll</Text>
            <View className="gap-4">
                {ROLE_CARDS.map(card => (
                    <TouchableOpacity
                        key={card.role}
                        onPress={() => updateForm('role', card.role)}
                        className={`p-5 rounded-2xl border-2 flex-row items-center ${form.role === card.role ? 'border-black bg-gray-50' : 'border-gray-100 bg-white'
                            }`}
                        activeOpacity={0.7}
                    >
                        <View className="w-14 h-14 rounded-xl items-center justify-center mr-4"
                            style={{ backgroundColor: card.color + '20' }}>
                            <Ionicons name={card.icon as any} size={28} color={card.color} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-900">{card.label}</Text>
                            <Text className="text-sm text-gray-500">{card.desc}</Text>
                        </View>
                        {form.role === card.role && (
                            <View className="w-6 h-6 rounded-full bg-black items-center justify-center">
                                <Ionicons name="checkmark" size={14} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderInput = (label: string, key: keyof FormData, placeholder: string, opts?: { keyboardType?: any }) => (
        <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-600 mb-1.5">{label}</Text>
            <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-medium"
                placeholder={placeholder}
                value={String(form[key] || '')}
                onChangeText={v => updateForm(key, v)}
                placeholderTextColor="#9CA3AF"
                {...opts}
            />
        </View>
    );

    const renderPicker = (label: string, options: string[], selected: string, onSelect: (v: string) => void) => (
        <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-600 mb-1.5">{label}</Text>
            <View className="flex-row flex-wrap gap-2">
                {options.map(opt => (
                    <TouchableOpacity
                        key={opt}
                        onPress={() => onSelect(opt)}
                        className={`px-4 py-2 rounded-full border ${selected === opt ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                    >
                        <Text className={`text-sm font-medium capitalize ${selected === opt ? 'text-white' : 'text-gray-700'}`}>
                            {opt.replace(/_/g, ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderMultiSelect = (label: string, items: any[], selectedIds: string[], toggleKey: 'class_ids' | 'subject_ids', displayFn: (item: any) => string) => (
        <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-600 mb-1.5">{label}</Text>
            {items.length === 0 ? (
                <Text className="text-gray-400 text-sm italic">No items available</Text>
            ) : (
                <View className="gap-2">
                    {items.map(item => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => toggleArrayItem(toggleKey, item.id)}
                                className={`flex-row items-center px-4 py-3 rounded-xl border ${isSelected ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                            >
                                <View className={`w-5 h-5 rounded border mr-3 items-center justify-center ${isSelected ? 'bg-white border-white' : 'border-gray-300'}`}>
                                    {isSelected && <Ionicons name="checkmark" size={12} color="black" />}
                                </View>
                                <Text className={`font-medium ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                    {displayFn(item)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );

    const renderPersonalInfo = () => (
        <View className="p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Personal Information</Text>
            <Text className="text-gray-500 mb-6">Enter the user's basic details</Text>
            {renderInput('Full Name *', 'full_name', 'e.g. John Doe')}
            {renderInput('Email *', 'email', 'e.g. john@school.com', { keyboardType: 'email-address' })}
            {renderInput('Phone', 'phone', '+254 7XX XXX XXX', { keyboardType: 'phone-pad' })}
            {renderPicker('Gender', GENDER_OPTIONS, form.gender, v => updateForm('gender', v))}
            {renderInput('Date of Birth', 'date_of_birth', 'YYYY-MM-DD')}
            {renderInput('Address', 'address', 'Enter physical address')}
        </View>
    );

    const renderStudentDetails = () => (
        <View>
            {renderPicker('Grade Level', GRADE_OPTIONS, form.grade_level, v => updateForm('grade_level', v))}
            {renderInput('Academic Year', 'academic_year', '2026')}
            {renderInput('Parent/Guardian Contact', 'parent_contact', 'Phone number')}

            <View className="bg-orange-50 rounded-xl p-4 mb-4">
                <Text className="text-sm font-bold text-orange-900 mb-3">🆘 Emergency Contact</Text>
                {renderInput('Name', 'emergency_contact_name', 'Emergency contact name')}
                {renderInput('Phone', 'emergency_contact_phone', 'Emergency phone')}
            </View>

            {renderMultiSelect(
                'Assign to Classes',
                classes,
                form.class_ids,
                'class_ids',
                (c: any) => `${c.name} (${c.grade_level || 'N/A'})`
            )}

            {/* Atomic Parent Creation Toggle */}
            <View className="bg-blue-50 rounded-2xl p-5 mb-4 border border-blue-100">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1 mr-3">
                        <Text className="text-blue-900 font-bold text-base">Create Parent Account</Text>
                        <Text className="text-blue-700 text-xs">Simultaneously register and link a guardian</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => updateForm('create_parent', !form.create_parent)}
                        className={`w-12 h-6 rounded-full px-1 justify-center ${form.create_parent ? 'bg-blue-600 items-end' : 'bg-gray-300 items-start'}`}
                    >
                        <View className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </TouchableOpacity>
                </View>

                {form.create_parent && (
                    <View className="pt-2">
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-blue-800 mb-1.5">Parent Full Name *</Text>
                            <TextInput
                                className="bg-white border border-blue-100 rounded-xl px-4 py-3 text-gray-900"
                                placeholder="Guardian's name"
                                value={form.parent_info.full_name}
                                onChangeText={v => setForm(f => ({ ...f, parent_info: { ...f.parent_info, full_name: v } }))}
                            />
                        </View>
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-blue-800 mb-1.5">Parent Email *</Text>
                            <TextInput
                                className="bg-white border border-blue-100 rounded-xl px-4 py-3 text-gray-900"
                                placeholder="parent@example.com"
                                keyboardType="email-address"
                                value={form.parent_info.email}
                                onChangeText={v => setForm(f => ({ ...f, parent_info: { ...f.parent_info, email: v } }))}
                            />
                        </View>
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-blue-800 mb-1.5">Parent Phone</Text>
                            <TextInput
                                className="bg-white border border-blue-100 rounded-xl px-4 py-3 text-gray-900"
                                placeholder="+254..."
                                keyboardType="phone-pad"
                                value={form.parent_info.phone}
                                onChangeText={v => setForm(f => ({ ...f, parent_info: { ...f.parent_info, phone: v } }))}
                            />
                        </View>
                        <View className="mb-2">
                            <Text className="text-sm font-semibold text-blue-800 mb-1.5">Parent Occupation</Text>
                            <TextInput
                                className="bg-white border border-blue-100 rounded-xl px-4 py-3 text-gray-900"
                                placeholder="e.g. Doctor"
                                value={form.parent_info.occupation}
                                onChangeText={v => setForm(f => ({ ...f, parent_info: { ...f.parent_info, occupation: v } }))}
                            />
                        </View>
                    </View>
                )}
            </View>
        </View>
    );

    const renderTeacherDetails = () => {
        const unassignedSubjects = subjects.filter(s => !s.teacher_id);
        return (
            <View>
                <Text className="text-lg font-bold text-gray-900 mb-4">👨‍🏫 Teacher Details</Text>
                {renderInput('Department', 'department', 'e.g. Mathematics')}
                {renderInput('Qualification', 'qualification', 'e.g. B.Ed Mathematics')}
                {renderInput('Specialization', 'specialization', 'e.g. Applied Mathematics')}
                {renderPicker('Position', POSITION_OPTIONS, form.position, v => updateForm('position', v))}

                {renderMultiSelect(
                    'Assign Subjects (unassigned only)',
                    unassignedSubjects,
                    form.subject_ids,
                    'subject_ids',
                    (s: any) => s.name
                )}

                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-600 mb-1.5">Assign as Class Teacher</Text>
                    <View className="gap-2">
                        {classes.map(c => (
                            <TouchableOpacity
                                key={c.id}
                                onPress={() => updateForm('class_teacher_id', form.class_teacher_id === c.id ? '' : c.id)}
                                className={`flex-row items-center px-4 py-3 rounded-xl border ${form.class_teacher_id === c.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                            >
                                <Ionicons
                                    name={form.class_teacher_id === c.id ? 'radio-button-on' : 'radio-button-off'}
                                    size={18}
                                    color={form.class_teacher_id === c.id ? 'white' : '#9CA3AF'}
                                />
                                <Text className={`ml-3 font-medium ${form.class_teacher_id === c.id ? 'text-white' : 'text-gray-800'}`}>
                                    {c.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    const renderParentDetails = () => {
        const filteredStudents = students.filter(s => {
            const name = (s.users as any)?.full_name || '';
            return name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                s.id?.toLowerCase().includes(studentSearch.toLowerCase());
        });

        return (
            <View>
                <Text className="text-lg font-bold text-gray-900 mb-4">👨‍👩‍👧 Parent Details</Text>
                {renderInput('Occupation', 'occupation', 'e.g. Engineer')}
                {renderInput('Home Address', 'parent_address', 'Physical address')}

                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-600 mb-2">Link to Student(s)</Text>
                    <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-2"
                        placeholder="Search student by name or ID..."
                        value={studentSearch}
                        onChangeText={setStudentSearch}
                        placeholderTextColor="#9CA3AF"
                    />
                    {studentSearch.length > 0 && (
                        <View className="bg-white border border-gray-200 rounded-xl max-h-40 overflow-hidden mb-3">
                            <ScrollView nestedScrollEnabled>
                                {filteredStudents.slice(0, 10).map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => {
                                            addLinkedStudent(s.id, (s.users as any)?.full_name || s.id);
                                            setStudentSearch('');
                                        }}
                                        className="flex-row items-center px-4 py-3 border-b border-gray-50"
                                    >
                                        <Ionicons name="person-outline" size={18} color="#6B7280" />
                                        <Text className="ml-2 text-gray-800 font-medium">
                                            {(s.users as any)?.full_name || 'Unknown'} <Text className="text-gray-400 text-xs">{s.id}</Text>
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Linked students list */}
                    {form.linked_students.map(ls => (
                        <View key={ls.student_id} className="bg-gray-50 rounded-xl p-4 mb-2 border border-gray-100">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center">
                                    <Ionicons name="person" size={16} color="#3B82F6" />
                                    <Text className="ml-2 font-semibold text-gray-900">{ls.name}</Text>
                                    <Text className="text-gray-400 text-xs ml-2">{ls.student_id}</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeLinkedStudent(ls.student_id)}>
                                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-row flex-wrap gap-1">
                                {RELATIONSHIP_OPTIONS.map(rel => (
                                    <TouchableOpacity
                                        key={rel}
                                        onPress={() => updateLinkedRelationship(ls.student_id, rel)}
                                        className={`px-3 py-1.5 rounded-full border ${ls.relationship === rel ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-xs font-medium capitalize ${ls.relationship === rel ? 'text-white' : 'text-gray-600'}`}>
                                            {rel}
                                        </Text>
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
        <View className="p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Role-Specific Details</Text>
            <Text className="text-gray-500 mb-6">Enter details relevant to the {form.role} role</Text>
            {form.role === 'student' && renderStudentDetails()}
            {form.role === 'teacher' && renderTeacherDetails()}
            {form.role === 'parent' && renderParentDetails()}
            {form.role === 'admin' && (
                <View className="bg-gray-50 rounded-xl p-6 items-center">
                    <Ionicons name="shield-checkmark" size={48} color="#6B7280" />
                    <Text className="text-gray-500 mt-3 text-center">No additional details needed for admin accounts</Text>
                </View>
            )}
        </View>
    );

    const renderReviewRow = (label: string, value: string | undefined) => {
        if (!value) return null;
        return (
            <View className="flex-row py-2.5 border-b border-gray-50">
                <Text className="w-2/5 text-gray-500 text-sm">{label}</Text>
                <Text className="flex-1 text-gray-900 font-medium text-sm text-right">{value}</Text>
            </View>
        );
    };

    const renderReview = () => (
        <View className="p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Review & Confirm</Text>
            <Text className="text-gray-500 mb-6">Verify the details before enrolling</Text>

            <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                <Text className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Personal</Text>
                {renderReviewRow('Role', form.role || '')}
                {renderReviewRow('Name', form.full_name)}
                {renderReviewRow('Email', form.email)}
                {renderReviewRow('Phone', form.phone)}
                {renderReviewRow('Gender', form.gender)}
                {renderReviewRow('Date of Birth', form.date_of_birth)}
                {renderReviewRow('Address', form.address)}
            </View>

            {form.role === 'student' && (
                <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <Text className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Student Details</Text>
                    {renderReviewRow('Grade', form.grade_level)}
                    {renderReviewRow('Academic Year', form.academic_year)}
                    {renderReviewRow('Parent Contact', form.parent_contact)}
                    {renderReviewRow('Emergency Contact', form.emergency_contact_name)}
                    {renderReviewRow('Emergency Phone', form.emergency_contact_phone)}
                    {renderReviewRow('Classes', form.class_ids.length > 0 ?
                        form.class_ids.map(id => classes.find(c => c.id === id)?.name || id).join(', ') : undefined
                    )}
                </View>
            )}

            {form.role === 'student' && form.create_parent && (
                <View className="bg-blue-50 rounded-2xl border border-blue-100 p-4 mb-4">
                    <Text className="text-sm font-bold text-blue-400 uppercase tracking-wide mb-2">Parent to be Created</Text>
                    {renderReviewRow('Parent Name', form.parent_info.full_name)}
                    {renderReviewRow('Parent Email', form.parent_info.email)}
                    {renderReviewRow('Parent Phone', form.parent_info.phone)}
                    {renderReviewRow('Occupation', form.parent_info.occupation)}
                </View>
            )}

            {form.role === 'teacher' && (
                <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <Text className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Teacher Details</Text>
                    {renderReviewRow('Department', form.department)}
                    {renderReviewRow('Qualification', form.qualification)}
                    {renderReviewRow('Specialization', form.specialization)}
                    {renderReviewRow('Position', form.position?.replace(/_/g, ' '))}
                    {renderReviewRow('Subjects', form.subject_ids.length > 0 ?
                        form.subject_ids.map(id => subjects.find(s => s.id === id)?.name || id).join(', ') : undefined
                    )}
                    {renderReviewRow('Class Teacher', form.class_teacher_id ?
                        classes.find(c => c.id === form.class_teacher_id)?.name || form.class_teacher_id : undefined
                    )}
                </View>
            )}

            {form.role === 'parent' && (
                <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <Text className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Parent Details</Text>
                    {renderReviewRow('Occupation', form.occupation)}
                    {renderReviewRow('Address', form.parent_address)}
                    {form.linked_students.length > 0 && (
                        <View className="mt-2">
                            <Text className="text-xs text-gray-400 mb-1">Linked Students:</Text>
                            {form.linked_students.map(ls => (
                                <Text key={ls.student_id} className="text-sm text-gray-700">
                                    • {ls.name} ({ls.relationship})
                                </Text>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    const renderSuccess = () => (
        <View className="p-6 items-center">
            <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">User Enrolled!</Text>
            <Text className="text-gray-500 text-center mb-8">The user has been successfully created</Text>

            <View className="bg-white rounded-2xl border border-gray-100 p-5 w-full mb-6 relative overflow-hidden">
                {/* Primary Student Credentials */}
                <View className="mb-2 flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center mr-2">
                        <Ionicons name="school" size={12} color="#FF6B00" />
                    </View>
                    <Text className="font-bold text-gray-900">{form.role?.toUpperCase()} CREDENTIALS</Text>
                </View>

                <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
                    <Text className="text-gray-500">ID</Text>
                    <Text className="font-bold text-gray-900">{result?.customId || 'N/A'}</Text>
                </View>
                <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
                    <Text className="text-gray-500">Email</Text>
                    <Text className="font-bold text-gray-900">{result?.email}</Text>
                </View>
                <View className="flex-row justify-between items-center py-2">
                    <Text className="text-gray-500">Temp Password</Text>
                    <View className="flex-row items-center">
                        <Text className="font-mono font-bold text-lg text-orange-600 mr-2">{result?.tempPassword}</Text>
                        <TouchableOpacity onPress={() => copyToClipboard(result?.tempPassword || '')}>
                            <Ionicons name="copy-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Optional Parent Credentials */}
                {result?.parentResult && (
                    <View className="mt-6 pt-6 border-t-2 border-dotted border-gray-100">
                        <View className="mb-2 flex-row items-center">
                            <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center mr-2">
                                <Ionicons name="heart" size={12} color="#3B82F6" />
                            </View>
                            <Text className="font-bold text-gray-900">PARENT CREDENTIALS</Text>
                        </View>
                        <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
                            <Text className="text-gray-500">ID</Text>
                            <Text className="font-bold text-gray-900">{result.parentResult.customId}</Text>
                        </View>
                        <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
                            <Text className="text-gray-500">Email</Text>
                            <Text className="font-bold text-gray-900">{result.parentResult.email}</Text>
                        </View>
                        <View className="flex-row justify-between items-center py-2">
                            <Text className="text-gray-500">Temp Password</Text>
                            <View className="flex-row items-center">
                                <Text className="font-mono font-bold text-lg text-blue-600 mr-2">{result.parentResult.tempPassword}</Text>
                                <TouchableOpacity onPress={() => copyToClipboard(result.parentResult.tempPassword)}>
                                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            <View className="bg-orange-50 rounded-xl p-4 w-full mb-6">
                <Text className="text-orange-800 text-sm font-medium text-center">
                    ⚠️ Share these credentials securely with the user. They should change their password on first login.
                </Text>
            </View>

            <View className="flex-row gap-4 w-full">
                <TouchableOpacity
                    onPress={() => {
                        setForm({ ...initialFormData });
                        setResult(null);
                        setStep(0);
                    }}
                    className="flex-1 bg-black py-4 rounded-xl items-center"
                >
                    <Text className="text-white font-bold">Enroll Another</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="flex-1 bg-gray-100 py-4 rounded-xl items-center"
                >
                    <Text className="text-gray-700 font-bold">Done</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ---------- Main Render ----------
    const stepContent = [renderRoleSelection, renderPersonalInfo, renderRoleDetails, renderReview, renderSuccess];

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Enroll User', headerBackTitle: 'Users' }} />

            {step < 4 && renderStepIndicator()}

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                {stepContent[step]()}
            </ScrollView>

            {/* Footer Nav - hide on success */}
            {step < 4 && (
                <View className="flex-row px-6 py-4 bg-white border-t border-gray-100 gap-4"
                    style={Platform.OS === 'web' ? { paddingBottom: 16 } : { paddingBottom: 32 }}>
                    <TouchableOpacity
                        onPress={prevStep}
                        className="flex-1 bg-gray-100 py-4 rounded-xl items-center"
                    >
                        <Text className="font-bold text-gray-700">{step === 0 ? 'Cancel' : 'Back'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={nextStep}
                        disabled={!canGoNext() || loading}
                        className={`flex-1 py-4 rounded-xl items-center ${canGoNext() ? 'bg-black' : 'bg-gray-300'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="font-bold text-white">
                                {step === 3 ? 'Confirm & Enroll' : 'Next'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
