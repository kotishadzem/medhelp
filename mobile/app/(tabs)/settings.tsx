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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { authApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from "@/lib/i18n";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

const FLAG: Record<Language, string> = { ka: "🇬🇪", en: "🇬🇧", de: "🇩🇪" };
const NATIVE_NAMES: Record<Language, string> = {
  ka: "ქართული",
  en: "English",
  de: "Deutsch",
};

export default function Settings() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, setUser, quickUnlockEnabled, fingerprintEnabled, faceEnabled } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [showLangPicker, setShowLangPicker] = useState(false);

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

  const currentLang = i18n.language as Language;
  const quickStatus = quickStatusLabel({ quickUnlockEnabled, fingerprintEnabled, faceEnabled }, t);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t("settings.title")}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {editing ? (
            <View style={styles.editCard}>
              <Text style={styles.cardLabel}>{t("settings.nameSection")}</Text>
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
              icon="person-outline"
              label={t("settings.editName")}
              sublabel={
                user?.firstName || user?.lastName
                  ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                  : t("profile.noName")
              }
              onPress={() => setEditing(true)}
            />
          )}

          <Row
            icon="flash-outline"
            label={t("profile.quickSignIn")}
            sublabel={quickStatus}
            onPress={() => router.push("/(tabs)/quick-unlock" as Href)}
          />

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

function quickStatusLabel(
  s: { quickUnlockEnabled: boolean; fingerprintEnabled: boolean; faceEnabled: boolean },
  t: (k: string) => string
): string {
  const labels: string[] = [];
  if (s.quickUnlockEnabled) labels.push(t("quickUnlockSettings.pinSection"));
  if (s.fingerprintEnabled) labels.push(t("quickUnlockSettings.bioFingerprint"));
  if (s.faceEnabled) labels.push(t("quickUnlockSettings.bioFace"));
  if (labels.length === 0) return t("quickUnlockSettings.bioOff");
  return labels.join(" · ");
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
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {right}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textDim}
          style={{ marginLeft: spacing.sm }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  body: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },

  editCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
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
  rowLabel: { fontSize: fontSize.md, fontWeight: "500", color: colors.text },
  rowSublabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  rowValue: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" },
  flag: { fontSize: 20 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
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
