import { View } from "react-native";
import GlobalSettingsDrawer from "../../components/GlobalSettingsDrawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
    const { profile } = useAuth();
    const userRole = profile?.role || "student";

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <GlobalSettingsDrawer userRole={userRole} />
            </View>
        </GestureHandlerRootView>
    )
}
