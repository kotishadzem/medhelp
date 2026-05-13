import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { authApi, familyApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/Button";
import { formatPhoneForDisplay } from "@/lib/phone";
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from "@/lib/i18n";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

const FLAG: Record<Language, string> = { ka: "🇬🇪", en: "🇬🇧", de: "🇩🇪" };
const NATIVE_NAMES: Record<Language, string> = {
  ka: "ქართული",
  en: "English",
  de: "Deutsch",
};

export default function Profile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, logout, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const qc = useQueryClient();

  const familyQuery = useQuery({
    queryKey: ["family"],
    queryFn: familyApi.list,
    staleTime: 30_000,
  });
  const pendingForMe =
    familyQuery.data?.incoming.filter((l) => l.status === "PENDING").length ?? 0;

  const save = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      }),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["today"] });
    },
    onError: () => {
      Alert.alert(t("profile.edit.saveFailed"), t("profile.edit.saveFailedBody"));
    },
  });

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.trim() ||
    (user?.phone?.slice(-2) ?? "?");

  const currentLang = i18n.language as Language;

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
                {user?.phone
                  ? `+ ${formatPhoneForDisplay(user.phone)}`
                  : user?.email ?? ""}
              </Text>
            </View>
          </View>

          {editing ? (
            <View style={styles.editCard}>
              <Field label={t("profile.edit.firstName")}>
                <Input
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t("profile.edit.firstNamePlaceholder")}
                />
              </Field>
              <Field label={t("profile.edit.lastName")}>
                <Input
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t("profile.edit.lastNamePlaceholder")}
                />
              </Field>
              <View style={styles.editActions}>
                <Button
                  label={t("profile.edit.cancel")}
                  variant="secondary"
                  onPress={() => {
                    setFirstName(user?.firstName ?? "");
                    setLastName(user?.lastName ?? "");
                    setEditing(false);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t("profile.edit.save")}
                  onPress={() => save.mutate()}
                  loading={save.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <Row
              icon="create-outline"
              label={t("profile.editName")}
              onPress={() => setEditing(true)}
            />
          )}

          <Row
            icon="people-outline"
            label={t("profile.family")}
            sublabel={t("profile.familySubtitle")}
            badge={pendingForMe > 0 ? pendingForMe : undefined}
            onPress={() => router.push("/(tabs)/family/index")}
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("profile.appSection")}</Text>
            <Row
              icon="language-outline"
              label={t("profile.language")}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Text style={styles.flag}>{FLAG[currentLang]}</Text>
                  <Text style={styles.rowValue}>{NATIVE_NAMES[currentLang]}</Text>
                </View>
              }
              onPress={() => setShowLangPicker(true)}
            />
            <Row icon="notifications-outline" label={t("profile.notifications")} disabled />
            <Row icon="lock-closed-outline" label={t("profile.changePin")} disabled />
          </View>

          <View style={styles.section}>
            <Row
              icon="log-out-outline"
              label={t("profile.logout")}
              destructive
              onPress={() =>
                Alert.alert(t("profile.logoutConfirmTitle"), t("profile.logoutConfirmBody"), [
                  { text: t("profile.cancel"), style: "cancel" },
                  { text: t("profile.logout"), style: "destructive", onPress: () => logout() },
                ])
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showLangPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLangPicker(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t("profile.language")}</Text>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = lang === currentLang;
              return (
                <Pressable
                  key={lang}
                  onPress={async () => {
                    await changeLanguage(lang);
                    setShowLangPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.langRow,
                    active && styles.langRowActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.flag}>{FLAG[lang]}</Text>
                  <Text style={styles.langName}>{NATIVE_NAMES[lang]}</Text>
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={colors.textDim} style={styles.input} />;
}

function Row({
  icon,
  label,
  sublabel,
  onPress,
  destructive,
  disabled,
  right,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  right?: React.ReactNode;
  badge?: number;
}) {
  const color = destructive ? colors.danger : disabled ? colors.textDim : colors.text;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.row, pressed && !disabled && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center" }}>
        {right}
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {!disabled && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={destructive ? colors.danger : colors.textDim}
            style={{ marginLeft: spacing.sm }}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  pageTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
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

  editCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.md,
    padding: spacing.md,
    minHeight: 48,
  },
  editActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },

  section: { gap: spacing.xs },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
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
  rowValue: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" },
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
  flag: { fontSize: 20 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    paddingBottom: spacing.sm,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langRowActive: { borderColor: colors.primary },
  langName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
});
