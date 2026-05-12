import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function Splash() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.logo}>
          <Text style={styles.logoMark}>+</Text>
        </View>
        <Text style={styles.title}>MedHelp</Text>
        <Text style={styles.subtitle}>თქვენი მედიკამენტების ასისტენტი</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: { color: colors.bg, fontSize: 44, fontWeight: "800", marginTop: -6 },
  title: { color: colors.text, fontSize: fontSize.display, fontWeight: "800", letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md },
});
