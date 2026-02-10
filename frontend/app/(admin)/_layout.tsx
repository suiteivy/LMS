import { Slot } from 'expo-router';
import { SchoolProvider } from '@/contexts/SchoolContext';
import { AuthGuard } from '@/components/AuthGuard';
import { View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminLayout() {
    const insets = useSafeAreaInsets();

    return (
        <AuthGuard allowedRoles={['admin']}>
            <SchoolProvider>
                {/* Use a subtle background color for the entire admin area */}
                <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                    <StatusBar barStyle="dark-content" />

                    {/* Header Area with Safe Area Padding */}
                    <View style={{ paddingTop: insets.top }} className="bg-white shadow-sm shadow-gray-100">
                        {/* You could put a persistent School Header here if desired */}
                    </View>

                    {/* Main Content */}
                    <View className="flex-1">
                        <Slot />
                    </View>
                </View>
            </SchoolProvider>
        </AuthGuard>
    );
}