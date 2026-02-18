import React, { useState } from "react";
import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ImageBackground, Dimensions, Pressable, Modal, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get('window');
// Calculating height: 3/4 of half the screen
const CARD_HEIGHT = (height / 2) * 0.5;

const ROLE_FEATURES = {
  student: ["View Assignments", "Check Grades", "Access Library", "Submit Work"],
  teacher: ["Manage Classes", "Grade Students", "Lesson Planning", "Analytics"],
  parent: ["Track Progress", "Attendance Reports", "Teacher Chat", "Fee Payments"],
};

const Trial = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  // Modal popup states
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'parent' | 'teacher'| 'student' | null>(null)
  const [guestDetails, setGuestDetails] = useState({
    name: '',
    email: ''
    }
  )

  const openTrialModal = (role: 'parent' | 'teacher' | 'student') => {
    setSelectedRole(role)
    setModalVisible(true)
  }

  const handleTrialLogin = async () => {
    setIsLoading(true);

    if(!guestDetails.name || !guestDetails.email){
      Alert.alert("Required", "Please provide a name and an email. ")
      return
    }

    setModalVisible(false)
    try {
      const demoEmail = `demo_${selectedRole}@example.com`;
      const demoPassword = `Demo1234`;

      const { error } = await signIn(demoEmail, demoPassword);

      if (error) {
        Alert.alert("Trial Unavailable", "The demo environment is currently undergoing maintenance.");
        setIsLoading(false)
        return;
      }
      // router.push('')
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView>
      <ScrollView>  
        <View className="mt-4 px-6 pb-10">
          <View className="flex-row items-center justify-center mb-8 relative">
            <TouchableOpacity
              onPress={() => router.push('/')}
              className="absolute left-0 p-2 z-10" // Absolute left to keep title centered
            >
              <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <Text className="text-gray-400 font-black uppercase tracking-[3px] text-[10px]">
              Select a Demo Experience
            </Text>
          </View>

          {isLoading ? (
            <View style={{ height: CARD_HEIGHT * 2 }} className="justify-center">
                <ActivityIndicator size="large" color="#fd6900" />
            </View>
          ) : (
            <View className="gap-6">
              {/* Student & Teacher Trial Card */}
              <TouchableOpacity
                onPress={() => openTrialModal("student")}
                activeOpacity={0.7}
                style={{ height: CARD_HEIGHT }}
                className="rounded-xl overflow-hidden shadow-xl shadow-orange-200 border border-orange-100  hover:translate-y-4"
              >
                <ImageBackground
                  source={{ uri: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800' }}
                  className="flex-1 justify-end p-8"
                  blurRadius={1} // Reduced blur to see the image better
                >
                  {/* Gradient-like overlay for text legibility */}
                  <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" 
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                  
                  <View className="flex-row items-end justify-between">
                    <View className="flex-1 mr-4">
                      <Text className="text-white font-black text-3xl">Student Module</Text>
                      <Text className="text-white text-md mt-2 font-medium">Explore assignments & grades</Text>
                    </View>
                    <View className="bg-orange-500 p-4 rounded-3xl shadow-lg">
                        <Ionicons name="school" size={32} color="white" />
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>

              {/* Parent Trial Card */}
              
              <TouchableOpacity
                onPress={() => openTrialModal("parent")}
                activeOpacity={0.9}
                style={{ height: CARD_HEIGHT }}
                className="rounded-xl overflow-hidden shadow-xl shadow-blue-400 border border-blue-100"
              >
                <ImageBackground
                  source={{ uri: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800' }}
                  className="flex-1 justify-end p-8"
                  blurRadius={1}
                >
                  <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                  
                  <View className="flex-row items-end justify-between">
                    <View className="flex-1 mr-4">
                      <Text className="text-white font-black text-3xl">Parent Module</Text>
                      <Text className="text-white text-lg mt-2 font-medium">Track progress & communication</Text>
                    </View>
                    <View className="bg-blue-500 p-4 rounded-3xl shadow-lg">
                        <Ionicons name="people" size={32} color="white" />
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>

              {/* Teacher Trial card */}
              <TouchableOpacity
                onPress={() => openTrialModal("teacher")}
                activeOpacity={0.9}
                style={{ height: CARD_HEIGHT }}
                className="rounded-xl overflow-hidden shadow-xl shadow-blue-400 border border-blue-100"
              >
                <ImageBackground
                  source={{ uri: 'https://plus.unsplash.com/premium_photo-1661380797814-d0bcc01342b7?auto=format&fit=crop&q=80&w=800' }}
                  className="flex-1 justify-end p-8"
                  blurRadius={1}
                >
                  <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                  
                  <View className="flex-row items-end justify-between">
                    <View className="flex-1 mr-4">
                      <Text className="text-white font-black text-3xl">Parent Module</Text>
                      <Text className="text-white text-lg mt-2 font-medium">Track progress & communication</Text>
                    </View>
                    <View className="bg-blue-500 p-4 rounded-3xl shadow-lg">
                        <Ionicons name="hourglass" size={32} color="white" />
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            </View>
          )}

          <Modal visible={modalVisible} animationType="fade" transparent={true}>
            <View className="flex-1 justify-center items-center bg-black/60 px-6">
              <View className="bg-white w-full rounded-[32px] overflow-hidden shadow-2xl">
                {/* Header Accent */}
                <View className="bg-orange-500 py-3 items-center">
                  <Text className="text-white font-bold text-xs uppercase tracking-widest">
                    {selectedRole} Experience
                  </Text>
                </View>

                <View className="p-8">
                  <Text className="text-2xl font-black text-gray-900 mb-2">Personalize Trial</Text>
                  <Text className="text-gray-500 mb-6 text-sm">You'll be able to explore:</Text>

                  {/* Feature List */}
                  <View className="flex-row flex-wrap mb-8 gap-2">
                    {selectedRole && ROLE_FEATURES[selectedRole].map((feature, index) => (
                      <View key={index} className="flex-row items-center bg-orange-50 px-3 py-2 rounded-full border border-orange-100">
                        <Ionicons name="checkmark-circle" size={14} color="#fd6900" />
                        <Text className="text-orange-800 text-xs font-bold ml-1">{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Form Section */}
                  <View className="border-t border-gray-100 pt-6">
                    <TextInput
                      placeholder="Full Name"
                      className="bg-gray-100 p-4 rounded-xl mb-4 font-bold"
                      value={guestDetails.name}
                      onChangeText={(t) => setGuestDetails({ ...guestDetails, name: t })}
                    />
                    
                    <TextInput
                      placeholder="Your Email"
                      keyboardType="email-address"
                      className="bg-gray-100 p-4 rounded-xl mb-6 font-bold"
                      value={guestDetails.email}
                      onChangeText={(t) => setGuestDetails({ ...guestDetails, email: t })}
                    />

                    <View className="flex-row gap-3 items-center justify-center gap-x-6 mt-2">
                      <TouchableOpacity 
                        onPress={() => setModalVisible(false)}
                        className= "shadow-md shadow-gray-200 py-4 px-4 items-center"
                      >
                        <Text className="text-gray-600 font-bold">Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleTrialLogin()}
                        className="bg-orange-500 px-10 py-4 rounded-2xl items-center shadow-md shadow-orange-200"
                      >
                        <Text className="text-white font-bold">Start Demo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Trial;