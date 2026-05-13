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
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { CodeCells, PinDots, PinPad } from "@/components/PinPad";
import { CountryPicker } from "@/components/CountryPicker";
import { useAuth } from "@/lib/auth/AuthContext";
import { authApi, type Identifier } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { formatPhoneForDisplay, normalizePhone } from "@/lib/phone";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import {
  changeLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from "@/lib/i18n";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Method = "phone" | "email";
type Step = "language" | "method" | "phone" | "email" | "otp" | "pin" | "pin-confirm";

export default function Register() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { loginWithOtp, setupPin, refreshMe, pendingPinSetup, user } = useAuth();

  const [step, setStep] = useState<Step>(pendingPinSetup ? "pin" : "language");
  const [method, setMethod] = useState<Method>("phone");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentIdentifier = (): Identifier =>
    method === "phone"
      ? { phone: `${country.dial}${normalizePhone(phone)}` }
      : { email: email.trim() };

  const displayTarget = (): string =>
    method === "phone"
      ? `${country.dial} ${formatPhoneForDisplay(phone)}`
      : email.trim();

  const handleSendOtpPhone = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 6) {
      setError(t("register.phoneTooShort"));
      return;
    }
    await sendOtp();
  };

  const handleSendOtpEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("register.emailTooShort"));
      return;
    }
    await sendOtp();
  };

  const sendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.sendOtp(currentIdentifier());
      setStep("otp");
    } catch (e) {
      setError(messageFor(e, t));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (entered: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithOtp(currentIdentifier(), entered);
      if (res.hasPinSet) return;
      setStep("pin");
    } catch (e) {
      setCode("");
      setError(messageFor(e, t));
    } finally {
      setLoading(false);
    }
  };

  const handlePinConfirmComplete = async (entered: string) => {
    if (entered !== pin) {
      setError(t("register.pin.mismatch"));
      setPinConfirm("");
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
    } catch (e) {
      setError(messageFor(e, t));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "otp" && code.length === 4 && !loading) {
      handleVerifyOtp(code);
    }
  }, [step, code, loading]);

  useEffect(() => {
    if (step === "pin" && pin.length === 4) {
      setError(null);
      setStep("pin-confirm");
    }
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
          {step === "language" && (
            <LanguageStep
              selected={i18n.language as Language}
              onSelect={async (lang) => {
                await changeLanguage(lang);
              }}
              onContinue={() => setStep("method")}
            />
          )}

          {step === "method" && (
            <MethodStep
              onPick={(m) => {
                setMethod(m);
                setStep(m);
                setError(null);
              }}
              onBack={() => setStep("language")}
            />
          )}

          {step === "phone" && (
            <PhoneStep
              country={country}
              onPickCountry={setCountry}
              phone={phone}
              onChangePhone={setPhone}
              error={error}
              loading={loading}
              onSubmit={handleSendOtpPhone}
              onSwitchLogin={() => router.replace("/(auth)/login")}
              onBack={() => setStep("method")}
            />
          )}

          {step === "email" && (
            <EmailStep
              email={email}
              onChangeEmail={setEmail}
              error={error}
              loading={loading}
              onSubmit={handleSendOtpEmail}
              onSwitchLogin={() => router.replace("/(auth)/login")}
              onBack={() => setStep("method")}
            />
          )}

          {step === "otp" && (
            <OtpStep
              target={displayTarget()}
              code={code}
              onChange={setCode}
              error={error}
              loading={loading}
              onResend={async () => {
                setCode("");
                setError(null);
                try {
                  await authApi.sendOtp(currentIdentifier());
                } catch (e) {
                  setError(messageFor(e, t));
                }
              }}
              onBack={() => {
                setCode("");
                setError(null);
                setStep(method);
              }}
            />
          )}

          {step === "pin" && (
            <PinStep
              title={t("register.pin.setupTitle")}
              subtitle={t("register.pin.setupSubtitle")}
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
              title={t("register.pin.confirmTitle")}
              subtitle={t("register.pin.confirmSubtitle")}
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

function LanguageStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: Language;
  onSelect: (l: Language) => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MEDHELP</Text>
        <Text style={styles.title}>{t("language.title")}</Text>
        <Text style={styles.subtitle}>{t("language.subtitle")}</Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = selected === lang;
          return (
            <Pressable
              key={lang}
              onPress={() => onSelect(lang)}
              style={({ pressed }) => [
                styles.langCard,
                active && styles.langCardActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.flag}>{LANG_FLAG[lang]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.langName}>{NATIVE_NAMES[lang]}</Text>
                <Text style={styles.langTranslated}>{t(`language.names.${lang}`)}</Text>
              </View>
              {active && <View style={styles.langDot} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button label={t("language.continue")} onPress={onContinue} />
      </View>
    </View>
  );
}

function MethodStep({
  onPick,
  onBack,
}: {
  onPick: (m: Method) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ {t("language.title")}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>MEDHELP</Text>
        <Text style={styles.title}>{t("register.method.title")}</Text>
        <Text style={styles.subtitle}>{t("register.method.subtitle")}</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <MethodCard
          icon="call-outline"
          title={t("register.method.phone")}
          subtitle={t("register.method.phoneSubtitle")}
          onPress={() => onPick("phone")}
        />
        <MethodCard
          icon="mail-outline"
          title={t("register.method.email")}
          subtitle={t("register.method.emailSubtitle")}
          onPress={() => onPick("email")}
        />
      </View>

      <View style={{ flex: 0 }} />
    </View>
  );
}

function MethodCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.methodCard, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.methodIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.methodTitle}>{title}</Text>
        <Text style={styles.methodSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

function PhoneStep({
  country,
  onPickCountry,
  phone,
  onChangePhone,
  error,
  loading,
  onSubmit,
  onSwitchLogin,
  onBack,
}: {
  country: Country;
  onPickCountry: (c: Country) => void;
  phone: string;
  onChangePhone: (v: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onSwitchLogin: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const tt = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(tt);
  }, []);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ {t("register.method.title")}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{t("register.eyebrow")}</Text>
        <Text style={styles.title}>{t("register.title")}</Text>
        <Text style={styles.subtitle}>{t("register.subtitle")}</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("register.phoneLabel")}</Text>
        <View style={styles.phoneField}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.countryButton, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <Text style={styles.flag}>{country.flag}</Text>
            <Text style={styles.dialCode}>{country.dial}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
          <View style={styles.divider} />
          <TextInput
            ref={inputRef}
            value={formatPhoneForDisplay(phone)}
            onChangeText={(text) => onChangePhone(normalizePhone(text))}
            keyboardType="phone-pad"
            placeholder={t("register.phonePlaceholder")}
            placeholderTextColor={colors.textDim}
            style={styles.phoneInput}
            maxLength={16}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Button label={t("register.continue")} onPress={onSubmit} loading={loading} />
        <Pressable onPress={onSwitchLogin} style={styles.linkRow}>
          <Text style={styles.linkText}>{t("register.haveAccount")}</Text>
          <Text style={styles.linkAction}>{t("register.login")}</Text>
        </Pressable>
      </View>

      <CountryPicker
        visible={pickerOpen}
        selected={country}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickCountry}
      />
    </View>
  );
}

function EmailStep({
  email,
  onChangeEmail,
  error,
  loading,
  onSubmit,
  onSwitchLogin,
  onBack,
}: {
  email: string;
  onChangeEmail: (v: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onSwitchLogin: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const tt = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(tt);
  }, []);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ {t("register.method.title")}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{t("register.eyebrow")}</Text>
        <Text style={styles.title}>{t("register.title")}</Text>
        <Text style={styles.subtitle}>{t("register.subtitleEmail")}</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("register.emailLabel")}</Text>
        <View style={styles.emailField}>
          <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={email}
            onChangeText={onChangeEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder={t("register.emailPlaceholder")}
            placeholderTextColor={colors.textDim}
            style={styles.emailInput}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Button label={t("register.continue")} onPress={onSubmit} loading={loading} />
        <Pressable onPress={onSwitchLogin} style={styles.linkRow}>
          <Text style={styles.linkText}>{t("register.haveAccount")}</Text>
          <Text style={styles.linkAction}>{t("register.login")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OtpStep({
  target,
  code,
  onChange,
  error,
  loading,
  onResend,
  onBack,
}: {
  target: string;
  code: string;
  onChange: (v: string) => void;
  error: string | null;
  loading: boolean;
  onResend: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const hiddenRef = useRef<TextInput>(null);
  useEffect(() => {
    const tt = setTimeout(() => hiddenRef.current?.focus(), 200);
    return () => clearTimeout(tt);
  }, []);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("register.otp.eyebrow")}</Text>
        <Text style={styles.title}>{t("register.otp.title")}</Text>
        <Text style={styles.subtitle}>{t("register.otp.subtitle", { target })}</Text>
      </View>

      <Pressable style={styles.codeArea} onPress={() => hiddenRef.current?.focus()}>
        <CodeCells length={4} value={code} error={!!error} />
        <TextInput
          ref={hiddenRef}
          value={code}
          onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          style={styles.hiddenInput}
          autoFocus
        />
      </Pressable>

      <View style={{ alignItems: "center", gap: spacing.sm }}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {loading && <Text style={styles.muted}>{t("register.otp.verifying")}</Text>}
        <Pressable onPress={onResend} hitSlop={8}>
          <Text style={styles.linkAction}>{t("register.otp.resend")}</Text>
        </Pressable>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.linkText}>{t("register.otp.changeNumber")}</Text>
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
  const { t } = useTranslation();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("register.pin.eyebrow")}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={{ alignItems: "center", gap: spacing.lg }}>
        <PinDots length={4} filled={value.length} error={!!error} />
        {error && <Text style={styles.errorText}>{error}</Text>}
        {loading && <Text style={styles.muted}>{t("register.pin.saving")}</Text>}
      </View>

      <PinPad value={value} onChange={onChange} />
    </View>
  );
}

const LANG_FLAG: Record<Language, string> = { ka: "🇬🇪", en: "🇬🇧", de: "🇩🇪" };

const NATIVE_NAMES: Record<Language, string> = {
  ka: "ქართული",
  en: "English",
  de: "Deutsch",
};

function messageFor(e: unknown, t: (k: string) => string): string {
  if (e instanceof ApiError) {
    if (e.code === "OTP_INVALID") return t("register.errors.otpInvalid");
    if (e.code === "OTP_EXPIRED") return t("register.errors.otpExpired");
    if (e.code === "OTP_NOT_FOUND") return t("register.errors.otpNotFound");
    if (e.code === "VALIDATION_ERROR") return e.message;
    return e.message;
  }
  return t("register.errors.network");
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  stepContainer: { flex: 1, justifyContent: "space-between", paddingVertical: spacing.lg },
  header: { gap: spacing.sm },
  backLink: { marginBottom: spacing.sm, alignSelf: "flex-start" },
  backLinkText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
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
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    height: 60,
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emailField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 60,
  },
  emailInput: { flex: 1, color: colors.text, fontSize: fontSize.lg },
  dialCode: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
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

  langCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  langCardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  flag: { fontSize: 24 },
  langName: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  langTranslated: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  langDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },

  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  methodTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  methodSubtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
});
