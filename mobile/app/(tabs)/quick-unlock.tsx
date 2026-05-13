import { useEffect, useState } from "react";
import {
  Modal,
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
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type PinDialogMode = "enable" | "disable" | "change";

export default function QuickUnlockSettings() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    quickUnlockEnabled,
    fingerprintEnabled,
    faceEnabled,
    setQuickPinValue,
    removeQuickPin,
    changePin,
    setFingerprint,
    setFace,
  } = useAuth();

  const [hasFinger, setHasFinger] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const [hardware, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      if (!hardware || !enrolled) return;
      setHasFinger(types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT));
      setHasFace(types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION));
    })();
  }, []);

  // Modal state for PIN-verification dialogs.
  const [pinDialog, setPinDialog] = useState<PinDialogMode | null>(null);

  const runBiometric = async (): Promise<boolean> => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t("quickUnlock.bioPrompt"),
      cancelLabel: t("login.cancel"),
      disableDeviceFallback: false,
    });
    return !!res.success;
  };

  const onPinToggle = async (next: boolean) => {
    if (next) {
      setPinDialog("enable");
    } else {
      setPinDialog("disable");
    }
  };

  const onFingerprintToggle = async (next: boolean) => {
    if (Platform.OS === "web") return;
    const ok = await runBiometric();
    if (ok) await setFingerprint(next);
  };

  const onFaceToggle = async (next: boolean) => {
    if (Platform.OS === "web") return;
    const ok = await runBiometric();
    if (ok) await setFace(next);
  };

  const activeLabels: string[] = [];
  if (quickUnlockEnabled) activeLabels.push(t("quickUnlockSettings.pinSection"));
  if (fingerprintEnabled) activeLabels.push(t("quickUnlockSettings.bioFingerprint"));
  if (faceEnabled) activeLabels.push(t("quickUnlockSettings.bioFace"));

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
        <Text style={styles.subtitle}>{t("quickUnlockSettings.subtitle")}</Text>

        <View style={styles.list}>
          <ToggleRow
            icon="keypad-outline"
            title={t("quickUnlockSettings.pinSection")}
            sub={
              quickUnlockEnabled
                ? t("quickUnlockSettings.bioOn")
                : t("quickUnlockSettings.bioOff")
            }
            value={quickUnlockEnabled}
            onValueChange={onPinToggle}
          />

          {hasFinger && (
            <ToggleRow
              icon="finger-print-outline"
              title={t("quickUnlockSettings.bioFingerprint")}
              sub={
                fingerprintEnabled
                  ? t("quickUnlockSettings.bioOn")
                  : t("quickUnlockSettings.bioOff")
              }
              value={fingerprintEnabled}
              onValueChange={onFingerprintToggle}
            />
          )}

          {hasFace && (
            <ToggleRow
              icon="happy-outline"
              title={t("quickUnlockSettings.bioFace")}
              sub={
                faceEnabled
                  ? t("quickUnlockSettings.bioOn")
                  : t("quickUnlockSettings.bioOff")
              }
              value={faceEnabled}
              onValueChange={onFaceToggle}
            />
          )}
        </View>

        {quickUnlockEnabled && (
          <Pressable
            onPress={() => setPinDialog("change")}
            style={({ pressed }) => [styles.changeRow, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="key-outline" size={18} color={colors.primary} />
            <Text style={styles.changeRowText}>{t("quickUnlockSettings.changePin")}</Text>
          </Pressable>
        )}

        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>{t("quickUnlockSettings.activeNow")}</Text>
          <Text style={styles.activeValue}>
            {activeLabels.length > 0
              ? activeLabels.join(" · ")
              : t("quickUnlockSettings.nothingOn")}
          </Text>
        </View>
      </ScrollView>

      {pinDialog && (
        <PinDialog
          mode={pinDialog}
          onClose={() => setPinDialog(null)}
          onEnable={async (newPin) => {
            await setQuickPinValue(newPin);
            setPinDialog(null);
          }}
          onDisable={async () => {
            await removeQuickPin();
            setPinDialog(null);
          }}
          onChange={async (oldPin, newPin) => {
            return changePin(oldPin, newPin);
          }}
          onChangeDone={() => setPinDialog(null)}
        />
      )}
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  title,
  sub,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}

type PinDialogProps = {
  mode: PinDialogMode;
  onClose: () => void;
  onEnable: (pin: string) => Promise<void>;
  onDisable: () => Promise<void>;
  onChange: (oldPin: string, newPin: string) => Promise<boolean>;
  onChangeDone: () => void;
};

function PinDialog({ mode, onClose, onEnable, onDisable, onChange, onChangeDone }: PinDialogProps) {
  const { t } = useTranslation();
  const { unlockWithPinLocally } = useUnlockHelper();

  const [step, setStep] = useState<"current" | "new" | "confirm">(
    mode === "enable" ? "new" : mode === "disable" ? "current" : "current"
  );
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirmVal] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "current" || mode !== "disable") return;
    if (current.length !== 4) return;
    (async () => {
      const ok = await unlockWithPinLocally(current);
      if (!ok) {
        setError(t("quickUnlockSettings.oldPinInvalid"));
        setTimeout(() => {
          setCurrent("");
          setError(null);
        }, 1300);
        return;
      }
      await onDisable();
    })();
  }, [step, mode, current, onDisable, t]);

  useEffect(() => {
    if (mode !== "change") return;
    if (step !== "current" || current.length !== 4) return;
    (async () => {
      const ok = await unlockWithPinLocally(current);
      if (!ok) {
        setError(t("quickUnlockSettings.oldPinInvalid"));
        setTimeout(() => {
          setCurrent("");
          setError(null);
        }, 1300);
        return;
      }
      setError(null);
      setStep("new");
    })();
  }, [mode, step, current, t]);

  useEffect(() => {
    if (step !== "new" || next.length !== 4) return;
    setStep("confirm");
    setError(null);
  }, [step, next]);

  useEffect(() => {
    if (step !== "confirm" || confirm.length !== 4) return;
    if (confirm !== next) {
      setError(t("quickUnlock.mismatch"));
      setTimeout(() => {
        setConfirmVal("");
        setNext("");
        setStep("new");
        setError(null);
      }, 1300);
      return;
    }
    (async () => {
      if (mode === "enable") {
        await onEnable(next);
      } else if (mode === "change") {
        const ok = await onChange(current, next);
        if (ok) onChangeDone();
      }
    })();
  }, [step, confirm, next, mode, current, onEnable, onChange, onChangeDone, t]);

  const heading =
    mode === "enable"
      ? step === "new"
        ? t("quickUnlock.pinSetupTitle")
        : t("quickUnlock.pinConfirmTitle")
      : mode === "disable"
      ? t("quickUnlockSettings.enterCurrentPinDisable")
      : step === "current"
      ? t("quickUnlockSettings.enterOldPin")
      : step === "new"
      ? t("quickUnlockSettings.enterNewPin")
      : t("quickUnlockSettings.confirmNewPin");

  const value =
    step === "current" ? current : step === "new" ? next : confirm;
  const setter =
    step === "current" ? setCurrent : step === "new" ? setNext : setConfirmVal;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.dialogHead}>
            <Text style={styles.dialogTitle}>{heading}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={{ alignItems: "center", gap: spacing.md, marginVertical: spacing.md }}>
            <PinDots length={4} filled={value.length} error={!!error} />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
          <PinPad value={value} onChange={setter} />
        </View>
      </View>
    </Modal>
  );
}

// Internal helper to verify current PIN locally without flipping auth state.
function useUnlockHelper() {
  const { changePin } = useAuth();
  return {
    unlockWithPinLocally: async (pin: string) => {
      // We don't want to actually change anything; abuse changePin by
      // passing newPin = pin → it succeeds only if the saved PIN matches.
      // The PIN value remains unchanged.
      return changePin(pin, pin);
    },
  };
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

  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },

  list: { gap: spacing.sm },
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
  rowTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  rowSub: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },

  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  changeRowText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "700" },

  activeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  activeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  activeValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },

  errorText: { color: colors.danger, fontSize: fontSize.sm },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  dialog: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dialogHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  dialogTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
});
