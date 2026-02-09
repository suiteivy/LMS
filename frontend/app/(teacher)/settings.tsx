import { View } from "react-native";
import GlobalSettingsDrawer from "../../components/GlobalSettingsDrawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function TeacherSettings() {
    const userRole = "teacher";
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <GlobalSettingsDrawer userRole={userRole} />
            </View>
        </GestureHandlerRootView>
    );
}
