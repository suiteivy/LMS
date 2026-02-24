import { useAuth } from "@/contexts/AuthContext";
import { View } from "react-native";
import { GlobalSettingsContent } from "../../components/GlobalSettingsDrawer";

export default function Settings() {
    const { profile } = useAuth();
    const userRole = profile?.role || "student";

    return (
        <View style={{ flex: 1 }}>
            <GlobalSettingsContent userRole={userRole} />
        </View>
    )
}
