import { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { documentsApi } from "@/lib/api/endpoints";
import { formatDateLong } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type TtlOption = { hours: number; labelKey: string };

const TTL_OPTIONS: TtlOption[] = [
  { hours: 1, labelKey: "documents.share.ttl.1h" },
  { hours: 6, labelKey: "documents.share.ttl.6h" },
  { hours: 24, labelKey: "documents.share.ttl.24h" },
  { hours: 24 * 7, labelKey: "documents.share.ttl.7d" },
  { hours: 24 * 30, labelKey: "documents.share.ttl.30d" },
];

const DEFAULT_HOURS = 24 * 7;

type Props = {
  visible: boolean;
  documentIds: string[];
  onClose: () => void;
};

export function ShareModal({ visible, documentIds, onClose }: Props) {
  const { t } = useTranslation();
  const [ttlHours, setTtlHours] = useState(DEFAULT_HOURS);
  const [result, setResult] = useState<{ url: string; expiresAt: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => documentsApi.createShare(documentIds, ttlHours),
    onSuccess: (data) => {
      setResult({ url: data.url, expiresAt: data.share.expiresAt });
      setCopied(false);
    },
    onError: () => {
      Alert.alert(t("documents.share.createFailed"));
    },
  });

  const close = () => {
    setResult(null);
    setCopied(false);
    setTtlHours(DEFAULT_HOURS);
    onClose();
  };

  const copyLink = async () => {
    if (!result) return;
    try {
      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(result.url);
      }
      setCopied(true);
    } catch {
      // ignore
    }
  };

  const sendViaEmail = () => {
    if (!result) return;
    const subject = encodeURIComponent(t("documents.share.emailSubject"));
    const body = encodeURIComponent(
      `${t("documents.share.emailBody")}\n\n${result.url}`
    );
    const url = `mailto:?subject=${subject}&body=${body}`;
    if (Platform.OS === "web") {
      window.open(url, "_self");
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  const systemShare = async () => {
    if (!result) return;
    if (Platform.OS === "web") {
      const nav = navigator as {
        share?: (data: { title: string; url: string }) => Promise<void>;
      };
      if (nav.share) {
        try {
          await nav.share({
            title: t("documents.share.emailSubject"),
            url: result.url,
          });
        } catch {
          // user cancelled
        }
      } else {
        await copyLink();
      }
      return;
    }
    try {
      const { Share } = await import("react-native");
      await Share.share({ message: result.url, url: result.url });
    } catch {
      // ignore
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t("documents.share.title")}</Text>
          {documentIds.length > 1 && (
            <Text style={styles.subTitle}>
              {t("documents.share.bundleCount", { count: documentIds.length })}
            </Text>
          )}

          {!result ? (
            <>
              <Text style={styles.sectionLabel}>{t("documents.share.ttlLabel")}</Text>
              <View style={styles.ttlRow}>
                {TTL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.hours}
                    onPress={() => setTtlHours(opt.hours)}
                    style={({ pressed }) => [
                      styles.ttlChip,
                      ttlHours === opt.hours && styles.ttlChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ttlChipText,
                        ttlHours === opt.hours && styles.ttlChipTextActive,
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => mutation.mutate()}
                disabled={mutation.isPending}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.pressed,
                  mutation.isPending && styles.disabled,
                ]}
              >
                <Ionicons name="link-outline" size={16} color={colors.bg} />
                <Text style={styles.primaryBtnText}>
                  {mutation.isPending
                    ? t("documents.share.creating")
                    : t("documents.share.createLink")}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                {t("documents.share.hint", {
                  expires: formatDateLong(result.expiresAt),
                })}
              </Text>
              <View style={styles.linkBox}>
                <Ionicons name="link-outline" size={16} color={colors.textMuted} />
                <Text style={styles.linkText} numberOfLines={1}>
                  {result.url}
                </Text>
              </View>
              <ActionButton
                icon="copy-outline"
                label={copied ? t("documents.share.copied") : t("documents.share.copyLink")}
                onPress={copyLink}
                tone={copied ? "success" : "primary"}
              />
              <ActionButton
                icon="mail-outline"
                label={t("documents.share.viaEmail")}
                onPress={sendViaEmail}
                tone="primary"
              />
              <ActionButton
                icon="share-social-outline"
                label={t("documents.share.viaSystem")}
                onPress={systemShare}
                tone="primary"
              />
            </>
          )}

          <View style={styles.footer}>
            <Pressable
              onPress={close}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>{t("documents.actions.cancel")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: "primary" | "success";
}) {
  const color = tone === "success" ? colors.success : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: color + "55", backgroundColor: color + "18" },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  subTitle: { color: colors.textMuted, fontSize: fontSize.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  ttlRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  ttlChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ttlChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ttlChipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  ttlChipTextActive: { color: colors.bg, fontWeight: "800" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.bg, fontSize: fontSize.md, fontWeight: "700" },
  hint: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: { flex: 1, color: colors.text, fontSize: fontSize.xs },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  cancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  cancelText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "700" },
});
