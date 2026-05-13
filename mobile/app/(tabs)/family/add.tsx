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
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { CountryPicker } from "@/components/CountryPicker";
import { familyApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { formatPhoneForDisplay, normalizePhone } from "@/lib/phone";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Method = "phone" | "email";

export default function AddFamilyMember() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [customName, setCustomName] = useState("");
  const [method, setMethod] = useState<Method>("phone");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: familyApi.add,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family"] });
      router.back();
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        if (e.code === "NOT_FOUND") setError(t("family.notFound"));
        else if (e.code === "ALREADY_LINKED") setError(t("family.alreadyLinked"));
        else if (e.code === "SELF_LINK") setError(t("family.selfLink"));
        else setError(e.message);
      } else {
        Alert.alert(t("family.addError"), t("family.addErrorBody"));
      }
    },
  });

  const canSubmit =
    customName.trim().length > 0 &&
    (method === "phone"
      ? normalizePhone(phone).length >= 6
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

  const submit = () => {
    setError(null);
    if (!canSubmit) return;
    if (method === "phone") {
      mutation.mutate({
        customName: customName.trim(),
        phone: `${country.dial}${normalizePhone(phone)}`,
      });
    } else {
      mutation.mutate({
        customName: customName.trim(),
        email: email.trim(),
      });
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t("family.newMember")}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Section title={t("family.nameLabel")}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder={t("family.namePlaceholder")}
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoCapitalize="words"
            />
          </Section>

          <Section title={t("family.contactLabel")} subtitle={t("family.contactSubLabel")}>
            <View style={styles.segment}>
              <SegmentButton
                active={method === "phone"}
                icon="call-outline"
                onPress={() => setMethod("phone")}
              />
              <SegmentButton
                active={method === "email"}
                icon="mail-outline"
                onPress={() => setMethod("email")}
              />
            </View>

            {method === "phone" ? (
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
                  value={formatPhoneForDisplay(phone)}
                  onChangeText={(text) => setPhone(normalizePhone(text))}
                  keyboardType="phone-pad"
                  placeholder="555 12 34 56"
                  placeholderTextColor={colors.textDim}
                  style={styles.phoneInput}
                  maxLength={16}
                />
              </View>
            ) : (
              <View style={styles.emailField}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textDim}
                  style={styles.emailInput}
                />
              </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={t("family.addButton")}
            onPress={submit}
            disabled={!canSubmit}
            loading={mutation.isPending}
          />
        </View>

        <CountryPicker
          visible={pickerOpen}
          selected={country}
          onClose={() => setPickerOpen(false)}
          onSelect={setCountry}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>
      {subtitle && <Text style={styles.sublabel}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function SegmentButton({
  active,
  icon,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
    >
      <Ionicons name={icon} size={18} color={active ? colors.bg : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  body: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },

  section: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sublabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: -spacing.xs },

  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.md,
    padding: spacing.md,
    minHeight: 52,
  },

  segment: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  segmentBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  phoneField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    height: 56,
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  flag: { fontSize: 22 },
  dialCode: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  divider: { width: 1, height: 26, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  phoneInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    letterSpacing: 1,
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
  errorText: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
