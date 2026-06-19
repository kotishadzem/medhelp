import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius } from "@/lib/theme";

export function ProfileButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/(tabs)/profile")}
      hitSlop={8}
      accessibilityLabel="Profile"
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <View style={styles.inner}>
        <Ionicons name="person-outline" size={20} color={colors.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
});
