import { DatePicker } from '@/components/common/DatePicker';
import { UserCard } from '@/components/common/UserCard';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { Database } from '@/types/database';
import { User } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, Text,
    TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UserRow = Database['public']['Tables']['users']['Row'];

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// ---------- Sanitizers ----------
const DANGEROUS_CHARS = /['"`;\\<>{}()\[\]|&$#%^*+=~]/g;
const sanitize = (v: string) => v.replace(DANGEROUS_CHARS, '');
const sanitizeEmail = (v: string) => v.replace(/[^a-zA-Z0-9@._+\-]/g, '');
const sanitizePhone = (v: string) => v.replace(/[^0-9+\-\s()]/g, '');

export default function UserDetailsScreen() {
    const { id: idParam } = useLocalSearchParams();
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    // Theme shorthands
    const bg = isDark ? '#121212' : '#f9fafb';
    const card = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#e5e7eb';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const inputBg = isDark ? '#1e1e1e' : '#f9fafb';
    const inputBorder = isDark ? '#2c2c2c' : '#e5e7eb';

    const [user, setUser] = useState<UserRow | null>(null);
    const [roleData, setRoleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [fullName, setFullName] = useState('');
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
    const [specialization, setSpecialization] = useState('');
    const [position, setPosition] = useState('');
    const [hireDate, setHireDate] = useState('');

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

    const mappedUser: User | null = user ? {
        id: user.id, name: user.full_name, email: user.email,
        role: user.role, joinDate: user.created_at,
        displayId: roleData?.id || undefined, avatar: user.avatar_url || undefined
    } : null;

    useEffect(() => { if (id) { fetchUserDetails(); loadLookupData(); } }, [id]);

    const loadLookupData = async () => {
        const [classRes, subjectRes, studentRes, parentRes] = await Promise.all([
            supabase.from('classes').select('id, name').order('name'),
            supabase.from('subjects').select('id, title').order('title'),
            supabase.from('students').select('id, user_id, users:user_id(full_name)').order('id'),
            supabase.from('parents').select('id, user_id, users:user_id(full_name)').order('id'),
        ]);
        if (classRes.data) setClasses(classRes.data);
        if (subjectRes.data) setAllSubjects(subjectRes.data);
        if (studentRes.data) setStudents(studentRes.data);
        if (parentRes.data) setAllParents(parentRes.data);
    };

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', id).single();
            if (userError) throw userError;
            const typedUser = userData as UserRow;
            setUser(typedUser);
            populateUserFields(typedUser);

            const role = typedUser?.role;
            let roleQuery: any = null;
            if (role === 'student') roleQuery = supabase.from('students').select('*, class_enrollments(class_id), parent_students(parent_id)').eq('user_id', id as string).single();
            else if (role === 'teacher') roleQuery = supabase.from('teachers').select('*, classes(id)').eq('user_id', id as string).single();
            else if (role === 'admin') roleQuery = supabase.from('admins').select('*').eq('user_id', id as string).single();
            else if (role === 'parent') roleQuery = supabase.from('parents').select('*, parent_students(student_id)').eq('user_id', id as string).single();

            if (roleQuery) {
                const { data: rData, error: rError } = await roleQuery;
                if (!rError && rData) {
                    const nd = Array.isArray(rData) ? rData[0] : rData;
                    setRoleData(nd);
                    populateRoleFields(role, nd);
                    if (role === 'teacher') {
                        const { data: subData } = await supabase.from('subjects').select('id').eq('teacher_id', nd.id);
                        if (subData) setSubjectIds(subData.map((s: any) => s.id));
                    }
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const populateUserFields = (u: any) => {
        setFullName(u.full_name || ''); setEmail(u.email || ''); setPhone(u.phone || '');
        setGender(u.gender || ''); setDob(u.date_of_birth || ''); setAddress(u.address || '');
    };

    const populateRoleFields = (role: string, rd: any) => {
        if (role === 'student') {
            setGradeLevel(rd.grade_level || ''); setAcademicYear(rd.academic_year || '');
            setParentContact(rd.parent_contact || ''); setEmergencyName(rd.emergency_contact_name || '');
            setEmergencyPhone(rd.emergency_contact_phone || ''); setAdmissionDate(rd.admission_date || '');
            setClassId(rd.enrollments?.[0]?.class_id || null);
            setLinkedParents(rd.parent_students?.map((ps: any) => ps.parent_id) || []);
        } else if (role === 'teacher') {
            setDepartment(rd.department || ''); setQualification(rd.qualification || '');
            setSpecialization(rd.specialization || ''); setPosition(rd.position || ''); setHireDate(rd.hire_date || '');
            setClassId(rd.classes?.[0]?.id || null);
        } else if (role === 'parent') {
            setOccupation(rd.occupation || ''); setParentAddress(rd.address || '');
            setLinkedStudents(rd.parent_students?.map((ps: any) => ps.student_id) || []);
        }
    };

    const handleDelete = async () => {
        Alert.alert('Confirm Delete', 'Are you sure you want to permanently delete this user? This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        setLoading(true);
                        const response = await fetch(`${API_URL}/api/auth/delete-user/${id}`, { method: 'DELETE' });
                        if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to delete user'); }
                        Alert.alert('Success', 'User deleted successfully');
                        router.replace('/(admin)/users');
                    } catch (err: any) { Alert.alert('Error', err.message); setLoading(false); }
                }
            }
        ]);
    };

    const handleCancel = () => {
        if (user) populateUserFields(user);
        if (roleData && user) populateRoleFields(user.role, roleData);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!fullName.trim()) { Alert.alert('Validation', 'Full name is required'); return; }
        setSaving(true);
        try {
            const body: any = { full_name: fullName, email, phone: phone || undefined, gender: gender || undefined, date_of_birth: dob || undefined, address: address || undefined };
            if (user?.role === 'student') { Object.assign(body, { grade_level: gradeLevel || undefined, academic_year: academicYear || undefined, parent_contact: parentContact || undefined, emergency_contact_name: emergencyName || undefined, emergency_contact_phone: emergencyPhone || undefined, admission_date: admissionDate || undefined, class_id: classId, linked_parents: linkedParents }); }
            else if (user?.role === 'teacher') { Object.assign(body, { department: department || undefined, qualification: qualification || undefined, specialization: specialization || undefined, position: position || undefined, hire_date: hireDate || undefined, subject_ids: subjectIds, class_teacher_id: classId }); }
            else if (user?.role === 'parent') { Object.assign(body, { occupation: occupation || undefined, parent_address: parentAddress || undefined, linked_students: linkedStudents }); }

            const response = await fetch(`${API_URL}/api/auth/admin-update-user/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Update failed');
            Alert.alert('Success', 'User updated successfully');
            setIsEditing(false);
            fetchUserDetails();
        } catch (err: any) {
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
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: gender === g ? '#FF6B00' : card, borderColor: gender === g ? '#FF6B00' : border }}>
                            <Text style={{ fontSize: 13, fontWeight: '500', textTransform: 'capitalize', color: gender === g ? 'white' : textPrimary }}>{g}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderChipList = (label: string, items: any[], selectedIds: string[], setSelected: (ids: string[]) => void, displayFn: (item: any) => string, accentColor: string) => (
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: border }}>
            <Text style={{ color: textSecondary, fontWeight: '500', fontSize: 13, marginBottom: 10 }}>{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {items.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    if (!isEditing && !isSelected) return null;
                    return (
                        <TouchableOpacity key={item.id}
                            onPress={() => { if (!isEditing) return; setSelected(isSelected ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id]); }}
                            disabled={!isEditing}
                            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: isSelected ? accentColor + '20' : (isDark ? '#1e1e1e' : '#f9fafb'), borderColor: isSelected ? accentColor : border }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? accentColor : textSecondary }}>{displayFn(item)}</Text>
                        </TouchableOpacity>
                    );
                })}
                {!isEditing && selectedIds.length === 0 && <Text style={{ color: textSecondary, fontStyle: 'italic', fontSize: 12 }}>None</Text>}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
                <Text style={{ color: textSecondary }}>User not found</Text>
            </View>
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
                            onEditPress={() => setIsEditing(true)} onDeletePress={handleDelete}
                        />
                    )}
                </View>

                {/* Action buttons */}
                <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 12 }}>
                    {!isEditing ? (
                        <>
                            <TouchableOpacity onPress={() => setIsEditing(true)}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B00', paddingVertical: 14, borderRadius: 12 }}>
                                <Ionicons name="create-outline" size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Edit User</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#2c1a1a' : '#fef2f2', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#fecaca' }}>
                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                <Text style={{ color: '#ef4444', fontWeight: '700', marginLeft: 8 }}>Delete User</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={handleCancel}
                                style={{ flex: 1, backgroundColor: isDark ? '#1e1e1e' : '#f3f4f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ fontWeight: '700', color: textPrimary }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} disabled={saving}
                                style={{ flex: 1, backgroundColor: '#FF6B00', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
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
                    {renderReadOnly('Joined', format(new Date(user.created_at), 'MMM dd, yyyy'))}
                    {renderField('Full Name', fullName, setFullName)}
                    {renderField('Email', email, setEmail, { type: 'email' })}
                    {renderField('Phone', phone, setPhone, { type: 'phone' })}
                    {renderGenderPicker()}
                    <DatePicker label="Date of Birth" value={dob} onChange={setDob} isDark={isDark} inline />
                    {renderField('Address', address, setAddress)}
                </View>

                {/* Student */}
                {user.role === 'student' && roleData && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>📚 Student Details</Text>
                        <DatePicker label="Admission Date" value={admissionDate} onChange={setAdmissionDate} isDark={isDark} inline />
                        {renderField('Emergency Name', emergencyName, setEmergencyName)}
                        {renderField('Emergency Phone', emergencyPhone, setEmergencyPhone, { type: 'phone' })}
                        {renderChipList('Enrolled Class', classes, classId ? [classId] : [],
                            (ids) => setClassId(ids[ids.length - 1] ?? null),
                            c => c.name, '#10b981'
                        )}
                        {renderChipList('Linked Parents', allParents, linkedParents, setLinkedParents, p => p.users?.full_name || p.id, '#6366f1')}
                    </View>
                )}

                {/* Teacher */}
                {user.role === 'teacher' && roleData && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>👨‍🏫 Teacher Details</Text>
                        {renderField('Specialization', specialization, setSpecialization)}
                        {renderField('Position', position, setPosition)}
                        <DatePicker label="Hire Date" value={hireDate} onChange={setHireDate} isDark={isDark} inline />
                        {renderChipList('Assigned Subjects', allSubjects, subjectIds, setSubjectIds, s => s.title, '#3b82f6')}
                        {renderChipList('Assigned as Class Teacher', classes, classId ? [classId] : [],
                            (ids) => setClassId(ids[ids.length - 1] ?? null),
                            c => c.name, '#3b82f6'
                        )}
                    </View>
                )}

                {/* Parent */}
                {user.role === 'parent' && roleData && (
                    <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>👨‍👩‍👧 Parent Details</Text>
                        {renderField('Occupation', occupation, setOccupation)}
                        {renderField('Address', parentAddress, setParentAddress)}
                        {renderChipList('Linked Children', students, linkedStudents, setLinkedStudents, s => s.users?.full_name || s.id, '#f59e0b')}
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