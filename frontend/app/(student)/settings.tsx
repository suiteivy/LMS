import { View} from "react-native";
import StudentSettingsDrawer from "../../components/StudentSettingsDrawer";

export default function Settings() {
    return (
        <View className="flex-grow bg-bgMain">
            <StudentSettingsDrawer/>
        </View>
    )
}