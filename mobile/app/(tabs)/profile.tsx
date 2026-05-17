import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter, type Href } from "expo-router";
import { familyApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatPhonePretty } from "@/lib/phone";
import { confirm } from "@/lib/confirm";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function Profile() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuth();

  const familyQuery = useQuery({
    queryKey: ["family"],
    queryFn: familyApi.list,
    staleTime: 30_000,
  });
  const pendingForMe =
    familyQuery.data?.incoming.filter((l) => l.status === "PENDING").length ?? 0;

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.trim() ||
    (user?.phone?.slice(-2) ?? "?");

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.pageTitle}>{t("profile.title")}</Text>

          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.name}>
                {user?.firstName || user?.lastName
                  ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                  : t("profile.noName")}
              </Text>
              <Text style={styles.phone}>
                {user?.phone ? formatPhonePretty(user.phone) : user?.email ?? ""}
              </Text>
            </View>
          </View>

          <Row
            icon="people-outline"
            label={t("profile.family")}
            sublabel={t("profile.familySubtitle")}
            badge={pendingForMe > 0 ? pendingForMe : undefined}
            onPress={() => router.push("/(tabs)/family/" as Href)}
          />

          <Row
            icon="settings-outline"
            label={t("profile.settings")}
            sublabel={t("profile.settingsSubtitle")}
            onPress={() => router.push("/(tabs)/settings" as Href)}
          />

          <View style={styles.section}>
            <Row
              icon="log-out-outline"
              label={t("profile.logout")}
              destructive
              onPress={async () => {
                const ok = await confirm({
                  title: t("profile.logoutConfirmTitle"),
                  body: t("profile.logoutConfirmBody"),
                  confirmLabel: t("profile.logout"),
                  cancelLabel: t("profile.cancel"),
                  destructive: true,
                });
                if (ok) logout();
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  sublabel,
  onPress,
  destructive,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  destructive?: boolean;
  badge?: number;
}) {
  const color = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center" }}>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={destructive ? colors.danger : colors.textDim}
          style={{ marginLeft: spacing.sm }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  pageTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },

  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.bg, fontSize: fontSize.xl, fontWeight: "700" },
  name: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  phone: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2, letterSpacing: 0.5 },

  section: { gap: spacing.sm, marginTop: spacing.lg },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: { fontSize: fontSize.md, fontWeight: "500" },
  rowSublabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.bg, fontWeight: "800", fontSize: fontSize.xs },
});
