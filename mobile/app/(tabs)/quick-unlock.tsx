import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as LocalAuthentication from "expo-local-authentication";
import { Button } from "@/components/Button";
import { PinDots, PinPad } from "@/components/PinPad";
import { useAuth } from "@/lib/auth/AuthContext";
import { confirm } from "@/lib/confirm";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type ChangeStep = "old" | "new" | "confirm";

export default function QuickUnlockSettings() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    quickUnlockEnabled,
    biometricEnabled,
    enableQuickUnlock,
    setBiometric,
    disableQuickUnlock,
    changePin,
  } = useAuth();

  // Setup-from-scratch state (when quickUnlockEnabled is false).
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupStep, setSetupStep] = useState<"new" | "confirm">("new");

  // Change-PIN state.
  const [changing, setChanging] = useState(false);
  const [changeStep, setChangeStep] = useState<ChangeStep>("old");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Biometric hardware probe.
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioTypeLabel, setBioTypeLabel] = useState<string>("");
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const [hardware, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      setBioAvailable(hardware && enrolled);
      const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const hasFinger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
      if (hasFace && hasFinger) setBioTypeLabel(t("quickUnlockSettings.bioFaceFingerprint"));
      else if (hasFace) setBioTypeLabel(t("quickUnlockSettings.bioFace"));
      else if (hasFinger) setBioTypeLabel(t("quickUnlockSettings.bioFingerprint"));
      else setBioTypeLabel(t("quickUnlockSettings.bioGeneric"));
    })();
  }, [t]);

  // Auto-advance setup steps
  useEffect(() => {
    if (setupStep === "new" && setupPin.length === 4) {
      setSetupStep("confirm");
      setError(null);
    }
  }, [setupStep, setupPin]);

  useEffect(() => {
    if (setupStep === "confirm" && setupConfirm.length === 4) {
      if (setupConfirm !== setupPin) {
        setError(t("quickUnlock.mismatch"));
        setTimeout(() => {
          setSetupPin("");
          setSetupConfirm("");
          setSetupStep("new");
          setError(null);
        }, 1500);
        return;
      }
      (async () => {
        await enableQuickUnlock(setupPin);
        setSetupPin("");
        setSetupConfirm("");
      })();
    }
  }, [setupStep, setupConfirm, setupPin, enableQuickUnlock, t]);

  // Change-PIN advance
  useEffect(() => {
    if (!changing) return;
    if (changeStep === "old" && oldPin.length === 4) {
      // verify by attempting changePin in last step; here just advance.
      setChangeStep("new");
      setError(null);
    }
  }, [changing, changeStep, oldPin]);

  useEffect(() => {
    if (!changing) return;
    if (changeStep === "new" && newPin.length === 4) {
      setChangeStep("confirm");
      setError(null);
    }
  }, [changing, changeStep, newPin]);

  useEffect(() => {
    if (!changing) return;
    if (changeStep === "confirm" && newPinConfirm.length === 4) {
      if (newPinConfirm !== newPin) {
        setError(t("quickUnlock.mismatch"));
        setTimeout(() => {
          setNewPinConfirm("");
          setChangeStep("new");
          setNewPin("");
          setError(null);
        }, 1500);
        return;
      }
      (async () => {
        const ok = await changePin(oldPin, newPin);
        if (!ok) {
          setError(t("quickUnlockSettings.oldPinInvalid"));
          setTimeout(() => {
            setChanging(false);
            setOldPin("");
            setNewPin("");
            setNewPinConfirm("");
            setError(null);
          }, 1800);
          return;
        }
        setSuccess(true);
        setTimeout(() => {
          setChanging(false);
          setSuccess(false);
          setOldPin("");
          setNewPin("");
          setNewPinConfirm("");
          setChangeStep("old");
        }, 1200);
      })();
    }
  }, [changing, changeStep, newPinConfirm, newPin, oldPin, changePin, t]);

  const handleDisable = async () => {
    const ok = await confirm({
      title: t("quickUnlockSettings.disableTitle"),
      body: t("quickUnlockSettings.disableConfirm"),
      confirmLabel: t("quickUnlockSettings.disable"),
      cancelLabel: t("profile.cancel"),
      destructive: true,
    });
    if (ok) await disableQuickUnlock();
  };

  const handleBioToggle = async (next: boolean) => {
    if (next) {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t("quickUnlock.bioPrompt"),
        cancelLabel: t("login.cancel"),
        disableDeviceFallback: false,
      });
      if (res.success) await setBiometric(true);
    } else {
      await setBiometric(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("quickUnlockSettings.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {!quickUnlockEnabled && !changing && (
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="flash-outline" size={26} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>{t("quickUnlock.introTitle")}</Text>
            <Text style={styles.heroSubtitle}>{t("quickUnlock.introSubtitle")}</Text>
            <Text style={styles.heroHint}>{t("quickUnlockSettings.setupHint")}</Text>
            <View style={styles.pinArea}>
              <PinDots
                length={4}
                filled={setupStep === "new" ? setupPin.length : setupConfirm.length}
                error={!!error}
              />
              <Text style={styles.muted}>
                {setupStep === "new"
                  ? t("quickUnlock.pinSetupTitle")
                  : t("quickUnlock.pinConfirmTitle")}
              </Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
            <PinPad
              value={setupStep === "new" ? setupPin : setupConfirm}
              onChange={(v) => (setupStep === "new" ? setSetupPin(v) : setSetupConfirm(v))}
            />
          </View>
        )}

        {quickUnlockEnabled && !changing && (
          <>
            <View style={styles.statusBanner}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.statusText}>{t("quickUnlockSettings.enabled")}</Text>
            </View>

            <Section title={t("quickUnlockSettings.pinSection")}>
              <Row
                icon="keypad-outline"
                label={t("quickUnlockSettings.changePin")}
                onPress={() => {
                  setChanging(true);
                  setChangeStep("old");
                  setError(null);
                }}
              />
            </Section>

            {bioAvailable && (
              <Section title={t("quickUnlockSettings.bioSection")}>
                <View style={styles.row}>
                  <Ionicons name="finger-print-outline" size={20} color={colors.text} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{bioTypeLabel}</Text>
                    <Text style={styles.rowSub}>
                      {biometricEnabled
                        ? t("quickUnlockSettings.bioOn")
                        : t("quickUnlockSettings.bioOff")}
                    </Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBioToggle}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.text}
                  />
                </View>
              </Section>
            )}

            <Section title={t("quickUnlockSettings.dangerSection")}>
              <Row
                icon="close-circle-outline"
                label={t("quickUnlockSettings.disable")}
                destructive
                onPress={handleDisable}
              />
            </Section>
          </>
        )}

        {changing && (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>
              {changeStep === "old"
                ? t("quickUnlockSettings.enterOldPin")
                : changeStep === "new"
                ? t("quickUnlockSettings.enterNewPin")
                : t("quickUnlockSettings.confirmNewPin")}
            </Text>
            <View style={styles.pinArea}>
              <PinDots
                length={4}
                filled={
                  changeStep === "old"
                    ? oldPin.length
                    : changeStep === "new"
                    ? newPin.length
                    : newPinConfirm.length
                }
                error={!!error}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
              {success && (
                <Text style={[styles.muted, { color: colors.success }]}>
                  {t("quickUnlockSettings.changed")}
                </Text>
              )}
            </View>
            <PinPad
              value={
                changeStep === "old"
                  ? oldPin
                  : changeStep === "new"
                  ? newPin
                  : newPinConfirm
              }
              onChange={(v) => {
                if (changeStep === "old") setOldPin(v);
                else if (changeStep === "new") setNewPin(v);
                else setNewPinConfirm(v);
              }}
            />
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={t("profile.cancel")}
                variant="secondary"
                onPress={() => {
                  setChanging(false);
                  setOldPin("");
                  setNewPin("");
                  setNewPinConfirm("");
                  setChangeStep("old");
                  setError(null);
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const color = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={destructive ? colors.danger : colors.textDim}
        style={{ marginLeft: "auto" }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSubtitle: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center" },
  heroHint: { color: colors.textDim, fontSize: fontSize.xs, textAlign: "center" },

  pinArea: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
  errorText: { color: colors.danger, fontSize: fontSize.sm },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.success + "15",
    borderWidth: 1,
    borderColor: colors.success + "40",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statusText: { color: colors.success, fontSize: fontSize.md, fontWeight: "600" },

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
  rowLabel: { fontSize: fontSize.md, fontWeight: "500", color: colors.text },
  rowSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
