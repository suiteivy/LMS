import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

interface InstitutionBrandingModalProps {
  visible: boolean;
  onClose: () => void;
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const InstitutionBrandingModal: React.FC<InstitutionBrandingModalProps> = ({
  visible,
  onClose,
}) => {
  const { isDark } = useTheme();
  const { institutionName, institutionLogo, profile, refreshProfile } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>(institutionLogo || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState(institutionLogo || '');
  const [useUrlMode, setUseUrlMode] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setLogoUrl(institutionLogo || '');
      setUrlInput(institutionLogo || '');
    }
  }, [visible, institutionLogo]);

  const bg = isDark ? '#161B22' : '#FFFFFF';
  const surface = isDark ? '#0D1117' : '#F6F8FA';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to upload an institution logo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        await uploadLogo(asset.uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      setUploading(true);
      const uriParts = uri.split('.');
      const fileExt = uriParts.length > 1 ? uriParts.pop()?.toLowerCase() : 'png';

      if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
        Alert.alert('Invalid File Type', `Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return;
      }

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Image buffer is empty');
      }

      if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
        Alert.alert('File Too Large', 'Logo must be under 5MB.');
        return;
      }

      const fileName = `institution_logo_${profile?.institution_id || Date.now()}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.warn('Supabase storage upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setLogoUrl(data.publicUrl);
      setUrlInput(data.publicUrl);
    } catch (err: any) {
      console.error('Logo upload error:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not upload logo to storage.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalLogoUrl = useUrlMode ? urlInput.trim() : logoUrl.trim();
      
      const payload = {
        logo_url: finalLogoUrl || null,
      };

      await api.put('/institutions', payload);
      await refreshProfile();

      Toast.show({
        type: 'success',
        text1: 'Branding Updated',
        text2: 'Institution logo has been saved system-wide.',
        position: 'top',
      });
      onClose();
    } catch (err: any) {
      console.error('Save logo error:', err);
      Alert.alert('Save Failed', err?.response?.data?.error || err?.message || 'Could not save institution logo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await api.put('/institutions', { logo_url: null });
      setLogoUrl('');
      setUrlInput('');
      await refreshProfile();
      Toast.show({
        type: 'info',
        text1: 'Logo Removed',
        text2: 'Institution branding reverted to system default.',
        position: 'top',
      });
      onClose();
    } catch (err: any) {
      console.error('Remove logo error:', err);
      Alert.alert('Error', 'Failed to remove logo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,11,46,0.4)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: bg,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: border,
            overflow: 'hidden',
            boxShadow: [{ offsetX: 0, offsetY: 12, blurRadius: 28, color: 'rgba(0,0,0,0.25)' }],
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: border,
              backgroundColor: surface,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(255,107,0,0.15)' : '#fff7ed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="images" size={20} color="#FF6B00" />
              </View>
              <View>
                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16 }}>
                  Institution Branding
                </Text>
                <Text style={{ color: textMuted, fontSize: 12, marginTop: 1 }}>
                  {institutionName || 'School Logo & Visual Identity'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 20 }}>
            {/* Logo Preview Card */}
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 24,
                paddingHorizontal: 16,
                backgroundColor: surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: border,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#161B22' : '#FFFFFF',
                  borderWidth: 2,
                  borderColor: logoUrl ? '#FF6B00' : border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginBottom: 12,
                }}
              >
                {uploading ? (
                  <ActivityIndicator color="#FF6B00" />
                ) : logoUrl ? (
                  <Image
                    source={{ uri: logoUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="school" size={42} color={textMuted} />
                    <Text style={{ color: textMuted, fontSize: 10, marginTop: 4 }}>Default</Text>
                  </View>
                )}
              </View>

              <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 14 }}>
                {logoUrl ? 'Active Institution Logo' : 'Default LMS Logo'}
              </Text>
              <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                This logo appears on navigation headers, report cards, timetables, and exported documents.
              </Text>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={uploading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FF6B00',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                    Upload Image
                  </Text>
                </TouchableOpacity>

                {logoUrl ? (
                  <TouchableOpacity
                    onPress={handleRemove}
                    disabled={saving}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Direct URL entry toggle */}
            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setUseUrlMode(!useUrlMode)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600' }}>
                  {useUrlMode ? '▲ Hide Direct URL Input' : '▼ Or enter Image URL directly'}
                </Text>
              </TouchableOpacity>

              {useUrlMode && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: surface,
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="link-outline" size={18} color={textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    value={urlInput}
                    onChangeText={(val) => {
                      setUrlInput(val);
                      setLogoUrl(val);
                    }}
                    placeholder="https://example.com/logo.png"
                    placeholderTextColor={textMuted}
                    style={{
                      flex: 1,
                      color: textPrimary,
                      fontSize: 13,
                    }}
                  />
                </View>
              )}
            </View>

            {/* Footer action */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || uploading}
                style={{
                  flex: 1,
                  backgroundColor: '#FF6B00',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                    Save Branding
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 14 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
