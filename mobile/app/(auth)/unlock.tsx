import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as LocalAuthentication from "expo-local-authentication";
import { PinDots, PinPad } from "@/components/PinPad";
import { useAuth } from "@/lib/auth/AuthContext";
import { maskPhone } from "@/lib/phone";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function Unlock() {
  const { t } = useTranslation();
  const { storedIdentifier, biometricEnabled, unlockWithPin, approveUnlock, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web" || !biometricEnabled) return;
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBioReady(hardware && enrolled);
    })();
  }, [biometricEnabled]);

  const tryUnlock = useCallback(
    async (entered: string) => {
      const ok = await unlockWithPin(entered);
      if (!ok) {
        setPin("");
        setError(t("unlock.invalid"));
      }
    },
    [unlockWithPin, t]
  );

  useEffect(() => {
    if (pin.length === 4) tryUnlock(pin);
  }, [pin, tryUnlock]);

  const tryBiometric = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t("login.biometric"),
      cancelLabel: t("login.cancel"),
      disableDeviceFallback: false,
    });
    if (res.success) {
      try {
        await approveUnlock();
      } catch {
        setError(t("unlock.failed"));
      }
    }
  }, [t, approveUnlock]);

  // Auto-prompt biometric once on mount if enabled.
  useEffect(() => {
    if (bioReady) tryBiometric();
  }, [bioReady, tryBiometric]);

  const display = !storedIdentifier
    ? ""
    : storedIdentifier.method === "phone"
    ? maskPhone(storedIdentifier.value)
    : maskEmail(storedIdentifier.value);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>+</Text>
          </View>
          <Text style={styles.greeting}>{t("unlock.greeting")}</Text>
          <Text style={styles.phone}>{display}</Text>
        </View>

        <View style={styles.center}>
          <PinDots length={4} filled={pin.length} error={!!error} />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.muted}>{t("unlock.enterPin")}</Text>
          )}
        </View>

        <View style={styles.padArea}>
          <PinPad value={pin} onChange={setPin} />

          <View style={styles.actions}>
            {bioReady && (
              <Pressable
                onPress={tryBiometric}
                hitSlop={10}
                style={({ pressed }) => [styles.bioBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="finger-print" size={22} color={colors.primary} />
              </Pressable>
            )}
            <Pressable onPress={() => logout()} hitSlop={10}>
              <Text style={styles.linkAction}>{t("unlock.usePassword")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  if (name.length <= 2) return `${name}@${domain}`;
  return `${name[0]}${"⋯"}${name.slice(-1)}@${domain}`;
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
  linkAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
});
