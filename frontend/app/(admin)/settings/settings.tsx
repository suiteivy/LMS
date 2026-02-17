import { View} from "react-native";
import GlobalSettingsDrawer, { GlobalSettingsContent } from "../../../components/GlobalSettingsDrawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Settings() {
    const userRole = "admin"
    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <View style={{flex:1}}>
                <GlobalSettingsContent userRole={userRole} />
            </View>
        </GestureHandlerRootView>
    )
}
