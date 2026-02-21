import { View } from "react-native";
import { GlobalSettingsContent } from "../../components/GlobalSettingsDrawer";

export default function TeacherSettings() {
    const userRole = "teacher";
    return (
        <View style={{ flex: 1 }}>
            <GlobalSettingsContent userRole={userRole} />
        </View>
    );
}
