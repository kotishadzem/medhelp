import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { PinDots, PinPad } from "@/components/PinPad";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import { getBiometricEnabled } from "@/lib/auth/storage";
import { maskPhone } from "@/lib/phone";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const { storedPhone, loginWithPin, forgetPhone } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const [enabled, hasHardware, isEnrolled] = await Promise.all([
        getBiometricEnabled(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBiometricAvailable(enabled && hasHardware && isEnrolled);
    })();
  }, []);

  const submit = useCallback(
    async (entered: string) => {
      if (!storedPhone) return;
      setLoading(true);
      setError(null);
      try {
        await loginWithPin(storedPhone, entered);
      } catch (e) {
        setPin("");
        if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") {
          setError(t("login.pinInvalid"));
        } else {
          setError(t("login.failed"));
        }
      } finally {
        setLoading(false);
      }
    },
    [storedPhone, loginWithPin, t]
  );

  useEffect(() => {
    if (pin.length === 4 && !loading) submit(pin);
  }, [pin, loading, submit]);

  const tryBiometric = useCallback(async () => {
    if (!biometricAvailable) return;
    await LocalAuthentication.authenticateAsync({
      promptMessage: t("login.biometric"),
      cancelLabel: t("login.cancel"),
      disableDeviceFallback: false,
    });
  }, [biometricAvailable, t]);

  if (!storedPhone) {
    router.replace("/(auth)/register");
    return null;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>+</Text>
          </View>
          <Text style={styles.greeting}>{t("login.greeting")}</Text>
          <Text style={styles.phone}>{maskPhone(storedPhone)}</Text>
        </View>

        <View style={styles.center}>
          <PinDots length={4} filled={pin.length} error={!!error} />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.muted}>{t("login.enterPin")}</Text>
          )}
        </View>

        <View style={styles.padArea}>
          <PinPad value={pin} onChange={setPin} />

          <View style={styles.actions}>
            {biometricAvailable && (
              <Pressable
                onPress={tryBiometric}
                hitSlop={10}
                style={({ pressed }) => [styles.bioBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.bioIcon}>👆</Text>
              </Pressable>
            )}
            <Pressable
              onPress={async () => {
                await forgetPhone();
                router.replace("/(auth)/register");
              }}
              hitSlop={10}
            >
              <Text style={styles.linkAction}>{t("login.switchNumber")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: "space-between", paddingVertical: spacing.lg },
  header: { alignItems: "center", gap: spacing.md, paddingTop: spacing.xl },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.bg, fontSize: 36, fontWeight: "800", marginTop: -4 },
  greeting: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700" },
  phone: { color: colors.textMuted, fontSize: fontSize.md, letterSpacing: 1 },
  center: { alignItems: "center", gap: spacing.md },
  errorText: { color: colors.danger, fontSize: fontSize.sm },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
  padArea: { gap: spacing.lg, alignItems: "center" },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingTop: spacing.sm },
  bioBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bioIcon: { fontSize: 22 },
  linkAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
});
