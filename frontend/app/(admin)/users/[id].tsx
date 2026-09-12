import { DatePicker } from '@/components/common/DatePicker';
import { UserCard } from '@/components/common/UserCard';
import { NotFoundView } from '@/components/common/NotFoundView';
import { ListItemSkeleton } from '@/components/ui/skeletons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/libs/supabase';
import { api } from '@/services/api';
import { Database } from '@/types/database';
import { User } from '@/types/types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, ScrollView, Text,
    TextInput, TouchableOpacity, View, Platform, Switch
} from 'react-native';
import { SettingsService } from '@/services/SettingsService';
import { formatClassLabel } from '@/utils/classLabel';
import { formatCredentialExpiry } from '@/utils/formatExpiry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type UserRow = Database['public']['Tables']['users']['Row'];

// ---------- Sanitizers ----------
const DANGEROUS_CHARS = /['"`;\\<>{}()\[\]|&$#%^*+=~]/g;
const sanitize = (v: string) => v.replace(DANGEROUS_CHARS, '');
const sanitizeEmail = (v: string) => v.replace(/[^a-zA-Z0-9@._+\-]/g, '');
const sanitizePhone = (v: string) => v.replace(/[^0-9+\-\s()]/g, '');

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

export default function UserDetailsScreen() {
    const { id: idParam } = useLocalSearchParams();
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { profile } = useAuth();

    // Theme shorthands
    const bg = isDark ? '#161B22' : '#FFFFFF';
    const card = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const inputBg = isDark ? '#161B22' : '#EAEEF2';
    const inputBorder = isDark ? '#21262D' : '#D0D7DE';
    
    const instClassTypeLabel =
        (profile as any)?.institutions?.school_categories?.class_type ||
        (profile as any)?.institutions?.categories?.[0]?.class_type ||
        (profile as any)?.institutions?.school_categories?.level_label ||
        'Grade';

    const [user, setUser] = useState<UserRow | null>(null);
    const [roleData, setRoleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resettingLoading, setResettingLoading] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [resetResult, setResetResult] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');

    const [gradeLevel, setGradeLevel] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [parentContact, setParentContact] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [admissionDate, setAdmissionDate] = useState('');

    const [department, setDepartment] = useState('');
    const [qualification, setQualification] = useState('');
    const [position, setPosition] = useState('');

    const [occupation, setOccupation] = useState('');
    const [parentAddress, setParentAddress] = useState('');

    const [classId, setClassId] = useState<string | null>(null);
    const [subjectIds, setSubjectIds] = useState<string[]>([]);
    const [linkedStudents, setLinkedStudents] = useState<string[]>([]);
    const [linkedParents, setLinkedParents] = useState<string[]>([]);

    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [allParents, setAllParents] = useState<any[]>([]);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);
    const [studentGrades, setStudentGrades] = useState<any[]>([]);
    const [studentReports, setStudentReports] = useState<any[]>([]);
    const [loadingAcademics, setLoadingAcademics] = useState(false);
    const [hasSeniorSecondary, setHasSeniorSecondary] = useState(false);
    const [studentTrack, setStudentTrack] = useState<any>(null);
    const [nationalCheckpoints, setNationalCheckpoints] = useState<any[]>([]);
    const [allowedCheckpoints, setAllowedCheckpoints] = useState<any[]>([]);

    // Multi-role state (for admins who also teach / act as class teachers)
    const [isTeacherRoleEnabled, setIsTeacherRoleEnabled] = useState(false);
    const [teacherRecord, setTeacherRecord] = useState<any>(null);

    const computedAge = calculateAgeFromDob(dob);

    const mappedUser: User | null = user ? {
        id: user.id, 
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Unknown User', 
        email: user.email || '',
        role: user.role, 
        joinDate: user.created_at || new Date().toISOString(),
        displayId: roleData?.id || undefined, 
        avatar: user.avatar_url || undefined
    } : null;

    const isSelf = !!(user && profile && user.id === profile.id);

    useEffect(() => { 
        if (id) { 
            fetchUserDetails(); 
            if (profile) loadLookupData(); 
        } 
    }, [id, profile?.institution_id]);

    const loadLookupData = async () => {
        if (!profile?.institution_id) return;
        let classQuery = supabase.from('classes').select('id, name').order('name');
        let subjectQuery = supabase.from('subjects').select('id, title').order('title');
        let studentQuery = supabase.from('students').select('id, user_id, users!inner(first_name, last_name, institution_id), parent_students(parent_id, parents(users(first_name, last_name, full_name)))').order('id') as any;
        let parentQuery = supabase.from('parents').select('id, user_id, users!inner(first_name, last_name, institution_id)').order('id') as any;

        if (profile?.institution_id) {
            classQuery = classQuery.eq('institution_id', profile.institution_id);
            subjectQuery = subjectQuery.eq('institution_id', profile.institution_id);
            studentQuery = studentQuery.eq('users.institution_id', profile.institution_id);
            parentQuery = parentQuery.eq('users.institution_id', profile.institution_id);
        }

        const [classRes, subjectRes, studentRes, parentRes] = await Promise.all([
            supabase
                .from('classes')
                .select('id, name, grade_level, form_level, stream')
                .eq('institution_id', profile?.institution_id || '')
                .order('grade_level', { ascending: true })
                .order('form_level', { ascending: true })
                .order('stream', { ascending: true }),
            subjectQuery,
            studentQuery,
            parentQuery
        ]);
        if (classRes.data) {
            setClasses(
                classRes.data.map((cls: any) => ({
                    ...cls,
                    name: formatClassLabel(cls),
                }))
            );
        }
        if (subjectRes.data) setAllSubjects(subjectRes.data);
        if (studentRes.data) setStudents(studentRes.data);
        if (parentRes.data) setAllParents(parentRes.data);
    };

    const fetchUserDetails = async () => {
        if (!profile?.institution_id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .eq('institution_id', profile.institution_id)
                .single();
            if (userError) throw userError;
            const typedUser = userData as UserRow;
            setUser(typedUser);
            populateUserFields(typedUser);

            const role = typedUser?.role;
            let roleQuery: any = null;
            if (role === 'student') roleQuery = supabase
                .from('students')
                .select('*, class_enrollments(class_id), parent_students(parent_id)')
                .eq('user_id', id as string)
                .single();
            else if (role === 'teacher') roleQuery = supabase
                .from('teachers')
                .select('*')
                .eq('user_id', id as string)
                .single();
            else if (role === 'admin') roleQuery = supabase
                .from('admins')
                .select('*')
                .eq('user_id', id as string)
                .single();
            else if (role === 'parent') roleQuery = supabase
                .from('parents')
                .select('*, parent_students(student_id)')
                .eq('user_id', id as string)
                .single();

            if (roleQuery) {
                const { data: rData, error: rError } = await roleQuery;
                if (rError) console.error('[RELOAD] Role query error:', rError);
                if (!rError && rData) {
                    const nd = Array.isArray(rData) ? rData[0] : rData;
                    setRoleData(nd);
                    populateRoleFields(role, nd);

                    // Fallback: if the join didn't return parent_students, query directly
                    if (role === 'student' && (!nd.parent_students || nd.parent_students.length === 0) && nd.id) {
                        const { data: psData, error: psErr } = await supabase.from('parent_students').select('parent_id').eq('student_id', nd.id);
                        if (psData && psData.length > 0) {
                            const parentIds = psData.map((ps: any) => ps.parent_id);
                            setLinkedParents(parentIds);
                        } else {
                        }
                    }
                    // Fetch grades and reports for student profile view
                    if (role === 'student' && nd.id) {
                        fetchStudentGradesAndReports(nd.id);
                    }
                    if (role === 'parent' && (!nd.parent_students || nd.parent_students.length === 0) && nd.id) {
                        const { data: psData, error: psErr } = await supabase.from('parent_students').select('student_id').eq('parent_id', nd.id);
                        if (psData && psData.length > 0) {
                            const studentIds = psData.map((ps: any) => ps.student_id);
                            setLinkedStudents(studentIds);
                        } else {
                        }
                    }

                    if (role === 'teacher') {
                        const { data: subData } = await supabase.from('subjects').select('id').eq('teacher_id', nd.id);
                        if (subData) setSubjectIds(subData.map((s: any) => s.id));
                    }

                    if (role === 'admin') {
                        const { data: tData } = await supabase
                            .from('teachers')
                            .select('*')
                            .eq('user_id', id as string)
                            .maybeSingle();

                        if (tData) {
                            setIsTeacherRoleEnabled(true);
                            setTeacherRecord(tData);
                            setDepartment(tData.department || '');
                            setQualification(tData.qualification || '');
                            setPosition(tData.position || '');

                            const [subRes, clsRes] = await Promise.all([
                                supabase.from('subjects').select('id').eq('teacher_id', tData.id),
                                supabase.from('classes').select('id').eq('teacher_id', tData.id)
                            ]);
                            if (subRes.data) setSubjectIds(subRes.data.map((s: any) => s.id));
                            if (clsRes.data && clsRes.data.length > 0) setClassId(clsRes.data[0].id);
                        } else {
                            setIsTeacherRoleEnabled(false);
                            setTeacherRecord(null);
                        }
                    }
                }
            }
        } catch (error: any) {
            // If the record doesn't exist, NotFoundView renders cleanly without an intrusive alert
            if (error?.code !== 'PGRST116' && !error?.message?.includes('0 rows')) {
                Alert.alert('Error', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any)?.clipboard?.writeText) {
            (navigator as any).clipboard.writeText(text);
        } else {
            try {
                const { Clipboard } = require('react-native');
                Clipboard.setString(text);
            } catch (err) {
                console.error('Clipboard copy error:', err);
            }
        }
        Toast.show({
            type: 'success',
            text1: 'Copied',
            text2: `${label} copied to clipboard`,
            position: 'top',
        });
    };

    const confirmCredentialReset = async () => {
        if (!user || resettingLoading) return;
        if (isSelf) {
            Alert.alert(
                'Action Restricted',
                'Administrators cannot reset their own credentials through the management console. Please use Account Settings or contact Master Admin.'
            );
            return;
        }
        setResettingLoading(true);
        try {
            const res = await SettingsService.adminResetPassword(user.id);
            setResetResult({
                ...res,
                user: {
                    name: mappedUser?.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
                    email: user.email,
                    role: user.role,
                },
            });
            setShowResetModal(false);
            setShowResultModal(true);
            Toast.show({
                type: 'success',
                text1: 'Credentials Reset',
                text2: 'Temporary credential generated. All active sessions were revoked.',
                position: 'top',
            });
        } catch (err: any) {
            console.error('confirmCredentialReset error:', err);
            const errorMsg = err?.response?.data?.error || err.message || 'Failed to reset credentials';
            Toast.show({
                type: 'error',
                text1: 'Reset Failed',
                text2: errorMsg,
                position: 'top',
            });
            Alert.alert('Reset Failed', errorMsg);
        } finally {
            setResettingLoading(false);
        }
    };

    const populateUserFields = (u: any) => {
        setFirstName(u.first_name || ''); setLastName(u.last_name || ''); setEmail(u.email || ''); setPhone(u.phone || '');
        setGender(u.gender || ''); setDob(u.date_of_birth || ''); setAddress(u.address || '');
    };

    const populateRoleFields = (role: string, rd: any) => {
        if (role === 'student') {
            const levelValue = rd.grade_level ?? rd.form_level ?? '';
            setGradeLevel(levelValue.toString()); 
            setAcademicYear(rd.academic_year || '');
            setParentContact(rd.parent_contact || ''); setEmergencyName(rd.emergency_contact_name || '');
            setEmergencyPhone(rd.emergency_contact_phone || ''); setAdmissionDate(rd.admission_date || '');
            setClassId(rd.class_enrollments?.[0]?.class_id || null);
            setLinkedParents(rd.parent_students?.map((ps: any) => ps.parent_id) || []);
        } else if (role === 'teacher') {
            setDepartment(rd.department || ''); setQualification(rd.qualification || '');
            setPosition(rd.position || '');
            setClassId(rd.classes?.[0]?.id || null);
        } else if (role === 'parent') {
            setOccupation(rd.occupation || ''); setParentAddress(rd.address || '');
            setLinkedStudents(rd.parent_students?.map((ps: any) => ps.student_id) || []);
        }
    };

    const fetchStudentGradesAndReports = async (studentRecordId: string) => {
        try {
            setLoadingAcademics(true);

            // Fetch graded submissions (assignment grades)
            const { data: submissionsData } = await supabase
                .from('submissions')
                .select(`grade, assignment:assignments!inner(title, is_published, subject:subjects(title, id, credits))`)
                .eq('student_id', studentRecordId)
                .eq('status', 'graded')
                .eq('assignment.is_published', true);

            // Fetch exam results
            const { data: examResults } = await supabase
                .from('exam_results')
                .select(`score, exam:exams!inner(subject:subjects(id, title, credits))`)
                .eq('student_id', studentRecordId);

            // Aggregate by subject
            const subjectMap: Record<string, { total: number; count: number; name: string; credits: number; manualScore?: number }> = {};

            submissionsData?.forEach((sub: any) => {
                const subjectId = sub.assignment?.subject?.id;
                const score = Number(sub.grade);
                if (subjectId && !isNaN(score)) {
                    if (!subjectMap[subjectId]) {
                        subjectMap[subjectId] = { total: 0, count: 0, name: sub.assignment.subject.title, credits: sub.assignment.subject.credits || 0 };
                    }
                    subjectMap[subjectId].total += score;
                    subjectMap[subjectId].count += 1;
                }
            });

            examResults?.forEach((er: any) => {
                const subjectId = er.exam?.subject?.id;
                if (subjectId) {
                    if (!subjectMap[subjectId]) {
                        subjectMap[subjectId] = { total: 0, count: 0, name: er.exam.subject.title, credits: er.exam.subject.credits || 0 };
                    }
                    subjectMap[subjectId].manualScore = Number(er.score);
                }
            });

            const formattedGrades = Object.entries(subjectMap).map(([id, val]) => {
                const score = val.manualScore ?? (val.count > 0 ? (val.total / val.count) : 0);
                let letter = 'N/A';
                if (score >= 90) letter = 'A';
                else if (score >= 80) letter = 'B';
                else if (score >= 70) letter = 'C';
                else if (score >= 60) letter = 'D';
                else if (score > 0) letter = 'F';
                return { subjectName: val.name, subjectCode: 'ACAD-' + id.substring(0, 4).toUpperCase(), grade: letter, score: Math.round(score), credits: val.credits };
            });

            setStudentGrades(formattedGrades);

            // Fetch academic reports
            const { data: reportsData } = await supabase
                .from('academic_reports')
                .select('*')
                .eq('student_id', studentRecordId)
                .eq('institution_id', profile?.institution_id || '')
                .order('created_at', { ascending: false });

            setStudentReports(reportsData || []);

            // Check Senior Secondary coverage (Grade 10–12)
            const instId = profile?.institution_id || '';
            const { data: seniorClasses } = await (supabase.from as any)('classes')
                .select('id')
                .eq('institution_id', instId)
                .or('education_level.eq.senior_secondary,cbc_band.eq.senior_secondary,grade_level.gte.10')
                .limit(1);

            const hasSenior = Boolean(seniorClasses && seniorClasses.length > 0);
            setHasSeniorSecondary(hasSenior);

            if (hasSenior) {
                const { data: trackData } = await (supabase.from as any)('student_track_enrollments')
                    .select(`
                        id,
                        track_id,
                        elective_subject_ids,
                        institution_tracks (id, name, code, description)
                    `)
                    .eq('student_id', studentRecordId)
                    .maybeSingle();

                setStudentTrack(trackData);
            } else {
                setStudentTrack(null);
            }

            // Check National Assessment Checkpoints coverage
            const { data: instClasses } = await (supabase.from as any)('classes')
                .select('grade_level, education_level, cbc_band')
                .eq('institution_id', instId);

            const gradeLevels = new Set(instClasses?.map((c: any) => c.grade_level) || []);
            const schoolLevels = new Set(instClasses?.map((c: any) => c.education_level || c.cbc_band) || []);

            const allowedNames: string[] = [];
            if (gradeLevels.has(6) || schoolLevels.has('primary')) allowedNames.push('KPSEA');
            if (gradeLevels.has(9) || schoolLevels.has('junior_secondary')) allowedNames.push('KJSEA');
            if (gradeLevels.has(12) || schoolLevels.has('senior_secondary')) allowedNames.push('Senior Secondary Exit Checkpoint');

            setAllowedCheckpoints(allowedNames);

            if (allowedNames.length > 0) {
                const { data: records } = await (supabase.from as any)('national_assessment_records')
                    .select('*')
                    .eq('student_id', studentRecordId)
                    .in('checkpoint_name', allowedNames)
                    .order('assessment_year', { ascending: false });

                setNationalCheckpoints(records || []);
            } else {
                setNationalCheckpoints([]);
            }
        } catch (error) {
            console.error('[GRADES] Error fetching student grades/reports:', error);
        } finally {
            setLoadingAcademics(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert('Confirm Delete', 'Are you sure you want to permanently delete this user? This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        setLoading(true);
                        await api.delete(`/auth/delete-user/${id}`);
                        Alert.alert('Success', 'User deleted successfully');
                        router.replace('/(admin)/users');
                    } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to delete user'); setLoading(false); }
                }
            }
        ]);
    };

    const handleCancel = () => {
        if (user) populateUserFields(user);
        if (roleData && user) populateRoleFields(user.role, roleData);
        if (user?.role === 'admin') {
            if (teacherRecord) {
                setIsTeacherRoleEnabled(true);
                setDepartment(teacherRecord.department || '');
                setQualification(teacherRecord.qualification || '');
                setPosition(teacherRecord.position || '');
            } else {
                setIsTeacherRoleEnabled(false);
                setDepartment('');
                setQualification('');
                setPosition('');
                setSubjectIds([]);
                setClassId(null);
            }
        }
        setIsEditing(false);
    };
    

    const handleSave = async () => {
        if (!firstName.trim()) { Alert.alert('Validation', 'First name is required'); return; }
        setSaving(true);
        try {

            const body: any = {
                first_name: firstName,
                last_name: lastName,
                email,
                phone: phone || null,
                gender: gender || null,
                date_of_birth: dob || null,
                address: address || null,
            }

            if (user?.role === 'student') {
                const numericLevel = parseInt(gradeLevel.replace(/[^0-9]/g, '')) || null;
                Object.assign(body, {
                    grade_level: (instClassTypeLabel === 'Grade' || instClassTypeLabel === 'KG') ? numericLevel : null,
                    form_level: (instClassTypeLabel === 'Form') ? numericLevel : null,
                    academic_year: academicYear || null,
                    parent_contact: parentContact || null,
                    emergency_contact_name: emergencyName || null,
                    emergency_contact_phone: emergencyPhone || null,
                    admission_date: admissionDate || null,
                    class_id: classId ?? null,
                    linked_parents: linkedParents ?? []
                });
            }
            else if (user?.role === 'teacher') {
                Object.assign(body, {
                    department: department || null,
                    qualification: qualification || null,
                    position: position || null,
                    subject_ids: subjectIds ?? []
                });
            }
            else if (user?.role === 'parent') {
                Object.assign(body, {
                    occupation: occupation || null,
                    parent_address: parentAddress || null,
                    linked_students: linkedStudents ?? []
                });
            }
            else if (user?.role === 'admin') {
                Object.assign(body, {
                    teacher_role_enabled: isTeacherRoleEnabled,
                    department: isTeacherRoleEnabled ? (department || null) : null,
                    qualification: isTeacherRoleEnabled ? (qualification || null) : null,
                    position: isTeacherRoleEnabled ? (position || 'teacher') : null,
                    subject_ids: isTeacherRoleEnabled ? (subjectIds ?? []) : [],
                    class_teacher_id: isTeacherRoleEnabled ? (classId ?? null) : null
                });
            }


            const { data } = await api.put(`/auth/admin-update-user/${id}`, body);

            if (!data) throw new Error('Update failed');
            Alert.alert('Success', 'User updated successfully');
            setIsEditing(false);

            await fetchUserDetails();
        } catch (err: any) {
            console.error('[SAVE] ERROR:', err.message, JSON.stringify(err, null, 2));
            Alert.alert('Error', err.message);
        } finally {
            setSaving(false);
        }
    };

    // ---------- Render Helpers ----------
    const renderField = (label: string, value: string, setter: (v: string) => void, opts?: { type?: 'default' | 'email' | 'phone' }) => (
        <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border, alignItems: 'center' }}>
            <Text style={{ width: '40%', color: textSecondary, fontWeight: '500', fontSize: 13 }}>{label}</Text>
            {isEditing ? (
                <TextInput
                    value={value}
                    onChangeText={v => setter(opts?.type === 'email' ? sanitizeEmail(v) : opts?.type === 'phone' ? sanitizePhone(v) : sanitize(v))}
                    placeholderTextColor={textSecondary}
                    keyboardType={opts?.type === 'email' ? 'email-address' : opts?.type === 'phone' ? 'phone-pad' : 'default'}
                    style={{ flex: 1, textAlign: 'right', color: textPrimary, fontWeight: '500', fontSize: 13, backgroundColor: inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: inputBorder }}
                />
            ) : (
                <Text style={{ flex: 1, fontWeight: '500', fontSize: 13, textAlign: 'right', color: value ? textPrimary : textSecondary, fontStyle: value ? 'normal' : 'italic' }}>
                    {value || 'Not set'}
                </Text>
            )}
        </View>
    );

    const renderReadOnly = (label: string, value: string) => (
        <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}>
            <Text style={{ width: '40%', color: textSecondary, fontWeight: '500', fontSize: 13 }}>{label}</Text>
            <Text style={{ flex: 1, color: textPrimary, fontWeight: '500', fontSize: 13, textAlign: 'right' }}>{value || 'N/A'}</Text>
        </View>
    );

    const renderGenderPicker = () => {
        if (!isEditing) return renderReadOnly('Gender', gender || 'Not set');
        return (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                <Text style={{ color: textSecondary, fontWeight: '500', fontSize: 13, marginBottom: 8 }}>Gender</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['male', 'female', 'other'].map(g => (
                        <TouchableOpacity key={g} onPress={() => setGender(g)}
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: gender === g ? '#FF6900' : card, borderColor: gender === g ? '#FF6900' : border }}>
                            <Text style={{ fontSize: 13, fontWeight: '500', textTransform: 'capitalize', color: gender === g ? 'white' : textPrimary }}>{g}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderChipList = (label: string, items: any[], selectedIds: string[], setSelected: (ids: string[]) => void, displayFn: (item: any) => string, accentColor: string, maxSelect?: number, disableFn?: (item: any) => boolean) => {
        return (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: border }}>
                <Text style={{ color: textSecondary, fontWeight: '500', fontSize: 13, marginBottom: 10 }}>{label}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {items.map(item => {
                        const isSelected = selectedIds.includes(item.id);
                        const isDisabled = disableFn ? disableFn(item) : false;
                        if (!isEditing && !isSelected) return null;
                        return (
                            <TouchableOpacity key={item.id}
                                onPress={() => {
                                    if (!isEditing) return;
                                    if (isDisabled && !isSelected) return;
                                    let newIds: string[];
                                    if (isSelected) {
                                        newIds = selectedIds.filter(i => i !== item.id);
                                    } else {
                                        if (maxSelect === 1) {
                                            newIds = [item.id];
                                        } else if (maxSelect && selectedIds.length >= maxSelect) {
                                            newIds = [...selectedIds.slice(1), item.id];
                                        } else {
                                            newIds = [...selectedIds, item.id];
                                        }
                                    }
                                    setSelected(newIds);
                                }}
                                disabled={!isEditing || (isDisabled && !isSelected)}
                                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: isSelected ? accentColor + '20' : (isDark ? '#1e1e1e' : '#f9fafb'), borderColor: isSelected ? accentColor : border, opacity: isDisabled && !isSelected ? 0.4 : 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? accentColor : textSecondary }}>{displayFn(item)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {!isEditing && selectedIds.length === 0 && <Text style={{ color: textSecondary, fontStyle: 'italic', fontSize: 12 }}>None</Text>}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: bg, paddingHorizontal: 16, paddingTop: 20 }}>
                <ListItemSkeleton loading={loading} count={6} label="Loading user profile..." />
            </View>
        );
    }

    if (!user) {
        return (
            <NotFoundView
                mode="record"
                recordType="User"
                backPath="/(admin)/users"
                onRetry={fetchUserDetails}
            />
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

                {/* Header */}
                <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, paddingBottom: 0 }}>
                    {mappedUser && (
                        <UserCard
                            user={mappedUser} variant="detailed" showBackButton
                            onBackPress={() => router.back()} showActions={!isEditing}
                            onEditPress={() => setIsEditing(true)}
                            onResetCredentialsPress={isSelf ? undefined : () => setShowResetModal(true)}
                            onDeletePress={isSelf ? undefined : handleDelete}
                        />
                    )}
                </View>

                {/* Action buttons */}
                <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 12 }}>
                    {!isEditing ? (
                        <>
                            <TouchableOpacity onPress={() => setIsEditing(true)}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6900', paddingVertical: 14, borderRadius: 12 }}>
                                <Ionicons name="create-outline" size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Edit User</Text>
                            </TouchableOpacity>

                            {!isSelf && (
                                <TouchableOpacity 
                                    onPress={() => setShowResetModal(true)}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                                    <MaterialCommunityIcons name="lock-reset" size={20} color={textPrimary} />
                                    <Text style={{ color: textPrimary, fontWeight: '700', marginLeft: 8 }}>Reset Credentials</Text>
                                </TouchableOpacity>
                            )}

                            {!isSelf && (
                                <TouchableOpacity onPress={handleDelete}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#2c1a1a' : '#fef2f2', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#fecaca' }}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                    <Text style={{ color: '#ef4444', fontWeight: '700', marginLeft: 8 }}>Delete User</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={handleCancel}
                                style={{ flex: 1, backgroundColor: isDark ? '#1e1e1e' : '#f3f4f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: textPrimary }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} disabled={saving}
                                style={{ flex: 1, backgroundColor: '#FF6900', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={{ fontWeight: '700', color: 'white' }}>Save Changes</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Profile Info */}
                <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Profile Information</Text>
                    {renderReadOnly('User ID', roleData?.id || 'N/A')}
                    {renderReadOnly('Role', user.role)}
                    {renderReadOnly('Joined', user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A')}
                    {renderField('First Name', firstName, setFirstName)}
                    {renderField('Last Name', lastName, setLastName)}
                    {renderField('Email', email, setEmail, { type: 'email' })}
                    {renderField('Phone', phone, setPhone, { type: 'phone' })}
                    {renderGenderPicker()}
                    <DatePicker label="Date of Birth" value={dob} onChange={setDob} isDark={isDark} inline />
                    {renderReadOnly('Age', computedAge !== null ? `${computedAge} years` : 'Not set')}
                    {renderField('Address', address, setAddress)}
                </View>

                {/* Student */}
                {user.role === 'student' && roleData && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>📚 Student Details</Text>
                        <DatePicker label="Admission Date" value={admissionDate} onChange={setAdmissionDate} isDark={isDark} inline />
                        {renderField('Emergency Name', emergencyName, setEmergencyName)}
                        {renderField('Emergency Phone', emergencyPhone, setEmergencyPhone, { type: 'phone' })}
                        {renderField(`${instClassTypeLabel} Level`, gradeLevel, setGradeLevel)}
                        {renderChipList('Enrolled Class', classes, classId ? [classId] : [],
                            (ids) => setClassId(ids[ids.length - 1] ?? null),
                            c => c.name, '#10b981'
                        )}
                        {renderChipList('Linked Parents/Guardians', allParents, linkedParents, setLinkedParents, p => p.users ? `${p.users.first_name || ''} ${p.users.last_name || ''}`.trim() : p.id, '#6366f1', 1)}
                    </View>
                )}

                {/* Student Grades & Academic Performance */}
                {user.role === 'student' && roleData && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>📊 Grades & Academic Performance</Text>

                        {loadingAcademics ? (
                            <ListItemSkeleton loading={loadingAcademics} count={3} label="Loading academic performance..." />
                        ) : (
                            <>
                                {/* GPA Summary Row */}
                                {studentGrades.length > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: isDark ? '#161B22' : '#EAEEF2', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: border }}>
                                        <View style={{ alignItems: 'center', flex: 1 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Est. GPA</Text>
                                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FF6900', marginTop: 4 }}>
                                                {(studentGrades.reduce((a, c) => a + c.score, 0) / studentGrades.length / 25).toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: border }} />
                                        <View style={{ alignItems: 'center', flex: 1 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Credits</Text>
                                            <Text style={{ fontSize: 22, fontWeight: '900', color: textPrimary, marginTop: 4 }}>
                                                {studentGrades.reduce((a, c) => a + c.credits, 0)}
                                            </Text>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: border }} />
                                        <View style={{ alignItems: 'center', flex: 1 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Avg Score</Text>
                                            <Text style={{ fontSize: 22, fontWeight: '900', color: textPrimary, marginTop: 4 }}>
                                                {Math.round(studentGrades.reduce((a, c) => a + c.score, 0) / studentGrades.length)}%
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Subject Grades List */}
                                {studentGrades.length > 0 ? (
                                    studentGrades.map((g, idx) => (
                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < studentGrades.length - 1 ? 1 : 0, borderBottomColor: border }}>
                                            <View style={{
                                                width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                                                backgroundColor: g.grade.startsWith('A') ? '#10b98120' : g.grade.startsWith('B') ? '#3b82f620' : g.grade.startsWith('C') ? '#f59e0b20' : '#ef444420'
                                            }}>
                                                <Text style={{
                                                    fontWeight: '900', fontSize: 14,
                                                    color: g.grade.startsWith('A') ? '#10b981' : g.grade.startsWith('B') ? '#3b82f6' : g.grade.startsWith('C') ? '#f59e0b' : '#ef4444'
                                                }}>{g.grade}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 13 }}>{g.subjectName}</Text>
                                                <Text style={{ color: textSecondary, fontSize: 10, marginTop: 2 }}>{g.credits} Credits</Text>
                                            </View>
                                            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>{g.score}%</Text>
                                        </View>
                                    ))
                                ) : (
                                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                        <Ionicons name="school-outline" size={32} color={textSecondary} style={{ opacity: 0.4 }} />
                                        <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>No graded submissions yet</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* Academic Reports */}
                {user.role === 'student' && roleData && !loadingAcademics && studentReports.length > 0 && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#ec4899', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>📄 Academic Reports</Text>
                        {studentReports.map((report: any, idx: number) => {
                            const rData = report.data || {};
                            return (
                                <View key={report.id || idx} style={{ paddingVertical: 12, borderBottomWidth: idx < studentReports.length - 1 ? 1 : 0, borderBottomColor: border }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#FF6900', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                {report.report_type?.replace(/-/g, ' ') || 'Report'}
                                            </Text>
                                            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 15, marginTop: 2 }}>
                                                {report.term} {report.academic_year}
                                            </Text>
                                        </View>
                                        <View style={{
                                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                                            backgroundColor: report.status === 'published' ? '#10b98120' : '#f59e0b20'
                                        }}>
                                            <Text style={{
                                                fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
                                                color: report.status === 'published' ? '#10b981' : '#f59e0b'
                                            }}>{report.status}</Text>
                                        </View>
                                    </View>
                                    {(rData.gpa || rData.position) && (
                                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                                            {rData.gpa && <Text style={{ color: textSecondary, fontSize: 11 }}>GPA: <Text style={{ fontWeight: '700', color: textPrimary }}>{rData.gpa}</Text></Text>}
                                            {rData.position && <Text style={{ color: textSecondary, fontSize: 11 }}>Rank: <Text style={{ fontWeight: '700', color: textPrimary }}>{rData.position}/{rData.total_students || '-'}</Text></Text>}
                                        </View>
                                    )}
                                    {rData.comments && (
                                        <Text style={{ color: textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 6 }}>&quot;{rData.comments}&quot;</Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Senior Secondary Specialization Track - Only visible if Grade 10-12 covered */}
                {user.role === 'student' && roleData && hasSeniorSecondary && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                            🎓 Senior Secondary Specialization Track
                        </Text>
                        {studentTrack?.institution_tracks ? (
                            <View style={{ backgroundColor: isDark ? '#161B22' : '#F0F9FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BAE6FD' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#38BDF8' : '#0369A1' }}>
                                        {studentTrack.institution_tracks.name}
                                    </Text>
                                    <View style={{ backgroundColor: '#0284C720', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284C7' }}>
                                            {studentTrack.institution_tracks.code}
                                        </Text>
                                    </View>
                                </View>
                                {studentTrack.institution_tracks.description ? (
                                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                                        {studentTrack.institution_tracks.description}
                                    </Text>
                                ) : null}
                            </View>
                        ) : (
                            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                                <Text style={{ color: textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                                    No specialization track currently assigned
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* External National Assessment Checkpoints (KPSEA, KJSEA) - Scoped to relevant school levels */}
                {user.role === 'student' && roleData && allowedCheckpoints.length > 0 && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                            🎖️ National Assessment Checkpoints
                        </Text>
                        {nationalCheckpoints.length > 0 ? (
                            nationalCheckpoints.map((cp: any, idx: number) => {
                                const DESCRIPTOR_LABELS: Record<string, { label: string; color: string }> = {
                                    exceeding_expectation: { label: 'Exceeding Expectation', color: '#10b981' },
                                    meeting_expectation: { label: 'Meeting Expectation', color: '#3b82f6' },
                                    approaching_expectation: { label: 'Approaching Expectation', color: '#f59e0b' },
                                    below_expectation: { label: 'Below Expectation', color: '#ef4444' },
                                };
                                const descInfo = DESCRIPTOR_LABELS[cp.overall_descriptor] || { label: cp.overall_descriptor, color: textPrimary };
                                return (
                                    <View key={cp.id || idx} style={{ paddingVertical: 10, borderBottomWidth: idx < nationalCheckpoints.length - 1 ? 1 : 0, borderBottomColor: border }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>
                                                    {cp.checkpoint_name}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                                    Assessment Year: {cp.assessment_year}
                                                </Text>
                                            </View>
                                            <View style={{ backgroundColor: `${descInfo.color}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: `${descInfo.color}40` }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: descInfo.color }}>
                                                    {descInfo.label}
                                                </Text>
                                            </View>
                                        </View>
                                        {cp.placement_notes ? (
                                            <Text style={{ fontSize: 11, color: textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                                                {cp.placement_notes}
                                            </Text>
                                        ) : null}
                                    </View>
                                );
                            })
                        ) : (
                            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                                <Text style={{ color: textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                                    No national assessment checkpoint records filed
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Teacher */}
                {user.role === 'teacher' && roleData && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>👨‍🏫 Teacher Details</Text>
                        {renderField('Position', position, setPosition)}
                        {renderChipList('Assigned Subjects', allSubjects, subjectIds, setSubjectIds, s => s.title, '#3b82f6')}
                        {renderChipList('Assigned Classes', 
                            classes, 
                            classId ? [classId] : [], 
                            (ids) => setClassId(ids[ids.length - 1] ?? null), 
                            c => c.name, 
                            '#3b82f6')
                        }
                    </View>
                )}

                {/* Parent */}
                {user.role === 'parent' && roleData && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>👨‍👩‍👧 Parent/Guardian Details</Text>
                        {renderField('Occupation', occupation, setOccupation)}
                        {renderField('Address', parentAddress, setParentAddress)}
                        {renderChipList(
                            'Linked Children',
                            students,
                            linkedStudents,
                            setLinkedStudents,
                            s => {
                                const parentInfo = s.parent_students?.[0]?.parents?.users;
                                const parentName = parentInfo ? (`${parentInfo.first_name || ''} ${parentInfo.last_name || ''}`.trim() || parentInfo.full_name) : null;
                                const baseName = s.users ? `${s.users.first_name || ''} ${s.users.last_name || ''}`.trim() : s.id;
                                return parentName && !linkedStudents.includes(s.id) ? `${baseName} (Linked: ${parentName})` : baseName;
                            },
                            '#f59e0b',
                            undefined,
                            s => {
                                const isLinkedToOther = s.parent_students && s.parent_students.length > 0 && s.parent_students[0].parent_id !== roleData?.id;
                                return !!isLinkedToOther;
                            }
                        )}
                    </View>
                )}

                {/* Admin Multi-role Section */}
                {user.role === 'admin' && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                                    Teacher / Class Teacher Role
                                </Text>
                                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                    Allow this administrator to teach subjects, manage classes as class teacher, and toggle to Teacher Portal
                                </Text>
                            </View>
                            {isEditing ? (
                                <Switch
                                    value={isTeacherRoleEnabled}
                                    onValueChange={setIsTeacherRoleEnabled}
                                    trackColor={{ false: isDark ? '#21262D' : '#D0D7DE', true: '#FF6900' }}
                                />
                            ) : (
                                <View style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    backgroundColor: isTeacherRoleEnabled ? (isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5') : (isDark ? 'rgba(107,114,128,0.2)' : '#F3F4F6'),
                                }}>
                                    <Text style={{
                                        fontSize: 11,
                                        fontWeight: '700',
                                        color: isTeacherRoleEnabled ? '#10B981' : textSecondary,
                                    }}>
                                        {isTeacherRoleEnabled ? 'Active' : 'Disabled'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {isTeacherRoleEnabled && (
                            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: border }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                                    👨‍🏫 Teacher Details & Assignments
                                </Text>
                                {renderField('Department', department, setDepartment)}
                                {renderField('Position (e.g. Class Teacher, Teacher)', position, setPosition)}
                                {renderChipList('Assigned Subjects', allSubjects, subjectIds, setSubjectIds, s => s.title, '#3b82f6')}
                                {renderChipList(
                                    'Class Teacher Assignment (Assigned Class)',
                                    classes,
                                    classId ? [classId] : [],
                                    (ids) => setClassId(ids[ids.length - 1] ?? null),
                                    c => c.name,
                                    '#3b82f6'
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Permissions */}
                <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Role Permissions</Text>
                    {getPermissionsForRole(user.role).map((perm, index) => (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                            <Text style={{ marginLeft: 8, color: textPrimary, fontSize: 13 }}>{perm}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Credential Reset Confirmation Modal */}
            <Modal
                visible={showResetModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!resettingLoading) setShowResetModal(false);
                }}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                }}>
                    <View style={{
                        backgroundColor: card,
                        borderColor: border,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 20,
                        width: '100%',
                        maxWidth: 440,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2', padding: 8, borderRadius: 10, marginRight: 10 }}>
                                <MaterialCommunityIcons name="lock-reset" size={24} color="#DC2626" />
                            </View>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 18 }}>
                                Confirm Credential Reset
                            </Text>
                        </View>

                        {!!user && (
                            <View style={{
                                backgroundColor: inputBg,
                                borderColor: border,
                                borderWidth: 1,
                                borderRadius: 10,
                                padding: 12,
                                marginBottom: 14,
                            }}>
                                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>
                                    {mappedUser?.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'}
                                </Text>
                                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                    Email: {user.email || 'N/A'}
                                </Text>
                                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>
                                    Role: {user.role || 'User'}
                                </Text>
                            </View>
                        )}

                        <View style={{
                            backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
                            borderColor: isDark ? '#7f1d1d' : '#FCA5A5',
                            borderWidth: 1,
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 16,
                        }}>
                            <Text style={{ color: '#B91C1C', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                                Security Action Notice
                            </Text>
                            <Text style={{ color: isDark ? '#FCA5A5' : '#991B1B', fontSize: 12, lineHeight: 18 }}>
                                Reset credentials for <Text style={{ fontWeight: '800' }}>{mappedUser?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'this user'}</Text>? This will generate a new temporary credential, force logout all active sessions, and require password + security question setup at next login.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => setShowResetModal(false)}
                                disabled={resettingLoading}
                                style={{
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderRadius: 10,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    backgroundColor: inputBg,
                                }}
                            >
                                <Text style={{ color: textSecondary, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={confirmCredentialReset}
                                disabled={resettingLoading}
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#DC2626',
                                    borderRadius: 10,
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    backgroundColor: '#DC2626',
                                    minWidth: 110,
                                    alignItems: 'center',
                                    }}
                            >
                                {resettingLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Confirm Reset</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Temporary Credential Result Modal */}
            <Modal
                visible={showResultModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowResultModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                    zIndex: 100000,
                    elevation: 100000,
                }}>
                    <View style={{
                        backgroundColor: card,
                        borderColor: border,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 20,
                        width: '100%',
                        maxWidth: 460,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={{ color: textPrimary, fontSize: 19, fontWeight: '800' }}>Temporary Credential</Text>
                            <TouchableOpacity onPress={() => setShowResultModal(false)}>
                                <MaterialCommunityIcons name="close" size={22} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ borderWidth: 1, borderColor: border, borderRadius: 12, padding: 14, backgroundColor: inputBg }}>
                            {!!(resetResult?.user?.email || resetResult?.email) && (
                                <Text style={{ color: textSecondary, fontSize: 13, marginBottom: 8 }}>
                                    Login Email: <Text style={{ color: textPrimary, fontWeight: '700' }}>{resetResult?.user?.email || resetResult?.email}</Text>
                                </Text>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ color: textSecondary, fontSize: 13 }}>Temporary Password:</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        const pwd = resetResult?.tempPassword;
                                        if (pwd) copyToClipboard(pwd, 'Password');
                                    }}
                                    style={{ backgroundColor: '#FF6900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Copy Password</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 10, letterSpacing: 1 }}>
                                {resetResult?.tempPassword || 'N/A'}
                            </Text>

                            {!!resetResult?.credential_delivery?.url && (
                                <View style={{ marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: border }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ color: textSecondary, fontSize: 12 }}>One-Time Credential Link:</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                const url = resetResult.credential_delivery.url;
                                                if (url) copyToClipboard(url, 'Link');
                                            }}
                                            style={{ borderWidth: 1, borderColor: border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                        >
                                            <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>Copy Link</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={{ color: textPrimary, fontSize: 12, marginTop: 4 }} numberOfLines={1} ellipsizeMode="middle">
                                        {resetResult.credential_delivery.url}
                                    </Text>
                                    <Text style={{ color: '#FF6900', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                                        ⏱ {formatCredentialExpiry(resetResult.credential_delivery.expiresAt)}
                                    </Text>
                                </View>
                            )}

                            {!!resetResult?.credential_document && (
                                <TouchableOpacity
                                    onPress={() => copyToClipboard(resetResult.credential_document, 'Credentials Document')}
                                    style={{ marginTop: 10, backgroundColor: isDark ? '#21262D' : '#E5E7EB', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' }}
                                >
                                    <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>Copy Full Credentials Document</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8 }}>
                                User will be forced to logout of all sessions and complete password and security question setup at next login.
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => setShowResultModal(false)}
                            style={{ marginTop: 14, backgroundColor: '#FF6900', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getPermissionsForRole = (role: string) => {
    switch (role) {
        case 'admin': return ['Full System Access', 'Manage Users & Roles', 'Configure Settings', 'View All Data'];
        case 'teacher': return ['Manage Assigned Subjects', 'Record Attendance', 'Grade Assessments', 'View Assigned Classes'];
        case 'student': return ['Enroll in Subjects', 'View Personal Grades', 'Access Library Resources', 'View Timetable'];
        case 'parent': return ['View Linked Children', 'Monitor Attendance', 'View Fee Statements', 'Communicate with Teachers'];
        default: return ['Basic Access'];
    }
};
