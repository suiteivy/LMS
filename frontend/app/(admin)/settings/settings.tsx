import { View } from "react-native";
import { GlobalSettingsContent } from "../../../components/GlobalSettingsDrawer";

export default function Settings() {
    const userRole = "admin"
    return (
        <View style={{ flex: 1 }}>
            <GlobalSettingsContent userRole={userRole} />
        </View>
    )
}
