import { supabase, authService } from '@/libs/supabase'; // Adjust path if needed, usually in lib or services
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

interface EditFormProps {
  visible: boolean
  onClose: () => void
  currentUser?: any // Pass current user data to pre-fill
  onUpdate?: () => void // Callback after update
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export const ProfileEdit = ({ visible, onClose, currentUser, onUpdate }: EditFormProps) => {
  const { profile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  useEffect(() => {
    if (!visible) {
      setLoading(false);
    } else if (profile) {
      // Pre-fill from database via context profile
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setAvatarUrl(profile.avatar_url || null);
      setAddress(profile.address || '');
      setGender(profile.gender || '');
      setDateOfBirth(profile.date_of_birth || '');
    }
  }, [visible, profile]);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to upload avatars.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];

        // Validate the asset has required properties
        if (!asset.uri || !asset.type) {
          Alert.alert('Error', 'Selected image is invalid');
          return;
        }

        uploadAvatar(asset.uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);

      if (!uri) {
        throw new Error('Invalid image URI');
      }

      // Validate file extension
      const uriParts = uri.split('.');
      const fileExt = uriParts.length > 1 ? uriParts.pop()?.toLowerCase() : '';
      if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
        Alert.alert('Invalid File Type', `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`);
        return;
      }

      // Fetch the image as an array buffer
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Image buffer is empty');
      }

      // Validate file size
      if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
        Alert.alert('File Too Large', 'Profile pictures must be under 5MB. Please choose a smaller image.');
        return;
      }

      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // This requires 'avatars' bucket to be public or authorized
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const updates: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl,
        address: address.trim() || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
      };

      const { error } = await authService.updateProfile(updates);
      if (error) throw error;

      // Keep Auth metadata in sync
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim()
        }
      });
      if (authError) {
        console.warn("Auth user metadata sync warning:", authError.message);
      }

      // Refresh context profile
      await refreshProfile();

      Alert.alert("Success", "Profile updated successfully");
      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-[32px] h-[85%] w-full shadow-xl"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center py-3">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </View>

          <View className="flex-row items-center justify-between px-6 pb-4 border-b border-gray-50">
            <Text className="text-xl font-bold text-gray-800">
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-gray-100 rounded-full"
            >
              <X size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
              <View>
                {/* Avatar Section */}
                <View className="items-center mb-8">
                  <TouchableOpacity onPress={pickImage} className="relative">
                    <View className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden items-center justify-center border-4 border-white shadow-sm">
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} className="w-full h-full" />
                      ) : (
                        <Text className="text-gray-400 text-2xl font-bold">
                          {firstName?.charAt(0) || profile?.full_name?.charAt(0) || "U"}
                        </Text>
                      )}
                    </View>
                    <View className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full border-2 border-white">
                      {uploading ? <ActivityIndicator size="small" color="white" /> : <Camera size={14} color="white" />}
                    </View>
                  </TouchableOpacity>
                  <Text className="text-gray-400 text-xs mt-2">JPG, PNG or WebP · Max 5MB</Text>
                </View>

                <View className="mb-8">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Identity
                  </Text>
                  <View className="space-y-4">
                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        First Name
                      </Text>
                      <TextInput
                        className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
                        placeholder="First Name"
                        placeholderTextColor="#9ca3af"
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>

                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Last Name
                      </Text>
                      <TextInput
                        className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
                        placeholder="Last Name"
                        placeholderTextColor="#9ca3af"
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>

                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Mobile Number
                      </Text>
                      <TextInput
                        className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
                        placeholder="Mobile Number"
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>

                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Email Address (Assigned)
                      </Text>
                      <View className="bg-gray-100 p-4 rounded-2xl border border-gray-200">
                        <Text className="text-gray-500 text-base">
                          {email}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Personal Details Section */}
                <View className="mb-8">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Personal Details
                  </Text>
                  <View className="space-y-4">
                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Residence / Address
                      </Text>
                      <TextInput
                        className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
                        placeholder="Enter your address"
                        placeholderTextColor="#9ca3af"
                        value={address}
                        onChangeText={setAddress}
                      />
                    </View>

                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Gender
                      </Text>
                      <View className="flex-row gap-2">
                        {GENDER_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option}
                            onPress={() => setGender(option)}
                            className={`flex-1 p-4 rounded-2xl border items-center ${
                              gender === option
                                ? 'bg-orange-50 border-orange-500'
                                : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <Text className={`font-semibold capitalize text-sm ${
                              gender === option ? 'text-orange-600' : 'text-gray-500'
                            }`}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Date of Birth
                      </Text>
                      <TextInput
                        className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#9ca3af"
                        value={dateOfBirth}
                        onChangeText={setDateOfBirth}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Footer Buttons */}
              <View className="mt-4 mb-10 space-y-3">
                <TouchableOpacity
                  disabled={loading}
                  onPress={handleSave}
                  className={`p-4 rounded-2xl items-center ${loading
                    ? "bg-gray-100"
                    : "bg-orange-500 shadow-md active:opacity-90"}`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-bold text-lg text-white">
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="p-4 rounded-2xl items-center"
                >
                  <Text className="text-gray-500 font-semibold">Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
