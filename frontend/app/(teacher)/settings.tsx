import { View } from "react-native";
import { GlobalSettingsContent } from "../../components/GlobalSettingsDrawer";
import { useTheme } from "@/contexts/ThemeContext";

export default function TeacherSettings() {
    const userRole = "teacher";
    const { isDark } = useTheme();
    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#ffffff' }}>
            <GlobalSettingsContent userRole={userRole} />
        </View>
    );
}
