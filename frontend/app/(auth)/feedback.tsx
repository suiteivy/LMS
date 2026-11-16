import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Feedback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const handleNavigationStateChange = (navState: any) => {
    // Google forms redirect to a URL containing formResponse upon submission
    if (navState.url.includes("formResponse")) {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F0B2E" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Demo Feedback</Text>
      </View>
      <View style={{ flex: 1, position: "relative" }}>
        <WebView
          source={{ uri: "https://docs.google.com/forms/d/e/1FAIpQLScdS8WHJ_WW-vAoVjOUTQrJcog4kQo6MZhb3MqC9fOCq3la7g/viewform" }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadEnd={() => setLoading(false)}
          style={{ flex: 1, backgroundColor: "#0F0B2E" }}
        />
        {loading && (
          <ActivityIndicator
            size="large"
            color="#FF6B00"
            style={styles.loader}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  loader: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
});
