import { View } from "react-native";
import { GlobalSettingsContent } from "../../components/GlobalSettingsDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { FormFieldSkeleton } from "@/components/ui/skeletons";

export default function MasterSettings() {
    const { canonicalRole, loading, isProfileLoading } = useAuth();
    const showLoading = loading || isProfileLoading;

    if (showLoading) {
        return (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }}>
                <FormFieldSkeleton loading={showLoading} count={8} label="Loading settings..." />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <GlobalSettingsContent userRole={(canonicalRole as any) || "master_admin"} />
        </View>
    );
}
