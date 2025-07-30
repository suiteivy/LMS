import "../styles/global.css"
import { Text, View } from "react-native";
import MSPrimeForm from "./mobile/src/components/MSPrimeForm";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
     <Text className="text-red-700">Hello Devs</Text>
    </View>
  );
}
