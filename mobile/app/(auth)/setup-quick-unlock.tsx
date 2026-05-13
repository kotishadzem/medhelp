import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as LocalAuthentication from "expo-local-authentication";
import { Button } from "@/components/Button";
import { PinDots, PinPad } from "@/components/PinPad";
import { useAuth } from "@/lib/auth/AuthContext";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Step = "intro" | "pin" | "pin-confirm" | "biometric";

export default function SetupQuickUnlock() {
  const { t } = useTranslation();
  const { enableQuickUnlock, skipQuickUnlock, setBiometric } = useAuth();

  const [step, setStep] = useState<Step>("intro");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBioAvailable(hardware && enrolled);
    })();
  }, []);

  useEffect(() => {
    if (step === "pin" && pin.length === 4) {
      setError(null);
      setStep("pin-confirm");
    }
  }, [step, pin]);

  useEffect(() => {
    if (step === "pin-confirm" && pinConfirm.length === 4) {
      if (pinConfirm !== pin) {
        setError(t("quickUnlock.mismatch"));
        setTimeout(() => {
          setStep("pin");
          setPin("");
          setPinConfirm("");
          setError(null);
        }, 1500);
        return;
      }
      (async () => {
        await enableQuickUnlock(pin);
        if (bioAvailable) {
          setStep("biometric");
        }
        // else: state flips to authenticated and root navigator routes to tabs.
      })();
    }
  }, [step, pinConfirm, pin, enableQuickUnlock, bioAvailable, t]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.body}>
        {step === "intro" && (
          <IntroStep
            onEnable={() => setStep("pin")}
            onSkip={() => skipQuickUnlock()}
          />
        )}

        {step === "pin" && (
          <PinStep
            title={t("quickUnlock.pinSetupTitle")}
            subtitle={t("quickUnlock.pinSetupSubtitle")}
            value={pin}
            onChange={setPin}
            onBack={() => setStep("intro")}
          />
        )}

        {step === "pin-confirm" && (
          <PinStep
            title={t("quickUnlock.pinConfirmTitle")}
            subtitle={t("quickUnlock.pinConfirmSubtitle")}
            value={pinConfirm}
            onChange={setPinConfirm}
            error={error}
            onBack={() => {
              setStep("pin");
              setPin("");
              setPinConfirm("");
            }}
          />
        )}

        {step === "biometric" && (
          <BiometricStep
            onEnable={async () => {
              const res = await LocalAuthentication.authenticateAsync({
                promptMessage: t("quickUnlock.biometricPrompt"),
                cancelLabel: t("login.cancel"),
                disableDeviceFallback: false,
              });
              if (res.success) {
                await setBiometric(true);
              }
              // Done either way — root navigator routes to tabs once
              // needsQuickUnlockSetup is false (set when we enabled PIN).
            }}
            onSkip={() => {
              /* nothing to do — already authenticated */
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function IntroStep({
  onEnable,
  onSkip,
}: {
  onEnable: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="flash-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>MEDHELP</Text>
        <Text style={styles.title}>{t("quickUnlock.introTitle")}</Text>
        <Text style={styles.subtitle}>{t("quickUnlock.introSubtitle")}</Text>
      </View>

      <View style={styles.bulletList}>
        <Bullet icon="keypad-outline" text={t("quickUnlock.bulletPin")} />
        <Bullet icon="finger-print-outline" text={t("quickUnlock.bulletFingerprint")} />
        <Bullet icon="happy-outline" text={t("quickUnlock.bulletFace")} />
      </View>

      <View style={styles.footer}>
        <Button label={t("quickUnlock.enable")} onPress={onEnable} />
        <Pressable onPress={onSkip} style={styles.skipRow} hitSlop={10}>
          <Text style={styles.skipText}>{t("quickUnlock.skip")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Bullet({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function PinStep({
  title,
  subtitle,
  value,
  onChange,
  error,
  onBack,
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  onBack: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={{ alignItems: "center", gap: spacing.lg }}>
        <PinDots length={4} filled={value.length} error={!!error} />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <PinPad value={value} onChange={onChange} />
    </View>
  );
}

function BiometricStep({
  onEnable,
  onSkip,
}: {
  onEnable: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>MEDHELP</Text>
        <Text style={styles.title}>{t("quickUnlock.bioTitle")}</Text>
        <Text style={styles.subtitle}>{t("quickUnlock.bioSubtitle")}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <Button label={t("quickUnlock.bioEnable")} onPress={onEnable} />
        <Pressable onPress={onSkip} style={styles.skipRow} hitSlop={10}>
          <Text style={styles.skipText}>{t("quickUnlock.bioSkip")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  stepContainer: { flex: 1, justifyContent: "space-between" },
  header: { gap: spacing.md, paddingTop: spacing.xl },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  backLink: { marginBottom: spacing.sm, alignSelf: "flex-start" },
  backLinkText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: "700" },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 40,
  },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md, lineHeight: 22 },

  bulletList: { gap: spacing.md },
  bullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bulletText: { color: colors.text, fontSize: fontSize.md, flex: 1 },

  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: "center" },

  footer: { gap: spacing.md, paddingBottom: spacing.md },
  skipRow: { alignItems: "center", padding: spacing.sm },
  skipText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: "600" },
});
