import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { GlobalSettingsContent } from "../../components/GlobalSettingsDrawer";

export default function Settings() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ manual?: string }>();
  const userRole = profile?.role || "parent";
  const initialScreen = params.manual === '1' ? 'settings' : 'menu';

  return (
    <View style={{ flex: 1 }}>
      <GlobalSettingsContent userRole={userRole} initialScreen={initialScreen} />
    </View>
  )
}
