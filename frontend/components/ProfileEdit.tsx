import { View, Text, Modal, Pressable, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native'
import { X, Camera, ChevronLeft, CheckCircle2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'

interface EditFormProps {
  visible: boolean
  onClose: () => void
}

const AuthView = ({ onBack, isVerified, authCode, onAuthChange }: any) => {
  return (
    <View>
      <TouchableOpacity onPress={onBack} className="flex-row items-center mb-6">
        <ChevronLeft size={20} color="#0d9488" />
        <Text className="text-teal-600 font-bold ml-1">Back to Profile</Text>
      </TouchableOpacity>

      <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
        Security Verification
      </Text>

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-2">Enter Authentication code</Text>
          <View className="relative">
            <TextInput
              className={`bg-gray-50 p-4 rounded-2xl border ${isVerified ? 'border-teal-500' : 'border-gray-100'} text-gray-900`}
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

export const ProfileEdit = ({ visible, onClose }: EditFormProps) => {
  const [loading, setLoading] = useState(false)
  const [authCode, setAuthCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [currentView, setCurrentView] = useState<'profile' | 'auth'>('profile')

  useEffect(() => {
    if (!visible) {
      setCurrentView('profile')
      setLoading(false)
      setIsVerified(false)
      setAuthCode('')
    }
  }, [visible])

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
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
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
                  {/* Identity Section Code Here... */}
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
                            Alex Reed
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="pt-6 border-t border-gray-100">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Security
                    </Text>
                    <View className="bg-teal-50/50 p-5 rounded-2xl mb-6 border border-teal-100">
                      <Text className="text-teal-800 text-sm leading-5">
                        To change your password, we will send a 6-digit code to
                        your email.
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={loading}
                      className="bg-white border-2 border-teal-600 p-4 rounded-2xl items-center"
                      onPress={handleRequestCode}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0d9488" />
                      ) : (
                        <Text className="text-teal-600 font-bold text-base">
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
                  disabled={currentView === "auth" && !isVerified}
                  className={`p-4 rounded-2xl items-center ${
                    currentView === "auth" && !isVerified
                      ? "bg-gray-100"
                      : "bg-teal-600 shadow-md active:opacity-90"
                  }`}
                >
                  <Text className={`font-bold text-lg 
                    ${currentView === "auth" && !isVerified
                      ? 'text-gray-500' : 'text-white'}`}>
                    Save Changes
                  </Text>
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