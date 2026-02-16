import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, ActivityIndicator, TouchableOpacity,
    Alert, TextInput, Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/libs/supabase';
import { Database } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';

type UserRow = Database['public']['Tables']['users']['Row'];
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function UserDetailsScreen() {
    const { id: idParam } = useLocalSearchParams();
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const router = useRouter();

    const [user, setUser] = useState<UserRow | null>(null);
    const [roleData, setRoleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Editable fields — users table
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');

    // Editable fields — student
    const [gradeLevel, setGradeLevel] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [parentContact, setParentContact] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [admissionDate, setAdmissionDate] = useState('');

    // Editable fields — teacher
    const [department, setDepartment] = useState('');
    const [qualification, setQualification] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [position, setPosition] = useState('');
    const [hireDate, setHireDate] = useState('');

    // Editable fields — parent
    const [occupation, setOccupation] = useState('');
    const [parentAddress, setParentAddress] = useState('');

    useEffect(() => {
        if (id) fetchUserDetails();
    }, [id]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            const { data: userData, error: userError } = await supabase
                .from('users').select('*').eq('id', id).single();
            if (userError) throw userError;
            const typedUser = userData as UserRow;
            setUser(typedUser);
            populateUserFields(typedUser);

            let roleQuery = null;
            const role = typedUser?.role;
            if (role === 'student') roleQuery = supabase.from('students').select('*').eq('user_id', id as string).single();
            else if (role === 'teacher') roleQuery = supabase.from('teachers').select('*').eq('user_id', id as string).single();
            else if (role === 'admin') roleQuery = supabase.from('admins').select('*').eq('user_id', id as string).single();
            else if (role === 'parent') roleQuery = supabase.from('parents').select('*').eq('user_id', id as string).single();

            if (roleQuery) {
                const { data: rData, error: rError } = await roleQuery;
                if (!rError && rData) {
                    const normalizedData = Array.isArray(rData) ? rData[0] : rData;
                    setRoleData(normalizedData);
                    populateRoleFields(role, normalizedData);
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const populateUserFields = (u: any) => {
        setFullName(u.full_name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setGender(u.gender || '');
        setDob(u.date_of_birth || '');
        setAddress(u.address || '');
    };

    const populateRoleFields = (role: string, rd: any) => {
        if (role === 'student') {
            setGradeLevel(rd.grade_level || '');
            setAcademicYear(rd.academic_year || '');
            setParentContact(rd.parent_contact || '');
            setEmergencyName(rd.emergency_contact_name || '');
            setEmergencyPhone(rd.emergency_contact_phone || '');
            setAdmissionDate(rd.admission_date || '');
        } else if (role === 'teacher') {
            setDepartment(rd.department || '');
            setQualification(rd.qualification || '');
            setSpecialization(rd.specialization || '');
            setPosition(rd.position || '');
            setHireDate(rd.hire_date || '');
        } else if (role === 'parent') {
            setOccupation(rd.occupation || '');
            setParentAddress(rd.address || '');
        }
    };

    const handleCancel = () => {
        if (user) populateUserFields(user);
        if (roleData && user) populateRoleFields(user.role, roleData);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Validation', 'Full name is required');
            return;
        }
        setSaving(true);
        try {
            const body: any = {
                full_name: fullName,
                email,
                phone: phone || undefined,
                gender: gender || undefined,
                date_of_birth: dob || undefined,
                address: address || undefined,
            };

            if (user?.role === 'student') {
                body.grade_level = gradeLevel || undefined;
                body.academic_year = academicYear || undefined;
                body.parent_contact = parentContact || undefined;
                body.emergency_contact_name = emergencyName || undefined;
                body.emergency_contact_phone = emergencyPhone || undefined;
                body.admission_date = admissionDate || undefined;
            } else if (user?.role === 'teacher') {
                body.department = department || undefined;
                body.qualification = qualification || undefined;
                body.specialization = specialization || undefined;
                body.position = position || undefined;
                body.hire_date = hireDate || undefined;
            } else if (user?.role === 'parent') {
                body.occupation = occupation || undefined;
                body.parent_address = parentAddress || undefined;
            }

            const response = await fetch(`${API_URL}/api/auth/admin-update-user/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Update failed');

            Alert.alert('Success', 'User updated successfully');
            setIsEditing(false);
            fetchUserDetails(); // Refresh data
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
    };

    // ---- Render Helpers ----
    const renderField = (label: string, value: string, setter: (v: string) => void, opts?: { placeholder?: string; editable?: boolean }) => {
        const isAdmin = opts?.editable !== false; // all fields editable by admin
        return (
            <View className="flex-row py-3 border-b border-gray-50">
                <Text className="w-2/5 text-gray-500 font-medium text-sm">{label}</Text>
                {isEditing && isAdmin ? (
                    <TextInput
                        value={value}
                        onChangeText={setter}
                        placeholder={opts?.placeholder || `Enter ${label.toLowerCase()}`}
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 text-right text-gray-900 font-medium text-sm bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                    />
                ) : (
                    <Text className={`flex-1 font-medium text-sm text-right ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {value || 'Not set'}
                    </Text>
                )}
            </View>
        );
    };

    const renderReadOnly = (label: string, value: string) => (
        <View className="flex-row py-3 border-b border-gray-50">
            <Text className="w-2/5 text-gray-500 font-medium text-sm">{label}</Text>
            <Text className="flex-1 text-gray-900 font-medium text-sm text-right">{value || 'N/A'}</Text>
        </View>
    );

    const renderGenderPicker = () => {
        if (!isEditing) {
            return renderReadOnly('Gender', gender || 'Not set');
        }
        return (
            <View className="py-3 border-b border-gray-50">
                <Text className="text-gray-500 font-medium text-sm mb-2">Gender</Text>
                <View className="flex-row gap-2">
                    {['male', 'female', 'other'].map(g => (
                        <TouchableOpacity key={g} onPress={() => setGender(g)}
                            className={`px-4 py-2 rounded-full border ${gender === g ? 'bg-black border-black' : 'bg-white border-gray-200'}`}>
                            <Text className={`text-sm font-medium capitalize ${gender === g ? 'text-white' : 'text-gray-700'}`}>{g}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="black" />
            </View>
        );
    }

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-gray-500">User not found</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'User Details', headerBackTitle: 'Back' }} />

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                {/* Profile Header */}
                <View className="items-center py-8 bg-white border-b border-gray-100">
                    <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-4 overflow-hidden border-4 border-white shadow-sm">
                        <Text className="text-3xl font-bold text-gray-500">{getInitials(user.full_name)}</Text>
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">{user.full_name}</Text>
                    <Text className="text-gray-500 text-sm mb-2">{user.email}</Text>

                    <View className="flex-row items-center gap-2 mt-2">
                        <View className={`px-3 py-1 rounded-full ${paramsToColor(user.role)}`}>
                            <Text className={`text-xs font-bold uppercase ${paramsToTextColor(user.role)}`}>
                                {user.role}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Edit Toggle Button */}
                <View className="px-6 pt-4">
                    {!isEditing ? (
                        <TouchableOpacity
                            onPress={() => setIsEditing(true)}
                            className="flex-row items-center justify-center bg-black py-3 rounded-xl"
                        >
                            <Ionicons name="create-outline" size={18} color="white" />
                            <Text className="text-white font-bold ml-2">Edit User</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={handleCancel}
                                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                            >
                                <Text className="font-bold text-gray-700">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                className="flex-1 bg-black py-3 rounded-xl items-center"
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text className="font-bold text-white">Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Basic Info */}
                <View className="mx-6 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
                    <Text className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Profile Information</Text>
                    {renderReadOnly('User ID', roleData?.id || 'N/A')}
                    {renderReadOnly('Role', user.role)}
                    {renderReadOnly('Joined', format(new Date(user.created_at), 'MMM dd, yyyy'))}
                    {renderField('Full Name', fullName, setFullName)}
                    {renderField('Email', email, setEmail, { placeholder: 'email@example.com' })}
                    {renderField('Phone', phone, setPhone, { placeholder: '+254 7XX XXX XXX' })}
                    {renderGenderPicker()}
                    {renderField('Date of Birth', dob, setDob, { placeholder: 'YYYY-MM-DD' })}
                    {renderField('Address', address, setAddress)}
                </View>

                {/* Student-specific */}
                {user.role === 'student' && roleData && (
                    <View className="mx-6 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
                        <Text className="text-sm font-bold text-green-600 uppercase tracking-wide mb-2">📚 Student Details</Text>
                        {renderField('Grade Level', gradeLevel, setGradeLevel)}
                        {renderField('Academic Year', academicYear, setAcademicYear, { placeholder: '2026' })}
                        {renderField('Parent Contact', parentContact, setParentContact)}
                        {renderField('Admission Date', admissionDate, setAdmissionDate, { placeholder: 'YYYY-MM-DD' })}
                        {renderField('Emergency Name', emergencyName, setEmergencyName)}
                        {renderField('Emergency Phone', emergencyPhone, setEmergencyPhone)}
                    </View>
                )}

                {/* Teacher-specific */}
                {user.role === 'teacher' && roleData && (
                    <View className="mx-6 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
                        <Text className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-2">👨‍🏫 Teacher Details</Text>
                        {renderField('Department', department, setDepartment)}
                        {renderField('Qualification', qualification, setQualification)}
                        {renderField('Specialization', specialization, setSpecialization)}
                        {renderField('Position', position, setPosition)}
                        {renderField('Hire Date', hireDate, setHireDate, { placeholder: 'YYYY-MM-DD' })}
                    </View>
                )}

                {/* Parent-specific */}
                {user.role === 'parent' && roleData && (
                    <View className="mx-6 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
                        <Text className="text-sm font-bold text-yellow-600 uppercase tracking-wide mb-2">👨‍👩‍👧 Parent Details</Text>
                        {renderField('Occupation', occupation, setOccupation)}
                        {renderField('Address', parentAddress, setParentAddress)}
                    </View>
                )}

                {/* Spacer */}
                <View className="h-8" />
            </ScrollView>
        </View>
    );
}

const paramsToColor = (role: string) => {
    switch (role) {
        case 'admin': return 'bg-blue-100';
        case 'teacher': return 'bg-purple-100';
        case 'student': return 'bg-green-100';
        case 'parent': return 'bg-yellow-100';
        default: return 'bg-gray-100';
    }
}
const paramsToTextColor = (role: string) => {
    switch (role) {
        case 'admin': return 'text-blue-700';
        case 'teacher': return 'text-purple-700';
        case 'student': return 'text-green-700';
        case 'parent': return 'text-yellow-700';
        default: return 'text-gray-700';
    }
}
