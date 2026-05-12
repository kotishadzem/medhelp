import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth/AuthContext";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function Today() {
  const { user, logout } = useAuth();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.greeting}>გამარჯობა{user?.firstName ? `, ${user.firstName}` : ""}</Text>
        <Text style={styles.muted}>დღევანდელი დოზები გადაშეცი Slice 4-ში</Text>
        <Pressable style={styles.button} onPress={() => logout()}>
          <Text style={styles.buttonText}>გასვლა</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  greeting: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "700" },
  muted: { color: colors.textMuted, fontSize: fontSize.md },
  button: {
    marginTop: "auto",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  buttonText: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
});
