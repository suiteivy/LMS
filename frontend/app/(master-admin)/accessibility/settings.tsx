import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { GlobalSettingsContent } from "../../../components/GlobalSettingsDrawer";

export default function MasterAccessibilitySettings() {
  const { canonicalRole } = useAuth();
  const params = useLocalSearchParams<{ manual?: string }>();
  const initialScreen = params.manual === '1' ? 'settings' : 'menu';

  return (
    <View style={{ flex: 1 }}>
      <GlobalSettingsContent userRole={(canonicalRole as any) || "master_admin"} initialScreen={initialScreen} />
    </View>
  );
}
