import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const { loginWithPassword, storedIdentifier } = useAuth();

  const initialIdentifier = storedIdentifier?.value ?? "";
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    const tt = setTimeout(() => {
      if (initialIdentifier) {
        passwordRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 250);
    return () => clearTimeout(tt);
  }, [initialIdentifier]);

  const submit = async () => {
    setError(null);
    const id = identifier.trim();
    if (!id || password.length < 6) {
      setError(t("login.invalidCredentials"));
      return;
    }
    const looksLikeEmail = id.includes("@");
    setLoading(true);
    try {
      await loginWithPassword(
        looksLikeEmail ? { email: id } : { phone: normalizePhone(id) },
        password
      );
    } catch (e) {
      if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") {
        setError(t("login.invalidCredentials"));
      } else {
        setError(t("login.failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.body}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoMark}>+</Text>
            </View>
            <Text style={styles.title}>{t("login.title")}</Text>
            <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
          </View>

          <View style={styles.fields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("login.identifierLabel")}</Text>
              <View style={styles.field}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <TextInput
                  ref={inputRef}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={t("login.identifierPlaceholder")}
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="username"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("login.passwordLabel")}</Text>
              <View style={styles.field}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("login.passwordPlaceholder")}
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={submit}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={8}
                  accessibilityLabel={
                    showPassword ? t("login.hidePassword") : t("login.showPassword")
                  }
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.footer}>
            <Button label={t("login.submit")} onPress={submit} loading={loading} />
            <Pressable
              onPress={() => router.replace("/(auth)/register")}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>{t("login.noAccount")}</Text>
              <Text style={styles.linkAction}>{t("login.register")}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function normalizePhone(raw: string): string {
  // Allow user to type with spaces or + — keep digits and leading +.
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/[^\d]/g, "");
  return trimmed.replace(/[^\d]/g, "");
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  header: { alignItems: "flex-start", gap: spacing.md, paddingTop: spacing.xxl },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoMark: { color: colors.bg, fontSize: 36, fontWeight: "800", marginTop: -4 },
  title: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md },

  fields: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  input: { flex: 1, color: colors.text, fontSize: fontSize.md },
  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: "center" },

  footer: { gap: spacing.md, paddingBottom: spacing.md },
  linkRow: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, padding: spacing.sm },
  linkText: { color: colors.textMuted, fontSize: fontSize.sm },
  linkAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
});
