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
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { CountryPicker } from "@/components/CountryPicker";
import { useAuth } from "@/lib/auth/AuthContext";
import { type Identifier } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { formatPhoneForDisplay, normalizePhone } from "@/lib/phone";
import { DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from "@/lib/i18n";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Method = "phone" | "email";
type Step = "language" | "method" | "identifier" | "password";

export default function Register() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { register } = useAuth();

  const [step, setStep] = useState<Step>("language");
  const [method, setMethod] = useState<Method>("phone");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentIdentifier = (): Identifier =>
    method === "phone"
      ? { phone: `${country.dial}${normalizePhone(phone)}` }
      : { email: email.trim() };

  const validateIdentifier = (): string | null => {
    if (method === "phone") {
      if (normalizePhone(phone).length < 6) return t("register.phoneTooShort");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return t("register.emailTooShort");
    }
    return null;
  };

  const advanceFromIdentifier = () => {
    const v = validateIdentifier();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStep("password");
  };

  const submitPassword = async () => {
    if (password.length < 6) {
      setError(t("register.passwordTooShort"));
      return;
    }
    if (password !== passwordConfirm) {
      setError(t("register.passwordMismatch"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(currentIdentifier(), password);
      // Auth state flips to authenticated + needsQuickUnlockSetup.
      // Stack initialRouteName only applies on first mount, so push the
      // setup screen explicitly.
      router.replace("/(auth)/setup-quick-unlock" as Href);
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_REGISTERED") {
        setError(t("register.alreadyRegistered"));
      } else if (e instanceof ApiError && e.code === "VALIDATION_ERROR") {
        setError(e.message);
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError(t("register.errors.network"));
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
          {step === "language" && (
            <LanguageStep
              selected={i18n.language as Language}
              onSelect={async (lang) => {
                await changeLanguage(lang);
              }}
              onContinue={() => setStep("method")}
              onBackToLogin={() => router.replace("/(auth)/login")}
            />
          )}

          {step === "method" && (
            <MethodStep
              onPick={(m) => {
                setMethod(m);
                setStep("identifier");
                setError(null);
              }}
              onBack={() => setStep("language")}
            />
          )}

          {step === "identifier" && method === "phone" && (
            <PhoneStep
              country={country}
              onPickCountry={setCountry}
              phone={phone}
              onChangePhone={setPhone}
              error={error}
              onSubmit={advanceFromIdentifier}
              onBack={() => setStep("method")}
            />
          )}

          {step === "identifier" && method === "email" && (
            <EmailStep
              email={email}
              onChangeEmail={setEmail}
              error={error}
              onSubmit={advanceFromIdentifier}
              onBack={() => setStep("method")}
            />
          )}

          {step === "password" && (
            <PasswordStep
              password={password}
              passwordConfirm={passwordConfirm}
              onChangePassword={(v) => {
                setError(null);
                setPassword(v);
              }}
              onChangePasswordConfirm={(v) => {
                setError(null);
                setPasswordConfirm(v);
              }}
              error={error}
              loading={loading}
              onSubmit={submitPassword}
              onBack={() => setStep("identifier")}
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
  onBackToLogin,
}: {
  selected: Language;
  onSelect: (l: Language) => void;
  onContinue: () => void;
  onBackToLogin: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Pressable onPress={onBackToLogin} hitSlop={10} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ {t("login.title")}</Text>
        </Pressable>
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
  onSubmit,
  onBack,
}: {
  country: Country;
  onPickCountry: (c: Country) => void;
  phone: string;
  onChangePhone: (v: string) => void;
  error: string | null;
  onSubmit: () => void;
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
            returnKeyType="next"
            onSubmitEditing={onSubmit}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Button label={t("register.continue")} onPress={onSubmit} />
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
  onSubmit,
  onBack,
}: {
  email: string;
  onChangeEmail: (v: string) => void;
  error: string | null;
  onSubmit: () => void;
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
        <Text style={styles.subtitle}>{t("register.subtitle")}</Text>
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
            returnKeyType="next"
            onSubmitEditing={onSubmit}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Button label={t("register.continue")} onPress={onSubmit} />
      </View>
    </View>
  );
}

function PasswordStep({
  password,
  passwordConfirm,
  onChangePassword,
  onChangePasswordConfirm,
  error,
  loading,
  onSubmit,
  onBack,
}: {
  password: string;
  passwordConfirm: string;
  onChangePassword: (v: string) => void;
  onChangePasswordConfirm: (v: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const pwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const tt = setTimeout(() => pwRef.current?.focus(), 250);
    return () => clearTimeout(tt);
  }, []);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{t("register.eyebrow")}</Text>
        <Text style={styles.title}>{t("register.passwordLabel")}</Text>
        <Text style={styles.subtitle}>{t("register.passwordHint")}</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("register.passwordLabel")}</Text>
          <View style={styles.emailField}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput
              ref={pwRef}
              value={password}
              onChangeText={onChangePassword}
              placeholder={t("register.passwordPlaceholder")}
              placeholderTextColor={colors.textDim}
              style={styles.emailInput}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
              <Ionicons
                name={show ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("register.passwordConfirmLabel")}</Text>
          <View style={styles.emailField}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput
              ref={confirmRef}
              value={passwordConfirm}
              onChangeText={onChangePasswordConfirm}
              placeholder={t("register.passwordConfirmLabel")}
              placeholderTextColor={colors.textDim}
              style={styles.emailInput}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Button label={t("register.create")} onPress={onSubmit} loading={loading} />
      </View>
    </View>
  );
}

const LANG_FLAG: Record<Language, string> = { ka: "🇬🇪", en: "🇬🇧", de: "🇩🇪" };

const NATIVE_NAMES: Record<Language, string> = {
  ka: "ქართული",
  en: "English",
  de: "Deutsch",
};

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
    height: 56,
  },
  emailInput: { flex: 1, color: colors.text, fontSize: fontSize.md },
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
  footer: { gap: spacing.md, paddingBottom: spacing.md },

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
