import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { CodeCells, PinDots, PinPad } from "@/components/PinPad";
import { useAuth } from "@/lib/auth/AuthContext";
import { authApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { formatPhoneForDisplay, normalizePhone } from "@/lib/phone";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Step = "phone" | "otp" | "pin" | "pin-confirm";

export default function Register() {
  const router = useRouter();
  const { loginWithOtp, setupPin, refreshMe, pendingPinSetup, user } = useAuth();
  const [step, setStep] = useState<Step>(pendingPinSetup ? "pin" : "phone");
  const [phone, setPhone] = useState(pendingPinSetup ? user?.phone ?? "" : "");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) {
      setError("შეიყვანე სრული ნომერი");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.sendOtp(normalized);
      setStep("otp");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (entered: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithOtp(normalizePhone(phone), entered);
      if (res.hasPinSet) {
        // Existing user logging in via OTP — straight to app.
        return; // Auth state flips to authenticated, root guard redirects.
      }
      setStep("pin");
    } catch (e) {
      setCode("");
      setError(messageFor(e));
    } finally {
      setLoading(false);
    }
  };

  const handlePinComplete = (entered: string) => {
    setError(null);
    setStep("pin-confirm");
  };

  const handlePinConfirmComplete = async (entered: string) => {
    if (entered !== pin) {
      setError("PIN კოდები არ ემთხვევა");
      setPinConfirm("");
      // shake feedback would be nice — minimal for now.
      setTimeout(() => {
        setStep("pin");
        setPin("");
        setPinConfirm("");
        setError(null);
      }, 1500);
      return;
    }
    setLoading(true);
    try {
      await setupPin(pin);
      await refreshMe();
      // Auth state already authenticated — guard will redirect.
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit OTP when 4 digits entered
  useEffect(() => {
    if (step === "otp" && code.length === 4 && !loading) {
      handleVerifyOtp(code);
    }
  }, [step, code, loading]);

  // Auto-advance PIN when 4 digits entered
  useEffect(() => {
    if (step === "pin" && pin.length === 4) handlePinComplete(pin);
  }, [step, pin]);

  useEffect(() => {
    if (step === "pin-confirm" && pinConfirm.length === 4) handlePinConfirmComplete(pinConfirm);
  }, [step, pinConfirm]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.body}>
          {step === "phone" && (
            <PhoneStep
              phone={phone}
              onChangePhone={setPhone}
              error={error}
              loading={loading}
              onSubmit={handleSendOtp}
              onSwitchLogin={() => router.replace("/(auth)/login")}
            />
          )}

          {step === "otp" && (
            <OtpStep
              phone={phone}
              code={code}
              onChange={setCode}
              error={error}
              loading={loading}
              onResend={async () => {
                setCode("");
                setError(null);
                try {
                  await authApi.sendOtp(normalizePhone(phone));
                } catch (e) {
                  setError(messageFor(e));
                }
              }}
              onBack={() => {
                setCode("");
                setError(null);
                setStep("phone");
              }}
            />
          )}

          {step === "pin" && (
            <PinStep
              title="დააყენე PIN კოდი"
              subtitle="გამოიყენე ეს კოდი სწრაფი შესვლისთვის"
              value={pin}
              onChange={(v) => {
                setError(null);
                setPin(v);
              }}
              error={error}
            />
          )}

          {step === "pin-confirm" && (
            <PinStep
              title="გაიმეორე PIN კოდი"
              subtitle="ერთხელ კიდევ — დასადასტურებლად"
              value={pinConfirm}
              onChange={(v) => {
                setError(null);
                setPinConfirm(v);
              }}
              error={error}
              loading={loading}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhoneStep({
  phone,
  onChangePhone,
  error,
  loading,
  onSubmit,
  onSwitchLogin,
}: {
  phone: string;
  onChangePhone: (v: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onSwitchLogin: () => void;
}) {
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MEDHELP</Text>
        <Text style={styles.title}>კეთილი იყოს{"\n"}შენი მობრძანება</Text>
        <Text style={styles.subtitle}>
          შეიყვანე ტელეფონის ნომერი — გამოგიგზავნით ერთჯერად კოდს.
        </Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>მობილური ნომერი</Text>
        <View style={styles.phoneField}>
          <Text style={styles.dialCode}>+995</Text>
          <View style={styles.divider} />
          <TextInput
            ref={inputRef}
            value={formatPhoneForDisplay(phone)}
            onChangeText={(t) => onChangePhone(normalizePhone(t))}
            keyboardType="phone-pad"
            placeholder="555 12 34 56"
            placeholderTextColor={colors.textDim}
            style={styles.phoneInput}
            maxLength={13}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Button label="გაგრძელება" onPress={onSubmit} loading={loading} />
        <Pressable onPress={onSwitchLogin} style={styles.linkRow}>
          <Text style={styles.linkText}>უკვე გაქვს ანგარიში?</Text>
          <Text style={styles.linkAction}>შესვლა</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OtpStep({
  phone,
  code,
  onChange,
  error,
  loading,
  onResend,
  onBack,
}: {
  phone: string;
  code: string;
  onChange: (v: string) => void;
  error: string | null;
  loading: boolean;
  onResend: () => void;
  onBack: () => void;
}) {
  const hiddenRef = useRef<TextInput>(null);
  useEffect(() => {
    const t = setTimeout(() => hiddenRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>VERIFICATION</Text>
        <Text style={styles.title}>შეიყვანე კოდი</Text>
        <Text style={styles.subtitle}>
          გავუგზავნეთ ერთჯერადი 4-ციფრიანი კოდი +995 {formatPhoneForDisplay(phone)}-ზე.
        </Text>
      </View>

      <Pressable
        style={styles.codeArea}
        onPress={() => hiddenRef.current?.focus()}
      >
        <CodeCells length={4} value={code} error={!!error} />
        <TextInput
          ref={hiddenRef}
          value={code}
          onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          style={styles.hiddenInput}
          autoFocus
        />
      </Pressable>

      <View style={{ alignItems: "center", gap: spacing.sm }}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {loading && <Text style={styles.muted}>ვამოწმებთ...</Text>}
        <Pressable onPress={onResend} hitSlop={8}>
          <Text style={styles.linkAction}>კოდის თავიდან გამოგზავნა</Text>
        </Pressable>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.linkText}>ნომრის შეცვლა</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PinStep({
  title,
  subtitle,
  value,
  onChange,
  error,
  loading,
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  loading?: boolean;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>უსაფრთხოება</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={{ alignItems: "center", gap: spacing.lg }}>
        <PinDots length={4} filled={value.length} error={!!error} />
        {error && <Text style={styles.errorText}>{error}</Text>}
        {loading && <Text style={styles.muted}>ვაყენებთ PIN-ს...</Text>}
      </View>

      <PinPad value={value} onChange={onChange} />
    </View>
  );
}

function messageFor(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "OTP_INVALID") return "კოდი არასწორია";
    if (e.code === "OTP_EXPIRED") return "კოდს ვადა გაუვიდა — გამოიგზავნი თავიდან";
    if (e.code === "OTP_NOT_FOUND") return "მოითხოვე ახალი კოდი";
    if (e.code === "VALIDATION_ERROR") return e.message;
    return e.message;
  }
  return "ქსელის შეცდომა — სცადე თავიდან";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  stepContainer: { flex: 1, justifyContent: "space-between", paddingVertical: spacing.lg },
  header: { gap: spacing.sm },
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
  fieldGroup: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  phoneField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 60,
  },
  dialCode: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
  divider: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: spacing.md },
  phoneInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "500",
    letterSpacing: 1,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: "center" },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
  footer: { gap: spacing.md, paddingBottom: spacing.md },
  linkRow: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, padding: spacing.sm },
  linkText: { color: colors.textMuted, fontSize: fontSize.sm },
  linkAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "600" },
  codeArea: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
