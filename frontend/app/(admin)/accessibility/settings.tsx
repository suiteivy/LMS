import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { GlobalSettingsContent } from "../../../components/GlobalSettingsDrawer";

export default function AdminAccessibilitySettings() {
  const params = useLocalSearchParams<{ manual?: string }>();
  const initialScreen = params.manual === '1' ? 'settings' : 'menu';

  return (
    <View style={{ flex: 1 }}>
      <GlobalSettingsContent userRole="admin" initialScreen={initialScreen} />
    </View>
  );
}
