import { View } from "react-native";
import { GlobalSettingsContent } from "../../components/GlobalSettingsDrawer";
import { useAuth } from "@/contexts/AuthContext";

export default function MasterSettings() {
    const { canonicalRole } = useAuth();
    return (
        <View style={{ flex: 1 }}>
            <GlobalSettingsContent userRole={(canonicalRole as any) || "master_admin"} />
        </View>
    );
}
