import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function Login() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.title}>შესვლა</Text>
        <Text style={styles.muted}>გადაშეცი Slice 3-ში</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "700" },
  muted: { color: colors.textMuted, fontSize: fontSize.md },
});
