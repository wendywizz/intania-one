import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TEXT } from "@/constants/text";

export default function ExaminerScreen() {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.EXAMINER_MENU_TITLE}
        onBackPress={() => router.replace("/")}
        showBackButton
      />
      <View style={styles.content}>
        <IconSymbol name="checkmark.circle.fill" size={56} color="#922124" />
        <ThemedText type="subtitle" style={styles.title}>
          {TEXT.EXAMINER_MENU_TITLE}
        </ThemedText>
        <ThemedText style={styles.description}>Coming soon</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: {
    marginTop: 4,
  },
  description: {
    color: "#584140",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
