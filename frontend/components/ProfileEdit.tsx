import { supabase } from '@/libs/supabase'; // Adjust path if needed, usually in lib or services
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, ChevronLeft, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface EditFormProps {
  visible: boolean
  onClose: () => void
  currentUser?: any // Pass current user data to pre-fill
  onUpdate?: () => void // Callback after update
}

const AuthView = ({ onBack, isVerified, authCode, onAuthChange }: any) => {
  return (
    <View>
      <TouchableOpacity onPress={onBack} className="flex-row items-center mb-6">
        <ChevronLeft size={20} color="#FF6B00" />
        <Text className="text-orange-500 font-bold ml-1">Back to Profile</Text>
      </TouchableOpacity>

      <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
        Security Verification
      </Text>

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-2">Enter Authentication code</Text>
          <View className="relative">
            <TextInput
              className={`bg-gray-50 p-4 rounded-2xl border ${isVerified ? 'border-orange-500' : 'border-gray-100'} text-gray-900`}
              placeholder="Enter 6-digit code (123456)"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={6}
              value={authCode}
              onChangeText={onAuthChange}
            />
            {isVerified && (
              <View className="absolute right-4 top-4">
                <CheckCircle2 size={24} color="#10b981" />
              </View>
            )}
          </View>
        </View>

        {/* These fields only unlock if isVerified is true */}
        <View className={isVerified ? 'opacity-100' : 'opacity-40'}>
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">New Password</Text>
            <TextInput
              editable={isVerified}
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              placeholder="*******"
              secureTextEntry
              autoCapitalize='none'
            />
          </View>

          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Confirm New Password</Text>
            <TextInput
              editable={isVerified}
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              placeholder="*******"
              secureTextEntry
              autoCapitalize='none'
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export const ProfileEdit = ({ visible, onClose, currentUser, onUpdate }: EditFormProps) => {
  const [loading, setLoading] = useState(false)
  const [authCode, setAuthCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [currentView, setCurrentView] = useState<'profile' | 'auth'>('profile')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCurrentView('profile')
      setLoading(false)
      setIsVerified(false)
      setAuthCode('')
    } else {
      // Pre-fill
      if (currentUser?.avatar_url) setAvatarUrl(currentUser.avatar_url);
    }
  }, [visible, currentUser])

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

      // Fetch the image as an array buffer
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Image buffer is empty');
      }

      // Get file extension with fallback
      const uriParts = uri.split('.');
      const fileExt = uriParts.length > 1 ? uriParts.pop()?.toLowerCase() : 'jpg';
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const safeExt = validExtensions.includes(fileExt || '') ? fileExt : 'jpg';

      const fileName = `${Date.now()}.${safeExt}`;
      const filePath = `${fileName}`;

      // This requires 'avatars' bucket to be public or authorized
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${safeExt}`,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      // Silently fail - don't alert user, just don't update avatar
      return;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const updates: any = {
        updated_at: new Date(),
        avatar_url: avatarUrl
      };

      const { error } = await supabase.from('users').update(updates).eq('id', currentUser.id);
      if (error) throw error;

      Alert.alert("Success", "Profile updated");
      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setCurrentView('auth')
    }, 2000)
  }

  const handleAuthCodeChange = (text: string) => {
    setAuthCode(text)
    if (text === '123456') {
      setIsVerified(true)
    } else {
      setIsVerified(false)
    }
  }

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
              {currentView === "profile" ? (
                <View>
                  {/* Avatar Section */}
                  <View className="items-center mb-8">
                    <TouchableOpacity onPress={pickImage} className="relative">
                      <View className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden items-center justify-center border-4 border-white shadow-sm">
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} className="w-full h-full" />
                        ) : (
                          <Text className="text-gray-400 text-2xl font-bold">
                            {currentUser?.full_name?.charAt(0) || "U"}
                          </Text>
                        )}
                      </View>
                      <View className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full border-2 border-white">
                        {uploading ? <ActivityIndicator size="small" color="white" /> : <Camera size={14} color="white" />}
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View className="mb-8">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Identity
                    </Text>
                    <View className="space-y-4">
                      <View>
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                          Full Name
                        </Text>
                        <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <Text className="text-gray-500 text-base">
                            {currentUser?.full_name || 'Alex Reed'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="pt-6 border-t border-gray-100">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Security
                    </Text>
                    <View className="bg-orange-50 p-5 rounded-2xl mb-6 border border-orange-100">
                      <Text className="text-gray-900 text-sm leading-5">
                        To change your password, we will send a 6-digit code to
                        your email.
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={loading}
                      className="bg-white border-2 border-orange-500 p-4 rounded-2xl items-center"
                      onPress={handleRequestCode}
                    >
                      {loading ? (
                        <ActivityIndicator color="#ff6900" />
                      ) : (
                        <Text className="text-orange-500 font-bold text-base">
                          Request Verification Code
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <AuthView
                  onBack={() => setCurrentView("profile")}
                  isVerified={isVerified}
                  authCode={authCode}
                  onAuthChange={handleAuthCodeChange}
                />
              )}

              {/* Universal Footer Buttons */}
              <View className="mt-10 mb-10 space-y-3">
                <TouchableOpacity
                  disabled={(currentView === "auth" && !isVerified) || loading}
                  onPress={currentView === "profile" ? handleSave : undefined}
                  className={`p-4 rounded-2xl items-center ${(currentView === "auth" && !isVerified) || loading
                    ? "bg-gray-100"
                    : "bg-orange-500 shadow-md active:opacity-90"}`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className={`font-bold text-lg 
                        ${currentView === "auth" && !isVerified
                        ? 'text-gray-500' : 'text-white'}`}>
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
