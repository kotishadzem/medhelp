import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { DocumentsListView } from "@/components/DocumentsListView";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function DocumentsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("documents.title")}</Text>
          <Text style={styles.subtitle}>{t("documents.subtitle")}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/documents/create")}
          style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed]}
          accessibilityLabel={t("documents.uploadCta")}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={colors.bg} />
          <Text style={styles.uploadBtnText}>{t("documents.uploadCtaShort")}</Text>
        </Pressable>
      </View>

      <DocumentsListView
        onPressRow={(doc) =>
          router.push({ pathname: "/(tabs)/documents/[id]", params: { id: doc.id } })
        }
        onUpload={() => router.push("/(tabs)/documents/create")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  uploadBtnText: { color: colors.bg, fontWeight: "700", fontSize: fontSize.sm },
  pressed: { opacity: 0.7 },
});
