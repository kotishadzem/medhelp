import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { authApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/Button";
import { formatPhoneForDisplay } from "@/lib/phone";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const qc = useQueryClient();

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
      Alert.alert("შეცდომა", "ვერ შენახა — სცადე თავიდან");
    },
  });

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.trim() ||
    (user?.phone?.slice(-2) ?? "👤");

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.pageTitle}>პროფილი</Text>

          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.name}>
                {user?.firstName || user?.lastName
                  ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                  : "უსახელო"}
              </Text>
              <Text style={styles.phone}>+995 {formatPhoneForDisplay(user?.phone ?? "")}</Text>
            </View>
          </View>

          {editing ? (
            <View style={styles.editCard}>
              <Field label="სახელი">
                <Input value={firstName} onChangeText={setFirstName} placeholder="სახელი" />
              </Field>
              <Field label="გვარი">
                <Input value={lastName} onChangeText={setLastName} placeholder="გვარი" />
              </Field>
              <View style={styles.editActions}>
                <Button
                  label="გაუქმება"
                  variant="secondary"
                  onPress={() => {
                    setFirstName(user?.firstName ?? "");
                    setLastName(user?.lastName ?? "");
                    setEditing(false);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  label="შენახვა"
                  onPress={() => save.mutate()}
                  loading={save.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <Row
              icon="create-outline"
              label="სახელის შეცვლა"
              onPress={() => setEditing(true)}
            />
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>აპლიკაცია</Text>
            <Row icon="notifications-outline" label="შეტყობინებები" disabled />
            <Row icon="lock-closed-outline" label="PIN-ის შეცვლა" disabled />
          </View>

          <View style={styles.section}>
            <Row
              icon="log-out-outline"
              label="გასვლა"
              destructive
              onPress={() =>
                Alert.alert("გასვლა", "გნებავთ გასვლა?", [
                  { text: "გაუქმება", style: "cancel" },
                  { text: "გასვლა", style: "destructive", onPress: () => logout() },
                ])
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  onPress,
  destructive,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const color = destructive ? colors.danger : disabled ? colors.textDim : colors.text;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.row, pressed && !disabled && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {!disabled && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={destructive ? colors.danger : colors.textDim}
          style={{ marginLeft: "auto" }}
        />
      )}
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
});
